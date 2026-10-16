import { COUNTRIES, COUNTRY_BY_ID, SEARCH_ALIASES, type CountryRecord } from "@/data/indicators";
import { METRIC_BY_ID, type MetricId } from "@/lib/atlas-types";

export const SCALE_STOPS = ["#d7ebe4", "#b7d4cb", "#7eada3", "#3f736a", "#1e4b44", "#102421"] as const;

const NO_DATA = "var(--color-nodata)";

function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mixStops(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  const scaled = clamped * (SCALE_STOPS.length - 1);
  const index = Math.min(SCALE_STOPS.length - 2, Math.floor(scaled));
  const frac = scaled - index;
  const a = hexToRgb(SCALE_STOPS[index]);
  const b = hexToRgb(SCALE_STOPS[index + 1]);
  const channels = a.map((channel, i) => Math.round(channel + (b[i] - channel) * frac));
  return `rgb(${channels[0]} ${channels[1]} ${channels[2]})`;
}

export type ColorScale = {
  min: number;
  max: number;
  ticks: number[];
  coverage: number;
  position: (value: number | null) => number | null;
  color: (value: number | null) => string;
};

const scaleCache = new Map<MetricId, ColorScale>();

export function colorScale(metric: MetricId): ColorScale {
  const cached = scaleCache.get(metric);
  if (cached) return cached;

  const spec = METRIC_BY_ID[metric];
  const values = COUNTRIES.map((country) => country[metric]).filter(
    (value): value is number => value != null && (spec.scale === "linear" || value > 0),
  );
  const min = Math.min(...values);
  const max = Math.max(...values);

  const position = (value: number | null): number | null => {
    if (value == null || !Number.isFinite(value)) return null;
    if (spec.scale === "log" && value <= 0) return null;
    if (spec.scale === "log") {
      const span = Math.log(max) - Math.log(min);
      if (span === 0) return 1;
      return (Math.log(value) - Math.log(min)) / span;
    }
    const span = max - min;
    if (span === 0) return 1;
    return (value - min) / span;
  };

  const ticks =
    spec.scale === "log"
      ? [min, Math.exp((Math.log(min) + Math.log(max)) / 2), max]
      : [min, (min + max) / 2, max];

  const built: ColorScale = {
    min,
    max,
    ticks,
    coverage: values.length,
    position,
    color: (value) => {
      const t = position(value);
      return t == null ? NO_DATA : mixStops(t);
    },
  };
  scaleCache.set(metric, built);
  return built;
}

export function formatPeople(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
    if (value >= 1_000) return `${Math.round(value / 1_000)}k`;
    return `${Math.round(value)}`;
  }
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} billion`;
  if (value >= 10_000_000) return `${(value / 1_000_000).toFixed(1)} million`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} million`;
  if (value >= 10_000) return `${Math.round(value / 1_000)} thousand`;
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

const moneyFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatMetric(metric: MetricId, value: number | null, compact = false): string {
  if (value == null) return "No estimate";
  if (metric === "population") return formatPeople(value, compact);
  if (metric === "gdp") return (compact ? moneyCompact : moneyFull).format(value);
  if (metric === "life") return compact ? `${value.toFixed(1)}y` : `${value.toFixed(1)} years`;
  const digits = Number.isInteger(value) ? 0 : 0;
  return `${value.toFixed(digits)}%`;
}

export function getCountry(id: string): CountryRecord | undefined {
  return COUNTRY_BY_ID.get(id);
}

export type Standing = {
  rank: number;
  total: number;
};

export function standing(id: string, metric: MetricId): Standing | null {
  const ranked = COUNTRIES.filter((country) => country[metric] != null).sort(
    (a, b) => (b[metric] ?? 0) - (a[metric] ?? 0),
  );
  const index = ranked.findIndex((country) => country.id === id);
  if (index < 0) return null;
  return { rank: index + 1, total: ranked.length };
}

export function median(metric: MetricId, region?: CountryRecord["region"]): number | null {
  const values = COUNTRIES.filter(
    (country) => country[metric] != null && (region == null || country.region === region),
  )
    .map((country) => country[metric] as number)
    .sort((a, b) => a - b);
  if (values.length === 0) return null;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

export function extremes(metric: MetricId): { high: CountryRecord[]; low: CountryRecord[] } {
  const ranked = COUNTRIES.filter((country) => country[metric] != null).sort(
    (a, b) => (b[metric] ?? 0) - (a[metric] ?? 0),
  );
  return {
    high: ranked.slice(0, 3),
    low: ranked.slice(-3).reverse(),
  };
}

export function versusMedian(value: number, mid: number): string {
  if (mid === 0) return "World median is zero";
  const ratio = value / mid;
  if (ratio >= 1.08) return `${ratio >= 10 ? ratio.toFixed(0) : ratio.toFixed(1)}× the world median`;
  if (ratio <= 0.92) return `${ratio.toFixed(2)}× the world median`;
  return "Near the world median";
}

export function populationShare(id: string): number | null {
  const country = COUNTRY_BY_ID.get(id);
  if (!country || country.population == null) return null;
  let total = 0;
  for (const row of COUNTRIES) {
    if (row.population != null) total += row.population;
  }
  if (total === 0) return null;
  return country.population / total;
}

function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function searchCountries(query: string): CountryRecord[] {
  const q = fold(query.trim());
  if (!q) return [];
  const hits = COUNTRIES.filter((country) => {
    const name = fold(country.name);
    const words = name.split(/[^a-z0-9]+/).filter(Boolean);
    const nameHit = q.length < 3 ? words.some((word) => word.startsWith(q)) : name.includes(q);
    if (nameHit) return true;
    const aliases = SEARCH_ALIASES[country.id] ?? [];
    return aliases.some((alias) => {
      const folded = fold(alias);
      return q.length < 3 ? folded === q || folded.startsWith(q) : folded.includes(q);
    });
  });
  hits.sort((a, b) => {
    const aStart = fold(a.name).startsWith(q) ? 0 : 1;
    const bStart = fold(b.name).startsWith(q) ? 0 : 1;
    return aStart - bStart || a.name.localeCompare(b.name);
  });
  return hits.slice(0, 6);
}

export { COUNTRIES };
