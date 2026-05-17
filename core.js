const MULTI_WORD_BRANDS = [
    "Alfa Romeo",
    "Land Rover",
];
const PRICE_BUCKETS = [
    { max: 50000, label: "<=50k" },
    { max: 100000, label: "50-100k" },
    { max: 200000, label: "100-200k" },
    { max: Number.POSITIVE_INFINITY, label: ">200k" },
];
const MILEAGE_BUCKETS = [
    { max: 10000, label: "<=10k" },
    { max: 20000, label: "10-20k" },
    { max: 40000, label: "20-40k" },
    { max: Number.POSITIVE_INFINITY, label: ">40k" },
];
const AGE_BUCKETS = [
    { max: 5, label: "<=5 år" },
    { max: 10, label: "5-10 år" },
    { max: 20, label: "10-20 år" },
    { max: Number.POSITIVE_INFINITY, label: ">20 år" },
];
const OWNERS_BUCKETS = [
    { max: 1, label: "1" },
    { max: 2, label: "2" },
    { max: 3, label: "3" },
    { max: 4, label: "4" },
    { max: 5, label: "5" },
    { max: 7, label: "6-7" },
    { max: 10, label: "8-10" },
    { max: Number.POSITIVE_INFINITY, label: "11+" },
];
const PRICE_PER_MIL_BUCKETS = [
    { max: 1.5, label: "<=1,5 kr/mil" },
    { max: 2.5, label: "1,5-2,5 kr/mil" },
    { max: 5, label: "2,5-5 kr/mil" },
    { max: Number.POSITIVE_INFINITY, label: ">5 kr/mil" },
];
const DISTANCE_BUCKET_ORDER = ["0-25 km", "25-50 km", "50-100 km", "100-200 km", "200+ km", "Okänt"];
const PRICE_BUCKET_ORDER = ["<=50k", "50-100k", "100-200k", ">200k", "Okänt"];
const MILEAGE_BUCKET_ORDER = ["<=10k", "10-20k", "20-40k", ">40k", "Okänt"];
const AGE_BUCKET_ORDER = ["<=5 år", "5-10 år", "10-20 år", ">20 år", "Okänt"];
const OWNERS_BUCKET_ORDER = ["1", "2", "3", "4", "5", "6-7", "8-10", "11+", "Okänt"];
const PRICE_PER_MIL_BUCKET_ORDER = [
    "<=1,5 kr/mil",
    "1,5-2,5 kr/mil",
    "2,5-5 kr/mil",
    ">5 kr/mil",
    "Okänt",
];
const DEBT_STATUS_ORDER = ["No", "Yes", "Unknown"];
const collator = new Intl.Collator("sv", { sensitivity: "base" });
const INVENTORY_SELECT_FILTER_KEYS = [
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
    "registryVerified",
];
function bucketLabel(value, ranges, unknownLabel = "Okänt") {
    if (value == null || !Number.isFinite(value))
        return unknownLabel;
    for (const range of ranges) {
        if (value <= range.max)
            return range.label;
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
    if (aValue == null && bValue == null)
        return 0;
    if (aValue == null)
        return 1;
    if (bValue == null)
        return -1;
    return descending ? bValue - aValue : aValue - bValue;
}
function compareProjectedText(aValue, bValue, descending = false) {
    return descending ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
}
function parseBucketNumber(value) {
    const normalizedValue = String(value);
    const matches = normalizedValue.match(/\d+(?:[ .,\u00a0]\d+)*/g);
    if (!matches?.length)
        return Number.POSITIVE_INFINITY;
    const token = normalizedValue.includes("-") && matches.length > 1 ? matches[matches.length - 1] : matches[0];
    const normalized = token.replace(/[ .\u00a0]/g, "").replace(",", ".");
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed))
        return Number.POSITIVE_INFINITY;
    return normalizedValue.trim().startsWith(">") ? parsed + 1 : parsed;
}
function compareDynamicBucketValues(aValue, bValue, descending = false) {
    const a = String(aValue || "Okänt");
    const b = String(bValue || "Okänt");
    if (a === "Okänt" && b === "Okänt")
        return 0;
    if (a === "Okänt")
        return 1;
    if (b === "Okänt")
        return -1;
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
export function pricePerMilBucket(value) {
    return bucketLabel(value, PRICE_PER_MIL_BUCKETS);
}
export function projectInventoryItem(item) {
    const fallbackSplit = item.brand && item.modelName ? { brand: item.brand, modelName: item.modelName } : parseBrandModel(item.model);
    const brand = item.canonical?.brand ?? fallbackSplit.brand;
    const modelName = item.canonical?.modelName ?? fallbackSplit.modelName;
    const priceNum = item.canonical?.priceNum ?? (Number.isFinite(item.priceNum) ? item.priceNum : null);
    const mileageMil = item.canonical?.mileageMil ?? (Number.isFinite(item.mileageMil) ? item.mileageMil : null);
    const yearNum = item.canonical?.yearNum ?? (Number.isFinite(item.yearNum) ? item.yearNum : null);
    const ownersNum = item.canonical?.ownersNum ?? (typeof item.ownersNum === "number" && Number.isFinite(item.ownersNum) ? item.ownersNum : null);
    const age = item.derived?.age ?? (yearNum == null ? null : new Date().getFullYear() - yearNum);
    const pricePerMil = item.derived?.pricePerMil ??
        (priceNum == null || mileageMil == null || mileageMil <= 0 ? null : Math.round((priceNum / mileageMil) * 100) / 100);
    const risk = item.canonical?.risk ?? (item.risk === "Unrated" || item.risk === "Unknown" ? null : item.risk || null);
    return {
        brand,
        modelName,
        modelSeries: item.canonical?.modelSeries ?? "Okänt",
        engine: item.canonical?.engine ?? "Okänt",
        trim: item.canonical?.trim ?? item.trim ?? "Okänt",
        priceNum,
        mileageMil,
        yearNum,
        age,
        fuel: item.canonical?.fuel ?? item.fuel,
        gearboxDriveability: item.canonical?.gearboxDriveability ?? item.gearbox,
        gearboxDetail: item.canonical?.gearboxDetail ?? "Okänt",
        bodyType: item.canonical?.bodyType ?? item.body,
        location: item.canonical?.location ?? item.location,
        region: item.canonical?.region ?? "Okänt län",
        distanceBucketFromUppsala: item.canonical?.distanceBucketFromUppsala ?? "Okänt",
        sellerType: item.canonical?.sellerType ?? item.seller,
        ownersNum,
        risk,
        riskKnown: item.canonical?.riskKnown ?? (item.risk !== "Unrated" && item.risk !== "Unknown"),
        serviceDueLevel: item.canonical?.serviceDueLevel ?? "Unknown",
        serviceCostMin: item.canonical?.serviceCostMin ?? null,
        serviceCostBucket: item.canonical?.serviceCostBucket ?? "Okänt",
        regNormalized: item.canonical?.regNormalized ?? item.reg ?? "Okänt",
        debtStatus: item.canonical?.debtStatus ?? "Unknown",
        registryVerified: item.canonical?.registryVerified ?? false,
        priceBucket: item.derived?.priceBucket ?? bucketLabel(priceNum, PRICE_BUCKETS),
        mileageBucket: item.derived?.mileageBucket ?? bucketLabel(mileageMil, MILEAGE_BUCKETS),
        ageBucket: item.derived?.ageBucket ?? bucketLabel(age, AGE_BUCKETS),
        ownersBucket: item.derived?.ownersBucket ?? bucketLabel(ownersNum, OWNERS_BUCKETS),
        pricePerMil,
        pricePerMilBucket: item.derived?.pricePerMilBucket ?? pricePerMilBucket(pricePerMil),
    };
}
export function normalizeText(value) {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}
export function parseSearchQuery(query) {
    return normalizeText(query)
        .split("|")
        .map((group) => group.trim())
        .filter(Boolean)
        .map((group) => group.split(/\s+/).filter(Boolean));
}
export function parseOptionalNumber(value) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed)
        return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
}
export function parseBrandModel(modelValue) {
    const clean = String(modelValue ?? "").trim().replace(/\s+/g, " ");
    if (!clean)
        return { brand: "Okänd", modelName: "Okänd" };
    const normalized = normalizeText(clean);
    for (const multiWordBrand of MULTI_WORD_BRANDS) {
        const normalizedBrand = normalizeText(multiWordBrand);
        if (normalized === normalizedBrand || normalized.startsWith(`${normalizedBrand} `)) {
            const modelName = clean.slice(multiWordBrand.length).trim();
            return {
                brand: multiWordBrand,
                modelName: modelName || clean,
            };
        }
    }
    const [brand, ...rest] = clean.split(/\s+/);
    return {
        brand,
        modelName: rest.length ? rest.join(" ") : clean,
    };
}
export function matchesSearch(item, tokenGroups) {
    if (!tokenGroups.length)
        return true;
    if (item.searchableText) {
        const haystack = normalizeText(item.searchableText);
        return tokenGroups.some((tokens) => tokens.every((token) => haystack.includes(token)));
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
        item.forumWatchouts,
    ]
        .map(normalizeText)
        .join(" ");
    return tokenGroups.some((tokens) => tokens.every((token) => haystack.includes(token)));
}
export function compareText(a, b, key, descending = false) {
    const aValue = String(a[key] ?? "");
    const bValue = String(b[key] ?? "");
    return descending ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
}
export function compareNumber(a, b, key, descending = false) {
    const aValue = Number(a[key] ?? 0);
    const bValue = Number(b[key] ?? 0);
    return descending ? bValue - aValue : aValue - bValue;
}
export function riskRank(risk) {
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
export function compareRisk(a, b, descending = false) {
    const aRank = riskRank(a.canonical?.risk ?? a.risk);
    const bRank = riskRank(b.canonical?.risk ?? b.risk);
    if (aRank === null && bRank === null)
        return 0;
    if (aRank === null)
        return 1;
    if (bRank === null)
        return -1;
    return descending ? bRank - aRank : aRank - bRank;
}
export function serviceCostRank(value) {
    const match = String(value || "").match(/\d+(?:[.,]\d+)?\s*k?/i);
    if (!match)
        return Number.POSITIVE_INFINITY;
    const raw = match[0].toLowerCase().replace(",", ".");
    const numeric = parseFloat(raw);
    return Number.isNaN(numeric) ? Number.POSITIVE_INFINITY : numeric * (raw.includes("k") ? 1000 : 1);
}
export function serviceDueRank(value) {
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
export function dedupeSortValues(values) {
    const deduped = [];
    const seen = new Set();
    for (const value of values) {
        if (!value || value === "none" || seen.has(value))
            continue;
        seen.add(value);
        deduped.push(value);
    }
    return deduped;
}
export function compareField(a, b, sortValue) {
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
            return compareOrderedValues(projectedA.distanceBucketFromUppsala, projectedB.distanceBucketFromUppsala, DISTANCE_BUCKET_ORDER, true);
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
export function compareItems(a, b, sortValues) {
    for (const sortValue of sortValues) {
        const result = compareField(a, b, sortValue);
        if (Number.isFinite(result) && result !== 0)
            return result;
    }
    return a.priceNum - b.priceNum || a.model.localeCompare(b.model);
}
function matchesSelectFilter(selected, actual) {
    return !selected || selected === "All" || actual === selected;
}
export function matchesInventoryFilters(item, filters, excludedKey) {
    const projected = projectInventoryItem(item);
    const tokenGroups = parseSearchQuery(filters.search ?? "");
    const riskStatus = filters.riskStatus ?? "All";
    const registryVerified = filters.registryVerified ?? "All";
    return ((excludedKey === "brand" || matchesSelectFilter(filters.brand, projected.brand)) &&
        (excludedKey === "model" || matchesSelectFilter(filters.model, projected.modelName)) &&
        (excludedKey === "series" || matchesSelectFilter(filters.series, projected.modelSeries)) &&
        (excludedKey === "engine" || matchesSelectFilter(filters.engine, projected.engine)) &&
        (excludedKey === "trim" || matchesSelectFilter(filters.trim, projected.trim)) &&
        (excludedKey === "location" || matchesSelectFilter(filters.location, projected.location)) &&
        (excludedKey === "region" || matchesSelectFilter(filters.region, projected.region)) &&
        (excludedKey === "distance" || matchesSelectFilter(filters.distance, projected.distanceBucketFromUppsala)) &&
        matchesSearch(item, tokenGroups) &&
        (filters.maxPrice == null || (projected.priceNum != null && projected.priceNum <= filters.maxPrice)) &&
        (filters.maxMileage == null || (projected.mileageMil != null && projected.mileageMil <= filters.maxMileage)) &&
        (excludedKey === "fuel" || matchesSelectFilter(filters.fuel, projected.fuel)) &&
        (excludedKey === "gearbox" || matchesSelectFilter(filters.gearbox, projected.gearboxDriveability)) &&
        (excludedKey === "seller" || matchesSelectFilter(filters.seller, projected.sellerType)) &&
        (excludedKey === "body" || matchesSelectFilter(filters.body, projected.bodyType)) &&
        (excludedKey === "risk" || matchesSelectFilter(filters.risk, projected.risk ?? "Unknown")) &&
        (excludedKey === "riskStatus" ||
            riskStatus === "All" ||
            (riskStatus === "known" && projected.riskKnown) ||
            (riskStatus === "unknown" && !projected.riskKnown)) &&
        (excludedKey === "serviceDue" || matchesSelectFilter(filters.serviceDue, projected.serviceDueLevel)) &&
        (excludedKey === "serviceCost" || matchesSelectFilter(filters.serviceCost, projected.serviceCostBucket)) &&
        (excludedKey === "priceBucket" || matchesSelectFilter(filters.priceBucket, projected.priceBucket)) &&
        (excludedKey === "mileageBucket" || matchesSelectFilter(filters.mileageBucket, projected.mileageBucket)) &&
        (excludedKey === "ageBucket" || matchesSelectFilter(filters.ageBucket, projected.ageBucket)) &&
        (excludedKey === "ownersBucket" || matchesSelectFilter(filters.ownersBucket, projected.ownersBucket)) &&
        (excludedKey === "pricePerMilBucket" || matchesSelectFilter(filters.pricePerMilBucket, projected.pricePerMilBucket)) &&
        (excludedKey === "debtStatus" || matchesSelectFilter(filters.debtStatus, projected.debtStatus)) &&
        (excludedKey === "registryVerified" ||
            registryVerified === "All" ||
            (registryVerified === "true" && projected.registryVerified) ||
            (registryVerified === "false" && !projected.registryVerified)));
}
export function filterAndSortInventory(items, filters, sortValues) {
    return items.filter((item) => matchesInventoryFilters(item, filters)).sort((a, b) => compareItems(a, b, sortValues));
}
function buildInventoryFilterOptions(items, filters) {
    const options = {};
    for (const key of INVENTORY_SELECT_FILTER_KEYS) {
        const counts = new Map();
        for (const item of items) {
            if (!matchesInventoryFilters(item, filters, key))
                continue;
            const value = getInventoryFilterValue(projectInventoryItem(item), key);
            counts.set(value, (counts.get(value) ?? 0) + 1);
        }
        const selectedValue = filters[key];
        if (selectedValue && selectedValue !== "All" && !counts.has(selectedValue)) {
            counts.set(selectedValue, 0);
        }
        options[key] = [...counts.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => compareFilterOptionValues(key, a.value, b.value));
    }
    return options;
}
export function queryInventory(items, filters, sortValues) {
    const rows = filterAndSortInventory(items, filters, sortValues);
    return {
        rows,
        totalCount: items.length,
        filteredCount: rows.length,
        options: buildInventoryFilterOptions(items, filters),
    };
}
