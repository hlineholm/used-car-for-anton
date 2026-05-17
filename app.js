import { compareItems, dedupeSortValues, matchesSearch, parseBrandModel, parseOptionalNumber, parseSearchQuery, } from "./core.js";
const DATA_URL = "data.json";
const DEFAULT_MAX_PRICE = 50000;
const pageMode = "inventory";
const PAGE_TITLE = "Bilar";
let appData = null;
let inventoryControlsBound = false;
let inventoryView = "list";
let sortLabelByValue = {};
let modelOptionsByBrand = new Map();
let allModelOptions = [];
function must(id) {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Saknar element: #${id}`);
    }
    return element;
}
const elements = {
    shortcutRoot: must("shortcut-root"),
    viewCards: must("view-cards"),
    viewList: must("view-list"),
    status: must("page-status"),
    brand: must("brand"),
    model: must("model"),
    location: must("location"),
    search: must("search"),
    maxPrice: must("max-price"),
    maxMileage: must("max-mileage"),
    fuel: must("fuel"),
    seller: must("seller"),
    body: must("body"),
    risk: must("risk"),
    unrated: must("unrated"),
    sort1: must("sort-1"),
    sort2: must("sort-2"),
    sort3: must("sort-3"),
    reset: must("reset-filters"),
    resultsSummary: must("results-summary"),
    inventoryBody: must("inventory-body"),
};
const activeControlSpecs = [
    { control: elements.brand, isActive: () => elements.brand.value !== "All" },
    { control: elements.model, isActive: () => elements.model.value !== "All" },
    { control: elements.location, isActive: () => elements.location.value !== "All" },
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
    { control: elements.seller, isActive: () => elements.seller.value !== "All" },
    { control: elements.body, isActive: () => elements.body.value !== "All" },
    { control: elements.risk, isActive: () => elements.risk.value !== "All" },
    { control: elements.unrated, isActive: () => elements.unrated.value === "include" },
    { control: elements.sort1, isActive: () => elements.sort1.value !== "none" },
    { control: elements.sort2, isActive: () => elements.sort2.value !== "none" },
    { control: elements.sort3, isActive: () => elements.sort3.value !== "none" },
];
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function badgeClass(risk) {
    return `badge badge-${String(risk || "unrated").toLowerCase()}`;
}
function riskLabel(risk) {
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
            return "Ej bedömd";
        default:
            return risk;
    }
}
function populateSelect(select, values, selectedValue = "All", includeAll = true) {
    const options = [];
    if (includeAll) {
        options.push('<option value="All">Alla</option>');
    }
    for (const value of values) {
        if (typeof value === "string") {
            const label = select.id === "risk" ? riskLabel(value) : value;
            options.push(`<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`);
        }
        else {
            options.push(`<option value="${escapeHtml(value.value)}">${escapeHtml(value.label)}</option>`);
        }
    }
    select.innerHTML = options.join("");
    select.value = selectedValue;
    if (!Array.from(select.options).some((option) => option.value === select.value)) {
        select.value = includeAll ? "All" : select.options[0]?.value ?? "";
    }
}
function buildStructuredFilterCatalog() {
    if (!appData) {
        return { brandOptions: [], locationOptions: [] };
    }
    const brands = new Set();
    const locations = new Set();
    modelOptionsByBrand = new Map();
    for (const item of appData.inventory) {
        const { brand, modelName } = parseBrandModel(item.model);
        item.brand = brand;
        item.modelName = modelName;
        brands.add(brand);
        locations.add(item.location);
        if (!modelOptionsByBrand.has(brand)) {
            modelOptionsByBrand.set(brand, []);
        }
        modelOptionsByBrand.get(brand).push(modelName);
    }
    const collator = new Intl.Collator("sv", { sensitivity: "base" });
    const brandOptions = [...brands].sort((a, b) => collator.compare(a, b));
    const locationOptions = [...locations].sort((a, b) => collator.compare(a, b));
    allModelOptions = [...new Set(appData.inventory.map((item) => item.modelName ?? "Okänd"))].sort((a, b) => collator.compare(a, b));
    for (const [brand, models] of modelOptionsByBrand.entries()) {
        modelOptionsByBrand.set(brand, [...new Set(models)].sort((a, b) => collator.compare(a, b)));
    }
    return { brandOptions, locationOptions };
}
function updateModelOptions(selectedBrand, selectedModel = "All") {
    const modelOptions = selectedBrand === "All" ? allModelOptions : modelOptionsByBrand.get(selectedBrand) ?? [];
    populateSelect(elements.model, modelOptions, selectedModel, true);
}
function renderSummary() {
    document.title = PAGE_TITLE;
}
function setFilters(values) {
    if (values.brand !== undefined) {
        elements.brand.value = String(values.brand);
        updateModelOptions(String(values.brand), String(values.model ?? "All"));
    }
    else if (values.model !== undefined) {
        updateModelOptions(elements.brand.value, String(values.model));
    }
    if (values.location !== undefined)
        elements.location.value = String(values.location);
    if (values.model !== undefined)
        elements.model.value = String(values.model);
    if (values.search !== undefined)
        elements.search.value = String(values.search);
    if (values.maxPrice !== undefined)
        elements.maxPrice.value = String(values.maxPrice);
    if (values.maxMileage !== undefined)
        elements.maxMileage.value = String(values.maxMileage);
    if (values.fuel !== undefined)
        elements.fuel.value = String(values.fuel);
    if (values.seller !== undefined)
        elements.seller.value = String(values.seller);
    if (values.body !== undefined)
        elements.body.value = String(values.body);
    if (values.risk !== undefined)
        elements.risk.value = String(values.risk);
    if (values.unrated !== undefined)
        elements.unrated.value = String(values.unrated);
    if (values.sort1 !== undefined)
        elements.sort1.value = String(values.sort1);
    if (values.sort2 !== undefined)
        elements.sort2.value = String(values.sort2);
    if (values.sort3 !== undefined)
        elements.sort3.value = String(values.sort3);
    renderInventory();
}
function renderShortcuts() {
    const shortcuts = [
        {
            id: "prius",
            title: "Prius",
            note: "Bra förstaval.",
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
            note: "Bra familjeval.",
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
            note: "Små stadsbilar.",
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
            title: "Undvik",
            note: "Yaris/Auris/207/Polo.",
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
            title: "Låg mil",
            note: "Visa lägst mil först.",
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
            title: "Nollställ",
            note: "Tillbaka till alla.",
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
        .map((shortcut) => `
        <button class="shortcut-card" type="button" data-shortcut="${shortcut.id}">
          <strong>${escapeHtml(shortcut.title)}</strong>
          <span class="muted">${escapeHtml(shortcut.note)}</span>
        </button>
      `)
        .join("")}</div>`;
    elements.shortcutRoot.querySelectorAll("[data-shortcut]").forEach((button) => {
        const shortcut = shortcuts.find((item) => item.id === button.dataset.shortcut);
        if (!shortcut)
            return;
        button.addEventListener("click", () => setFilters(shortcut.values));
    });
}
function getSortValues() {
    return dedupeSortValues([elements.sort1.value, elements.sort2.value, elements.sort3.value]);
}
function updateActiveFilterHighlights() {
    for (const spec of activeControlSpecs) {
        const wrapper = spec.control.parentElement;
        if (!wrapper)
            continue;
        wrapper.classList.toggle("is-active", spec.isActive());
    }
}
function renderInventoryRows(rows) {
    if (inventoryView === "cards") {
        elements.inventoryBody.className = "car-grid";
        elements.inventoryBody.innerHTML = rows
            .map((item) => `
          <article class="car-card">
            <div class="car-card-header">
              <div>
                <h3>${escapeHtml(item.model)}</h3>
                <div class="muted">${escapeHtml(item.trim)}</div>
              </div>
              <span class="${badgeClass(item.risk)}">${escapeHtml(riskLabel(item.risk))}</span>
            </div>
            <div class="car-meta">
              <div><span class="label">År</span>${escapeHtml(item.year)}</div>
              <div><span class="label">Miltal</span>${escapeHtml(item.mileage)}</div>
              <div><span class="label">Pris</span>${escapeHtml(item.price)}</div>
              <div><span class="label">Drivmedel</span>${escapeHtml(item.fuel)}</div>
              <div><span class="label">Ort</span>${escapeHtml(item.location)}</div>
              <div><span class="label">Säljare</span>${escapeHtml(item.seller)}</div>
              <div><span class="label">Kaross</span>${escapeHtml(item.body)}</div>
              <div><span class="label">Ägare</span>${escapeHtml(item.owners)}</div>
              <div><span class="label">Reg</span>${escapeHtml(item.reg)}</div>
              <div><span class="label">Länk</span><a href="${escapeHtml(item.href)}">Blocket</a></div>
            </div>
          </article>
        `)
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
          <th>Ort</th>
          <th>Säljare</th>
          <th>Kaross</th>
          <th>Ägare</th>
          <th>Reg</th>
          <th>Länk</th>
        </tr>
      </thead>
      <tbody>
        ${rows
        .map((item) => `
          <tr>
            <td>${escapeHtml(item.model)}</td>
            <td>${escapeHtml(item.trim)}</td>
            <td><span class="${badgeClass(item.risk)}">${escapeHtml(riskLabel(item.risk))}</span></td>
            <td>${escapeHtml(item.year)}</td>
            <td>${escapeHtml(item.mileage)}</td>
            <td>${escapeHtml(item.price)}</td>
            <td>${escapeHtml(item.fuel)}</td>
            <td>${escapeHtml(item.location)}</td>
            <td>${escapeHtml(item.seller)}</td>
            <td>${escapeHtml(item.body)}</td>
            <td>${escapeHtml(item.owners)}</td>
            <td>${escapeHtml(item.reg)}</td>
            <td><a href="${escapeHtml(item.href)}">Blocket</a></td>
          </tr>
        `)
        .join("")}
      </tbody>
    </table>
  `;
}
function renderInventory() {
    if (!appData)
        return;
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
    elements.resultsSummary.textContent = `Visar ${filtered.length} av ${visibleInventory.length} bilar`;
    updateActiveFilterHighlights();
    elements.viewCards.classList.toggle("active", inventoryView === "cards");
    elements.viewList.classList.toggle("active", inventoryView === "list");
}
function bindInventoryControls() {
    if (inventoryControlsBound)
        return;
    inventoryControlsBound = true;
    const listeners = [
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
async function loadData() {
    const response = await fetch(DATA_URL);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
}
async function init() {
    try {
        appData = await loadData();
        renderSummary();
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        elements.status.textContent = `Kunde inte läsa data: ${message}`;
    }
}
void init();
