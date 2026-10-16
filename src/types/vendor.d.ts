interface GeoProjection {
  fitExtent(
    extent: [[number, number], [number, number]],
    object: unknown,
  ): GeoProjection;
}

interface GeoPath {
  (object: unknown): string | null;
  bounds(object: unknown): [[number, number], [number, number]];
}

interface ZoomTransform {
  translate(x: number, y: number): ZoomTransform;
  scale(k: number): ZoomTransform;
  toString(): string;
}

interface ZoomBehavior {
  (selection: unknown): void;
  scaleExtent(extent: [number, number]): ZoomBehavior;
  extent(extent: [[number, number], [number, number]]): ZoomBehavior;
  translateExtent(extent: [[number, number], [number, number]]): ZoomBehavior;
  on(
    type: string,
    listener: (event: { transform: { toString(): string }; sourceEvent: unknown }) => void,
  ): ZoomBehavior;
  transform(selection: unknown, transform: ZoomTransform): void;
  scaleBy(selection: unknown, k: number): void;
}

interface D3Selection {
  call(...args: any[]): D3Selection;
  transition(): D3Transition;
  on(typenames: string, listener: null): D3Selection;
}

interface D3Transition {
  duration(ms: number): D3Transition;
  call(...args: any[]): D3Transition;
}

declare module "d3-geo" {
  export function geoNaturalEarth1(): GeoProjection;
  export function geoPath(projection?: GeoProjection): GeoPath;
  export function geoGraticule(): {
    step(step: [number, number]): { (): unknown };
  };
}

declare module "d3-zoom" {
  export function zoom(): ZoomBehavior;
  export const zoomIdentity: ZoomTransform;
}

declare module "d3-selection" {
  export function select<T extends Element>(element: T): D3Selection;
}

declare module "d3-transition" {}

declare module "topojson-client" {
  export function feature(
    topology: unknown,
    object: unknown,
  ): {
    features: Array<{ id?: string | number; properties: { name: string } }>;
  };
}

declare module "world-atlas/countries-110m.json" {
  const value: { objects: { countries: unknown } };
  export default value;
}
