export function renderMarkdownSummary(summary) {
  return [
    "# Vanta Findings Summary",
    "",
    `Total findings: ${summary.totalFindings}`,
    `Fixable findings: ${summary.fixableFindings}`,
    "",
    "## By Severity",
    renderCounts(summary.bySeverity),
    "",
    "## By Package",
    renderCounts(summary.byPackage),
    "",
    "## By Asset",
    renderCounts(summary.byAsset),
    "",
    "## Findings",
    renderFindings(summary.findings),
  ].join("\n");
}

export function renderCsv(findings) {
  const columns = [
    "severity",
    "title",
    "packageIdentifier",
    "assetName",
    "environment",
    "isFixable",
    "fixedVersion",
    "remediateByDate",
    "relatedVulns",
    "externalURL",
  ];

  return [
    columns.join(","),
    ...findings.map((finding) =>
      columns
        .map((column) => {
          const value = normalizeCsvValue(finding[column]);
          return escapeCsvValue(value);
        })
        .join(","),
    ),
  ].join("\n");
}

export function renderJson(findings, summary) {
  return JSON.stringify(
    {
      summary: {
        totalFindings: summary.totalFindings,
        fixableFindings: summary.fixableFindings,
        bySeverity: countObjectToRows(summary.bySeverity),
        byPackage: countObjectToRows(summary.byPackage),
        byAsset: countObjectToRows(summary.byAsset),
      },
      findings,
    },
    null,
    2,
  );
}

export function renderJiraTasks(findings) {
  if (findings.length === 0) {
    return "No findings matched the selected filters.";
  }

  const bySeverity = groupBy(findings, "severity");

  return Object.entries(bySeverity)
    .sort(([left], [right]) => severityRank(right) - severityRank(left))
    .map(([severity, severityFindings]) => renderJiraTaskBlock(severity, severityFindings))
    .join("\n\n---\n\n");
}

export function renderOperationalTasks(findings) {
  if (findings.length === 0) {
    return "No findings matched the selected filters.";
  }

  const bySeverity = groupBy(findings, "severity");

  return Object.entries(bySeverity)
    .sort(([left], [right]) => severityRank(right) - severityRank(left))
    .map(([severity, severityFindings]) => {
      const packages = unique(severityFindings.map((finding) => finding.packageIdentifier));
      const assets = unique(severityFindings.map((finding) => finding.assetName));
      const environments = unique(severityFindings.map((finding) => finding.environment));

      return [
        `[DevOps | Vanta | Security] Review and remediate ${severity.toLowerCase()} severity findings`,
        "",
        `:progress_bar: Analyze ${severityFindings.length} Vanta findings, group impacted assets by severity/package, define remediation actions, validate fixed versions, and document evidence for operational follow-up.`,
        "",
        `Environments: ${environments.join(", ")}`,
        `Packages: ${packages.join(", ")}`,
        `Assets: ${assets.join(", ")}`,
        "",
        "Findings:",
        ...severityFindings.map(renderTaskFinding),
      ].join("\n");
    })
    .join("\n\n");
}

function renderJiraTaskBlock(severity, findings) {
  const packages = unique(findings.map((finding) => finding.packageIdentifier));
  const assets = unique(findings.map((finding) => finding.assetName));
  const environments = unique(findings.map((finding) => finding.environment));

  return [
    `Title: [DevOps | Vanta | Security] Remediate ${severity.toLowerCase()} severity Vanta findings`,
    "",
    "Description:",
    "",
    `Analyze and remediate ${findings.length} ${severity.toLowerCase()} severity Vanta ${findings.length === 1 ? "finding" : "findings"}.`,
    "",
    `Environments: ${environments.join(", ")}`,
    `Packages: ${packages.join(", ")}`,
    `Assets: ${assets.join(", ")}`,
    "",
    "Findings:",
    ...findings.map(renderJiraFinding),
    "",
    "Acceptance Criteria:",
    "- Impacted assets are identified.",
    "- Fixed versions are validated where available.",
    "- Remediation is applied or an exception is documented.",
    "- Evidence is attached or linked for follow-up.",
  ].join("\n");
}

function renderJiraFinding(finding) {
  return [
    `- ${finding.title}`,
    `  - Environment: ${finding.environment}`,
    `  - Asset: ${finding.assetName}`,
    `  - Package: ${finding.packageIdentifier}`,
    `  - Fixed version: ${finding.fixedVersion ?? "not provided"}`,
    `  - Due date: ${finding.remediateByDate ?? "not provided"}`,
    `  - External link: ${finding.externalURL ?? "not provided"}`,
  ].join("\n");
}

function countObjectToRows(counts) {
  return Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => ({ name, count }));
}

function normalizeCsvValue(value) {
  if (Array.isArray(value)) {
    return value.join(";");
  }

  if (value === null || value === undefined) {
    return "";
  }

  return String(value);
}

function escapeCsvValue(value) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function renderCounts(counts) {
  const entries = Object.entries(counts);

  if (entries.length === 0) {
    return "- None";
  }

  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, count]) => `- ${name}: ${count}`)
    .join("\n");
}

function renderFinding(finding) {
  return [
    `- ${finding.title}`,
    `  - Severity: ${finding.severity}`,
    `  - Package: ${finding.packageIdentifier}`,
    `  - Asset: ${finding.assetName}`,
    `  - Fixed version: ${finding.fixedVersion ?? "not provided"}`,
    `  - Due date: ${finding.remediateByDate ?? "not provided"}`,
  ].join("\n");
}

function renderTaskFinding(finding) {
  return [
    `- ${finding.title}`,
    `  - Environment: ${finding.environment}`,
    `  - Asset: ${finding.assetName}`,
    `  - Package: ${finding.packageIdentifier}`,
    `  - Fixed version: ${finding.fixedVersion ?? "not provided"}`,
    `  - Due date: ${finding.remediateByDate ?? "not provided"}`,
    `  - External link: ${finding.externalURL ?? "not provided"}`,
  ].join("\n");
}

function renderFindings(findings) {
  if (findings.length === 0) {
    return "- None";
  }

  return findings.map(renderFinding).join("\n");
}

function groupBy(items, key) {
  return items.reduce((groups, item) => {
    const value = item[key] ?? "unknown";
    groups[value] ??= [];
    groups[value].push(item);
    return groups;
  }, {});
}

function unique(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function severityRank(severity) {
  const ranks = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
    UNKNOWN: 0,
  };

  return ranks[severity] ?? 0;
}
