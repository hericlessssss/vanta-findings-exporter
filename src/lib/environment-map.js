export function resolveEnvironment(asset, environmentMap = {}) {
  const mapped = findMappedEnvironment(asset, environmentMap);

  if (mapped) {
    return mapped;
  }

  return inferEnvironment(asset);
}

function findMappedEnvironment(asset, environmentMap) {
  if (!asset) {
    return null;
  }

  const assetId = asset.id;
  const assetName = asset.name;

  if (assetId && environmentMap.assetIds?.[assetId]) {
    return environmentMap.assetIds[assetId];
  }

  if (assetName && environmentMap.assetNames?.[assetName]) {
    return environmentMap.assetNames[assetName];
  }

  if (assetName && environmentMap.assetNamePrefixes) {
    const matchedPrefix = Object.keys(environmentMap.assetNamePrefixes)
      .sort((left, right) => right.length - left.length)
      .find((prefix) => assetName.startsWith(prefix));

    if (matchedPrefix) {
      return environmentMap.assetNamePrefixes[matchedPrefix];
    }
  }

  return null;
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

