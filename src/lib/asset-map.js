import { flattenVantaData } from "./vanta-response.js";

export function buildAssetMapSkeleton(assetResponse) {
  const assets = flattenVantaData(assetResponse);
  const sortedAssets = [...assets].sort((left, right) =>
    String(left.name ?? left.id ?? "").localeCompare(String(right.name ?? right.id ?? "")),
  );

  return {
    assetIds: Object.fromEntries(
      sortedAssets
        .filter((asset) => asset.id)
        .map((asset) => [
          asset.id,
          {
            environment: inferEnvironment(asset),
            owner: "unknown",
            service: "unknown",
            repository: "unknown",
            awsAccountId: null,
            awsRegion: null,
          },
        ]),
    ),
  };
}

function inferEnvironment(asset) {
  const name = asset?.name?.toLowerCase() ?? "";

  if (name.includes("preproduction") || name.includes("staging")) {
    return "staging";
  }

  if (name.includes("production") || name.startsWith("prod-")) {
    return "production";
  }

  if (name.includes("development") || name.startsWith("dev-")) {
    return "development";
  }

  return "unknown";
}
