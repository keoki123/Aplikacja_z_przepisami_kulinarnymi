import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/RecipeRatingInput.css";

function RecipeRatingInput({ recipe, onRatingSaved }) {
  let [sessionUser, setSessionUser] = useState(null);
  let [userRating, setUserRating] = useState(0);
  let [loading, setLoading] = useState(false);
  let navigate = useNavigate();

  let loadSessionUser = useCallback(async () => {
    try {
      let response = await fetch("http://localhost:5000/api/auth/me", {
        credentials: "include"
      });

      if (!response.ok) {
        setSessionUser(null);
        setUserRating(0);
        return;
      }

      let data = await response.json();
      setSessionUser(data.user || null);
    } catch (error) {
      console.log(error);
      setSessionUser(null);
      setUserRating(0);
    }
  }, []);

  let loadUserRating = useCallback(async () => {
    if (!sessionUser || !recipe?.api_przepis_id) {
      setUserRating(0);
      return;
    }

    try {
      let response = await fetch(
        `http://localhost:5000/api/oceny/uzytkownika?uzytkownik_id=${sessionUser.id}&api_przepis_id=${recipe.api_przepis_id}`,
        {
          credentials: "include"
        }
      );

      let data = await response.json();
      setUserRating(data.ocena || 0);
    } catch (error) {
      console.log(error);
    }
  }, [sessionUser, recipe]);

  useEffect(() => {
    loadSessionUser();
    window.addEventListener("authChanged", loadSessionUser);

    return () => {
      window.removeEventListener("authChanged", loadSessionUser);
    };
  }, [loadSessionUser]);

  useEffect(() => {
    loadUserRating();
  }, [loadUserRating]);

  async function handleRate(value) {
    if (!sessionUser) {
      navigate("/logowanie");
      return;
    }

    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/oceny", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          uzytkownik_id: sessionUser.id,
          recipe: recipe,
          ocena: value
        })
      });

      let data = await response.json();

      if (!response.ok) {
        setLoading(false);
        return;
      }

      setUserRating(value);
      setLoading(false);

      if (onRatingSaved) {
        onRatingSaved({
          srednia_ocen: data.srednia_ocen,
          liczba_opinii: data.liczba_opinii
        });
      }
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

if (!sessionUser) return null;

return (
  <div className="recipe-rating-input-box">
    <p className="recipe-rating-input-label">Twoja ocena</p>

    <div className="recipe-rating-input-stars">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          className={
            value <= userRating
              ? "recipe-rating-input-star active"
              : "recipe-rating-input-star"
          }
          onClick={() => handleRate(value)}
          disabled={loading}
          title={`Oceń na ${value}`}
        >
          ★
        </button>
      ))}
    </div>
  </div>
);
}

export default RecipeRatingInput;