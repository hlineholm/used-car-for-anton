import {
  parseOptionalNumber,
  projectInventoryItem,
  type InventoryFilterOption,
  type InventoryFilterOptions,
  type InventoryItem,
  type InventorySelectFilterKey,
} from "./core.js";
import {
  applyPreset,
  createAppStore,
  createUiDefaults,
  dataFailed,
  dataLoaded,
  resetUiState,
  selectInventoryResult,
  selectMaxPriceDefault,
  selectSortOptions,
  setFilterValue,
  setInventoryView,
  setSortValue,
  type AppData,
  type AppStore,
  type FilterPreset,
  type InventoryUiFilters,
  type InventoryUiSort,
  type InventoryView,
  type SortKey,
  type TextFilterKey,
} from "./store.js";

interface Shortcut {
  id: string;
  title: string;
  note: string;
  values: FilterPreset;
}

const DATA_URL = "processed-data.json";
const PAGE_TITLE = "Bilar";

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

const filterSelectControls: Array<{ key: InventorySelectFilterKey; control: HTMLSelectElement }> = [
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
  { key: "registryVerified", control: elements.registryVerified },
];

const textFilterControls: Array<{ key: TextFilterKey; control: HTMLInputElement }> = [
  { key: "search", control: elements.search },
  { key: "maxPrice", control: elements.maxPrice },
  { key: "maxMileage", control: elements.maxMileage },
];

const sortControls: Array<{ key: SortKey; control: HTMLSelectElement }> = [
  { key: "sort1", control: elements.sort1 },
  { key: "sort2", control: elements.sort2 },
  { key: "sort3", control: elements.sort3 },
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
  values: Array<string | { value: string; label: string }>,
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

function optionDisplayLabel(selectId: string, value: string, count: number): string {
  const base =
    selectId === "risk"
      ? riskLabel(value)
      : selectId === "service-due"
        ? serviceDueLabel(value)
        : selectId === "risk-status"
          ? riskStatusLabel(value)
          : selectId === "debt-status"
            ? debtLabel(value)
            : selectId === "registry-verified"
              ? registryLabel(value === "true")
              : value;
  return count === 0 ? `${base} (0)` : base;
}

function populateFilterSelect(
  select: HTMLSelectElement,
  options: InventoryFilterOption[],
  selectedValue = "All",
): void {
  const values = options.map((option) => ({
    value: option.value,
    label: optionDisplayLabel(select.id, option.value, option.count),
  }));
  populateSelect(select, values, selectedValue, true);
}

function shortcutDefinitions(maxPriceValue: string): Shortcut[] {
  return [
    {
      id: "prius",
      title: "Prius",
      note: "Bra förstaval.",
      values: { brand: "Toyota", model: "Prius", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "jazz",
      title: "Jazz",
      note: "Bra familjeval.",
      values: { brand: "Honda", model: "Jazz", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "city",
      title: "Aygo / 107 / C1",
      note: "Små stadsbilar.",
      values: { search: "Aygo | 107 | C1", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "avoid",
      title: "Undvik",
      note: "Yaris/Auris/207/Polo.",
      values: { search: "Yaris | Auris | 207 | Polo", risk: "Avoid", sort1: "price-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "lowmiles",
      title: "Låg mil",
      note: "Visa lägst mil först.",
      values: { maxMileage: "15000", sort1: "mileage-asc", sort2: "none", sort3: "none", maxPrice: maxPriceValue },
    },
    {
      id: "clear",
      title: "Nollställ",
      note: "Tillbaka till alla.",
      values: { maxPrice: maxPriceValue, sort1: "none", sort2: "none", sort3: "none" },
    },
  ];
}

function renderShortcuts(store: AppStore, maxPriceValue: string): void {
  const shortcuts = shortcutDefinitions(maxPriceValue);
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
    button.addEventListener("click", () => {
      store.dispatch(applyPreset(shortcut.values));
    });
  });
}

function syncInputControls(filters: InventoryUiFilters): void {
  elements.search.value = filters.search;
  elements.maxPrice.value = filters.maxPrice;
  elements.maxMileage.value = filters.maxMileage;
}

function syncFilterSelects(filters: InventoryUiFilters, options: InventoryFilterOptions): void {
  for (const { key, control } of filterSelectControls) {
    populateFilterSelect(control, options[key], filters[key]);
  }
}

function syncSortControls(sort: InventoryUiSort, sortOptions: Array<{ value: string; label: string }>): void {
  for (const { key, control } of sortControls) {
    populateSelect(control, sortOptions, sort[key], false);
  }
}

function isFilterActive(key: TextFilterKey | InventorySelectFilterKey, filters: InventoryUiFilters, maxPriceDefault: number): boolean {
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

function updateActiveFilterHighlights(filters: InventoryUiFilters, sort: InventoryUiSort, maxPriceDefault: number): void {
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

function renderInventoryRows(rows: InventoryItem[], inventoryView: InventoryView): void {
  if (inventoryView === "cards") {
    elements.inventoryBody.className = "car-grid";
    elements.inventoryBody.innerHTML = rows
      .map((item) => {
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
      })
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
          .map((item) => {
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
          })
          .join("")}
      </tbody>
    </table>
  `;
}

function render(store: AppStore): void {
  document.title = PAGE_TITLE;
  const state = store.getState();

  if (state.data.status === "error") {
    elements.status.textContent = `Kunde inte läsa data: ${state.data.errorMessage}`;
    elements.resultsSummary.textContent = "";
    return;
  }

  if (state.data.status !== "ready") {
    elements.status.textContent = "Laddar data...";
    return;
  }

  const result = selectInventoryResult(state);
  if (!result) {
    elements.status.textContent = "Kunde inte läsa data.";
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

function bindInventoryControls(store: AppStore): void {
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

async function loadData(): Promise<AppData> {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json() as Promise<AppData>;
}

async function init(): Promise<void> {
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
