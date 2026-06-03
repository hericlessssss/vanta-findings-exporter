import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { flattenVantaData } from "../src/lib/vanta-response.js";

test("flattens all data entries across multiple Vanta results", async () => {
  const response = JSON.parse(
    await readFile("fixtures/vanta-vulnerabilities.paginated.sample.json", "utf8"),
  );

  const entries = flattenVantaData(response);

  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => entry.id),
    ["vuln_101", "vuln_102", "vuln_103"],
  );
});

test("flattens data when Vanta results is a single object", () => {
  const entries = flattenVantaData({
    results: {
      pageInfo: {
        hasNextPage: false,
      },
      data: [{ id: "vuln_single" }],
    },
  });

  assert.deepEqual(entries, [{ id: "vuln_single" }]);
});

test("throws a clear error for invalid Vanta response shape", () => {
  assert.throws(
    () => flattenVantaData({ data: [] }),
    /Expected a Vanta response with results/,
  );
});
