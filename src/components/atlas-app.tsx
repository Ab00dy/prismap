import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, RotateCcw, Search, X } from "lucide-react";
import {
  colorScale,
  extremes,
  formatMetric,
  getCountry,
  median,
  populationShare,
  searchCountries,
  standing,
  versusMedian,
  SCALE_STOPS,
} from "@/lib/atlas";
import {
  DATA_NOTE,
  METRIC_BY_ID,
  METRICS,
  type MetricId,
} from "@/lib/atlas-types";
import { COUNTRIES, type CountryRecord } from "@/data/indicators";
import { WorldMap, type MapHandle } from "@/components/world-map";

export function AtlasApp() {
  const [metric, setMetric] = useState<MetricId>("life");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mapRef = useRef<MapHandle>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Escape") setSelectedId(null);
      if (event.key === "+" || event.key === "=") mapRef.current?.zoomIn();
      if (event.key === "-" || event.key === "_") mapRef.current?.zoomOut();
      if (event.key === "0") mapRef.current?.reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pin(id: string, frame = false) {
    setSelectedId(id);
    if (frame) mapRef.current?.focus(id);
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-paper text-ink">
      <header className="z-30 shrink-0 border-b border-line bg-paper">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 py-3 lg:px-6">
          <div className="min-w-36 flex-1">
            <h1 className="font-display text-2xl leading-none tracking-tight">Prismap</h1>
            <p className="mt-1 text-xs text-muted">World indicators · 2023 sample</p>
          </div>
          <div className="hidden lg:block">
            <MetricSwitch metric={metric} onChange={setMetric} />
          </div>
          <CountrySearch
            metric={metric}
            onSelect={(id) => pin(id, true)}
          />
        </div>
        <div className="px-4 pb-3 lg:hidden">
          <MetricSwitch metric={metric} onChange={setMetric} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="relative h-3/5 min-h-0 overflow-hidden bg-ocean lg:h-full lg:flex-1">
          <WorldMap
            metric={metric}
            selectedId={selectedId}
            onSelect={(id) => pin(id)}
            mapRef={mapRef}
          />
          <Legend metric={metric} />
          <ZoomControls
            onIn={() => mapRef.current?.zoomIn()}
            onOut={() => mapRef.current?.zoomOut()}
            onReset={() => mapRef.current?.reset()}
          />
        </section>
        <Dossier
          metric={metric}
          selectedId={selectedId}
          onMetric={setMetric}
          onSelect={(id) => pin(id, true)}
          onClear={() => setSelectedId(null)}
        />
      </div>
    </div>
  );
}

function MetricSwitch({
  metric,
  onChange,
}: {
  metric: MetricId;
  onChange: (metric: MetricId) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Partial<Record<MetricId, HTMLButtonElement | null>>>({});
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const button = buttonRefs.current[metric];
      if (!button) return;
      setBox({
        x: button.offsetLeft,
        y: button.offsetTop,
        w: button.offsetWidth,
        h: button.offsetHeight,
      });
    }
    measure();
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [metric]);

  return (
    <div
      ref={trackRef}
      role="radiogroup"
      aria-label="Metric"
      className="relative flex max-w-full gap-1 overflow-x-auto rounded-full bg-track p-1"
    >
      {box ? (
        <span
          className="pill"
          style={{ width: box.w, height: box.h, transform: `translate(${box.x}px, ${box.y}px)` }}
        />
      ) : null}
      {METRICS.map((item) => {
        const checked = item.id === metric;
        return (
          <button
            key={item.id}
            ref={(node) => {
              buttonRefs.current[item.id] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            className={`press relative z-10 h-11 shrink-0 rounded-full px-3 text-sm font-medium ${
              checked ? "text-ink" : "text-muted"
            }`}
            onClick={() => onChange(item.id)}
          >
            {item.short}
          </button>
        );
      })}
    </div>
  );
}

function CountrySearch({
  metric,
  onSelect,
}: {
  metric: MetricId;
  onSelect: (id: string) => void;
}) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = searchCountries(query);

  function choose(id: string) {
    onSelect(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative w-40 sm:w-56">
      <label className="sr-only" htmlFor="country-search">
        Search countries
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
      <input
        id="country-search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        value={query}
        placeholder="Search"
        className="h-11 w-full rounded-lg border border-line bg-surface pr-9 pl-9 text-sm text-ink outline-none placeholder:text-subtle"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
            setQuery("");
            return;
          }
          if (!results.length) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((index) => (index + 1) % results.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((index) => (index - 1 + results.length) % results.length);
          } else if (event.key === "Enter") {
            event.preventDefault();
            const pick = results[active] ?? results[0];
            if (pick) choose(pick.id);
          }
        }}
      />
      {query ? (
        <button
          type="button"
          className="press absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted"
          aria-label="Clear search"
          onClick={() => {
            setQuery("");
            setOpen(false);
          }}
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      {open && query && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-12 right-0 z-40 w-64 overflow-hidden rounded-lg border border-line bg-surface float-card"
        >
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">No country matches</li>
          ) : (
            results.map((country, index) => (
              <li key={country.id} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  className={`flex w-full items-baseline justify-between gap-3 px-3 py-2.5 text-left text-sm ${
                    index === active ? "bg-pine-soft" : "bg-surface"
                  }`}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(country.id)}
                >
                  <span className="font-medium">{country.name}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {formatMetric(metric, country[metric], true)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Legend({ metric }: { metric: MetricId }) {
  const spec = METRIC_BY_ID[metric];
  const scale = colorScale(metric);
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-10 w-52 rounded-xl border border-line bg-paper p-3 float-card sm:w-60">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{spec.label}</p>
        <p className="text-xs text-subtle">Darker is higher</p>
      </div>
      <div
        className="mt-2 h-2.5 rounded-full"
        style={{ background: `linear-gradient(90deg, ${SCALE_STOPS.join(", ")})` }}
        role="img"
        aria-label={`${spec.label} color scale from low to high`}
      />
      <div className="mt-1.5 flex justify-between gap-2 text-xs text-muted tabular-nums">
        {scale.ticks.map((tick) => (
          <span key={tick}>{formatMetric(metric, tick, true)}</span>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-subtle">
        <span className="size-2.5 rounded-sm bg-nodata" />
        <span>No estimate</span>
        {spec.scale === "log" ? <span className="ml-auto">Log scale</span> : null}
      </div>
    </div>
  );
}

function ZoomControls({
  onIn,
  onOut,
  onReset,
}: {
  onIn: () => void;
  onOut: () => void;
  onReset: () => void;
}) {
  return (
    <div className="absolute right-3 bottom-3 z-10 flex flex-col overflow-hidden rounded-lg border border-line bg-paper float-card">
      <ZoomButton label="Zoom in" onClick={onIn}>
        <Plus className="size-4" />
      </ZoomButton>
      <span className="h-px bg-line" />
      <ZoomButton label="Zoom out" onClick={onOut}>
        <Minus className="size-4" />
      </ZoomButton>
      <span className="h-px bg-line" />
      <ZoomButton label="Reset view" onClick={onReset}>
        <RotateCcw className="size-4" />
      </ZoomButton>
    </div>
  );
}

function ZoomButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="press flex size-11 items-center justify-center text-ink"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Dossier({
  metric,
  selectedId,
  onMetric,
  onSelect,
  onClear,
}: {
  metric: MetricId;
  selectedId: string | null;
  onMetric: (metric: MetricId) => void;
  onSelect: (id: string) => void;
  onClear: () => void;
}) {
  const country = selectedId ? getCountry(selectedId) : undefined;
  return (
    <aside className="flex h-2/5 min-h-0 flex-col border-line bg-surface lg:h-full lg:w-96 lg:shrink-0 lg:border-l">
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 lg:px-6">
        {country ? (
          <CountryDetail
            key={country.id}
            metric={metric}
            countryId={country.id}
            onMetric={onMetric}
            onClear={onClear}
          />
        ) : (
          <Overview metric={metric} onSelect={onSelect} />
        )}
      </div>
    </aside>
  );
}

function Overview({
  metric,
  onSelect,
}: {
  metric: MetricId;
  onSelect: (id: string) => void;
}) {
  const spec = METRIC_BY_ID[metric];
  const scale = colorScale(metric);
  const ends = extremes(metric);
  const mid = median(metric);
  return (
    <div className="rise" aria-live="polite">
      <p className="text-xs font-medium tracking-wide text-subtle uppercase">Dossier</p>
      <h2 className="mt-2 font-display text-3xl leading-tight tracking-tight">Select a country</h2>
      <p className="mt-2 text-sm text-muted">
        Hover the map for a reading. Click to pin a country here. Search when the shape is small.
      </p>
      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm font-medium">{spec.label}</p>
        <p className="mt-1 text-sm text-muted">{spec.blurb}</p>
        <p className="mt-3 text-xs text-subtle">
          {scale.coverage} of {COUNTRIES.length} have an estimate
          {spec.scale === "log" ? " · logarithmic color" : ""}
        </p>
      </div>
      <ExtremeList title="Highest" rows={ends.high} metric={metric} onSelect={onSelect} />
      <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <span className="text-sm text-muted">World median</span>
        <span className="text-sm font-medium tabular-nums">{formatMetric(metric, mid)}</span>
      </div>
      <ExtremeList title="Lowest" rows={ends.low} metric={metric} onSelect={onSelect} />
      <p className="mt-6 text-xs text-subtle">{DATA_NOTE}</p>
    </div>
  );
}

function ExtremeList({
  title,
  rows,
  metric,
  onSelect,
}: {
  title: string;
  rows: CountryRecord[];
  metric: MetricId;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-subtle">{title}</p>
      <ul className="mt-1">
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              className="press flex min-h-11 w-full items-center justify-between gap-3 text-left"
              onClick={() => onSelect(row.id)}
            >
              <span className="text-sm">{row.name}</span>
              <span className="text-sm text-muted tabular-nums">
                {formatMetric(metric, row[metric] as number | null)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CountryDetail({
  metric,
  countryId,
  onMetric,
  onClear,
}: {
  metric: MetricId;
  countryId: string;
  onMetric: (metric: MetricId) => void;
  onClear: () => void;
}) {
  const country = getCountry(countryId);
  if (!country) return null;
  const spec = METRIC_BY_ID[metric];
  const value = country[metric];
  const scale = colorScale(metric);
  const place = standing(country.id, metric);
  const worldMid = median(metric);
  const regionMid = median(metric, country.region);
  const share = metric === "population" ? populationShare(country.id) : null;
  const t = scale.position(value);

  return (
    <div className="rise" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-subtle uppercase">Pinned</p>
        <button type="button" className="press text-sm font-medium text-pine" onClick={onClear}>
          Clear
        </button>
      </div>
      <h2 className="mt-2 font-display text-4xl leading-none tracking-tight">{country.name}</h2>
      <p className="mt-2 text-sm text-muted">{country.region}</p>

      <div className="mt-6 border-t border-line pt-5">
        <p className="text-sm text-muted">{spec.label}</p>
        <p className="mt-1 font-display text-4xl leading-none tabular-nums">
          {formatMetric(metric, value)}
        </p>
        {place ? (
          <p className="mt-3 text-sm text-muted tabular-nums">
            {place.rank} of {place.total}
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Not included in this sample</p>
        )}
        <Meter t={t} />
        {value != null && worldMid != null ? (
          <p className="mt-3 text-sm">{versusMedian(value, worldMid)}</p>
        ) : null}
        {share != null ? (
          <p className="mt-1 text-sm text-muted tabular-nums">
            {(share * 100).toFixed(share >= 0.1 ? 1 : 2)}% of sampled population
          </p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-subtle">World median</dt>
            <dd className="mt-1 font-medium tabular-nums">{formatMetric(metric, worldMid)}</dd>
          </div>
          <div>
            <dt className="text-xs text-subtle">{country.region} median</dt>
            <dd className="mt-1 font-medium tabular-nums">{formatMetric(metric, regionMid)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className="text-xs font-medium text-subtle">All readings</p>
        <ul className="mt-1">
          {METRICS.map((item) => {
            const itemValue = country[item.id];
            const itemScale = colorScale(item.id);
            const active = item.id === metric;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className="press flex w-full flex-col gap-1.5 py-2.5 text-left"
                  aria-pressed={active}
                  onClick={() => onMetric(item.id)}
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className={`text-sm ${active ? "font-medium" : "text-muted"}`}>
                      {item.label}
                    </span>
                    <span className="text-sm tabular-nums">{formatMetric(item.id, itemValue)}</span>
                  </span>
                  <Meter t={itemScale.position(itemValue)} />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 text-xs text-subtle">{DATA_NOTE}</p>
      <p className="mt-2 text-xs text-subtle">{spec.hint}</p>
    </div>
  );
}

function Meter({ t }: { t: number | null }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-pine-soft" aria-hidden="true">
      <div className="meter-fill" style={{ width: `${Math.round((t ?? 0) * 100)}%` }} />
    </div>
  );
}
