import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteButton from "./FavoriteButton";
import RecipeRatingInput from "./RecipeRatingInput";
import { translateCategory, translateArea } from "../utils/translations";

function PopularSection() {
  let [recipes, setRecipes] = useState([]);
  let [loading, setLoading] = useState(true);
  let navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5000/api/przepisy/popularne?limit=6", {
      credentials: "include"
    })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRecipes(data);
        } else {
          setRecipes([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setRecipes([]);
        setLoading(false);
      });
  }, []);

  function updateRecipeRating(recipeId, newStats) {
    setRecipes((prev) =>
      prev.map((item) =>
        item.api_przepis_id === recipeId
          ? {
              ...item,
              srednia_ocen: newStats.srednia_ocen,
              liczba_opinii: newStats.liczba_opinii
            }
          : item
      )
    );
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

  return (
    <section className="section section-light">
      <div className="container">
        <div className="section-header">
          <h2>Popularne przepisy</h2>
          <p>Najwyżej oceniane przepisy z największą liczbą opinii.</p>
        </div>

        {loading ? (
          <p>Ładowanie popularnych przepisów...</p>
        ) : recipes.length === 0 ? (
          <p>Brak danych o popularnych przepisach.</p>
        ) : (
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <div className="recipe-card" key={recipe.api_przepis_id}>
                <div className="recipe-card-image-box">
                  <FavoriteButton recipe={recipe} />
                  <img
                    src={recipe.obrazek}
                    alt={recipe.tytul}
                    className="recipe-card-image"
                  />
                </div>

                <div className="recipe-card-body">
                  <span className="recipe-badge">
                    {translateCategory(recipe.kategoria) || "Przepis"}
                  </span>

                  <h3>{recipe.tytul}</h3>

                  <p className="recipe-country">
                    🌍 {translateArea(recipe.obszar) || "Brak kraju"}
                  </p>

                  <div className="recipe-rating">
                    <span className="stars">{renderStars(recipe.srednia_ocen)}</span>
                    <span className="rating-number">{recipe.srednia_ocen}/5</span>
                    <span className="review-count">
                      ({recipe.liczba_opinii} opinii)
                    </span>
                  </div>

                  <RecipeRatingInput
                    recipe={recipe}
                    onRatingSaved={(newStats) =>
                      updateRecipeRating(recipe.api_przepis_id, newStats)
                    }
                  />

                  <p>
                    {recipe.instrukcje
                      ? recipe.instrukcje.substring(0, 100) + "..."
                      : "Brak opisu przepisu."}
                  </p>

                  <button
                    className="secondary-button"
                    onClick={() => navigate("/przepisy/" + recipe.api_przepis_id)}
                  >
                    Zobacz przepis
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default PopularSection;