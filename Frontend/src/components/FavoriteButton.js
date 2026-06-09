import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/FavoriteButton.css";

function FavoriteButton({ recipe }) {
  let [isFavorite, setIsFavorite] = useState(false);
  let [loading, setLoading] = useState(false);
  let [sessionUser, setSessionUser] = useState(null);
  let navigate = useNavigate();

  let loadSessionUser = useCallback(async () => {
    try {
      let response = await fetch("http://localhost:5000/api/auth/me", {
        credentials: "include"
      });

      if (!response.ok) {
        setSessionUser(null);
        return;
      }

      let data = await response.json();
      setSessionUser(data.user || null);
    } catch (error) {
      console.log(error);
      setSessionUser(null);
    }
  }, []);

  let checkFavorite = useCallback(async () => {
    if (!sessionUser || !recipe?.api_przepis_id) {
      setIsFavorite(false);
      return;
    }

    try {
      let response = await fetch(
        `http://localhost:5000/api/ulubione/sprawdz?uzytkownik_id=${sessionUser.id}&api_przepis_id=${recipe.api_przepis_id}`,
        {
          credentials: "include"
        }
      );

      let data = await response.json();
      setIsFavorite(!!data.isFavorite);
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
    checkFavorite();
  }, [checkFavorite]);

  async function handleToggle(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!sessionUser) {
      navigate("/logowanie");
      return;
    }

    try {
      setLoading(true);

      if (isFavorite) {
        await fetch("http://localhost:5000/api/ulubione", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            uzytkownik_id: sessionUser.id,
            api_przepis_id: recipe.api_przepis_id
          })
        });

        setIsFavorite(false);
      } else {
        await fetch("http://localhost:5000/api/ulubione", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify({
            uzytkownik_id: sessionUser.id,
            recipe: recipe
          })
        });

        setIsFavorite(true);
      }

      setLoading(false);
      window.dispatchEvent(new Event("favoritesChanged"));
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  }

if (!recipe?.api_przepis_id || !sessionUser) return null;

return (
  <button
    type="button"
    className={isFavorite ? "favorite-btn active" : "favorite-btn"}
    onClick={handleToggle}
    disabled={loading}
    title={isFavorite ? "Usuń z ulubionych" : "Dodaj do ulubionych"}
  >
    {isFavorite ? "❤" : "♡"}
  </button>
);
}

export default FavoriteButton;