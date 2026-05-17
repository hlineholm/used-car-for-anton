// src/core.ts
var MULTI_WORD_BRANDS = [
  "Alfa Romeo",
  "Land Rover"
];
var PRICE_BUCKETS = [
  { max: 5e4, label: "<=50k" },
  { max: 1e5, label: "50-100k" },
  { max: 2e5, label: "100-200k" },
  { max: Number.POSITIVE_INFINITY, label: ">200k" }
];
var MILEAGE_BUCKETS = [
  { max: 1e4, label: "<=10k" },
  { max: 2e4, label: "10-20k" },
  { max: 4e4, label: "20-40k" },
  { max: Number.POSITIVE_INFINITY, label: ">40k" }
];
var AGE_BUCKETS = [
  { max: 5, label: "<=5 \xE5r" },
  { max: 10, label: "5-10 \xE5r" },
  { max: 20, label: "10-20 \xE5r" },
  { max: Number.POSITIVE_INFINITY, label: ">20 \xE5r" }
];
var OWNERS_BUCKETS = [
  { max: 1, label: "1" },
  { max: 2, label: "2" },
  { max: 3, label: "3" },
  { max: 4, label: "4" },
  { max: 5, label: "5" },
  { max: 7, label: "6-7" },
  { max: 10, label: "8-10" },
  { max: Number.POSITIVE_INFINITY, label: "11+" }
];
var PRICE_PER_MIL_BUCKETS = [
  { max: 1.5, label: "<=1,5 kr/mil" },
  { max: 2.5, label: "1,5-2,5 kr/mil" },
  { max: 5, label: "2,5-5 kr/mil" },
  { max: Number.POSITIVE_INFINITY, label: ">5 kr/mil" }
];
var DISTANCE_BUCKET_ORDER = ["0-25 km", "25-50 km", "50-100 km", "100-200 km", "200+ km", "Ok\xE4nt"];
var OWNERS_BUCKET_ORDER = ["1", "2", "3", "4", "5", "6-7", "8-10", "11+", "Ok\xE4nt"];
var DEBT_STATUS_ORDER = ["No", "Yes", "Unknown"];
var collator = new Intl.Collator("sv", { sensitivity: "base" });
var INVENTORY_SELECT_FILTER_KEYS = [
  "brand",
  "model",
  "series",
  "engine",
  "trim",
  "location",
  "region",
  "distance",
  "fuel",
  "gearbox",
  "seller",
  "body",
  "risk",
  "riskStatus",
  "serviceDue",
  "serviceCost",
  "priceBucket",
  "mileageBucket",
  "ageBucket",
  "ownersBucket",
  "pricePerMilBucket",
  "debtStatus",
  "registryVerified"
];
function bucketLabel(value, ranges, unknownLabel = "Ok\xE4nt") {
  if (value == null || !Number.isFinite(value)) return unknownLabel;
  for (const range of ranges) {
    if (value <= range.max) return range.label;
  }
  return unknownLabel;
}
function orderIndex(value, order) {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}
function compareOrderedValues(aValue, bValue, order, descending = false) {
  const aIndex = orderIndex(aValue, order);
  const bIndex = orderIndex(bValue, order);
  return descending ? bIndex - aIndex : aIndex - bIndex;
}
function compareNullableNumbers(aValue, bValue, descending = false) {
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;
  return descending ? bValue - aValue : aValue - bValue;
}
function compareProjectedText(aValue, bValue, descending = false) {
  return descending ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
}
function parseBucketNumber(value) {
  const normalizedValue = String(value);
  const matches2 = normalizedValue.match(/\d+(?:[ .,\u00a0]\d+)*/g);
  if (!matches2?.length) return Number.POSITIVE_INFINITY;
  const token = normalizedValue.includes("-") && matches2.length > 1 ? matches2[matches2.length - 1] : matches2[0];
  const normalized = token.replace(/[ .\u00a0]/g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.POSITIVE_INFINITY;
  return normalizedValue.trim().startsWith(">") ? parsed + 1 : parsed;
}
function compareDynamicBucketValues(aValue, bValue, descending = false) {
  const a = String(aValue || "Ok\xE4nt");
  const b = String(bValue || "Ok\xE4nt");
  if (a === "Ok\xE4nt" && b === "Ok\xE4nt") return 0;
  if (a === "Ok\xE4nt") return 1;
  if (b === "Ok\xE4nt") return -1;
  const result = parseBucketNumber(a) - parseBucketNumber(b);
  return descending ? -result : result;
}
function getInventoryFilterValue(projected, key) {
  switch (key) {
    case "brand":
      return projected.brand;
    case "model":
      return projected.modelName;
    case "series":
      return projected.modelSeries;
    case "engine":
      return projected.engine;
    case "trim":
      return projected.trim;
    case "location":
      return projected.location;
    case "region":
      return projected.region;
    case "distance":
      return projected.distanceBucketFromUppsala;
    case "fuel":
      return projected.fuel;
    case "gearbox":
      return projected.gearboxDriveability;
    case "seller":
      return projected.sellerType;
    case "body":
      return projected.bodyType;
    case "risk":
      return projected.risk ?? "Unknown";
    case "riskStatus":
      return projected.riskKnown ? "known" : "unknown";
    case "serviceDue":
      return projected.serviceDueLevel;
    case "serviceCost":
      return projected.serviceCostBucket;
    case "priceBucket":
      return projected.priceBucket;
    case "mileageBucket":
      return projected.mileageBucket;
    case "ageBucket":
      return projected.ageBucket;
    case "ownersBucket":
      return projected.ownersBucket;
    case "pricePerMilBucket":
      return projected.pricePerMilBucket;
    case "debtStatus":
      return projected.debtStatus;
    case "registryVerified":
      return String(projected.registryVerified);
  }
}
function compareFilterOptionValues(key, aValue, bValue) {
  switch (key) {
    case "distance":
      return compareOrderedValues(aValue, bValue, DISTANCE_BUCKET_ORDER);
    case "risk":
      return compareOrderedValues(aValue, bValue, ["Lower", "Medium", "Higher", "Avoid", "Unknown"]);
    case "riskStatus":
      return compareOrderedValues(aValue, bValue, ["known", "unknown"]);
    case "serviceDue":
      return compareOrderedValues(aValue, bValue, ["Now", "Soon", "Later", "Unknown"]);
    case "debtStatus":
      return compareOrderedValues(aValue, bValue, DEBT_STATUS_ORDER);
    case "registryVerified":
      return compareOrderedValues(aValue, bValue, ["true", "false"]);
    case "ownersBucket":
      return compareOrderedValues(aValue, bValue, OWNERS_BUCKET_ORDER);
    case "priceBucket":
    case "mileageBucket":
    case "ageBucket":
    case "pricePerMilBucket":
      return compareDynamicBucketValues(aValue, bValue);
    default:
      return collator.compare(aValue, bValue);
  }
}
function pricePerMilBucket(value) {
  return bucketLabel(value, PRICE_PER_MIL_BUCKETS);
}
function projectInventoryItem(item) {
  const fallbackSplit = item.brand && item.modelName ? { brand: item.brand, modelName: item.modelName } : parseBrandModel(item.model);
  const brand = item.canonical?.brand ?? fallbackSplit.brand;
  const modelName = item.canonical?.modelName ?? fallbackSplit.modelName;
  const priceNum = item.canonical?.priceNum ?? (Number.isFinite(item.priceNum) ? item.priceNum : null);
  const mileageMil = item.canonical?.mileageMil ?? (Number.isFinite(item.mileageMil) ? item.mileageMil : null);
  const yearNum = item.canonical?.yearNum ?? (Number.isFinite(item.yearNum) ? item.yearNum : null);
  const ownersNum = item.canonical?.ownersNum ?? (typeof item.ownersNum === "number" && Number.isFinite(item.ownersNum) ? item.ownersNum : null);
  const age = item.derived?.age ?? (yearNum == null ? null : (/* @__PURE__ */ new Date()).getFullYear() - yearNum);
  const pricePerMil = item.derived?.pricePerMil ?? (priceNum == null || mileageMil == null || mileageMil <= 0 ? null : Math.round(priceNum / mileageMil * 100) / 100);
  const risk = item.canonical?.risk ?? (item.risk === "Unrated" || item.risk === "Unknown" ? null : item.risk || null);
  return {
    brand,
    modelName,
    modelSeries: item.canonical?.modelSeries ?? "Ok\xE4nt",
    engine: item.canonical?.engine ?? "Ok\xE4nt",
    trim: item.canonical?.trim ?? item.trim ?? "Ok\xE4nt",
    priceNum,
    mileageMil,
    yearNum,
    age,
    fuel: item.canonical?.fuel ?? item.fuel,
    gearboxDriveability: item.canonical?.gearboxDriveability ?? item.gearbox,
    gearboxDetail: item.canonical?.gearboxDetail ?? "Ok\xE4nt",
    bodyType: item.canonical?.bodyType ?? item.body,
    location: item.canonical?.location ?? item.location,
    region: item.canonical?.region ?? "Ok\xE4nt l\xE4n",
    distanceBucketFromUppsala: item.canonical?.distanceBucketFromUppsala ?? "Ok\xE4nt",
    sellerType: item.canonical?.sellerType ?? item.seller,
    ownersNum,
    risk,
    riskKnown: item.canonical?.riskKnown ?? (item.risk !== "Unrated" && item.risk !== "Unknown"),
    serviceDueLevel: item.canonical?.serviceDueLevel ?? "Unknown",
    serviceCostMin: item.canonical?.serviceCostMin ?? null,
    serviceCostBucket: item.canonical?.serviceCostBucket ?? "Ok\xE4nt",
    regNormalized: item.canonical?.regNormalized ?? item.reg ?? "Ok\xE4nt",
    debtStatus: item.canonical?.debtStatus ?? "Unknown",
    registryVerified: item.canonical?.registryVerified ?? false,
    priceBucket: item.derived?.priceBucket ?? bucketLabel(priceNum, PRICE_BUCKETS),
    mileageBucket: item.derived?.mileageBucket ?? bucketLabel(mileageMil, MILEAGE_BUCKETS),
    ageBucket: item.derived?.ageBucket ?? bucketLabel(age, AGE_BUCKETS),
    ownersBucket: item.derived?.ownersBucket ?? bucketLabel(ownersNum, OWNERS_BUCKETS),
    pricePerMil,
    pricePerMilBucket: item.derived?.pricePerMilBucket ?? pricePerMilBucket(pricePerMil)
  };
}
function normalizeText(value) {
  return String(value ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function parseSearchQuery(query) {
  return normalizeText(query).split("|").map((group) => group.trim()).filter(Boolean).map((group) => group.split(/\s+/).filter(Boolean));
}
function parseOptionalNumber(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}
function parseBrandModel(modelValue) {
  const clean = String(modelValue ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return { brand: "Ok\xE4nd", modelName: "Ok\xE4nd" };
  const normalized = normalizeText(clean);
  for (const multiWordBrand of MULTI_WORD_BRANDS) {
    const normalizedBrand = normalizeText(multiWordBrand);
    if (normalized === normalizedBrand || normalized.startsWith(`${normalizedBrand} `)) {
      const modelName = clean.slice(multiWordBrand.length).trim();
      return {
        brand: multiWordBrand,
        modelName: modelName || clean
      };
    }
  }
  const [brand, ...rest] = clean.split(/\s+/);
  return {
    brand,
    modelName: rest.length ? rest.join(" ") : clean
  };
}
function matchesSearch(item, tokenGroups) {
  if (!tokenGroups.length) return true;
  if (item.searchableText) {
    const haystack2 = normalizeText(item.searchableText);
    return tokenGroups.some((tokens) => tokens.every((token) => haystack2.includes(token)));
  }
  const haystack = [
    item.model,
    item.trim,
    item.location,
    item.fuel,
    item.gearbox,
    item.seller,
    item.body,
    item.reg,
    item.risk,
    item.riskNote,
    item.serviceDue,
    item.serviceCost,
    item.forumWatchouts
  ].map(normalizeText).join(" ");
  return tokenGroups.some((tokens) => tokens.every((token) => haystack.includes(token)));
}
function riskRank(risk) {
  switch (String(risk || "").toLowerCase()) {
    case "lower":
      return 0;
    case "medium":
      return 1;
    case "higher":
      return 2;
    case "avoid":
      return 3;
    default:
      return null;
  }
}
function compareRisk(a, b, descending = false) {
  const aRank = riskRank(a.canonical?.risk ?? a.risk);
  const bRank = riskRank(b.canonical?.risk ?? b.risk);
  if (aRank === null && bRank === null) return 0;
  if (aRank === null) return 1;
  if (bRank === null) return -1;
  return descending ? bRank - aRank : aRank - bRank;
}
function serviceDueRank(value) {
  switch (String(value || "").toLowerCase()) {
    case "now":
      return 0;
    case "soon":
      return 1;
    case "later":
      return 2;
    default:
      return 99;
  }
}
function dedupeSortValues(values) {
  const deduped = [];
  const seen = /* @__PURE__ */ new Set();
  for (const value of values) {
    if (!value || value === "none" || seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
}
function compareField(a, b, sortValue) {
  const projectedA = projectInventoryItem(a);
  const projectedB = projectInventoryItem(b);
  switch (sortValue) {
    case "price-desc":
      return compareNullableNumbers(projectedA.priceNum, projectedB.priceNum, true);
    case "mileage-asc":
      return compareNullableNumbers(projectedA.mileageMil, projectedB.mileageMil);
    case "mileage-desc":
      return compareNullableNumbers(projectedA.mileageMil, projectedB.mileageMil, true);
    case "year-desc":
      return compareNullableNumbers(projectedA.yearNum, projectedB.yearNum, true);
    case "year-asc":
      return compareNullableNumbers(projectedA.yearNum, projectedB.yearNum);
    case "age-asc":
      return compareNullableNumbers(projectedA.age, projectedB.age);
    case "age-desc":
      return compareNullableNumbers(projectedA.age, projectedB.age, true);
    case "owners-asc":
      return compareNullableNumbers(projectedA.ownersNum, projectedB.ownersNum);
    case "owners-desc":
      return compareNullableNumbers(projectedA.ownersNum, projectedB.ownersNum, true);
    case "price-per-mil-asc":
      return compareNullableNumbers(projectedA.pricePerMil, projectedB.pricePerMil);
    case "price-per-mil-desc":
      return compareNullableNumbers(projectedA.pricePerMil, projectedB.pricePerMil, true);
    case "model-asc":
      return compareProjectedText(a.model, b.model);
    case "model-desc":
      return compareProjectedText(a.model, b.model, true);
    case "brand-asc":
      return compareProjectedText(projectedA.brand, projectedB.brand);
    case "brand-desc":
      return compareProjectedText(projectedA.brand, projectedB.brand, true);
    case "series-asc":
      return compareProjectedText(projectedA.modelSeries, projectedB.modelSeries);
    case "series-desc":
      return compareProjectedText(projectedA.modelSeries, projectedB.modelSeries, true);
    case "engine-asc":
      return compareProjectedText(projectedA.engine, projectedB.engine);
    case "engine-desc":
      return compareProjectedText(projectedA.engine, projectedB.engine, true);
    case "trim-asc":
      return compareProjectedText(a.trim, b.trim);
    case "trim-desc":
      return compareProjectedText(a.trim, b.trim, true);
    case "location-asc":
      return compareProjectedText(projectedA.location, projectedB.location);
    case "location-desc":
      return compareProjectedText(projectedA.location, projectedB.location, true);
    case "region-asc":
      return compareProjectedText(projectedA.region, projectedB.region);
    case "region-desc":
      return compareProjectedText(projectedA.region, projectedB.region, true);
    case "distance-asc":
      return compareOrderedValues(projectedA.distanceBucketFromUppsala, projectedB.distanceBucketFromUppsala, DISTANCE_BUCKET_ORDER);
    case "distance-desc":
      return compareOrderedValues(
        projectedA.distanceBucketFromUppsala,
        projectedB.distanceBucketFromUppsala,
        DISTANCE_BUCKET_ORDER,
        true
      );
    case "fuel-asc":
      return compareProjectedText(projectedA.fuel, projectedB.fuel);
    case "fuel-desc":
      return compareProjectedText(projectedA.fuel, projectedB.fuel, true);
    case "gearbox-asc":
      return compareProjectedText(projectedA.gearboxDriveability, projectedB.gearboxDriveability);
    case "gearbox-desc":
      return compareProjectedText(projectedA.gearboxDriveability, projectedB.gearboxDriveability, true);
    case "seller-asc":
      return compareProjectedText(projectedA.sellerType, projectedB.sellerType);
    case "seller-desc":
      return compareProjectedText(projectedA.sellerType, projectedB.sellerType, true);
    case "body-asc":
      return compareProjectedText(projectedA.bodyType, projectedB.bodyType);
    case "body-desc":
      return compareProjectedText(projectedA.bodyType, projectedB.bodyType, true);
    case "risk-asc":
    case "risk-best":
      return compareRisk(a, b, false);
    case "risk-desc":
    case "risk-worst":
      return compareRisk(a, b, true);
    case "risk-known-first":
      return Number(projectedB.riskKnown) - Number(projectedA.riskKnown);
    case "risk-unknown-first":
      return Number(projectedA.riskKnown) - Number(projectedB.riskKnown);
    case "service-due-asc":
      return serviceDueRank(projectedA.serviceDueLevel) - serviceDueRank(projectedB.serviceDueLevel);
    case "service-due-desc":
      return serviceDueRank(projectedB.serviceDueLevel) - serviceDueRank(projectedA.serviceDueLevel);
    case "service-cost-asc":
      return compareNullableNumbers(projectedA.serviceCostMin, projectedB.serviceCostMin);
    case "service-cost-desc":
      return compareNullableNumbers(projectedA.serviceCostMin, projectedB.serviceCostMin, true);
    case "price-bucket-asc":
      return compareDynamicBucketValues(projectedA.priceBucket, projectedB.priceBucket);
    case "price-bucket-desc":
      return compareDynamicBucketValues(projectedA.priceBucket, projectedB.priceBucket, true);
    case "mileage-bucket-asc":
      return compareDynamicBucketValues(projectedA.mileageBucket, projectedB.mileageBucket);
    case "mileage-bucket-desc":
      return compareDynamicBucketValues(projectedA.mileageBucket, projectedB.mileageBucket, true);
    case "age-bucket-asc":
      return compareDynamicBucketValues(projectedA.ageBucket, projectedB.ageBucket);
    case "age-bucket-desc":
      return compareDynamicBucketValues(projectedA.ageBucket, projectedB.ageBucket, true);
    case "owners-bucket-asc":
      return compareOrderedValues(projectedA.ownersBucket, projectedB.ownersBucket, OWNERS_BUCKET_ORDER);
    case "owners-bucket-desc":
      return compareOrderedValues(projectedA.ownersBucket, projectedB.ownersBucket, OWNERS_BUCKET_ORDER, true);
    case "price-per-mil-bucket-asc":
      return compareDynamicBucketValues(projectedA.pricePerMilBucket, projectedB.pricePerMilBucket);
    case "price-per-mil-bucket-desc":
      return compareDynamicBucketValues(projectedA.pricePerMilBucket, projectedB.pricePerMilBucket, true);
    case "debt-no-first":
      return compareOrderedValues(projectedA.debtStatus, projectedB.debtStatus, DEBT_STATUS_ORDER);
    case "debt-yes-first":
      return compareOrderedValues(projectedA.debtStatus, projectedB.debtStatus, ["Yes", "No", "Unknown"], false);
    case "registry-verified-first":
      return Number(projectedB.registryVerified) - Number(projectedA.registryVerified);
    case "registry-unverified-first":
      return Number(projectedA.registryVerified) - Number(projectedB.registryVerified);
    case "reg-asc":
      return compareProjectedText(projectedA.regNormalized, projectedB.regNormalized);
    case "reg-desc":
      return compareProjectedText(projectedA.regNormalized, projectedB.regNormalized, true);
    case "price-asc":
      return compareNullableNumbers(projectedA.priceNum, projectedB.priceNum);
    case "none":
    default:
      return 0;
  }
}
function compareItems(a, b, sortValues) {
  for (const sortValue of sortValues) {
    const result = compareField(a, b, sortValue);
    if (Number.isFinite(result) && result !== 0) return result;
  }
  return a.priceNum - b.priceNum || a.model.localeCompare(b.model);
}
function matchesSelectFilter(selected, actual) {
  return !selected || selected === "All" || actual === selected;
}
function matchesInventoryFilters(item, filters, excludedKey) {
  const projected = projectInventoryItem(item);
  const tokenGroups = parseSearchQuery(filters.search ?? "");
  const riskStatus = filters.riskStatus ?? "All";
  const registryVerified = filters.registryVerified ?? "All";
  return (excludedKey === "brand" || matchesSelectFilter(filters.brand, projected.brand)) && (excludedKey === "model" || matchesSelectFilter(filters.model, projected.modelName)) && (excludedKey === "series" || matchesSelectFilter(filters.series, projected.modelSeries)) && (excludedKey === "engine" || matchesSelectFilter(filters.engine, projected.engine)) && (excludedKey === "trim" || matchesSelectFilter(filters.trim, projected.trim)) && (excludedKey === "location" || matchesSelectFilter(filters.location, projected.location)) && (excludedKey === "region" || matchesSelectFilter(filters.region, projected.region)) && (excludedKey === "distance" || matchesSelectFilter(filters.distance, projected.distanceBucketFromUppsala)) && matchesSearch(item, tokenGroups) && (filters.maxPrice == null || projected.priceNum != null && projected.priceNum <= filters.maxPrice) && (filters.maxMileage == null || projected.mileageMil != null && projected.mileageMil <= filters.maxMileage) && (excludedKey === "fuel" || matchesSelectFilter(filters.fuel, projected.fuel)) && (excludedKey === "gearbox" || matchesSelectFilter(filters.gearbox, projected.gearboxDriveability)) && (excludedKey === "seller" || matchesSelectFilter(filters.seller, projected.sellerType)) && (excludedKey === "body" || matchesSelectFilter(filters.body, projected.bodyType)) && (excludedKey === "risk" || matchesSelectFilter(filters.risk, projected.risk ?? "Unknown")) && (excludedKey === "riskStatus" || riskStatus === "All" || riskStatus === "known" && projected.riskKnown || riskStatus === "unknown" && !projected.riskKnown) && (excludedKey === "serviceDue" || matchesSelectFilter(filters.serviceDue, projected.serviceDueLevel)) && (excludedKey === "serviceCost" || matchesSelectFilter(filters.serviceCost, projected.serviceCostBucket)) && (excludedKey === "priceBucket" || matchesSelectFilter(filters.priceBucket, projected.priceBucket)) && (excludedKey === "mileageBucket" || matchesSelectFilter(filters.mileageBucket, projected.mileageBucket)) && (excludedKey === "ageBucket" || matchesSelectFilter(filters.ageBucket, projected.ageBucket)) && (excludedKey === "ownersBucket" || matchesSelectFilter(filters.ownersBucket, projected.ownersBucket)) && (excludedKey === "pricePerMilBucket" || matchesSelectFilter(filters.pricePerMilBucket, projected.pricePerMilBucket)) && (excludedKey === "debtStatus" || matchesSelectFilter(filters.debtStatus, projected.debtStatus)) && (excludedKey === "registryVerified" || registryVerified === "All" || registryVerified === "true" && projected.registryVerified || registryVerified === "false" && !projected.registryVerified);
}
function filterAndSortInventory(items, filters, sortValues) {
  return items.filter((item) => matchesInventoryFilters(item, filters)).sort((a, b) => compareItems(a, b, sortValues));
}
function buildInventoryFilterOptions(items, filters) {
  const options = {};
  for (const key of INVENTORY_SELECT_FILTER_KEYS) {
    const counts = /* @__PURE__ */ new Map();
    for (const item of items) {
      if (!matchesInventoryFilters(item, filters, key)) continue;
      const value = getInventoryFilterValue(projectInventoryItem(item), key);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const selectedValue = filters[key];
    if (selectedValue && selectedValue !== "All" && !counts.has(selectedValue)) {
      counts.set(selectedValue, 0);
    }
    options[key] = [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => compareFilterOptionValues(key, a.value, b.value));
  }
  return options;
}
function queryInventory(items, filters, sortValues) {
  const rows = filterAndSortInventory(items, filters, sortValues);
  return {
    rows,
    totalCount: items.length,
    filteredCount: rows.length,
    options: buildInventoryFilterOptions(items, filters)
  };
}

// node_modules/redux/dist/redux.mjs
var $$observable = /* @__PURE__ */ (() => typeof Symbol === "function" && Symbol.observable || "@@observable")();
var symbol_observable_default = $$observable;
var randomString = () => Math.random().toString(36).substring(7).split("").join(".");
var ActionTypes = {
  INIT: `@@redux/INIT${/* @__PURE__ */ randomString()}`,
  REPLACE: `@@redux/REPLACE${/* @__PURE__ */ randomString()}`,
  PROBE_UNKNOWN_ACTION: () => `@@redux/PROBE_UNKNOWN_ACTION${randomString()}`
};
var actionTypes_default = ActionTypes;
function isPlainObject(obj) {
  if (typeof obj !== "object" || obj === null)
    return false;
  let proto = obj;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }
  return Object.getPrototypeOf(obj) === proto || Object.getPrototypeOf(obj) === null;
}
function miniKindOf(val) {
  if (val === void 0)
    return "undefined";
  if (val === null)
    return "null";
  const type = typeof val;
  switch (type) {
    case "boolean":
    case "string":
    case "number":
    case "symbol":
    case "function": {
      return type;
    }
  }
  if (Array.isArray(val))
    return "array";
  if (isDate(val))
    return "date";
  if (isError(val))
    return "error";
  const constructorName = ctorName(val);
  switch (constructorName) {
    case "Symbol":
    case "Promise":
    case "WeakMap":
    case "WeakSet":
    case "Map":
    case "Set":
      return constructorName;
  }
  return Object.prototype.toString.call(val).slice(8, -1).toLowerCase().replace(/\s/g, "");
}
function ctorName(val) {
  return typeof val.constructor === "function" ? val.constructor.name : null;
}
function isError(val) {
  return val instanceof Error || typeof val.message === "string" && val.constructor && typeof val.constructor.stackTraceLimit === "number";
}
function isDate(val) {
  if (val instanceof Date)
    return true;
  return typeof val.toDateString === "function" && typeof val.getDate === "function" && typeof val.setDate === "function";
}
function kindOf(val) {
  let typeOfVal = typeof val;
  if (true) {
    typeOfVal = miniKindOf(val);
  }
  return typeOfVal;
}
function createStore(reducer2, preloadedState, enhancer) {
  if (typeof reducer2 !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : `Expected the root reducer to be a function. Instead, received: '${kindOf(reducer2)}'`);
  }
  if (typeof preloadedState === "function" && typeof enhancer === "function" || typeof enhancer === "function" && typeof arguments[3] === "function") {
    throw new Error(false ? formatProdErrorMessage(0) : "It looks like you are passing several store enhancers to createStore(). This is not supported. Instead, compose them together to a single function. See https://redux.js.org/tutorials/fundamentals/part-4-store#creating-a-store-with-enhancers for an example.");
  }
  if (typeof preloadedState === "function" && typeof enhancer === "undefined") {
    enhancer = preloadedState;
    preloadedState = void 0;
  }
  if (typeof enhancer !== "undefined") {
    if (typeof enhancer !== "function") {
      throw new Error(false ? formatProdErrorMessage(1) : `Expected the enhancer to be a function. Instead, received: '${kindOf(enhancer)}'`);
    }
    return enhancer(createStore)(reducer2, preloadedState);
  }
  let currentReducer = reducer2;
  let currentState = preloadedState;
  let currentListeners = /* @__PURE__ */ new Map();
  let nextListeners = currentListeners;
  let listenerIdCounter = 0;
  let isDispatching = false;
  function ensureCanMutateNextListeners() {
    if (nextListeners === currentListeners) {
      nextListeners = /* @__PURE__ */ new Map();
      currentListeners.forEach((listener2, key) => {
        nextListeners.set(key, listener2);
      });
    }
  }
  function getState() {
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(3) : "You may not call store.getState() while the reducer is executing. The reducer has already received the state as an argument. Pass it down from the top reducer instead of reading it from the store.");
    }
    return currentState;
  }
  function subscribe(listener2) {
    if (typeof listener2 !== "function") {
      throw new Error(false ? formatProdErrorMessage(4) : `Expected the listener to be a function. Instead, received: '${kindOf(listener2)}'`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(5) : "You may not call store.subscribe() while the reducer is executing. If you would like to be notified after the store has been updated, subscribe from a component and invoke store.getState() in the callback to access the latest state. See https://redux.js.org/api/store#subscribelistener for more details.");
    }
    let isSubscribed = true;
    ensureCanMutateNextListeners();
    const listenerId = listenerIdCounter++;
    nextListeners.set(listenerId, listener2);
    return function unsubscribe() {
      if (!isSubscribed) {
        return;
      }
      if (isDispatching) {
        throw new Error(false ? formatProdErrorMessage(6) : "You may not unsubscribe from a store listener while the reducer is executing. See https://redux.js.org/api/store#subscribelistener for more details.");
      }
      isSubscribed = false;
      ensureCanMutateNextListeners();
      nextListeners.delete(listenerId);
      currentListeners = null;
    };
  }
  function dispatch(action) {
    if (!isPlainObject(action)) {
      throw new Error(false ? formatProdErrorMessage(7) : `Actions must be plain objects. Instead, the actual type was: '${kindOf(action)}'. You may need to add middleware to your store setup to handle dispatching other values, such as 'redux-thunk' to handle dispatching functions. See https://redux.js.org/tutorials/fundamentals/part-4-store#middleware and https://redux.js.org/tutorials/fundamentals/part-6-async-logic#using-the-redux-thunk-middleware for examples.`);
    }
    if (typeof action.type === "undefined") {
      throw new Error(false ? formatProdErrorMessage(8) : 'Actions may not have an undefined "type" property. You may have misspelled an action type string constant.');
    }
    if (typeof action.type !== "string") {
      throw new Error(false ? formatProdErrorMessage(17) : `Action "type" property must be a string. Instead, the actual type was: '${kindOf(action.type)}'. Value was: '${action.type}' (stringified)`);
    }
    if (isDispatching) {
      throw new Error(false ? formatProdErrorMessage(9) : "Reducers may not dispatch actions.");
    }
    try {
      isDispatching = true;
      currentState = currentReducer(currentState, action);
    } finally {
      isDispatching = false;
    }
    const listeners = currentListeners = nextListeners;
    listeners.forEach((listener2) => {
      listener2();
    });
    return action;
  }
  function replaceReducer(nextReducer) {
    if (typeof nextReducer !== "function") {
      throw new Error(false ? formatProdErrorMessage(10) : `Expected the nextReducer to be a function. Instead, received: '${kindOf(nextReducer)}`);
    }
    currentReducer = nextReducer;
    dispatch({
      type: actionTypes_default.REPLACE
    });
  }
  function observable() {
    const outerSubscribe = subscribe;
    return {
      /**
       * The minimal observable subscription method.
       * @param observer Any object that can be used as an observer.
       * The observer object should have a `next` method.
       * @returns An object with an `unsubscribe` method that can
       * be used to unsubscribe the observable from the store, and prevent further
       * emission of values from the observable.
       */
      subscribe(observer) {
        if (typeof observer !== "object" || observer === null) {
          throw new Error(false ? formatProdErrorMessage(11) : `Expected the observer to be an object. Instead, received: '${kindOf(observer)}'`);
        }
        function observeState() {
          const observerAsObserver = observer;
          if (observerAsObserver.next) {
            observerAsObserver.next(getState());
          }
        }
        observeState();
        const unsubscribe = outerSubscribe(observeState);
        return {
          unsubscribe
        };
      },
      [symbol_observable_default]() {
        return this;
      }
    };
  }
  dispatch({
    type: actionTypes_default.INIT
  });
  const store = {
    dispatch,
    subscribe,
    getState,
    replaceReducer,
    [symbol_observable_default]: observable
  };
  return store;
}
function warning(message) {
  if (typeof console !== "undefined" && typeof console.error === "function") {
    console.error(message);
  }
  try {
    throw new Error(message);
  } catch (e) {
  }
}
function getUnexpectedStateShapeWarningMessage(inputState, reducers, action, unexpectedKeyCache) {
  const reducerKeys = Object.keys(reducers);
  const argumentName = action && action.type === actionTypes_default.INIT ? "preloadedState argument passed to createStore" : "previous state received by the reducer";
  if (reducerKeys.length === 0) {
    return "Store does not have a valid reducer. Make sure the argument passed to combineReducers is an object whose values are reducers.";
  }
  if (!isPlainObject(inputState)) {
    return `The ${argumentName} has unexpected type of "${kindOf(inputState)}". Expected argument to be an object with the following keys: "${reducerKeys.join('", "')}"`;
  }
  const unexpectedKeys = Object.keys(inputState).filter((key) => !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]);
  unexpectedKeys.forEach((key) => {
    unexpectedKeyCache[key] = true;
  });
  if (action && action.type === actionTypes_default.REPLACE)
    return;
  if (unexpectedKeys.length > 0) {
    return `Unexpected ${unexpectedKeys.length > 1 ? "keys" : "key"} "${unexpectedKeys.join('", "')}" found in ${argumentName}. Expected to find one of the known reducer keys instead: "${reducerKeys.join('", "')}". Unexpected keys will be ignored.`;
  }
}
function assertReducerShape(reducers) {
  Object.keys(reducers).forEach((key) => {
    const reducer2 = reducers[key];
    const initialState = reducer2(void 0, {
      type: actionTypes_default.INIT
    });
    if (typeof initialState === "undefined") {
      throw new Error(false ? formatProdErrorMessage(12) : `The slice reducer for key "${key}" returned undefined during initialization. If the state passed to the reducer is undefined, you must explicitly return the initial state. The initial state may not be undefined. If you don't want to set a value for this reducer, you can use null instead of undefined.`);
    }
    if (typeof reducer2(void 0, {
      type: actionTypes_default.PROBE_UNKNOWN_ACTION()
    }) === "undefined") {
      throw new Error(false ? formatProdErrorMessage(13) : `The slice reducer for key "${key}" returned undefined when probed with a random type. Don't try to handle '${actionTypes_default.INIT}' or other actions in "redux/*" namespace. They are considered private. Instead, you must return the current state for any unknown actions, unless it is undefined, in which case you must return the initial state, regardless of the action type. The initial state may not be undefined, but can be null.`);
    }
  });
}
function combineReducers(reducers) {
  const reducerKeys = Object.keys(reducers);
  const finalReducers = {};
  for (let i = 0; i < reducerKeys.length; i++) {
    const key = reducerKeys[i];
    if (true) {
      if (typeof reducers[key] === "undefined") {
        warning(`No reducer provided for key "${key}"`);
      }
    }
    if (typeof reducers[key] === "function") {
      finalReducers[key] = reducers[key];
    }
  }
  const finalReducerKeys = Object.keys(finalReducers);
  let unexpectedKeyCache;
  if (true) {
    unexpectedKeyCache = {};
  }
  let shapeAssertionError;
  try {
    assertReducerShape(finalReducers);
  } catch (e) {
    shapeAssertionError = e;
  }
  return function combination(state = {}, action) {
    if (shapeAssertionError) {
      throw shapeAssertionError;
    }
    if (true) {
      const warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache);
      if (warningMessage) {
        warning(warningMessage);
      }
    }
    let hasChanged = false;
    const nextState = {};
    for (let i = 0; i < finalReducerKeys.length; i++) {
      const key = finalReducerKeys[i];
      const reducer2 = finalReducers[key];
      const previousStateForKey = state[key];
      const nextStateForKey = reducer2(previousStateForKey, action);
      if (typeof nextStateForKey === "undefined") {
        const actionType = action && action.type;
        throw new Error(false ? formatProdErrorMessage(14) : `When called with an action of type ${actionType ? `"${String(actionType)}"` : "(unknown type)"}, the slice reducer for key "${key}" returned undefined. To ignore an action, you must explicitly return the previous state. If you want this reducer to hold no value, you can return null instead of undefined.`);
      }
      nextState[key] = nextStateForKey;
      hasChanged = hasChanged || nextStateForKey !== previousStateForKey;
    }
    hasChanged = hasChanged || finalReducerKeys.length !== Object.keys(state).length;
    return hasChanged ? nextState : state;
  };
}
function compose(...funcs) {
  if (funcs.length === 0) {
    return (arg) => arg;
  }
  if (funcs.length === 1) {
    return funcs[0];
  }
  return funcs.reduce((a, b) => (...args) => a(b(...args)));
}
function applyMiddleware(...middlewares) {
  return (createStore2) => (reducer2, preloadedState) => {
    const store = createStore2(reducer2, preloadedState);
    let dispatch = () => {
      throw new Error(false ? formatProdErrorMessage(15) : "Dispatching while constructing your middleware is not allowed. Other middleware would not be applied to this dispatch.");
    };
    const middlewareAPI = {
      getState: store.getState,
      dispatch: (action, ...args) => dispatch(action, ...args)
    };
    const chain = middlewares.map((middleware) => middleware(middlewareAPI));
    dispatch = compose(...chain)(store.dispatch);
    return {
      ...store,
      dispatch
    };
  };
}
function isAction(action) {
  return isPlainObject(action) && "type" in action && typeof action.type === "string";
}

// node_modules/immer/dist/immer.mjs
var NOTHING = /* @__PURE__ */ Symbol.for("immer-nothing");
var DRAFTABLE = /* @__PURE__ */ Symbol.for("immer-draftable");
var DRAFT_STATE = /* @__PURE__ */ Symbol.for("immer-state");
var errors = true ? [
  // All error codes, starting by 0:
  function(plugin) {
    return `The plugin for '${plugin}' has not been loaded into Immer. To enable the plugin, import and call \`enable${plugin}()\` when initializing your application.`;
  },
  function(thing) {
    return `produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '${thing}'`;
  },
  "This object has been frozen and should not be mutated",
  function(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  "Immer forbids circular references",
  "The first or second argument to `produce` must be a function",
  "The third argument to `produce` must be a function or undefined",
  "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  "First argument to `finishDraft` must be a draft returned by `createDraft`",
  function(thing) {
    return `'current' expects a draft, got: ${thing}`;
  },
  "Object.defineProperty() cannot be used on an Immer draft",
  "Object.setPrototypeOf() cannot be used on an Immer draft",
  "Immer only supports deleting array indices",
  "Immer only supports setting array indices and the 'length' property",
  function(thing) {
    return `'original' expects a draft, got: ${thing}`;
  }
  // Note: if more errors are added, the errorOffset in Patches.ts should be increased
  // See Patches.ts for additional errors
] : [];
function die(error, ...args) {
  if (true) {
    const e = errors[error];
    const msg = isFunction(e) ? e.apply(null, args) : e;
    throw new Error(`[Immer] ${msg}`);
  }
  throw new Error(
    `[Immer] minified error nr: ${error}. Full error at: https://bit.ly/3cXEKWf`
  );
}
var O = Object;
var getPrototypeOf = O.getPrototypeOf;
var CONSTRUCTOR = "constructor";
var PROTOTYPE = "prototype";
var CONFIGURABLE = "configurable";
var ENUMERABLE = "enumerable";
var WRITABLE = "writable";
var VALUE = "value";
var isDraft = (value) => !!value && !!value[DRAFT_STATE];
function isDraftable(value) {
  if (!value)
    return false;
  return isPlainObject2(value) || isArray(value) || !!value[DRAFTABLE] || !!value[CONSTRUCTOR]?.[DRAFTABLE] || isMap(value) || isSet(value);
}
var objectCtorString = O[PROTOTYPE][CONSTRUCTOR].toString();
var cachedCtorStrings = /* @__PURE__ */ new WeakMap();
function isPlainObject2(value) {
  if (!value || !isObjectish(value))
    return false;
  const proto = getPrototypeOf(value);
  if (proto === null || proto === O[PROTOTYPE])
    return true;
  const Ctor = O.hasOwnProperty.call(proto, CONSTRUCTOR) && proto[CONSTRUCTOR];
  if (Ctor === Object)
    return true;
  if (!isFunction(Ctor))
    return false;
  let ctorString = cachedCtorStrings.get(Ctor);
  if (ctorString === void 0) {
    ctorString = Function.toString.call(Ctor);
    cachedCtorStrings.set(Ctor, ctorString);
  }
  return ctorString === objectCtorString;
}
function each(obj, iter, strict = true) {
  if (getArchtype(obj) === 0) {
    const keys = strict ? Reflect.ownKeys(obj) : O.keys(obj);
    keys.forEach((key) => {
      iter(key, obj[key], obj);
    });
  } else {
    obj.forEach((entry, index) => iter(index, entry, obj));
  }
}
function getArchtype(thing) {
  const state = thing[DRAFT_STATE];
  return state ? state.type_ : isArray(thing) ? 1 : isMap(thing) ? 2 : isSet(thing) ? 3 : 0;
}
var has = (thing, prop, type = getArchtype(thing)) => type === 2 ? thing.has(prop) : O[PROTOTYPE].hasOwnProperty.call(thing, prop);
var get = (thing, prop, type = getArchtype(thing)) => (
  // @ts-ignore
  type === 2 ? thing.get(prop) : thing[prop]
);
var set = (thing, propOrOldValue, value, type = getArchtype(thing)) => {
  if (type === 2)
    thing.set(propOrOldValue, value);
  else if (type === 3) {
    thing.add(value);
  } else
    thing[propOrOldValue] = value;
};
function is(x, y) {
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
var isArray = Array.isArray;
var isMap = (target) => target instanceof Map;
var isSet = (target) => target instanceof Set;
var isObjectish = (target) => typeof target === "object";
var isFunction = (target) => typeof target === "function";
var isBoolean = (target) => typeof target === "boolean";
function isArrayIndex(value) {
  const n = +value;
  return Number.isInteger(n) && String(n) === value;
}
var latest = (state) => state.copy_ || state.base_;
var getFinalValue = (state) => state.modified_ ? state.copy_ : state.base_;
function shallowCopy(base, strict) {
  if (isMap(base)) {
    return new Map(base);
  }
  if (isSet(base)) {
    return new Set(base);
  }
  if (isArray(base))
    return Array[PROTOTYPE].slice.call(base);
  const isPlain2 = isPlainObject2(base);
  if (strict === true || strict === "class_only" && !isPlain2) {
    const descriptors = O.getOwnPropertyDescriptors(base);
    delete descriptors[DRAFT_STATE];
    let keys = Reflect.ownKeys(descriptors);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const desc = descriptors[key];
      if (desc[WRITABLE] === false) {
        desc[WRITABLE] = true;
        desc[CONFIGURABLE] = true;
      }
      if (desc.get || desc.set)
        descriptors[key] = {
          [CONFIGURABLE]: true,
          [WRITABLE]: true,
          // could live with !!desc.set as well here...
          [ENUMERABLE]: desc[ENUMERABLE],
          [VALUE]: base[key]
        };
    }
    return O.create(getPrototypeOf(base), descriptors);
  } else {
    const proto = getPrototypeOf(base);
    if (proto !== null && isPlain2) {
      return { ...base };
    }
    const obj = O.create(proto);
    return O.assign(obj, base);
  }
}
function freeze(obj, deep = false) {
  if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj))
    return obj;
  if (getArchtype(obj) > 1) {
    O.defineProperties(obj, {
      set: dontMutateMethodOverride,
      add: dontMutateMethodOverride,
      clear: dontMutateMethodOverride,
      delete: dontMutateMethodOverride
    });
  }
  O.freeze(obj);
  if (deep)
    each(
      obj,
      (_key, value) => {
        freeze(value, true);
      },
      false
    );
  return obj;
}
function dontMutateFrozenCollections() {
  die(2);
}
var dontMutateMethodOverride = {
  [VALUE]: dontMutateFrozenCollections
};
function isFrozen(obj) {
  if (obj === null || !isObjectish(obj))
    return true;
  return O.isFrozen(obj);
}
var PluginMapSet = "MapSet";
var PluginPatches = "Patches";
var PluginArrayMethods = "ArrayMethods";
var plugins = {};
function getPlugin(pluginKey) {
  const plugin = plugins[pluginKey];
  if (!plugin) {
    die(0, pluginKey);
  }
  return plugin;
}
var isPluginLoaded = (pluginKey) => !!plugins[pluginKey];
var currentScope;
var getCurrentScope = () => currentScope;
var createScope = (parent_, immer_) => ({
  drafts_: [],
  parent_,
  immer_,
  // Whenever the modified draft contains a draft from another scope, we
  // need to prevent auto-freezing so the unowned draft can be finalized.
  canAutoFreeze_: true,
  unfinalizedDrafts_: 0,
  handledSet_: /* @__PURE__ */ new Set(),
  processedForPatches_: /* @__PURE__ */ new Set(),
  mapSetPlugin_: isPluginLoaded(PluginMapSet) ? getPlugin(PluginMapSet) : void 0,
  arrayMethodsPlugin_: isPluginLoaded(PluginArrayMethods) ? getPlugin(PluginArrayMethods) : void 0
});
function usePatchesInScope(scope, patchListener) {
  if (patchListener) {
    scope.patchPlugin_ = getPlugin(PluginPatches);
    scope.patches_ = [];
    scope.inversePatches_ = [];
    scope.patchListener_ = patchListener;
  }
}
function revokeScope(scope) {
  leaveScope(scope);
  scope.drafts_.forEach(revokeDraft);
  scope.drafts_ = null;
}
function leaveScope(scope) {
  if (scope === currentScope) {
    currentScope = scope.parent_;
  }
}
var enterScope = (immer2) => currentScope = createScope(currentScope, immer2);
function revokeDraft(draft) {
  const state = draft[DRAFT_STATE];
  if (state.type_ === 0 || state.type_ === 1)
    state.revoke_();
  else
    state.revoked_ = true;
}
function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  const baseDraft = scope.drafts_[0];
  const isReplaced = result !== void 0 && result !== baseDraft;
  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified_) {
      revokeScope(scope);
      die(4);
    }
    if (isDraftable(result)) {
      result = finalize(scope, result);
    }
    const { patchPlugin_ } = scope;
    if (patchPlugin_) {
      patchPlugin_.generateReplacementPatches_(
        baseDraft[DRAFT_STATE].base_,
        result,
        scope
      );
    }
  } else {
    result = finalize(scope, baseDraft);
  }
  maybeFreeze(scope, result, true);
  revokeScope(scope);
  if (scope.patches_) {
    scope.patchListener_(scope.patches_, scope.inversePatches_);
  }
  return result !== NOTHING ? result : void 0;
}
function finalize(rootScope, value) {
  if (isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  if (!state) {
    const finalValue = handleValue(value, rootScope.handledSet_, rootScope);
    return finalValue;
  }
  if (!isSameScope(state, rootScope)) {
    return value;
  }
  if (!state.modified_) {
    return state.base_;
  }
  if (!state.finalized_) {
    const { callbacks_ } = state;
    if (callbacks_) {
      while (callbacks_.length > 0) {
        const callback = callbacks_.pop();
        callback(rootScope);
      }
    }
    generatePatchesAndFinalize(state, rootScope);
  }
  return state.copy_;
}
function maybeFreeze(scope, value, deep = false) {
  if (!scope.parent_ && scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
    freeze(value, deep);
  }
}
function markStateFinalized(state) {
  state.finalized_ = true;
  state.scope_.unfinalizedDrafts_--;
}
var isSameScope = (state, rootScope) => state.scope_ === rootScope;
var EMPTY_LOCATIONS_RESULT = [];
function updateDraftInParent(parent, draftValue, finalizedValue, originalKey) {
  const parentCopy = latest(parent);
  const parentType = parent.type_;
  if (originalKey !== void 0) {
    const currentValue = get(parentCopy, originalKey, parentType);
    if (currentValue === draftValue) {
      set(parentCopy, originalKey, finalizedValue, parentType);
      return;
    }
  }
  if (!parent.draftLocations_) {
    const draftLocations = parent.draftLocations_ = /* @__PURE__ */ new Map();
    each(parentCopy, (key, value) => {
      if (isDraft(value)) {
        const keys = draftLocations.get(value) || [];
        keys.push(key);
        draftLocations.set(value, keys);
      }
    });
  }
  const locations = parent.draftLocations_.get(draftValue) ?? EMPTY_LOCATIONS_RESULT;
  for (const location of locations) {
    set(parentCopy, location, finalizedValue, parentType);
  }
}
function registerChildFinalizationCallback(parent, child, key) {
  parent.callbacks_.push(function childCleanup(rootScope) {
    const state = child;
    if (!state || !isSameScope(state, rootScope)) {
      return;
    }
    rootScope.mapSetPlugin_?.fixSetContents(state);
    const finalizedValue = getFinalValue(state);
    updateDraftInParent(parent, state.draft_ ?? state, finalizedValue, key);
    generatePatchesAndFinalize(state, rootScope);
  });
}
function generatePatchesAndFinalize(state, rootScope) {
  const shouldFinalize = state.modified_ && !state.finalized_ && (state.type_ === 3 || state.type_ === 1 && state.allIndicesReassigned_ || (state.assigned_?.size ?? 0) > 0);
  if (shouldFinalize) {
    const { patchPlugin_ } = rootScope;
    if (patchPlugin_) {
      const basePath = patchPlugin_.getPath(state);
      if (basePath) {
        patchPlugin_.generatePatches_(state, basePath, rootScope);
      }
    }
    markStateFinalized(state);
  }
}
function handleCrossReference(target, key, value) {
  const { scope_ } = target;
  if (isDraft(value)) {
    const state = value[DRAFT_STATE];
    if (isSameScope(state, scope_)) {
      state.callbacks_.push(function crossReferenceCleanup() {
        prepareCopy(target);
        const finalizedValue = getFinalValue(state);
        updateDraftInParent(target, value, finalizedValue, key);
      });
    }
  } else if (isDraftable(value)) {
    target.callbacks_.push(function nestedDraftCleanup() {
      const targetCopy = latest(target);
      if (target.type_ === 3) {
        if (targetCopy.has(value)) {
          handleValue(value, scope_.handledSet_, scope_);
        }
      } else {
        if (get(targetCopy, key, target.type_) === value) {
          if (scope_.drafts_.length > 1 && (target.assigned_.get(key) ?? false) === true && target.copy_) {
            handleValue(
              get(target.copy_, key, target.type_),
              scope_.handledSet_,
              scope_
            );
          }
        }
      }
    });
  }
}
function handleValue(target, handledSet, rootScope) {
  if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
    return target;
  }
  if (isDraft(target) || handledSet.has(target) || !isDraftable(target) || isFrozen(target)) {
    return target;
  }
  handledSet.add(target);
  each(target, (key, value) => {
    if (isDraft(value)) {
      const state = value[DRAFT_STATE];
      if (isSameScope(state, rootScope)) {
        const updatedValue = getFinalValue(state);
        set(target, key, updatedValue, target.type_);
        markStateFinalized(state);
      }
    } else if (isDraftable(value)) {
      handleValue(value, handledSet, rootScope);
    }
  });
  return target;
}
function createProxyProxy(base, parent) {
  const baseIsArray = isArray(base);
  const state = {
    type_: baseIsArray ? 1 : 0,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: false,
    // Used during finalization.
    finalized_: false,
    // Track which properties have been assigned (true) or deleted (false).
    // actually instantiated in `prepareCopy()`
    assigned_: void 0,
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // set below
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: false,
    // `callbacks` actually gets assigned in `createProxy`
    callbacks_: void 0
  };
  let target = state;
  let traps = objectTraps;
  if (baseIsArray) {
    target = [state];
    traps = arrayTraps;
  }
  const { revoke, proxy } = Proxy.revocable(target, traps);
  state.draft_ = proxy;
  state.revoke_ = revoke;
  return [proxy, state];
}
var objectTraps = {
  get(state, prop) {
    if (prop === DRAFT_STATE)
      return state;
    let arrayPlugin = state.scope_.arrayMethodsPlugin_;
    const isArrayWithStringProp = state.type_ === 1 && typeof prop === "string";
    if (isArrayWithStringProp) {
      if (arrayPlugin?.isArrayOperationMethod(prop)) {
        return arrayPlugin.createMethodInterceptor(state, prop);
      }
    }
    const source = latest(state);
    if (!has(source, prop, state.type_)) {
      return readPropFromProto(state, source, prop);
    }
    const value = source[prop];
    if (state.finalized_ || !isDraftable(value)) {
      return value;
    }
    if (isArrayWithStringProp && state.operationMethod && arrayPlugin?.isMutatingArrayMethod(
      state.operationMethod
    ) && isArrayIndex(prop)) {
      return value;
    }
    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      const childKey = state.type_ === 1 ? +prop : prop;
      const childDraft = createProxy(state.scope_, value, state, childKey);
      return state.copy_[childKey] = childDraft;
    }
    return value;
  },
  has(state, prop) {
    return prop in latest(state);
  },
  ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set(state, prop, value) {
    const desc = getDescriptorFromProto(latest(state), prop);
    if (desc?.set) {
      desc.set.call(state.draft_, value);
      return true;
    }
    if (!state.modified_) {
      const current2 = peek(latest(state), prop);
      const currentState = current2?.[DRAFT_STATE];
      if (currentState && currentState.base_ === value) {
        state.copy_[prop] = value;
        state.assigned_.set(prop, false);
        return true;
      }
      if (is(value, current2) && (value !== void 0 || has(state.base_, prop, state.type_)))
        return true;
      prepareCopy(state);
      markChanged(state);
    }
    if (state.copy_[prop] === value && // special case: handle new props with value 'undefined'
    (value !== void 0 || prop in state.copy_) || // special case: NaN
    Number.isNaN(value) && Number.isNaN(state.copy_[prop]))
      return true;
    state.copy_[prop] = value;
    state.assigned_.set(prop, true);
    handleCrossReference(state, prop, value);
    return true;
  },
  deleteProperty(state, prop) {
    prepareCopy(state);
    if (peek(state.base_, prop) !== void 0 || prop in state.base_) {
      state.assigned_.set(prop, false);
      markChanged(state);
    } else {
      state.assigned_.delete(prop);
    }
    if (state.copy_) {
      delete state.copy_[prop];
    }
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor(state, prop) {
    const owner = latest(state);
    const desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    if (!desc)
      return desc;
    return {
      [WRITABLE]: true,
      [CONFIGURABLE]: state.type_ !== 1 || prop !== "length",
      [ENUMERABLE]: desc[ENUMERABLE],
      [VALUE]: owner[prop]
    };
  },
  defineProperty() {
    die(11);
  },
  getPrototypeOf(state) {
    return getPrototypeOf(state.base_);
  },
  setPrototypeOf() {
    die(12);
  }
};
var arrayTraps = {};
for (let key in objectTraps) {
  let fn = objectTraps[key];
  arrayTraps[key] = function() {
    const args = arguments;
    args[0] = args[0][0];
    return fn.apply(this, args);
  };
}
arrayTraps.deleteProperty = function(state, prop) {
  if (isNaN(parseInt(prop)))
    die(13);
  return arrayTraps.set.call(this, state, prop, void 0);
};
arrayTraps.set = function(state, prop, value) {
  if (prop !== "length" && isNaN(parseInt(prop)))
    die(14);
  return objectTraps.set.call(this, state[0], prop, value, state[0]);
};
function peek(draft, prop) {
  const state = draft[DRAFT_STATE];
  const source = state ? latest(state) : draft;
  return source[prop];
}
function readPropFromProto(state, source, prop) {
  const desc = getDescriptorFromProto(source, prop);
  return desc ? VALUE in desc ? desc[VALUE] : (
    // This is a very special case, if the prop is a getter defined by the
    // prototype, we should invoke it with the draft as context!
    desc.get?.call(state.draft_)
  ) : void 0;
}
function getDescriptorFromProto(source, prop) {
  if (!(prop in source))
    return void 0;
  let proto = getPrototypeOf(source);
  while (proto) {
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc)
      return desc;
    proto = getPrototypeOf(proto);
  }
  return void 0;
}
function markChanged(state) {
  if (!state.modified_) {
    state.modified_ = true;
    if (state.parent_) {
      markChanged(state.parent_);
    }
  }
}
function prepareCopy(state) {
  if (!state.copy_) {
    state.assigned_ = /* @__PURE__ */ new Map();
    state.copy_ = shallowCopy(
      state.base_,
      state.scope_.immer_.useStrictShallowCopy_
    );
  }
}
var Immer2 = class {
  constructor(config) {
    this.autoFreeze_ = true;
    this.useStrictShallowCopy_ = false;
    this.useStrictIteration_ = false;
    this.produce = (base, recipe, patchListener) => {
      if (isFunction(base) && !isFunction(recipe)) {
        const defaultBase = recipe;
        recipe = base;
        const self = this;
        return function curriedProduce(base2 = defaultBase, ...args) {
          return self.produce(base2, (draft) => recipe.call(this, draft, ...args));
        };
      }
      if (!isFunction(recipe))
        die(6);
      if (patchListener !== void 0 && !isFunction(patchListener))
        die(7);
      let result;
      if (isDraftable(base)) {
        const scope = enterScope(this);
        const proxy = createProxy(scope, base, void 0);
        let hasError = true;
        try {
          result = recipe(proxy);
          hasError = false;
        } finally {
          if (hasError)
            revokeScope(scope);
          else
            leaveScope(scope);
        }
        usePatchesInScope(scope, patchListener);
        return processResult(result, scope);
      } else if (!base || !isObjectish(base)) {
        result = recipe(base);
        if (result === void 0)
          result = base;
        if (result === NOTHING)
          result = void 0;
        if (this.autoFreeze_)
          freeze(result, true);
        if (patchListener) {
          const p = [];
          const ip = [];
          getPlugin(PluginPatches).generateReplacementPatches_(base, result, {
            patches_: p,
            inversePatches_: ip
          });
          patchListener(p, ip);
        }
        return result;
      } else
        die(1, base);
    };
    this.produceWithPatches = (base, recipe) => {
      if (isFunction(base)) {
        return (state, ...args) => this.produceWithPatches(state, (draft) => base(draft, ...args));
      }
      let patches, inversePatches;
      const result = this.produce(base, recipe, (p, ip) => {
        patches = p;
        inversePatches = ip;
      });
      return [result, patches, inversePatches];
    };
    if (isBoolean(config?.autoFreeze))
      this.setAutoFreeze(config.autoFreeze);
    if (isBoolean(config?.useStrictShallowCopy))
      this.setUseStrictShallowCopy(config.useStrictShallowCopy);
    if (isBoolean(config?.useStrictIteration))
      this.setUseStrictIteration(config.useStrictIteration);
  }
  createDraft(base) {
    if (!isDraftable(base))
      die(8);
    if (isDraft(base))
      base = current(base);
    const scope = enterScope(this);
    const proxy = createProxy(scope, base, void 0);
    proxy[DRAFT_STATE].isManual_ = true;
    leaveScope(scope);
    return proxy;
  }
  finishDraft(draft, patchListener) {
    const state = draft && draft[DRAFT_STATE];
    if (!state || !state.isManual_)
      die(9);
    const { scope_: scope } = state;
    usePatchesInScope(scope, patchListener);
    return processResult(void 0, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to enable strict shallow copy.
   *
   * By default, immer does not copy the object descriptors such as getter, setter and non-enumrable properties.
   */
  setUseStrictShallowCopy(value) {
    this.useStrictShallowCopy_ = value;
  }
  /**
   * Pass false to use faster iteration that skips non-enumerable properties
   * but still handles symbols for compatibility.
   *
   * By default, strict iteration is enabled (includes all own properties).
   */
  setUseStrictIteration(value) {
    this.useStrictIteration_ = value;
  }
  shouldUseStrictIteration() {
    return this.useStrictIteration_;
  }
  applyPatches(base, patches) {
    let i;
    for (i = patches.length - 1; i >= 0; i--) {
      const patch = patches[i];
      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    }
    if (i > -1) {
      patches = patches.slice(i + 1);
    }
    const applyPatchesImpl = getPlugin(PluginPatches).applyPatches_;
    if (isDraft(base)) {
      return applyPatchesImpl(base, patches);
    }
    return this.produce(
      base,
      (draft) => applyPatchesImpl(draft, patches)
    );
  }
};
function createProxy(rootScope, value, parent, key) {
  const [draft, state] = isMap(value) ? getPlugin(PluginMapSet).proxyMap_(value, parent) : isSet(value) ? getPlugin(PluginMapSet).proxySet_(value, parent) : createProxyProxy(value, parent);
  const scope = parent?.scope_ ?? getCurrentScope();
  scope.drafts_.push(draft);
  state.callbacks_ = parent?.callbacks_ ?? [];
  state.key_ = key;
  if (parent && key !== void 0) {
    registerChildFinalizationCallback(parent, state, key);
  } else {
    state.callbacks_.push(function rootDraftCleanup(rootScope2) {
      rootScope2.mapSetPlugin_?.fixSetContents(state);
      const { patchPlugin_ } = rootScope2;
      if (state.modified_ && patchPlugin_) {
        patchPlugin_.generatePatches_(state, [], rootScope2);
      }
    });
  }
  return draft;
}
function current(value) {
  if (!isDraft(value))
    die(10, value);
  return currentImpl(value);
}
function currentImpl(value) {
  if (!isDraftable(value) || isFrozen(value))
    return value;
  const state = value[DRAFT_STATE];
  let copy;
  let strict = true;
  if (state) {
    if (!state.modified_)
      return state.base_;
    state.finalized_ = true;
    copy = shallowCopy(value, state.scope_.immer_.useStrictShallowCopy_);
    strict = state.scope_.immer_.shouldUseStrictIteration();
  } else {
    copy = shallowCopy(value, true);
  }
  each(
    copy,
    (key, childValue) => {
      set(copy, key, currentImpl(childValue));
    },
    strict
  );
  if (state) {
    state.finalized_ = false;
  }
  return copy;
}
var immer = new Immer2();
var produce = immer.produce;

// node_modules/redux-thunk/dist/redux-thunk.mjs
function createThunkMiddleware(extraArgument) {
  const middleware = ({ dispatch, getState }) => (next) => (action) => {
    if (typeof action === "function") {
      return action(dispatch, getState, extraArgument);
    }
    return next(action);
  };
  return middleware;
}
var thunk = createThunkMiddleware();
var withExtraArgument = createThunkMiddleware;

// node_modules/@reduxjs/toolkit/dist/redux-toolkit.modern.mjs
var composeWithDevTools = typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ ? window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ : function() {
  if (arguments.length === 0) return void 0;
  if (typeof arguments[0] === "object") return compose;
  return compose.apply(null, arguments);
};
var devToolsEnhancer = typeof window !== "undefined" && window.__REDUX_DEVTOOLS_EXTENSION__ ? window.__REDUX_DEVTOOLS_EXTENSION__ : function() {
  return function(noop3) {
    return noop3;
  };
};
var hasMatchFunction = (v) => {
  return v && typeof v.match === "function";
};
function createAction(type, prepareAction) {
  function actionCreator(...args) {
    if (prepareAction) {
      let prepared = prepareAction(...args);
      if (!prepared) {
        throw new Error(false ? formatProdErrorMessage(0) : "prepareAction did not return an object");
      }
      return {
        type,
        payload: prepared.payload,
        ..."meta" in prepared && {
          meta: prepared.meta
        },
        ..."error" in prepared && {
          error: prepared.error
        }
      };
    }
    return {
      type,
      payload: args[0]
    };
  }
  actionCreator.toString = () => `${type}`;
  actionCreator.type = type;
  actionCreator.match = (action) => isAction(action) && action.type === type;
  return actionCreator;
}
function isActionCreator(action) {
  return typeof action === "function" && "type" in action && // hasMatchFunction only wants Matchers but I don't see the point in rewriting it
  hasMatchFunction(action);
}
function getMessage(type) {
  const splitType = type ? `${type}`.split("/") : [];
  const actionName = splitType[splitType.length - 1] || "actionCreator";
  return `Detected an action creator with type "${type || "unknown"}" being dispatched.
Make sure you're calling the action creator before dispatching, i.e. \`dispatch(${actionName}())\` instead of \`dispatch(${actionName})\`. This is necessary even if the action has no payload.`;
}
function createActionCreatorInvariantMiddleware(options = {}) {
  if (false) {
    return () => (next) => (action) => next(action);
  }
  const {
    isActionCreator: isActionCreator2 = isActionCreator
  } = options;
  return () => (next) => (action) => {
    if (isActionCreator2(action)) {
      console.warn(getMessage(action.type));
    }
    return next(action);
  };
}
function getTimeMeasureUtils(maxDelay, fnName) {
  let elapsed = 0;
  return {
    measureTime(fn) {
      const started = Date.now();
      try {
        return fn();
      } finally {
        const finished = Date.now();
        elapsed += finished - started;
      }
    },
    warnIfExceeded() {
      if (elapsed > maxDelay) {
        console.warn(`${fnName} took ${elapsed}ms, which is more than the warning threshold of ${maxDelay}ms. 
If your state or actions are very large, you may want to disable the middleware as it might cause too much of a slowdown in development mode. See https://redux-toolkit.js.org/api/getDefaultMiddleware for instructions.
It is disabled in production builds, so you don't need to worry about that.`);
      }
    }
  };
}
var Tuple = class _Tuple extends Array {
  constructor(...items) {
    super(...items);
    Object.setPrototypeOf(this, _Tuple.prototype);
  }
  static get [Symbol.species]() {
    return _Tuple;
  }
  concat(...arr) {
    return super.concat.apply(this, arr);
  }
  prepend(...arr) {
    if (arr.length === 1 && Array.isArray(arr[0])) {
      return new _Tuple(...arr[0].concat(this));
    }
    return new _Tuple(...arr.concat(this));
  }
};
function freezeDraftable(val) {
  return isDraftable(val) ? produce(val, () => {
  }) : val;
}
function getOrInsertComputed(map, key, compute) {
  if (map.has(key)) return map.get(key);
  return map.set(key, compute(key)).get(key);
}
function isImmutableDefault(value) {
  return typeof value !== "object" || value == null || Object.isFrozen(value);
}
function trackForMutations(isImmutable, ignoredPaths, obj) {
  const trackedProperties = trackProperties(isImmutable, ignoredPaths, obj);
  return {
    detectMutations() {
      return detectMutations(isImmutable, ignoredPaths, trackedProperties, obj);
    }
  };
}
function trackProperties(isImmutable, ignoredPaths = [], obj, path = "", checkedObjects = /* @__PURE__ */ new Set()) {
  const tracked = {
    value: obj
  };
  if (!isImmutable(obj) && !checkedObjects.has(obj)) {
    checkedObjects.add(obj);
    tracked.children = {};
    const hasIgnoredPaths = ignoredPaths.length > 0;
    for (const key in obj) {
      const nestedPath = path ? path + "." + key : key;
      if (hasIgnoredPaths) {
        const hasMatches = ignoredPaths.some((ignored) => {
          if (ignored instanceof RegExp) {
            return ignored.test(nestedPath);
          }
          return nestedPath === ignored;
        });
        if (hasMatches) {
          continue;
        }
      }
      tracked.children[key] = trackProperties(isImmutable, ignoredPaths, obj[key], nestedPath);
    }
  }
  return tracked;
}
function detectMutations(isImmutable, ignoredPaths = [], trackedProperty, obj, sameParentRef = false, path = "") {
  const prevObj = trackedProperty ? trackedProperty.value : void 0;
  const sameRef = prevObj === obj;
  if (sameParentRef && !sameRef && !Number.isNaN(obj)) {
    return {
      wasMutated: true,
      path
    };
  }
  if (isImmutable(prevObj) || isImmutable(obj)) {
    return {
      wasMutated: false
    };
  }
  const keysToDetect = {};
  for (let key in trackedProperty.children) {
    keysToDetect[key] = true;
  }
  for (let key in obj) {
    keysToDetect[key] = true;
  }
  const hasIgnoredPaths = ignoredPaths.length > 0;
  for (let key in keysToDetect) {
    const nestedPath = path ? path + "." + key : key;
    if (hasIgnoredPaths) {
      const hasMatches = ignoredPaths.some((ignored) => {
        if (ignored instanceof RegExp) {
          return ignored.test(nestedPath);
        }
        return nestedPath === ignored;
      });
      if (hasMatches) {
        continue;
      }
    }
    const result = detectMutations(isImmutable, ignoredPaths, trackedProperty.children[key], obj[key], sameRef, nestedPath);
    if (result.wasMutated) {
      return result;
    }
  }
  return {
    wasMutated: false
  };
}
function createImmutableStateInvariantMiddleware(options = {}) {
  if (false) {
    return () => (next) => (action) => next(action);
  } else {
    let stringify2 = function(obj, serializer, indent, decycler) {
      return JSON.stringify(obj, getSerialize2(serializer, decycler), indent);
    }, getSerialize2 = function(serializer, decycler) {
      let stack = [], keys = [];
      if (!decycler) decycler = function(_, value) {
        if (stack[0] === value) return "[Circular ~]";
        return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]";
      };
      return function(key, value) {
        if (stack.length > 0) {
          var thisPos = stack.indexOf(this);
          ~thisPos ? stack.splice(thisPos + 1) : stack.push(this);
          ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key);
          if (~stack.indexOf(value)) value = decycler.call(this, key, value);
        } else stack.push(value);
        return serializer == null ? value : serializer.call(this, key, value);
      };
    };
    var stringify = stringify2, getSerialize = getSerialize2;
    let {
      isImmutable = isImmutableDefault,
      ignoredPaths,
      warnAfter = 32
    } = options;
    const track = trackForMutations.bind(null, isImmutable, ignoredPaths);
    return ({
      getState
    }) => {
      let state = getState();
      let tracker = track(state);
      let result;
      return (next) => (action) => {
        const measureUtils = getTimeMeasureUtils(warnAfter, "ImmutableStateInvariantMiddleware");
        measureUtils.measureTime(() => {
          state = getState();
          result = tracker.detectMutations();
          tracker = track(state);
          if (result.wasMutated) {
            throw new Error(false ? formatProdErrorMessage(19) : `A state mutation was detected between dispatches, in the path '${result.path || ""}'.  This may cause incorrect behavior. (https://redux.js.org/style-guide/style-guide#do-not-mutate-state)`);
          }
        });
        const dispatchedAction = next(action);
        measureUtils.measureTime(() => {
          state = getState();
          result = tracker.detectMutations();
          tracker = track(state);
          if (result.wasMutated) {
            throw new Error(false ? formatProdErrorMessage(20) : `A state mutation was detected inside a dispatch, in the path: ${result.path || ""}. Take a look at the reducer(s) handling the action ${stringify2(action)}. (https://redux.js.org/style-guide/style-guide#do-not-mutate-state)`);
          }
        });
        measureUtils.warnIfExceeded();
        return dispatchedAction;
      };
    };
  }
}
function isPlain(val) {
  const type = typeof val;
  return val == null || type === "string" || type === "boolean" || type === "number" || Array.isArray(val) || isPlainObject(val);
}
function findNonSerializableValue(value, path = "", isSerializable = isPlain, getEntries, ignoredPaths = [], cache) {
  let foundNestedSerializable;
  if (!isSerializable(value)) {
    return {
      keyPath: path || "<root>",
      value
    };
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (cache?.has(value)) return false;
  const entries = getEntries != null ? getEntries(value) : Object.entries(value);
  const hasIgnoredPaths = ignoredPaths.length > 0;
  for (const [key, nestedValue] of entries) {
    const nestedPath = path ? path + "." + key : key;
    if (hasIgnoredPaths) {
      const hasMatches = ignoredPaths.some((ignored) => {
        if (ignored instanceof RegExp) {
          return ignored.test(nestedPath);
        }
        return nestedPath === ignored;
      });
      if (hasMatches) {
        continue;
      }
    }
    if (!isSerializable(nestedValue)) {
      return {
        keyPath: nestedPath,
        value: nestedValue
      };
    }
    if (typeof nestedValue === "object") {
      foundNestedSerializable = findNonSerializableValue(nestedValue, nestedPath, isSerializable, getEntries, ignoredPaths, cache);
      if (foundNestedSerializable) {
        return foundNestedSerializable;
      }
    }
  }
  if (cache && isNestedFrozen(value)) cache.add(value);
  return false;
}
function isNestedFrozen(value) {
  if (!Object.isFrozen(value)) return false;
  for (const nestedValue of Object.values(value)) {
    if (typeof nestedValue !== "object" || nestedValue === null) continue;
    if (!isNestedFrozen(nestedValue)) return false;
  }
  return true;
}
function createSerializableStateInvariantMiddleware(options = {}) {
  if (false) {
    return () => (next) => (action) => next(action);
  } else {
    const {
      isSerializable = isPlain,
      getEntries,
      ignoredActions = [],
      ignoredActionPaths = ["meta.arg", "meta.baseQueryMeta"],
      ignoredPaths = [],
      warnAfter = 32,
      ignoreState = false,
      ignoreActions = false,
      disableCache = false
    } = options;
    const cache = !disableCache && WeakSet ? /* @__PURE__ */ new WeakSet() : void 0;
    return (storeAPI) => (next) => (action) => {
      if (!isAction(action)) {
        return next(action);
      }
      const result = next(action);
      const measureUtils = getTimeMeasureUtils(warnAfter, "SerializableStateInvariantMiddleware");
      if (!ignoreActions && !(ignoredActions.length && ignoredActions.indexOf(action.type) !== -1)) {
        measureUtils.measureTime(() => {
          const foundActionNonSerializableValue = findNonSerializableValue(action, "", isSerializable, getEntries, ignoredActionPaths, cache);
          if (foundActionNonSerializableValue) {
            const {
              keyPath,
              value
            } = foundActionNonSerializableValue;
            console.error(`A non-serializable value was detected in an action, in the path: \`${keyPath}\`. Value:`, value, "\nTake a look at the logic that dispatched this action: ", action, "\n(See https://redux.js.org/faq/actions#why-should-type-be-a-string-or-at-least-serializable-why-should-my-action-types-be-constants)", "\n(To allow non-serializable values see: https://redux-toolkit.js.org/usage/usage-guide#working-with-non-serializable-data)");
          }
        });
      }
      if (!ignoreState) {
        measureUtils.measureTime(() => {
          const state = storeAPI.getState();
          const foundStateNonSerializableValue = findNonSerializableValue(state, "", isSerializable, getEntries, ignoredPaths, cache);
          if (foundStateNonSerializableValue) {
            const {
              keyPath,
              value
            } = foundStateNonSerializableValue;
            console.error(`A non-serializable value was detected in the state, in the path: \`${keyPath}\`. Value:`, value, `
Take a look at the reducer(s) handling this action type: ${action.type}.
(See https://redux.js.org/faq/organizing-state#can-i-put-functions-promises-or-other-non-serializable-items-in-my-store-state)`);
          }
        });
        measureUtils.warnIfExceeded();
      }
      return result;
    };
  }
}
function isBoolean2(x) {
  return typeof x === "boolean";
}
var buildGetDefaultMiddleware = () => function getDefaultMiddleware(options) {
  const {
    thunk: thunk2 = true,
    immutableCheck = true,
    serializableCheck = true,
    actionCreatorCheck = true
  } = options ?? {};
  let middlewareArray = new Tuple();
  if (thunk2) {
    if (isBoolean2(thunk2)) {
      middlewareArray.push(thunk);
    } else {
      middlewareArray.push(withExtraArgument(thunk2.extraArgument));
    }
  }
  if (true) {
    if (immutableCheck) {
      let immutableOptions = {};
      if (!isBoolean2(immutableCheck)) {
        immutableOptions = immutableCheck;
      }
      middlewareArray.unshift(createImmutableStateInvariantMiddleware(immutableOptions));
    }
    if (serializableCheck) {
      let serializableOptions = {};
      if (!isBoolean2(serializableCheck)) {
        serializableOptions = serializableCheck;
      }
      middlewareArray.push(createSerializableStateInvariantMiddleware(serializableOptions));
    }
    if (actionCreatorCheck) {
      let actionCreatorOptions = {};
      if (!isBoolean2(actionCreatorCheck)) {
        actionCreatorOptions = actionCreatorCheck;
      }
      middlewareArray.unshift(createActionCreatorInvariantMiddleware(actionCreatorOptions));
    }
  }
  return middlewareArray;
};
var SHOULD_AUTOBATCH = "RTK_autoBatch";
var createQueueWithTimer = (timeout) => {
  return (notify) => {
    setTimeout(notify, timeout);
  };
};
var createRafWithFallbackTimer = (raf, timeout) => {
  return (notify) => {
    let called = false;
    const callback = () => {
      if (called) return;
      called = true;
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      notify();
    };
    const rafId = raf(callback);
    const timerId = setTimeout(callback, timeout);
  };
};
var autoBatchEnhancer = (options = {
  type: "raf"
}) => (next) => (...args) => {
  const store = next(...args);
  let notifying = true;
  let shouldNotifyAtEndOfTick = false;
  let notificationQueued = false;
  const listeners = /* @__PURE__ */ new Set();
  const queueCallback = options.type === "tick" ? queueMicrotask : options.type === "raf" ? (
    // requestAnimationFrame won't exist in SSR environments. Fall back to a vague approximation just to keep from erroring.
    typeof window !== "undefined" && window.requestAnimationFrame ? createRafWithFallbackTimer(window.requestAnimationFrame, 100) : createQueueWithTimer(10)
  ) : options.type === "callback" ? options.queueNotification : createQueueWithTimer(options.timeout);
  const notifyListeners = () => {
    notificationQueued = false;
    if (shouldNotifyAtEndOfTick) {
      shouldNotifyAtEndOfTick = false;
      listeners.forEach((l) => l());
    }
  };
  return Object.assign({}, store, {
    // Override the base `store.subscribe` method to keep original listeners
    // from running if we're delaying notifications
    subscribe(listener2) {
      const wrappedListener = () => notifying && listener2();
      const unsubscribe = store.subscribe(wrappedListener);
      listeners.add(listener2);
      return () => {
        unsubscribe();
        listeners.delete(listener2);
      };
    },
    // Override the base `store.dispatch` method so that we can check actions
    // for the `shouldAutoBatch` flag and determine if batching is active
    dispatch(action) {
      try {
        notifying = !action?.meta?.[SHOULD_AUTOBATCH];
        shouldNotifyAtEndOfTick = !notifying;
        if (shouldNotifyAtEndOfTick) {
          if (!notificationQueued) {
            notificationQueued = true;
            queueCallback(notifyListeners);
          }
        }
        return store.dispatch(action);
      } finally {
        notifying = true;
      }
    }
  });
};
var buildGetDefaultEnhancers = (middlewareEnhancer) => function getDefaultEnhancers(options) {
  const {
    autoBatch = true
  } = options ?? {};
  let enhancerArray = new Tuple(middlewareEnhancer);
  if (autoBatch) {
    enhancerArray.push(autoBatchEnhancer(typeof autoBatch === "object" ? autoBatch : void 0));
  }
  return enhancerArray;
};
function configureStore(options) {
  const getDefaultMiddleware = buildGetDefaultMiddleware();
  const {
    reducer: reducer2 = void 0,
    middleware,
    devTools = true,
    duplicateMiddlewareCheck = true,
    preloadedState = void 0,
    enhancers = void 0
  } = options || {};
  let rootReducer;
  if (typeof reducer2 === "function") {
    rootReducer = reducer2;
  } else if (isPlainObject(reducer2)) {
    rootReducer = combineReducers(reducer2);
  } else {
    throw new Error(false ? formatProdErrorMessage(1) : "`reducer` is a required argument, and must be a function or an object of functions that can be passed to combineReducers");
  }
  if (middleware && typeof middleware !== "function") {
    throw new Error(false ? formatProdErrorMessage(2) : "`middleware` field must be a callback");
  }
  let finalMiddleware;
  if (typeof middleware === "function") {
    finalMiddleware = middleware(getDefaultMiddleware);
    if (!Array.isArray(finalMiddleware)) {
      throw new Error(false ? formatProdErrorMessage(3) : "when using a middleware builder function, an array of middleware must be returned");
    }
  } else {
    finalMiddleware = getDefaultMiddleware();
  }
  if (finalMiddleware.some((item) => typeof item !== "function")) {
    throw new Error(false ? formatProdErrorMessage(4) : "each middleware provided to configureStore must be a function");
  }
  if (duplicateMiddlewareCheck) {
    let middlewareReferences = /* @__PURE__ */ new Set();
    finalMiddleware.forEach((middleware2) => {
      if (middlewareReferences.has(middleware2)) {
        throw new Error(false ? formatProdErrorMessage(42) : "Duplicate middleware references found when creating the store. Ensure that each middleware is only included once.");
      }
      middlewareReferences.add(middleware2);
    });
  }
  let finalCompose = compose;
  if (devTools) {
    finalCompose = composeWithDevTools({
      // Enable capture of stack traces for dispatched Redux actions
      trace: true,
      ...typeof devTools === "object" && devTools
    });
  }
  const middlewareEnhancer = applyMiddleware(...finalMiddleware);
  const getDefaultEnhancers = buildGetDefaultEnhancers(middlewareEnhancer);
  if (enhancers && typeof enhancers !== "function") {
    throw new Error(false ? formatProdErrorMessage(5) : "`enhancers` field must be a callback");
  }
  let storeEnhancers = typeof enhancers === "function" ? enhancers(getDefaultEnhancers) : getDefaultEnhancers();
  if (!Array.isArray(storeEnhancers)) {
    throw new Error(false ? formatProdErrorMessage(6) : "`enhancers` callback must return an array");
  }
  if (storeEnhancers.some((item) => typeof item !== "function")) {
    throw new Error(false ? formatProdErrorMessage(7) : "each enhancer provided to configureStore must be a function");
  }
  if (finalMiddleware.length && !storeEnhancers.includes(middlewareEnhancer)) {
    console.error("middlewares were provided, but middleware enhancer was not included in final enhancers - make sure to call `getDefaultEnhancers`");
  }
  const composedEnhancer = finalCompose(...storeEnhancers);
  return createStore(rootReducer, preloadedState, composedEnhancer);
}
function executeReducerBuilderCallback(builderCallback) {
  const actionsMap = {};
  const actionMatchers = [];
  let defaultCaseReducer;
  const builder = {
    addCase(typeOrActionCreator, reducer2) {
      if (true) {
        if (actionMatchers.length > 0) {
          throw new Error(false ? formatProdErrorMessage(26) : "`builder.addCase` should only be called before calling `builder.addMatcher`");
        }
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(27) : "`builder.addCase` should only be called before calling `builder.addDefaultCase`");
        }
      }
      const type = typeof typeOrActionCreator === "string" ? typeOrActionCreator : typeOrActionCreator.type;
      if (!type) {
        throw new Error(false ? formatProdErrorMessage(28) : "`builder.addCase` cannot be called with an empty action type");
      }
      if (type in actionsMap) {
        throw new Error(false ? formatProdErrorMessage(29) : `\`builder.addCase\` cannot be called with two reducers for the same action type '${type}'`);
      }
      actionsMap[type] = reducer2;
      return builder;
    },
    addAsyncThunk(asyncThunk, reducers) {
      if (true) {
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(43) : "`builder.addAsyncThunk` should only be called before calling `builder.addDefaultCase`");
        }
      }
      if (reducers.pending) actionsMap[asyncThunk.pending.type] = reducers.pending;
      if (reducers.rejected) actionsMap[asyncThunk.rejected.type] = reducers.rejected;
      if (reducers.fulfilled) actionsMap[asyncThunk.fulfilled.type] = reducers.fulfilled;
      if (reducers.settled) actionMatchers.push({
        matcher: asyncThunk.settled,
        reducer: reducers.settled
      });
      return builder;
    },
    addMatcher(matcher, reducer2) {
      if (true) {
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(30) : "`builder.addMatcher` should only be called before calling `builder.addDefaultCase`");
        }
      }
      actionMatchers.push({
        matcher,
        reducer: reducer2
      });
      return builder;
    },
    addDefaultCase(reducer2) {
      if (true) {
        if (defaultCaseReducer) {
          throw new Error(false ? formatProdErrorMessage(31) : "`builder.addDefaultCase` can only be called once");
        }
      }
      defaultCaseReducer = reducer2;
      return builder;
    }
  };
  builderCallback(builder);
  return [actionsMap, actionMatchers, defaultCaseReducer];
}
function isStateFunction(x) {
  return typeof x === "function";
}
function createReducer(initialState, mapOrBuilderCallback) {
  if (true) {
    if (typeof mapOrBuilderCallback === "object") {
      throw new Error(false ? formatProdErrorMessage(8) : "The object notation for `createReducer` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createReducer");
    }
  }
  let [actionsMap, finalActionMatchers, finalDefaultCaseReducer] = executeReducerBuilderCallback(mapOrBuilderCallback);
  let getInitialState;
  if (isStateFunction(initialState)) {
    getInitialState = () => freezeDraftable(initialState());
  } else {
    const frozenInitialState = freezeDraftable(initialState);
    getInitialState = () => frozenInitialState;
  }
  function reducer2(state = getInitialState(), action) {
    let caseReducers = [actionsMap[action.type], ...finalActionMatchers.filter(({
      matcher
    }) => matcher(action)).map(({
      reducer: reducer22
    }) => reducer22)];
    if (caseReducers.filter((cr) => !!cr).length === 0) {
      caseReducers = [finalDefaultCaseReducer];
    }
    return caseReducers.reduce((previousState, caseReducer) => {
      if (caseReducer) {
        if (isDraft(previousState)) {
          const draft = previousState;
          const result = caseReducer(draft, action);
          if (result === void 0) {
            return previousState;
          }
          return result;
        } else if (!isDraftable(previousState)) {
          const result = caseReducer(previousState, action);
          if (result === void 0) {
            if (previousState === null) {
              return previousState;
            }
            throw Error("A case reducer on a non-draftable value must not return undefined");
          }
          return result;
        } else {
          return produce(previousState, (draft) => {
            return caseReducer(draft, action);
          });
        }
      }
      return previousState;
    }, state);
  }
  reducer2.getInitialState = getInitialState;
  return reducer2;
}
var matches = (matcher, action) => {
  if (hasMatchFunction(matcher)) {
    return matcher.match(action);
  } else {
    return matcher(action);
  }
};
function isAnyOf(...matchers) {
  return (action) => {
    return matchers.some((matcher) => matches(matcher, action));
  };
}
var urlAlphabet = "ModuleSymbhasOwnPr-0123456789ABCDEFGHNRVfgctiUvz_KqYTJkLxpZXIjQW";
var nanoid = (size = 21) => {
  let id = "";
  let i = size;
  while (i--) {
    id += urlAlphabet[Math.random() * 64 | 0];
  }
  return id;
};
var commonProperties = ["name", "message", "stack", "code"];
var RejectWithValue = class {
  constructor(payload, meta) {
    this.payload = payload;
    this.meta = meta;
  }
  payload;
  meta;
  /*
  type-only property to distinguish between RejectWithValue and FulfillWithMeta
  does not exist at runtime
  */
  _type;
};
var FulfillWithMeta = class {
  constructor(payload, meta) {
    this.payload = payload;
    this.meta = meta;
  }
  payload;
  meta;
  /*
  type-only property to distinguish between RejectWithValue and FulfillWithMeta
  does not exist at runtime
  */
  _type;
};
var miniSerializeError = (value) => {
  if (typeof value === "object" && value !== null) {
    const simpleError = {};
    for (const property of commonProperties) {
      if (typeof value[property] === "string") {
        simpleError[property] = value[property];
      }
    }
    return simpleError;
  }
  return {
    message: String(value)
  };
};
var externalAbortMessage = "External signal was aborted";
var createAsyncThunk = /* @__PURE__ */ (() => {
  function createAsyncThunk2(typePrefix, payloadCreator, options) {
    const fulfilled = createAction(typePrefix + "/fulfilled", (payload, requestId, arg, meta) => ({
      payload,
      meta: {
        ...meta || {},
        arg,
        requestId,
        requestStatus: "fulfilled"
      }
    }));
    const pending = createAction(typePrefix + "/pending", (requestId, arg, meta) => ({
      payload: void 0,
      meta: {
        ...meta || {},
        arg,
        requestId,
        requestStatus: "pending"
      }
    }));
    const rejected = createAction(typePrefix + "/rejected", (error, requestId, arg, payload, meta) => ({
      payload,
      error: (options && options.serializeError || miniSerializeError)(error || "Rejected"),
      meta: {
        ...meta || {},
        arg,
        requestId,
        rejectedWithValue: !!payload,
        requestStatus: "rejected",
        aborted: error?.name === "AbortError",
        condition: error?.name === "ConditionError"
      }
    }));
    function actionCreator(arg, {
      signal
    } = {}) {
      return (dispatch, getState, extra) => {
        const requestId = options?.idGenerator ? options.idGenerator(arg) : nanoid();
        const abortController = new AbortController();
        let abortHandler;
        let abortReason;
        function abort(reason) {
          abortReason = reason;
          abortController.abort();
        }
        if (signal) {
          if (signal.aborted) {
            abort(externalAbortMessage);
          } else {
            signal.addEventListener("abort", () => abort(externalAbortMessage), {
              once: true
            });
          }
        }
        const promise = (async function() {
          let finalAction;
          try {
            let conditionResult = options?.condition?.(arg, {
              getState,
              extra
            });
            if (isThenable(conditionResult)) {
              conditionResult = await conditionResult;
            }
            if (conditionResult === false || abortController.signal.aborted) {
              throw {
                name: "ConditionError",
                message: "Aborted due to condition callback returning false."
              };
            }
            const abortedPromise = new Promise((_, reject) => {
              abortHandler = () => {
                reject({
                  name: "AbortError",
                  message: abortReason || "Aborted"
                });
              };
              abortController.signal.addEventListener("abort", abortHandler, {
                once: true
              });
            });
            dispatch(pending(requestId, arg, options?.getPendingMeta?.({
              requestId,
              arg
            }, {
              getState,
              extra
            })));
            finalAction = await Promise.race([abortedPromise, Promise.resolve(payloadCreator(arg, {
              dispatch,
              getState,
              extra,
              requestId,
              signal: abortController.signal,
              abort,
              rejectWithValue: ((value, meta) => {
                return new RejectWithValue(value, meta);
              }),
              fulfillWithValue: ((value, meta) => {
                return new FulfillWithMeta(value, meta);
              })
            })).then((result) => {
              if (result instanceof RejectWithValue) {
                throw result;
              }
              if (result instanceof FulfillWithMeta) {
                return fulfilled(result.payload, requestId, arg, result.meta);
              }
              return fulfilled(result, requestId, arg);
            })]);
          } catch (err) {
            finalAction = err instanceof RejectWithValue ? rejected(null, requestId, arg, err.payload, err.meta) : rejected(err, requestId, arg);
          } finally {
            if (abortHandler) {
              abortController.signal.removeEventListener("abort", abortHandler);
            }
          }
          const skipDispatch = options && !options.dispatchConditionRejection && rejected.match(finalAction) && finalAction.meta.condition;
          if (!skipDispatch) {
            dispatch(finalAction);
          }
          return finalAction;
        })();
        return Object.assign(promise, {
          abort,
          requestId,
          arg,
          unwrap() {
            return promise.then(unwrapResult);
          }
        });
      };
    }
    return Object.assign(actionCreator, {
      pending,
      rejected,
      fulfilled,
      settled: isAnyOf(rejected, fulfilled),
      typePrefix
    });
  }
  createAsyncThunk2.withTypes = () => createAsyncThunk2;
  return createAsyncThunk2;
})();
function unwrapResult(action) {
  if (action.meta && action.meta.rejectedWithValue) {
    throw action.payload;
  }
  if (action.error) {
    throw action.error;
  }
  return action.payload;
}
function isThenable(value) {
  return value !== null && typeof value === "object" && typeof value.then === "function";
}
var asyncThunkSymbol = /* @__PURE__ */ Symbol.for("rtk-slice-createasyncthunk");
var asyncThunkCreator = {
  [asyncThunkSymbol]: createAsyncThunk
};
function getType(slice, actionKey) {
  return `${slice}/${actionKey}`;
}
function buildCreateSlice({
  creators
} = {}) {
  const cAT = creators?.asyncThunk?.[asyncThunkSymbol];
  return function createSlice2(options) {
    const {
      name,
      reducerPath = name
    } = options;
    if (!name) {
      throw new Error(false ? formatProdErrorMessage(11) : "`name` is a required option for createSlice");
    }
    if (typeof process !== "undefined" && true) {
      if (options.initialState === void 0) {
        console.error("You must provide an `initialState` value that is not `undefined`. You may have misspelled `initialState`");
      }
    }
    const reducers = (typeof options.reducers === "function" ? options.reducers(buildReducerCreators()) : options.reducers) || {};
    const reducerNames = Object.keys(reducers);
    const context = {
      sliceCaseReducersByName: {},
      sliceCaseReducersByType: {},
      actionCreators: {},
      sliceMatchers: []
    };
    const contextMethods = {
      addCase(typeOrActionCreator, reducer22) {
        const type = typeof typeOrActionCreator === "string" ? typeOrActionCreator : typeOrActionCreator.type;
        if (!type) {
          throw new Error(false ? formatProdErrorMessage(12) : "`context.addCase` cannot be called with an empty action type");
        }
        if (type in context.sliceCaseReducersByType) {
          throw new Error(false ? formatProdErrorMessage(13) : "`context.addCase` cannot be called with two reducers for the same action type: " + type);
        }
        context.sliceCaseReducersByType[type] = reducer22;
        return contextMethods;
      },
      addMatcher(matcher, reducer22) {
        context.sliceMatchers.push({
          matcher,
          reducer: reducer22
        });
        return contextMethods;
      },
      exposeAction(name2, actionCreator) {
        context.actionCreators[name2] = actionCreator;
        return contextMethods;
      },
      exposeCaseReducer(name2, reducer22) {
        context.sliceCaseReducersByName[name2] = reducer22;
        return contextMethods;
      }
    };
    reducerNames.forEach((reducerName) => {
      const reducerDefinition = reducers[reducerName];
      const reducerDetails = {
        reducerName,
        type: getType(name, reducerName),
        createNotation: typeof options.reducers === "function"
      };
      if (isAsyncThunkSliceReducerDefinition(reducerDefinition)) {
        handleThunkCaseReducerDefinition(reducerDetails, reducerDefinition, contextMethods, cAT);
      } else {
        handleNormalReducerDefinition(reducerDetails, reducerDefinition, contextMethods);
      }
    });
    function buildReducer() {
      if (true) {
        if (typeof options.extraReducers === "object") {
          throw new Error(false ? formatProdErrorMessage(14) : "The object notation for `createSlice.extraReducers` has been removed. Please use the 'builder callback' notation instead: https://redux-toolkit.js.org/api/createSlice");
        }
      }
      const [extraReducers = {}, actionMatchers = [], defaultCaseReducer = void 0] = typeof options.extraReducers === "function" ? executeReducerBuilderCallback(options.extraReducers) : [options.extraReducers];
      const finalCaseReducers = {
        ...extraReducers,
        ...context.sliceCaseReducersByType
      };
      return createReducer(options.initialState, (builder) => {
        for (let key in finalCaseReducers) {
          builder.addCase(key, finalCaseReducers[key]);
        }
        for (let sM of context.sliceMatchers) {
          builder.addMatcher(sM.matcher, sM.reducer);
        }
        for (let m of actionMatchers) {
          builder.addMatcher(m.matcher, m.reducer);
        }
        if (defaultCaseReducer) {
          builder.addDefaultCase(defaultCaseReducer);
        }
      });
    }
    const selectSelf = (state) => state;
    const injectedSelectorCache = /* @__PURE__ */ new Map();
    const injectedStateCache = /* @__PURE__ */ new WeakMap();
    let _reducer;
    function reducer2(state, action) {
      if (!_reducer) _reducer = buildReducer();
      return _reducer(state, action);
    }
    function getInitialState() {
      if (!_reducer) _reducer = buildReducer();
      return _reducer.getInitialState();
    }
    function makeSelectorProps(reducerPath2, injected = false) {
      function selectSlice(state) {
        let sliceState = state[reducerPath2];
        if (typeof sliceState === "undefined") {
          if (injected) {
            sliceState = getOrInsertComputed(injectedStateCache, selectSlice, getInitialState);
          } else if (true) {
            throw new Error(false ? formatProdErrorMessage(15) : "selectSlice returned undefined for an uninjected slice reducer");
          }
        }
        return sliceState;
      }
      function getSelectors(selectState = selectSelf) {
        const selectorCache = getOrInsertComputed(injectedSelectorCache, injected, () => /* @__PURE__ */ new WeakMap());
        return getOrInsertComputed(selectorCache, selectState, () => {
          const map = {};
          for (const [name2, selector] of Object.entries(options.selectors ?? {})) {
            map[name2] = wrapSelector(selector, selectState, () => getOrInsertComputed(injectedStateCache, selectState, getInitialState), injected);
          }
          return map;
        });
      }
      return {
        reducerPath: reducerPath2,
        getSelectors,
        get selectors() {
          return getSelectors(selectSlice);
        },
        selectSlice
      };
    }
    const slice = {
      name,
      reducer: reducer2,
      actions: context.actionCreators,
      caseReducers: context.sliceCaseReducersByName,
      getInitialState,
      ...makeSelectorProps(reducerPath),
      injectInto(injectable, {
        reducerPath: pathOpt,
        ...config
      } = {}) {
        const newReducerPath = pathOpt ?? reducerPath;
        injectable.inject({
          reducerPath: newReducerPath,
          reducer: reducer2
        }, config);
        return {
          ...slice,
          ...makeSelectorProps(newReducerPath, true)
        };
      }
    };
    return slice;
  };
}
function wrapSelector(selector, selectState, getInitialState, injected) {
  function wrapper(rootState, ...args) {
    let sliceState = selectState(rootState);
    if (typeof sliceState === "undefined") {
      if (injected) {
        sliceState = getInitialState();
      } else if (true) {
        throw new Error(false ? formatProdErrorMessage(16) : "selectState returned undefined for an uninjected slice reducer");
      }
    }
    return selector(sliceState, ...args);
  }
  wrapper.unwrapped = selector;
  return wrapper;
}
var createSlice = /* @__PURE__ */ buildCreateSlice();
function buildReducerCreators() {
  function asyncThunk(payloadCreator, config) {
    return {
      _reducerDefinitionType: "asyncThunk",
      payloadCreator,
      ...config
    };
  }
  asyncThunk.withTypes = () => asyncThunk;
  return {
    reducer(caseReducer) {
      return Object.assign({
        // hack so the wrapping function has the same name as the original
        // we need to create a wrapper so the `reducerDefinitionType` is not assigned to the original
        [caseReducer.name](...args) {
          return caseReducer(...args);
        }
      }[caseReducer.name], {
        _reducerDefinitionType: "reducer"
        /* reducer */
      });
    },
    preparedReducer(prepare, reducer2) {
      return {
        _reducerDefinitionType: "reducerWithPrepare",
        prepare,
        reducer: reducer2
      };
    },
    asyncThunk
  };
}
function handleNormalReducerDefinition({
  type,
  reducerName,
  createNotation
}, maybeReducerWithPrepare, context) {
  let caseReducer;
  let prepareCallback;
  if ("reducer" in maybeReducerWithPrepare) {
    if (createNotation && !isCaseReducerWithPrepareDefinition(maybeReducerWithPrepare)) {
      throw new Error(false ? formatProdErrorMessage(17) : "Please use the `create.preparedReducer` notation for prepared action creators with the `create` notation.");
    }
    caseReducer = maybeReducerWithPrepare.reducer;
    prepareCallback = maybeReducerWithPrepare.prepare;
  } else {
    caseReducer = maybeReducerWithPrepare;
  }
  context.addCase(type, caseReducer).exposeCaseReducer(reducerName, caseReducer).exposeAction(reducerName, prepareCallback ? createAction(type, prepareCallback) : createAction(type));
}
function isAsyncThunkSliceReducerDefinition(reducerDefinition) {
  return reducerDefinition._reducerDefinitionType === "asyncThunk";
}
function isCaseReducerWithPrepareDefinition(reducerDefinition) {
  return reducerDefinition._reducerDefinitionType === "reducerWithPrepare";
}
function handleThunkCaseReducerDefinition({
  type,
  reducerName
}, reducerDefinition, context, cAT) {
  if (!cAT) {
    throw new Error(false ? formatProdErrorMessage(18) : "Cannot use `create.asyncThunk` in the built-in `createSlice`. Use `buildCreateSlice({ creators: { asyncThunk: asyncThunkCreator } })` to create a customised version of `createSlice`.");
  }
  const {
    payloadCreator,
    fulfilled,
    pending,
    rejected,
    settled,
    options
  } = reducerDefinition;
  const thunk2 = cAT(type, payloadCreator, options);
  context.exposeAction(reducerName, thunk2);
  if (fulfilled) {
    context.addCase(thunk2.fulfilled, fulfilled);
  }
  if (pending) {
    context.addCase(thunk2.pending, pending);
  }
  if (rejected) {
    context.addCase(thunk2.rejected, rejected);
  }
  if (settled) {
    context.addMatcher(thunk2.settled, settled);
  }
  context.exposeCaseReducer(reducerName, {
    fulfilled: fulfilled || noop,
    pending: pending || noop,
    rejected: rejected || noop,
    settled: settled || noop
  });
}
function noop() {
}
var listener = "listener";
var completed = "completed";
var cancelled = "cancelled";
var taskCancelled = `task-${cancelled}`;
var taskCompleted = `task-${completed}`;
var listenerCancelled = `${listener}-${cancelled}`;
var listenerCompleted = `${listener}-${completed}`;
var {
  assign
} = Object;
var alm = "listenerMiddleware";
var addListener = /* @__PURE__ */ assign(/* @__PURE__ */ createAction(`${alm}/add`), {
  withTypes: () => addListener
});
var clearAllListeners = /* @__PURE__ */ createAction(`${alm}/removeAll`);
var removeListener = /* @__PURE__ */ assign(/* @__PURE__ */ createAction(`${alm}/remove`), {
  withTypes: () => removeListener
});

// src/store.ts
var SORT_NONE_OPTION = {
  value: "none",
  label: "Ingen sortering"
};
function createFilterDefaults(maxPrice) {
  return {
    brand: "All",
    model: "All",
    series: "All",
    engine: "All",
    trim: "All",
    location: "All",
    region: "All",
    distance: "All",
    search: "",
    maxPrice: typeof maxPrice === "number" && Number.isFinite(maxPrice) ? String(maxPrice) : "",
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
    registryVerified: "All"
  };
}
function createUiDefaults(maxPrice) {
  return {
    filters: createFilterDefaults(maxPrice),
    sort: {
      sort1: "none",
      sort2: "none",
      sort3: "none"
    },
    view: "list"
  };
}
var initialDataState = {
  status: "loading",
  data: null,
  errorMessage: ""
};
var dataSlice = createSlice({
  name: "data",
  initialState: initialDataState,
  reducers: {
    dataLoaded(state, action) {
      state.status = "ready";
      state.data = action.payload;
      state.errorMessage = "";
    },
    dataFailed(state, action) {
      state.status = "error";
      state.errorMessage = action.payload;
    }
  }
});
function isSortKey(key) {
  return key === "sort1" || key === "sort2" || key === "sort3";
}
function applyFilterPreset(state, preset) {
  for (const [key, value] of Object.entries(preset)) {
    if (value === void 0) continue;
    if (isSortKey(key)) {
      state.sort[key] = String(value);
      continue;
    }
    state.filters[key] = String(value);
  }
}
var uiSlice = createSlice({
  name: "ui",
  initialState: createUiDefaults(),
  reducers: {
    setFilterValue(state, action) {
      state.filters[action.payload.key] = action.payload.value;
    },
    setSortValue(state, action) {
      state.sort[action.payload.key] = action.payload.value;
    },
    setInventoryView(state, action) {
      state.view = action.payload;
    },
    resetUiState(_state, action) {
      return action.payload;
    },
    applyPreset(state, action) {
      applyFilterPreset(state, action.payload);
    }
  }
});
var reducer = {
  data: dataSlice.reducer,
  ui: uiSlice.reducer
};
function createAppStore() {
  return configureStore({
    reducer
  });
}
var { dataLoaded, dataFailed } = dataSlice.actions;
var { setFilterValue, setSortValue, setInventoryView, resetUiState, applyPreset } = uiSlice.actions;
function selectMaxPriceDefault(state) {
  const value = state.data.data?.meta?.maxPrice;
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}
function selectSortOptions(state) {
  const options = state.data.data?.filters.sortOptions ?? [];
  return options.some((option) => option.value === SORT_NONE_OPTION.value) ? options : [SORT_NONE_OPTION, ...options];
}
function toInventoryFilters(filters) {
  return {
    brand: filters.brand,
    model: filters.model,
    series: filters.series,
    engine: filters.engine,
    trim: filters.trim,
    location: filters.location,
    region: filters.region,
    distance: filters.distance,
    search: filters.search.trim(),
    maxPrice: parseOptionalNumber(filters.maxPrice),
    maxMileage: parseOptionalNumber(filters.maxMileage),
    fuel: filters.fuel,
    gearbox: filters.gearbox,
    seller: filters.seller,
    body: filters.body,
    risk: filters.risk,
    riskStatus: filters.riskStatus,
    serviceDue: filters.serviceDue,
    serviceCost: filters.serviceCost,
    priceBucket: filters.priceBucket,
    mileageBucket: filters.mileageBucket,
    ageBucket: filters.ageBucket,
    ownersBucket: filters.ownersBucket,
    pricePerMilBucket: filters.pricePerMilBucket,
    debtStatus: filters.debtStatus,
    registryVerified: filters.registryVerified
  };
}
function selectSortValues(state) {
  return dedupeSortValues([state.ui.sort.sort1, state.ui.sort.sort2, state.ui.sort.sort3]);
}
function selectInventoryResult(state) {
  const data = state.data.data;
  if (!data) return null;
  return queryInventory(data.inventory, toInventoryFilters(state.ui.filters), selectSortValues(state));
}

// src/app.ts
var DATA_URL = "processed-data.json";
var PAGE_TITLE = "Bilar";
function must(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Saknar element: #${id}`);
  }
  return element;
}
var elements = {
  shortcutRoot: must("shortcut-root"),
  viewCards: must("view-cards"),
  viewList: must("view-list"),
  status: must("page-status"),
  brand: must("brand"),
  model: must("model"),
  series: must("series"),
  engine: must("engine"),
  trim: must("trim"),
  location: must("location"),
  region: must("region"),
  distance: must("distance"),
  search: must("search"),
  maxPrice: must("max-price"),
  maxMileage: must("max-mileage"),
  fuel: must("fuel"),
  gearbox: must("gearbox"),
  seller: must("seller"),
  body: must("body"),
  risk: must("risk"),
  riskStatus: must("risk-status"),
  serviceDue: must("service-due"),
  serviceCost: must("service-cost"),
  priceBucket: must("price-bucket"),
  mileageBucket: must("mileage-bucket"),
  ageBucket: must("age-bucket"),
  ownersBucket: must("owners-bucket"),
  pricePerMilBucket: must("price-per-mil-bucket"),
  debtStatus: must("debt-status"),
  registryVerified: must("registry-verified"),
  sort1: must("sort-1"),
  sort2: must("sort-2"),
  sort3: must("sort-3"),
  reset: must("reset-filters"),
  resultsSummary: must("results-summary"),
  inventoryBody: must("inventory-body")
};
var filterSelectControls = [
  { key: "brand", control: elements.brand },
  { key: "model", control: elements.model },
  { key: "series", control: elements.series },
  { key: "engine", control: elements.engine },
  { key: "trim", control: elements.trim },
  { key: "location", control: elements.location },
  { key: "region", control: elements.region },
  { key: "distance", control: elements.distance },
  { key: "fuel", control: elements.fuel },
  { key: "gearbox", control: elements.gearbox },
  { key: "seller", control: elements.seller },
  { key: "body", control: elements.body },
  { key: "risk", control: elements.risk },
  { key: "riskStatus", control: elements.riskStatus },
  { key: "serviceDue", control: elements.serviceDue },
  { key: "serviceCost", control: elements.serviceCost },
  { key: "priceBucket", control: elements.priceBucket },
  { key: "mileageBucket", control: elements.mileageBucket },
  { key: "ageBucket", control: elements.ageBucket },
  { key: "ownersBucket", control: elements.ownersBucket },
  { key: "pricePerMilBucket", control: elements.pricePerMilBucket },
  { key: "debtStatus", control: elements.debtStatus },
  { key: "registryVerified", control: elements.registryVerified }
];
var textFilterControls = [
  { key: "search", control: elements.search },
  { key: "maxPrice", control: elements.maxPrice },
  { key: "maxMileage", control: elements.maxMileage }
];
var sortControls = [
  { key: "sort1", control: elements.sort1 },
  { key: "sort2", control: elements.sort2 },
  { key: "sort3", control: elements.sort3 }
];
function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function badgeClass(risk) {
  const normalizedRisk = String(risk || "unrated").toLowerCase();
  return `badge badge-${normalizedRisk === "unknown" ? "unrated" : normalizedRisk}`;
}
function riskLabel(risk) {
  switch (risk) {
    case "Lower":
      return "L\xE5g";
    case "Medium":
      return "Mellan";
    case "Higher":
      return "H\xF6g";
    case "Avoid":
      return "Undvik";
    case "Unrated":
    case "Unknown":
      return "Ej bed\xF6md";
    default:
      return risk;
  }
}
function serviceDueLabel(value) {
  switch (value) {
    case "Now":
      return "Nu";
    case "Soon":
      return "Snart";
    case "Later":
      return "Senare";
    case "Unknown":
      return "Ok\xE4nt";
    default:
      return value;
  }
}
function debtLabel(value) {
  switch (value) {
    case "Yes":
      return "Ja";
    case "No":
      return "Nej";
    default:
      return "Ok\xE4nt";
  }
}
function registryLabel(value) {
  return value ? "Bekr\xE4ftad" : "Ej bekr\xE4ftad";
}
function riskStatusLabel(value) {
  switch (value) {
    case "known":
      return "Bed\xF6md";
    case "unknown":
      return "Ej bed\xF6md";
    default:
      return "Alla";
  }
}
function pricePerMilLabel(value) {
  if (value == null || !Number.isFinite(value)) return "Ok\xE4nt";
  return `${String(value).replace(".", ",")} kr/mil`;
}
function formatValue(value) {
  if (value === null || value === void 0 || value === "") return "\u2014";
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  return String(value);
}
function renderFieldGroup(title, rows) {
  return `
    <section class="field-group">
      <h4>${escapeHtml(title)}</h4>
      <dl class="field-list">
        ${rows.map(
    ([label, value]) => `
              <div class="field-row">
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(formatValue(value))}</dd>
              </div>
            `
  ).join("")}
      </dl>
    </section>
  `;
}
function renderItemDetails(item) {
  const projected = projectInventoryItem(item);
  return `
    <details class="item-details">
      <summary>F\xE4lt</summary>
      <div class="field-groups">
        ${renderFieldGroup("Modell", [
    ["M\xE4rke", projected.brand],
    ["Modell", projected.modelName],
    ["Serie", projected.modelSeries],
    ["Motor", projected.engine],
    ["Trim", projected.trim],
    ["V\xE4xell\xE5da detalj", projected.gearboxDetail]
  ])}
        ${renderFieldGroup("Analys", [
    ["Risk bed\xF6md", projected.riskKnown],
    ["Prisintervall", projected.priceBucket],
    ["Miltalshink", projected.mileageBucket],
    ["\xC5lder", projected.age],
    ["\xC5ldershink", projected.ageBucket],
    ["\xC4garhink", projected.ownersBucket],
    ["Service", projected.serviceDueLevel],
    ["Kostnadshink", projected.serviceCostBucket],
    ["Pris per mil", pricePerMilLabel(projected.pricePerMil)],
    ["Pris/mil-hink", projected.pricePerMilBucket],
    ["Skuld", debtLabel(projected.debtStatus)],
    ["Register", registryLabel(projected.registryVerified)]
  ])}
        ${renderFieldGroup("K\xE4lla", [
    ["Modell r\xE5", item.source?.modelRaw],
    ["Trim r\xE5", item.source?.trimRaw],
    ["Pris r\xE5", item.source?.priceRaw],
    ["Miltal r\xE5", item.source?.mileageRaw],
    ["\xC5r r\xE5", item.source?.yearRaw],
    ["Drivmedel r\xE5", item.source?.fuelRaw],
    ["V\xE4xell\xE5da r\xE5", item.source?.gearboxRaw],
    ["Kaross r\xE5", item.source?.bodyRaw],
    ["Ort r\xE5", item.source?.locationRaw],
    ["S\xE4ljare r\xE5", item.source?.sellerRaw],
    ["\xC4gare r\xE5", item.source?.ownersRaw],
    ["Risk r\xE5", item.source?.riskRaw],
    ["Service r\xE5", item.source?.serviceDueRaw],
    ["Kostnad r\xE5", item.source?.serviceCostRaw],
    ["Reg r\xE5", item.source?.regRaw],
    ["Skuld r\xE5", item.source?.debtRaw],
    ["Registerr\xE5d", item.source?.registryNoteRaw]
  ])}
        ${renderFieldGroup("Noteringar", [
    ["Risknot", item.riskNote],
    ["Forum", item.forumWatchouts]
  ])}
      </div>
    </details>
  `;
}
function displayFromItem(item) {
  const projected = projectInventoryItem(item);
  return {
    name: item.display?.name ?? item.model,
    version: item.display?.version ?? item.trim ?? projected.trim,
    engine: item.display?.engine ?? projected.engine,
    price: item.display?.price ?? item.price,
    mileage: item.display?.mileage ?? item.mileage,
    year: item.display?.year ?? item.year,
    fuel: item.display?.fuel ?? projected.fuel,
    gearbox: item.display?.gearbox ?? projected.gearboxDriveability,
    body: item.display?.body ?? projected.bodyType,
    location: item.display?.location ?? projected.location,
    region: item.display?.region ?? projected.region,
    distance: item.display?.distance ?? projected.distanceBucketFromUppsala,
    seller: item.display?.seller ?? projected.sellerType,
    owners: item.display?.owners ?? item.owners,
    risk: item.display?.risk ?? riskLabel(projected.risk ?? "Unknown"),
    serviceDue: item.display?.serviceDue ?? "Ok\xE4nt",
    serviceCost: item.display?.serviceCost ?? "Ok\xE4nt",
    reg: item.display?.reg ?? item.reg
  };
}
function populateSelect(select, values, selectedValue = "All", includeAll = true) {
  const options = [];
  if (includeAll) {
    options.push('<option value="All">Alla</option>');
  }
  for (const value of values) {
    if (typeof value === "string") {
      const label = select.id === "risk" ? riskLabel(value) : select.id === "service-due" ? serviceDueLabel(value) : select.id === "risk-status" ? riskStatusLabel(value) : select.id === "debt-status" ? debtLabel(value) : select.id === "registry-verified" ? registryLabel(value === "true") : value;
      options.push(`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`);
    } else {
      options.push(`<option value="${escapeHtml(value.value)}">${escapeHtml(value.label)}</option>`);
    }
  }
  select.innerHTML = options.join("");
  select.value = selectedValue;
  if (!Array.from(select.options).some((option) => option.value === select.value)) {
    select.value = includeAll ? "All" : select.options[0]?.value ?? "";
  }
}
function optionDisplayLabel(selectId, value, count) {
  const base = selectId === "risk" ? riskLabel(value) : selectId === "service-due" ? serviceDueLabel(value) : selectId === "risk-status" ? riskStatusLabel(value) : selectId === "debt-status" ? debtLabel(value) : selectId === "registry-verified" ? registryLabel(value === "true") : value;
  return count === 0 ? `${base} (0)` : base;
}
function populateFilterSelect(select, options, selectedValue = "All") {
  const values = options.map((option) => ({
    value: option.value,
    label: optionDisplayLabel(select.id, option.value, option.count)
  }));
  populateSelect(select, values, selectedValue, true);
}
function shortcutDefinitions(maxPriceValue) {
  return [
    {
      id: "prius",
      title: "Prius",
      note: "Bra f\xF6rstaval.",
      values: { brand: "Toyota", model: "Prius", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue }
    },
    {
      id: "jazz",
      title: "Jazz",
      note: "Bra familjeval.",
      values: { brand: "Honda", model: "Jazz", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue }
    },
    {
      id: "city",
      title: "Aygo / 107 / C1",
      note: "Sm\xE5 stadsbilar.",
      values: { search: "Aygo | 107 | C1", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue }
    },
    {
      id: "avoid",
      title: "Undvik",
      note: "Yaris/Auris/207/Polo.",
      values: { search: "Yaris | Auris | 207 | Polo", risk: "Avoid", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue }
    },
    {
      id: "lowmiles",
      title: "L\xE5g mil",
      note: "Visa l\xE4gst mil f\xF6rst.",
      values: { maxMileage: "15000", sort1: "mileage-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue }
    },
    {
      id: "clear",
      title: "Nollst\xE4ll",
      note: "Tillbaka till alla.",
      values: { maxPrice: maxPriceValue, sort1: "none", sort2: "none", sort3: "none" }
    }
  ];
}
function renderShortcuts(store, maxPriceValue) {
  const shortcuts = shortcutDefinitions(maxPriceValue);
  elements.shortcutRoot.innerHTML = `<div class="shortcut-grid">${shortcuts.map(
    (shortcut) => `
        <button class="shortcut-card" type="button" data-shortcut="${shortcut.id}">
          <strong>${escapeHtml(shortcut.title)}</strong>
          <span class="muted">${escapeHtml(shortcut.note)}</span>
        </button>
      `
  ).join("")}</div>`;
  elements.shortcutRoot.querySelectorAll("[data-shortcut]").forEach((button) => {
    const shortcut = shortcuts.find((item) => item.id === button.dataset.shortcut);
    if (!shortcut) return;
    button.addEventListener("click", () => {
      store.dispatch(applyPreset(shortcut.values));
    });
  });
}
function syncInputControls(filters) {
  elements.search.value = filters.search;
  elements.maxPrice.value = filters.maxPrice;
  elements.maxMileage.value = filters.maxMileage;
}
function syncFilterSelects(filters, options) {
  for (const { key, control } of filterSelectControls) {
    populateFilterSelect(control, options[key], filters[key]);
  }
}
function syncSortControls(sort, sortOptions) {
  for (const { key, control } of sortControls) {
    populateSelect(control, sortOptions, sort[key], false);
  }
}
function isFilterActive(key, filters, maxPriceDefault) {
  if (key === "search") {
    return filters.search.trim() !== "";
  }
  if (key === "maxPrice") {
    const value = parseOptionalNumber(filters.maxPrice);
    return value !== null && value !== maxPriceDefault;
  }
  if (key === "maxMileage") {
    return parseOptionalNumber(filters.maxMileage) !== null;
  }
  return filters[key] !== "All";
}
function updateActiveFilterHighlights(filters, sort, maxPriceDefault) {
  for (const { key, control } of filterSelectControls) {
    control.parentElement?.classList.toggle("is-active", isFilterActive(key, filters, maxPriceDefault));
  }
  for (const { key, control } of textFilterControls) {
    control.parentElement?.classList.toggle("is-active", isFilterActive(key, filters, maxPriceDefault));
  }
  for (const { key, control } of sortControls) {
    control.parentElement?.classList.toggle("is-active", sort[key] !== "none");
  }
}
function renderInventoryRows(rows, inventoryView) {
  if (inventoryView === "cards") {
    elements.inventoryBody.className = "car-grid";
    elements.inventoryBody.innerHTML = rows.map((item) => {
      const display = displayFromItem(item);
      const projected = projectInventoryItem(item);
      return `
          <article class="car-card">
            <div class="car-card-header">
              <div>
                <h3>${escapeHtml(display.name)}</h3>
                <div class="muted">${escapeHtml(display.version || "\u2014")}</div>
              </div>
              <span class="${badgeClass(projected.risk ?? "Unknown")}">${escapeHtml(display.risk)}</span>
            </div>
            <div class="car-meta">
              <div><span class="label">\xC5r</span>${escapeHtml(display.year)}</div>
              <div><span class="label">Miltal</span>${escapeHtml(display.mileage)}</div>
              <div><span class="label">Pris</span>${escapeHtml(display.price)}</div>
              <div><span class="label">Drivmedel</span>${escapeHtml(display.fuel)}</div>
              <div><span class="label">V\xE4xell\xE5da</span>${escapeHtml(display.gearbox)}</div>
              <div><span class="label">Ort</span>${escapeHtml(display.location)}</div>
              <div><span class="label">L\xE4n</span>${escapeHtml(display.region)}</div>
              <div><span class="label">Avst\xE5nd</span>${escapeHtml(display.distance)}</div>
              <div><span class="label">S\xE4ljare</span>${escapeHtml(display.seller)}</div>
              <div><span class="label">Kaross</span>${escapeHtml(display.body)}</div>
              <div><span class="label">\xC4gare</span>${escapeHtml(display.owners)}</div>
              <div><span class="label">Service</span>${escapeHtml(display.serviceDue)}</div>
              <div><span class="label">Kostnad</span>${escapeHtml(display.serviceCost)}</div>
              <div><span class="label">Reg</span>${escapeHtml(display.reg)}</div>
              <div><span class="label">L\xE4nk</span><a href="${escapeHtml(item.href)}">Blocket</a></div>
            </div>
            ${renderItemDetails(item)}
          </article>
        `;
    }).join("");
    return;
  }
  elements.inventoryBody.className = "table-wrap";
  elements.inventoryBody.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Modell</th>
          <th>Version</th>
          <th>Risk</th>
          <th>\xC5r</th>
          <th>Miltal</th>
          <th>Pris</th>
          <th>Drivmedel</th>
          <th>V\xE4xell\xE5da</th>
          <th>Ort</th>
          <th>L\xE4n</th>
          <th>Avst\xE5nd</th>
          <th>S\xE4ljare</th>
          <th>Kaross</th>
          <th>\xC4gare</th>
          <th>Service</th>
          <th>Kostnad</th>
          <th>Reg</th>
          <th>F\xE4lt</th>
          <th>L\xE4nk</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((item) => {
    const display = displayFromItem(item);
    const projected = projectInventoryItem(item);
    return `
              <tr>
                <td>${escapeHtml(display.name)}</td>
                <td>${escapeHtml(display.version || "\u2014")}</td>
                <td><span class="${badgeClass(projected.risk ?? "Unknown")}">${escapeHtml(display.risk)}</span></td>
                <td>${escapeHtml(display.year)}</td>
                <td>${escapeHtml(display.mileage)}</td>
                <td>${escapeHtml(display.price)}</td>
                <td>${escapeHtml(display.fuel)}</td>
                <td>${escapeHtml(display.gearbox)}</td>
                <td>${escapeHtml(display.location)}</td>
                <td>${escapeHtml(display.region)}</td>
                <td>${escapeHtml(display.distance)}</td>
                <td>${escapeHtml(display.seller)}</td>
                <td>${escapeHtml(display.body)}</td>
                <td>${escapeHtml(display.owners)}</td>
                <td>${escapeHtml(display.serviceDue)}</td>
                <td>${escapeHtml(display.serviceCost)}</td>
                <td>${escapeHtml(display.reg)}</td>
                <td>${renderItemDetails(item)}</td>
                <td><a href="${escapeHtml(item.href)}">Blocket</a></td>
              </tr>
            `;
  }).join("")}
      </tbody>
    </table>
  `;
}
function render(store) {
  document.title = PAGE_TITLE;
  const state = store.getState();
  if (state.data.status === "error") {
    elements.status.textContent = `Kunde inte l\xE4sa data: ${state.data.errorMessage}`;
    elements.resultsSummary.textContent = "";
    return;
  }
  if (state.data.status !== "ready") {
    elements.status.textContent = "Laddar data...";
    return;
  }
  const result = selectInventoryResult(state);
  if (!result) {
    elements.status.textContent = "Kunde inte l\xE4sa data.";
    return;
  }
  elements.status.textContent = "";
  syncInputControls(state.ui.filters);
  syncFilterSelects(state.ui.filters, result.options);
  syncSortControls(state.ui.sort, selectSortOptions(state));
  renderInventoryRows(result.rows, state.ui.view);
  elements.resultsSummary.textContent = `Visar ${result.filteredCount} av ${result.totalCount} bilar`;
  updateActiveFilterHighlights(state.ui.filters, state.ui.sort, selectMaxPriceDefault(state));
  elements.viewCards.classList.toggle("active", state.ui.view === "cards");
  elements.viewList.classList.toggle("active", state.ui.view === "list");
}
function bindInventoryControls(store) {
  for (const { key, control } of filterSelectControls) {
    control.addEventListener("change", () => {
      store.dispatch(setFilterValue({ key, value: control.value }));
    });
  }
  for (const { key, control } of textFilterControls) {
    control.addEventListener("input", () => {
      store.dispatch(setFilterValue({ key, value: control.value }));
    });
    control.addEventListener("change", () => {
      store.dispatch(setFilterValue({ key, value: control.value }));
    });
  }
  for (const { key, control } of sortControls) {
    control.addEventListener("change", () => {
      store.dispatch(setSortValue({ key, value: control.value }));
    });
  }
  elements.reset.addEventListener("click", () => {
    store.dispatch(resetUiState(createUiDefaults(selectMaxPriceDefault(store.getState()))));
  });
  elements.viewCards.addEventListener("click", () => {
    store.dispatch(setInventoryView("cards"));
  });
  elements.viewList.addEventListener("click", () => {
    store.dispatch(setInventoryView("list"));
  });
}
async function loadData() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}
async function init() {
  const store = createAppStore();
  store.subscribe(() => render(store));
  bindInventoryControls(store);
  render(store);
  try {
    const data = await loadData();
    store.dispatch(dataLoaded(data));
    store.dispatch(resetUiState(createUiDefaults(data.meta?.maxPrice)));
    renderShortcuts(store, typeof data.meta?.maxPrice === "number" ? String(data.meta.maxPrice) : "");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    store.dispatch(dataFailed(message));
  }
}
void init();
