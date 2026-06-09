import assert from "node:assert/strict";
import test from "node:test";
import { createVantaClient } from "../src/lib/vanta-client.js";

test("fetches all pages for Vanta resources", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (url.endsWith("/oauth/token")) {
      return jsonResponse({
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      });
    }

    if (url.includes("/v1/vulnerabilities") && !url.includes("pageCursor")) {
      return jsonResponse({
        results: [
          {
            pageInfo: {
              hasNextPage: true,
              endCursor: "cursor-1",
            },
            data: [{ id: "vuln_001" }],
          },
        ],
      });
    }

    if (url.includes("/v1/vulnerabilities") && url.includes("pageCursor=cursor-1")) {
      return jsonResponse({
        results: [
          {
            pageInfo: {
              hasNextPage: false,
              endCursor: "cursor-2",
            },
            data: [{ id: "vuln_002" }],
          },
        ],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const client = await createVantaClient(
    {
      clientId: "client-id",
      clientSecret: "client-secret",
      scope: "vanta-api.all:read",
      apiBaseUrl: "https://api.vanta.test",
    },
    { fetchImpl },
  );

  const response = await client.fetchVulnerabilities({ pageSize: 1 });

  assert.equal(response.results.length, 2);
  assert.deepEqual(
    response.results.flatMap((result) => result.data.map((item) => item.id)),
    ["vuln_001", "vuln_002"],
  );
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-token");
});

test("fetches tests and test entities with expected filters", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (url.endsWith("/oauth/token")) {
      return jsonResponse({ access_token: "test-token" });
    }

    if (url.includes("/v1/tests?")) {
      assert.match(url, /statusFilter=NEEDS_ATTENTION/);
      return jsonResponse({
        results: [{ pageInfo: { hasNextPage: false }, data: [{ id: "test_001" }] }],
      });
    }

    if (url.includes("/v1/tests/test_001/entities?")) {
      assert.match(url, /entityStatus=FAILING/);
      return jsonResponse({
        results: [{ pageInfo: { hasNextPage: false }, data: [{ id: "entity_001" }] }],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const client = await createVantaClient(
    {
      clientId: "client-id",
      clientSecret: "client-secret",
      scope: "vanta-api.all:read",
      apiBaseUrl: "https://api.vanta.test",
    },
    { fetchImpl },
  );

  const tests = await client.fetchTests({ query: { statusFilter: "NEEDS_ATTENTION" } });
  const entities = await client.fetchTestEntities("test_001", { query: { entityStatus: "FAILING" } });

  assert.equal(tests.results[0].data[0].id, "test_001");
  assert.equal(entities.results[0].data[0].id, "entity_001");
});

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}
