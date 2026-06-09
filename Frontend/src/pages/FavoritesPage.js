import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FavoriteButton from "../components/FavoriteButton";
import "../styles/FavoritesPage.css";
import { translateCategory, translateArea } from "../utils/translations";

function FavoritesPage() {
  let [recipes, setRecipes] = useState([]);
  let [loading, setLoading] = useState(true);
  let [currentSpread, setCurrentSpread] = useState(0);
  let [isTurning, setIsTurning] = useState(false);
  let [turnDirection, setTurnDirection] = useState("");
  let [sessionUser, setSessionUser] = useState(null);
  let [sessionLoading, setSessionLoading] = useState(true);

  let navigate = useNavigate();

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
    } catch (error) {
      console.log(error);
      setSessionUser(null);
      setSessionLoading(false);
    }
  }, []);

  let loadFavorites = useCallback(async () => {
    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/auth/me", {
        credentials: "include"
      });

      if (!response.ok) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      let sessionData = await response.json();
      let user = sessionData.user;

      if (!user?.id) {
        setRecipes([]);
        setLoading(false);
        return;
      }

      let favoritesResponse = await fetch(
        "http://localhost:5000/api/ulubione/uzytkownik/" + user.id,
        {
          credentials: "include"
        }
      );

      let data = await favoritesResponse.json();

      if (Array.isArray(data)) {
        setRecipes(data);
      } else {
        setRecipes([]);
      }

      setCurrentSpread(0);
      setLoading(false);
    } catch (error) {
      console.log(error);
      setRecipes([]);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessionUser();
    loadFavorites();

    function reloadFavorites() {
      loadSessionUser();
      loadFavorites();
    }

    window.addEventListener("favoritesChanged", reloadFavorites);
    window.addEventListener("authChanged", reloadFavorites);

    return () => {
      window.removeEventListener("favoritesChanged", reloadFavorites);
      window.removeEventListener("authChanged", reloadFavorites);
    };
  }, [loadSessionUser, loadFavorites]);

  useEffect(() => {
    if (currentSpread >= recipes.length && recipes.length > 0) {
      let fixedSpread = Math.max(0, Math.floor((recipes.length - 1) / 2) * 2);
      setCurrentSpread(fixedSpread);
    }
  }, [recipes, currentSpread]);

  function renderStars(value) {
    let rating = Math.round(value || 0);
    let stars = [];

    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? "star filled" : "star"}>
          {i <= rating ? "★" : "☆"}
        </span>
      );
    }

    return stars;
  }

  let totalSpreads = Math.ceil(recipes.length / 2);
  let leftRecipe = recipes[currentSpread];
  let rightRecipe = recipes[currentSpread + 1];

  function goNext() {
    if (isTurning) return;
    if (currentSpread + 2 >= recipes.length) return;

    setTurnDirection("next");
    setIsTurning(true);

    setTimeout(() => {
      setCurrentSpread((prev) => prev + 2);
    }, 220);

    setTimeout(() => {
      setIsTurning(false);
      setTurnDirection("");
    }, 520);
  }

  function goPrev() {
    if (isTurning) return;
    if (currentSpread - 2 < 0) return;

    setTurnDirection("prev");
    setIsTurning(true);

    setTimeout(() => {
      setCurrentSpread((prev) => prev - 2);
    }, 220);

    setTimeout(() => {
      setIsTurning(false);
      setTurnDirection("");
    }, 520);
  }

  function RecipePage({ recipe, side }) {
    if (!recipe) {
      return (
        <div className={`book-page ${side}`}>
          <div className="book-page-inner empty-page">
            <p>Brak przepisu na tej stronie.</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`book-page ${side}`}>
        <div className="book-page-inner">
          <div className="book-page-image-box">
            <FavoriteButton recipe={recipe} />
            <img src={recipe.obrazek} alt={recipe.tytul} className="book-page-image" />
          </div>

          <div className="book-page-content">
            <span className="book-page-badge">
              {translateCategory(recipe.kategoria) || "Przepis"}
            </span>

            <h2>{recipe.tytul}</h2>

            <p className="book-page-country">
              🌍 {translateArea(recipe.obszar) || "Brak kraju"}
            </p>

            <div className="book-page-rating">
              <div className="recipe-stars">{renderStars(recipe.srednia_ocen)}</div>
              <span>
                {recipe.srednia_ocen}/5 ({recipe.liczba_opinii} opinii)
              </span>
            </div>

            <p className="book-page-description">
              {recipe.instrukcje
                ? recipe.instrukcje.substring(0, 180) + "..."
                : "Brak opisu przepisu."}
            </p>

            <div className="book-page-actions">
              {recipe.youtube ? (
                <a
                  href={recipe.youtube}
                  target="_blank"
                  rel="noreferrer"
                  className="book-btn-primary"
                >
                  Obejrzyj przepis
                </a>
              ) : (
                <button className="book-btn-primary disabled" disabled>
                  Brak filmu
                </button>
              )}

              <button
                className="book-btn-secondary"
                onClick={() => navigate("/przepisy/" + recipe.api_przepis_id)}
              >
                Szczegóły przepisu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (sessionLoading) {
    return (
      <div className="app">
        <Navbar />
        <main className="favorites-page">
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

        <main className="favorites-page">
          <section className="favorites-hero">
            <div className="container">
              <h1>Twoje ulubione przepisy</h1>
              <p>
                Zaloguj się, aby zobaczyć zapisane przepisy i wracać do nich w każdej chwili.
              </p>
            </div>
          </section>

          <section className="section">
            <div className="container">
              <div className="favorites-empty">
                <h3>Musisz być zalogowany</h3>
                <p>Ta sekcja jest dostępna tylko dla zalogowanych użytkowników.</p>
                <div className="book-page-actions">
                  <button
                    className="book-btn-primary"
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

      <main className="favorites-page">
        <section className="favorites-hero">
          <div className="container">
            <h1>Twoje ulubione przepisy</h1>
            <p>
              Przeglądaj zapisane przepisy w formie kulinarnej książki z
              animowanym przewracaniem stron.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            {loading ? (
              <p>Ładowanie ulubionych...</p>
            ) : recipes.length === 0 ? (
              <div className="favorites-empty">
                <h3>Nie masz jeszcze ulubionych przepisów</h3>
                <p>
                  Kliknij serduszko przy przepisie, aby dodać go do ulubionych.
                </p>
              </div>
            ) : (
              <>
                <div className="book-topbar">
                  <div className="book-counter">
                    Rozkładówka {Math.floor(currentSpread / 2) + 1} z {totalSpreads}
                  </div>

                  <div className="book-arrows">
                    <button
                      className="book-arrow"
                      onClick={goPrev}
                      disabled={currentSpread === 0 || isTurning}
                    >
                      ←
                    </button>

                    <button
                      className="book-arrow"
                      onClick={goNext}
                      disabled={currentSpread + 2 >= recipes.length || isTurning}
                    >
                      →
                    </button>
                  </div>
                </div>

                <div
                  className={`recipe-book ${
                    isTurning ? `turning ${turnDirection}` : ""
                  }`}
                >
                  <div className="book-spine"></div>

                  <RecipePage recipe={leftRecipe} side="left" />
                  <RecipePage recipe={rightRecipe} side="right" />
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default FavoritesPage;