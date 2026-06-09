import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/LoginPage.css";

function ResetPasswordPage() {
  let [email, setEmail] = useState("");
  let [code, setCode] = useState("");
  let [newPassword, setNewPassword] = useState("");
  let [repeatPassword, setRepeatPassword] = useState("");
  let [step, setStep] = useState(1);
  let [message, setMessage] = useState("");
  let [error, setError] = useState("");
  let [loading, setLoading] = useState(false);

  let navigate = useNavigate();

  async function handleSendCode(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/haslo/przypomnij", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email
        })
      });

      let data = await response.json();

      setLoading(false);

      if (!response.ok) {
        setError(data.error || "Nie udało się wysłać kodu.");
        return;
      }

      setMessage(data.message || "Kod został wysłany na email.");
      setStep(2);
    } catch (error) {
      setLoading(false);
      setError("Nie udało się połączyć z serwerem.");
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (newPassword !== repeatPassword) {
      setError("Hasła nie są takie same.");
      return;
    }

    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/haslo/reset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email: email,
          kod: code,
          nowe_haslo: newPassword
        })
      });

      let data = await response.json();

      setLoading(false);

      if (!response.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setError(data.errors.join(" "));
        } else {
          setError(data.error || "Nie udało się zmienić hasła.");
        }

        return;
      }

      setMessage(data.message || "Hasło zostało zmienione.");
      setTimeout(() => {
        navigate("/logowanie");
      }, 1500);
    } catch (error) {
      setLoading(false);
      setError("Nie udało się połączyć z serwerem.");
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
                <h1>Resetowanie hasła</h1>
                <p>
                  Podaj adres e-mail, a wyślemy Ci kod do ustawienia nowego hasła.
                </p>

                <div className="login-features">
                  <div className="login-feature-item">
                    <span className="login-feature-icon">✉</span>
                    <span>Kod otrzymasz na email</span>
                  </div>

                  <div className="login-feature-item">
                    <span className="login-feature-icon">⏱</span>
                    <span>Kod jest ważny 15 minut</span>
                  </div>

                  <div className="login-feature-item">
                    <span className="login-feature-icon">🔒</span>
                    <span>Po kodzie ustawisz nowe hasło</span>
                  </div>
                </div>
              </div>

              <div className="login-card">
                <h2>{step === 1 ? "Przypomnij hasło" : "Ustaw nowe hasło"}</h2>

                {step === 1 && (
                  <form onSubmit={handleSendCode} className="login-form">
                    <div className="login-form-group">
                      <label>Adres e-mail</label>
                      <input
                        type="email"
                        placeholder="Wpisz swój e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    {error && <p className="login-error-message">{error}</p>}
                    {message && <p className="login-success-message">{message}</p>}

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                      {loading ? "Wysyłanie..." : "Wyślij kod"}
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <form onSubmit={handleResetPassword} className="login-form">
                    <div className="login-form-group">
                      <label>Kod z emaila</label>
                      <input
                        type="text"
                        placeholder="Wpisz 6-cyfrowy kod"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                      />
                    </div>

                    <div className="login-form-group">
                      <label>Nowe hasło</label>
                      <input
                        type="password"
                        placeholder="Wpisz nowe hasło"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="login-form-group">
                      <label>Powtórz nowe hasło</label>
                      <input
                        type="password"
                        placeholder="Powtórz nowe hasło"
                        value={repeatPassword}
                        onChange={(e) => setRepeatPassword(e.target.value)}
                        required
                      />
                    </div>

                    {error && <p className="login-error-message">{error}</p>}
                    {message && <p className="login-success-message">{message}</p>}

                    <button type="submit" className="login-submit-btn" disabled={loading}>
                      {loading ? "Zmienianie hasła..." : "Zmień hasło"}
                    </button>
                  </form>
                )}

                <p className="login-register-text">
                  Pamiętasz hasło?{" "}
                  <span onClick={() => navigate("/logowanie")}>Wróć do logowania</span>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default ResetPasswordPage;