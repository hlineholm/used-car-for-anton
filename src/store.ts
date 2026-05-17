import { configureStore, createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  dedupeSortValues,
  parseOptionalNumber,
  queryInventory,
  type InventoryFilters,
  type InventoryItem,
  type InventoryQueryResult,
  type InventorySelectFilterKey,
} from "./core.js";

export interface SortOption {
  value: string;
  label: string;
}

export interface AppData {
  filters: {
    fuels: string[];
    sellers: string[];
    bodies: string[];
    risks: string[];
    sortOptions: SortOption[];
  };
  inventory: InventoryItem[];
  meta?: {
    maxPrice?: number;
    maxMileage?: number;
  };
  lookups?: {
    brands?: string[];
    locations?: string[];
    modelsByBrand?: Record<string, string[]>;
    fuels?: string[];
    sellers?: string[];
    bodies?: string[];
    gearboxes?: string[];
    risks?: string[];
    primaryProfiles?: string[];
    profileTags?: string[];
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

export type InventoryView = "cards" | "list";
export type TextFilterKey = "search" | "maxPrice" | "maxMileage";
export type FilterKey = InventorySelectFilterKey | TextFilterKey;
export type SortKey = "sort1" | "sort2" | "sort3";

export interface InventoryUiFilters {
  brand: string;
  model: string;
  series: string;
  engine: string;
  trim: string;
  location: string;
  region: string;
  distance: string;
  search: string;
  maxPrice: string;
  maxMileage: string;
  fuel: string;
  gearbox: string;
  seller: string;
  body: string;
  risk: string;
  primaryProfile: string;
  profileTag: string;
  riskStatus: string;
  serviceDue: string;
  serviceCost: string;
  priceBucket: string;
  mileageBucket: string;
  ageBucket: string;
  ownersBucket: string;
  pricePerMilBucket: string;
  debtStatus: string;
  registryVerified: string;
}

export interface InventoryUiSort {
  sort1: string;
  sort2: string;
  sort3: string;
}

export interface InventoryUiState {
  filters: InventoryUiFilters;
  sort: InventoryUiSort;
  view: InventoryView;
}

interface DataState {
  status: "loading" | "ready" | "error";
  data: AppData | null;
  errorMessage: string;
}

export type FilterPreset = Partial<InventoryUiFilters & InventoryUiSort>;

const SORT_NONE_OPTION: SortOption = {
  value: "none",
  label: "Ingen sortering",
};

export function createFilterDefaults(maxPrice?: number): InventoryUiFilters {
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
    primaryProfile: "All",
    profileTag: "All",
    riskStatus: "All",
    serviceDue: "All",
    serviceCost: "All",
    priceBucket: "All",
    mileageBucket: "All",
    ageBucket: "All",
    ownersBucket: "All",
    pricePerMilBucket: "All",
    debtStatus: "All",
    registryVerified: "All",
  };
}

export function createUiDefaults(maxPrice?: number): InventoryUiState {
  return {
    filters: createFilterDefaults(maxPrice),
    sort: {
      sort1: "none",
      sort2: "none",
      sort3: "none",
    },
    view: "list",
  };
}

const initialDataState: DataState = {
  status: "loading",
  data: null,
  errorMessage: "",
};

const dataSlice = createSlice({
  name: "data",
  initialState: initialDataState,
  reducers: {
    dataLoaded(state, action: PayloadAction<AppData>) {
      state.status = "ready";
      state.data = action.payload;
      state.errorMessage = "";
    },
    dataFailed(state, action: PayloadAction<string>) {
      state.status = "error";
      state.errorMessage = action.payload;
    },
  },
});

function isSortKey(key: string): key is SortKey {
  return key === "sort1" || key === "sort2" || key === "sort3";
}

function applyFilterPreset(state: InventoryUiState, preset: FilterPreset): void {
  for (const [key, value] of Object.entries(preset)) {
    if (value === undefined) continue;
    if (isSortKey(key)) {
      state.sort[key] = String(value);
      continue;
    }
    state.filters[key as keyof InventoryUiFilters] = String(value);
  }
}

const uiSlice = createSlice({
  name: "ui",
  initialState: createUiDefaults(),
  reducers: {
    setFilterValue(state, action: PayloadAction<{ key: FilterKey; value: string }>) {
      state.filters[action.payload.key] = action.payload.value;
    },
    setSortValue(state, action: PayloadAction<{ key: SortKey; value: string }>) {
      state.sort[action.payload.key] = action.payload.value;
    },
    setInventoryView(state, action: PayloadAction<InventoryView>) {
      state.view = action.payload;
    },
    resetUiState(_state, action: PayloadAction<InventoryUiState>) {
      return action.payload;
    },
    applyPreset(state, action: PayloadAction<FilterPreset>) {
      applyFilterPreset(state, action.payload);
    },
  },
});

const reducer = {
  data: dataSlice.reducer,
  ui: uiSlice.reducer,
};

export function createAppStore() {
  return configureStore({
    reducer,
  });
}

export type AppStore = ReturnType<typeof createAppStore>;
export type RootState = ReturnType<AppStore["getState"]>;

export const { dataLoaded, dataFailed } = dataSlice.actions;
export const { setFilterValue, setSortValue, setInventoryView, resetUiState, applyPreset } = uiSlice.actions;

export function selectMaxPriceDefault(state: RootState): number {
  const value = state.data.data?.meta?.maxPrice;
  return typeof value === "number" && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function selectSortOptions(state: RootState): SortOption[] {
  const options = state.data.data?.filters.sortOptions ?? [];
  return options.some((option) => option.value === SORT_NONE_OPTION.value) ? options : [SORT_NONE_OPTION, ...options];
}

function toInventoryFilters(filters: InventoryUiFilters): InventoryFilters {
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
    primaryProfile: filters.primaryProfile,
    profileTag: filters.profileTag,
    riskStatus: filters.riskStatus,
    serviceDue: filters.serviceDue,
    serviceCost: filters.serviceCost,
    priceBucket: filters.priceBucket,
    mileageBucket: filters.mileageBucket,
    ageBucket: filters.ageBucket,
    ownersBucket: filters.ownersBucket,
    pricePerMilBucket: filters.pricePerMilBucket,
    debtStatus: filters.debtStatus,
    registryVerified: filters.registryVerified,
  };
}

function selectSortValues(state: RootState): string[] {
  return dedupeSortValues([state.ui.sort.sort1, state.ui.sort.sort2, state.ui.sort.sort3]);
}

export function selectInventoryResult(state: RootState): InventoryQueryResult | null {
  const data = state.data.data;
  if (!data) return null;
  return queryInventory(data.inventory, toInventoryFilters(state.ui.filters), selectSortValues(state));
}
