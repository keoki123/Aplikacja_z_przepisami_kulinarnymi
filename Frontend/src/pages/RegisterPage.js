import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/RegisterPage.css";

function RegisterPage() {
  let navigate = useNavigate();

  let [username, setUsername] = useState("");
  let [email, setEmail] = useState("");
  let [password, setPassword] = useState("");
  let [confirmPassword, setConfirmPassword] = useState("");
  let [message, setMessage] = useState("");
  let [errors, setErrors] = useState([]);
  let [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage("");
    setErrors([]);

    let localErrors = [];

    if (password !== confirmPassword) {
      localErrors.push("Hasła nie są takie same.");
    }

    if (password.length < 8) {
      localErrors.push("Hasło musi mieć minimum 8 znaków.");
    }

    if (!/[A-Z]/.test(password)) {
      localErrors.push("Hasło musi zawierać minimum 1 dużą literę.");
    }

    if (!/[0-9]/.test(password)) {
      localErrors.push("Hasło musi zawierać minimum 1 cyfrę.");
    }

    if (!/[!@#$%^&*()_\-+=[\]{};':"\\|,.<>/?]/.test(password)) {
      localErrors.push("Hasło musi zawierać minimum 1 znak specjalny.");
    }

    if (localErrors.length > 0) {
      setErrors(localErrors);
      return;
    }

    try {
      setLoading(true);

      let response = await fetch("http://localhost:5000/api/rejestracja", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nazwa_uzytkownika: username,
          email: email,
          haslo: password
        })
      });

      let data = await response.json();

      if (!response.ok) {
        setErrors(data.errors || ["Wystąpił błąd podczas rejestracji."]);
        setLoading(false);
        return;
      }

      setMessage("Konto zostało utworzone poprawnie. Za chwilę przejdziesz do logowania.");
      setUsername("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setLoading(false);

      setTimeout(() => {
        navigate("/logowanie");
      }, 1200);
    } catch (err) {
      setErrors(["Nie udało się połączyć z serwerem."]);
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <Navbar />

      <main className="register-page">
        <section className="register-hero">
          <div className="container">
            <div className="register-wrapper">
              <div className="register-left">
                <h1>Załóż konto i twórz własną kulinarną przestrzeń</h1>
                <p>
                  Rejestracja pozwoli Ci dodawać opinie, oceniać przepisy,
                  zapisywać ulubione dania i wracać do najlepszych inspiracji.
                </p>

                <div className="register-features">
                  <div className="register-feature-item">
                    <span className="register-feature-icon">❤</span>
                    <span>Zapisuj ulubione przepisy</span>
                  </div>

                  <div className="register-feature-item">
                    <span className="register-feature-icon">★</span>
                    <span>Wystawiaj oceny i dodawaj opinie</span>
                  </div>

                  <div className="register-feature-item">
                    <span className="register-feature-icon">🍴</span>
                    <span>Buduj swoją własną bazę inspiracji</span>
                  </div>
                </div>
              </div>

              <div className="register-card">
                <h2>Rejestracja</h2>
                <p className="register-card-subtitle">
                  Uzupełnij dane, aby utworzyć konto.
                </p>

                <form onSubmit={handleSubmit} className="register-form">
                  <div className="register-form-group">
                    <label>Nazwa użytkownika</label>
                    <input
                      type="text"
                      placeholder="Wpisz nazwę użytkownika"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="register-form-group">
                    <label>Adres e-mail</label>
                    <input
                      type="email"
                      placeholder="Wpisz swój e-mail"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="register-form-group">
                    <label>Hasło</label>
                    <input
                      type="password"
                      placeholder="Wpisz hasło"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="register-form-group">
                    <label>Powtórz hasło</label>
                    <input
                      type="password"
                      placeholder="Powtórz hasło"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <label className="register-terms">
                    <input type="checkbox" required />
                    <span>Akceptuję regulamin i politykę prywatności</span>
                  </label>

                  {errors.length > 0 && (
                    <div className="form-error-box">
                      {errors.map((error, index) => (
                        <p key={index} className="form-error-message">
                          {error}
                        </p>
                      ))}
                    </div>
                  )}

                  {message && <p className="form-success-message">{message}</p>}

                  <button type="submit" className="register-submit-btn" disabled={loading}>
                    {loading ? "Tworzenie konta..." : "Utwórz konto"}
                  </button>
                </form>

                <p className="register-login-text">
                  Masz już konto?{" "}
                  <span onClick={() => navigate("/logowanie")}>Zaloguj się</span>
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

export default RegisterPage;