import test from "node:test";
import assert from "node:assert/strict";
import {
  removeDraftScene,
  validateDraftScenes,
  validatePanoramaDimensions,
  validatePanoramaFile,
  type DraftScene,
  analyzeTour,
  validSceneView,
  defaultSceneView,
} from "../lib/draft-tour";
const scenes: DraftScene[] = [
  {
    id: "sala",
    name: "Sala",
    blob: new Blob(["demo"], { type: "image/jpeg" }),
    hotspots: [{ target: "patio", yaw: 0, pitch: 0 }],
  },
  {
    id: "patio",
    name: "Patio",
    blob: new Blob(["demo"], { type: "image/jpeg" }),
    hotspots: [{ target: "sala", yaw: 1, pitch: 0.1 }],
  },
];
test("panoramas require supported, bounded files and exact complete-sphere dimensions", () => {
  assert.equal(validatePanoramaFile({ type: "image/jpeg", size: 1200 }), null);
  assert.ok(validatePanoramaFile({ type: "image/svg+xml", size: 1200 }));
  assert.ok(
    validatePanoramaFile({ type: "image/jpeg", size: 13 * 1024 * 1024 }),
  );
  assert.equal(validatePanoramaDimensions(4096, 2048), null);
  assert.ok(validatePanoramaDimensions(1920, 1080));
  assert.ok(validatePanoramaDimensions(400, 200));
  assert.ok(validatePanoramaDimensions(12000, 6000));
});

test("entry views are optional for older scenes, bounded and independent of hotspot angles", () => {
  assert.equal(validSceneView(defaultSceneView), true);
  assert.equal(validateDraftScenes(scenes), null);
  assert.equal(
    validateDraftScenes([
      { ...scenes[0], initialView: { yaw: 1, pitch: 0.1, fov: 0.8 } },
      scenes[1],
    ]),
    null,
  );
  assert.ok(
    validateDraftScenes([
      { ...scenes[0], initialView: { yaw: 10, pitch: 0, fov: 1 } },
      scenes[1],
    ]),
  );
  assert.equal(validSceneView({ yaw: 0, pitch: 0, fov: NaN }), false);
});
test("directed tour analysis distinguishes unreachable rooms from missing return paths", () => {
  assert.deepEqual(analyzeTour(scenes), { unreachable: [], noReturn: [] });
  assert.deepEqual(
    analyzeTour([{ ...scenes[0] }, { ...scenes[1], hotspots: [] }]),
    { unreachable: [], noReturn: ["patio"] },
  );
  assert.deepEqual(analyzeTour([{ ...scenes[0], hotspots: [] }, scenes[1]]), {
    unreachable: ["patio"],
    noReturn: [],
  });
  assert.deepEqual(analyzeTour([]), { unreachable: [], noReturn: [] });
});
test("deleting a scene removes incoming links without mutating the original graph", () => {
  const remaining = removeDraftScene(scenes, "patio");
  assert.equal(remaining.length, 1);
  assert.deepEqual(remaining[0].hotspots, []);
  assert.equal(scenes[0].hotspots.length, 1);
  assert.equal(validateDraftScenes(remaining), null);
});
test("scene graph accepts valid links and rejects missing targets, duplicates and invalid angles", () => {
  assert.equal(validateDraftScenes(scenes), null);
  assert.ok(
    validateDraftScenes([
      { ...scenes[0], hotspots: [{ target: "missing", yaw: 0, pitch: 0 }] },
    ]),
  );
  assert.ok(
    validateDraftScenes([
      { ...scenes[0], hotspots: [{ target: "sala", yaw: 0, pitch: 0 }] },
    ]),
  );
  assert.ok(
    validateDraftScenes([
      {
        ...scenes[0],
        hotspots: [{ target: "patio", yaw: Infinity, pitch: 0 }],
      },
      scenes[1],
    ]),
  );
  assert.ok(
    validateDraftScenes([
      {
        ...scenes[0],
        hotspots: [scenes[0].hotspots[0], scenes[0].hotspots[0]],
      },
      scenes[1],
    ]),
  );
});
