const fs = require("fs");
const path = require("path");

const inPath = path.resolve(__dirname, "..", "data.json");
const outDir = path.resolve(__dirname, "..", "dist");
const distOutPath = path.join(outDir, "processed-data.json");
const rootOutPath = path.resolve(__dirname, "..", "processed-data.json");

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const MULTI_WORD_BRANDS = ["Alfa Romeo", "Land Rover"];
const MODEL_SERIES_BY_BRAND = {
  "Land Rover": ["Discovery", "Freelander", "Range Rover"],
};
const ENGINE_WORDS = new Set(
  [
    "awd",
    "bioflex",
    "boxer",
    "cdi",
    "crdi",
    "cvt",
    "d",
    "d-4d",
    "dci",
    "ecoboost",
    "fsi",
    "gdi",
    "hdi",
    "hybrid",
    "i-vtec",
    "mpi",
    "tdi",
    "tdv6",
    "tfsi",
    "tsi",
    "v6",
    "v8",
    "vvt-i",
  ].map((word) => word.toLowerCase()),
);
const ENGINE_TRIM_PREFIXES = new Set(["cabriolet", "coupe", "coupé", "halvkombi", "kombi", "sedan", "suv", "variant"]);

const COUNTY_LOCATIONS = {
  "Dalarnas län": [
    "Avesta",
    "Bjursås",
    "Borlänge",
    "By Kyrkby",
    "Djurås",
    "Falun",
    "Grangärde",
    "Hedemora",
    "Horndal",
    "Krylbo",
    "Leksand",
    "Linghed",
    "Ludvika",
    "Mockfjärd",
    "Nås",
    "Nyhammar",
    "Rättvik",
    "Stjärnsund",
    "Svärdsjö",
    "Säter",
    "Söderbärke",
  ],
  "Gävleborgs län": [
    "Arbrå",
    "Bollnäs",
    "Furuvik",
    "Gävle",
    "Hofors",
    "Kungsgården",
    "Ljusne",
    "Sandviken",
    "Storvik",
    "Söderala",
    "Söderhamn",
    "Torsåker",
    "Valbo",
    "Åshammar",
  ],
  "Stockholms län": [
    "Arlandastad",
    "Bagarmossen",
    "Bandhagen",
    "Brandbergen",
    "Bro",
    "Bromma",
    "Danderyd",
    "Ekerö",
    "Enskede",
    "Enskede Gård",
    "Enskededalen",
    "Farsta",
    "Furusund",
    "Gottröra",
    "Gräddö",
    "Grödinge",
    "Hallstavik",
    "Handen",
    "Haninge",
    "Huddinge",
    "Hägersten",
    "Hässelby",
    "Hölö",
    "Ingarö",
    "Johanneshov",
    "Jordbro",
    "Järfälla",
    "Järna",
    "Kista",
    "Kungsängen",
    "Lidingö",
    "Märsta",
    "Nacka",
    "Norra Sorunda",
    "Norrtälje",
    "Norsborg",
    "Nykvarn",
    "Nynäshamn",
    "Riala",
    "Rosersberg",
    "Rönninge",
    "Rö",
    "Saltsjö-Boo",
    "Saltsjöbaden",
    "Segeltorp",
    "Sigtuna",
    "Skogås",
    "Skärholmen",
    "Sköndal",
    "Sollentuna",
    "Solna",
    "Sorunda",
    "Spånga",
    "Stavsnäs",
    "Stenhamra",
    "Stockholm",
    "Sundbyberg",
    "Tullinge",
    "Tumba",
    "Tungelsta",
    "Tyresö",
    "Täby",
    "Upplands Väsby",
    "Uttran",
    "Vallentuna",
    "Vendelsö",
    "Vårby",
    "Vällingby",
    "Värmdö",
    "Västerhaninge",
    "Yxlan",
    "Åkersberga",
    "Årsta",
    "Älvsjö",
    "Ösmo",
  ],
  "Södermanlands län": [
    "Eskilstuna",
    "Flen",
    "Gnesta",
    "Katrineholm",
    "Kvicksund",
    "Malmköping",
    "Mellösa",
    "Nyköping",
    "Oxelösund",
    "Sparreholm",
    "Stallarholmen",
    "Stigtomta",
    "Strängnäs",
    "Torshälla",
    "Tystberga",
    "Vagnhärad",
    "Vingåker",
    "Vrena",
    "Åkers Styckebruk",
  ],
  "Uppsala län": [
    "Almunge",
    "Alunda",
    "Björklinge",
    "Bålsta",
    "Bälinge",
    "Gimo",
    "Heby",
    "Hållnäs",
    "Järlåsa",
    "Knivsta",
    "Skokloster",
    "Skärplinge",
    "Storvreta",
    "Tierp",
    "Tärnsjö",
    "Uppsala",
    "Vänge",
    "Öregrund",
    "Östhammar",
    "Östervåla",
  ],
  "Värmlands län": ["Filipstad"],
  "Västmanlands län": [
    "Arboga",
    "Fagersta",
    "Hallstahammar",
    "Kolbäck",
    "Kolsva",
    "Kungsör",
    "Köping",
    "Norberg",
    "Ramnäs",
    "Sala",
    "Skultuna",
    "Surahammar",
    "Valskog",
    "Västerfärnebo",
    "Västerås",
  ],
  "Örebro län": [
    "Ervalla",
    "Fellingsbro",
    "Hallsberg",
    "Hällefors",
    "Karlskoga",
    "Kopparberg",
    "Kumla",
    "Lindesberg",
    "Mullhyttan",
    "Nora",
    "Odensbacken",
    "Pålsboda",
    "Stora Mellösa",
    "Storå",
    "Vintrosa",
    "Vretstorp",
    "Örebro",
  ],
  "Östergötlands län": [
    "Finspång",
    "Kolmården",
    "Linköping",
    "Linghem",
    "Ljungsbro",
    "Norrköping",
    "Ringarum",
    "Sankt Anna",
    "Skärblacka",
    "Svärtinge",
    "Söderköping",
    "Åby",
  ],
};

const DISTANCE_BUCKET_LOCATIONS = {
  "0-25 km": ["Björklinge", "Bälinge", "Knivsta", "Storvreta", "Uppsala", "Vänge"],
  "25-50 km": ["Almunge", "Arlandastad", "Bålsta", "Enköping", "Järlåsa", "Märsta", "Skokloster", "Sigtuna"],
  "50-100 km": [
    "Alunda",
    "Bro",
    "Gimo",
    "Heby",
    "Norrtälje",
    "Sala",
    "Sollentuna",
    "Solna",
    "Stockholm",
    "Sundbyberg",
    "Täby",
    "Tierp",
    "Upplands Väsby",
    "Vallentuna",
    "Västerås",
    "Öregrund",
    "Östhammar",
    "Östervåla",
  ],
  "100-200 km": [
    "Arboga",
    "Avesta",
    "Borlänge",
    "Eskilstuna",
    "Falun",
    "Flen",
    "Gävle",
    "Hallstahammar",
    "Katrineholm",
    "Köping",
    "Leksand",
    "Lindesberg",
    "Nyköping",
    "Rättvik",
    "Sandviken",
    "Strängnäs",
    "Söderhamn",
    "Örebro",
  ],
};

const LOCATION_TO_COUNTY = Object.fromEntries(
  Object.entries(COUNTY_LOCATIONS).flatMap(([county, locations]) =>
    locations.map((location) => [normalizeText(location), county]),
  ),
);

const LOCATION_TO_DISTANCE_BUCKET = Object.fromEntries(
  Object.entries(DISTANCE_BUCKET_LOCATIONS).flatMap(([bucketLabel, locations]) =>
    locations.map((location) => [normalizeText(location), bucketLabel]),
  ),
);

function normalizeString(value) {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ");
}

function normalizeText(value) {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/[\s\u00a0krKRE]/g, "").replace(/[^0-9.,-]/g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCompactAmount(token) {
  const normalized = String(token || "").trim().toLowerCase().replace(",", ".");
  if (!normalized) return null;
  const numeric = Number.parseFloat(normalized);
  if (!Number.isFinite(numeric)) return null;
  return normalized.includes("k") ? Math.round(numeric * 1000) : Math.round(numeric);
}

function bucket(value, buckets) {
  if (value == null) return "Okänt";
  for (const entry of buckets) {
    if (value <= entry.max) return entry.label;
  }
  return buckets[buckets.length - 1].label;
}

function formatBucketNumber(value) {
  if (!Number.isFinite(value)) return "Okänt";
  const rounded = Math.round(value);
  return rounded.toLocaleString("sv-SE");
}

function buildEqualBuckets(maxValue, labels, minimumStep = 1) {
  const safeMax = Math.max(Number.isFinite(maxValue) ? maxValue : 0, minimumStep * labels.length);
  const step = Math.max(Math.ceil(safeMax / labels.length), minimumStep);
  return labels.map((label, index) => ({
    max: index === labels.length - 1 ? Number.POSITIVE_INFINITY : step * (index + 1),
    label: typeof label === "function" ? label(step, index, safeMax) : label,
  }));
}

function buildPriceBuckets(maxPrice) {
  const step = Math.max(Math.ceil(Math.max(maxPrice, 1) / 4 / 1000) * 1000, 1000);
  const breaks = [step, step * 2, step * 3];
  return [
    { max: breaks[0], label: `<=${formatBucketNumber(breaks[0])}` },
    { max: breaks[1], label: `${formatBucketNumber(breaks[0] + 1)}-${formatBucketNumber(breaks[1])}` },
    { max: breaks[2], label: `${formatBucketNumber(breaks[1] + 1)}-${formatBucketNumber(breaks[2])}` },
    { max: Number.POSITIVE_INFINITY, label: `>${formatBucketNumber(breaks[2])}` },
  ];
}

function buildMileageBuckets(maxMileage) {
  const step = Math.max(Math.ceil(Math.max(maxMileage, 1) / 4 / 1000) * 1000, 1000);
  const breaks = [step, step * 2, step * 3];
  return [
    { max: breaks[0], label: `<=${formatBucketNumber(breaks[0])}` },
    { max: breaks[1], label: `${formatBucketNumber(breaks[0] + 1)}-${formatBucketNumber(breaks[1])}` },
    { max: breaks[2], label: `${formatBucketNumber(breaks[1] + 1)}-${formatBucketNumber(breaks[2])}` },
    { max: Number.POSITIVE_INFINITY, label: `>${formatBucketNumber(breaks[2])}` },
  ];
}

function buildAgeBuckets(maxAge) {
  const step = Math.max(Math.ceil(Math.max(maxAge, 1) / 4), 1);
  const breaks = [step, step * 2, step * 3];
  return [
    { max: breaks[0], label: `<=${breaks[0]} år` },
    { max: breaks[1], label: `${breaks[0] + 1}-${breaks[1]} år` },
    { max: breaks[2], label: `${breaks[1] + 1}-${breaks[2]} år` },
    { max: Number.POSITIVE_INFINITY, label: `>${breaks[2]} år` },
  ];
}

function buildPricePerMilBuckets(maxPricePerMil) {
  const step = Math.max(Math.ceil(Math.max(maxPricePerMil, 1) / 4), 1);
  const breaks = [step, step * 2, step * 3];
  return [
    { max: breaks[0], label: `<=${formatBucketNumber(breaks[0])} kr/mil` },
    { max: breaks[1], label: `${formatBucketNumber(breaks[0] + 1)}-${formatBucketNumber(breaks[1])} kr/mil` },
    { max: breaks[2], label: `${formatBucketNumber(breaks[1] + 1)}-${formatBucketNumber(breaks[2])} kr/mil` },
    { max: Number.POSITIVE_INFINITY, label: `>${formatBucketNumber(breaks[2])} kr/mil` },
  ];
}

function bucketOptionsToLabels(options) {
  return options.map((option) => option.label);
}

function formatInteger(value, suffix = "") {
  if (value == null) return "Okänt";
  return `${value.toLocaleString("sv-SE")}${suffix}`;
}

function compactParts(parts) {
  return parts.map(normalizeString).filter(Boolean).join(" • ");
}

function joinNameParts(parts) {
  return parts.map(normalizeString).filter(Boolean).join(" ");
}

function riskLabel(value) {
  switch (value) {
    case "Lower":
      return "Låg";
    case "Medium":
      return "Mellan";
    case "Higher":
      return "Hög";
    case "Avoid":
      return "Undvik";
    default:
      return "Ej bedömd";
  }
}

function debtLabel(value) {
  switch (value) {
    case "Yes":
      return "Ja";
    case "No":
      return "Nej";
    default:
      return "Okänt";
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
    default:
      return "Okänt";
  }
}

function parseBrandModel(modelValue) {
  const clean = normalizeString(modelValue);
  if (!clean) return { brand: "Okänd", modelName: "Okänd" };
  const normalized = normalizeText(clean);
  for (const multiWordBrand of MULTI_WORD_BRANDS) {
    const normalizedBrand = normalizeText(multiWordBrand);
    if (normalized === normalizedBrand || normalized.startsWith(`${normalizedBrand} `)) {
      return {
        brand: multiWordBrand,
        modelName: clean.slice(multiWordBrand.length).trim() || clean,
      };
    }
  }
  const [brand, ...rest] = clean.split(/\s+/);
  return {
    brand,
    modelName: rest.length ? rest.join(" ") : clean,
  };
}

function splitModelSeries(brand, modelName) {
  const cleanModelName = normalizeString(modelName);
  const seriesCandidates = MODEL_SERIES_BY_BRAND[brand] || [];
  for (const candidate of seriesCandidates) {
    const match = cleanModelName.match(new RegExp(`^${candidate}\\s+(\\d+)$`, "i"));
    if (match) {
      return {
        modelName: candidate,
        modelSeries: match[1],
      };
    }
  }
  return {
    modelName: cleanModelName,
    modelSeries: null,
  };
}

function extractEngine(trimValue) {
  const originalTrim = normalizeString(trimValue);
  if (!originalTrim) return { engine: null, trim: null };

  const tokens = originalTrim.split(/\s+/);
  let startIndex = tokens.findIndex((token) => /\d/.test(token) || ENGINE_WORDS.has(normalizeText(token)));
  if (startIndex > 0 && ENGINE_TRIM_PREFIXES.has(normalizeText(tokens[0]))) {
    startIndex = tokens.findIndex((token, index) => index > 0 && (/\d/.test(token) || ENGINE_WORDS.has(normalizeText(token))));
  }
  if (startIndex === -1) {
    return { engine: null, trim: originalTrim };
  }

  const engineTokens = [];
  let endIndex = startIndex;
  for (let index = startIndex; index < tokens.length; index += 1) {
    const normalizedToken = normalizeText(tokens[index]);
    const engineLike =
      /\d/.test(tokens[index]) ||
      ENGINE_WORDS.has(normalizedToken) ||
      normalizedToken === "+" ||
      /^[A-Z0-9/-]+$/u.test(tokens[index]);
    if (!engineLike && engineTokens.length) break;
    if (engineLike) {
      engineTokens.push(tokens[index]);
      endIndex = index;
    }
  }

  const engine = normalizeString(engineTokens.join(" ")) || null;
  if (!engine) {
    return { engine: null, trim: originalTrim };
  }

  const before = tokens.slice(0, startIndex).join(" ");
  const after = tokens.slice(endIndex + 1).join(" ");
  const remainingTrim = normalizeString([before, after].filter(Boolean).join(" "));
  return {
    engine,
    trim: remainingTrim || null,
  };
}

function classifyFuel(value) {
  const normalized = normalizeText(value);
  if (!normalized || normalized === "inte specificerat") return "Okänd";
  if (normalized.includes("plug") && (normalized.includes("hybrid") || normalized.includes("bensin"))) return "Plug-in hybrid";
  if (normalized.includes("hybrid") && normalized.includes("diesel")) return "Hybrid diesel";
  if (normalized.includes("hybrid") && normalized.includes("bensin")) return "Hybrid bensin";
  if (normalized === "el") return "El";
  if (normalized.includes("etanol")) return "Etanol";
  if (normalized.includes("gas") || normalized.includes("cng")) return "Gas";
  if (normalized.includes("diesel")) return "Diesel";
  if (normalized.includes("bensin")) return "Bensin";
  return normalizeString(value) || "Okänd";
}

function classifyGearbox(value) {
  const normalized = normalizeText(value);
  const detail = normalizeString(value) || "Okänd";
  if (!normalized) return { gearboxDriveability: "Okänd", gearboxDetail: "Okänd" };
  if (normalized.includes("manuell")) return { gearboxDriveability: "Manuell", gearboxDetail: detail };
  if (
    normalized.includes("automat") ||
    normalized.includes("cvt") ||
    normalized.includes("dsg") ||
    normalized.includes("s-tronic") ||
    normalized.includes("stronic") ||
    normalized.includes("steptronic")
  ) {
    return { gearboxDriveability: "Automat", gearboxDetail: detail };
  }
  return { gearboxDriveability: "Okänd", gearboxDetail: detail };
}

function classifyBody(value) {
  const normalized = normalizeText(value);
  if (!normalized || normalized === "annat") return "Okänd";
  if (normalized.includes("halvkombi")) return "Halvkombi";
  if (normalized.includes("kombi")) return "Kombi";
  if (normalized.includes("sedan")) return "Sedan";
  if (normalized.includes("suv") || normalized.includes("crossover") || normalized.includes("cross-over")) return "SUV";
  if (normalized.includes("cabriolet")) return "Cabriolet";
  if (normalized.includes("coup")) return "Coupé";
  if (normalized.includes("buss") || normalized.includes("mpv")) return "Minibuss";
  return normalizeString(value) || "Okänd";
}

function classifySeller(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "Okänd";
  if (normalized.includes("privat")) return "Privat";
  if (normalized.includes("företag") || normalized.includes("bilfirma") || normalized.includes("handlare")) return "Företag";
  return normalizeString(value) || "Okänd";
}

function classifyRisk(value) {
  const clean = normalizeString(value);
  if (["Lower", "Medium", "Higher", "Avoid"].includes(clean)) {
    return { risk: clean, riskKnown: true };
  }
  return { risk: null, riskKnown: false };
}

function parseServiceCostRange(value) {
  const matches = [...String(value || "").matchAll(/\d+(?:[.,]\d+)?\s*k?/gi)].map((match) => parseCompactAmount(match[0])).filter((amount) => amount != null);
  if (!matches.length) {
    return { min: null, max: null, bucketLabel: "Okänt" };
  }
  const min = matches[0];
  const max = matches[matches.length - 1];
  return {
    min,
    max,
    bucketLabel: bucket(max, [
      { max: 5000, label: "0-5k" },
      { max: 10000, label: "5-10k" },
      { max: 20000, label: "10-20k" },
      { max: 999999, label: "20k+" },
    ]),
  };
}

function classifyServiceDue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "Unknown";
  if (normalized.includes("overdue")) return "Now";
  if (normalized.includes("now/soon") || normalized.includes("now")) return "Now";
  if (normalized.includes("soon")) return "Soon";
  if (normalized.includes("later")) return "Later";
  return "Unknown";
}

function classifyDebt(value) {
  const normalized = normalizeText(value);
  if (!normalized || normalized === "n/a") return "Unknown";
  if (normalized === "nej" || normalized === "no") return "No";
  if (normalized === "ja" || /\d/.test(normalized)) return "Yes";
  return "Unknown";
}

function countyFromLocation(locationValue) {
  const county = LOCATION_TO_COUNTY[normalizeText(locationValue)];
  return county || "Okänt län";
}

function distanceBucketFromLocation(locationValue, countyValue) {
  const directMatch = LOCATION_TO_DISTANCE_BUCKET[normalizeText(locationValue)];
  if (directMatch) return directMatch;
  if (countyValue === "Uppsala län") return "50-100 km";
  if (countyValue === "Stockholms län" || countyValue === "Västmanlands län") return "50-100 km";
  if (countyValue === "Södermanlands län" || countyValue === "Örebro län" || countyValue === "Gävleborgs län") return "100-200 km";
  return "200+ km";
}

const riskSortRank = { Lower: 1, Medium: 2, Higher: 3, Avoid: 4 };
const raw = JSON.parse(fs.readFileSync(inPath, "utf8"));
const inventory = raw.inventory || raw.priusComparison || [];

const processed = inventory.map((item) => {
  const rawBrandModel = parseBrandModel(item.model);
  const withSeries = splitModelSeries(rawBrandModel.brand, rawBrandModel.modelName);
  const engineSplit = extractEngine(item.trim);
  const canonicalPriceNum = parseNumber(item.priceNum != null ? item.priceNum : item.price);
  const canonicalMileageMil = parseNumber(item.mileageMil != null ? item.mileageMil : item.mileage);
  const canonicalYearNum = parseNumber(item.yearNum != null ? item.yearNum : item.year);
  const canonicalOwnersNum = parseNumber(item.ownersNum != null ? item.ownersNum : item.owners);
  const canonicalFuel = classifyFuel(item.fuel);
  const canonicalGearbox = classifyGearbox(item.gearbox);
  const canonicalBody = classifyBody(item.body);
  const canonicalSeller = classifySeller(item.seller);
  const canonicalRisk = classifyRisk(item.risk);
  const canonicalServiceCost = parseServiceCostRange(item.serviceCost);
  const canonicalServiceDueLevel = classifyServiceDue(item.serviceDue);
  const canonicalLocation = normalizeString(item.location) || "Okänd";
  const canonicalRegion = countyFromLocation(canonicalLocation);
  const canonicalDistanceBucket = distanceBucketFromLocation(canonicalLocation, canonicalRegion);
  const canonicalDebtStatus = classifyDebt(item.debt);
  const canonicalReg = normalizeString(item.reg).toUpperCase().replace(/\s+/g, "");

  const age = canonicalYearNum == null ? null : new Date().getFullYear() - canonicalYearNum;
  const pricePerMil =
    canonicalPriceNum == null || canonicalMileageMil == null || canonicalMileageMil <= 0
      ? null
      : Math.round((canonicalPriceNum / canonicalMileageMil) * 100) / 100;
  const derived = {
    age,
    priceBucket: bucket(canonicalPriceNum, [
      { max: 50000, label: "<=50k" },
      { max: 100000, label: "50-100k" },
      { max: 200000, label: "100-200k" },
      { max: 999999999, label: ">200k" },
    ]),
    mileageBucket: bucket(canonicalMileageMil, [
      { max: 10000, label: "<=10k" },
      { max: 20000, label: "10-20k" },
      { max: 40000, label: "20-40k" },
      { max: 999999999, label: ">40k" },
    ]),
    ageBucket: bucket(age, [
      { max: 5, label: "<=5 år" },
      { max: 10, label: "5-10 år" },
      { max: 20, label: "10-20 år" },
      { max: 999, label: ">20 år" },
    ]),
    ownersBucket: bucket(canonicalOwnersNum, [
      { max: 1, label: "1" },
      { max: 2, label: "2" },
      { max: 3, label: "3" },
      { max: 4, label: "4" },
      { max: 5, label: "5" },
      { max: 7, label: "6-7" },
      { max: 10, label: "8-10" },
      { max: 999, label: "11+" },
    ]),
    pricePerMil,
    pricePerMilBucket: bucket(pricePerMil, [
      { max: 1.5, label: "<=1,5 kr/mil" },
      { max: 2.5, label: "1,5-2,5 kr/mil" },
      { max: 5, label: "2,5-5 kr/mil" },
      { max: 999999999, label: ">5 kr/mil" },
    ]),
    riskRank: canonicalRisk.risk ? riskSortRank[canonicalRisk.risk] : 99,
    hasDebt: canonicalDebtStatus === "Yes",
  };

  const canonical = {
    brand: rawBrandModel.brand,
    modelName: withSeries.modelName,
    modelSeries: withSeries.modelSeries,
    engine: engineSplit.engine,
    trim: engineSplit.trim,
    priceNum: canonicalPriceNum,
    mileageMil: canonicalMileageMil,
    yearNum: canonicalYearNum,
    fuel: canonicalFuel,
    gearboxDriveability: canonicalGearbox.gearboxDriveability,
    gearboxDetail: canonicalGearbox.gearboxDetail,
    bodyType: canonicalBody,
    location: canonicalLocation,
    region: canonicalRegion,
    distanceBucketFromUppsala: canonicalDistanceBucket,
    sellerType: canonicalSeller,
    ownersNum: canonicalOwnersNum,
    risk: canonicalRisk.risk,
    riskKnown: canonicalRisk.riskKnown,
    serviceDueLevel: canonicalServiceDueLevel,
    serviceCostMin: canonicalServiceCost.min,
    serviceCostMax: canonicalServiceCost.max,
    serviceCostBucket: canonicalServiceCost.bucketLabel,
    regNormalized: canonicalReg || null,
    debtStatus: canonicalDebtStatus,
    registryVerified: Boolean(normalizeString(item.registryNote)),
  };

  const display = {
    name: joinNameParts([canonical.brand, canonical.modelName]),
    version: compactParts([canonical.modelSeries, canonical.engine, canonical.trim]),
    engine: canonical.engine || "Okänt",
    price: canonical.priceNum == null ? "Okänt" : `${formatInteger(canonical.priceNum, " kr")}`,
    mileage: canonical.mileageMil == null ? "Okänt" : `${formatInteger(canonical.mileageMil, " mil")}`,
    year: canonical.yearNum == null ? "Okänt" : String(canonical.yearNum),
    fuel: canonical.fuel,
    gearbox: canonical.gearboxDriveability,
    body: canonical.bodyType,
    location: canonical.location,
    region: canonical.region,
    distance: canonical.distanceBucketFromUppsala,
    seller: canonical.sellerType,
    owners: canonical.ownersNum == null ? "Okänt" : String(canonical.ownersNum),
    risk: riskLabel(canonical.risk),
    serviceDue: serviceDueLabel(canonical.serviceDueLevel),
    serviceCost:
      canonical.serviceCostMin == null
        ? "Okänt"
        : canonical.serviceCostMin === canonical.serviceCostMax
          ? `${formatInteger(canonical.serviceCostMin, " kr")}`
          : `${formatInteger(canonical.serviceCostMin)}-${formatInteger(canonical.serviceCostMax, " kr")}`,
    reg: canonical.regNormalized || "Okänt",
    debt: debtLabel(canonical.debtStatus),
  };

  const searchableText = [
    display.name,
    display.version,
    canonical.location,
    canonical.region,
    canonical.distanceBucketFromUppsala,
    canonical.fuel,
    canonical.gearboxDriveability,
    canonical.bodyType,
    canonical.sellerType,
    display.reg,
    display.risk,
    item.riskNote,
    item.serviceDue,
    item.serviceCost,
    item.forumWatchouts,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    ...item,
    model: display.name,
    trim: display.version,
    location: canonical.location,
    fuel: canonical.fuel,
    gearbox: canonical.gearboxDriveability,
    seller: canonical.sellerType,
    body: canonical.bodyType,
    reg: display.reg,
    risk: canonical.risk || "Unknown",
    serviceDue: display.serviceDue,
    serviceCost: display.serviceCost,
    year: display.year,
    yearNum: canonical.yearNum ?? 0,
    mileage: display.mileage,
    mileageMil: canonical.mileageMil ?? 0,
    price: display.price,
    priceNum: canonical.priceNum ?? 0,
    owners: display.owners,
    ownersNum: canonical.ownersNum,
    href: normalizeString(item.href),
    brand: canonical.brand,
    modelName: canonical.modelName,
    searchableText,
    source: {
      modelRaw: normalizeString(item.model),
      trimRaw: normalizeString(item.trim),
      priceRaw: normalizeString(item.price),
      mileageRaw: normalizeString(item.mileage),
      yearRaw: normalizeString(item.year),
      fuelRaw: normalizeString(item.fuel),
      gearboxRaw: normalizeString(item.gearbox),
      bodyRaw: normalizeString(item.body),
      locationRaw: normalizeString(item.location),
      sellerRaw: normalizeString(item.seller),
      ownersRaw: normalizeString(item.owners),
      riskRaw: normalizeString(item.risk),
      serviceDueRaw: normalizeString(item.serviceDue),
      serviceCostRaw: normalizeString(item.serviceCost),
      regRaw: normalizeString(item.reg),
      debtRaw: normalizeString(item.debt),
      registryNoteRaw: normalizeString(item.registryNote),
    },
    canonical,
    derived,
    display,
  };
});

const collator = new Intl.Collator("sv", { sensitivity: "base" });
const sortStrings = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => collator.compare(a, b));
const brands = sortStrings(processed.map((item) => item.canonical.brand));
const modelsByBrand = Object.fromEntries(
  brands.map((brand) => [
    brand,
    sortStrings(processed.filter((item) => item.canonical.brand === brand).map((item) => item.canonical.modelName)),
  ]),
);
const locations = sortStrings(processed.map((item) => item.canonical.location));
const regions = sortStrings(processed.map((item) => item.canonical.region));
const fuels = sortStrings(processed.map((item) => item.canonical.fuel));
const gearboxes = sortStrings(processed.map((item) => item.canonical.gearboxDriveability));
const sellers = sortStrings(processed.map((item) => item.canonical.sellerType));
const bodies = sortStrings(processed.map((item) => item.canonical.bodyType));
const risks = ["Lower", "Medium", "Higher", "Avoid"];
const distanceBuckets = ["0-25 km", "25-50 km", "50-100 km", "100-200 km", "200+ km"];
const maxPrice = Math.max(...processed.map((item) => item.canonical.priceNum ?? 0), 0);
const maxMileage = Math.max(...processed.map((item) => item.canonical.mileageMil ?? 0), 0);
const maxAge = Math.max(...processed.map((item) => item.derived.age ?? 0), 0);
const maxPricePerMil = Math.max(...processed.map((item) => item.derived.pricePerMil ?? 0), 0);
const priceBuckets = bucketOptionsToLabels(buildPriceBuckets(maxPrice));
const mileageBuckets = bucketOptionsToLabels(buildMileageBuckets(maxMileage));
const ageBuckets = bucketOptionsToLabels(buildAgeBuckets(maxAge));
const ownersBuckets = ["1", "2", "3", "4", "5", "6-7", "8-10", "11+", "Okänt"];
const pricePerMilBuckets = bucketOptionsToLabels(buildPricePerMilBuckets(maxPricePerMil));
const serviceDueLevels = ["Now", "Soon", "Later", "Unknown"];
const serviceCostBuckets = ["0-5k", "5-10k", "10-20k", "20k+", "Okänt"];
const debtStatuses = ["No", "Yes", "Unknown"];
const registryVerifiedOptions = ["true", "false"];
const sortOptions = [
  { value: "none", label: "Ingen sortering" },
  { value: "price-asc", label: "Pris lågt till högt" },
  { value: "price-desc", label: "Pris högt till lågt" },
  { value: "price-bucket-asc", label: "Prisintervall lågt till högt" },
  { value: "price-bucket-desc", label: "Prisintervall högt till lågt" },
  { value: "price-per-mil-asc", label: "Pris per mil lågt till högt" },
  { value: "price-per-mil-desc", label: "Pris per mil högt till lågt" },
  { value: "price-per-mil-bucket-asc", label: "Pris per mil intervall lågt till högt" },
  { value: "price-per-mil-bucket-desc", label: "Pris per mil intervall högt till lågt" },
  { value: "mileage-asc", label: "Miltal lågt till högt" },
  { value: "mileage-desc", label: "Miltal högt till lågt" },
  { value: "mileage-bucket-asc", label: "Miltalshink lågt till högt" },
  { value: "mileage-bucket-desc", label: "Miltalshink högt till lågt" },
  { value: "year-desc", label: "År nyast först" },
  { value: "year-asc", label: "År äldst först" },
  { value: "age-asc", label: "Ålder yngst först" },
  { value: "age-desc", label: "Ålder äldst först" },
  { value: "age-bucket-asc", label: "Åldershink yngst först" },
  { value: "age-bucket-desc", label: "Åldershink äldst först" },
  { value: "owners-asc", label: "Ägare få till många" },
  { value: "owners-desc", label: "Ägare många till få" },
  { value: "owners-bucket-asc", label: "Ägarhink få till många" },
  { value: "owners-bucket-desc", label: "Ägarhink många till få" },
  { value: "brand-asc", label: "Märke A till Ö" },
  { value: "brand-desc", label: "Märke Ö till A" },
  { value: "model-asc", label: "Modell A till Ö" },
  { value: "model-desc", label: "Modell Ö till A" },
  { value: "series-asc", label: "Serie A till Ö" },
  { value: "series-desc", label: "Serie Ö till A" },
  { value: "engine-asc", label: "Motor A till Ö" },
  { value: "engine-desc", label: "Motor Ö till A" },
  { value: "trim-asc", label: "Version A till Ö" },
  { value: "trim-desc", label: "Version Ö till A" },
  { value: "location-asc", label: "Ort A till Ö" },
  { value: "location-desc", label: "Ort Ö till A" },
  { value: "region-asc", label: "Län A till Ö" },
  { value: "region-desc", label: "Län Ö till A" },
  { value: "distance-asc", label: "Avstånd nära till långt" },
  { value: "distance-desc", label: "Avstånd långt till nära" },
  { value: "fuel-asc", label: "Drivmedel A till Ö" },
  { value: "fuel-desc", label: "Drivmedel Ö till A" },
  { value: "gearbox-asc", label: "Växellåda A till Ö" },
  { value: "gearbox-desc", label: "Växellåda Ö till A" },
  { value: "seller-asc", label: "Säljare A till Ö" },
  { value: "seller-desc", label: "Säljare Ö till A" },
  { value: "body-asc", label: "Kaross A till Ö" },
  { value: "body-desc", label: "Kaross Ö till A" },
  { value: "risk-best", label: "Risk bäst först" },
  { value: "risk-worst", label: "Risk sämst först" },
  { value: "risk-known-first", label: "Risk bedömd först" },
  { value: "risk-unknown-first", label: "Risk ej bedömd först" },
  { value: "service-due-asc", label: "Service nu först" },
  { value: "service-due-desc", label: "Service senare först" },
  { value: "service-cost-asc", label: "Servicekostnad lågt till högt" },
  { value: "service-cost-desc", label: "Servicekostnad högt till lågt" },
  { value: "debt-no-first", label: "Skuld nej först" },
  { value: "debt-yes-first", label: "Skuld ja först" },
  { value: "registry-verified-first", label: "Register bekräftad först" },
  { value: "registry-unverified-first", label: "Register ej bekräftad först" },
  { value: "reg-asc", label: "Reg A till Ö" },
  { value: "reg-desc", label: "Reg Ö till A" },
];

const out = {
  copy: raw.copy,
  summary: raw.summary,
  filters: {
    fuels,
    sellers,
    bodies,
    risks,
    gearboxes,
    sortOptions,
  },
  meta: {
    generatedAt: new Date().toISOString(),
    count: processed.length,
    maxPrice,
    maxMileage,
  },
  lookups: {
    brands,
    modelsByBrand,
    locations,
    regions,
    distanceBuckets,
    fuels,
    gearboxes,
    sellers,
    bodies,
    risks,
    priceBuckets,
    mileageBuckets,
    ageBuckets,
    ownersBuckets,
    pricePerMilBuckets,
    serviceDueLevels,
    serviceCostBuckets,
    debtStatuses,
    registryVerifiedOptions,
  },
  inventory: processed,
};

const json = JSON.stringify(out, null, 2);
fs.writeFileSync(distOutPath, json, "utf8");
fs.writeFileSync(rootOutPath, json, "utf8");
console.log("Wrote", distOutPath, "and", rootOutPath, "items:", processed.length);
