/**
 * Ambient type declarations for Yandex Maps v3 runtime, loaded at runtime
 * from the CDN (no npm package exists). We only declare the subset we
 * actually use — `YMap`, the 5 feature/layer components, and the reactify
 * helpers. Everything else stays `unknown` so usage is forced through
 * explicit casts.
 *
 * Runtime source (see index.html / PassYaMapScreen.web.tsx):
 *   <script src="https://api-maps.yandex.ru/v3/?apikey=...&lang=ru_RU"></script>
 *   ymaps3.import('@yandex/ymaps3-reactify')
 */

declare global {
  interface Window {
    ymaps3: {
      /** Resolves to the reactify module with `bindTo` factory. */
      import(
        moduleName: '@yandex/ymaps3-reactify',
      ): Promise<{ reactify: { bindTo(react: unknown, reactDom: unknown): ReactifyInstance } }>;
      /** Generic dynamic import. */
      import(moduleName: string): Promise<unknown>;
      /** Ready promise — awaited before using any map APIs. */
      ready: Promise<void>;

      // Components available after `ready`. When consumed via reactify.module,
      // these are the ones we destructure.
      YMap: unknown;
      YMapDefaultSchemeLayer: unknown;
      YMapDefaultFeaturesLayer: unknown;
      YMapFeature: unknown;
      YMapMarker: unknown;
      YMapListener: unknown;
    };
  }
}

/** Return type of `reactify.bindTo(React, ReactDOM)`. */
interface ReactifyInstance {
  /** Wraps a ymaps3 module's exports as React components. */
  module(mod: unknown): {
    YMap: React.ComponentType<YMapProps>;
    YMapDefaultSchemeLayer: React.ComponentType<Record<string, unknown>>;
    YMapDefaultFeaturesLayer: React.ComponentType<Record<string, unknown>>;
    YMapFeature: React.ComponentType<YMapFeatureProps>;
    YMapMarker: React.ComponentType<YMapMarkerProps>;
    YMapListener: React.ComponentType<YMapListenerProps>;
  };
  /** Converts a plain object to a reactive ref-like value used by YMap.location. */
  useDefault<T>(value: T): T;
}

interface YMapLocation {
  center: [number, number]; // [lon, lat]
  zoom: number;
}

interface YMapProps {
  location: YMapLocation;
  mode?: 'vector' | 'raster';
  children?: React.ReactNode;
}

interface YMapFeatureProps {
  geometry: {
    type: 'Polygon' | 'Point' | 'LineString';
    coordinates: [number, number][] | [number, number][][];
  };
  style?: {
    fill?: string;
    stroke?: Array<{ color: string; width: number }>;
    fillOpacity?: number;
  };
  children?: React.ReactNode;
}

interface YMapMarkerProps {
  coordinates: [number, number];
  children?: React.ReactNode;
}

interface YMapListenerProps {
  onClick?: (object: unknown, event: { coordinates: [number, number]; screenCoordinates: [number, number] }) => void;
  [key: string]: unknown;
}

export {};
