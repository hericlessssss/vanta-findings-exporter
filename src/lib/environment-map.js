export function resolveEnvironment(asset, environmentMap = {}) {
  return resolveAssetMetadata(asset, environmentMap).environment;
}

export function resolveAssetMetadata(asset, environmentMap = {}) {
  const mapped = findMappedMetadata(asset, environmentMap);

  return {
    environment: mapped.environment ?? inferEnvironment(asset),
    owner: mapped.owner ?? "unknown",
    service: mapped.service ?? inferService(asset),
    repository: mapped.repository ?? inferRepository(asset),
    awsAccountId: mapped.awsAccountId ?? null,
    awsRegion: mapped.awsRegion ?? null,
  };
}

function findMappedMetadata(asset, environmentMap) {
  if (!asset) {
    return {};
  }

  const assetId = asset.id;
  const assetName = asset.name;

  if (assetId && environmentMap.assetIds?.[assetId]) {
    return normalizeMapEntry(environmentMap.assetIds[assetId]);
  }

  if (assetName && environmentMap.assetNames?.[assetName]) {
    return normalizeMapEntry(environmentMap.assetNames[assetName]);
  }

  if (assetName && environmentMap.assetNamePrefixes) {
    const matchedPrefix = Object.keys(environmentMap.assetNamePrefixes)
      .sort((left, right) => right.length - left.length)
      .find((prefix) => assetName.startsWith(prefix));

    if (matchedPrefix) {
      return normalizeMapEntry(environmentMap.assetNamePrefixes[matchedPrefix]);
    }
  }

  return {};
}

function normalizeMapEntry(entry) {
  if (typeof entry === "string") {
    return { environment: normalizePlaceholder(entry) };
  }

  if (!entry || typeof entry !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(entry).map(([key, value]) => [key, normalizePlaceholder(value)]),
  );
}

function normalizePlaceholder(value) {
  if (typeof value === "string" && ["", "unknown", "unmapped"].includes(value.trim().toLowerCase())) {
    return undefined;
  }

  return value;
}

function inferEnvironment(asset) {
  const name = asset?.name?.toLowerCase() ?? "";

  if (name.includes("preproduction") || name.includes("staging")) {
    return "preproduction";
  }

  if (name.includes("production") || name.startsWith("prod-")) {
    return "production";
  }

  if (name.includes("development") || name.startsWith("dev-")) {
    return "development";
  }

  return "unknown";
}

function inferService(asset) {
  const name = normalizeAssetName(asset?.name);

  if (!name) {
    return "unknown";
  }

  const withoutEnvironmentPrefix = name.replace(/^(production|preproduction|staging|development|dev)-/, "");
  return withoutEnvironmentPrefix.replace(/-(production|preproduction|staging|development|dev|prod)$/, "");
}

function inferRepository(asset) {
  const service = inferService(asset);

  if (service === "unknown") {
    return "unknown";
  }

  if (service === "backend") {
    return "lemon-alerts/sfj-backend-python";
  }

  if (service === "sfj-api") {
    return "lemon-alerts/sfjapi";
  }

  if (service.startsWith("serverless-")) {
    return `aws/lambda/${normalizeAssetName(asset?.name)}`;
  }

  if (service.startsWith("spx-")) {
    return `aws/${service}`;
  }

  return "unknown";
}

function normalizeAssetName(value = "") {
  return String(value)
    .split(": i-")[0]
    .split(" (")[0]
    .trim()
    .toLowerCase();
}
