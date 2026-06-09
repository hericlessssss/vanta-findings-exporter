import assert from "node:assert/strict";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { writeOutput } from "../src/cli.js";

test("writes rendered output to a file when --out is provided", async () => {
  const outputDir = join(tmpdir(), "vanta-findings-exporter-test");
  const outputPath = join(outputDir, "summary.md");
  const logs = [];

  await rm(outputDir, { recursive: true, force: true });

  await writeOutput("# Vanta Findings Summary", { out: outputPath }, (message) => logs.push(message));

  const output = await readFile(outputPath, "utf8");

  assert.deepEqual(logs, [`Wrote output to ${outputPath}`]);
  assert.match(output, /# Vanta Findings Summary/);

  await rm(outputDir, { recursive: true, force: true });
});
