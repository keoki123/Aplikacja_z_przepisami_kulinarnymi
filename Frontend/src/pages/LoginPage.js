import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/LoginPage.css";

function LoginPage() {
  let [email, setEmail] = useState("");
  let [password, setPassword] = useState("");
  let [rememberMe, setRememberMe] = useState(false);
  let [error, setError] = useState("");
  let [loading, setLoading] = useState(false);

  let navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/logowanie", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          email: email,
          haslo: password,
          rememberMe: rememberMe
        })
      });

      let data = await response.json();

      if (!response.ok) {
        setError(data.error || "Niepoprawne hasło lub email.");
        setLoading(false);
        return;
      }

      window.dispatchEvent(new Event("authChanged"));

      setLoading(false);
      navigate("/");
    } catch (error) {
      setError("Nie udało się połączyć z serwerem.");
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <Navbar />

      <main className="login-page">
        <section className="login-hero">
          <div className="container">
            <div className="login-wrapper">
              <div className="login-left">
                <h1>Zaloguj się do swojego konta</h1>
                <p>
                  Zapisuj ulubione przepisy, dodawaj opinie, oceniaj dania
                  i korzystaj z własnej kulinarnej przestrzeni.
                </p>

                <div className="login-features">
                  <div className="login-feature-item">
                    <span className="login-feature-icon">★</span>
                    <span>Oceniaj i opiniuj przepisy</span>
                  </div>

                  <div className="login-feature-item">
                    <span className="login-feature-icon">❤</span>
                    <span>Twórz listę ulubionych</span>
                  </div>

                  <div className="login-feature-item">
                    <span className="login-feature-icon">🍽</span>
                    <span>Wracaj do zapisanych inspiracji</span>
                  </div>
                </div>
              </div>

              <div className="login-card">
                <h2>Logowanie</h2>
                <p className="login-card-subtitle">
                  Wpisz swoje dane, aby przejść dalej.
                </p>

                <form onSubmit={handleSubmit} className="login-form">
                  <div className="login-form-group">
                    <label>Adres e-mail</label>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      placeholder="Wpisz swój e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="login-form-group">
                    <label>Hasło</label>
                    <input
                      type="password"
                      name="password"
                      autoComplete="current-password"
                      placeholder="Wpisz hasło"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="login-form-options">
                    <label className="remember-me">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <span>Zapamiętaj mnie</span>
                    </label>
                  </div>

                  {error && <p className="login-error-message">{error}</p>}

                  <button type="submit" className="login-submit-btn" disabled={loading}>
                    {loading ? "Logowanie..." : "Zaloguj się"}
                  </button>
                </form>

                <div className="login-extra-actions">
                <button
                  type="button"
                  className="forgot-password-button"
                  onClick={() => navigate("/reset-hasla")}
                >
                  Nie pamiętasz hasła?
                </button>

                <div className="login-divider">
                  <span>lub</span>
                </div>

                <p className="login-register-text">
                  Nie masz jeszcze konta?{" "}
                  <span onClick={() => navigate("/rejestracja")}>Zarejestruj się</span>
                </p>
              </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default LoginPage;