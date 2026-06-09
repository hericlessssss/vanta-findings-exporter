import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeFindings } from "../src/lib/normalize.js";
import { buildSummary } from "../src/lib/summary.js";

test("normalizes Vanta vulnerabilities and joins assets by targetId", async () => {
  const findings = await loadFindings();

  assert.equal(findings.length, 2);
  assert.equal(findings[0].title, "CVE-2026-9256 - nginx:1.28.3");
  assert.equal(findings[0].assetName, "production-backend");
  assert.equal(findings[0].environment, "production");
  assert.equal(findings[0].isFixable, true);
  assert.equal(findings[0].fixedVersion, "1.28.3-r2");
  assert.equal(findings[0].owner, "unknown");
  assert.equal(findings[0].service, "unknown");
  assert.equal(findings[0].repository, "unknown");
  assert.equal(findings[1].environment, "preproduction");
});

test("uses explicit asset metadata mapping before inferred environment", async () => {
  const environmentMap = JSON.parse(await readFile("fixtures/environment-map.sample.json", "utf8"));
  const findings = await loadFindings({ environmentMap });

  assert.equal(findings[0].environment, "production");
  assert.equal(findings[0].owner, "devops");
  assert.equal(findings[0].service, "backend");
  assert.equal(findings[0].repository, "sfj/backend");
  assert.equal(findings[0].awsAccountId, "910976932103");
  assert.equal(findings[0].awsRegion, "eu-west-1");
  assert.equal(findings[1].environment, "staging");
  assert.equal(findings[1].owner, "platform");
  assert.equal(findings[1].service, "backend");
  assert.equal(findings[1].repository, "sfj/backend");
});

test("keeps string environment mapping backwards compatible", async () => {
  const findings = await loadFindings({
    environmentMap: {
      assetIds: {
        asset_001: "production",
      },
    },
  });

  assert.equal(findings[0].environment, "production");
  assert.equal(findings[0].owner, "unknown");
});

test("builds summary counts by severity, package, and asset", async () => {
  const findings = await loadFindings();
  const summary = buildSummary(findings);

  assert.equal(summary.totalFindings, 2);
  assert.equal(summary.fixableFindings, 1);
  assert.equal(summary.bySeverity.HIGH, 1);
  assert.equal(summary.bySeverity.MEDIUM, 1);
  assert.equal(summary.byPackage.nginx, 1);
  assert.equal(summary.byPackage.openssl, 1);
  assert.equal(summary.byAsset["production-backend"], 1);
  assert.equal(summary.byOwner.unknown, 2);
  assert.equal(summary.byService.unknown, 2);
  assert.equal(summary.byRepository.unknown, 2);
});

test("normalizes paginated Vanta responses across multiple results", async () => {
  const vulnerabilityResponse = JSON.parse(
    await readFile("fixtures/vanta-vulnerabilities.paginated.sample.json", "utf8"),
  );
  const assetResponse = JSON.parse(
    await readFile("fixtures/vanta-assets.paginated.sample.json", "utf8"),
  );

  const findings = normalizeFindings(vulnerabilityResponse, assetResponse);
  const summary = buildSummary(findings);

  assert.equal(findings.length, 3);
  assert.equal(summary.totalFindings, 3);
  assert.equal(summary.fixableFindings, 2);
  assert.equal(summary.bySeverity.HIGH, 1);
  assert.equal(summary.bySeverity.MEDIUM, 1);
  assert.equal(summary.bySeverity.LOW, 1);
  assert.equal(findings[0].assetName, "production-api");
  assert.equal(findings[1].assetName, "staging-api");
  assert.equal(findings[2].assetName, "dev-worker");
});

async function loadFindings(options = {}) {
  const vulnerabilityResponse = JSON.parse(
    await readFile("fixtures/vanta-vulnerabilities.sample.json", "utf8"),
  );
  const assetResponse = JSON.parse(await readFile("fixtures/vanta-assets.sample.json", "utf8"));

  return normalizeFindings(vulnerabilityResponse, assetResponse, options);
}
