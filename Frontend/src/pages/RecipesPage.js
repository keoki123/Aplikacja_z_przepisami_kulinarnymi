import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import FavoriteButton from "../components/FavoriteButton";
import RecipeRatingInput from "../components/RecipeRatingInput";
import "../styles/RecipesPage.css";
import {
  CATEGORY_OPTIONS,
  AREA_OPTIONS,
  translateCategory,
  translateArea
} from "../utils/translations";

function RecipesPage() {
  let [searchParams] = useSearchParams();
  let navigate = useNavigate();

  let startSearch = searchParams.get("search") || "";
  let startCategory = searchParams.get("category") || "";

  let [recipes, setRecipes] = useState([]);
  let [search, setSearch] = useState(startSearch);
  let [loading, setLoading] = useState(true);

  let [selectedCategory, setSelectedCategory] = useState("");
  let [selectedArea, setSelectedArea] = useState("");
  let [selectedYoutube, setSelectedYoutube] = useState(false);
  let [sortOrder, setSortOrder] = useState("");
  let [viewMode, setViewMode] = useState("list");

  let [currentPage, setCurrentPage] = useState(1);
  let itemsPerPage = 10;
  let maxVisiblePages = 7;

  useEffect(() => {
    setSearch(startSearch);
    setSelectedCategory(startCategory ? translateCategory(startCategory) : "");
    setSelectedArea("");
    setSelectedYoutube(false);
    setSortOrder("");
    setCurrentPage(1);

    if (startSearch.trim()) {
      fetchRecipes(startSearch);
    } else {
      fetchAllRecipes();
    }
  }, [startSearch, startCategory]);

  function fetchRecipes(name) {
    setLoading(true);

    fetch("http://localhost:5000/api/przepisy/szukaj/" + encodeURIComponent(name), {
      credentials: "include"
    })
      .then((response) => response.json())
      .then((data) => {
        setRecipes(Array.isArray(data) ? data : []);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setRecipes([]);
        setCurrentPage(1);
        setLoading(false);
      });
  }

  function fetchAllRecipes() {
    setLoading(true);

    fetch("http://localhost:5000/api/przepisy/wszystkie", {
      credentials: "include"
    })
      .then((response) => response.json())
      .then((data) => {
        setRecipes(Array.isArray(data) ? data : []);
        setCurrentPage(1);
        setLoading(false);
      })
      .catch((error) => {
        console.log(error);
        setRecipes([]);
        setCurrentPage(1);
        setLoading(false);
      });
  }

  function handleSearch() {
    if (!search.trim()) {
      fetchAllRecipes();
      return;
    }

    fetchRecipes(search);
  }

  function handleClearFilters() {
    setSearch("");
    setSelectedCategory("");
    setSelectedArea("");
    setSelectedYoutube(false);
    setSortOrder("");
    setCurrentPage(1);
    fetchAllRecipes();
  }

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

  let categories = CATEGORY_OPTIONS.map((item) => item.label);
  let areas = AREA_OPTIONS.map((item) => item.label);

  let filteredRecipes = recipes.filter((recipe) => {
    let translatedCategory = translateCategory(recipe.kategoria);
    let translatedArea = translateArea(recipe.obszar);

    let matchCategory = !selectedCategory || translatedCategory === selectedCategory;
    let matchArea = !selectedArea || translatedArea === selectedArea;
    let matchYoutube = !selectedYoutube || !!recipe.youtube;

    return matchCategory && matchArea && matchYoutube;
  });

  let sortedRecipes = [...filteredRecipes];

  if (sortOrder === "az") {
    sortedRecipes.sort((a, b) => a.tytul.localeCompare(b.tytul, "pl"));
  }

  if (sortOrder === "za") {
    sortedRecipes.sort((a, b) => b.tytul.localeCompare(a.tytul, "pl"));
  }

  if (sortOrder === "ratingDesc") {
    sortedRecipes.sort((a, b) => {
      let ratingDiff = (b.srednia_ocen || 0) - (a.srednia_ocen || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (b.liczba_opinii || 0) - (a.liczba_opinii || 0);
    });
  }

  if (sortOrder === "ratingAsc") {
    sortedRecipes.sort((a, b) => {
      let ratingDiff = (a.srednia_ocen || 0) - (b.srednia_ocen || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (a.liczba_opinii || 0) - (b.liczba_opinii || 0);
    });
  }

  if (sortOrder === "reviewsDesc") {
    sortedRecipes.sort((a, b) => (b.liczba_opinii || 0) - (a.liczba_opinii || 0));
  }

  let totalPages = Math.ceil(sortedRecipes.length / itemsPerPage);
  let startIndex = (currentPage - 1) * itemsPerPage;
  let endIndex = startIndex + itemsPerPage;
  let paginatedRecipes = sortedRecipes.slice(startIndex, endIndex);

  let currentBlock = Math.floor((currentPage - 1) / maxVisiblePages);
  let blockStart = currentBlock * maxVisiblePages + 1;
  let blockEnd = Math.min(blockStart + maxVisiblePages - 1, totalPages);

  let visiblePages = [];
  for (let i = blockStart; i <= blockEnd; i++) {
    visiblePages.push(i);
  }

  let activeFilters = [];
  if (search.trim()) activeFilters.push(search);
  if (selectedCategory) activeFilters.push(selectedCategory);
  if (selectedArea) activeFilters.push(selectedArea);
  if (selectedYoutube) activeFilters.push("Ma YouTube");
  if (sortOrder === "az") activeFilters.push("A–Z");
  if (sortOrder === "za") activeFilters.push("Z–A");
  if (sortOrder === "ratingDesc") activeFilters.push("Ocena malejąco");
  if (sortOrder === "ratingAsc") activeFilters.push("Ocena rosnąco");
  if (sortOrder === "reviewsDesc") activeFilters.push("Najwięcej opinii");

  return (
    <div className="app">
      <Navbar />

      <main>
        <section className="recipes-page-hero">
          <div className="container">
            <h2>Znajdź idealny przepis</h2>
            <p>
              Wyszukuj przepisy według nazwy i filtruj wyniki według kategorii,
              kraju pochodzenia oraz dostępności filmu.
            </p>
          </div>
        </section>

        <section className="recipes-page section">
          <div className="container recipes-layout">
            <aside className="filters-box">
              <div className="filters-header">
                <h3>Filtry wyszukiwania</h3>
                <button
                  type="button"
                  className="clear-filters-btn"
                  onClick={handleClearFilters}
                >
                  Wyczyść
                </button>
              </div>

              <div className="filter-card">
                <h4>Wyszukaj przepis</h4>
                <input
                  type="text"
                  placeholder="Np. chicken, pasta, beef"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="filter-card">
                <h4>Kategoria</h4>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Wszystkie</option>
                  {categories.map((category, index) => (
                    <option key={index} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-card">
                <h4>Kraj</h4>
                <select
                  value={selectedArea}
                  onChange={(e) => {
                    setSelectedArea(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Wszystkie</option>
                  {areas.map((area, index) => (
                    <option key={index} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-card">
                <h4>Dodatkowo</h4>
                <div className="checkbox-list">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedYoutube}
                      onChange={(e) => {
                        setSelectedYoutube(e.target.checked);
                        setCurrentPage(1);
                      }}
                    />
                    Tylko z YouTube
                  </label>
                </div>
              </div>

              <div className="filter-card">
                <h4>Sortowanie</h4>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Domyślne</option>
                  <option value="az">A–Z</option>
                  <option value="za">Z–A</option>
                  <option value="ratingDesc">Ocena malejąco</option>
                  <option value="ratingAsc">Ocena rosnąco</option>
                  <option value="reviewsDesc">Najwięcej opinii</option>
                </select>
              </div>

              <button className="filter-btn" onClick={handleSearch}>
                Szukaj przepisów
              </button>
            </aside>

            <div className="recipes-results-wrapper">
              <div className="results-topbar">
                <div>
                  <h3>Znalezione przepisy</h3>
                  <p className="results-count">
                    {loading
                      ? "Ładowanie..."
                      : `${sortedRecipes.length} wyników, strona ${
                          totalPages === 0 ? 1 : currentPage
                        } z ${totalPages || 1}`}
                  </p>
                </div>

                <div className="results-actions">
                  <button
                    type="button"
                    className={viewMode === "list" ? "view-btn active" : "view-btn"}
                    onClick={() => setViewMode("list")}
                  >
                    Lista
                  </button>
                  <button
                    type="button"
                    className={viewMode === "grid" ? "view-btn active" : "view-btn"}
                    onClick={() => setViewMode("grid")}
                  >
                    Siatka
                  </button>
                </div>
              </div>

              <div className="active-filters">
                {activeFilters.length === 0 ? (
                  <span className="active-filter-tag">Brak aktywnych filtrów</span>
                ) : (
                  activeFilters.map((filter, index) => (
                    <span className="active-filter-tag" key={index}>
                      {filter}
                    </span>
                  ))
                )}
              </div>

              <div className={viewMode === "list" ? "recipes-results" : "recipes-grid"}>
                {loading ? (
                  <p>Ładowanie przepisów...</p>
                ) : paginatedRecipes.length === 0 ? (
                  <p>Brak przepisów pasujących do filtrów.</p>
                ) : (
                  paginatedRecipes.map((recipe) =>
                    viewMode === "list" ? (
                      <div className="recipe-result-card" key={recipe.api_przepis_id}>
                        <div className="recipe-result-image">
                          <FavoriteButton recipe={recipe} />
                          <img src={recipe.obrazek} alt={recipe.tytul} />
                        </div>

                        <div className="recipe-result-content-simple">
                          <h3>{recipe.tytul}</h3>

                          <p className="recipe-result-location">
                            🌍 {translateArea(recipe.obszar) || "Brak informacji o kraju"}
                          </p>

                          <div className="recipe-stars-row">
                            <div className="recipe-stars">
                              {renderStars(recipe.srednia_ocen)}
                            </div>
                            <span className="recipe-stars-text">
                              {recipe.srednia_ocen}/5 ({recipe.liczba_opinii} opinii)
                            </span>
                          </div>

                          <RecipeRatingInput
                            recipe={recipe}
                            onRatingSaved={(newStats) =>
                              updateRecipeRating(recipe.api_przepis_id, newStats)
                            }
                          />

                          <p className="recipe-result-description">
                            {recipe.instrukcje
                              ? recipe.instrukcje.substring(0, 220) + "..."
                              : "Brak opisu przepisu."}
                          </p>

                          <div className="recipe-buttons-row">
                            {recipe.youtube ? (
                              <a
                                href={recipe.youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="recipe-btn"
                              >
                                Obejrzyj przepis
                              </a>
                            ) : (
                              <button className="recipe-btn recipe-btn-disabled" disabled>
                                Brak filmu
                              </button>
                            )}

                            <button
                              className="recipe-btn secondary-recipe-btn"
                              onClick={() => navigate("/przepisy/" + recipe.api_przepis_id)}
                            >
                              Szczegóły przepisu
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="recipe-grid-card" key={recipe.api_przepis_id}>
                        <div className="recipe-grid-image recipe-grid-image-box">
                          <FavoriteButton recipe={recipe} />
                          <img src={recipe.obrazek} alt={recipe.tytul} />
                        </div>

                        <div className="recipe-grid-body">
                          <h3>{recipe.tytul}</h3>

                          <p className="recipe-result-location">
                            🌍 {translateArea(recipe.obszar) || "Brak informacji o kraju"}
                          </p>

                          <div className="recipe-stars-row">
                            <div className="recipe-stars">
                              {renderStars(recipe.srednia_ocen)}
                            </div>
                            <span className="recipe-stars-text">
                              {recipe.srednia_ocen}/5 ({recipe.liczba_opinii} opinii)
                            </span>
                          </div>

                          <RecipeRatingInput
                            recipe={recipe}
                            onRatingSaved={(newStats) =>
                              updateRecipeRating(recipe.api_przepis_id, newStats)
                            }
                          />

                          <p className="recipe-grid-description">
                            {recipe.instrukcje
                              ? recipe.instrukcje.substring(0, 120) + "..."
                              : "Brak opisu przepisu."}
                          </p>

                          <div className="recipe-buttons-column">
                            {recipe.youtube ? (
                              <a
                                href={recipe.youtube}
                                target="_blank"
                                rel="noreferrer"
                                className="recipe-btn"
                              >
                                Obejrzyj przepis
                              </a>
                            ) : (
                              <button className="recipe-btn recipe-btn-disabled" disabled>
                                Brak filmu
                              </button>
                            )}

                            <button
                              className="recipe-btn secondary-recipe-btn"
                              onClick={() => navigate("/przepisy/" + recipe.api_przepis_id)}
                            >
                              Szczegóły przepisu
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>

              {!loading && totalPages > 1 && (
                <div className="pagination-box">
                  <button
                    className="pagination-arrow"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                    title="Początek"
                  >
                    «
                  </button>

                  <button
                    className="pagination-arrow"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    title="Poprzednia"
                  >
                    ‹
                  </button>

                  {visiblePages.map((page) => (
                    <button
                      key={page}
                      className={
                        page === currentPage
                          ? "pagination-number active"
                          : "pagination-number"
                      }
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    className="pagination-arrow"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    title="Następna"
                  >
                    ›
                  </button>

                  <button
                    className="pagination-arrow"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    title="Koniec"
                  >
                    »
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default RecipesPage;