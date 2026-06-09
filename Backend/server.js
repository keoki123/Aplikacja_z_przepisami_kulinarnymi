let express = require("express");
let cors = require("cors");
let axios = require("axios");
let dotenv = require("dotenv");
let bcrypt = require("bcryptjs");
let crypto = require("crypto");
let nodemailer = require("nodemailer");
let { Pool } = require("pg");
let session = require("express-session");
let pgSession = require("connect-pg-simple")(session);

dotenv.config();

let app = express();

let pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

let apiKey = process.env.MEALDB_API_KEY;
let port = process.env.PORT || 5000;

let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true
  })
);

app.use(express.json());

app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: "user_sessions"
    }),
    name: "culinary.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 30
    }
  })
);

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  if (req.session.user.rola !== "admin") {
    return res.status(403).json({ error: "Brak uprawnień." });
  }

  next();
}

function requireSameUserOrAdmin(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Brak autoryzacji." });
  }

  let sessionUserId = String(req.session.user.id);
  let targetUserId = String(
    req.params.id ||
      req.params.uzytkownikId ||
      req.query.uzytkownik_id ||
      req.body.uzytkownik_id ||
      ""
  );

  if (req.session.user.rola === "admin" || sessionUserId === targetUserId) {
    return next();
  }

  return res.status(403).json({ error: "Brak uprawnień." });
}

function mapMeal(meal) {
  return {
    api_przepis_id: String(meal.idMeal),
    tytul: meal.strMeal,
    kategoria: meal.strCategory,
    obszar: meal.strArea,
    youtube: meal.strYoutube,
    obrazek: meal.strMealThumb,
    instrukcje: meal.strInstructions
  };
}

function validatePassword(password) {
  let errors = [];

  if (!password || password.length < 8) {
    errors.push("Hasło musi mieć minimum 8 znaków.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Hasło musi zawierać minimum 1 dużą literę.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Hasło musi zawierać minimum 1 cyfrę.");
  }

  if (!/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push("Hasło musi zawierać minimum 1 znak specjalny.");
  }

  return errors;
}

function parseUserIngredientsText(skladnikiText) {
  if (!skladnikiText) return [];

  return skladnikiText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      let parts = line.split("|").map((item) => item.trim());

      let nazwa = parts[0] || "";
      let ilosc = parts[1] || "";
      let jednostka = parts[2] || "";

      return {
        nazwa,
        ilosc: `${ilosc} ${jednostka}`.trim()
      };
    });
}

async function saveMealIfNotExists(meal) {
  let mappedMeal = mapMeal(meal);

  let existing = await pool.query(
    "SELECT * FROM public.przepisy_api WHERE api_przepis_id = $1",
    [mappedMeal.api_przepis_id]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  let inserted = await pool.query(
    `
    INSERT INTO public.przepisy_api
    (api_przepis_id, tytul, kategoria, obszar, obrazek, youtube, instrukcje)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      mappedMeal.api_przepis_id,
      mappedMeal.tytul,
      mappedMeal.kategoria,
      mappedMeal.obszar,
      mappedMeal.obrazek,
      mappedMeal.youtube,
      mappedMeal.instrukcje
    ]
  );

  return inserted.rows[0];
}

async function saveRecipeDataIfNotExists(recipeData) {
  let existing = await pool.query(
    "SELECT * FROM public.przepisy_api WHERE api_przepis_id = $1",
    [String(recipeData.api_przepis_id)]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  let inserted = await pool.query(
    `
    INSERT INTO public.przepisy_api
    (api_przepis_id, tytul, kategoria, obszar, obrazek, youtube, instrukcje)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      String(recipeData.api_przepis_id),
      recipeData.tytul,
      recipeData.kategoria || null,
      recipeData.obszar || null,
      recipeData.obrazek || null,
      recipeData.youtube || null,
      recipeData.instrukcje || null
    ]
  );

  return inserted.rows[0];
}

async function getRecipeStats(localRecipeId) {
  let result = await pool.query(
    `
    SELECT
      COALESCE(opinie_stats.liczba_opinii, 0)::int AS liczba_opinii,
      COALESCE(oceny_stats.srednia_ocen, 0) AS srednia_ocen
    FROM
      (
        SELECT $1::int AS recipe_id
      ) x
    LEFT JOIN (
      SELECT
        przepis_api_id,
        COUNT(*)::int AS liczba_opinii
      FROM public.opinie
      WHERE komentarz IS NOT NULL AND TRIM(komentarz) <> ''
      GROUP BY przepis_api_id
    ) opinie_stats
      ON opinie_stats.przepis_api_id = x.recipe_id
    LEFT JOIN (
      SELECT
        przepis_api_id,
        ROUND(AVG(ocena)::numeric, 1) AS srednia_ocen
      FROM public.oceny
      GROUP BY przepis_api_id
    ) oceny_stats
      ON oceny_stats.przepis_api_id = x.recipe_id
    `,
    [localRecipeId]
  );

  return {
    liczba_opinii: result.rows[0]?.liczba_opinii || 0,
    srednia_ocen: parseFloat(result.rows[0]?.srednia_ocen) || 0
  };
}

async function enrichMealsWithDatabaseData(meals) {
  let enriched = [];

  for (let meal of meals) {
    let localRecipe = await saveMealIfNotExists(meal);
    let stats = await getRecipeStats(localRecipe.id);

    enriched.push({
      id: localRecipe.id,
      api_przepis_id: localRecipe.api_przepis_id,
      tytul: localRecipe.tytul,
      kategoria: localRecipe.kategoria,
      obszar: localRecipe.obszar,
      youtube: localRecipe.youtube,
      obrazek: localRecipe.obrazek,
      instrukcje: localRecipe.instrukcje,
      srednia_ocen: stats.srednia_ocen,
      liczba_opinii: stats.liczba_opinii
    });
  }

  return enriched;
}

async function getLocalRecipeWithStatsByApiId(apiPrzepisId) {
  let result = await pool.query(
    `
    SELECT *
    FROM public.przepisy_api
    WHERE api_przepis_id = $1
    LIMIT 1
    `,
    [apiPrzepisId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  let recipe = result.rows[0];
  let stats = await getRecipeStats(recipe.id);

  return {
    id: recipe.id,
    api_przepis_id: recipe.api_przepis_id,
    tytul: recipe.tytul,
    kategoria: recipe.kategoria,
    obszar: recipe.obszar,
    youtube: recipe.youtube,
    obrazek: recipe.obrazek,
    instrukcje: recipe.instrukcje,
    srednia_ocen: stats.srednia_ocen,
    liczba_opinii: stats.liczba_opinii
  };
}

app.get("/", (req, res) => {
  res.json({ message: "API działa" });
});

app.post("/api/haslo/przypomnij", async (req, res) => {
  try {
    let email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ error: "Podaj adres email." });
    }

    let userResult = await pool.query(
      `
      SELECT id, email, nazwa_uzytkownika
      FROM public.uzytkownicy
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.json({
        message: "Jeśli konto istnieje, kod resetujący został wysłany na email."
      });
    }

    let user = userResult.rows[0];

    let code = String(crypto.randomInt(100000, 999999));
    let codeHash = await bcrypt.hash(code, 10);

    await pool.query(
      `
      UPDATE public.reset_hasla
      SET wykorzystany = true
      WHERE uzytkownik_id = $1 AND wykorzystany = false
      `,
      [user.id]
    );

    await pool.query(
      `
      INSERT INTO public.reset_hasla
      (uzytkownik_id, kod_hash, data_wygasniecia)
      VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
      `,
      [user.id, codeHash]
    );

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: "Kod resetowania hasła",
      text: `Twój kod resetowania hasła to: ${code}. Kod jest ważny przez 15 minut.`
    });

    res.json({
      message: "Jeśli konto istnieje, kod resetujący został wysłany na email."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Nie udało się wysłać kodu resetującego."
    });
  }
});

app.post("/api/haslo/reset", async (req, res) => {
  try {
    let email = req.body.email?.trim().toLowerCase();
    let kod = req.body.kod?.trim();
    let nowe_haslo = req.body.nowe_haslo;

    if (!email || !kod || !nowe_haslo) {
      return res.status(400).json({
        error: "Podaj email, kod i nowe hasło."
      });
    }

    let passwordErrors = validatePassword(nowe_haslo);

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        errors: passwordErrors
      });
    }

    let userResult = await pool.query(
      `
      SELECT id
      FROM public.uzytkownicy
      WHERE email = $1
      LIMIT 1
      `,
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        error: "Nieprawidłowy email lub kod."
      });
    }

    let user = userResult.rows[0];

    let resetResult = await pool.query(
      `
      SELECT id, kod_hash
      FROM public.reset_hasla
      WHERE uzytkownik_id = $1
        AND wykorzystany = false
        AND data_wygasniecia > NOW()
      ORDER BY data_utworzenia DESC
      LIMIT 1
      `,
      [user.id]
    );

    if (resetResult.rows.length === 0) {
      return res.status(400).json({
        error: "Kod wygasł albo jest nieprawidłowy."
      });
    }

    let reset = resetResult.rows[0];

    let isCodeValid = await bcrypt.compare(kod, reset.kod_hash);

    if (!isCodeValid) {
      return res.status(400).json({
        error: "Kod wygasł albo jest nieprawidłowy."
      });
    }

    let hashedPassword = await bcrypt.hash(nowe_haslo, 10);

    await pool.query(
      `
      UPDATE public.uzytkownicy
      SET haslo = $1
      WHERE id = $2
      `,
      [hashedPassword, user.id]
    );

    await pool.query(
      `
      UPDATE public.reset_hasla
      SET wykorzystany = true
      WHERE id = $1
      `,
      [reset.id]
    );

    res.json({
      message: "Hasło zostało zmienione. Możesz się teraz zalogować."
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Nie udało się zresetować hasła."
    });
  }
});

app.post("/api/rejestracja", async (req, res) => {
  try {
    let nazwa_uzytkownika = req.body.nazwa_uzytkownika?.trim();
    let email = req.body.email?.trim().toLowerCase();
    let haslo = req.body.haslo;

    if (!nazwa_uzytkownika || !email || !haslo) {
      return res.status(400).json({
        errors: ["Wszystkie pola są wymagane."]
      });
    }

    let passwordErrors = validatePassword(haslo);

    if (passwordErrors.length > 0) {
      return res.status(400).json({
        errors: passwordErrors
      });
    }

    let userByName = await pool.query(
      "SELECT id FROM public.uzytkownicy WHERE nazwa_uzytkownika = $1",
      [nazwa_uzytkownika]
    );

    if (userByName.rows.length > 0) {
      return res.status(400).json({
        errors: ["Taka nazwa użytkownika już istnieje."]
      });
    }

    let userByEmail = await pool.query(
      "SELECT id FROM public.uzytkownicy WHERE email = $1",
      [email]
    );

    if (userByEmail.rows.length > 0) {
      return res.status(400).json({
        errors: ["Taki email już istnieje."]
      });
    }

    let hashedPassword = await bcrypt.hash(haslo, 10);

    let result = await pool.query(
      `
      INSERT INTO public.uzytkownicy (nazwa_uzytkownika, email, haslo)
      VALUES ($1, $2, $3)
      RETURNING id, nazwa_uzytkownika, email, rola
      `,
      [nazwa_uzytkownika, email, hashedPassword]
    );

    res.status(201).json({
      message: "Użytkownik został zarejestrowany.",
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
});

app.post("/api/logowanie", async (req, res) => {
  try {
    let email = req.body.email?.trim().toLowerCase();
    let haslo = req.body.haslo;
    let rememberMe = !!req.body.rememberMe;

    if (!email || !haslo) {
      return res.status(400).json({
        error: "Podaj email i hasło."
      });
    }

    let result = await pool.query(
      `
      SELECT id, nazwa_uzytkownika, email, haslo, rola
      FROM public.uzytkownicy
      WHERE email = $1
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: "Niepoprawne hasło lub email."
      });
    }

    let user = result.rows[0];
    let isPasswordValid = await bcrypt.compare(haslo, user.haslo);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: "Niepoprawne hasło lub email."
      });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return res.status(500).json({
          error: "Nie udało się utworzyć sesji."
        });
      }

      req.session.user = {
        id: user.id,
        nazwa_uzytkownika: user.nazwa_uzytkownika,
        email: user.email,
        rola: user.rola || "user"
      };

      req.session.cookie.maxAge = rememberMe
        ? 1000 * 60 * 60 * 24 * 30
        : 1000 * 60 * 30;

      req.session.save((saveError) => {
        if (saveError) {
          return res.status(500).json({
            error: "Nie udało się zapisać sesji."
          });
        }

        res.json({
          message: "Logowanie zakończone sukcesem.",
          user: req.session.user
        });
      });
    });
  } catch (error) {
    res.status(500).json({
      error: "Wystąpił błąd serwera."
    });
  }
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: "Brak aktywnej sesji." });
  }

  res.json({
    user: req.session.user
  });
});

app.post("/api/wylogowanie", (req, res) => {
  if (!req.session) {
    return res.json({ message: "Wylogowano." });
  }

  req.session.destroy((error) => {
    if (error) {
      return res.status(500).json({ error: "Nie udało się wylogować." });
    }

    res.clearCookie("culinary.sid");
    res.json({ message: "Wylogowano." });
  });
});

app.get("/api/profil/:id", requireSameUserOrAdmin, async (req, res) => {
  try {
    let id = req.params.id;

    let result = await pool.query(
      `
      SELECT id, nazwa_uzytkownika, email, rola
      FROM public.uzytkownicy
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono użytkownika." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/profil/:id", requireSameUserOrAdmin, async (req, res) => {
  try {
    let id = req.params.id;
    let nazwa_uzytkownika = req.body.nazwa_uzytkownika?.trim();
    let nowe_haslo = req.body.nowe_haslo?.trim();

    if (!nazwa_uzytkownika) {
      return res.status(400).json({
        errors: ["Nazwa użytkownika jest wymagana."]
      });
    }

    let existingUser = await pool.query(
      `
      SELECT id
      FROM public.uzytkownicy
      WHERE nazwa_uzytkownika = $1 AND id <> $2
      `,
      [nazwa_uzytkownika, id]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        errors: ["Taka nazwa użytkownika już istnieje."]
      });
    }

    if (nowe_haslo) {
      let passwordErrors = validatePassword(nowe_haslo);

      if (passwordErrors.length > 0) {
        return res.status(400).json({
          errors: passwordErrors
        });
      }

      let hashedPassword = await bcrypt.hash(nowe_haslo, 10);

      let result = await pool.query(
        `
        UPDATE public.uzytkownicy
        SET nazwa_uzytkownika = $1, haslo = $2
        WHERE id = $3
        RETURNING id, nazwa_uzytkownika, email, rola
        `,
        [nazwa_uzytkownika, hashedPassword, id]
      );

      req.session.user = {
        id: result.rows[0].id,
        nazwa_uzytkownika: result.rows[0].nazwa_uzytkownika,
        email: result.rows[0].email,
        rola: result.rows[0].rola || "user"
      };

      return res.json({
        message: "Profil został zaktualizowany.",
        user: result.rows[0]
      });
    }

    let result = await pool.query(
      `
      UPDATE public.uzytkownicy
      SET nazwa_uzytkownika = $1
      WHERE id = $2
      RETURNING id, nazwa_uzytkownika, email, rola
      `,
      [nazwa_uzytkownika, id]
    );

    req.session.user = {
      id: result.rows[0].id,
      nazwa_uzytkownika: result.rows[0].nazwa_uzytkownika,
      email: result.rows[0].email,
      rola: result.rows[0].rola || "user"
    };

    res.json({
      message: "Profil został zaktualizowany.",
      user: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ errors: [error.message] });
  }
});

app.get("/api/profil/:id/opinie", requireSameUserOrAdmin, async (req, res) => {
  try {
    let id = req.params.id;

    let result = await pool.query(
      `
      SELECT
        o.id,
        r.ocena,
        o.komentarz,
        p.api_przepis_id,
        p.tytul,
        p.obrazek
      FROM public.opinie o
      JOIN public.przepisy_api p
        ON p.id = o.przepis_api_id
      LEFT JOIN public.oceny r
        ON r.uzytkownik_id = o.uzytkownik_id AND r.przepis_api_id = o.przepis_api_id
      WHERE o.uzytkownik_id = $1
        AND o.komentarz IS NOT NULL
        AND TRIM(o.komentarz) <> ''
      ORDER BY o.id DESC
      `,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/przepisy/szukaj/:nazwa", async (req, res) => {
  try {
    let nazwa = req.params.nazwa;

    let response = await axios.get(
      `https://www.themealdb.com/api/json/v2/${apiKey}/search.php?s=${encodeURIComponent(nazwa)}`
    );

    let meals = response.data.meals || [];
    let apiRecipes = await enrichMealsWithDatabaseData(meals);

    let localResult = await pool.query(
      `
      SELECT *
      FROM public.przepisy_api
      WHERE api_przepis_id LIKE 'user-%'
        AND (
          LOWER(tytul) LIKE LOWER($1)
          OR LOWER(COALESCE(kategoria, '')) LIKE LOWER($1)
          OR LOWER(COALESCE(obszar, '')) LIKE LOWER($1)
        )
      ORDER BY tytul ASC
      `,
      [`%${nazwa}%`]
    );

    let localRecipes = [];

    for (let row of localResult.rows) {
      let stats = await getRecipeStats(row.id);

      localRecipes.push({
        id: row.id,
        api_przepis_id: row.api_przepis_id,
        tytul: row.tytul,
        kategoria: row.kategoria,
        obszar: row.obszar,
        youtube: row.youtube,
        obrazek: row.obrazek,
        instrukcje: row.instrukcje,
        srednia_ocen: stats.srednia_ocen,
        liczba_opinii: stats.liczba_opinii
      });
    }

    let allRecipes = [...apiRecipes, ...localRecipes];
    let unique = [];
    let usedIds = new Set();

    for (let recipe of allRecipes) {
      if (!usedIds.has(recipe.api_przepis_id)) {
        usedIds.add(recipe.api_przepis_id);
        unique.push(recipe);
      }
    }

    res.json(unique);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/przepisy/wszystkie", async (req, res) => {
  try {
    let letters = "abcdefghijklmnopqrstuvwxyz".split("");
    let allMeals = [];

    for (let letter of letters) {
      let response = await axios.get(
        `https://www.themealdb.com/api/json/v2/${apiKey}/search.php?f=${letter}`
      );

      let meals = response.data.meals || [];
      allMeals.push(...meals);
    }

    let uniqueMeals = [];
    let ids = new Set();

    for (let meal of allMeals) {
      if (!ids.has(meal.idMeal)) {
        ids.add(meal.idMeal);
        uniqueMeals.push(meal);
      }
    }

    let apiRecipes = await enrichMealsWithDatabaseData(uniqueMeals);

    let localResult = await pool.query(
      `
      SELECT *
      FROM public.przepisy_api
      WHERE api_przepis_id LIKE 'user-%'
      ORDER BY tytul ASC
      `
    );

    let localRecipes = [];

    for (let row of localResult.rows) {
      let stats = await getRecipeStats(row.id);

      localRecipes.push({
        id: row.id,
        api_przepis_id: row.api_przepis_id,
        tytul: row.tytul,
        kategoria: row.kategoria,
        obszar: row.obszar,
        youtube: row.youtube,
        obrazek: row.obrazek,
        instrukcje: row.instrukcje,
        srednia_ocen: stats.srednia_ocen,
        liczba_opinii: stats.liczba_opinii
      });
    }

    let allRecipes = [...apiRecipes, ...localRecipes];
    res.json(allRecipes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/przepisy/popularne", async (req, res) => {
  try {
    let limit = parseInt(req.query.limit) || 6;

    let result = await pool.query(
      `
      SELECT
        p.id,
        p.api_przepis_id,
        p.tytul,
        p.kategoria,
        p.obszar,
        p.obrazek,
        p.youtube,
        p.instrukcje,
        COALESCE(opinie_stats.liczba_opinii, 0)::int AS liczba_opinii,
        COALESCE(oceny_stats.srednia_ocen, 0) AS srednia_ocen
      FROM public.przepisy_api p
      LEFT JOIN (
        SELECT
          przepis_api_id,
          COUNT(*)::int AS liczba_opinii
        FROM public.opinie
        WHERE komentarz IS NOT NULL AND TRIM(komentarz) <> ''
        GROUP BY przepis_api_id
      ) opinie_stats
        ON opinie_stats.przepis_api_id = p.id
      LEFT JOIN (
        SELECT
          przepis_api_id,
          ROUND(AVG(ocena)::numeric, 1) AS srednia_ocen
        FROM public.oceny
        GROUP BY przepis_api_id
      ) oceny_stats
        ON oceny_stats.przepis_api_id = p.id
      ORDER BY
        srednia_ocen DESC,
        liczba_opinii DESC,
        p.tytul ASC
      LIMIT $1
      `,
      [limit]
    );

    let wynik = result.rows.map((row) => ({
      id: row.id,
      api_przepis_id: row.api_przepis_id,
      tytul: row.tytul,
      kategoria: row.kategoria,
      obszar: row.obszar,
      obrazek: row.obrazek,
      youtube: row.youtube,
      instrukcje: row.instrukcje,
      liczba_opinii: row.liczba_opinii,
      srednia_ocen: parseFloat(row.srednia_ocen) || 0
    }));

    res.json(wynik);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/przepisy/szczegoly/:apiPrzepisId", async (req, res) => {
  try {
    let apiPrzepisId = req.params.apiPrzepisId;

    if (apiPrzepisId.startsWith("user-")) {
      let localRecipe = await getLocalRecipeWithStatsByApiId(apiPrzepisId);

      if (!localRecipe) {
        return res.status(404).json({ error: "Nie znaleziono przepisu" });
      }

      let userRecipeId = apiPrzepisId.replace("user-", "");

      let userRecipeResult = await pool.query(
        `
        SELECT *
        FROM public.przepisy_uzytkownikow
        WHERE id = $1
        LIMIT 1
        `,
        [userRecipeId]
      );

      if (userRecipeResult.rows.length === 0) {
        return res.status(404).json({ error: "Nie znaleziono przepisu użytkownika" });
      }

      let userRecipe = userRecipeResult.rows[0];

      return res.json({
        id: localRecipe.id,
        api_przepis_id: localRecipe.api_przepis_id,
        tytul: localRecipe.tytul,
        kategoria: localRecipe.kategoria,
        obszar: localRecipe.obszar,
        youtube: localRecipe.youtube,
        obrazek: localRecipe.obrazek,
        instrukcje: localRecipe.instrukcje,
        srednia_ocen: localRecipe.srednia_ocen,
        liczba_opinii: localRecipe.liczba_opinii,
        skladniki: parseUserIngredientsText(userRecipe.skladniki)
      });
    }

    let response = await axios.get(
      `https://www.themealdb.com/api/json/v2/${apiKey}/lookup.php?i=${apiPrzepisId}`
    );

    let meal = response.data.meals ? response.data.meals[0] : null;

    if (!meal) {
      return res.status(404).json({ error: "Nie znaleziono przepisu" });
    }

    let localRecipe = await saveMealIfNotExists(meal);
    let stats = await getRecipeStats(localRecipe.id);

    let skladniki = [];

    for (let i = 1; i <= 20; i++) {
      let ingredient = meal["strIngredient" + i];
      let measure = meal["strMeasure" + i];

      if (ingredient && ingredient.trim() !== "") {
        skladniki.push({
          nazwa: ingredient,
          ilosc: measure ? measure.trim() : ""
        });
      }
    }

    let wynik = {
      id: localRecipe.id,
      api_przepis_id: localRecipe.api_przepis_id,
      tytul: localRecipe.tytul,
      kategoria: localRecipe.kategoria,
      obszar: localRecipe.obszar,
      youtube: localRecipe.youtube,
      obrazek: localRecipe.obrazek,
      instrukcje: localRecipe.instrukcje,
      srednia_ocen: stats.srednia_ocen,
      liczba_opinii: stats.liczba_opinii,
      skladniki: skladniki
    };

    res.json(wynik);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/ulubione/sprawdz", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let api_przepis_id = req.query.api_przepis_id;

    if (!api_przepis_id) {
      return res.status(400).json({ error: "Brakuje parametrów." });
    }

    let result = await pool.query(
      `
      SELECT u.id
      FROM public.ulubione u
      JOIN public.przepisy_api p ON p.id = u.przepis_api_id
      WHERE u.uzytkownik_id = $1 AND p.api_przepis_id = $2
      `,
      [uzytkownik_id, api_przepis_id]
    );

    res.json({
      isFavorite: result.rows.length > 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/ulubione", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let recipeData = req.body.recipe;

    if (!recipeData || !recipeData.api_przepis_id) {
      return res.status(400).json({ error: "Brakuje danych do dodania ulubionego." });
    }

    let localRecipe = await saveRecipeDataIfNotExists(recipeData);

    await pool.query(
      `
      INSERT INTO public.ulubione (uzytkownik_id, przepis_api_id)
      VALUES ($1, $2)
      ON CONFLICT (uzytkownik_id, przepis_api_id) DO NOTHING
      `,
      [uzytkownik_id, localRecipe.id]
    );

    res.json({
      message: "Przepis został dodany do ulubionych."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/ulubione", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let api_przepis_id = req.body.api_przepis_id;

    if (!api_przepis_id) {
      return res.status(400).json({ error: "Brakuje danych do usunięcia ulubionego." });
    }

    let recipeResult = await pool.query(
      "SELECT id FROM public.przepisy_api WHERE api_przepis_id = $1",
      [String(api_przepis_id)]
    );

    if (recipeResult.rows.length === 0) {
      return res.json({ message: "Przepisu nie było w bazie ulubionych." });
    }

    let przepis_api_id = recipeResult.rows[0].id;

    await pool.query(
      `
      DELETE FROM public.ulubione
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      `,
      [uzytkownik_id, przepis_api_id]
    );

    res.json({
      message: "Przepis został usunięty z ulubionych."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/ulubione/uzytkownik/:uzytkownikId", requireSameUserOrAdmin, async (req, res) => {
  try {
    let uzytkownikId = req.params.uzytkownikId;

    let result = await pool.query(
      `
      SELECT
        p.id,
        p.api_przepis_id,
        p.tytul,
        p.kategoria,
        p.obszar,
        p.obrazek,
        p.youtube,
        p.instrukcje,
        COALESCE(opinie_stats.liczba_opinii, 0)::int AS liczba_opinii,
        COALESCE(oceny_stats.srednia_ocen, 0) AS srednia_ocen
      FROM public.ulubione u
      JOIN public.przepisy_api p ON p.id = u.przepis_api_id
      LEFT JOIN (
        SELECT
          przepis_api_id,
          COUNT(*)::int AS liczba_opinii
        FROM public.opinie
        WHERE komentarz IS NOT NULL AND TRIM(komentarz) <> ''
        GROUP BY przepis_api_id
      ) opinie_stats
        ON opinie_stats.przepis_api_id = p.id
      LEFT JOIN (
        SELECT
          przepis_api_id,
          ROUND(AVG(ocena)::numeric, 1) AS srednia_ocen
        FROM public.oceny
        GROUP BY przepis_api_id
      ) oceny_stats
        ON oceny_stats.przepis_api_id = p.id
      WHERE u.uzytkownik_id = $1
      ORDER BY p.tytul ASC
      `,
      [uzytkownikId]
    );

    let wynik = result.rows.map((row) => ({
      id: row.id,
      api_przepis_id: row.api_przepis_id,
      tytul: row.tytul,
      kategoria: row.kategoria,
      obszar: row.obszar,
      obrazek: row.obrazek,
      youtube: row.youtube,
      instrukcje: row.instrukcje,
      liczba_opinii: row.liczba_opinii,
      srednia_ocen: parseFloat(row.srednia_ocen) || 0
    }));

    res.json(wynik);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/oceny/uzytkownika", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let api_przepis_id = req.query.api_przepis_id;

    if (!api_przepis_id) {
      return res.status(400).json({ error: "Brakuje parametrów." });
    }

    let recipeResult = await pool.query(
      "SELECT id FROM public.przepisy_api WHERE api_przepis_id = $1",
      [String(api_przepis_id)]
    );

    if (recipeResult.rows.length === 0) {
      return res.json({ ocena: 0 });
    }

    let przepis_api_id = recipeResult.rows[0].id;

    let result = await pool.query(
      `
      SELECT ocena
      FROM public.oceny
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      LIMIT 1
      `,
      [uzytkownik_id, przepis_api_id]
    );

    if (result.rows.length === 0) {
      return res.json({ ocena: 0 });
    }

    res.json({ ocena: result.rows[0].ocena || 0 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/oceny", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let recipe = req.body.recipe;
    let ocena = parseInt(req.body.ocena);

    if (!recipe || !recipe.api_przepis_id || !ocena) {
      return res.status(400).json({ error: "Brakuje danych." });
    }

    if (ocena < 1 || ocena > 5) {
      return res.status(400).json({ error: "Ocena musi być od 1 do 5." });
    }

    let localRecipe = await saveRecipeDataIfNotExists(recipe);

    let existing = await pool.query(
      `
      SELECT id
      FROM public.oceny
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      LIMIT 1
      `,
      [uzytkownik_id, localRecipe.id]
    );

    if (existing.rows.length > 0) {
      await pool.query(
        `
        UPDATE public.oceny
        SET ocena = $1,
            data_dodania = CURRENT_TIMESTAMP
        WHERE uzytkownik_id = $2 AND przepis_api_id = $3
        `,
        [ocena, uzytkownik_id, localRecipe.id]
      );
    } else {
      await pool.query(
        `
        INSERT INTO public.oceny (uzytkownik_id, przepis_api_id, ocena)
        VALUES ($1, $2, $3)
        `,
        [uzytkownik_id, localRecipe.id, ocena]
      );
    }

    let stats = await getRecipeStats(localRecipe.id);

    res.json({
      message: "Ocena została zapisana.",
      srednia_ocen: stats.srednia_ocen,
      liczba_opinii: stats.liczba_opinii
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/opinie/:apiPrzepisId", async (req, res) => {
  try {
    let apiPrzepisId = req.params.apiPrzepisId;
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 4;
    let offset = (page - 1) * limit;

    let recipeResult = await pool.query(
      "SELECT id FROM public.przepisy_api WHERE api_przepis_id = $1",
      [String(apiPrzepisId)]
    );

    if (recipeResult.rows.length === 0) {
      return res.json({
        opinions: [],
        total: 0,
        totalPages: 1,
        currentPage: 1
      });
    }

    let przepis_api_id = recipeResult.rows[0].id;

    let countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM public.opinie
      WHERE przepis_api_id = $1
        AND komentarz IS NOT NULL
        AND TRIM(komentarz) <> ''
      `,
      [przepis_api_id]
    );

    let total = countResult.rows[0].total || 0;
    let totalPages = Math.max(1, Math.ceil(total / limit));

    let result = await pool.query(
      `
      SELECT
        o.id,
        o.komentarz,
        o.data_dodania,
        u.nazwa_uzytkownika,
        r.ocena
      FROM public.opinie o
      JOIN public.uzytkownicy u
        ON u.id = o.uzytkownik_id
      LEFT JOIN public.oceny r
        ON r.uzytkownik_id = o.uzytkownik_id AND r.przepis_api_id = o.przepis_api_id
      WHERE o.przepis_api_id = $1
        AND o.komentarz IS NOT NULL
        AND TRIM(o.komentarz) <> ''
      ORDER BY o.data_dodania DESC, o.id DESC
      LIMIT $2 OFFSET $3
      `,
      [przepis_api_id, limit, offset]
    );

    res.json({
      opinions: result.rows,
      total: total,
      totalPages: totalPages,
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/opinie", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let recipe = req.body.recipe;
    let komentarz = req.body.komentarz?.trim();
    let ocena = parseInt(req.body.ocena);

    if (!recipe || !recipe.api_przepis_id) {
      return res.status(400).json({ error: "Brakuje danych." });
    }

    if (!komentarz) {
      return res.status(400).json({ error: "Treść opinii jest wymagana." });
    }

    if (!ocena || ocena < 1 || ocena > 5) {
      return res.status(400).json({ error: "Ocena musi być od 1 do 5." });
    }

    let localRecipe = await saveRecipeDataIfNotExists(recipe);

    let existingRating = await pool.query(
      `
      SELECT id
      FROM public.oceny
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      LIMIT 1
      `,
      [uzytkownik_id, localRecipe.id]
    );

    if (existingRating.rows.length > 0) {
      await pool.query(
        `
        UPDATE public.oceny
        SET ocena = $1,
            data_dodania = CURRENT_TIMESTAMP
        WHERE uzytkownik_id = $2 AND przepis_api_id = $3
        `,
        [ocena, uzytkownik_id, localRecipe.id]
      );
    } else {
      await pool.query(
        `
        INSERT INTO public.oceny (uzytkownik_id, przepis_api_id, ocena)
        VALUES ($1, $2, $3)
        `,
        [uzytkownik_id, localRecipe.id, ocena]
      );
    }

    let existingOpinion = await pool.query(
      `
      SELECT id
      FROM public.opinie
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      LIMIT 1
      `,
      [uzytkownik_id, localRecipe.id]
    );

    if (existingOpinion.rows.length > 0) {
      await pool.query(
        `
        UPDATE public.opinie
        SET komentarz = $1,
            data_dodania = CURRENT_TIMESTAMP
        WHERE uzytkownik_id = $2 AND przepis_api_id = $3
        `,
        [komentarz, uzytkownik_id, localRecipe.id]
      );
    } else {
      await pool.query(
        `
        INSERT INTO public.opinie (uzytkownik_id, przepis_api_id, komentarz)
        VALUES ($1, $2, $3)
        `,
        [uzytkownik_id, localRecipe.id, komentarz]
      );
    }

    let stats = await getRecipeStats(localRecipe.id);

    res.json({
      message: "Opinia została zapisana.",
      srednia_ocen: stats.srednia_ocen,
      liczba_opinii: stats.liczba_opinii
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/opinie/uzytkownika", requireAuth, async (req, res) => {
  try {
    let uzytkownik_id = req.session.user.id;
    let api_przepis_id = req.query.api_przepis_id;

    if (!api_przepis_id) {
      return res.status(400).json({ error: "Brakuje parametrów." });
    }

    let recipeResult = await pool.query(
      "SELECT id FROM public.przepisy_api WHERE api_przepis_id = $1",
      [String(api_przepis_id)]
    );

    if (recipeResult.rows.length === 0) {
      return res.json({ komentarz: "", ocena: 0 });
    }

    let przepis_api_id = recipeResult.rows[0].id;

    let opinionResult = await pool.query(
      `
      SELECT komentarz
      FROM public.opinie
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      LIMIT 1
      `,
      [uzytkownik_id, przepis_api_id]
    );

    let ratingResult = await pool.query(
      `
      SELECT ocena
      FROM public.oceny
      WHERE uzytkownik_id = $1 AND przepis_api_id = $2
      LIMIT 1
      `,
      [uzytkownik_id, przepis_api_id]
    );

    res.json({
      komentarz: opinionResult.rows[0]?.komentarz || "",
      ocena: ratingResult.rows[0]?.ocena || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/propozycje-przepisow", requireAuth, async (req, res) => {
  try {
    let {
      tytul,
      kategoria,
      obszar,
      skladniki,
      instrukcje,
      youtube,
      obrazek
    } = req.body;

    let uzytkownik_id = req.session.user.id;

    tytul = tytul?.trim();
    kategoria = kategoria?.trim();
    obszar = obszar?.trim();
    skladniki = skladniki?.trim();
    instrukcje = instrukcje?.trim();
    youtube = youtube?.trim();
    obrazek = obrazek?.trim();

    if (!tytul || !kategoria || !skladniki || !instrukcje || !obrazek) {
      return res.status(400).json({
        error: "Wypełnij wszystkie wymagane pola."
      });
    }

    let result = await pool.query(
      `
      INSERT INTO public.propozycje_przepisow
      (uzytkownik_id, tytul, kategoria, obszar, skladniki, instrukcje, youtube, obrazek, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'oczekujacy')
      RETURNING *
      `,
      [
        uzytkownik_id,
        tytul,
        kategoria,
        obszar || null,
        skladniki,
        instrukcje,
        youtube || null,
        obrazek
      ]
    );

    res.status(201).json({
      message: "Propozycja przepisu została wysłana do administratora.",
      proposal: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/admin/propozycje-przepisow", requireAdmin, async (req, res) => {
  try {
    let result = await pool.query(
      `
      SELECT
        p.id,
        p.tytul,
        p.kategoria,
        p.obszar,
        p.skladniki,
        p.instrukcje,
        p.youtube,
        p.obrazek,
        p.status,
        p.data_dodania,
        u.nazwa_uzytkownika,
        u.email
      FROM public.propozycje_przepisow p
      JOIN public.uzytkownicy u
        ON u.id = p.uzytkownik_id
      WHERE p.status = 'oczekujacy'
      ORDER BY p.data_dodania DESC
      `
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/admin/propozycje-przepisow/:id", requireAdmin, async (req, res) => {
  try {
    let id = req.params.id;

    let {
      tytul,
      kategoria,
      obszar,
      skladniki,
      instrukcje,
      youtube,
      obrazek
    } = req.body;

    tytul = tytul?.trim();
    kategoria = kategoria?.trim();
    obszar = obszar?.trim();
    skladniki = skladniki?.trim();
    instrukcje = instrukcje?.trim();
    youtube = youtube?.trim();
    obrazek = obrazek?.trim();

    if (!tytul || !kategoria || !skladniki || !instrukcje || !obrazek) {
      return res.status(400).json({
        error: "Wypełnij wszystkie wymagane pola."
      });
    }

    let existing = await pool.query(
      `
      SELECT id
      FROM public.propozycje_przepisow
      WHERE id = $1
      `,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Nie znaleziono propozycji."
      });
    }

    let result = await pool.query(
      `
      UPDATE public.propozycje_przepisow
      SET
        tytul = $1,
        kategoria = $2,
        obszar = $3,
        skladniki = $4,
        instrukcje = $5,
        youtube = $6,
        obrazek = $7
      WHERE id = $8
      RETURNING *
      `,
      [
        tytul,
        kategoria,
        obszar || null,
        skladniki,
        instrukcje,
        youtube || null,
        obrazek,
        id
      ]
    );

    res.json({
      message: "Propozycja została zaktualizowana.",
      proposal: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/propozycje-przepisow/:id/zaakceptuj", requireAdmin, async (req, res) => {
  try {
    let id = req.params.id;

    let proposalResult = await pool.query(
      `
      SELECT *
      FROM public.propozycje_przepisow
      WHERE id = $1
      `,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono propozycji." });
    }

    let proposal = proposalResult.rows[0];

    let insertedUserRecipe = await pool.query(
      `
      INSERT INTO public.przepisy_uzytkownikow
      (uzytkownik_id, tytul, kategoria, obszar, skladniki, instrukcje, youtube, obrazek)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
      `,
      [
        proposal.uzytkownik_id,
        proposal.tytul,
        proposal.kategoria,
        proposal.obszar,
        proposal.skladniki,
        proposal.instrukcje,
        proposal.youtube,
        proposal.obrazek
      ]
    );

    let userRecipe = insertedUserRecipe.rows[0];
    let syntheticApiId = "user-" + userRecipe.id;

    await pool.query(
      `
      INSERT INTO public.przepisy_api
      (api_przepis_id, tytul, kategoria, obszar, obrazek, youtube, instrukcje)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        syntheticApiId,
        userRecipe.tytul,
        userRecipe.kategoria,
        userRecipe.obszar,
        userRecipe.obrazek,
        userRecipe.youtube,
        userRecipe.instrukcje
      ]
    );

    await pool.query(
      `
      DELETE FROM public.propozycje_przepisow
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      message: "Propozycja została zaakceptowana i dodana do bazy przepisów."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/admin/propozycje-przepisow/:id/odrzuc", requireAdmin, async (req, res) => {
  try {
    let id = req.params.id;

    let proposalResult = await pool.query(
      `
      SELECT id
      FROM public.propozycje_przepisow
      WHERE id = $1
      `,
      [id]
    );

    if (proposalResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono propozycji." });
    }

    await pool.query(
      `
      DELETE FROM public.propozycje_przepisow
      WHERE id = $1
      `,
      [id]
    );

    res.json({
      message: "Propozycja została odrzucona i usunięta."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/opinie/:id", requireAdmin, async (req, res) => {
  try {
    let id = req.params.id;

    let opinionResult = await pool.query(
      `
      SELECT id, przepis_api_id
      FROM public.opinie
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (opinionResult.rows.length === 0) {
      return res.status(404).json({ error: "Nie znaleziono opinii." });
    }

    let opinion = opinionResult.rows[0];

    await pool.query(
      `
      DELETE FROM public.opinie
      WHERE id = $1
      `,
      [id]
    );

    let stats = await getRecipeStats(opinion.przepis_api_id);

    res.json({
      message: "Opinia została usunięta.",
      srednia_ocen: stats.srednia_ocen,
      liczba_opinii: stats.liczba_opinii
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log("Serwer działa na porcie " + port);
});