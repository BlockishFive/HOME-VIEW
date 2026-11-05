import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { imageMetadata, readImageMetadata } from "../lib/image-metadata";
test("camera headers: JPEG orientation, PNG, lossy/lossless/extended WebP dimensions without pixel decode", async () => {
  for (const format of ["jpeg", "png", "webp"] as const) {
    for (const orientation of [1, 6]) {
      const file = await sharp({
        create: {
          width: 1200,
          height: 800,
          channels: 3,
          background: "#335577",
        },
      })
        .withMetadata({ orientation })
        .toFormat(format)
        .toBuffer();
      const info = await readImageMetadata(new Blob([new Uint8Array(file)]));
      assert.equal(info.format, format);
      assert.equal(info.width, orientation === 6 ? 800 : 1200);
      assert.equal(info.height, orientation === 6 ? 1200 : 800);
      assert.equal(info.orientation, orientation);
    }
  }
  const lossless = await sharp({
    create: { width: 2048, height: 1024, channels: 3, background: "#553366" },
  })
    .webp({ lossless: true })
    .toBuffer();
  assert.equal(imageMetadata(lossless).width, 2048);
  assert.equal(imageMetadata(lossless).height, 1024);
});
test("camera header parser rejects malformed, truncated and unrecognized inputs before decode", () => {
  for (const bytes of [[], [255, 216, 255], [0, 0, 0, 0], Array(30).fill(0)])
    assert.throws(() => imageMetadata(new Uint8Array(bytes)));
  // A tiny header can declare a very large image: callers can reject it before any bitmap allocation.
  const png = new Uint8Array(24);
  png.set([137, 80, 78, 71, 13, 10, 26, 10]);
  const v = new DataView(png.buffer);
  v.setUint32(8, 13);
  v.setUint32(12, 0x49484452);
  v.setUint32(16, 20000);
  v.setUint32(20, 10000);
  assert.equal(imageMetadata(png).width * imageMetadata(png).height, 200000000);
});
