export const CATEGORY_OPTIONS = [
  { value: "Beef", label: "Wołowina" },
  { value: "Breakfast", label: "Śniadanie" },
  { value: "Chicken", label: "Kurczak" },
  { value: "Dessert", label: "Deser" },
  { value: "Goat", label: "Koźlina" },
  { value: "Lamb", label: "Jagnięcina" },
  { value: "Miscellaneous", label: "Różne" },
  { value: "Pasta", label: "Makaron" },
  { value: "Pork", label: "Wieprzowina" },
  { value: "Seafood", label: "Owoce morza" },
  { value: "Side", label: "Dodatek" },
  { value: "Starter", label: "Przystawka" },
  { value: "Vegan", label: "Wegańskie" },
  { value: "Vegetarian", label: "Wegetariańskie" }
];

export const AREA_OPTIONS = [
  { value: "American", label: "Amerykańska" },
  { value: "British", label: "Brytyjska" },
  { value: "Canadian", label: "Kanadyjska" },
  { value: "Chinese", label: "Chińska" },
  { value: "Croatian", label: "Chorwacka" },
  { value: "Dutch", label: "Holenderska" },
  { value: "Egyptian", label: "Egipska" },
  { value: "Filipino", label: "Filipińska" },
  { value: "French", label: "Francuska" },
  { value: "Greek", label: "Grecka" },
  { value: "Indian", label: "Indyjska" },
  { value: "Irish", label: "Irlandzka" },
  { value: "Italian", label: "Włoska" },
  { value: "Jamaican", label: "Jamajska" },
  { value: "Japanese", label: "Japońska" },
  { value: "Kenyan", label: "Kenijska" },
  { value: "Malaysian", label: "Malezyjska" },
  { value: "Mexican", label: "Meksykańska" },
  { value: "Moroccan", label: "Marokańska" },
  { value: "Polish", label: "Polska" },
  { value: "Portuguese", label: "Portugalska" },
  { value: "Russian", label: "Rosyjska" },
  { value: "Spanish", label: "Hiszpańska" },
  { value: "Thai", label: "Tajska" },
  { value: "Tunisian", label: "Tunezyjska" },
  { value: "Turkish", label: "Turecka" },
  { value: "Ukrainian", label: "Ukraińska" },
  { value: "Uruguayan", label: "Urugwajska" },
  { value: "Vietnamese", label: "Wietnamska" }
];

export const categoryTranslations = {
  Beef: "Wołowina",
  Breakfast: "Śniadanie",
  Chicken: "Kurczak",
  Dessert: "Deser",
  Goat: "Koźlina",
  Lamb: "Jagnięcina",
  Miscellaneous: "Różne",
  Pasta: "Makaron",
  Pork: "Wieprzowina",
  Seafood: "Owoce morza",
  Side: "Dodatek",
  Starter: "Przystawka",
  Vegan: "Wegańskie",
  Vegetarian: "Wegetariańskie"
};

export const areaTranslations = {
  American: "Amerykańska",
  British: "Brytyjska",
  Canadian: "Kanadyjska",
  Chinese: "Chińska",
  Croatian: "Chorwacka",
  Dutch: "Holenderska",
  Egyptian: "Egipska",
  Filipino: "Filipińska",
  French: "Francuska",
  Greek: "Grecka",
  Indian: "Indyjska",
  Irish: "Irlandzka",
  Italian: "Włoska",
  Jamaican: "Jamajska",
  Japanese: "Japońska",
  Kenyan: "Kenijska",
  Malaysian: "Malezyjska",
  Mexican: "Meksykańska",
  Moroccan: "Marokańska",
  Polish: "Polska",
  Portuguese: "Portugalska",
  Russian: "Rosyjska",
  Spanish: "Hiszpańska",
  Thai: "Tajska",
  Tunisian: "Tunezyjska",
  Turkish: "Turecka",
  Ukrainian: "Ukraińska",
  Uruguayan: "Urugwajska",
  Vietnamese: "Wietnamska"
};

export function translateCategory(value) {
  return categoryTranslations[value] || value || "Brak kategorii";
}

export function translateArea(value) {
  return areaTranslations[value] || value || "Brak kraju";
}