import {
  compareItems,
  dedupeSortValues,
  matchesSearch,
  parseBrandModel,
  parseOptionalNumber,
  parseSearchQuery,
  type InventoryItem,
} from "./core.js";

interface SummaryCount {
  name: string;
  count: number;
}

interface SummaryCard {
  label: string;
  value: string;
}

interface SortOption {
  value: string;
  label: string;
}

interface AppData {
  copy: {
    inventoryTitle: string;
    inventoryIntroHtml: string;
    shortlistTitle: string;
    shortlistIntroHtml: string;
    serviceDisclaimer: string;
    inventoryBottomLineHeading: string;
    inventoryBottomLineHtml: string;
    shortlistBottomLineHeading: string;
    shortlistBottomLineHtml: string;
    inventoryFilterIntro: string;
  };
  summary: {
    inventoryCards: SummaryCard[];
    shortlistCards: SummaryCard[];
    modelSpotCheck: SummaryCount[];
    topModels: SummaryCount[];
    topLocations: SummaryCount[];
    rules: string[];
  };
  filters: {
    fuels: string[];
    sellers: string[];
    bodies: string[];
    risks: string[];
    sortOptions: SortOption[];
  };
  inventory: InventoryItem[];
}

type InventoryView = "cards" | "list";

interface FilterPreset {
  brand?: string;
  model?: string;
  location?: string;
  search?: string;
  maxPrice?: string | number;
  maxMileage?: string | number;
  fuel?: string;
  seller?: string;
  body?: string;
  risk?: string;
  unrated?: string;
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

const DATA_URL = "data.json";
const DEFAULT_MAX_PRICE = 50000;
const pageMode = "inventory";

let appData: AppData | null = null;
let inventoryControlsBound = false;
let inventoryView: InventoryView = "list";
let sortLabelByValue: Record<string, string> = {};
let modelOptionsByBrand = new Map<string, string[]>();
let allModelOptions: string[] = [];

function must<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: #${id}`);
  }
  return element as T;
}

const elements = {
  heading: must<HTMLHeadingElement>("page-heading"),
  intro: must<HTMLParagraphElement>("page-intro"),
  serviceDisclaimer: must<HTMLParagraphElement>("service-disclaimer"),
  bottomLineHeading: must<HTMLHeadingElement>("bottom-line-heading"),
  bottomLineText: must<HTMLParagraphElement>("bottom-line-text"),
  summaryCards: must<HTMLDivElement>("summary-cards"),
  modelSpotCheck: must<HTMLUListElement>("model-spot-check"),
  topModels: must<HTMLUListElement>("top-models"),
  topLocations: must<HTMLUListElement>("top-locations"),
  decisionRules: must<HTMLUListElement>("decision-rules"),
  filterIntro: must<HTMLParagraphElement>("inventory-filter-intro"),
  shortcutRoot: must<HTMLDivElement>("shortcut-root"),
  viewCards: must<HTMLButtonElement>("view-cards"),
  viewList: must<HTMLButtonElement>("view-list"),
  status: must<HTMLParagraphElement>("page-status"),
  brand: must<HTMLSelectElement>("brand"),
  model: must<HTMLSelectElement>("model"),
  location: must<HTMLSelectElement>("location"),
  search: must<HTMLInputElement>("search"),
  maxPrice: must<HTMLInputElement>("max-price"),
  maxMileage: must<HTMLInputElement>("max-mileage"),
  fuel: must<HTMLSelectElement>("fuel"),
  seller: must<HTMLSelectElement>("seller"),
  body: must<HTMLSelectElement>("body"),
  risk: must<HTMLSelectElement>("risk"),
  unrated: must<HTMLSelectElement>("unrated"),
  sort1: must<HTMLSelectElement>("sort-1"),
  sort2: must<HTMLSelectElement>("sort-2"),
  sort3: must<HTMLSelectElement>("sort-3"),
  reset: must<HTMLButtonElement>("reset-filters"),
  resultsSummary: must<HTMLSpanElement>("results-summary"),
  filterState: must<HTMLSpanElement>("filter-state"),
  inventoryBody: must<HTMLDivElement>("inventory-body"),
};

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function badgeClass(risk: string): string {
  return `badge badge-${String(risk || "unrated").toLowerCase()}`;
}

function populateSelect(
  select: HTMLSelectElement,
  values: Array<string | SortOption>,
  selectedValue = "All",
  includeAll = true,
): void {
  const options: string[] = [];
  if (includeAll) {
    options.push('<option value="All">All</option>');
  }
  for (const value of values) {
    if (typeof value === "string") {
      options.push(`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`);
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

function buildStructuredFilterCatalog(): { brandOptions: string[]; locationOptions: string[] } {
  if (!appData) {
    return { brandOptions: [], locationOptions: [] };
  }

  const brands = new Set<string>();
  const locations = new Set<string>();
  modelOptionsByBrand = new Map<string, string[]>();

  for (const item of appData.inventory) {
    const { brand, modelName } = parseBrandModel(item.model);
    item.brand = brand;
    item.modelName = modelName;
    brands.add(brand);
    locations.add(item.location);
    if (!modelOptionsByBrand.has(brand)) {
      modelOptionsByBrand.set(brand, []);
    }
    modelOptionsByBrand.get(brand)!.push(modelName);
  }

  const collator = new Intl.Collator("sv", { sensitivity: "base" });
  const brandOptions = [...brands].sort((a, b) => collator.compare(a, b));
  const locationOptions = [...locations].sort((a, b) => collator.compare(a, b));
  allModelOptions = [...new Set(appData.inventory.map((item) => item.modelName ?? "Unknown"))].sort((a, b) =>
    collator.compare(a, b),
  );

  for (const [brand, models] of modelOptionsByBrand.entries()) {
    modelOptionsByBrand.set(
      brand,
      [...new Set(models)].sort((a, b) => collator.compare(a, b)),
    );
  }

  return { brandOptions, locationOptions };
}

function updateModelOptions(selectedBrand: string, selectedModel = "All"): void {
  const modelOptions = selectedBrand === "All" ? allModelOptions : modelOptionsByBrand.get(selectedBrand) ?? [];
  populateSelect(elements.model, modelOptions, selectedModel, true);
}

function renderSummary(data: AppData): void {
  const copy = data.copy;
  const inventoryPage = pageMode === "inventory";
  document.title = inventoryPage ? copy.inventoryTitle : copy.shortlistTitle;
  elements.heading.textContent = inventoryPage ? copy.inventoryTitle : copy.shortlistTitle;
  elements.intro.innerHTML = inventoryPage ? copy.inventoryIntroHtml : copy.shortlistIntroHtml;
  elements.serviceDisclaimer.textContent = copy.serviceDisclaimer;
  elements.bottomLineHeading.textContent = inventoryPage ? copy.inventoryBottomLineHeading : copy.shortlistBottomLineHeading;
  elements.bottomLineText.innerHTML = inventoryPage ? copy.inventoryBottomLineHtml : copy.shortlistBottomLineHtml;
  elements.summaryCards.innerHTML = (inventoryPage ? data.summary.inventoryCards : data.summary.shortlistCards)
    .map((card) => `<div class="summary-card"><strong>${escapeHtml(card.value)}</strong>${escapeHtml(card.label)}</div>`)
    .join("");
  elements.modelSpotCheck.innerHTML = data.summary.modelSpotCheck
    .map((item) => `<li>${escapeHtml(item.name)}: ${escapeHtml(item.count)}</li>`)
    .join("");
  elements.topModels.innerHTML = data.summary.topModels.map((item) => `<li>${escapeHtml(item.name)}: ${escapeHtml(item.count)}</li>`).join("");
  elements.topLocations.innerHTML = data.summary.topLocations
    .map((item) => `<li>${escapeHtml(item.name)}: ${escapeHtml(item.count)}</li>`)
    .join("");
  elements.decisionRules.innerHTML = data.summary.rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("");
  elements.filterIntro.textContent = copy.inventoryFilterIntro;
}

function setFilters(values: FilterPreset): void {
  if (values.brand !== undefined) {
    elements.brand.value = String(values.brand);
    updateModelOptions(String(values.brand), String(values.model ?? "All"));
  } else if (values.model !== undefined) {
    updateModelOptions(elements.brand.value, String(values.model));
  }
  if (values.location !== undefined) elements.location.value = String(values.location);
  if (values.model !== undefined) elements.model.value = String(values.model);
  if (values.search !== undefined) elements.search.value = String(values.search);
  if (values.maxPrice !== undefined) elements.maxPrice.value = String(values.maxPrice);
  if (values.maxMileage !== undefined) elements.maxMileage.value = String(values.maxMileage);
  if (values.fuel !== undefined) elements.fuel.value = String(values.fuel);
  if (values.seller !== undefined) elements.seller.value = String(values.seller);
  if (values.body !== undefined) elements.body.value = String(values.body);
  if (values.risk !== undefined) elements.risk.value = String(values.risk);
  if (values.unrated !== undefined) elements.unrated.value = String(values.unrated);
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
      note: "Best reliability-first bet.",
      values: {
        brand: "Toyota",
        model: "Prius",
        location: "All",
        search: "",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        seller: "All",
        body: "All",
        risk: "All",
        unrated: "exclude",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "jazz",
      title: "Jazz",
      note: "Good CVT family pick.",
      values: {
        brand: "Honda",
        model: "Jazz",
        location: "All",
        search: "",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        seller: "All",
        body: "All",
        risk: "All",
        unrated: "exclude",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "city",
      title: "Aygo / 107 / C1",
      note: "Small city-car cluster.",
      values: {
        brand: "All",
        model: "All",
        location: "All",
        search: "Aygo | 107 | C1",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        seller: "All",
        body: "All",
        risk: "All",
        unrated: "exclude",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "avoid",
      title: "Avoid list",
      note: "Yaris/Auris/207/Polo warnings.",
      values: {
        brand: "All",
        model: "All",
        location: "All",
        search: "Yaris | Auris | 207 | Polo",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        seller: "All",
        body: "All",
        risk: "Avoid",
        unrated: "exclude",
        sort1: "price-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "lowmiles",
      title: "Low mileage",
      note: "Pull the easiest-looking cars first.",
      values: {
        brand: "All",
        model: "All",
        location: "All",
        search: "",
        maxPrice: "50000",
        maxMileage: 15000,
        fuel: "All",
        seller: "All",
        body: "All",
        risk: "All",
        unrated: "exclude",
        sort1: "mileage-asc",
        sort2: "none",
        sort3: "none",
      },
    },
    {
      id: "clear",
      title: "Reset",
      note: "Back to full inventory.",
      values: {
        brand: "All",
        model: "All",
        location: "All",
        search: "",
        maxPrice: "50000",
        maxMileage: "",
        fuel: "All",
        seller: "All",
        body: "All",
        risk: "All",
        unrated: "exclude",
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

function describeActiveState(sortValues: string[], tokenGroups: string[][], maxPrice: number | null, maxMileage: number | null): string {
  const parts: string[] = [];
  if (elements.brand.value !== "All") parts.push(`brand: ${elements.brand.value}`);
  if (elements.model.value !== "All") parts.push(`model: ${elements.model.value}`);
  if (elements.location.value !== "All") parts.push(`location: ${elements.location.value}`);
  if (tokenGroups.length) parts.push(`search: ${elements.search.value.trim()}`);
  if (maxPrice !== null && maxPrice !== DEFAULT_MAX_PRICE) parts.push(`max price: ${Math.round(maxPrice)}`);
  if (maxMileage !== null) parts.push(`max mileage: ${Math.round(maxMileage)}`);
  if (elements.fuel.value !== "All") parts.push(`fuel: ${elements.fuel.value}`);
  if (elements.seller.value !== "All") parts.push(`seller: ${elements.seller.value}`);
  if (elements.body.value !== "All") parts.push(`body: ${elements.body.value}`);
  if (elements.risk.value !== "All") parts.push(`risk: ${elements.risk.value}`);
  if (elements.unrated.value === "include") parts.push("including unrated");
  if (sortValues.length) {
    const sortText = sortValues.map((value) => sortLabelByValue[value] ?? value).join(" > ");
    parts.push(`sort: ${sortText}`);
  }
  return parts.length ? `Active: ${parts.join(" • ")}` : "Active: default";
}

function renderInventoryRows(rows: InventoryItem[]): void {
  if (inventoryView === "cards") {
    elements.inventoryBody.className = "car-grid";
    elements.inventoryBody.innerHTML = rows
      .map(
        (item) => `
          <article class="car-card">
            <div class="car-card-header">
              <div>
                <h3>${escapeHtml(item.model)}</h3>
                <div class="muted">${escapeHtml(item.trim)}</div>
              </div>
              <span class="${badgeClass(item.risk)}">${escapeHtml(item.risk)}</span>
            </div>
            <div class="car-meta">
              <div><span class="label">Year</span>${escapeHtml(item.year)}</div>
              <div><span class="label">Mileage</span>${escapeHtml(item.mileage)}</div>
              <div><span class="label">Price</span>${escapeHtml(item.price)}</div>
              <div><span class="label">Fuel</span>${escapeHtml(item.fuel)}</div>
              <div><span class="label">Location</span>${escapeHtml(item.location)}</div>
              <div><span class="label">Seller</span>${escapeHtml(item.seller)}</div>
              <div><span class="label">Body</span>${escapeHtml(item.body)}</div>
              <div><span class="label">Owners</span>${escapeHtml(item.owners)}</div>
              <div><span class="label">Reg</span>${escapeHtml(item.reg)}</div>
              <div><span class="label">Link</span><a href="${escapeHtml(item.href)}">Blocket</a></div>
            </div>
            <div><span class="label">Service due soon</span>${escapeHtml(item.serviceDue)}</div>
            <div><span class="label">Likely cost</span>${escapeHtml(item.serviceCost)}</div>
            <div><span class="label">Forum watchouts</span><p class="car-note">${escapeHtml(item.forumWatchouts)}</p></div>
            <div><span class="label">Why flagged this way</span><p class="car-note">${escapeHtml(item.riskNote)}</p></div>
          </article>
        `,
      )
      .join("");
    return;
  }

  elements.inventoryBody.className = "table-wrap";
  elements.inventoryBody.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Model</th>
          <th>Trim</th>
          <th>Risk</th>
          <th>Year</th>
          <th>Mileage</th>
          <th>Price</th>
          <th>Fuel</th>
          <th>Location</th>
          <th>Seller</th>
          <th>Body</th>
          <th>Owners</th>
          <th>Reg</th>
          <th>Service due soon</th>
          <th>Likely cost</th>
          <th>Forum watchouts</th>
          <th>Link</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (item) => `
          <tr>
            <td>${escapeHtml(item.model)}</td>
            <td>${escapeHtml(item.trim)}</td>
            <td><span class="${badgeClass(item.risk)}">${escapeHtml(item.risk)}</span></td>
            <td>${escapeHtml(item.year)}</td>
            <td>${escapeHtml(item.mileage)}</td>
            <td>${escapeHtml(item.price)}</td>
            <td>${escapeHtml(item.fuel)}</td>
            <td>${escapeHtml(item.location)}</td>
            <td>${escapeHtml(item.seller)}</td>
            <td>${escapeHtml(item.body)}</td>
            <td>${escapeHtml(item.owners)}</td>
            <td>${escapeHtml(item.reg)}</td>
            <td>${escapeHtml(item.serviceDue)}</td>
            <td>${escapeHtml(item.serviceCost)}</td>
            <td>${escapeHtml(item.forumWatchouts)}</td>
            <td><a href="${escapeHtml(item.href)}">Blocket</a></td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderInventory(): void {
  if (!appData) return;
  const tokenGroups = parseSearchQuery(elements.search.value.trim());
  const maxPrice = parseOptionalNumber(elements.maxPrice.value);
  const maxMileage = parseOptionalNumber(elements.maxMileage.value);
  const sortValues = getSortValues();
  const includeUnrated = elements.unrated.value === "include" || elements.risk.value === "Unrated";
  const visibleInventory = includeUnrated ? appData.inventory : appData.inventory.filter((item) => item.risk !== "Unrated");
  const filtered = visibleInventory
    .filter((item) => elements.brand.value === "All" || item.brand === elements.brand.value)
    .filter((item) => elements.model.value === "All" || item.modelName === elements.model.value)
    .filter((item) => elements.location.value === "All" || item.location === elements.location.value)
    .filter((item) => matchesSearch(item, tokenGroups))
    .filter((item) => maxPrice === null || item.priceNum <= maxPrice)
    .filter((item) => maxMileage === null || item.mileageMil <= maxMileage)
    .filter((item) => elements.fuel.value === "All" || item.fuel === elements.fuel.value)
    .filter((item) => elements.seller.value === "All" || item.seller === elements.seller.value)
    .filter((item) => elements.body.value === "All" || item.body === elements.body.value)
    .filter((item) => elements.risk.value === "All" || item.risk === elements.risk.value)
    .sort((a, b) => compareItems(a, b, sortValues));

  renderInventoryRows(filtered);
  elements.resultsSummary.textContent = `${filtered.length} of ${visibleInventory.length} cars shown`;
  elements.filterState.textContent = describeActiveState(sortValues, tokenGroups, maxPrice, maxMileage);
  elements.viewCards.classList.toggle("active", inventoryView === "cards");
  elements.viewList.classList.toggle("active", inventoryView === "list");
}

function bindInventoryControls(): void {
  if (inventoryControlsBound) return;
  inventoryControlsBound = true;

  const listeners: Array<HTMLInputElement | HTMLSelectElement> = [
    elements.model,
    elements.location,
    elements.search,
    elements.maxPrice,
    elements.maxMileage,
    elements.fuel,
    elements.seller,
    elements.body,
    elements.risk,
    elements.unrated,
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
    renderInventory();
  });

  elements.reset.addEventListener("click", () => {
    elements.brand.value = "All";
    updateModelOptions("All", "All");
    elements.location.value = "All";
    elements.search.value = "";
    elements.maxPrice.value = String(DEFAULT_MAX_PRICE);
    elements.maxMileage.value = "";
    elements.fuel.value = "All";
    elements.seller.value = "All";
    elements.body.value = "All";
    elements.risk.value = "All";
    elements.unrated.value = "exclude";
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
    renderSummary(appData);
    renderShortcuts();

    if (pageMode === "inventory") {
      const { brandOptions, locationOptions } = buildStructuredFilterCatalog();
      populateSelect(elements.brand, brandOptions);
      populateSelect(elements.location, locationOptions);
      updateModelOptions("All", "All");
      populateSelect(elements.fuel, appData.filters.fuels);
      populateSelect(elements.seller, appData.filters.sellers);
      populateSelect(elements.body, appData.filters.bodies);
      populateSelect(elements.risk, appData.filters.risks);
      sortLabelByValue = Object.fromEntries(appData.filters.sortOptions.map((option) => [option.value, option.label]));
      populateSelect(elements.sort1, appData.filters.sortOptions, "none", false);
      populateSelect(elements.sort2, appData.filters.sortOptions, "none", false);
      populateSelect(elements.sort3, appData.filters.sortOptions, "none", false);
      bindInventoryControls();
      renderInventory();
    }

    elements.status.textContent = "";
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    elements.status.textContent = `Could not load the page data: ${message}`;
  }
}

void init();
