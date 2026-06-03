import { flattenVantaData } from "./vanta-response.js";
import { resolveEnvironment } from "./environment-map.js";

export function normalizeFindings(vulnerabilityResponse, assetResponse, options = {}) {
  const vulnerabilities = flattenVantaData(vulnerabilityResponse);
  const assets = flattenVantaData(assetResponse);
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const environmentMap = options.environmentMap ?? {};

  return vulnerabilities.map((vulnerability) => {
    const asset = assetsById.get(vulnerability.targetId);

    return {
      id: vulnerability.id,
      title: vulnerability.name,
      description: vulnerability.description ?? "",
      severity: normalizeSeverity(vulnerability.severity),
      cvssSeverityScore: vulnerability.cvssSeverityScore ?? null,
      scannerScore: vulnerability.scannerScore ?? null,
      packageIdentifier: vulnerability.packageIdentifier ?? "unknown",
      vulnerabilityType: vulnerability.vulnerabilityType ?? "unknown",
      isFixable: Boolean(vulnerability.isFixable),
      fixedVersion: vulnerability.fixedVersion ?? null,
      remediateByDate: vulnerability.remediateByDate ?? null,
      firstDetectedDate: vulnerability.firstDetectedDate ?? null,
      sourceDetectedDate: vulnerability.sourceDetectedDate ?? null,
      lastDetectedDate: vulnerability.lastDetectedDate ?? null,
      relatedVulns: vulnerability.relatedVulns ?? [],
      relatedUrls: vulnerability.relatedUrls ?? [],
      externalURL: vulnerability.externalURL ?? null,
      scanSource: vulnerability.scanSource ?? null,
      assetId: vulnerability.targetId ?? null,
      assetName: asset?.name ?? "Unknown asset",
      assetType: asset?.assetType ?? "unknown",
      environment: resolveEnvironment(asset, environmentMap),
    };
  });
}

function normalizeSeverity(severity) {
  if (!severity) {
    return "UNKNOWN";
  }

  return String(severity).toUpperCase();
}
