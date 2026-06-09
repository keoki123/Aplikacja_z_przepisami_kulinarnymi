import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Hero() {
  let [search, setSearch] = useState("");
  let navigate = useNavigate();

  function handleSearch() {
    if (!search.trim()) {
      navigate("/przepisy");
      return;
    }

    navigate("/przepisy?search=" + encodeURIComponent(search));
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      handleSearch();
    }
  }

  return (
    <section className="hero">
      <div className="container hero-content">
        <div className="hero-text">
          <p className="hero-subtitle">Odkrywaj, gotuj i zapisuj swoje ulubione przepisy</p>
          <h1>Znajdź przepisy, które naprawdę chcesz przygotować</h1>
          <p className="hero-description">
            Przeglądaj inspirujące przepisy, odkrywaj kategorie, sprawdzaj popularne
            dania i zapisuj swoje ulubione potrawy w jednym miejscu.
          </p>

          <div className="hero-search">
            <input
              type="text"
              placeholder="Wyszukaj przepis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={handleSearch}>Szukaj</button>
          </div>
        </div>

        <div className="hero-image-box">
          <img
            src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=80"
            alt="Pyszne jedzenie"
            className="hero-image"
          />
        </div>
      </div>
    </section>
  );
}

export default Hero;