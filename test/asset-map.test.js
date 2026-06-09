import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildAssetMapSkeleton } from "../src/lib/asset-map.js";

test("builds asset map skeleton from Vanta assets", async () => {
  const assetResponse = JSON.parse(await readFile("fixtures/vanta-assets.sample.json", "utf8"));
  const skeleton = buildAssetMapSkeleton(assetResponse);

  assert.deepEqual(Object.keys(skeleton.assetIds), ["asset_002", "asset_001"]);
  assert.deepEqual(skeleton.assetIds.asset_001, {
    environment: "production",
    owner: "unknown",
    service: "unknown",
    repository: "unknown",
    awsAccountId: null,
    awsRegion: null,
  });
  assert.equal(skeleton.assetIds.asset_002.environment, "staging");
});
