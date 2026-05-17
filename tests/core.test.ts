import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  compareItems,
  dedupeSortValues,
  filterAndSortInventory,
  matchesSearch,
  parseBrandModel,
  parseSearchQuery,
  projectInventoryItem,
  queryInventory,
  type InventoryFilters,
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

function makeStructuredItem(config: {
  reg: string;
  brand: string;
  modelName: string;
  modelSeries: string;
  engine: string;
  trim: string;
  priceNum: number;
  mileageMil: number;
  yearNum: number;
  ownersNum: number;
  fuel: string;
  gearbox: string;
  body: string;
  location: string;
  region: string;
  distance: string;
  seller: string;
  risk: string | null;
  riskKnown: boolean;
  serviceDue: string;
  serviceCostMin: number | null;
  serviceCostBucket: string;
  debtStatus: string;
  registryVerified: boolean;
  priceBucket: string;
  mileageBucket: string;
  ageBucket: string;
  ownersBucket: string;
  pricePerMil: number;
  pricePerMilBucket: string;
}): InventoryItem {
  const age = new Date().getFullYear() - config.yearNum;
  const displayName = `${config.brand} ${config.modelName}`;
  const displayVersion = [config.modelSeries, config.engine, config.trim].join(" ");
  return makeItem({
    model: displayName,
    trim: displayVersion,
    location: config.location,
    fuel: config.fuel,
    gearbox: config.gearbox,
    seller: config.seller,
    body: config.body,
    reg: config.reg,
    risk: config.risk ?? "Unrated",
    serviceDue: config.serviceDue,
    serviceCost: config.serviceCostMin == null ? "Okänt" : `${config.serviceCostMin} kr`,
    year: String(config.yearNum),
    yearNum: config.yearNum,
    mileage: `${config.mileageMil} mil`,
    mileageMil: config.mileageMil,
    price: `${config.priceNum} kr`,
    priceNum: config.priceNum,
    owners: String(config.ownersNum),
    ownersNum: config.ownersNum,
    canonical: {
      brand: config.brand,
      modelName: config.modelName,
      modelSeries: config.modelSeries,
      engine: config.engine,
      trim: config.trim,
      priceNum: config.priceNum,
      mileageMil: config.mileageMil,
      yearNum: config.yearNum,
      fuel: config.fuel,
      gearboxDriveability: config.gearbox,
      gearboxDetail: config.gearbox,
      bodyType: config.body,
      location: config.location,
      region: config.region,
      distanceBucketFromUppsala: config.distance,
      sellerType: config.seller,
      ownersNum: config.ownersNum,
      risk: config.risk,
      riskKnown: config.riskKnown,
      serviceDueLevel: config.serviceDue,
      serviceCostMin: config.serviceCostMin,
      serviceCostBucket: config.serviceCostBucket,
      regNormalized: config.reg,
      debtStatus: config.debtStatus,
      registryVerified: config.registryVerified,
    },
    derived: {
      age,
      priceBucket: config.priceBucket,
      mileageBucket: config.mileageBucket,
      ageBucket: config.ageBucket,
      ownersBucket: config.ownersBucket,
      pricePerMil: config.pricePerMil,
      pricePerMilBucket: config.pricePerMilBucket,
    },
    display: {
      name: displayName,
      version: displayVersion,
      engine: config.engine,
      price: `${config.priceNum} kr`,
      mileage: `${config.mileageMil} mil`,
      year: String(config.yearNum),
      fuel: config.fuel,
      gearbox: config.gearbox,
      body: config.body,
      location: config.location,
      region: config.region,
      distance: config.distance,
      seller: config.seller,
      owners: String(config.ownersNum),
      risk: config.risk ?? "Ej bedömd",
      serviceDue: config.serviceDue,
      serviceCost: config.serviceCostMin == null ? "Okänt" : `${config.serviceCostMin} kr`,
      reg: config.reg,
      debt: config.debtStatus,
    },
  });
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
  assert.deepEqual(parseBrandModel("Volkswagen Passat"), { brand: "Volkswagen", modelName: "Passat" });
  assert.deepEqual(parseBrandModel("Land Rover Discovery"), { brand: "Land Rover", modelName: "Discovery" });
  assert.deepEqual(parseBrandModel("Alfa Romeo 156"), { brand: "Alfa Romeo", modelName: "156" });
});

test("service sorting uses canonical service fields", () => {
  const items = [
    makeItem({
      serviceDue: "Snart",
      serviceCost: "10 000-20 000 kr",
      canonical: { serviceDueLevel: "Soon", serviceCostMin: 10000 },
    }),
    makeItem({
      serviceDue: "Nu",
      serviceCost: "2 000-8 000 kr",
      canonical: { serviceDueLevel: "Now", serviceCostMin: 2000 },
    }),
    makeItem({
      serviceDue: "Senare",
      serviceCost: "5 000-10 000 kr",
      canonical: { serviceDueLevel: "Later", serviceCostMin: 5000 },
    }),
  ];

  const byDue = [...items].sort((a, b) => compareItems(a, b, ["service-due-asc"]));
  assert.deepEqual(byDue.map((item) => item.canonical?.serviceDueLevel), ["Now", "Soon", "Later"]);

  const byCost = [...items].sort((a, b) => compareItems(a, b, ["service-cost-asc"]));
  assert.deepEqual(byCost.map((item) => item.canonical?.serviceCostMin), [2000, 5000, 10000]);
});

test("projectInventoryItem derives fallback structured fields", () => {
  const item = makeItem({
    model: "Volkswagen Golf",
    trim: "1.6 FSI Comfort",
    yearNum: 2016,
    mileageMil: 20000,
    priceNum: 40000,
    ownersNum: 2,
    risk: "Unrated",
  });

  const projected = projectInventoryItem(item);
  assert.equal(projected.brand, "Volkswagen");
  assert.equal(projected.modelName, "Golf");
  assert.equal(projected.priceBucket, "<=50k");
  assert.equal(projected.mileageBucket, "10-20k");
  assert.equal(projected.ownersBucket, "2");
  assert.equal(projected.pricePerMilBucket, "1,5-2,5 kr/mil");
  assert.equal(projected.riskKnown, false);
});

test("new structured sort fields use canonical and derived values", () => {
  const items = [
    makeStructuredItem({
      reg: "A",
      brand: "Toyota",
      modelName: "Prius",
      modelSeries: "XW50",
      engine: "1.8 Hybrid",
      trim: "Active",
      priceNum: 40000,
      mileageMil: 9000,
      yearNum: 2023,
      ownersNum: 1,
      fuel: "Hybrid bensin",
      gearbox: "Automat",
      body: "Halvkombi",
      location: "Uppsala",
      region: "Uppsala län",
      distance: "0-25 km",
      seller: "Handlare",
      risk: "Lower",
      riskKnown: true,
      serviceDue: "Soon",
      serviceCostMin: 3000,
      serviceCostBucket: "0-5k",
      debtStatus: "No",
      registryVerified: true,
      priceBucket: "<=50k",
      mileageBucket: "<=10k",
      ageBucket: "<=5 år",
      ownersBucket: "1",
      pricePerMil: 4.44,
      pricePerMilBucket: "2,5-5 kr/mil",
    }),
    makeStructuredItem({
      reg: "B",
      brand: "Honda",
      modelName: "Jazz",
      modelSeries: "GE",
      engine: "1.4",
      trim: "Comfort",
      priceNum: 70000,
      mileageMil: 35000,
      yearNum: 2019,
      ownersNum: 3,
      fuel: "Bensin",
      gearbox: "Manuell",
      body: "Halvkombi",
      location: "Västerås",
      region: "Västmanlands län",
      distance: "50-100 km",
      seller: "Privat",
      risk: "Medium",
      riskKnown: true,
      serviceDue: "Now",
      serviceCostMin: 7000,
      serviceCostBucket: "5-10k",
      debtStatus: "Yes",
      registryVerified: false,
      priceBucket: "50-100k",
      mileageBucket: "20-40k",
      ageBucket: "5-10 år",
      ownersBucket: "3",
      pricePerMil: 2,
      pricePerMilBucket: "1,5-2,5 kr/mil",
    }),
    makeStructuredItem({
      reg: "C",
      brand: "Volkswagen",
      modelName: "Golf",
      modelSeries: "Mk5",
      engine: "1.6 FSI",
      trim: "GT",
      priceNum: 150000,
      mileageMil: 15000,
      yearNum: 2012,
      ownersNum: 8,
      fuel: "Diesel",
      gearbox: "Automat",
      body: "Kombi",
      location: "Stockholm",
      region: "Stockholms län",
      distance: "25-50 km",
      seller: "Handlare",
      risk: null,
      riskKnown: false,
      serviceDue: "Later",
      serviceCostMin: 15000,
      serviceCostBucket: "10-20k",
      debtStatus: "Unknown",
      registryVerified: true,
      priceBucket: "100-200k",
      mileageBucket: "10-20k",
      ageBucket: "10-20 år",
      ownersBucket: "8-10",
      pricePerMil: 10,
      pricePerMilBucket: ">5 kr/mil",
    }),
  ];

  assert.deepEqual(
    [...items].sort((a, b) => compareItems(a, b, ["distance-asc"])).map((item) => item.reg),
    ["A", "C", "B"],
  );
  assert.deepEqual(
    [...items].sort((a, b) => compareItems(a, b, ["price-bucket-desc"])).map((item) => item.reg),
    ["C", "B", "A"],
  );
  assert.deepEqual(
    [...items].sort((a, b) => compareItems(a, b, ["price-per-mil-asc"])).map((item) => item.reg),
    ["B", "A", "C"],
  );
  assert.deepEqual(
    [...items].sort((a, b) => compareItems(a, b, ["risk-known-first"])).map((item) => item.reg),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    [...items].sort((a, b) => compareItems(a, b, ["registry-verified-first"])).map((item) => item.reg),
    ["A", "C", "B"],
  );
});

test("filterAndSortInventory covers filter and sort combinations for structured fields", () => {
  const items = [
    makeStructuredItem({
      reg: "AAA111",
      brand: "Toyota",
      modelName: "Prius",
      modelSeries: "XW50",
      engine: "1.8 Hybrid",
      trim: "Active",
      priceNum: 40000,
      mileageMil: 9000,
      yearNum: 2023,
      ownersNum: 1,
      fuel: "Hybrid bensin",
      gearbox: "Automat",
      body: "Halvkombi",
      location: "Uppsala",
      region: "Uppsala län",
      distance: "0-25 km",
      seller: "Handlare",
      risk: "Lower",
      riskKnown: true,
      serviceDue: "Soon",
      serviceCostMin: 3000,
      serviceCostBucket: "0-5k",
      debtStatus: "No",
      registryVerified: true,
      priceBucket: "<=50k",
      mileageBucket: "<=10k",
      ageBucket: "<=5 år",
      ownersBucket: "1",
      pricePerMil: 4.44,
      pricePerMilBucket: "2,5-5 kr/mil",
    }),
    makeStructuredItem({
      reg: "BBB222",
      brand: "Honda",
      modelName: "Jazz",
      modelSeries: "GE",
      engine: "1.4",
      trim: "Comfort",
      priceNum: 70000,
      mileageMil: 35000,
      yearNum: 2019,
      ownersNum: 3,
      fuel: "Bensin",
      gearbox: "Manuell",
      body: "Halvkombi",
      location: "Västerås",
      region: "Västmanlands län",
      distance: "50-100 km",
      seller: "Privat",
      risk: "Medium",
      riskKnown: true,
      serviceDue: "Now",
      serviceCostMin: 7000,
      serviceCostBucket: "5-10k",
      debtStatus: "Yes",
      registryVerified: false,
      priceBucket: "50-100k",
      mileageBucket: "20-40k",
      ageBucket: "5-10 år",
      ownersBucket: "3",
      pricePerMil: 2,
      pricePerMilBucket: "1,5-2,5 kr/mil",
    }),
    makeStructuredItem({
      reg: "CCC333",
      brand: "Volkswagen",
      modelName: "Golf",
      modelSeries: "Mk5",
      engine: "1.6 FSI",
      trim: "GT",
      priceNum: 150000,
      mileageMil: 15000,
      yearNum: 2012,
      ownersNum: 8,
      fuel: "Diesel",
      gearbox: "Automat",
      body: "Kombi",
      location: "Stockholm",
      region: "Stockholms län",
      distance: "25-50 km",
      seller: "Handlare",
      risk: null,
      riskKnown: false,
      serviceDue: "Later",
      serviceCostMin: 15000,
      serviceCostBucket: "10-20k",
      debtStatus: "Unknown",
      registryVerified: true,
      priceBucket: "100-200k",
      mileageBucket: "10-20k",
      ageBucket: "10-20 år",
      ownersBucket: "8-10",
      pricePerMil: 10,
      pricePerMilBucket: ">5 kr/mil",
    }),
    makeStructuredItem({
      reg: "DDD444",
      brand: "Saab",
      modelName: "9-3",
      modelSeries: "SportSedan",
      engine: "2.0T",
      trim: "Aero",
      priceNum: 250000,
      mileageMil: 200000,
      yearNum: 2000,
      ownersNum: 12,
      fuel: "Bensin",
      gearbox: "Manuell",
      body: "Sedan",
      location: "Gävle",
      region: "Gävleborgs län",
      distance: "100-200 km",
      seller: "Privat",
      risk: "Avoid",
      riskKnown: true,
      serviceDue: "Unknown",
      serviceCostMin: null,
      serviceCostBucket: "Okänt",
      debtStatus: "No",
      registryVerified: false,
      priceBucket: ">200k",
      mileageBucket: ">40k",
      ageBucket: ">20 år",
      ownersBucket: "11+",
      pricePerMil: 1.25,
      pricePerMilBucket: "<=1,5 kr/mil",
    }),
    makeStructuredItem({
      reg: "EEE555",
      brand: "Land Rover",
      modelName: "Discovery",
      modelSeries: "L319",
      engine: "TDV6",
      trim: "HSE",
      priceNum: 180000,
      mileageMil: 60000,
      yearNum: 2010,
      ownersNum: 6,
      fuel: "Diesel",
      gearbox: "Automat",
      body: "SUV",
      location: "Falun",
      region: "Dalarnas län",
      distance: "200+ km",
      seller: "Handlare",
      risk: "Higher",
      riskKnown: true,
      serviceDue: "Soon",
      serviceCostMin: 25000,
      serviceCostBucket: "20k+",
      debtStatus: "Yes",
      registryVerified: true,
      priceBucket: "100-200k",
      mileageBucket: ">40k",
      ageBucket: "10-20 år",
      ownersBucket: "6-7",
      pricePerMil: 3,
      pricePerMilBucket: "2,5-5 kr/mil",
    }),
  ];

  const order = {
    distance: ["0-25 km", "25-50 km", "50-100 km", "100-200 km", "200+ km", "Okänt"],
    priceBucket: ["<=50k", "50-100k", "100-200k", ">200k", "Okänt"],
    mileageBucket: ["<=10k", "10-20k", "20-40k", ">40k", "Okänt"],
    ageBucket: ["<=5 år", "5-10 år", "10-20 år", ">20 år", "Okänt"],
    ownersBucket: ["1", "2", "3", "4", "5", "6-7", "8-10", "11+", "Okänt"],
    pricePerMilBucket: ["<=1,5 kr/mil", "1,5-2,5 kr/mil", "2,5-5 kr/mil", ">5 kr/mil", "Okänt"],
    risk: ["Lower", "Medium", "Higher", "Avoid", "Unknown"],
    serviceDue: ["Now", "Soon", "Later", "Unknown"],
    debt: ["No", "Yes", "Unknown"],
  } as const;

  const sortCases = [
    { value: "price-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).priceNum ?? Infinity) - (projectInventoryItem(b).priceNum ?? Infinity) },
    { value: "price-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).priceNum ?? -Infinity) - (projectInventoryItem(a).priceNum ?? -Infinity) },
    { value: "price-bucket-asc", compare: (a: InventoryItem, b: InventoryItem) => order.priceBucket.indexOf(projectInventoryItem(a).priceBucket as never) - order.priceBucket.indexOf(projectInventoryItem(b).priceBucket as never) },
    { value: "price-bucket-desc", compare: (a: InventoryItem, b: InventoryItem) => order.priceBucket.indexOf(projectInventoryItem(b).priceBucket as never) - order.priceBucket.indexOf(projectInventoryItem(a).priceBucket as never) },
    { value: "price-per-mil-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).pricePerMil ?? Infinity) - (projectInventoryItem(b).pricePerMil ?? Infinity) },
    { value: "price-per-mil-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).pricePerMil ?? -Infinity) - (projectInventoryItem(a).pricePerMil ?? -Infinity) },
    { value: "price-per-mil-bucket-asc", compare: (a: InventoryItem, b: InventoryItem) => order.pricePerMilBucket.indexOf(projectInventoryItem(a).pricePerMilBucket as never) - order.pricePerMilBucket.indexOf(projectInventoryItem(b).pricePerMilBucket as never) },
    { value: "price-per-mil-bucket-desc", compare: (a: InventoryItem, b: InventoryItem) => order.pricePerMilBucket.indexOf(projectInventoryItem(b).pricePerMilBucket as never) - order.pricePerMilBucket.indexOf(projectInventoryItem(a).pricePerMilBucket as never) },
    { value: "mileage-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).mileageMil ?? Infinity) - (projectInventoryItem(b).mileageMil ?? Infinity) },
    { value: "mileage-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).mileageMil ?? -Infinity) - (projectInventoryItem(a).mileageMil ?? -Infinity) },
    { value: "mileage-bucket-asc", compare: (a: InventoryItem, b: InventoryItem) => order.mileageBucket.indexOf(projectInventoryItem(a).mileageBucket as never) - order.mileageBucket.indexOf(projectInventoryItem(b).mileageBucket as never) },
    { value: "mileage-bucket-desc", compare: (a: InventoryItem, b: InventoryItem) => order.mileageBucket.indexOf(projectInventoryItem(b).mileageBucket as never) - order.mileageBucket.indexOf(projectInventoryItem(a).mileageBucket as never) },
    { value: "year-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).yearNum ?? -Infinity) - (projectInventoryItem(a).yearNum ?? -Infinity) },
    { value: "year-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).yearNum ?? Infinity) - (projectInventoryItem(b).yearNum ?? Infinity) },
    { value: "age-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).age ?? Infinity) - (projectInventoryItem(b).age ?? Infinity) },
    { value: "age-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).age ?? -Infinity) - (projectInventoryItem(a).age ?? -Infinity) },
    { value: "age-bucket-asc", compare: (a: InventoryItem, b: InventoryItem) => order.ageBucket.indexOf(projectInventoryItem(a).ageBucket as never) - order.ageBucket.indexOf(projectInventoryItem(b).ageBucket as never) },
    { value: "age-bucket-desc", compare: (a: InventoryItem, b: InventoryItem) => order.ageBucket.indexOf(projectInventoryItem(b).ageBucket as never) - order.ageBucket.indexOf(projectInventoryItem(a).ageBucket as never) },
    { value: "owners-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).ownersNum ?? Infinity) - (projectInventoryItem(b).ownersNum ?? Infinity) },
    { value: "owners-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).ownersNum ?? -Infinity) - (projectInventoryItem(a).ownersNum ?? -Infinity) },
    { value: "owners-bucket-asc", compare: (a: InventoryItem, b: InventoryItem) => order.ownersBucket.indexOf(projectInventoryItem(a).ownersBucket as never) - order.ownersBucket.indexOf(projectInventoryItem(b).ownersBucket as never) },
    { value: "owners-bucket-desc", compare: (a: InventoryItem, b: InventoryItem) => order.ownersBucket.indexOf(projectInventoryItem(b).ownersBucket as never) - order.ownersBucket.indexOf(projectInventoryItem(a).ownersBucket as never) },
    { value: "brand-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).brand.localeCompare(projectInventoryItem(b).brand) },
    { value: "brand-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).brand.localeCompare(projectInventoryItem(a).brand) },
    { value: "model-asc", compare: (a: InventoryItem, b: InventoryItem) => a.model.localeCompare(b.model) },
    { value: "model-desc", compare: (a: InventoryItem, b: InventoryItem) => b.model.localeCompare(a.model) },
    { value: "series-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).modelSeries.localeCompare(projectInventoryItem(b).modelSeries) },
    { value: "series-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).modelSeries.localeCompare(projectInventoryItem(a).modelSeries) },
    { value: "engine-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).engine.localeCompare(projectInventoryItem(b).engine) },
    { value: "engine-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).engine.localeCompare(projectInventoryItem(a).engine) },
    { value: "trim-asc", compare: (a: InventoryItem, b: InventoryItem) => a.trim.localeCompare(b.trim) },
    { value: "trim-desc", compare: (a: InventoryItem, b: InventoryItem) => b.trim.localeCompare(a.trim) },
    { value: "location-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).location.localeCompare(projectInventoryItem(b).location) },
    { value: "location-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).location.localeCompare(projectInventoryItem(a).location) },
    { value: "region-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).region.localeCompare(projectInventoryItem(b).region) },
    { value: "region-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).region.localeCompare(projectInventoryItem(a).region) },
    { value: "distance-asc", compare: (a: InventoryItem, b: InventoryItem) => order.distance.indexOf(projectInventoryItem(a).distanceBucketFromUppsala as never) - order.distance.indexOf(projectInventoryItem(b).distanceBucketFromUppsala as never) },
    { value: "distance-desc", compare: (a: InventoryItem, b: InventoryItem) => order.distance.indexOf(projectInventoryItem(b).distanceBucketFromUppsala as never) - order.distance.indexOf(projectInventoryItem(a).distanceBucketFromUppsala as never) },
    { value: "fuel-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).fuel.localeCompare(projectInventoryItem(b).fuel) },
    { value: "fuel-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).fuel.localeCompare(projectInventoryItem(a).fuel) },
    { value: "gearbox-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).gearboxDriveability.localeCompare(projectInventoryItem(b).gearboxDriveability) },
    { value: "gearbox-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).gearboxDriveability.localeCompare(projectInventoryItem(a).gearboxDriveability) },
    { value: "seller-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).sellerType.localeCompare(projectInventoryItem(b).sellerType) },
    { value: "seller-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).sellerType.localeCompare(projectInventoryItem(a).sellerType) },
    { value: "body-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).bodyType.localeCompare(projectInventoryItem(b).bodyType) },
    { value: "body-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).bodyType.localeCompare(projectInventoryItem(a).bodyType) },
    {
      value: "risk-best",
      compare: (a: InventoryItem, b: InventoryItem) => {
        const aRisk = projectInventoryItem(a).risk ?? "Unknown";
        const bRisk = projectInventoryItem(b).risk ?? "Unknown";
        if (aRisk === "Unknown" && bRisk === "Unknown") return 0;
        if (aRisk === "Unknown") return 1;
        if (bRisk === "Unknown") return -1;
        return order.risk.indexOf(aRisk as never) - order.risk.indexOf(bRisk as never);
      },
    },
    {
      value: "risk-worst",
      compare: (a: InventoryItem, b: InventoryItem) => {
        const aRisk = projectInventoryItem(a).risk ?? "Unknown";
        const bRisk = projectInventoryItem(b).risk ?? "Unknown";
        if (aRisk === "Unknown" && bRisk === "Unknown") return 0;
        if (aRisk === "Unknown") return 1;
        if (bRisk === "Unknown") return -1;
        return order.risk.indexOf(bRisk as never) - order.risk.indexOf(aRisk as never);
      },
    },
    { value: "risk-known-first", compare: (a: InventoryItem, b: InventoryItem) => Number(projectInventoryItem(b).riskKnown) - Number(projectInventoryItem(a).riskKnown) },
    { value: "risk-unknown-first", compare: (a: InventoryItem, b: InventoryItem) => Number(projectInventoryItem(a).riskKnown) - Number(projectInventoryItem(b).riskKnown) },
    { value: "service-due-asc", compare: (a: InventoryItem, b: InventoryItem) => order.serviceDue.indexOf(projectInventoryItem(a).serviceDueLevel as never) - order.serviceDue.indexOf(projectInventoryItem(b).serviceDueLevel as never) },
    { value: "service-due-desc", compare: (a: InventoryItem, b: InventoryItem) => order.serviceDue.indexOf(projectInventoryItem(b).serviceDueLevel as never) - order.serviceDue.indexOf(projectInventoryItem(a).serviceDueLevel as never) },
    { value: "service-cost-asc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(a).serviceCostMin ?? Infinity) - (projectInventoryItem(b).serviceCostMin ?? Infinity) },
    { value: "service-cost-desc", compare: (a: InventoryItem, b: InventoryItem) => (projectInventoryItem(b).serviceCostMin ?? -Infinity) - (projectInventoryItem(a).serviceCostMin ?? -Infinity) },
    { value: "debt-no-first", compare: (a: InventoryItem, b: InventoryItem) => order.debt.indexOf(projectInventoryItem(a).debtStatus as never) - order.debt.indexOf(projectInventoryItem(b).debtStatus as never) },
    { value: "debt-yes-first", compare: (a: InventoryItem, b: InventoryItem) => ["Yes", "No", "Unknown"].indexOf(projectInventoryItem(a).debtStatus) - ["Yes", "No", "Unknown"].indexOf(projectInventoryItem(b).debtStatus) },
    { value: "registry-verified-first", compare: (a: InventoryItem, b: InventoryItem) => Number(projectInventoryItem(b).registryVerified) - Number(projectInventoryItem(a).registryVerified) },
    { value: "registry-unverified-first", compare: (a: InventoryItem, b: InventoryItem) => Number(projectInventoryItem(a).registryVerified) - Number(projectInventoryItem(b).registryVerified) },
    { value: "reg-asc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(a).regNormalized.localeCompare(projectInventoryItem(b).regNormalized) },
    { value: "reg-desc", compare: (a: InventoryItem, b: InventoryItem) => projectInventoryItem(b).regNormalized.localeCompare(projectInventoryItem(a).regNormalized) },
  ];

  const filterCases: Array<{ name: string; filters: InventoryFilters; expectedRegs: string[] }> = [
    { name: "all", filters: {}, expectedRegs: ["AAA111", "BBB222", "CCC333", "DDD444", "EEE555"] },
    { name: "brand", filters: { brand: "Toyota" }, expectedRegs: ["AAA111"] },
    { name: "model", filters: { model: "Jazz" }, expectedRegs: ["BBB222"] },
    { name: "series", filters: { series: "L319" }, expectedRegs: ["EEE555"] },
    { name: "engine", filters: { engine: "1.6 FSI" }, expectedRegs: ["CCC333"] },
    { name: "trim", filters: { trim: "Aero" }, expectedRegs: ["DDD444"] },
    { name: "location", filters: { location: "Stockholm" }, expectedRegs: ["CCC333"] },
    { name: "region", filters: { region: "Dalarnas län" }, expectedRegs: ["EEE555"] },
    { name: "distance", filters: { distance: "100-200 km" }, expectedRegs: ["DDD444"] },
    { name: "search", filters: { search: "tdv6 eee555" }, expectedRegs: ["EEE555"] },
    { name: "maxPrice", filters: { maxPrice: 80000 }, expectedRegs: ["AAA111", "BBB222"] },
    { name: "maxMileage", filters: { maxMileage: 20000 }, expectedRegs: ["AAA111", "CCC333"] },
    { name: "fuel", filters: { fuel: "Diesel" }, expectedRegs: ["CCC333", "EEE555"] },
    { name: "gearbox", filters: { gearbox: "Automat" }, expectedRegs: ["AAA111", "CCC333", "EEE555"] },
    { name: "seller", filters: { seller: "Privat" }, expectedRegs: ["BBB222", "DDD444"] },
    { name: "body", filters: { body: "SUV" }, expectedRegs: ["EEE555"] },
    { name: "risk", filters: { risk: "Avoid" }, expectedRegs: ["DDD444"] },
    { name: "riskStatus", filters: { riskStatus: "unknown" }, expectedRegs: ["CCC333"] },
    { name: "serviceDue", filters: { serviceDue: "Soon" }, expectedRegs: ["AAA111", "EEE555"] },
    { name: "serviceCost", filters: { serviceCost: "10-20k" }, expectedRegs: ["CCC333"] },
    { name: "priceBucket", filters: { priceBucket: "100-200k" }, expectedRegs: ["CCC333", "EEE555"] },
    { name: "mileageBucket", filters: { mileageBucket: ">40k" }, expectedRegs: ["DDD444", "EEE555"] },
    { name: "ageBucket", filters: { ageBucket: "10-20 år" }, expectedRegs: ["CCC333", "EEE555"] },
    { name: "ownersBucket", filters: { ownersBucket: "11+" }, expectedRegs: ["DDD444"] },
    { name: "pricePerMilBucket", filters: { pricePerMilBucket: "<=1,5 kr/mil" }, expectedRegs: ["DDD444"] },
    { name: "debtStatus", filters: { debtStatus: "Yes" }, expectedRegs: ["BBB222", "EEE555"] },
    { name: "registryVerified", filters: { registryVerified: "true" }, expectedRegs: ["AAA111", "CCC333", "EEE555"] },
    { name: "combined", filters: { fuel: "Diesel", seller: "Handlare", riskStatus: "All" }, expectedRegs: ["CCC333", "EEE555"] },
  ];

  const expectedOrder = (rows: InventoryItem[], compare: (a: InventoryItem, b: InventoryItem) => number) =>
    [...rows]
      .sort((a, b) => {
        const result = compare(a, b);
        return result || (a.priceNum - b.priceNum || a.model.localeCompare(b.model));
      })
      .map((item) => item.reg);

  for (const filterCase of filterCases) {
    const expectedFiltered = items.filter((item) => filterCase.expectedRegs.includes(item.reg));
    for (const sortCase of sortCases) {
      const actual = filterAndSortInventory(items, filterCase.filters, [sortCase.value]).map((item) => item.reg);
      const expected = expectedOrder(expectedFiltered, sortCase.compare);
      assert.deepEqual(actual, expected, `${filterCase.name} + ${sortCase.value}`);
    }
  }
});

test("queryInventory derives rows and global filter options from one state", () => {
  const items = [
    makeStructuredItem({
      reg: "AAA111",
      brand: "Toyota",
      modelName: "Prius",
      modelSeries: "XW50",
      engine: "1.8 Hybrid",
      trim: "Active",
      priceNum: 40000,
      mileageMil: 9000,
      yearNum: 2023,
      ownersNum: 1,
      fuel: "Hybrid bensin",
      gearbox: "Automat",
      body: "Halvkombi",
      location: "Uppsala",
      region: "Uppsala län",
      distance: "0-25 km",
      seller: "Handlare",
      risk: "Lower",
      riskKnown: true,
      serviceDue: "Soon",
      serviceCostMin: 3000,
      serviceCostBucket: "0-5k",
      debtStatus: "No",
      registryVerified: true,
      priceBucket: "<=50k",
      mileageBucket: "<=10k",
      ageBucket: "<=5 år",
      ownersBucket: "1",
      pricePerMil: 4.44,
      pricePerMilBucket: "2,5-5 kr/mil",
    }),
    makeStructuredItem({
      reg: "BBB222",
      brand: "Toyota",
      modelName: "Aygo",
      modelSeries: "AB1",
      engine: "1.0",
      trim: "X",
      priceNum: 35000,
      mileageMil: 12000,
      yearNum: 2018,
      ownersNum: 2,
      fuel: "Bensin",
      gearbox: "Manuell",
      body: "Halvkombi",
      location: "Enköping",
      region: "Uppsala län",
      distance: "25-50 km",
      seller: "Privat",
      risk: null,
      riskKnown: false,
      serviceDue: "Now",
      serviceCostMin: 6000,
      serviceCostBucket: "5-10k",
      debtStatus: "Unknown",
      registryVerified: false,
      priceBucket: "<=50k",
      mileageBucket: "10-20k",
      ageBucket: "5-10 år",
      ownersBucket: "2",
      pricePerMil: 2.91,
      pricePerMilBucket: "2,5-5 kr/mil",
    }),
    makeStructuredItem({
      reg: "CCC333",
      brand: "Honda",
      modelName: "Jazz",
      modelSeries: "GE",
      engine: "1.4",
      trim: "Comfort",
      priceNum: 38000,
      mileageMil: 15000,
      yearNum: 2016,
      ownersNum: 3,
      fuel: "Bensin",
      gearbox: "Automat",
      body: "Halvkombi",
      location: "Västerås",
      region: "Västmanlands län",
      distance: "50-100 km",
      seller: "Privat",
      risk: "Medium",
      riskKnown: true,
      serviceDue: "Later",
      serviceCostMin: 4000,
      serviceCostBucket: "0-5k",
      debtStatus: "Yes",
      registryVerified: true,
      priceBucket: "<=50k",
      mileageBucket: "10-20k",
      ageBucket: "5-10 år",
      ownersBucket: "3",
      pricePerMil: 2.53,
      pricePerMilBucket: "2,5-5 kr/mil",
    }),
  ];

  const result = queryInventory(
    items,
    {
      brand: "Toyota",
      riskStatus: "All",
      gearbox: "Automat",
    },
    ["price-asc"],
  );

  assert.deepEqual(result.rows.map((item) => item.reg), ["AAA111"]);
  assert.deepEqual(result.options.model.map((option) => [option.value, option.count]), [["Prius", 1]]);
  assert.deepEqual(result.options.brand.map((option) => [option.value, option.count]), [
    ["Honda", 1],
    ["Toyota", 1],
  ]);
  assert.deepEqual(result.options.riskStatus.map((option) => [option.value, option.count]), [["known", 1]]);
  assert.deepEqual(result.options.location.map((option) => [option.value, option.count]), [["Uppsala", 1]]);
});

test("generated data exposes an explicit no-sort option", () => {
  const testDir = path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(testDir, "..", "..");
  const dataPath = path.join(repoRoot, "processed-data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf8")) as {
    filters?: { sortOptions?: Array<{ value?: string; label?: string }> };
  };

  assert.deepEqual(data.filters?.sortOptions?.[0], { value: "none", label: "Ingen sortering" });
});
