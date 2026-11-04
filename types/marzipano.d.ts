declare module "marzipano" {
  type View = {
    setYaw(value: number): void;
    yaw(): number;
    setPitch(value: number): void;
    pitch(): number;
    setFov(value: number): void;
    fov(): number;
    parameters(): { yaw: number; pitch: number; fov: number };
    screenToCoordinates(point: { x: number; y: number }): {
      yaw: number;
      pitch: number;
    };
    addEventListener(event: "change", listener: () => void): void;
    removeEventListener(event: "change", listener: () => void): void;
  };
  type Scene = {
    switchTo(options?: { transitionDuration?: number }): void;
    view(): View;
    hotspotContainer(): {
      createHotspot(
        element: HTMLElement,
        position: { yaw: number; pitch: number },
      ): unknown;
    };
  };
  class RectilinearView {
    constructor(
      params: { yaw: number; pitch: number; fov: number },
      limiter: unknown,
    );
    static limit: {
      traditional(
        maxResolution: number,
        maxVFov: number,
        maxHFov?: number,
      ): unknown;
    };
  }
  interface RectilinearView extends View {}
  class Viewer {
    constructor(
      element: HTMLElement,
      options?: { controls?: { mouseViewMode?: string } },
    );
    createScene(options: {
      source: unknown;
      geometry: unknown;
      view: RectilinearView;
      pinFirstLevel: boolean;
    }): Scene;
    destroy(): void;
  }
  class EquirectGeometry {
    constructor(levels: { width: number }[]);
  }
  const ImageUrlSource: { fromString(url: string): unknown };
  const Marzipano: {
    Viewer: typeof Viewer;
    RectilinearView: typeof RectilinearView;
    EquirectGeometry: typeof EquirectGeometry;
    ImageUrlSource: typeof ImageUrlSource;
  };
  export default Marzipano;
}
