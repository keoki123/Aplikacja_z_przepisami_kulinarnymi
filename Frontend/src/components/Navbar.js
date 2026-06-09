import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Navbar() {
  let [loggedUser, setLoggedUser] = useState(null);
  let [isMenuOpen, setIsMenuOpen] = useState(false);
  let navigate = useNavigate();
  let menuRef = useRef(null);

  useEffect(() => {
    async function loadSessionUser() {
      try {
        let response = await fetch("http://localhost:5000/api/auth/me", {
          credentials: "include"
        });

        if (!response.ok) {
          setLoggedUser(null);
          return;
        }

        let data = await response.json();
        setLoggedUser(data.user || null);
      } catch (error) {
        console.log(error);
        setLoggedUser(null);
      }
    }

    loadSessionUser();
    window.addEventListener("authChanged", loadSessionUser);

    return () => {
      window.removeEventListener("authChanged", loadSessionUser);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function handleLogout() {
    try {
      await fetch("http://localhost:5000/api/wylogowanie", {
        method: "POST",
        credentials: "include"
      });
    } catch (error) {
      console.log(error);
    }

    setLoggedUser(null);
    setIsMenuOpen(false);
    window.dispatchEvent(new Event("authChanged"));
    navigate("/");
  }

  return (
    <header className="navbar">
      <div className="container navbar-content">
        <Link to="/" className="brand-logo">
          <div className="brand-icon">
            <span className="brand-icon-letter">C</span>
          </div>

          <div className="brand-text">
            <span className="brand-name">Culinary Book</span>
            <span className="brand-subtitle">Smak, inspiracja, przepisy</span>
          </div>
        </Link>

        <nav className="nav-links">
          <Link to="/">Strona główna</Link>
          <Link to="/przepisy">Przepisy</Link>

          {!loggedUser ? (
            <>
              <Link to="/logowanie">Logowanie</Link>
              <Link to="/rejestracja" className="register-button">
                Zarejestruj się
              </Link>
            </>
          ) : (
            <div className="user-menu-wrapper" ref={menuRef}>
              <button
                type="button"
                className="user-menu-trigger"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                <div className="user-avatar">
                  {loggedUser.nazwa_uzytkownika?.charAt(0)?.toUpperCase() || "U"}
                </div>
              </button>

              {isMenuOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <div className="user-avatar large">
                      {loggedUser.nazwa_uzytkownika?.charAt(0)?.toUpperCase() || "U"}
                    </div>

                    <div className="user-dropdown-info">
                      <strong>{loggedUser.nazwa_uzytkownika}</strong>
                      <span>{loggedUser.email}</span>
                    </div>
                  </div>

                  <div className="user-dropdown-links">
                    <Link
                      to="/profil"
                      className="user-dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profil
                    </Link>

                    <Link
                      to="/ulubione"
                      className="user-dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Ulubione
                    </Link>

                    <Link
                      to="/dodaj-przepis"
                      className="user-dropdown-item"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Dodaj przepis
                    </Link>

                    {loggedUser.rola === "admin" && (
                      <Link
                        to="/admin/propozycje-przepisow"
                        className="user-dropdown-item"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Panel admina
                      </Link>
                    )}

                    <button
                      type="button"
                      className="user-dropdown-item logout"
                      onClick={handleLogout}
                    >
                      Wyloguj się
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;