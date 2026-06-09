import React from "react";
import { useNavigate } from "react-router-dom";

function CategorySection() {
  let navigate = useNavigate();

  let categories = [
    {
      value: "Breakfast",
      label: "Śniadanie",
      image:
        "https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Chicken",
      label: "Kurczak",
      image:
        "https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Beef",
      label: "Wołowina",
      image:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Dessert",
      label: "Deser",
      image:
        "https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Seafood",
      label: "Owoce morza",
      image:
        "https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Pasta",
      label: "Makaron",
      image:
        "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Vegetarian",
      label: "Wegetariańskie",
      image:
        "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80"
    },
    {
      value: "Starter",
      label: "Przystawka",
      image:
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80"
    }
  ];

  function handleCategoryClick(categoryValue) {
    navigate("/przepisy?category=" + encodeURIComponent(categoryValue));
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-header">
          <h2>Przeglądaj według kategorii</h2>
          <p>Wybierz kategorię i odkrywaj inspirujące przepisy.</p>
        </div>

        <div className="category-grid">
          {categories.map((category, index) => (
            <div
              className="category-circle-card"
              key={index}
              onClick={() => handleCategoryClick(category.value)}
              style={{ cursor: "pointer" }}
            >
              <div className="category-circle-image-wrapper">
                <img
                  src={category.image}
                  alt={category.label}
                  className="category-circle-image"
                />
              </div>
              <h3 className="category-circle-title">{category.label}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CategorySection;