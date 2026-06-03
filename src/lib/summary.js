export function buildSummary(findings) {
  return {
    totalFindings: findings.length,
    fixableFindings: findings.filter((finding) => finding.isFixable).length,
    bySeverity: countBy(findings, "severity"),
    byPackage: countBy(findings, "packageIdentifier"),
    byAsset: countBy(findings, "assetName"),
    findings,
  };
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

