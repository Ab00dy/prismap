import { useEffect, useImperativeHandle, useMemo, useRef, useState, type PointerEvent, type Ref } from "react";
import { geoGraticule, geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity } from "d3-zoom";
import "d3-transition";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { colorScale, formatMetric, getCountry } from "@/lib/atlas";
import { METRIC_BY_ID, type MetricId } from "@/lib/atlas-types";

export type MapHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  focus: (id: string) => void;
};

type CountryShape = {
  id: string;
  name: string;
  d: string;
  bounds: [[number, number], [number, number]];
};

type HoverState = {
  id: string;
  name: string;
  x: number;
  y: number;
};

type Props = {
  metric: MetricId;
  selectedId: string | null;
  onSelect: (id: string) => void;
  mapRef?: Ref<MapHandle>;
};

const MOTION_ZOOM = 650;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function countryId(id: string | number | undefined, name: string): string {
  if (id == null || id === "") return name;
  return String(id);
}

export function WorldMap({ metric, selectedId, onSelect, mapRef }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const layerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ReturnType<typeof zoom> | null>(null);
  const shapesRef = useRef<CountryShape[]>([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hover, setHover] = useState<HoverState | null>(null);
  const hoverRef = useRef<HoverState | null>(null);
  const rafRef = useRef(0);

  const model = useMemo(() => {
    if (size.w < 20 || size.h < 20) return null;
    const collection = feature(world, world.objects.countries);
    const projection = geoNaturalEarth1();
    const path = geoPath(projection);
    projection.fitExtent(
      [
        [12, 12],
        [size.w - 12, size.h - 12],
      ],
      { type: "Sphere" },
    );
    const countries: CountryShape[] = [];
    for (const item of collection.features) {
      const name = item.properties.name;
      const id = countryId(item.id, name);
      const d = path(item);
      if (!d) continue;
      countries.push({ id, name, d, bounds: path.bounds(item) });
    }
    return {
      countries,
      sphere: path({ type: "Sphere" }) ?? "",
      graticule: path(geoGraticule().step([20, 20])()) ?? "",
    };
  }, [size.w, size.h]);

  shapesRef.current = model?.countries ?? [];
  sizeRef.current = size;

  const fills = useMemo(() => {
    const scale = colorScale(metric);
    const map = new Map<string, string>();
    if (!model) return map;
    for (const country of model.countries) {
      map.set(country.id, scale.color(getCountry(country.id)?.[metric] ?? null));
    }
    return map;
  }, [metric, model]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const w = Math.round(rect.width);
      const h = Math.round(rect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer || size.w < 20 || size.h < 20) return;

    const behavior = zoom()
      .scaleExtent([1, 12])
      .extent([
        [0, 0],
        [size.w, size.h],
      ])
      .translateExtent([
        [-size.w * 0.15, -size.h * 0.15],
        [size.w * 1.15, size.h * 1.15],
      ])
      .on("zoom", (event) => {
        layer.setAttribute("transform", event.transform.toString());
      });

    const selection = select(svg);
    selection.call(behavior);
    selection.call(behavior.transform, zoomIdentity);
    zoomRef.current = behavior;

    return () => {
      selection.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [size.w, size.h]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function queueHover(next: HoverState | null) {
    hoverRef.current = next;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      setHover(hoverRef.current);
    });
  }

  function zoomBy(factor: number) {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    if (!svg || !behavior) return;
    const duration = prefersReducedMotion() ? 0 : 280;
    select(svg).transition().duration(duration).call(behavior.scaleBy, factor);
  }

  function focusCountry(id: string) {
    const svg = svgRef.current;
    const behavior = zoomRef.current;
    const shape = shapesRef.current.find((country) => country.id === id);
    if (!svg || !behavior || !shape) return;
    const { w, h } = sizeRef.current;
    const [[x0, y0], [x1, y1]] = shape.bounds;
    const dx = Math.max(x1 - x0, 1);
    const dy = Math.max(y1 - y0, 1);
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const scale = Math.max(1, Math.min(4.5, 0.36 / Math.max(dx / w, dy / h)));
    const transform = zoomIdentity.translate(w / 2, h / 2).scale(scale).translate(-cx, -cy);
    const duration = prefersReducedMotion() ? 0 : MOTION_ZOOM;
    select(svg).transition().duration(duration).call(behavior.transform, transform);
  }

  useImperativeHandle(mapRef, () => ({
    zoomIn: () => zoomBy(1.7),
    zoomOut: () => zoomBy(1 / 1.7),
    reset: () => {
      const svg = svgRef.current;
      const behavior = zoomRef.current;
      if (!svg || !behavior) return;
      const duration = prefersReducedMotion() ? 0 : MOTION_ZOOM;
      select(svg).transition().duration(duration).call(behavior.transform, zoomIdentity);
    },
    focus: focusCountry,
  }));

  function pointerPoint(event: PointerEvent<SVGPathElement>) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  const spec = METRIC_BY_ID[metric];
  const raised = model?.countries.filter(
    (country) => country.id === selectedId || country.id === hover?.id,
  );

  const tip = hover ? placeTooltip(hover, size.w, size.h) : null;
  const hoverRecord = hover ? getCountry(hover.id) : undefined;
  const hoverValue = hoverRecord ? hoverRecord[metric] : null;

  return (
    <div ref={frameRef} className="absolute inset-0">
      {model ? (
        <svg
          ref={svgRef}
          className="h-full w-full touch-none select-none"
          role="application"
          aria-label={`${spec.label} world map. Drag to pan, scroll to zoom, click a country to pin it.`}
        >
          <g ref={layerRef}>
            <path className="sphere" d={model.sphere} />
            <path className="graticule" d={model.graticule} />
            {model.countries.map((country) => {
              const active = country.id === selectedId;
              const hot = country.id === hover?.id;
              return (
                <path
                  key={country.id}
                  className="country-shape"
                  d={country.d}
                  data-country={country.id}
                  aria-label={country.name}
                  style={{
                    fill: fills.get(country.id),
                    stroke: active
                      ? "var(--color-ink)"
                      : hot
                        ? "var(--color-pine)"
                        : "var(--color-coast)",
                    strokeWidth: active ? 1.7 : hot ? 1.15 : 0.55,
                  }}
                  onClick={() => onSelect(country.id)}
                  onPointerEnter={(event) => {
                    if (event.pointerType !== "mouse") return;
                    const point = pointerPoint(event);
                    queueHover({ id: country.id, name: country.name, ...point });
                  }}
                  onPointerMove={(event) => {
                    if (event.pointerType !== "mouse") return;
                    const point = pointerPoint(event);
                    queueHover({ id: country.id, name: country.name, ...point });
                  }}
                  onPointerLeave={() => queueHover(null)}
                />
              );
            })}
            {raised?.map((country) => {
              const active = country.id === selectedId;
              const hot = country.id === hover?.id && !active;
              return (
                <path
                  key={`raise-${country.id}`}
                  className="country-shape"
                  d={country.d}
                  pointerEvents="none"
                  style={{
                    fill: hot ? "rgb(255 255 255 / 0.22)" : fills.get(country.id),
                    stroke: active ? "var(--color-ink)" : "var(--color-pine)",
                    strokeWidth: active ? 1.8 : 1.2,
                  }}
                />
              );
            })}
          </g>
        </svg>
      ) : (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm text-muted">Drawing coastlines</p>
        </div>
      )}
      {hover && tip ? (
        <div
          className="tip-in pointer-events-none absolute z-20 max-w-56 rounded-lg border border-line bg-paper px-3 py-2 float-card"
          style={{ left: tip.left, top: tip.top, transform: tip.transform }}
        >
          <p className="text-sm font-medium leading-snug">{hover.name}</p>
          <p className="mt-1 text-xs text-muted">{spec.label}</p>
          <p className="mt-1 font-display text-xl leading-none tabular-nums">
            {formatMetric(metric, hoverValue)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function placeTooltip(hover: HoverState, width: number, height: number) {
  const flipX = hover.x > width - 196;
  const flipY = hover.y > height - 96;
  return {
    left: hover.x + (flipX ? -14 : 14),
    top: hover.y + (flipY ? -14 : 14),
    transform: [flipX ? "translateX(-100%)" : "", flipY ? "translateY(-100%)" : ""]
      .filter(Boolean)
      .join(" "),
  };
}
