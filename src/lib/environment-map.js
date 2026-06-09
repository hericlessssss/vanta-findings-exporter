export function resolveEnvironment(asset, environmentMap = {}) {
  return resolveAssetMetadata(asset, environmentMap).environment;
}

export function resolveAssetMetadata(asset, environmentMap = {}) {
  const mapped = findMappedMetadata(asset, environmentMap);

  return {
    environment: mapped.environment ?? inferEnvironment(asset),
    owner: mapped.owner ?? "unknown",
    service: mapped.service ?? "unknown",
    repository: mapped.repository ?? "unknown",
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
    return { environment: entry };
  }

  if (!entry || typeof entry !== "object") {
    return {};
  }

  return entry;
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
