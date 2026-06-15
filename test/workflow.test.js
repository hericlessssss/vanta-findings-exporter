import assert from "node:assert/strict";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { loadFindingsFromFiles } from "../src/lib/workflow.js";

test("loads findings when optional asset map file is missing", async () => {
  const { findings, summary } = await loadFindingsFromFiles({
    vulnerabilitiesPath: "fixtures/vanta-vulnerabilities.sample.json",
    assetsPath: "fixtures/vanta-assets.sample.json",
    environmentMapPath: join(tmpdir(), "vanta-findings-exporter-missing-asset-map.json"),
  });

  assert.equal(findings.length, 2);
  assert.equal(summary.totalFindings, 2);
});
