import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/AddRecipePage.css";
import { CATEGORY_OPTIONS, AREA_OPTIONS } from "../utils/translations";
import { ingredientTranslations } from "../utils/ingredientTranslations";

const UNIT_OPTIONS = [
  { value: "", label: "Jednostka" },

  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
  { value: "lb", label: "lb" },
  { value: "oz", label: "oz" },

  { value: "cup", label: "szklanka" },
  { value: "cups", label: "szklanki" },

  { value: "tbsp", label: "łyżka" },
  { value: "tsp", label: "łyżeczka" },

  { value: "clove", label: "ząbek" },
  { value: "cloves", label: "ząbki" },

  { value: "slice", label: "plaster" },
  { value: "slices", label: "plastry" },

  { value: "piece", label: "kawałek" },
  { value: "pieces", label: "kawałki" },

  { value: "pinch", label: "szczypta" },
  { value: "pinches", label: "szczypty" },
  { value: "dash", label: "odrobina" }
  { value: "drops", label: "krople" },

  { value: "bunch", label: "pęczek" },
  { value: "small bunch", label: "mały pęczek" },
  { value: "sprig", label: "gałązka" },
  { value: "sprigs", label: "gałązki" },

  { value: "leaf", label: "liść" },
  { value: "leaves", label: "liście" },
  { value: "head", label: "główka" },
  { value: "heads", label: "główki" },

  { value: "bulb", label: "cebula / główka" },
  { value: "stalk", label: "łodyga" },
  { value: "stalks", label: "łodygi" },
  { value: "stick", label: "laska" },
  { value: "sticks", label: "laski" },
  { value: "pod", label: "strąk" },
  { value: "pods", label: "strąki" },

  { value: "handful", label: "garść" },
  { value: "handfuls", label: "garście" },
  { value: "large handful", label: "duża garść" },

  { value: "can", label: "puszka" },
  { value: "cans", label: "puszki" },
  { value: "tin", label: "konserwa" },
  { value: "jar", label: "słoik" },
  { value: "bottle", label: "butelka" },
  { value: "bag", label: "torebka" },
  { value: "packet", label: "paczka" },
  { value: "pack", label: "opakowanie" },
  { value: "small pack", label: "małe opakowanie" },
  { value: "pot", label: "pojemnik" },
  { value: "tub", label: "kubeczek" },
  { value: "tubs", label: "kubeczki" },

  { value: "fillet", label: "filet" },
  { value: "fillets", label: "filety" },

  { value: "knob", label: "kawałeczek" },
  { value: "knobs", label: "kawałeczki" },

  { value: "pint", label: "pinta" },
  { value: "qt", label: "kwarta" },

  { value: "part", label: "część" },
  { value: "parts", label: "części" },

  { value: "to taste", label: "do smaku" },
  { value: "for frying", label: "do smażenia" },
  { value: "for garnish", label: "do dekoracji" },
  { value: "to serve", label: "do podania" },
  { value: "for brushing", label: "do posmarowania" },
  { value: "drizzle", label: "do skropienia" },

  { value: "whole", label: "całość" },
  { value: "half", label: "połowa" }
];

function normalizeText(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function AddRecipePage() {
  let [tytul, setTytul] = useState("");
  let [kategoria, setKategoria] = useState("");
  let [obszar, setObszar] = useState("");
  let [instrukcje, setInstrukcje] = useState("");
  let [youtube, setYoutube] = useState("");
  let [obrazek, setObrazek] = useState("");

  let [ingredients, setIngredients] = useState([
    { nazwa: "", ilosc: "", jednostka: "" }
  ]);

  let [loading, setLoading] = useState(false);
  let [error, setError] = useState("");
  let [success, setSuccess] = useState("");
  let [sessionUser, setSessionUser] = useState(null);
  let [sessionLoading, setSessionLoading] = useState(true);

  let navigate = useNavigate();

  const polishToEnglishIngredientsMap = useMemo(() => {
    let reverseMap = {};

    Object.entries(ingredientTranslations).forEach(([englishName, polishName]) => {
      let normalizedPolish = normalizeText(polishName);
      let normalizedEnglish = normalizeText(englishName);

      if (normalizedPolish && !reverseMap[normalizedPolish]) {
        reverseMap[normalizedPolish] = englishName;
      }

      if (normalizedEnglish && !reverseMap[normalizedEnglish]) {
        reverseMap[normalizedEnglish] = englishName;
      }
    });

    return reverseMap;
  }, []);

  let loadSessionUser = useCallback(async () => {
    try {
      let response = await fetch("http://localhost:5000/api/auth/me", {
        credentials: "include"
      });

      if (!response.ok) {
        setSessionUser(null);
        setSessionLoading(false);
        return;
      }

      let data = await response.json();
      setSessionUser(data.user || null);
      setSessionLoading(false);
    } catch (err) {
      console.log(err);
      setSessionUser(null);
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionUser();
    window.addEventListener("authChanged", loadSessionUser);

    return () => {
      window.removeEventListener("authChanged", loadSessionUser);
    };
  }, [loadSessionUser]);

  function handleIngredientChange(index, field, value) {
    setIngredients((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }

  function addIngredientRow() {
    setIngredients((prev) => [
      ...prev,
      { nazwa: "", ilosc: "", jednostka: "" }
    ]);
  }

  function removeIngredientRow(index) {
    setIngredients((prev) => {
      if (prev.length === 1) {
        return [{ nazwa: "", ilosc: "", jednostka: "" }];
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  function translateIngredientNameToEnglish(name) {
    let cleanedName = name.trim();
    let normalizedName = normalizeText(cleanedName);

    return polishToEnglishIngredientsMap[normalizedName] || cleanedName;
  }

  function buildIngredientsText() {
    return ingredients
      .filter((item) => item.nazwa.trim())
      .map((item) => {
        let englishName = translateIngredientNameToEnglish(item.nazwa);
        let amount = item.ilosc.trim();
        let unit = item.jednostka.trim();

        return `${englishName} | ${amount} | ${unit}`;
      })
      .join("\n");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!sessionUser) {
      navigate("/logowanie");
      return;
    }

    let skladnikiText = buildIngredientsText();
    let validIngredientsCount = ingredients.filter((item) =>
      item.nazwa.trim()
    ).length;

    if (
      !tytul.trim() ||
      !kategoria.trim() ||
      !obszar.trim() ||
      !instrukcje.trim() ||
      !obrazek.trim()
    ) {
      setError("Wypełnij wszystkie wymagane pola.");
      return;
    }

    if (validIngredientsCount === 0) {
      setError("Dodaj przynajmniej jeden składnik.");
      return;
    }

    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/propozycje-przepisow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          uzytkownik_id: sessionUser.id,
          tytul,
          kategoria,
          obszar,
          skladniki: skladnikiText,
          instrukcje,
          youtube,
          obrazek
        })
      });

      let data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się wysłać propozycji przepisu.");
        setLoading(false);
        return;
      }

      setSuccess("Propozycja przepisu została wysłana do administratora.");
      setTytul("");
      setKategoria("");
      setObszar("");
      setInstrukcje("");
      setYoutube("");
      setObrazek("");
      setIngredients([{ nazwa: "", ilosc: "", jednostka: "" }]);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setError("Nie udało się połączyć z serwerem.");
      setLoading(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="app">
        <Navbar />
        <main className="add-recipe-page">
          <section className="section">
            <div className="container">
              <p>Sprawdzanie sesji...</p>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <div className="app">
        <Navbar />

        <main className="add-recipe-page">
          <section className="add-recipe-hero">
            <div className="container">
              <h1>Dodaj swój przepis</h1>
              <p>
                Zaloguj się, aby wysłać propozycję nowego przepisu do administratora.
              </p>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="add-recipe-card">
                <div className="add-recipe-card-header">
                  <h2>Musisz być zalogowany</h2>
                  <p>Ta funkcja jest dostępna tylko dla zalogowanych użytkowników.</p>
                </div>

                <div className="add-recipe-actions">
                  <button
                    type="button"
                    className="add-recipe-submit-btn"
                    onClick={() => navigate("/logowanie")}
                  >
                    Przejdź do logowania
                  </button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar />

      <main className="add-recipe-page">
        <section className="add-recipe-hero">
          <div className="container">
            <h1>Dodaj swój przepis</h1>
            <p>
              Wyślij propozycję nowego przepisu. Administrator sprawdzi zgłoszenie
              i po akceptacji przepis pojawi się w serwisie.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="add-recipe-card">
              <div className="add-recipe-card-header">
                <h2>Formularz przepisu</h2>
                <p>Wpisz dane przepisu jak najdokładniej.</p>
              </div>

              <form className="add-recipe-form" onSubmit={handleSubmit}>
                <div className="add-recipe-form-group">
                  <label>Tytuł przepisu *</label>
                  <input
                    type="text"
                    value={tytul}
                    onChange={(e) => setTytul(e.target.value)}
                    placeholder="Np. Domowa lasagne"
                  />
                </div>

                <div className="add-recipe-form-row">
                  <div className="add-recipe-form-group">
                    <label>Kategoria *</label>
                    <select
                      value={kategoria}
                      onChange={(e) => setKategoria(e.target.value)}
                    >
                      <option value="">Wybierz kategorię</option>
                      {CATEGORY_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="add-recipe-form-group">
                    <label>Kraj / kuchnia *</label>
                    <select
                      value={obszar}
                      onChange={(e) => setObszar(e.target.value)}
                    >
                      <option value="">Wybierz kraj / kuchnię</option>
                      {AREA_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="add-recipe-form-group">
                  <label>Składniki *</label>

                  <div className="ingredient-builder">
                    {ingredients.map((ingredient, index) => (
                      <div className="ingredient-row" key={index}>
                        <input
                          type="text"
                          placeholder="Nazwa składnika, np. Kurczak"
                          value={ingredient.nazwa}
                          onChange={(e) =>
                            handleIngredientChange(index, "nazwa", e.target.value)
                          }
                        />

                        <input
                          type="text"
                          placeholder="Ilość, np. 500"
                          value={ingredient.ilosc}
                          onChange={(e) =>
                            handleIngredientChange(index, "ilosc", e.target.value)
                          }
                        />

                        <select
                          value={ingredient.jednostka}
                          onChange={(e) =>
                            handleIngredientChange(index, "jednostka", e.target.value)
                          }
                        >
                          {UNIT_OPTIONS.map((unit) => (
                            <option key={unit.value || "empty"} value={unit.value}>
                              {unit.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className="ingredient-remove-btn"
                          onClick={() => removeIngredientRow(index)}
                        >
                          Usuń
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="ingredient-add-btn"
                    onClick={addIngredientRow}
                  >
                    + Dodaj składnik
                  </button>
                </div>

                <div className="add-recipe-form-group">
                  <label>Instrukcje przygotowania *</label>
                  <textarea
                    value={instrukcje}
                    onChange={(e) => setInstrukcje(e.target.value)}
                    placeholder="Opisz krok po kroku sposób przygotowania przepisu..."
                    rows="9"
                  />
                </div>

                <div className="add-recipe-form-group">
                  <label>Link do YouTube</label>
                  <input
                    type="text"
                    value={youtube}
                    onChange={(e) => setYoutube(e.target.value)}
                    placeholder="https://www.youtube.com/..."
                  />
                </div>

                <div className="add-recipe-form-group">
                  <label>Link do zdjęcia *</label>
                  <input
                    type="text"
                    value={obrazek}
                    onChange={(e) => setObrazek(e.target.value)}
                    placeholder="https://..."
                  />
                </div>

                {obrazek.trim() && (
                  <div className="add-recipe-preview">
                    <p>Podgląd zdjęcia:</p>
                    <img src={obrazek} alt="Podgląd przepisu" />
                  </div>
                )}

                {error && <p className="add-recipe-error">{error}</p>}
                {success && <p className="add-recipe-success">{success}</p>}

                <div className="add-recipe-actions">
                  <button type="submit" className="add-recipe-submit-btn" disabled={loading}>
                    {loading ? "Wysyłanie..." : "Wyślij do akceptacji"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AddRecipePage;