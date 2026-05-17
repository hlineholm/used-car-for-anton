import test from "node:test";
import assert from "node:assert/strict";
import {
  applyPreset,
  createAppStore,
  createUiDefaults,
  dataFailed,
  dataLoaded,
  selectMaxPriceDefault,
  resetUiState,
  selectInventoryResult,
  selectSortOptions,
  setFilterValue,
  setInventoryView,
  setSortValue,
  type AppData,
} from "../src/store.js";
import { createShortcutDefinitions } from "../src/shortcuts.js";
import type { InventoryItem } from "../src/core.js";

function makeItem(config: {
  reg: string;
  brand: string;
  modelName: string;
  priceNum: number;
  mileageMil: number;
  yearNum: number;
}): InventoryItem {
  const primaryProfile = config.modelName === "Prius" ? "Toyota Prius hybrid" : `${config.brand} ${config.modelName}`;
  const profileTags =
    config.modelName === "Prius" ? ["Hybrid", "Toyota/Lexus hybrid"] : config.modelName === "Jazz" ? ["Småbil", "CVT"] : [config.brand];
  return {
    model: `${config.brand} ${config.modelName}`,
    trim: "Base",
    location: "Uppsala",
    fuel: "Bensin",
    gearbox: "Manuell",
    seller: "Privat",
    body: "Halvkombi",
    reg: config.reg,
    risk: "Lower",
    riskNote: "",
    serviceDue: "Now",
    serviceCost: "1 000 kr",
    forumWatchouts: "",
    year: String(config.yearNum),
    yearNum: config.yearNum,
    mileage: `${config.mileageMil} mil`,
    mileageMil: config.mileageMil,
    price: `${config.priceNum} kr`,
    priceNum: config.priceNum,
    owners: "1",
    ownersNum: 1,
    href: "https://example.com",
    canonical: {
      brand: config.brand,
      modelName: config.modelName,
      modelSeries: "Base",
      engine: "1.0",
      trim: "Base",
      priceNum: config.priceNum,
      mileageMil: config.mileageMil,
      yearNum: config.yearNum,
      fuel: "Bensin",
      gearboxDriveability: "Manuell",
      gearboxDetail: "Manuell",
      bodyType: "Halvkombi",
      location: "Uppsala",
      region: "Uppsala län",
      distanceBucketFromUppsala: "0-25 km",
      sellerType: "Privat",
      ownersNum: 1,
      risk: "Lower",
      riskKnown: true,
      primaryProfile,
      profileSource: "known-model-family",
      refreshPriority: "low",
      serviceDueLevel: "Now",
      serviceCostMin: 1000,
      serviceCostMax: 2000,
      serviceCostBucket: "0-5k",
      regNormalized: config.reg,
      debtStatus: "No",
      registryVerified: true,
    },
    derived: {
      age: new Date().getFullYear() - config.yearNum,
      priceBucket: "<=50k",
      mileageBucket: "10-20k",
      ageBucket: "<=5 år",
      ownersBucket: "1",
      pricePerMil: 2,
      pricePerMilBucket: "1,5-2,5 kr/mil",
      riskRank: 0,
      hasDebt: false,
      profileTags,
    },
    display: {
      name: `${config.brand} ${config.modelName}`,
      version: "Base",
      engine: "1.0",
      price: `${config.priceNum} kr`,
      mileage: `${config.mileageMil} mil`,
      year: String(config.yearNum),
      fuel: "Bensin",
      gearbox: "Manuell",
      body: "Halvkombi",
      location: "Uppsala",
      region: "Uppsala län",
      distance: "0-25 km",
      seller: "Privat",
      owners: "1",
      risk: "Låg",
      primaryProfile,
      serviceDue: "Nu",
      serviceCost: "1 000 kr",
      reg: config.reg,
      debt: "Nej",
    },
  };
}

function makeData(items: InventoryItem[]): AppData {
  return {
    filters: {
      fuels: ["Bensin"],
      sellers: ["Privat"],
      bodies: ["Halvkombi"],
      risks: ["Lower"],
      sortOptions: [{ value: "price-asc", label: "Pris lågt till högt" }],
    },
    inventory: items,
    meta: {
      maxPrice: 50000,
      maxMileage: 20000,
    },
  };
}

function applyShortcut(store: ReturnType<typeof createAppStore>, shortcutId: string, maxPrice = 50000): void {
  const shortcuts = Object.fromEntries(createShortcutDefinitions(String(maxPrice)).map((shortcut) => [shortcut.id, shortcut]));
  const shortcut = shortcuts[shortcutId];
  assert.ok(shortcut, `Expected shortcut ${shortcutId} to exist`);
  store.dispatch(resetUiState(createUiDefaults(maxPrice)));
  store.dispatch(applyPreset(shortcut.values));
}

test("ui defaults start neutral", () => {
  assert.deepEqual(createUiDefaults(50000), {
    filters: {
      brand: "All",
      model: "All",
      series: "All",
      engine: "All",
      trim: "All",
      location: "All",
      region: "All",
      distance: "All",
      search: "",
      maxPrice: "50000",
      maxMileage: "",
      fuel: "All",
      gearbox: "All",
      seller: "All",
      body: "All",
      risk: "All",
      primaryProfile: "All",
      profileTag: "All",
      riskStatus: "All",
      serviceDue: "All",
      serviceCost: "All",
      priceBucket: "All",
      mileageBucket: "All",
      ageBucket: "All",
      ownersBucket: "All",
      pricePerMilBucket: "All",
      debtStatus: "All",
      registryVerified: "All",
    },
    sort: { sort1: "none", sort2: "none", sort3: "none" },
    view: "list",
  });
});

test("data actions and selectors reflect loaded data", () => {
  const store = createAppStore();
  const data = makeData([
    makeItem({ reg: "AAA111", brand: "Toyota", modelName: "Prius", priceNum: 40000, mileageMil: 15000, yearNum: 2018 }),
    makeItem({ reg: "BBB222", brand: "Honda", modelName: "Jazz", priceNum: 35000, mileageMil: 12000, yearNum: 2017 }),
  ]);

  assert.equal(selectMaxPriceDefault(store.getState()), Number.POSITIVE_INFINITY);
  assert.equal(selectInventoryResult(store.getState()), null);

  store.dispatch(dataLoaded(data));
  assert.equal(selectMaxPriceDefault(store.getState()), 50000);
  assert.deepEqual(selectSortOptions(store.getState())[0], { value: "none", label: "Ingen sortering" });

  store.dispatch(resetUiState(createUiDefaults(data.meta?.maxPrice)));
  const initialResult = selectInventoryResult(store.getState());
  assert.equal(initialResult?.filteredCount, 2);
  assert.equal(initialResult?.totalCount, 2);
  assert.deepEqual(initialResult?.rows.map((item) => item.reg), ["BBB222", "AAA111"]);

  store.dispatch(setFilterValue({ key: "brand", value: "Toyota" }));
  const toyotaResult = selectInventoryResult(store.getState());
  assert.deepEqual(toyotaResult?.rows.map((item) => item.reg), ["AAA111"]);

  store.dispatch(resetUiState(createUiDefaults(data.meta?.maxPrice)));
  store.dispatch(setFilterValue({ key: "primaryProfile", value: "Toyota Prius hybrid" }));
  const profileResult = selectInventoryResult(store.getState());
  assert.deepEqual(profileResult?.rows.map((item) => item.reg), ["AAA111"]);

  store.dispatch(resetUiState(createUiDefaults(data.meta?.maxPrice)));
  store.dispatch(setFilterValue({ key: "profileTag", value: "CVT" }));
  const tagResult = selectInventoryResult(store.getState());
  assert.deepEqual(tagResult?.rows.map((item) => item.reg), ["BBB222"]);

  store.dispatch(setSortValue({ key: "sort1", value: "price-asc" }));
  store.dispatch(setInventoryView("cards"));
  assert.equal(store.getState().ui.view, "cards");

  store.dispatch(applyPreset({ brand: "Honda", sort1: "price-asc" }));
  const hondaResult = selectInventoryResult(store.getState());
  assert.deepEqual(hondaResult?.rows.map((item) => item.reg), ["BBB222"]);
  assert.equal(store.getState().ui.filters.brand, "Honda");
  assert.equal(store.getState().ui.sort.sort1, "price-asc");
});

test("resetUiState and dataFailed update the store slices", () => {
  const store = createAppStore();
  const defaults = createUiDefaults(40000);

  store.dispatch(setFilterValue({ key: "brand", value: "Toyota" }));
  store.dispatch(setSortValue({ key: "sort1", value: "price-asc" }));
  store.dispatch(setInventoryView("cards"));
  store.dispatch(resetUiState(defaults));

  assert.deepEqual(store.getState().ui, defaults);

  store.dispatch(dataFailed("boom"));
  assert.equal(store.getState().data.status, "error");
  assert.equal(store.getState().data.errorMessage, "boom");
});

test("applyPreset updates filters and sorts together", () => {
  const store = createAppStore();
  store.dispatch(resetUiState(createUiDefaults(50000)));
  store.dispatch(setFilterValue({ key: "fuel", value: "Diesel" }));
  store.dispatch(setFilterValue({ key: "body", value: "SUV" }));
  store.dispatch(applyPreset({ brand: "Toyota", model: "Prius", sort1: "price-asc", sort2: "mileage-asc" }));

  assert.equal(store.getState().ui.filters.brand, "Toyota");
  assert.equal(store.getState().ui.filters.model, "Prius");
  assert.equal(store.getState().ui.filters.fuel, "Diesel");
  assert.equal(store.getState().ui.filters.body, "SUV");
  assert.equal(store.getState().ui.sort.sort1, "price-asc");
  assert.equal(store.getState().ui.sort.sort2, "mileage-asc");
});

test("shortcut-style reset then preset replaces prior filter state", () => {
  const store = createAppStore();
  store.dispatch(resetUiState(createUiDefaults(50000)));
  store.dispatch(setFilterValue({ key: "fuel", value: "Diesel" }));
  store.dispatch(setFilterValue({ key: "body", value: "SUV" }));
  store.dispatch(setSortValue({ key: "sort1", value: "mileage-asc" }));

  store.dispatch(resetUiState(createUiDefaults(50000)));
  store.dispatch(applyPreset({ brand: "Toyota", model: "Prius", sort1: "price-asc" }));

  assert.equal(store.getState().ui.filters.fuel, "All");
  assert.equal(store.getState().ui.filters.body, "All");
  assert.equal(store.getState().ui.sort.sort1, "price-asc");
  assert.equal(store.getState().ui.sort.sort2, "none");
  assert.equal(store.getState().ui.sort.sort3, "none");
});

test("shortcut definitions cover the expected preset intents", () => {
  const shortcuts = Object.fromEntries(createShortcutDefinitions("50000").map((shortcut) => [shortcut.id, shortcut]));

  assert.equal(shortcuts.prius.values.brand, "Toyota");
  assert.equal(shortcuts.prius.values.model, "Prius");
  assert.equal(shortcuts.jazz.values.brand, "Honda");
  assert.equal(shortcuts.city.values.search, "Aygo | 107 | C1");
  assert.equal(shortcuts.avoid.values.risk, "Avoid");
  assert.equal(shortcuts.lowmiles.values.maxMileage, "15000");
  assert.equal(shortcuts.clear.values.sort1, "none");
});

test("switching between shortcuts replaces prior shortcut state", () => {
  const store = createAppStore();
  store.dispatch(resetUiState(createUiDefaults(50000)));

  applyShortcut(store, "avoid");
  assert.equal(store.getState().ui.filters.search, "Yaris | Auris | 207 | Polo");
  assert.equal(store.getState().ui.filters.risk, "Avoid");
  assert.equal(store.getState().ui.sort.sort1, "price-asc");

  applyShortcut(store, "lowmiles");
  assert.equal(store.getState().ui.filters.search, "");
  assert.equal(store.getState().ui.filters.risk, "All");
  assert.equal(store.getState().ui.filters.maxMileage, "15000");
  assert.equal(store.getState().ui.sort.sort1, "mileage-asc");
});

test("switching from a model shortcut to clear returns to defaults", () => {
  const store = createAppStore();
  store.dispatch(resetUiState(createUiDefaults(50000)));

  applyShortcut(store, "prius");
  assert.equal(store.getState().ui.filters.brand, "Toyota");
  assert.equal(store.getState().ui.filters.model, "Prius");
  assert.equal(store.getState().ui.sort.sort1, "price-asc");

  applyShortcut(store, "clear");
  assert.deepEqual(store.getState().ui, createUiDefaults(50000));
});
