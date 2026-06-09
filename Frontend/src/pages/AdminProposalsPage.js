import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/AdminProposalsPage.css";
import {
  CATEGORY_OPTIONS,
  AREA_OPTIONS,
  translateCategory,
  translateArea
} from "../utils/translations";
import { translateIngredient } from "../utils/ingredientTranslations";
import { translateMeasurePhrase } from "../utils/measureTranslations";

function parseIngredientsText(skladnikiText) {
  if (!skladnikiText || !skladnikiText.trim()) {
    return [];
  }

  return skladnikiText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .map((line) => {
      let parts = line.split("|").map((item) => item.trim());

      return {
        nazwa: parts[0] || "",
        ilosc: parts[1] || "",
        jednostka: parts[2] || ""
      };
    });
}

function formatIngredientLine(item) {
  let translatedName = translateIngredient(item.nazwa);
  let amountParts = [item.ilosc, item.jednostka].filter(Boolean).join(" ").trim();
  let translatedAmount = amountParts
    ? translateMeasurePhrase(amountParts)
    : "Brak ilości";

  return `${translatedName} — ${translatedAmount}`;
}

function AdminProposalsPage() {
  let [sessionUser, setSessionUser] = useState(null);
  let [sessionLoading, setSessionLoading] = useState(true);

  let [proposals, setProposals] = useState([]);
  let [loading, setLoading] = useState(true);
  let [error, setError] = useState("");

  let [editingId, setEditingId] = useState(null);
  let [savingEdit, setSavingEdit] = useState(false);
  let [editForm, setEditForm] = useState({
    tytul: "",
    kategoria: "",
    obszar: "",
    skladniki: "",
    instrukcje: "",
    youtube: "",
    obrazek: ""
  });

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
    } catch (err) {
      console.log(err);
      setSessionUser(null);
      setSessionLoading(false);
    }
  }, []);

  let loadProposals = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response = await fetch("http://localhost:5000/api/admin/propozycje-przepisow", {
        credentials: "include"
      });
      let data = await response.json();

      if (!response.ok) {
        setError(data.error || "Nie udało się pobrać propozycji.");
        setLoading(false);
        return;
      }

      setProposals(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setError("Nie udało się połączyć z serwerem.");
      setLoading(false);
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
    if (sessionLoading) return;

    if (!sessionUser) {
      navigate("/logowanie");
      return;
    }

    if (sessionUser.rola !== "admin") {
      navigate("/");
      return;
    }

    loadProposals();
  }, [sessionLoading, sessionUser, navigate, loadProposals]);

  function startEditing(proposal) {
    setEditingId(proposal.id);
    setEditForm({
      tytul: proposal.tytul || "",
      kategoria: proposal.kategoria || "",
      obszar: proposal.obszar || "",
      skladniki: proposal.skladniki || "",
      instrukcje: proposal.instrukcje || "",
      youtube: proposal.youtube || "",
      obrazek: proposal.obrazek || ""
    });
  }

  function cancelEditing() {
    setEditingId(null);
    setEditForm({
      tytul: "",
      kategoria: "",
      obszar: "",
      skladniki: "",
      instrukcje: "",
      youtube: "",
      obrazek: ""
    });
  }

  function handleEditChange(field, value) {
    setEditForm((prev) => ({
      ...prev,
      [field]: value
    }));
  }

  async function handleSaveEdit(id) {
    try {
      setSavingEdit(true);

      let response = await fetch(
        "http://localhost:5000/api/admin/propozycje-przepisow/" + id,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          credentials: "include",
          body: JSON.stringify(editForm)
        }
      );

      let data = await response.json();

      if (!response.ok) {
        alert(data.error || "Nie udało się zapisać zmian.");
        setSavingEdit(false);
        return;
      }

      setProposals((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                ...editForm
              }
            : item
        )
      );

      setSavingEdit(false);
      cancelEditing();
    } catch (err) {
      console.log(err);
      alert("Nie udało się połączyć z serwerem.");
      setSavingEdit(false);
    }
  }

  async function handleAccept(id) {
    try {
      let response = await fetch(
        "http://localhost:5000/api/admin/propozycje-przepisow/" + id + "/zaakceptuj",
        {
          method: "POST",
          credentials: "include"
        }
      );

      let data = await response.json();

      if (!response.ok) {
        alert(data.error || "Nie udało się zaakceptować propozycji.");
        return;
      }

      loadProposals();
    } catch (err) {
      console.log(err);
      alert("Nie udało się połączyć z serwerem.");
    }
  }

  async function handleReject(id) {
    try {
      let response = await fetch(
        "http://localhost:5000/api/admin/propozycje-przepisow/" + id + "/odrzuc",
        {
          method: "POST",
          credentials: "include"
        }
      );

      let data = await response.json();

      if (!response.ok) {
        alert(data.error || "Nie udało się odrzucić propozycji.");
        return;
      }

      loadProposals();
    } catch (err) {
      console.log(err);
      alert("Nie udało się połączyć z serwerem.");
    }
  }

  function getStatusLabel(status) {
    if (status === "oczekujacy") return "Oczekujący";
    if (status === "zaakceptowany") return "Zaakceptowany";
    if (status === "odrzucony") return "Odrzucony";
    return status;
  }

  function getStatusClass(status) {
    if (status === "oczekujacy") return "proposal-status pending";
    if (status === "zaakceptowany") return "proposal-status accepted";
    if (status === "odrzucony") return "proposal-status rejected";
    return "proposal-status";
  }

  if (sessionLoading) {
    return (
      <div className="app">
        <Navbar />
        <main className="admin-proposals-page">
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
    return null;
  }

  return (
    <div className="app">
      <Navbar />

      <main className="admin-proposals-page">
        <section className="admin-proposals-hero">
          <div className="container">
            <h1>Panel administratora</h1>
            <p>Przeglądaj zgłoszone przepisy i decyduj, które trafią do serwisu.</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            {loading ? (
              <p>Ładowanie propozycji...</p>
            ) : error ? (
              <p className="admin-proposals-error">{error}</p>
            ) : proposals.length === 0 ? (
              <div className="admin-proposals-empty">
                <h3>Brak propozycji</h3>
                <p>Na razie nie ma żadnych zgłoszonych przepisów.</p>
              </div>
            ) : (
              <div className="admin-proposals-list">
                {proposals.map((proposal) => {
                  let isEditing = editingId === proposal.id;
                  let parsedIngredients = parseIngredientsText(proposal.skladniki);

                  return (
                    <div className="admin-proposal-card" key={proposal.id}>
                      <div className="admin-proposal-image-box">
                        <img
                          src={isEditing ? editForm.obrazek : proposal.obrazek}
                          alt={isEditing ? editForm.tytul : proposal.tytul}
                        />
                      </div>

                      <div className="admin-proposal-content">
                        <div className="admin-proposal-top">
                          <span className={getStatusClass(proposal.status)}>
                            {getStatusLabel(proposal.status)}
                          </span>
                        </div>

                        {isEditing ? (
                          <>
                            <div className="admin-proposal-section">
                              <h4>Tytuł</h4>
                              <input
                                className="admin-edit-input"
                                value={editForm.tytul}
                                onChange={(e) => handleEditChange("tytul", e.target.value)}
                              />
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Kategoria</h4>
                              <select
                                className="admin-edit-input"
                                value={editForm.kategoria}
                                onChange={(e) => handleEditChange("kategoria", e.target.value)}
                              >
                                <option value="">Wybierz kategorię</option>
                                {CATEGORY_OPTIONS.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Kraj</h4>
                              <select
                                className="admin-edit-input"
                                value={editForm.obszar}
                                onChange={(e) => handleEditChange("obszar", e.target.value)}
                              >
                                <option value="">Wybierz kraj / kuchnię</option>
                                {AREA_OPTIONS.map((item) => (
                                  <option key={item.value} value={item.value}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Składniki</h4>
                              <textarea
                                className="admin-edit-textarea"
                                rows="5"
                                value={editForm.skladniki}
                                onChange={(e) => handleEditChange("skladniki", e.target.value)}
                              />
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Instrukcje</h4>
                              <textarea
                                className="admin-edit-textarea"
                                rows="7"
                                value={editForm.instrukcje}
                                onChange={(e) => handleEditChange("instrukcje", e.target.value)}
                              />
                            </div>

                            <div className="admin-proposal-section">
                              <h4>YouTube</h4>
                              <input
                                className="admin-edit-input"
                                value={editForm.youtube}
                                onChange={(e) => handleEditChange("youtube", e.target.value)}
                              />
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Obrazek</h4>
                              <input
                                className="admin-edit-input"
                                value={editForm.obrazek}
                                onChange={(e) => handleEditChange("obrazek", e.target.value)}
                              />
                            </div>

                            <div className="admin-proposal-actions">
                              <button
                                type="button"
                                className="admin-save-btn"
                                onClick={() => handleSaveEdit(proposal.id)}
                                disabled={savingEdit}
                              >
                                {savingEdit ? "Zapisywanie..." : "Zapisz zmiany"}
                              </button>

                              <button
                                type="button"
                                className="admin-cancel-btn"
                                onClick={cancelEditing}
                              >
                                Anuluj
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <h2>{proposal.tytul}</h2>

                            <div className="admin-proposal-meta">
                              <span>
                                <strong>Kategoria:</strong>{" "}
                                {translateCategory(proposal.kategoria) || proposal.kategoria}
                              </span>
                              <span>
                                <strong>Kraj:</strong>{" "}
                                {translateArea(proposal.obszar) || "Brak"}
                              </span>
                              <span>
                                <strong>Autor:</strong> {proposal.nazwa_uzytkownika}
                              </span>
                              <span>
                                <strong>Email:</strong> {proposal.email}
                              </span>
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Składniki</h4>

                              {parsedIngredients.length > 0 ? (
                                <ul className="admin-ingredients-list">
                                  {parsedIngredients.map((ingredient, index) => (
                                    <li key={index}>
                                      {formatIngredientLine(ingredient)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p>{proposal.skladniki}</p>
                              )}
                            </div>

                            <div className="admin-proposal-section">
                              <h4>Instrukcje</h4>
                              <p>{proposal.instrukcje}</p>
                            </div>

                            {proposal.youtube && (
                              <div className="admin-proposal-section">
                                <h4>YouTube</h4>
                                <a
                                  href={proposal.youtube}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="admin-proposal-link"
                                >
                                  Otwórz film
                                </a>
                              </div>
                            )}

                            <div className="admin-proposal-actions">
                              <button
                                type="button"
                                className="admin-edit-btn"
                                onClick={() => startEditing(proposal)}
                              >
                                Edytuj
                              </button>

                              <button
                                type="button"
                                className="admin-accept-btn"
                                onClick={() => handleAccept(proposal.id)}
                              >
                                Zaakceptuj
                              </button>

                              <button
                                type="button"
                                className="admin-reject-btn"
                                onClick={() => handleReject(proposal.id)}
                              >
                                Odrzuć
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default AdminProposalsPage;