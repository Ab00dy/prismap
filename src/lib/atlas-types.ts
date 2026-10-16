export const METRIC_IDS = ["population", "gdp", "life", "internet", "renewable"] as const;

export type MetricId = (typeof METRIC_IDS)[number];

export type Region = "Africa" | "Americas" | "Asia" | "Europe" | "Oceania" | "Polar";

export type ScaleKind = "log" | "linear";

export type MetricSpec = {
  id: MetricId;
  label: string;
  short: string;
  hint: string;
  blurb: string;
  scale: ScaleKind;
};

export const METRICS: readonly MetricSpec[] = [
  {
    id: "population",
    label: "Population",
    short: "People",
    hint: "Residents",
    blurb: "How many people live there.",
    scale: "log",
  },
  {
    id: "gdp",
    label: "GDP per capita",
    short: "Income",
    hint: "Current US dollars",
    blurb: "Average economic output per person.",
    scale: "log",
  },
  {
    id: "life",
    label: "Life expectancy",
    short: "Lifespan",
    hint: "Years at birth",
    blurb: "How long a newborn can expect to live.",
    scale: "linear",
  },
  {
    id: "internet",
    label: "Internet use",
    short: "Online",
    hint: "Share of people",
    blurb: "People using the internet.",
    scale: "linear",
  },
  {
    id: "renewable",
    label: "Renewable power",
    short: "Renewables",
    hint: "Share of electricity",
    blurb: "Electricity from renewable sources.",
    scale: "linear",
  },
];

export const METRIC_BY_ID: Record<MetricId, MetricSpec> = {
  population: METRICS[0],
  gdp: METRICS[1],
  life: METRICS[2],
  internet: METRICS[3],
  renewable: METRICS[4],
};

export const DATA_NOTE =
  "Rounded public estimates for 2023. A sample for exploration, not a live statistical feed.";
