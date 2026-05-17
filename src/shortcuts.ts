import type { FilterPreset } from "./store.js";

export interface ShortcutDefinition {
  id: string;
  title: string;
  note: string;
  values: FilterPreset;
}

export function createShortcutDefinitions(maxPriceValue: string): ShortcutDefinition[] {
  return [
    {
      id: "prius",
      title: "Prius",
      note: "Bra förstaval.",
      values: { brand: "Toyota", model: "Prius", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "jazz",
      title: "Jazz",
      note: "Bra familjeval.",
      values: { brand: "Honda", model: "Jazz", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "city",
      title: "Aygo / 107 / C1",
      note: "Små stadsbilar.",
      values: { search: "Aygo | 107 | C1", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "avoid",
      title: "Undvik",
      note: "Yaris/Auris/207/Polo.",
      values: { search: "Yaris | Auris | 207 | Polo", risk: "Avoid", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "lowmiles",
      title: "Låg mil",
      note: "Visa lägst mil först.",
      values: { maxMileage: "15000", sort1: "mileage-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "clear",
      title: "Nollställ",
      note: "Tillbaka till alla.",
      values: { maxPrice: maxPriceValue, sort1: "none", sort2: "none", sort3: "none" },
    },
  ];
}
