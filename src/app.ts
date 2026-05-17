import {
  dedupeSortValues,
  filterAndSortInventory,
  parseOptionalNumber,
  projectInventoryItem,
  type InventoryItem,
} from "./core.js";

interface SortOption {
  value: string;
  label: string;
}

interface AppData {
  filters: {
    fuels: string[];
    sellers: string[];
    bodies: string[];
    risks: string[];
    sortOptions: SortOption[];
  };
  inventory: InventoryItem[];
  lookups?: {
    brands?: string[];
    locations?: string[];
    modelsByBrand?: Record<string, string[]>;
    fuels?: string[];
    sellers?: string[];
    bodies?: string[];
    gearboxes?: string[];
    risks?: string[];
    regions?: string[];
    distanceBuckets?: string[];
    serviceDueLevels?: string[];
    serviceCostBuckets?: string[];
    priceBuckets?: string[];
    mileageBuckets?: string[];
    ageBuckets?: string[];
    ownersBuckets?: string[];
    pricePerMilBuckets?: string[];
    debtStatuses?: string[];
    registryVerifiedOptions?: string[];
  };
}

type InventoryView = "cards" | "list";

interface FilterPreset {
  brand?: string;
  model?: string;
  series?: string;
  engine?: string;
  trim?: string;
  location?: string;
  region?: string;
  distance?: string;
  search?: string;
  maxPrice?: string | number;
  maxMileage?: string | number;
  fuel?: string;
  gearbox?: string;
  seller?: string;
  body?: string;
  risk?: string;
  riskStatus?: string;
  serviceDue?: string;
  serviceCost?: string;
  priceBucket?: string;
  mileageBucket?: string;
  ageBucket?: string;
  ownersBucket?: string;
  pricePerMilBucket?: string;
  debtStatus?: string;
  registryVerified?: string;
  sort1?: string;
  sort2?: string;
  sort3?: string;
}

interface Shortcut {
  id: string;
  title: string;
  note: string;
  values: FilterPreset;
}

const DATA_URL = "processed-data.json";
const DEFAULT_MAX_PRICE = 50000;
const pageMode = "inventory";
const PAGE_TITLE = "Bilar";

let appData: AppData | null = null;
let inventoryControlsBound = false;
let inventoryView: InventoryView = "list";
let modelOptionsByBrand = new Map<string, string[]>();
let allModelOptions: string[] = [];
let seriesOptionsByBrandModel = new Map<string, string[]>();
let engineOptionsByHierarchy = new Map<string, string[]>();
let trimOptionsByHierarchy = new Map<string, string[]>();
let allSeriesOptions: string[] = [];
let allEngineOptions: string[] = [];
let allTrimOptions: string[] = [];

function must<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Saknar element: #${id}`);
  }
  return element as T;
}

const elements = {
  shortcutRoot: must<HTMLDivElement>("shortcut-root"),
  viewCards: must<HTMLButtonElement>("view-cards"),
  viewList: must<HTMLButtonElement>("view-list"),
  status: must<HTMLParagraphElement>("page-status"),
  brand: must<HTMLSelectElement>("brand"),
  model: must<HTMLSelectElement>("model"),
  series: must<HTMLSelectElement>("series"),
  engine: must<HTMLSelectElement>("engine"),
  trim: must<HTMLSelectElement>("trim"),
  location: must<HTMLSelectElement>("location"),
  region: must<HTMLSelectElement>("region"),
  distance: must<HTMLSelectElement>("distance"),
  search: must<HTMLInputElement>("search"),
  maxPrice: must<HTMLInputElement>("max-price"),
  maxMileage: must<HTMLInputElement>("max-mileage"),
  fuel: must<HTMLSelectElement>("fuel"),
  gearbox: must<HTMLSelectElement>("gearbox"),
  seller: must<HTMLSelectElement>("seller"),
  body: must<HTMLSelectElement>("body"),
  risk: must<HTMLSelectElement>("risk"),
  riskStatus: must<HTMLSelectElement>("risk-status"),
  serviceDue: must<HTMLSelectElement>("service-due"),
  serviceCost: must<HTMLSelectElement>("service-cost"),
  priceBucket: must<HTMLSelectElement>("price-bucket"),
  mileageBucket: must<HTMLSelectElement>("mileage-bucket"),
  ageBucket: must<HTMLSelectElement>("age-bucket"),
  ownersBucket: must<HTMLSelectElement>("owners-bucket"),
  pricePerMilBucket: must<HTMLSelectElement>("price-per-mil-bucket"),
  debtStatus: must<HTMLSelectElement>("debt-status"),
  registryVerified: must<HTMLSelectElement>("registry-verified"),
  sort1: must<HTMLSelectElement>("sort-1"),
  sort2: must<HTMLSelectElement>("sort-2"),
  sort3: must<HTMLSelectElement>("sort-3"),
  reset: must<HTMLButtonElement>("reset-filters"),
  resultsSummary: must<HTMLSpanElement>("results-summary"),
  inventoryBody: must<HTMLDivElement>("inventory-body"),
};

const activeControlSpecs: Array<{ control: HTMLInputElement | HTMLSelectElement; isActive: () => boolean }> = [
  { control: elements.brand, isActive: () => elements.brand.value !== "All" },
  { control: elements.model, isActive: () => elements.model.value !== "All" },
  { control: elements.series, isActive: () => elements.series.value !== "All" },
  { control: elements.engine, isActive: () => elements.engine.value !== "All" },
  { control: elements.trim, isActive: () => elements.trim.value !== "All" },
  { control: elements.location, isActive: () => elements.location.value !== "All" },
  { control: elements.region, isActive: () => elements.region.value !== "All" },
  { control: elements.distance, isActive: () => elements.distance.value !== "All" },
  { control: elements.search, isActive: () => elements.search.value.trim() !== "" },
  {
    control: elements.maxPrice,
    isActive: () => {
      const value = parseOptionalNumber(elements.maxPrice.value);
      return value !== null && value !== DEFAULT_MAX_PRICE;
    },
  },
  { control: elements.maxMileage, isActive: () => parseOptionalNumber(elements.maxMileage.value) !== null },
  { control: elements.fuel, isActive: () => elements.fuel.value !== "All" },
  { control: elements.gearbox, isActive: () => elements.gearbox.value !== "All" },
  { control: elements.seller, isActive: () => elements.seller.value !== "All" },
  { control: elements.body, isActive: () => elements.body.value !== "All" },
  { control: elements.risk, isActive: () => elements.risk.value !== "All" },
  { control: elements.riskStatus, isActive: () => elements.riskStatus.value !== "known" },
  { control: elements.serviceDue, isActive: () => elements.serviceDue.value !== "All" },
  { control: elements.serviceCost, isActive: () => elements.serviceCost.value !== "All" },
  { control: elements.priceBucket, isActive: () => elements.priceBucket.value !== "All" },
  { control: elements.mileageBucket, isActive: () => elements.mileageBucket.value !== "All" },
  { control: elements.ageBucket, isActive: () => elements.ageBucket.value !== "All" },
  { control: elements.ownersBucket, isActive: () => elements.ownersBucket.value !== "All" },
  { control: elements.pricePerMilBucket, isActive: () => elements.pricePerMilBucket.value !== "All" },
  { control: elements.debtStatus, isActive: () => elements.debtStatus.value !== "All" },
  { control: elements.registryVerified, isActive: () => elements.registryVerified.value !== "All" },
  { control: elements.sort1, isActive: () => elements.sort1.value !== "none" },
  { control: elements.sort2, isActive: () => elements.sort2.value !== "none" },
  { control: elements.sort3, isActive: () => elements.sort3.value !== "none" },
];

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function badgeClass(risk: string): string {
  const normalizedRisk = String(risk || "unrated").toLowerCase();
  return `badge badge-${normalizedRisk === "unknown" ? "unrated" : normalizedRisk}`;
}

function riskLabel(risk: string): string {
  switch (risk) {
    case "Lower":
      return "Låg";
    case "Medium":
      return "Mellan";
    case "Higher":
      return "Hög";
    case "Avoid":
      return "Undvik";
    case "Unrated":
    case "Unknown":
      return "Ej bedömd";
    default:
      return risk;
  }
}

function serviceDueLabel(value: string): string {
  switch (value) {
    case "Now":
      return "Nu";
    case "Soon":
      return "Snart";
    case "Later":
      return "Senare";
    case "Unknown":
      return "Okänt";
    default:
      return value;
  }
}

function debtLabel(value: string | undefined): string {
  switch (value) {
    case "Yes":
      return "Ja";
    case "No":
      return "Nej";
    default:
      return "Okänt";
  }
}

function registryLabel(value: boolean | undefined): string {
  return value ? "Bekräftad" : "Ej bekräftad";
}

function riskStatusLabel(value: string): string {
  switch (value) {
    case "known":
      return "Bedömd";
    case "unknown":
      return "Ej bedömd";
    default:
      return "Alla";
  }
}

function pricePerMilLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "Okänt";
  return `${String(value).replace(".", ",")} kr/mil`;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ja" : "Nej";
  return String(value);
}

function renderFieldGroup(title: string, rows: Array<[string, unknown]>): string {
  return `
    <section class="field-group">
      <h4>${escapeHtml(title)}</h4>
      <dl class="field-list">
        ${rows
          .map(
            ([label, value]) => `
              <div class="field-row">
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(formatValue(value))}</dd>
              </div>
            `,
          )
          .join("")}
      </dl>
    </section>
  `;
}

function renderItemDetails(item: InventoryItem): string {
  const projected = projectInventoryItem(item);
  return `
    <details class="item-details">
      <summary>Fält</summary>
      <div class="field-groups">
        ${renderFieldGroup("Modell", [
          ["Märke", projected.brand],
          ["Modell", projected.modelName],
          ["Serie", projected.modelSeries],
          ["Motor", projected.engine],
          ["Trim", projected.trim],
          ["Växellåda detalj", projected.gearboxDetail],
        ])}
        ${renderFieldGroup("Analys", [
          ["Risk bedömd", projected.riskKnown],
          ["Prisintervall", projected.priceBucket],
          ["Miltalshink", projected.mileageBucket],
          ["Ålder", projected.age],
          ["Åldershink", projected.ageBucket],
          ["Ägarhink", projected.ownersBucket],
          ["Service", projected.serviceDueLevel],
          ["Kostnadshink", projected.serviceCostBucket],
          ["Pris per mil", pricePerMilLabel(projected.pricePerMil)],
          ["Pris/mil-hink", projected.pricePerMilBucket],
          ["Skuld", debtLabel(projected.debtStatus)],
          ["Register", registryLabel(projected.registryVerified)],
        ])}
        ${renderFieldGroup("Källa", [
          ["Modell rå", item.source?.modelRaw],
          ["Trim rå", item.source?.trimRaw],
          ["Pris rå", item.source?.priceRaw],
          ["Miltal rå", item.source?.mileageRaw],
          ["År rå", item.source?.yearRaw],
          ["Drivmedel rå", item.source?.fuelRaw],
          ["Växellåda rå", item.source?.gearboxRaw],
          ["Kaross rå", item.source?.bodyRaw],
          ["Ort rå", item.source?.locationRaw],
          ["Säljare rå", item.source?.sellerRaw],
          ["Ägare rå", item.source?.ownersRaw],
          ["Risk rå", item.source?.riskRaw],
          ["Service rå", item.source?.serviceDueRaw],
          ["Kostnad rå", item.source?.serviceCostRaw],
          ["Reg rå", item.source?.regRaw],
          ["Skuld rå", item.source?.debtRaw],
          ["Registerråd", item.source?.registryNoteRaw],
        ])}
        ${renderFieldGroup("Noteringar", [
          ["Risknot", item.riskNote],
          ["Forum", item.forumWatchouts],
        ])}
      </div>
    </details>
  `;
}

function displayFromItem(item: InventoryItem) {
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
    serviceDue: item.display?.serviceDue ?? "Okänt",
    serviceCost: item.display?.serviceCost ?? "Okänt",
    reg: item.display?.reg ?? item.reg,
  };
}

function populateSelect(
  select: HTMLSelectElement,
  values: Array<string | SortOption>,
  selectedValue = "All",
  includeAll = true,
): void {
  const options: string[] = [];
  if (includeAll) {
    options.push('<option value="All">Alla</option>');
  }
  for (const value of values) {
    if (typeof value === "string") {
      const label =
        select.id === "risk"
          ? riskLabel(value)
          : select.id === "service-due"
            ? serviceDueLabel(value)
            : select.id === "risk-status"
              ? riskStatusLabel(value)
              : select.id === "debt-status"
                ? debtLabel(value)
                : select.id === "registry-verified"
                  ? registryLabel(value === "true")
                  : value;
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

function hierarchyValue(value: string | null | undefined): string {
  const clean = String(value ?? "").trim();
  return clean || "Okänt";
}

function hierarchyKey(parts: string[]): string {
  return parts.join("\u0000");
}

function buildStructuredFilterCatalog(): { brandOptions: string[]; locationOptions: string[] } {
  if (!appData) {
    return { brandOptions: [], locationOptions: [] };
  }

  const brands = new Set<string>();
  const locations = new Set<string>();
  modelOptionsByBrand = new Map<string, string[]>();
  seriesOptionsByBrandModel = new Map<string, string[]>();
  engineOptionsByHierarchy = new Map<string, string[]>();
  trimOptionsByHierarchy = new Map<string, string[]>();
  const seriesOptions = new Set<string>();
  const engineOptions = new Set<string>();
  const trimOptions = new Set<string>();

  for (const item of appData.inventory) {
    const projected = projectInventoryItem(item);
    const brand = projected.brand;
    const modelName = projected.modelName;
    const series = hierarchyValue(projected.modelSeries);
    const engine = hierarchyValue(projected.engine);
    const trim = hierarchyValue(projected.trim);
    item.brand = brand;
    item.modelName = modelName;
    brands.add(brand);
    locations.add(projected.location);
    if (!modelOptionsByBrand.has(brand)) {
      modelOptionsByBrand.set(brand, []);
    }
    modelOptionsByBrand.get(brand)!.push(modelName);
    const brandModelKey = hierarchyKey([brand, modelName]);
    if (!seriesOptionsByBrandModel.has(brandModelKey)) {
      seriesOptionsByBrandModel.set(brandModelKey, []);
    }
    seriesOptionsByBrandModel.get(brandModelKey)!.push(series);
    const hierarchyWithSeriesKey = hierarchyKey([brand, modelName, series]);
    if (!engineOptionsByHierarchy.has(hierarchyWithSeriesKey)) {
      engineOptionsByHierarchy.set(hierarchyWithSeriesKey, []);
    }
    engineOptionsByHierarchy.get(hierarchyWithSeriesKey)!.push(engine);
    const hierarchyWithEngineKey = hierarchyKey([brand, modelName, series, engine]);
    if (!trimOptionsByHierarchy.has(hierarchyWithEngineKey)) {
      trimOptionsByHierarchy.set(hierarchyWithEngineKey, []);
    }
    trimOptionsByHierarchy.get(hierarchyWithEngineKey)!.push(trim);
    seriesOptions.add(series);
    engineOptions.add(engine);
    trimOptions.add(trim);
  }

  const collator = new Intl.Collator("sv", { sensitivity: "base" });
  const brandOptions = [...brands].sort((a, b) => collator.compare(a, b));
  const locationOptions = [...locations].sort((a, b) => collator.compare(a, b));
  allModelOptions = [...new Set(appData.inventory.map((item) => projectInventoryItem(item).modelName || "Okänd"))].sort((a, b) =>
    collator.compare(a, b),
  );
  allSeriesOptions = [...seriesOptions].sort((a, b) => collator.compare(a, b));
  allEngineOptions = [...engineOptions].sort((a, b) => collator.compare(a, b));
  allTrimOptions = [...trimOptions].sort((a, b) => collator.compare(a, b));

  for (const [brand, models] of modelOptionsByBrand.entries()) {
    modelOptionsByBrand.set(
      brand,
      [...new Set(models)].sort((a, b) => collator.compare(a, b)),
    );
  }
  for (const [key, values] of seriesOptionsByBrandModel.entries()) {
    seriesOptionsByBrandModel.set(
      key,
      [...new Set(values)].sort((a, b) => collator.compare(a, b)),
    );
  }
  for (const [key, values] of engineOptionsByHierarchy.entries()) {
    engineOptionsByHierarchy.set(
      key,
      [...new Set(values)].sort((a, b) => collator.compare(a, b)),
    );
  }
  for (const [key, values] of trimOptionsByHierarchy.entries()) {
    trimOptionsByHierarchy.set(
      key,
      [...new Set(values)].sort((a, b) => collator.compare(a, b)),
    );
  }

  return { brandOptions, locationOptions };
}

function updateModelOptions(selectedBrand: string, selectedModel = "All"): void {
  const modelOptions = selectedBrand === "All" ? allModelOptions : modelOptionsByBrand.get(selectedBrand) ?? [];
  populateSelect(elements.model, modelOptions, selectedModel, true);
}

function updateSeriesOptions(selectedBrand: string, selectedModel: string, selectedSeries = "All"): void {
  const options =
    selectedBrand === "All" || selectedModel === "All"
      ? allSeriesOptions
      : seriesOptionsByBrandModel.get(hierarchyKey([selectedBrand, selectedModel])) ?? [];
  populateSelect(elements.series, options, selectedSeries, true);
}

function updateEngineOptions(selectedBrand: string, selectedModel: string, selectedSeries: string, selectedEngine = "All"): void {
  const options =
    selectedBrand === "All" || selectedModel === "All"
      ? allEngineOptions
      : engineOptionsByHierarchy.get(hierarchyKey([selectedBrand, selectedModel, hierarchyValue(selectedSeries)])) ?? [];
  populateSelect(elements.engine, options, selectedEngine, true);
}

function updateTrimOptions(
  selectedBrand: string,
  selectedModel: string,
  selectedSeries: string,
  selectedEngine: string,
  selectedTrim = "All",
): void {
  const options =
    selectedBrand === "All" || selectedModel === "All"
      ? allTrimOptions
      : trimOptionsByHierarchy.get(
          hierarchyKey([selectedBrand, selectedModel, hierarchyValue(selectedSeries), hierarchyValue(selectedEngine)]),
        ) ?? [];
  populateSelect(elements.trim, options, selectedTrim, true);
}

function refreshHierarchyOptions(): void {
  updateSeriesOptions(elements.brand.value, elements.model.value, elements.series.value);
  updateEngineOptions(elements.brand.value, elements.model.value, elements.series.value, elements.engine.value);
  updateTrimOptions(elements.brand.value, elements.model.value, elements.series.value, elements.engine.value, elements.trim.value);
}

function renderSummary(): void {
  document.title = PAGE_TITLE;
}

function setFilters(values: FilterPreset): void {
  if (values.brand !== undefined) {
    elements.brand.value = String(values.brand);
    updateModelOptions(String(values.brand), String(values.model ?? "All"));
    updateSeriesOptions(String(values.brand), String(values.model ?? "All"), String(values.series ?? "All"));
    updateEngineOptions(
      String(values.brand),
      String(values.model ?? "All"),
      String(values.series ?? "All"),
      String(values.engine ?? "All"),
    );
    updateTrimOptions(
      String(values.brand),
      String(values.model ?? "All"),
      String(values.series ?? "All"),
      String(values.engine ?? "All"),
      String(values.trim ?? "All"),
    );
  } else if (values.model !== undefined) {
    updateModelOptions(elements.brand.value, String(values.model));
    updateSeriesOptions(elements.brand.value, String(values.model), String(values.series ?? "All"));
    updateEngineOptions(
      elements.brand.value,
      String(values.model),
      String(values.series ?? "All"),
      String(values.engine ?? "All"),
    );
    updateTrimOptions(
      elements.brand.value,
      String(values.model),
      String(values.series ?? "All"),
      String(values.engine ?? "All"),
      String(values.trim ?? "All"),
    );
  }
  if (values.location !== undefined) elements.location.value = String(values.location);
  if (values.series !== undefined) elements.series.value = String(values.series);
  if (values.engine !== undefined) elements.engine.value = String(values.engine);
  if (values.trim !== undefined) elements.trim.value = String(values.trim);
  if (values.region !== undefined) elements.region.value = String(values.region);
  if (values.distance !== undefined) elements.distance.value = String(values.distance);
  if (values.model !== undefined) elements.model.value = String(values.model);
  if (values.search !== undefined) elements.search.value = String(values.search);
  if (values.maxPrice !== undefined) elements.maxPrice.value = String(values.maxPrice);
  if (values.maxMileage !== undefined) elements.maxMileage.value = String(values.maxMileage);
  if (values.fuel !== undefined) elements.fuel.value = String(values.fuel);
  if (values.gearbox !== undefined) elements.gearbox.value = String(values.gearbox);
  if (values.seller !== undefined) elements.seller.value = String(values.seller);
  if (values.body !== undefined) elements.body.value = String(values.body);
  if (values.risk !== undefined) elements.risk.value = String(values.risk);
  if (values.riskStatus !== undefined) elements.riskStatus.value = String(values.riskStatus);
  if (values.serviceDue !== undefined) elements.serviceDue.value = String(values.serviceDue);
  if (values.serviceCost !== undefined) elements.serviceCost.value = String(values.serviceCost);
  if (values.priceBucket !== undefined) elements.priceBucket.value = String(values.priceBucket);
  if (values.mileageBucket !== undefined) elements.mileageBucket.value = String(values.mileageBucket);
  if (values.ageBucket !== undefined) elements.ageBucket.value = String(values.ageBucket);
  if (values.ownersBucket !== undefined) elements.ownersBucket.value = String(values.ownersBucket);
  if (values.pricePerMilBucket !== undefined) elements.pricePerMilBucket.value = String(values.pricePerMilBucket);
  if (values.debtStatus !== undefined) elements.debtStatus.value = String(values.debtStatus);
  if (values.registryVerified !== undefined) elements.registryVerified.value = String(values.registryVerified);
  if (values.sort1 !== undefined) elements.sort1.value = String(values.sort1);
  if (values.sort2 !== undefined) elements.sort2.value = String(values.sort2);
  if (values.sort3 !== undefined) elements.sort3.value = String(values.sort3);
  renderInventory();
}

function renderShortcuts(): void {
  const shortcuts: Shortcut[] = [
    {
      id: "prius",
      title: "Prius",
      note: "Bra förstaval.",
      values: {
        brand: "Toyota",
        model: "Prius",
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
        riskStatus: "known",
        serviceDue: "All",
        serviceCost: "All",
        priceBucket: "All",
        mileageBucket: "All",
        ageBucket: "All",
        ownersBucket: "All",
        pricePerMilBucket: "All",
        debtStatus: "All",
        registryVerified: "All",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "jazz",
      title: "Jazz",
      note: "Bra familjeval.",
      values: {
        brand: "Honda",
        model: "Jazz",
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
        riskStatus: "known",
        serviceDue: "All",
        serviceCost: "All",
        priceBucket: "All",
        mileageBucket: "All",
        ageBucket: "All",
        ownersBucket: "All",
        pricePerMilBucket: "All",
        debtStatus: "All",
        registryVerified: "All",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "city",
      title: "Aygo / 107 / C1",
      note: "Små stadsbilar.",
      values: {
        brand: "All",
        model: "All",
        series: "All",
        engine: "All",
        trim: "All",
        location: "All",
        region: "All",
        distance: "All",
        search: "Aygo | 107 | C1",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        gearbox: "All",
        seller: "All",
        body: "All",
        risk: "All",
        riskStatus: "known",
        serviceDue: "All",
        serviceCost: "All",
        priceBucket: "All",
        mileageBucket: "All",
        ageBucket: "All",
        ownersBucket: "All",
        pricePerMilBucket: "All",
        debtStatus: "All",
        registryVerified: "All",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "avoid",
      title: "Undvik",
      note: "Yaris/Auris/207/Polo.",
      values: {
        brand: "All",
        model: "All",
        series: "All",
        engine: "All",
        trim: "All",
        location: "All",
        region: "All",
        distance: "All",
        search: "Yaris | Auris | 207 | Polo",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        gearbox: "All",
        seller: "All",
        body: "All",
        risk: "Avoid",
        riskStatus: "known",
        serviceDue: "All",
        serviceCost: "All",
        priceBucket: "All",
        mileageBucket: "All",
        ageBucket: "All",
        ownersBucket: "All",
        pricePerMilBucket: "All",
        debtStatus: "All",
        registryVerified: "All",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "lowmiles",
      title: "Låg mil",
      note: "Visa lägst mil först.",
      values: {
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
        maxMileage: 15000,
        fuel: "All",
        gearbox: "All",
        seller: "All",
        body: "All",
        risk: "All",
        riskStatus: "known",
        serviceDue: "All",
        serviceCost: "All",
        priceBucket: "All",
        mileageBucket: "All",
        ageBucket: "All",
        ownersBucket: "All",
        pricePerMilBucket: "All",
        debtStatus: "All",
        registryVerified: "All",
        sort1: "mileage-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "clear",
      title: "Nollställ",
      note: "Tillbaka till alla.",
      values: {
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
        riskStatus: "known",
        serviceDue: "All",
        serviceCost: "All",
        priceBucket: "All",
        mileageBucket: "All",
        ageBucket: "All",
        ownersBucket: "All",
        pricePerMilBucket: "All",
        debtStatus: "All",
        registryVerified: "All",
        sort1: "none",
        sort2: "none",
        sort3: "none",
      },
    },
  ];

  elements.shortcutRoot.innerHTML = `<div class="shortcut-grid">${shortcuts
    .map(
      (shortcut) => `
        <button class="shortcut-card" type="button" data-shortcut="${shortcut.id}">
          <strong>${escapeHtml(shortcut.title)}</strong>
          <span class="muted">${escapeHtml(shortcut.note)}</span>
        </button>
      `,
    )
    .join("")}</div>`;

  elements.shortcutRoot.querySelectorAll<HTMLButtonElement>("[data-shortcut]").forEach((button) => {
    const shortcut = shortcuts.find((item) => item.id === button.dataset.shortcut);
    if (!shortcut) return;
    button.addEventListener("click", () => setFilters(shortcut.values));
  });
}

function getSortValues(): string[] {
  return dedupeSortValues([elements.sort1.value, elements.sort2.value, elements.sort3.value]);
}

function updateActiveFilterHighlights(): void {
  for (const spec of activeControlSpecs) {
    const wrapper = spec.control.parentElement;
    if (!wrapper) continue;
    wrapper.classList.toggle("is-active", spec.isActive());
  }
}

function renderInventoryRows(rows: InventoryItem[]): void {
  if (inventoryView === "cards") {
    elements.inventoryBody.className = "car-grid";
    elements.inventoryBody.innerHTML = rows
      .map(
        (item) => {
          const display = displayFromItem(item);
          const projected = projectInventoryItem(item);
          return `
          <article class="car-card">
            <div class="car-card-header">
              <div>
                <h3>${escapeHtml(display.name)}</h3>
                <div class="muted">${escapeHtml(display.version || "—")}</div>
              </div>
              <span class="${badgeClass(projected.risk ?? "Unknown")}">${escapeHtml(display.risk)}</span>
            </div>
            <div class="car-meta">
              <div><span class="label">År</span>${escapeHtml(display.year)}</div>
              <div><span class="label">Miltal</span>${escapeHtml(display.mileage)}</div>
              <div><span class="label">Pris</span>${escapeHtml(display.price)}</div>
              <div><span class="label">Drivmedel</span>${escapeHtml(display.fuel)}</div>
              <div><span class="label">Växellåda</span>${escapeHtml(display.gearbox)}</div>
              <div><span class="label">Ort</span>${escapeHtml(display.location)}</div>
              <div><span class="label">Län</span>${escapeHtml(display.region)}</div>
              <div><span class="label">Avstånd</span>${escapeHtml(display.distance)}</div>
              <div><span class="label">Säljare</span>${escapeHtml(display.seller)}</div>
              <div><span class="label">Kaross</span>${escapeHtml(display.body)}</div>
              <div><span class="label">Ägare</span>${escapeHtml(display.owners)}</div>
              <div><span class="label">Service</span>${escapeHtml(display.serviceDue)}</div>
              <div><span class="label">Kostnad</span>${escapeHtml(display.serviceCost)}</div>
              <div><span class="label">Reg</span>${escapeHtml(display.reg)}</div>
              <div><span class="label">Länk</span><a href="${escapeHtml(item.href)}">Blocket</a></div>
            </div>
            ${renderItemDetails(item)}
          </article>
        `;
        },
      )
      .join("");
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
          <th>År</th>
          <th>Miltal</th>
          <th>Pris</th>
          <th>Drivmedel</th>
          <th>Växellåda</th>
          <th>Ort</th>
          <th>Län</th>
          <th>Avstånd</th>
          <th>Säljare</th>
          <th>Kaross</th>
          <th>Ägare</th>
          <th>Service</th>
          <th>Kostnad</th>
          <th>Reg</th>
          <th>Fält</th>
          <th>Länk</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (item) => {
              const display = displayFromItem(item);
              const projected = projectInventoryItem(item);
              return `
          <tr>
            <td>${escapeHtml(display.name)}</td>
            <td>${escapeHtml(display.version || "—")}</td>
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
            },
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderInventory(): void {
  if (!appData) return;
  const maxPrice = parseOptionalNumber(elements.maxPrice.value);
  const maxMileage = parseOptionalNumber(elements.maxMileage.value);
  const sortValues = getSortValues();
  const filtered = filterAndSortInventory(
    appData.inventory,
    {
      brand: elements.brand.value,
      model: elements.model.value,
      series: elements.series.value,
      engine: elements.engine.value,
      trim: elements.trim.value,
      location: elements.location.value,
      region: elements.region.value,
      distance: elements.distance.value,
      search: elements.search.value.trim(),
      maxPrice,
      maxMileage,
      fuel: elements.fuel.value,
      gearbox: elements.gearbox.value,
      seller: elements.seller.value,
      body: elements.body.value,
      risk: elements.risk.value,
      riskStatus: elements.riskStatus.value,
      serviceDue: elements.serviceDue.value,
      serviceCost: elements.serviceCost.value,
      priceBucket: elements.priceBucket.value,
      mileageBucket: elements.mileageBucket.value,
      ageBucket: elements.ageBucket.value,
      ownersBucket: elements.ownersBucket.value,
      pricePerMilBucket: elements.pricePerMilBucket.value,
      debtStatus: elements.debtStatus.value,
      registryVerified: elements.registryVerified.value,
    },
    sortValues,
  );

  renderInventoryRows(filtered);
  elements.resultsSummary.textContent = `Visar ${filtered.length} av ${appData.inventory.length} bilar`;
  updateActiveFilterHighlights();
  elements.viewCards.classList.toggle("active", inventoryView === "cards");
  elements.viewList.classList.toggle("active", inventoryView === "list");
}

function bindInventoryControls(): void {
  if (inventoryControlsBound) return;
  inventoryControlsBound = true;

  const listeners: Array<HTMLInputElement | HTMLSelectElement> = [
    elements.model,
    elements.series,
    elements.engine,
    elements.trim,
    elements.location,
    elements.region,
    elements.distance,
    elements.search,
    elements.maxPrice,
    elements.maxMileage,
    elements.fuel,
    elements.gearbox,
    elements.seller,
    elements.body,
    elements.risk,
    elements.riskStatus,
    elements.serviceDue,
    elements.serviceCost,
    elements.priceBucket,
    elements.mileageBucket,
    elements.ageBucket,
    elements.ownersBucket,
    elements.pricePerMilBucket,
    elements.debtStatus,
    elements.registryVerified,
    elements.sort1,
    elements.sort2,
    elements.sort3,
  ];

  listeners.forEach((control) => {
    control.addEventListener("input", renderInventory);
    control.addEventListener("change", renderInventory);
  });

  elements.brand.addEventListener("change", () => {
    updateModelOptions(elements.brand.value, "All");
    updateSeriesOptions(elements.brand.value, "All", "All");
    updateEngineOptions(elements.brand.value, "All", "All", "All");
    updateTrimOptions(elements.brand.value, "All", "All", "All", "All");
    renderInventory();
  });

  elements.model.addEventListener("change", () => {
    updateSeriesOptions(elements.brand.value, elements.model.value, "All");
    updateEngineOptions(elements.brand.value, elements.model.value, "All", "All");
    updateTrimOptions(elements.brand.value, elements.model.value, "All", "All", "All");
    renderInventory();
  });

  elements.series.addEventListener("change", () => {
    updateEngineOptions(elements.brand.value, elements.model.value, elements.series.value, "All");
    updateTrimOptions(elements.brand.value, elements.model.value, elements.series.value, "All", "All");
    renderInventory();
  });

  elements.engine.addEventListener("change", () => {
    updateTrimOptions(elements.brand.value, elements.model.value, elements.series.value, elements.engine.value, "All");
    renderInventory();
  });

  elements.reset.addEventListener("click", () => {
    elements.brand.value = "All";
    updateModelOptions("All", "All");
    updateSeriesOptions("All", "All", "All");
    updateEngineOptions("All", "All", "All", "All");
    updateTrimOptions("All", "All", "All", "All", "All");
    elements.location.value = "All";
    elements.region.value = "All";
    elements.distance.value = "All";
    elements.search.value = "";
    elements.maxPrice.value = String(DEFAULT_MAX_PRICE);
    elements.maxMileage.value = "";
    elements.fuel.value = "All";
    elements.gearbox.value = "All";
    elements.seller.value = "All";
    elements.body.value = "All";
    elements.risk.value = "All";
    elements.riskStatus.value = "known";
    elements.serviceDue.value = "All";
    elements.serviceCost.value = "All";
    elements.priceBucket.value = "All";
    elements.mileageBucket.value = "All";
    elements.ageBucket.value = "All";
    elements.ownersBucket.value = "All";
    elements.pricePerMilBucket.value = "All";
    elements.debtStatus.value = "All";
    elements.registryVerified.value = "All";
    elements.sort1.value = "none";
    elements.sort2.value = "none";
    elements.sort3.value = "none";
    renderInventory();
  });

  elements.viewCards.addEventListener("click", () => {
    inventoryView = "cards";
    renderInventory();
  });

  elements.viewList.addEventListener("click", () => {
    inventoryView = "list";
    renderInventory();
  });
}

async function loadData(): Promise<AppData> {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<AppData>;
}

async function init(): Promise<void> {
  try {
    appData = await loadData();
    renderSummary();
    renderShortcuts();

    if (pageMode === "inventory") {
      const { brandOptions, locationOptions } = buildStructuredFilterCatalog();
      populateSelect(elements.brand, brandOptions);
      populateSelect(elements.location, locationOptions);
      populateSelect(elements.region, appData.lookups?.regions ?? []);
      populateSelect(elements.distance, appData.lookups?.distanceBuckets ?? []);
      updateModelOptions("All", "All");
      updateSeriesOptions("All", "All", "All");
      updateEngineOptions("All", "All", "All", "All");
      updateTrimOptions("All", "All", "All", "All", "All");
      populateSelect(elements.fuel, appData.lookups?.fuels ?? appData.filters.fuels);
      populateSelect(elements.gearbox, appData.lookups?.gearboxes ?? []);
      populateSelect(elements.seller, appData.lookups?.sellers ?? appData.filters.sellers);
      populateSelect(elements.body, appData.lookups?.bodies ?? appData.filters.bodies);
      populateSelect(elements.risk, appData.lookups?.risks ?? appData.filters.risks.filter((risk) => risk !== "Unrated"));
      populateSelect(elements.riskStatus, ["known", "unknown"], "known");
      populateSelect(elements.serviceDue, appData.lookups?.serviceDueLevels ?? []);
      populateSelect(elements.serviceCost, appData.lookups?.serviceCostBuckets ?? []);
      populateSelect(elements.priceBucket, appData.lookups?.priceBuckets ?? []);
      populateSelect(elements.mileageBucket, appData.lookups?.mileageBuckets ?? []);
      populateSelect(elements.ageBucket, appData.lookups?.ageBuckets ?? []);
      populateSelect(elements.ownersBucket, appData.lookups?.ownersBuckets ?? []);
      populateSelect(elements.pricePerMilBucket, appData.lookups?.pricePerMilBuckets ?? []);
      populateSelect(elements.debtStatus, appData.lookups?.debtStatuses ?? []);
      populateSelect(elements.registryVerified, appData.lookups?.registryVerifiedOptions ?? []);
      populateSelect(elements.sort1, appData.filters.sortOptions, "none", false);
      populateSelect(elements.sort2, appData.filters.sortOptions, "none", false);
      populateSelect(elements.sort3, appData.filters.sortOptions, "none", false);
      bindInventoryControls();
      renderInventory();
    }

    elements.status.textContent = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.status.textContent = `Kunde inte läsa data: ${message}`;
  }
}

void init();
