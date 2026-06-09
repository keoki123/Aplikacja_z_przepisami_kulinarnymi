import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FavoriteButton from "../components/FavoriteButton";
import RecipeRatingInput from "../components/RecipeRatingInput";
import "../styles/RecipeDetailsPage.css";
import { translateCategory, translateArea } from "../utils/translations";
import { translateIngredient } from "../utils/ingredientTranslations";
import { translateMeasurePhrase } from "../utils/measureTranslations";

function IngredientItem({ item }) {
  let [imageError, setImageError] = useState(false);

  let ingredientImage =
    "https://www.themealdb.com/images/ingredients/" +
    item.nazwa.replaceAll(" ", "_") +
    "-medium.png";

  return (
    <div className="ingredient-card">
      <div
        className={
          imageError
            ? "ingredient-image-box ingredient-image-box-empty"
            : "ingredient-image-box"
        }
      >
        {!imageError && (
          <img
            src={ingredientImage}
            alt={translateIngredient(item.nazwa)}
            className="ingredient-image"
            onError={() => setImageError(true)}
          />
        )}
      </div>

      <div className="ingredient-info">
        <div className="ingredient-name">
          {translateIngredient(item.nazwa)}
        </div>
        <div className="ingredient-amount">
          {translateMeasurePhrase(item.ilosc)}
        </div>
      </div>
    </div>
  );
}

function RecipeDetailsPage() {
  let { apiPrzepisId } = useParams();
  let navigate = useNavigate();

  let [sessionUser, setSessionUser] = useState(null);
  let [sessionLoading, setSessionLoading] = useState(true);

  let [recipe, setRecipe] = useState(null);
  let [loading, setLoading] = useState(true);

  let [comment, setComment] = useState("");
  let [userOpinionRating, setUserOpinionRating] = useState(0);
  let [savingOpinion, setSavingOpinion] = useState(false);
  let [opinionMessage, setOpinionMessage] = useState("");
  let [opinionError, setOpinionError] = useState("");

  let [opinions, setOpinions] = useState([]);
  let [opinionsLoading, setOpinionsLoading] = useState(true);
  let [opinionsPage, setOpinionsPage] = useState(1);
  let [opinionsTotalPages, setOpinionsTotalPages] = useState(1);

  let userId = sessionUser?.id || null;
  let isAdmin = sessionUser?.rola === "admin";

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

  useEffect(() => {
    loadSessionUser();
    window.addEventListener("authChanged", loadSessionUser);

    return () => {
      window.removeEventListener("authChanged", loadSessionUser);
    };
  }, [loadSessionUser]);

  useEffect(() => {
    setOpinionsPage(1);
  }, [apiPrzepisId]);

  useEffect(() => {
    fetch("http://localhost:5000/api/przepisy/szczegoly/" + apiPrzepisId, {
      credentials: "include"
    })
      .then((response) => response.json())
      .then((data) => {
        setRecipe(data);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setRecipe(null);
        setLoading(false);
      });
  }, [apiPrzepisId]);

  let loadOpinions = useCallback(
    async (page) => {
      try {
        setOpinionsLoading(true);

        let response = await fetch(
          `http://localhost:5000/api/opinie/${apiPrzepisId}?page=${page}&limit=4`,
          {
            credentials: "include"
          }
        );
        let data = await response.json();

        setOpinions(Array.isArray(data.opinions) ? data.opinions : []);
        setOpinionsTotalPages(data.totalPages || 1);
        setOpinionsLoading(false);
      } catch (error) {
        console.log(error);
        setOpinions([]);
        setOpinionsTotalPages(1);
        setOpinionsLoading(false);
      }
    },
    [apiPrzepisId]
  );

  let loadMyOpinion = useCallback(async () => {
    if (!userId) {
      setComment("");
      setUserOpinionRating(0);
      return;
    }

    try {
      let response = await fetch(
        `http://localhost:5000/api/opinie/uzytkownika?uzytkownik_id=${userId}&api_przepis_id=${apiPrzepisId}`,
        {
          credentials: "include"
        }
      );
      let data = await response.json();

      setComment(data.komentarz || "");
      setUserOpinionRating(data.ocena || 0);
    } catch (error) {
      console.log(error);
    }
  }, [apiPrzepisId, userId]);

  useEffect(() => {
    loadOpinions(opinionsPage);
  }, [loadOpinions, opinionsPage]);

  useEffect(() => {
    loadMyOpinion();
  }, [loadMyOpinion]);

  function updateRecipeRating(newStats) {
    setRecipe((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        srednia_ocen: newStats.srednia_ocen,
        liczba_opinii: newStats.liczba_opinii
      };
    });
  }

  async function handleSaveOpinion(e) {
    e.preventDefault();

    setOpinionMessage("");
    setOpinionError("");

    if (!userId) {
      navigate("/logowanie");
      return;
    }

    if (!comment.trim()) {
      setOpinionError("Wpisz treść opinii.");
      return;
    }

    if (!userOpinionRating || userOpinionRating < 1 || userOpinionRating > 5) {
      setOpinionError("Wybierz ocenę od 1 do 5.");
      return;
    }

    try {
      setSavingOpinion(true);

      let response = await fetch("http://localhost:5000/api/opinie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          uzytkownik_id: userId,
          recipe: recipe,
          komentarz: comment,
          ocena: userOpinionRating
        })
      });

      let data = await response.json();

      if (!response.ok) {
        setOpinionError(data.error || "Nie udało się zapisać opinii.");
        setSavingOpinion(false);
        return;
      }

      updateRecipeRating({
        srednia_ocen: data.srednia_ocen,
        liczba_opinii: data.liczba_opinii
      });

      setOpinionMessage("Opinia została zapisana.");
      setSavingOpinion(false);
      setOpinionsPage(1);
      loadOpinions(1);
    } catch (error) {
      console.log(error);
      setOpinionError("Nie udało się połączyć z serwerem.");
      setSavingOpinion(false);
    }
  }

  async function handleDeleteOpinion(opinionId) {
    let confirmed = window.confirm("Czy na pewno chcesz usunąć tę opinię?");
    if (!confirmed) return;

    try {
      let response = await fetch("http://localhost:5000/api/opinie/" + opinionId, {
        method: "DELETE",
        credentials: "include"
      });

      let data = await response.json();

      if (!response.ok) {
        alert(data.error || "Nie udało się usunąć opinii.");
        return;
      }

      updateRecipeRating({
        srednia_ocen: data.srednia_ocen,
        liczba_opinii: data.liczba_opinii
      });

      let nextPage = opinionsPage;
      if (opinions.length === 1 && opinionsPage > 1) {
        nextPage = opinionsPage - 1;
        setOpinionsPage(nextPage);
      } else {
        loadOpinions(opinionsPage);
      }
    } catch (error) {
      console.log(error);
      alert("Nie udało się połączyć z serwerem.");
    }
  }

  function renderStars(value) {
    let rating = Math.round(value || 0);
    let stars = [];

    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(
          <span key={i} className="star filled">
            ★
          </span>
        );
      } else {
        stars.push(
          <span key={i} className="star">
            ☆
          </span>
        );
      }
    }

    return stars;
  }

  function splitInstructions(text) {
    if (!text) return [];

    return text
      .split(/\r?\n|\.\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function formatDate(dateString) {
    if (!dateString) return "";

    let date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  if (loading || sessionLoading) {
    return (
      <div className="app">
        <Navbar />
        <main className="recipe-details-page">
          <div className="container">
            <p>Ładowanie szczegółów przepisu...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!recipe || recipe.error) {
    return (
      <div className="app">
        <Navbar />
        <main className="recipe-details-page">
          <div className="container">
            <p>Nie udało się pobrać szczegółów przepisu.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  let steps = splitInstructions(recipe.instrukcje);

  return (
    <div className="app">
      <Navbar />

      <main className="recipe-details-page">
        <section className="recipe-details-hero">
          <div className="container recipe-details-hero-grid">
            <div className="recipe-details-image-box recipe-details-image-wrapper">
              <FavoriteButton recipe={recipe} />
              <img
                src={recipe.obrazek}
                alt={recipe.tytul}
                className="recipe-details-image"
              />
            </div>

            <div className="recipe-details-main">
              <span className="recipe-details-badge">
                {translateCategory(recipe.kategoria) || "Przepis"}
              </span>

              <h1>{recipe.tytul}</h1>

              <p className="recipe-details-meta">
                🌍 {translateArea(recipe.obszar) || "Brak informacji o kraju"}
              </p>

              <div className="recipe-details-rating">
                <div className="recipe-stars">{renderStars(recipe.srednia_ocen)}</div>
                <span className="recipe-rating-text">
                  {recipe.srednia_ocen}/5 ({recipe.liczba_opinii} opinii)
                </span>
              </div>

              <RecipeRatingInput
                recipe={recipe}
                onRatingSaved={(newStats) => {
                  updateRecipeRating(newStats);
                }}
              />

              <div className="recipe-details-actions">
                {recipe.youtube ? (
                  <a
                    href={recipe.youtube}
                    target="_blank"
                    rel="noreferrer"
                    className="recipe-detail-btn"
                  >
                    Obejrzyj przepis
                  </a>
                ) : (
                  <button className="recipe-detail-btn recipe-detail-btn-disabled" disabled>
                    Brak filmu
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="recipe-details-content section">
          <div className="container recipe-details-grid">
            <div className="recipe-info-card">
              <h2>Składniki</h2>

              <div className="ingredients-list">
                {recipe.skladniki && recipe.skladniki.length > 0 ? (
                  recipe.skladniki.map((item, index) => (
                    <IngredientItem item={item} key={index} />
                  ))
                ) : (
                  <p>Brak składników.</p>
                )}
              </div>
            </div>

            <div className="recipe-info-card">
              <h2>Instrukcja przygotowania</h2>

              <div className="steps-list">
                {steps.length > 0 ? (
                  steps.map((step, index) => (
                    <div className="step-row" key={index}>
                      <div className="step-number">{index + 1}</div>
                      <div className="step-text">{step}</div>
                    </div>
                  ))
                ) : (
                  <p>Brak instrukcji.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="recipe-opinions-section section">
          <div className="container recipe-opinions-layout">
            <div className="recipe-opinion-form-card">
              <h2>Dodaj opinię</h2>
              <p className="recipe-opinion-subtitle">
                Podziel się swoją opinią o tym przepisie.
              </p>

              {!userId ? (
                <div className="recipe-opinion-login-box">
                  <p>Musisz być zalogowany, aby dodać opinię.</p>
                  <button
                    className="recipe-detail-btn"
                    onClick={() => navigate("/logowanie")}
                  >
                    Przejdź do logowania
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSaveOpinion} className="recipe-opinion-form">
                  <div className="recipe-opinion-rating-box">
                    <label>Ocena do opinii</label>
                    <div className="recipe-opinion-stars">
                      {[1, 2, 3, 4, 5].map((value) => (
                        <button
                          key={value}
                          type="button"
                          className={
                            value <= userOpinionRating
                              ? "recipe-opinion-star active"
                              : "recipe-opinion-star"
                          }
                          onClick={() => setUserOpinionRating(value)}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="recipe-opinion-textarea-group">
                    <label>Twoja opinia</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Napisz, co myślisz o tym przepisie..."
                      rows="6"
                    />
                  </div>

                  {opinionError && (
                    <p className="recipe-opinion-error">{opinionError}</p>
                  )}

                  {opinionMessage && (
                    <p className="recipe-opinion-success">{opinionMessage}</p>
                  )}

                  <button
                    type="submit"
                    className="recipe-detail-btn"
                    disabled={savingOpinion}
                  >
                    {savingOpinion ? "Zapisywanie..." : "Zapisz opinię"}
                  </button>
                </form>
              )}
            </div>

            <div className="recipe-opinions-list-card">
              <div className="recipe-opinions-header">
                <div>
                  <h2>Opinie użytkowników</h2>
                  <p className="recipe-opinion-subtitle">
                    Zobacz, co inni sądzą o tym przepisie.
                  </p>
                </div>

                <div className="recipe-opinions-nav">
                  <button
                    type="button"
                    className="recipe-opinions-arrow"
                    disabled={opinionsPage === 1}
                    onClick={() => setOpinionsPage((prev) => prev - 1)}
                  >
                    ←
                  </button>

                  <button
                    type="button"
                    className="recipe-opinions-arrow"
                    disabled={opinionsPage === opinionsTotalPages}
                    onClick={() => setOpinionsPage((prev) => prev + 1)}
                  >
                    →
                  </button>
                </div>
              </div>

              {opinionsLoading ? (
                <p>Ładowanie opinii...</p>
              ) : opinions.length === 0 ? (
                <div className="recipe-opinions-empty">
                  <p>Nie ma jeszcze żadnych opinii do tego przepisu.</p>
                </div>
              ) : (
                <>
                  <div className="recipe-opinions-list">
                    {opinions.map((opinion) => (
                      <div className="recipe-opinion-item" key={opinion.id}>
                        <div className="recipe-opinion-top">
                          <div>
                            <h4>{opinion.nazwa_uzytkownika}</h4>
                            <span>{formatDate(opinion.data_dodania)}</span>
                          </div>

                          <div className="recipe-opinion-top-right">
                            <div className="recipe-opinion-rating">
                              <div className="recipe-stars">
                                {renderStars(opinion.ocena)}
                              </div>
                              <span>{opinion.ocena || 0}/5</span>
                            </div>

                            {isAdmin && (
                              <button
                                type="button"
                                className="recipe-opinion-delete-btn"
                                onClick={() => handleDeleteOpinion(opinion.id)}
                                title="Usuń opinię"
                              >
                                🗑
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="recipe-opinion-text">{opinion.komentarz}</p>
                      </div>
                    ))}
                  </div>

                  <div className="recipe-opinions-pagination-info">
                    Strona {opinionsPage} z {opinionsTotalPages}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default RecipeDetailsPage;