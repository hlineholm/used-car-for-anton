import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, "..", "..");
const require = createRequire(import.meta.url);
const { assessVehicleRisk } = require(path.join(repoRoot, "scripts", "risk-engine.cjs")) as {
  assessVehicleRisk: (input: Record<string, unknown>) => {
    risk: string;
    confidence: string;
    source: string;
    reasons: string[];
    primaryProfileId: string;
    primaryProfile: string;
    researchProfileId: string;
    researchProfile: string;
    profileSource: string;
    profileTags: string[];
    refreshPriority: string;
    riskNote: string;
    forumWatchouts: string;
    serviceDue: string;
    serviceCost: string;
  };
};

test("risk engine gives Prius a lower-risk profile", () => {
  const result = assessVehicleRisk({
    brand: "Toyota",
    modelName: "Prius",
    modelSeries: "XW20",
    engine: "1.8 Hybrid",
    trim: "Active",
    fuel: "Hybrid bensin",
    gearboxDriveability: "Automat",
    gearboxDetail: "Automatisk",
    bodyType: "Halvkombi",
    yearNum: 2012,
    mileageMil: 18000,
    ownersNum: 3,
    debtStatus: "No",
  });

  assert.equal(result.risk, "Lower");
  assert.equal(result.source, "model-profile");
  assert.equal(result.primaryProfileId, "toyota-prius");
  assert.equal(result.primaryProfile, "Toyota Prius hybrid");
  assert.ok(result.profileTags.includes("Hybrid"));
  assert.match(result.riskNote, /Best model-level reliability signal|Toyota\/Lexus hybrid driveline/i);
});

test("risk engine marks Toyota MultiMode as avoid", () => {
  const result = assessVehicleRisk({
    brand: "Toyota",
    modelName: "Auris",
    modelSeries: "",
    engine: "1.6",
    trim: "MultiMode",
    fuel: "Bensin",
    gearboxDriveability: "Automat",
    gearboxDetail: "Automatisk",
    bodyType: "Halvkombi",
    yearNum: 2008,
    mileageMil: 21000,
    ownersNum: 5,
    debtStatus: "No",
  });

  assert.equal(result.risk, "Avoid");
  assert.equal(result.primaryProfileId, "toyota-multimode");
  assert.ok(result.profileTags.includes("Robotiserad manuell"));
  assert.match(result.riskNote, /MultiMode/i);
});

test("risk engine marks Aygo/107/C1 robotized cars as higher risk", () => {
  const result = assessVehicleRisk({
    brand: "Toyota",
    modelName: "Aygo",
    modelSeries: "",
    engine: "1.0 VVT-i",
    trim: "MultiMode AC",
    fuel: "Bensin",
    gearboxDriveability: "Automat",
    gearboxDetail: "Automatisk",
    bodyType: "Halvkombi",
    yearNum: 2011,
    mileageMil: 14000,
    ownersNum: 2,
    debtStatus: "No",
  });

  assert.equal(result.risk, "Higher");
  assert.equal(result.primaryProfileId, "city-robot-auto");
  assert.ok(result.profileTags.includes("Aygo\/107\/C1") || result.profileTags.includes("Robotiserad manuell"));
  assert.match(result.forumWatchouts, /jerky take-off|actuator/i);
});

test("risk engine falls back to higher risk for older premium automatics", () => {
  const result = assessVehicleRisk({
    brand: "Jaguar",
    modelName: "XF",
    modelSeries: "",
    engine: "3.0 V6",
    trim: "Euro 5",
    fuel: "Diesel",
    gearboxDriveability: "Automat",
    gearboxDetail: "Automatisk",
    bodyType: "Sedan",
    yearNum: 2011,
    mileageMil: 21500,
    ownersNum: 4,
    debtStatus: "No",
  });

  assert.equal(result.risk, "Higher");
  assert.equal(result.source, "generic-rules");
  assert.match(result.primaryProfileId, /^generic-/);
  assert.equal(result.profileSource, "generic-fallback");
  assert.equal(result.refreshPriority, "high");
});

test("processed data now gives every car a risk assessment", () => {
  const dataPath = path.join(repoRoot, "processed-data.json");
  const data = JSON.parse(readFileSync(dataPath, "utf8")) as {
    lookups?: { primaryProfiles?: string[]; profileTags?: string[] };
    profiles?: Array<{ id?: string; label?: string; count?: number; refreshPriority?: string }>;
    inventory?: Array<{
      canonical?: { risk?: string | null; riskKnown?: boolean; primaryProfile?: string | null; primaryProfileId?: string | null };
      derived?: { profileTags?: string[] };
    }>;
  };

  const inventory = data.inventory ?? [];
  assert.ok(inventory.length > 0);
  assert.equal(
    inventory.filter((item) => item.canonical?.riskKnown !== true || !item.canonical?.risk).length,
    0,
  );
  assert.equal(
    inventory.filter((item) => !item.canonical?.primaryProfile || !item.canonical?.primaryProfileId).length,
    0,
  );
  assert.ok((data.lookups?.primaryProfiles?.length ?? 0) > 0);
  assert.ok((data.lookups?.profileTags?.length ?? 0) > 0);
  assert.ok((data.profiles?.length ?? 0) > 0);
});
