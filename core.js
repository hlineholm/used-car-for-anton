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
    const clean = String(modelValue ?? "").trim();
    if (!clean)
        return { brand: "Unknown", modelName: "Unknown" };
    const [brand, ...rest] = clean.split(/\s+/);
    return {
        brand,
        modelName: rest.length ? rest.join(" ") : clean,
    };
}
export function matchesSearch(item, tokenGroups) {
    if (!tokenGroups.length)
        return true;
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
    const aRank = riskRank(a.risk);
    const bRank = riskRank(b.risk);
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
    switch (sortValue) {
        case "price-desc":
            return compareNumber(a, b, "priceNum", true);
        case "mileage-asc":
            return compareNumber(a, b, "mileageMil");
        case "mileage-desc":
            return compareNumber(a, b, "mileageMil", true);
        case "year-desc":
            return compareNumber(a, b, "yearNum", true);
        case "year-asc":
            return compareNumber(a, b, "yearNum");
        case "owners-asc":
            return compareNumber(a, b, "ownersNum");
        case "owners-desc":
            return compareNumber(a, b, "ownersNum", true);
        case "model-asc":
            return compareText(a, b, "model");
        case "model-desc":
            return compareText(a, b, "model", true);
        case "trim-asc":
            return compareText(a, b, "trim");
        case "trim-desc":
            return compareText(a, b, "trim", true);
        case "location-asc":
            return compareText(a, b, "location");
        case "location-desc":
            return compareText(a, b, "location", true);
        case "fuel-asc":
            return compareText(a, b, "fuel");
        case "fuel-desc":
            return compareText(a, b, "fuel", true);
        case "seller-asc":
            return compareText(a, b, "seller");
        case "seller-desc":
            return compareText(a, b, "seller", true);
        case "body-asc":
            return compareText(a, b, "body");
        case "body-desc":
            return compareText(a, b, "body", true);
        case "risk-asc":
        case "risk-best":
            return compareRisk(a, b, false);
        case "risk-desc":
        case "risk-worst":
            return compareRisk(a, b, true);
        case "service-due-asc":
            return compareText(a, b, "serviceDue");
        case "service-due-desc":
            return compareText(a, b, "serviceDue", true);
        case "service-cost-asc":
            return serviceCostRank(a.serviceCost) - serviceCostRank(b.serviceCost);
        case "service-cost-desc":
            return serviceCostRank(b.serviceCost) - serviceCostRank(a.serviceCost);
        case "reg-asc":
            return compareText(a, b, "reg");
        case "reg-desc":
            return compareText(a, b, "reg", true);
        case "price-asc":
            return compareNumber(a, b, "priceNum");
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
