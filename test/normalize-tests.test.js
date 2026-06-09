import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTests } from "../src/lib/normalize-tests.js";

test("normalizes Vanta tests with failing entities", () => {
  const tests = normalizeTests(
    {
      results: [
        {
          data: [
            {
              id: "test_001",
              name: "AWS S3 buckets should block public access",
              status: "NEEDS_ATTENTION",
              dueDate: "2026-07-01T00:00:00Z",
              category: "Engineering",
              integrationName: "AWS",
              frameworks: [{ name: "SOC 2" }],
              controls: ["CC6.6"],
            },
          ],
        },
      ],
    },
    {
      test_001: {
        results: [
          {
            data: [
              {
                id: "entity_001",
                displayName: "sfj-prod-bucket",
                status: "FAILING",
                dueDate: "2026-06-20T00:00:00Z",
                resourceType: "S3_BUCKET",
                awsAccountId: "910976932103",
                awsRegion: "us-east-1",
              },
            ],
          },
        ],
      },
    },
  );

  assert.equal(tests.length, 1);
  assert.equal(tests[0].status, "NEEDS_ATTENTION");
  assert.equal(tests[0].dueDate, "2026-07-01T00:00:00Z");
  assert.equal(tests[0].integration, "AWS");
  assert.deepEqual(tests[0].frameworks, ["SOC 2"]);
  assert.equal(tests[0].failingEntities[0].name, "sfj-prod-bucket");
  assert.equal(tests[0].failingEntities[0].type, "S3_BUCKET");
  assert.equal(tests[0].failingEntities[0].dueDate, "2026-06-20T00:00:00Z");
});
