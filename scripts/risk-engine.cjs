const PREMIUM_BRANDS = new Set(["Audi", "BMW", "Jaguar", "Land Rover", "Mercedes-Benz", "Porsche", "Volkswagen", "Volvo"]);
const SIMPLE_SMALL_CAR_BRANDS = new Set(["Honda", "Hyundai", "Kia", "Toyota"]);
const SIMPLE_SMALL_CAR_MODELS = new Set(["Accent", "Aygo", "C1", "Jazz", "Picanto", "Yaris", "i10", "107"]);
const ROBOTIZED_MANUAL_KEYWORDS = [
  "2-tronic",
  "2 tronic",
  "dualogic",
  "durashift",
  "easytronic",
  "etg",
  "i-shift",
  "m-mt",
  "mmt",
  "multimode",
  "quickshift",
  "robot",
  "robotized",
  "sensodrive",
  "semi-automat",
  "semi automatic",
];
const DUAL_CLUTCH_KEYWORDS = ["dct", "dsg", "edc", "powershift", "s-tronic", "stronic", "tct"];
const CVT_KEYWORDS = ["cvt", "ecvt", "xtronic"];

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

function includesAny(text, tokens) {
  return tokens.some((token) => text.includes(token));
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))];
}

function compactParts(parts) {
  return parts.map(normalizeString).filter(Boolean).join(" ");
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function serviceStage(context) {
  if (context.mileageMil == null || context.age == null) return "unknown";
  if (context.mileageMil >= 25000 || context.age >= 15) return "now";
  if (context.mileageMil >= 15000 || context.age >= 8) return "soon";
  return "later";
}

function stageSentence(stage, laterText, soonText, nowText) {
  if (stage === "now") return nowText;
  if (stage === "soon") return soonText;
  return laterText;
}

function genericServiceDue(context, focus) {
  const stage = serviceStage(context);
  if (stage === "unknown") {
    return `Ask for routine service history, ${focus}.`;
  }
  return stageSentence(
    stage,
    `Later: ${focus}.`,
    `Soon: ${focus}.`,
    `Now/soon: ${focus}.`,
  );
}

function genericServiceCost(context) {
  if (context.isRobotizedManual) return "2k-5k SEK routine; 7k-13k clutch; 5k-13k actuator";
  if (context.isDualClutch) return "3k-8k SEK routine; 10k-25k if clutch pack or mechatronic faults appear";
  if (context.isToyotaOrLexusHybrid) return "2k-7k SEK routine; 14k-27k if battery or brake actuator appears later";
  if (context.isPremiumOlderAutomatic) {
    return "4k-10k SEK routine; much more if gearbox, cooling, suspension, or emissions faults appear";
  }
  if (context.mileageMil != null && context.mileageMil >= 20000) return "3k-10k SEK";
  return "2k-6k SEK";
}

function baseWatchouts(context) {
  if (context.isRobotizedManual) {
    return "Owner forums mention jerky take-off, flashing N or gearbox warnings, actuator noise, clutch wear, and failed adaptations.";
  }
  if (context.isDualClutch) {
    return "Owners keep mentioning clutch-pack wear, mechatronic faults, rough low-speed shifts, and expensive oil-leak repairs.";
  }
  if (context.isToyotaOrLexusHybrid) {
    return "Forum watchouts focus on hybrid battery aging, brake actuator noise, inverter or coolant-pump issues, and rust on older cars.";
  }
  if (context.isPremiumOlderAutomatic) {
    return "Forum advice on these older premium automatics usually points to cooling leaks, suspension wear, timing-chain or emissions faults, and expensive gearbox work.";
  }
  if (context.mileageMil == null || context.mileageMil < 10000) {
    return "Without invoices, assume fluids, brakes, suspension wear, and cooling leaks matter more than the ad text.";
  }
  if (context.mileageMil >= 20000) {
    return "Forum advice at this mileage is to trust paperwork for transmission and cooling work more than fresh detailing.";
  }
  return "These are manageable on paper, but owners still warn about skipped fluid changes, tired dampers, brake drag, and rust.";
}

function genericRiskNote(risk, context) {
  if (risk === "Lower") {
    return "Better than most of this pool on paper, but still confirm automatic service history and corrosion condition.";
  }
  if (risk === "Higher") {
    return "The drivetrain, age, or running-cost profile makes this a materially riskier bet than the safer shortlist cars.";
  }
  if (risk === "Avoid") {
    return "Known troublesome drivetrain or model pattern for a reliability-first budget buy.";
  }
  if (context.isPremiumOlderAutomatic) {
    return "No single disaster pattern dominates, but premium-car running costs and automatic repairs can get expensive quickly.";
  }
  return "No strong model-specific edge shows up here, so this lands in the middle of the pool until history and condition prove otherwise.";
}

function buildContext(input) {
  const brand = normalizeString(input.brand);
  const modelName = normalizeString(input.modelName);
  const modelSeries = normalizeString(input.modelSeries);
  const engine = normalizeString(input.engine);
  const trim = normalizeString(input.trim);
  const fuel = normalizeString(input.fuel);
  const gearboxDriveability = normalizeString(input.gearboxDriveability);
  const gearboxDetail = normalizeString(input.gearboxDetail);
  const bodyType = normalizeString(input.bodyType);
  const debtStatus = normalizeString(input.debtStatus);
  const sellers = normalizeString(input.sellerType);
  const age = input.yearNum == null ? null : new Date().getFullYear() - input.yearNum;
  const combinedText = normalizeText([brand, modelName, modelSeries, engine, trim, fuel, gearboxDriveability, gearboxDetail].join(" "));
  const isRobotizedManual = includesAny(combinedText, ROBOTIZED_MANUAL_KEYWORDS);
  const isDualClutch = includesAny(combinedText, DUAL_CLUTCH_KEYWORDS);
  const isCVT = includesAny(combinedText, CVT_KEYWORDS) || combinedText.includes("super ect");
  const isToyotaOrLexusHybrid = ["Toyota", "Lexus"].includes(brand) && normalizeText(fuel).includes("hybrid");
  const isSimpleSmallAutomatic = SIMPLE_SMALL_CAR_BRANDS.has(brand) && SIMPLE_SMALL_CAR_MODELS.has(modelName);
  const isPremiumOlderAutomatic =
    PREMIUM_BRANDS.has(brand) &&
    gearboxDriveability === "Automat" &&
    ((age != null && age >= 10) || (input.mileageMil != null && input.mileageMil >= 18000));
  const cityRobotCluster =
    (brand === "Toyota" && modelName === "Aygo") ||
    (brand === "Peugeot" && modelName === "107") ||
    ((brand === "Citroen" || brand === "Citroën") && modelName === "C1");

  return {
    brand,
    modelName,
    modelSeries,
    engine,
    trim,
    fuel,
    gearboxDriveability,
    gearboxDetail,
    bodyType,
    debtStatus,
    sellerType: sellers,
    yearNum: input.yearNum ?? null,
    mileageMil: input.mileageMil ?? null,
    ownersNum: input.ownersNum ?? null,
    priceNum: input.priceNum ?? null,
    age,
    combinedText,
    hasDebt: debtStatus === "Yes",
    isRobotizedManual,
    isDualClutch,
    isCVT,
    isToyotaOrLexusHybrid,
    isSimpleSmallAutomatic,
    isPremiumOlderAutomatic,
    cityRobotCluster,
  };
}

function baseProfileTags(context) {
  const tags = [];
  if (context.isToyotaOrLexusHybrid) tags.push("Toyota/Lexus hybrid", "Hybrid");
  if (context.isRobotizedManual) tags.push("Robotiserad manuell");
  if (context.isDualClutch) tags.push("Dubbelkoppling");
  if (context.isCVT) tags.push("CVT");
  if (context.isPremiumOlderAutomatic) tags.push("Äldre premiumautomat");
  if (context.isSimpleSmallAutomatic) tags.push("Enkel småbil");
  if (context.age != null && context.age >= 15) tags.push("Hög ålder");
  if (context.mileageMil != null && context.mileageMil >= 20000) tags.push("Högt miltal");
  if (context.ownersNum != null && context.ownersNum >= 8) tags.push("Många ägare");
  if (context.hasDebt) tags.push("Skuld");
  return uniqueStrings(tags);
}

function buildFallbackProfile(context) {
  const label = compactParts([
    context.brand || "Okänd",
    context.modelName,
    context.gearboxDriveability ? context.gearboxDriveability.toLowerCase() : "",
    context.fuel ? context.fuel.toLowerCase() : "",
  ]);
  const safeLabel = label || "Okänd profil";
  const safeSlug = slugify(safeLabel) || "unknown-profile";
  return {
    primaryProfileId: `generic-${safeSlug}`,
    primaryProfile: safeLabel,
    researchProfileId: `research-${safeSlug}`,
    researchProfile: safeLabel,
    profileSource: "generic-fallback",
  };
}

function computeRefreshPriority(source, confidence) {
  if (source === "generic-rules" || confidence === "low") return "high";
  if (confidence === "medium") return "medium";
  return "low";
}

const PROFILE_DEFINITIONS = [
  {
    id: "toyota-prius",
    label: "Toyota Prius hybrid",
    researchProfileId: "toyota-prius-hybrid",
    researchProfile: "Toyota Prius hybrid",
    profileSource: "known-model-family",
    tags: ["Prius-profil", "Hybrid", "Toyota/Lexus hybrid"],
    matches: (context) => context.brand === "Toyota" && context.modelName === "Prius",
    assess(context) {
      return {
        risk: "Lower",
        confidence: "high",
        source: "model-profile",
        reasons: ["toyota-prius-hybrid-profile"],
        riskNote: "Best model-level reliability signal in this widened budget pool.",
        forumWatchouts:
          "Prius forums keep flagging battery aging, brake-actuator chirp, inverter pump failure, oil use, and rust.",
        serviceDue: stageSentence(
          serviceStage(context),
          "Later: e-CVT fluid if undocumented, plus plugs, coolant history, brake service, and rust inspection.",
          "Soon: e-CVT fluid if undocumented, plugs/coolant history, water-pump check, and suspension inspection.",
          "Now/soon: prove e-CVT fluid, coolant/pump history, and brake service; battery and brake actuator are the next big-ticket risks.",
        ),
        serviceCost: "2k-7k SEK routine; 14k-27k if battery or brake actuator appears later",
      };
    },
  },
  {
    id: "honda-jazz",
    label: "Honda Jazz",
    researchProfileId: "honda-jazz",
    researchProfile: "Honda Jazz",
    profileSource: "known-model-family",
    tags: ["Jazz-profil", "Småbil", "CVT"],
    matches: (context) => context.brand === "Honda" && context.modelName === "Jazz",
    assess(context) {
      return {
        risk: "Lower",
        confidence: "high",
        source: "model-profile",
        reasons: ["honda-jazz-profile"],
        riskNote: "Good reliability reputation, but ask for CVT service history.",
        forumWatchouts:
          "Jazz owners mention CVT shudder if fluid history is poor, rear brake drag, suspension knocks, and rust around the rear arches.",
        serviceDue: genericServiceDue(context, "CVT fluid history, plugs, coolant, rear brakes, and rust inspection"),
        serviceCost: "2k-6k SEK routine; 8k-20k if CVT or rust work appears",
      };
    },
  },
  {
    id: "toyota-multimode",
    label: "Toyota Yaris/Auris MultiMode",
    researchProfileId: "toyota-yaris-auris-multimode",
    researchProfile: "Toyota Yaris/Auris MultiMode",
    profileSource: "known-model-family",
    tags: ["Toyota MultiMode", "Robotiserad manuell"],
    matches: (context) =>
      context.brand === "Toyota" &&
      (context.modelName === "Yaris" || context.modelName === "Auris") &&
      context.isRobotizedManual,
    assess() {
      return {
        risk: "Avoid",
        confidence: "high",
        source: "model-profile",
        reasons: ["toyota-multimode-profile", "robotized-manual"],
        riskNote: "Toyota MultiMode is not a reliability-first automatic in this budget range.",
        forumWatchouts:
          "Owners keep mentioning clutch wear, actuator faults, calibration trouble, flashing gear warnings, and expensive stop-start drivability problems.",
        serviceDue: "Now/soon: clutch wear check, actuator adaptation, gearbox-fluid history, and a full fault-code scan before money changes hands.",
        serviceCost: "3k-8k SEK routine; 8k-20k if clutch or actuator work is needed",
      };
    },
  },
  {
    id: "city-robot-auto",
    label: "Aygo / 107 / C1 robotiserad",
    researchProfileId: "aygo-107-c1-robotized",
    researchProfile: "Aygo / 107 / C1 robotiserad",
    profileSource: "known-model-family",
    tags: ["Aygo/107/C1", "Robotiserad manuell", "Småbil"],
    matches: (context) => context.cityRobotCluster,
    assess() {
      return {
        risk: "Higher",
        confidence: "high",
        source: "model-profile",
        reasons: ["city-robotized-cluster"],
        riskNote: "These city cars are attractive, but the robotized gearbox is the weak point.",
        forumWatchouts:
          "Owner forums mention jerky take-off, flashing N or gearbox warnings, actuator noise, leaks, and cold-start chain rattle.",
        serviceDue: "Soon: clutch wear check, actuator adaptation, plugs, coolant, and front-suspension inspection.",
        serviceCost: "2k-5k SEK routine; 7k-13k clutch; 5k-13k actuator",
      };
    },
  },
  {
    id: "peugeot-207-auto",
    label: "Peugeot 207 automat",
    researchProfileId: "peugeot-207-automatic",
    researchProfile: "Peugeot 207 automat",
    profileSource: "known-model-family",
    tags: ["Peugeot 207 automat"],
    matches: (context) => context.brand === "Peugeot" && context.modelName.startsWith("207"),
    assess() {
      return {
        risk: "Avoid",
        confidence: "high",
        source: "model-profile",
        reasons: ["peugeot-207-auto-profile"],
        riskNote: "Peugeot 207 automatic is one of the riskier drivetrain bets here.",
        forumWatchouts:
          "Owners report harsh shifts, valve-body or actuator trouble, electrical niggles, and cooling leaks turning cheap cars expensive.",
        serviceDue: "Now/soon: gearbox proof, cooling system, suspension, brakes, and rust inspection before treating it as a cheap commuter.",
        serviceCost: "3k-8k SEK routine; 8k-18k if gearbox or actuator work appears",
      };
    },
  },
  {
    id: "older-polo-auto",
    label: "Äldre Volkswagen Polo automat",
    researchProfileId: "older-volkswagen-polo-automatic",
    researchProfile: "Äldre Volkswagen Polo automat",
    profileSource: "known-model-family",
    tags: ["Polo automat", "Äldre automat"],
    matches: (context) =>
      context.brand === "Volkswagen" &&
      context.modelName.startsWith("Polo") &&
      context.gearboxDriveability === "Automat" &&
      context.age != null &&
      context.age >= 10,
    assess() {
      return {
        risk: "Higher",
        confidence: "medium",
        source: "model-profile",
        reasons: ["older-polo-automatic-profile"],
        riskNote: "Older Polo automatics are transmission-sensitive enough to stay below Prius or Jazz.",
        forumWatchouts:
          "Polo owners keep mentioning mechatronic or valve-body faults, chain stretch on some engines, and coolant leaks.",
        serviceDue: "Soon: automatic or DSG service, timing belt/chain proof, water pump, and suspension inspection.",
        serviceCost: "3k-7k SEK service; 8k-18k if mechatronic or chain trouble appears",
      };
    },
  },
  {
    id: "robotized-manual-general",
    label: "Robotiserad manuell",
    researchProfileId: "robotized-manual",
    researchProfile: "Robotiserad manuell",
    profileSource: "drivetrain-family",
    tags: ["Robotiserad manuell"],
    matches: (context) => context.isRobotizedManual,
    assess(context) {
      return {
        risk: "Higher",
        confidence: "medium",
        source: "drivetrain-profile",
        reasons: ["robotized-manual"],
        riskNote: "Robotized gearbox/clutch actuator risk.",
        forumWatchouts: baseWatchouts(context),
        serviceDue: genericServiceDue(context, "clutch wear, actuator adaptation, gearbox-fluid history, and cooling-system health"),
        serviceCost: genericServiceCost(context),
      };
    },
  },
  {
    id: "toyota-lexus-hybrid",
    label: "Toyota/Lexus hybrid",
    researchProfileId: "toyota-lexus-hybrid",
    researchProfile: "Toyota/Lexus hybrid",
    profileSource: "drivetrain-family",
    tags: ["Toyota/Lexus hybrid", "Hybrid"],
    matches: (context) => context.isToyotaOrLexusHybrid,
    assess(context) {
      return {
        risk: "Lower",
        confidence: "medium",
        source: "drivetrain-profile",
        reasons: ["toyota-lexus-hybrid"],
        riskNote: "Toyota/Lexus hybrid driveline is one of the stronger automatic bets if the expensive hybrid parts still behave.",
        forumWatchouts: baseWatchouts(context),
        serviceDue: genericServiceDue(context, "coolant and inverter-pump history, brake service, hybrid-battery symptoms, and rust"),
        serviceCost: genericServiceCost(context),
      };
    },
  },
  {
    id: "small-korean-auto",
    label: "Liten Hyundai/Kia automat",
    researchProfileId: "small-korean-automatic",
    researchProfile: "Liten Hyundai/Kia automat",
    profileSource: "drivetrain-family",
    tags: ["Liten korean automat", "Småbil"],
    matches: (context) =>
      ["Hyundai", "Kia"].includes(context.brand) &&
      ["Accent", "Picanto", "i10"].includes(context.modelName),
    assess(context) {
      return {
        risk: "Medium",
        confidence: "medium",
        source: "model-profile",
        reasons: ["simple-small-korean-auto"],
        riskNote: "Reasonable small-car option, but weaker reliability signal than Prius or Jazz.",
        forumWatchouts:
          "These are simpler bets, but owners still warn against skipped belt work, tired dampers, and rusty exhausts.",
        serviceDue: genericServiceDue(
          context,
          "plugs, coolant, brake fluid, suspension wear items, and timing-belt history if the engine uses one",
        ),
        serviceCost: "2k-6k SEK",
      };
    },
  },
];

function genericAssessment(context) {
  const reasons = [];
  let score = 2;
  let confidence = "low";

  if (context.isPremiumOlderAutomatic) {
    score += 1;
    reasons.push("older-premium-automatic");
    confidence = "medium";
  }

  if (context.isDualClutch && ((context.age != null && context.age >= 10) || (context.mileageMil != null && context.mileageMil >= 16000))) {
    score += 1;
    reasons.push("older-dual-clutch");
    confidence = "medium";
  }

  if (context.mileageMil != null && context.mileageMil >= 25000) {
    score += 1;
    reasons.push("high-mileage");
  }

  if (context.age != null && context.age >= 15) {
    score += 1;
    reasons.push("high-age");
  }

  if (context.ownersNum != null && context.ownersNum >= 8) {
    score += 1;
    reasons.push("many-owners");
  }

  if (context.hasDebt) {
    score += 1;
    reasons.push("debt-flag");
  }

  if (context.isSimpleSmallAutomatic && !context.isRobotizedManual) {
    score -= 1;
    reasons.push("simple-small-car-layout");
  }

  if (context.isCVT && context.brand === "Honda") {
    score -= 1;
    reasons.push("known-honda-cvt-profile");
    confidence = "medium";
  }

  const risk = score <= 1 ? "Lower" : score >= 4 ? "Higher" : "Medium";
  const focus = context.isPremiumOlderAutomatic
    ? "automatic service proof, cooling system, suspension, brakes, and chain/belt evidence"
    : "routine service history, gearbox-fluid proof, coolant, brakes, suspension, and belt/chain evidence";

  return {
    risk,
    confidence,
    source: "generic-rules",
    reasons: reasons.length ? reasons : ["generic-fallback"],
    riskNote: genericRiskNote(risk, context),
    forumWatchouts: baseWatchouts(context),
    serviceDue: genericServiceDue(context, focus),
    serviceCost: genericServiceCost(context),
  };
}

function decorateAssessment(context, assessment, definition) {
  const fallbackProfile = buildFallbackProfile(context);
  const profile = definition
    ? {
        primaryProfileId: definition.id,
        primaryProfile: definition.label,
        researchProfileId: definition.researchProfileId,
        researchProfile: definition.researchProfile,
        profileSource: definition.profileSource,
      }
    : fallbackProfile;

  return {
    ...assessment,
    ...profile,
    profileTags: uniqueStrings([...(definition?.tags ?? []), ...baseProfileTags(context)]),
    refreshPriority: computeRefreshPriority(assessment.source, assessment.confidence),
  };
}

function assessVehicleRisk(input) {
  const context = buildContext(input);
  for (const profile of PROFILE_DEFINITIONS) {
    if (profile.matches(context)) {
      return decorateAssessment(context, profile.assess(context), profile);
    }
  }
  return decorateAssessment(context, genericAssessment(context), null);
}

module.exports = {
  assessVehicleRisk,
};
