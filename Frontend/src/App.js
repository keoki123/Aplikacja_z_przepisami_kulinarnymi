import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles/App.css";
import Home from "./pages/Home";
import RecipesPage from "./pages/RecipesPage";
import RecipeDetailsPage from "./pages/RecipeDetailsPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FavoritesPage from "./pages/FavoritesPage";
import ProfilePage from "./pages/ProfilePage";
import AddRecipePage from "./pages/AddRecipePage";
import AdminProposalsPage from "./pages/AdminProposalsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/przepisy" element={<RecipesPage />} />
        <Route path="/przepisy/:apiPrzepisId" element={<RecipeDetailsPage />} />
        <Route path="/logowanie" element={<LoginPage />} />
        <Route path="/rejestracja" element={<RegisterPage />} />
        <Route path="/ulubione" element={<FavoritesPage />} />
        <Route path="/profil" element={<ProfilePage />} />
        <Route path="/dodaj-przepis" element={<AddRecipePage />} />
        <Route path="/admin/propozycje-przepisow" element={<AdminProposalsPage />} />
        <Route path="/reset-hasla" element={<ResetPasswordPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;