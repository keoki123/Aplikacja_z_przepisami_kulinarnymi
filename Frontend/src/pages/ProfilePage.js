import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/ProfilePage.css";

function ProfilePage() {
  let [sessionUser, setSessionUser] = useState(null);
  let [sessionLoading, setSessionLoading] = useState(true);

  let [username, setUsername] = useState("");
  let [email, setEmail] = useState("");
  let [newPassword, setNewPassword] = useState("");
  let [confirmPassword, setConfirmPassword] = useState("");
  let [loading, setLoading] = useState(true);
  let [saving, setSaving] = useState(false);
  let [errors, setErrors] = useState([]);
  let [message, setMessage] = useState("");

  let [reviews, setReviews] = useState([]);
  let [reviewsLoading, setReviewsLoading] = useState(true);
  let [currentReviewIndex, setCurrentReviewIndex] = useState(0);

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

  let loadProfileData = useCallback(async (userId) => {
    try {
      setLoading(true);
      setReviewsLoading(true);

      let [profileResponse, reviewsResponse] = await Promise.all([
        fetch("http://localhost:5000/api/profil/" + userId, {
          credentials: "include"
        }),
        fetch("http://localhost:5000/api/profil/" + userId + "/opinie", {
          credentials: "include"
        })
      ]);

      let profileData = await profileResponse.json();
      let reviewsData = await reviewsResponse.json();

      if (!profileResponse.ok || profileData.error) {
        setErrors([profileData.error || "Nie udało się pobrać profilu."]);
        setLoading(false);
        setReviewsLoading(false);
        return;
      }

      setUsername(profileData.nazwa_uzytkownika || "");
      setEmail(profileData.email || "");
      setLoading(false);

      if (Array.isArray(reviewsData)) {
        setReviews(reviewsData);
      } else {
        setReviews([]);
      }

      setCurrentReviewIndex(0);
      setReviewsLoading(false);
    } catch (error) {
      console.log(error);
      setErrors(["Nie udało się pobrać danych profilu."]);
      setLoading(false);
      setReviewsLoading(false);
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

    loadProfileData(sessionUser.id);
  }, [sessionLoading, sessionUser, navigate, loadProfileData]);

  async function handleSubmit(e) {
    e.preventDefault();

    setErrors([]);
    setMessage("");

    let localErrors = [];

    if (!username.trim()) {
      localErrors.push("Nazwa użytkownika jest wymagana.");
    }

    if (newPassword && newPassword !== confirmPassword) {
      localErrors.push("Nowe hasła nie są takie same.");
    }

    if (localErrors.length > 0) {
      setErrors(localErrors);
      return;
    }

    if (!sessionUser) {
      navigate("/logowanie");
      return;
    }

    try {
      setSaving(true);

      let response = await fetch("http://localhost:5000/api/profil/" + sessionUser.id, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          nazwa_uzytkownika: username,
          nowe_haslo: newPassword
        })
      });

      let data = await response.json();

      if (!response.ok) {
        setErrors(data.errors || ["Nie udało się zapisać zmian."]);
        setSaving(false);
        return;
      }

      setSessionUser(data.user);
      window.dispatchEvent(new Event("authChanged"));

      setMessage("Profil został zapisany.");
      setUsername(data.user?.nazwa_uzytkownika || username);
      setEmail(data.user?.email || email);
      setNewPassword("");
      setConfirmPassword("");
      setSaving(false);
    } catch (error) {
      console.log(error);
      setErrors(["Nie udało się połączyć z serwerem."]);
      setSaving(false);
    }
  }

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

  function goPrevReview() {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex((prev) => prev - 1);
    }
  }

  function goNextReview() {
    if (currentReviewIndex < reviews.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1);
    }
  }

  let currentReview = reviews[currentReviewIndex];

  if (sessionLoading) {
    return (
      <div className="app">
        <Navbar />
        <main className="profile-page">
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

      <main className="profile-page">
        <section className="profile-hero">
          <div className="container">
            <h1>Twój profil</h1>
            <p>Zarządzaj nazwą użytkownika, hasłem i swoimi opiniami.</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            {loading ? (
              <p>Ładowanie profilu...</p>
            ) : (
              <div className="profile-layout">
                <div className="profile-card">
                  <div className="profile-card-header">
                    <div className="profile-avatar">
                      {username?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div>
                      <h2>Ustawienia konta</h2>
                      <p>Edytuj swoje dane logowania.</p>
                    </div>
                  </div>

                  <form className="profile-form" onSubmit={handleSubmit}>
                    <div className="profile-form-group">
                      <label>Nazwa użytkownika</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Wpisz nazwę użytkownika"
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Adres e-mail</label>
                      <input type="email" value={email} disabled />
                    </div>

                    <div className="profile-form-group">
                      <label>Nowe hasło</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Wpisz nowe hasło"
                      />
                    </div>

                    <div className="profile-form-group">
                      <label>Powtórz nowe hasło</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Powtórz nowe hasło"
                      />
                    </div>

                    {errors.length > 0 && (
                      <div className="profile-error-box">
                        {errors.map((error, index) => (
                          <p key={index} className="profile-error-message">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}

                    {message && <p className="profile-success-message">{message}</p>}

                    <div className="profile-actions">
                      <button type="submit" className="profile-save-btn" disabled={saving}>
                        {saving ? "Zapisywanie..." : "Zapisz zmiany"}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="profile-reviews-card">
                  <div className="profile-reviews-header">
                    <div>
                      <h2>Twoje wystawione opinie</h2>
                      <p>Przeglądaj komentarze dodane do przepisów.</p>
                    </div>

                    {reviews.length > 0 && (
                      <div className="profile-reviews-nav">
                        <button
                          className="profile-review-arrow"
                          onClick={goPrevReview}
                          disabled={currentReviewIndex === 0}
                          type="button"
                        >
                          ←
                        </button>

                        <button
                          className="profile-review-arrow"
                          onClick={goNextReview}
                          disabled={currentReviewIndex === reviews.length - 1}
                          type="button"
                        >
                          →
                        </button>
                      </div>
                    )}
                  </div>

                  {reviewsLoading ? (
                    <p>Ładowanie opinii...</p>
                  ) : reviews.length === 0 ? (
                    <div className="profile-reviews-empty">
                      <p>Nie masz jeszcze żadnych wystawionych opinii.</p>
                    </div>
                  ) : (
                    <div className="profile-review-box">
                      <div className="profile-review-image-box">
                        <img
                          src={currentReview.obrazek}
                          alt={currentReview.tytul}
                          className="profile-review-image"
                        />
                      </div>

                      <div className="profile-review-content">
                        <span className="profile-review-counter">
                          Opinia {currentReviewIndex + 1} z {reviews.length}
                        </span>

                        <h3>{currentReview.tytul}</h3>

                        <div className="profile-review-rating">
                          <div className="recipe-stars">
                            {renderStars(currentReview.ocena)}
                          </div>
                          <span>{currentReview.ocena || 0}/5</span>
                        </div>

                        <p className="profile-review-text">
                          {currentReview.komentarz}
                        </p>

                        <button
                          className="profile-review-btn"
                          type="button"
                          onClick={() =>
                            navigate("/przepisy/" + currentReview.api_przepis_id)
                          }
                        >
                          Przejdź do przepisu
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default ProfilePage;