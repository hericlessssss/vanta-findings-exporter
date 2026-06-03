export function flattenVantaData(response) {
  const results = normalizeResults(response);

  if (!results) {
    throw new Error("Expected a Vanta response with results.");
  }

  return results.flatMap((result) => {
    if (!Array.isArray(result.data)) {
      return [];
    }

    return result.data;
  });
}

export function normalizeResults(response) {
  if (!response?.results) {
    return null;
  }

  if (Array.isArray(response.results)) {
    return response.results;
  }

  return [response.results];
}
