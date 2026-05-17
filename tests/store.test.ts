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
import type { InventoryItem } from "../src/core.js";

function makeItem(config: {
  reg: string;
  brand: string;
  modelName: string;
  priceNum: number;
  mileageMil: number;
  yearNum: number;
}): InventoryItem {
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
  store.dispatch(applyPreset({ brand: "Toyota", model: "Prius", sort1: "price-asc", sort2: "mileage-asc" }));

  assert.equal(store.getState().ui.filters.brand, "Toyota");
  assert.equal(store.getState().ui.filters.model, "Prius");
  assert.equal(store.getState().ui.sort.sort1, "price-asc");
  assert.equal(store.getState().ui.sort.sort2, "mileage-asc");
});
