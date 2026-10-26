declare module "marzipano" {
  type View = {
    setYaw(value: number): void;
    yaw(): number;
    setPitch(value: number): void;
    pitch(): number;
    setFov(value: number): void;
    fov(): number;
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
