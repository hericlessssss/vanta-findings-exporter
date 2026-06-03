import { normalizeResults } from "./vanta-response.js";

export async function createVantaClient(config, options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const token = await requestAccessToken(config, fetchImpl);

  return {
    fetchVulnerabilities: (params = {}) =>
      fetchPaginatedResource(config, fetchImpl, token, "/v1/vulnerabilities", params),
    fetchVulnerableAssets: (params = {}) =>
      fetchPaginatedResource(config, fetchImpl, token, "/v1/vulnerable-assets", params),
  };
}

async function requestAccessToken(config, fetchImpl) {
  const response = await fetchImpl(`${config.apiBaseUrl}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: config.scope,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    throw new Error(`Vanta OAuth request failed with HTTP ${response.status}.`);
  }

  const body = await response.json();

  if (!body.access_token) {
    throw new Error("Vanta OAuth response did not include an access token.");
  }

  return body.access_token;
}

async function fetchPaginatedResource(config, fetchImpl, token, path, params) {
  const pageSize = params.pageSize ?? "100";
  const baseParams = new URLSearchParams({
    pageSize: String(pageSize),
    ...params.query,
  });
  const results = [];
  let cursor = null;

  while (true) {
    const pageParams = new URLSearchParams(baseParams);

    if (cursor) {
      pageParams.set("pageCursor", cursor);
    }

    const response = await fetchImpl(`${config.apiBaseUrl}${path}?${pageParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Vanta ${path} request failed with HTTP ${response.status}.`);
    }

    const body = await response.json();

    const pageResults = normalizeResults(body);

    if (!pageResults) {
      throw new Error(`Vanta ${path} response did not include results.`);
    }

    results.push(...pageResults);

    const lastResult = pageResults.at(-1);
    const pageInfo = lastResult?.pageInfo;

    if (!pageInfo?.hasNextPage) {
      break;
    }

    if (!pageInfo.endCursor) {
      throw new Error(`Vanta ${path} response is missing endCursor for next page.`);
    }

    cursor = pageInfo.endCursor;
  }

  return { results };
}
