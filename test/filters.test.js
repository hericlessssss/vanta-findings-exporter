import assert from "node:assert/strict";
import test from "node:test";
import { filterFindings } from "../src/lib/filters.js";

const findings = [
  {
    id: "vuln_001",
    severity: "HIGH",
    isFixable: true,
    packageIdentifier: "nginx",
    environment: "production",
    assetName: "production-api",
    remediateByDate: "2026-06-10T00:00:00Z",
  },
  {
    id: "vuln_002",
    severity: "MEDIUM",
    isFixable: false,
    packageIdentifier: "openssl",
    environment: "staging",
    assetName: "staging-api",
    remediateByDate: "2026-06-20T00:00:00Z",
  },
  {
    id: "vuln_003",
    severity: "LOW",
    isFixable: true,
    packageIdentifier: "curl",
    environment: "development",
    assetName: "dev-worker",
    remediateByDate: null,
  },
];

test("filters findings by severity case-insensitively", () => {
  const filtered = filterFindings(findings, { severity: "high" });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001"],
  );
});

test("filters findings by fixable-only", () => {
  const filtered = filterFindings(findings, { fixableOnly: true });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001", "vuln_003"],
  );
});

test("combines severity and fixable-only filters", () => {
  const filtered = filterFindings(findings, {
    severity: "medium",
    fixableOnly: true,
  });

  assert.deepEqual(filtered, []);
});

test("filters findings by package case-insensitively", () => {
  const filtered = filterFindings(findings, { package: "NGINX" });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001"],
  );
});

test("filters findings by environment case-insensitively", () => {
  const filtered = filterFindings(findings, { environment: "STAGING" });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_002"],
  );
});

test("combines package and environment filters", () => {
  const filtered = filterFindings(findings, {
    package: "curl",
    environment: "development",
  });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_003"],
  );
});

test("filters findings by asset case-insensitively", () => {
  const filtered = filterFindings(findings, { asset: "PRODUCTION-API" });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001"],
  );
});

test("combines asset with other filters", () => {
  const filtered = filterFindings(findings, {
    asset: "dev-worker",
    package: "curl",
    environment: "development",
    fixableOnly: true,
  });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_003"],
  );
});

test("filters findings by due-before date", () => {
  const filtered = filterFindings(findings, { dueBefore: "2026-06-11" });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001"],
  );
});

test("excludes findings without due date when filtering by due-before", () => {
  const filtered = filterFindings(findings, { dueBefore: "2026-12-31" });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001", "vuln_002"],
  );
});

test("throws for invalid due-before format", () => {
  assert.throws(
    () => filterFindings(findings, { dueBefore: "06/11/2026" }),
    /Invalid --due-before value/,
  );
});

test("filters overdue findings using reference date", () => {
  const filtered = filterFindings(findings, {
    overdue: true,
    referenceDate: "2026-06-15T12:00:00Z",
  });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_001"],
  );
});

test("filters due-soon findings using reference date and day window", () => {
  const filtered = filterFindings(findings, {
    dueSoon: "10",
    referenceDate: "2026-06-15T12:00:00Z",
  });

  assert.deepEqual(
    filtered.map((finding) => finding.id),
    ["vuln_002"],
  );
});

test("throws for invalid due-soon value", () => {
  assert.throws(
    () => filterFindings(findings, { dueSoon: "soon" }),
    /Invalid --due-soon value/,
  );
});
