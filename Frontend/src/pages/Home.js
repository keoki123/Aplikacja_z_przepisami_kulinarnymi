import React from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import CategorySection from "../components/CategorySection";
import PopularSection from "../components/PopularSection";
import Footer from "../components/Footer";

function Home() {
  return (
    <div className="app">
      <Navbar />
      <Hero />
      <CategorySection />
      <PopularSection />
      <Footer />
    </div>
  );
}

export default Home;