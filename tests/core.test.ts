import test from "node:test";
import assert from "node:assert/strict";
import {
  compareItems,
  dedupeSortValues,
  matchesSearch,
  parseBrandModel,
  parseSearchQuery,
  type InventoryItem,
} from "../src/core.js";

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    model: "Toyota Prius",
    trim: "1.5 Hybrid",
    location: "Uppsala",
    fuel: "Hybrid bensin",
    gearbox: "Automatisk",
    seller: "Privat",
    body: "Halvkombi 5-dörrar",
    reg: "ABC123",
    risk: "Lower",
    riskNote: "Low risk baseline.",
    serviceDue: "soon",
    serviceCost: "3k-5k SEK",
    forumWatchouts: "battery aging",
    year: "2008",
    yearNum: 2008,
    mileage: "20 000 mil",
    mileageMil: 20000,
    price: "40 000 kr",
    priceNum: 40000,
    owners: "3",
    ownersNum: 3,
    href: "https://example.com",
    ...overrides,
  };
}

test("parseSearchQuery supports AND and OR groups", () => {
  assert.deepEqual(parseSearchQuery("Toyota Prius"), [["toyota", "prius"]]);
  assert.deepEqual(parseSearchQuery("prius | jazz"), [["prius"], ["jazz"]]);
});

test("matchesSearch works across indexed fields", () => {
  const item = makeItem({ forumWatchouts: "inverter pump issue", reg: "KGC602" });
  assert.equal(matchesSearch(item, parseSearchQuery("toyota kgc602")), true);
  assert.equal(matchesSearch(item, parseSearchQuery("inverter | diesel")), true);
  assert.equal(matchesSearch(item, parseSearchQuery("volvo diesel")), false);
});

test("dedupeSortValues keeps order and removes duplicates/none", () => {
  assert.deepEqual(
    dedupeSortValues(["risk-asc", "price-desc", "price-desc", "none", "", "year-asc"]),
    ["risk-asc", "price-desc", "year-asc"],
  );
});

test("compareItems uses secondary and tertiary sort steps", () => {
  const items = [
    makeItem({ model: "Toyota Prius", risk: "Lower", priceNum: 100, yearNum: 2009 }),
    makeItem({ model: "Toyota Prius", risk: "Lower", priceNum: 100, yearNum: 2007 }),
    makeItem({ model: "Toyota Prius", risk: "Lower", priceNum: 200, yearNum: 2010 }),
  ];
  const sorted = [...items].sort((a, b) => compareItems(a, b, ["risk-asc", "price-desc", "year-asc"]));
  assert.deepEqual(
    sorted.map((item) => [item.priceNum, item.yearNum]),
    [
      [200, 2010],
      [100, 2007],
      [100, 2009],
    ],
  );
});

test("risk high-to-low starts with Avoid and keeps unrated last", () => {
  const items = [
    makeItem({ risk: "Unrated", model: "Unrated Car" }),
    makeItem({ risk: "Lower", model: "Lower Car" }),
    makeItem({ risk: "Avoid", model: "Avoid Car" }),
    makeItem({ risk: "Medium", model: "Medium Car" }),
  ];
  const sorted = [...items].sort((a, b) => compareItems(a, b, ["risk-desc"]));
  assert.deepEqual(
    sorted.map((item) => item.risk),
    ["Avoid", "Medium", "Lower", "Unrated"],
  );
});

test("parseBrandModel splits brand and model name", () => {
  assert.deepEqual(parseBrandModel("Toyota Prius"), { brand: "Toyota", modelName: "Prius" });
  assert.deepEqual(parseBrandModel("Saab"), { brand: "Saab", modelName: "Saab" });
});
