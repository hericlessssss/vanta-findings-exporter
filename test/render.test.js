import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeFindings } from "../src/lib/normalize.js";
import { buildSummary } from "../src/lib/summary.js";
import { renderCsv, renderJiraTasks, renderJson, renderMarkdownSummary, renderOperationalTasks } from "../src/lib/render.js";

test("renders markdown summary", async () => {
  const findings = await loadFindings();
  const markdown = renderMarkdownSummary(buildSummary(findings));

  assert.match(markdown, /# Vanta Findings Summary/);
  assert.match(markdown, /Total findings: 2/);
  assert.match(markdown, /- HIGH: 1/);
  assert.match(markdown, /- nginx: 1/);
  assert.match(markdown, /CVE-2026-9256 - nginx:1\.28\.3/);
});

test("renders operational tasks grouped by severity", async () => {
  const findings = await loadFindings();
  const tasks = renderOperationalTasks(findings);

  assert.match(tasks, /\[DevOps \| Vanta \| Security\] Review and remediate high severity findings/);
  assert.match(tasks, /Environments: production/);
  assert.match(tasks, /Packages: nginx/);
  assert.match(tasks, /Assets: production-backend/);
  assert.match(tasks, /Findings:/);
  assert.match(tasks, /Fixed version: 1\.28\.3-r2/);
  assert.match(tasks, /External link: https:\/\/console\.aws\.amazon\.com\/inspector\/v2\/home/);
});

test("renders clear message when no operational tasks match", () => {
  const tasks = renderOperationalTasks([]);

  assert.equal(tasks, "No findings matched the selected filters.");
});

test("renders Jira-ready task blocks", async () => {
  const findings = await loadFindings();
  const jira = renderJiraTasks(findings);

  assert.match(jira, /Title: \[DevOps \| Vanta \| Security\] Remediate high severity Vanta findings/);
  assert.match(jira, /Description:/);
  assert.match(jira, /Analyze and remediate 1 high severity Vanta finding\./);
  assert.match(jira, /Acceptance Criteria:/);
  assert.match(jira, /Fixed versions are validated where available/);
  assert.match(jira, /CVE-2026-9256 - nginx:1\.28\.3/);
});

test("renders clear message when no Jira tasks match", () => {
  const jira = renderJiraTasks([]);

  assert.equal(jira, "No findings matched the selected filters.");
});

test("renders empty markdown findings clearly", () => {
  const markdown = renderMarkdownSummary(buildSummary([]));

  assert.match(markdown, /## Findings\n- None/);
});

test("renders CSV with operational columns", async () => {
  const findings = await loadFindings();
  const csv = renderCsv(findings);

  assert.match(
    csv,
    /^severity,title,packageIdentifier,assetName,environment,isFixable,fixedVersion,remediateByDate,relatedVulns,externalURL/,
  );
  assert.match(csv, /HIGH,CVE-2026-9256 - nginx:1\.28\.3,nginx,production-backend,production,true,1\.28\.3-r2/);
});

test("renders JSON summary counts as arrays for parser compatibility", async () => {
  const findings = await loadFindings();
  const parsed = JSON.parse(renderJson(findings, buildSummary(findings)));

  assert.deepEqual(parsed.summary.bySeverity, [
    { name: "HIGH", count: 1 },
    { name: "MEDIUM", count: 1 },
  ]);
  assert.equal(parsed.findings.length, 2);
});

test("escapes CSV values with commas, quotes, and newlines", () => {
  const csv = renderCsv([
    {
      severity: "HIGH",
      title: 'Package "quoted", with comma',
      packageIdentifier: "nginx",
      assetName: "production-backend",
      environment: "production",
      isFixable: true,
      fixedVersion: "1.0.1",
      remediateByDate: "2026-06-10T00:00:00Z",
      relatedVulns: ["CVE-1", "CVE-2"],
      externalURL: "https://example.com/a\nb",
    },
  ]);

  assert.match(csv, /"Package ""quoted"", with comma"/);
  assert.match(csv, /CVE-1;CVE-2/);
  assert.match(csv, /"https:\/\/example\.com\/a\nb"/);
});

async function loadFindings() {
  const vulnerabilityResponse = JSON.parse(
    await readFile("fixtures/vanta-vulnerabilities.sample.json", "utf8"),
  );
  const assetResponse = JSON.parse(await readFile("fixtures/vanta-assets.sample.json", "utf8"));

  return normalizeFindings(vulnerabilityResponse, assetResponse);
}
