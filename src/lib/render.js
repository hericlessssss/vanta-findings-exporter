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
    "## By Owner",
    renderCounts(summary.byOwner),
    "",
    "## By Service",
    renderCounts(summary.byService),
    "",
    "## By Repository",
    renderCounts(summary.byRepository),
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
    "owner",
    "service",
    "repository",
    "awsAccountId",
    "awsRegion",
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
        byOwner: countObjectToRows(summary.byOwner),
        byService: countObjectToRows(summary.byService),
        byRepository: countObjectToRows(summary.byRepository),
      },
      findings,
    },
    null,
    2,
  );
}

export function renderJiraTasks(findings, options = {}) {
  if (findings.length === 0) {
    return "No findings matched the selected filters.";
  }

  const grouping = getGrouping(options.groupBy);
  const groupedFindings = groupBy(findings, grouping.field);

  return Object.entries(groupedFindings)
    .sort(grouping.sort)
    .map(([groupName, groupFindings]) => renderJiraTaskBlock(grouping, groupName, groupFindings))
    .join("\n\n---\n\n");
}

export function renderOperationalTasks(findings, options = {}) {
  if (findings.length === 0) {
    return "No findings matched the selected filters.";
  }

  const grouping = getGrouping(options.groupBy);
  const groupedFindings = groupBy(findings, grouping.field);

  return Object.entries(groupedFindings)
    .sort(grouping.sort)
    .map(([groupName, groupFindings]) => {
      const packages = unique(groupFindings.map((finding) => finding.packageIdentifier));
      const assets = unique(groupFindings.map((finding) => finding.assetName));
      const environments = unique(groupFindings.map((finding) => finding.environment));
      const severities = unique(groupFindings.map((finding) => finding.severity));
      const owners = unique(groupFindings.map((finding) => finding.owner));
      const services = unique(groupFindings.map((finding) => finding.service));
      const repositories = unique(groupFindings.map((finding) => finding.repository));
      const awsAccounts = unique(groupFindings.map((finding) => finding.awsAccountId).filter(Boolean));
      const awsRegions = unique(groupFindings.map((finding) => finding.awsRegion).filter(Boolean));

      return [
        buildOperationalTitle(grouping, groupName),
        "",
        `:progress_bar: Analyze ${groupFindings.length} Vanta findings, group impacted assets by severity/package, define remediation actions, validate fixed versions, and document evidence for operational follow-up.`,
        "",
        `Group: ${grouping.label} ${groupName}`,
        `Severities: ${severities.join(", ")}`,
        `Environments: ${environments.join(", ")}`,
        `Packages: ${packages.join(", ")}`,
        `Assets: ${assets.join(", ")}`,
        `Owners: ${owners.join(", ")}`,
        `Services: ${services.join(", ")}`,
        `Repositories: ${repositories.join(", ")}`,
        `AWS accounts: ${awsAccounts.length > 0 ? awsAccounts.join(", ") : "not provided"}`,
        `AWS regions: ${awsRegions.length > 0 ? awsRegions.join(", ") : "not provided"}`,
        "",
        "Findings:",
        ...groupFindings.map(renderTaskFinding),
      ].join("\n");
    })
    .join("\n\n");
}

function renderJiraTaskBlock(grouping, groupName, findings) {
  const packages = unique(findings.map((finding) => finding.packageIdentifier));
  const assets = unique(findings.map((finding) => finding.assetName));
  const environments = unique(findings.map((finding) => finding.environment));
  const severities = unique(findings.map((finding) => finding.severity));
  const owners = unique(findings.map((finding) => finding.owner));
  const services = unique(findings.map((finding) => finding.service));
  const repositories = unique(findings.map((finding) => finding.repository));
  const awsAccounts = unique(findings.map((finding) => finding.awsAccountId).filter(Boolean));
  const awsRegions = unique(findings.map((finding) => finding.awsRegion).filter(Boolean));

  return [
    `Title: ${buildJiraTitle(grouping, groupName)}`,
    "",
    "Description:",
    "",
    `Analyze and remediate ${findings.length} Vanta ${findings.length === 1 ? "finding" : "findings"} grouped by ${grouping.name}.`,
    "",
    `Group: ${grouping.label} ${groupName}`,
    `Severities: ${severities.join(", ")}`,
    `Environments: ${environments.join(", ")}`,
    `Packages: ${packages.join(", ")}`,
    `Assets: ${assets.join(", ")}`,
    `Owners: ${owners.join(", ")}`,
    `Services: ${services.join(", ")}`,
    `Repositories: ${repositories.join(", ")}`,
    `AWS accounts: ${awsAccounts.length > 0 ? awsAccounts.join(", ") : "not provided"}`,
    `AWS regions: ${awsRegions.length > 0 ? awsRegions.join(", ") : "not provided"}`,
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
    `  - Severity: ${finding.severity}`,
    `  - Environment: ${finding.environment}`,
    `  - Owner: ${finding.owner}`,
    `  - Service: ${finding.service}`,
    `  - Repository: ${finding.repository}`,
    `  - AWS account: ${finding.awsAccountId ?? "not provided"}`,
    `  - AWS region: ${finding.awsRegion ?? "not provided"}`,
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
    `  - Owner: ${finding.owner}`,
    `  - Service: ${finding.service}`,
    `  - Repository: ${finding.repository}`,
    `  - Fixed version: ${finding.fixedVersion ?? "not provided"}`,
    `  - Due date: ${finding.remediateByDate ?? "not provided"}`,
  ].join("\n");
}

function renderTaskFinding(finding) {
  return [
    `- ${finding.title}`,
    `  - Severity: ${finding.severity}`,
    `  - Environment: ${finding.environment}`,
    `  - Asset: ${finding.assetName}`,
    `  - Owner: ${finding.owner}`,
    `  - Service: ${finding.service}`,
    `  - Repository: ${finding.repository}`,
    `  - AWS account: ${finding.awsAccountId ?? "not provided"}`,
    `  - AWS region: ${finding.awsRegion ?? "not provided"}`,
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

function getGrouping(groupBy = "severity") {
  const groupings = {
    severity: {
      name: "severity",
      label: "Severity",
      field: "severity",
      sort: ([left], [right]) => severityRank(right) - severityRank(left),
    },
    package: {
      name: "package",
      label: "Package",
      field: "packageIdentifier",
      sort: sortByGroupName,
    },
    asset: {
      name: "asset",
      label: "Asset",
      field: "assetName",
      sort: sortByGroupName,
    },
    environment: {
      name: "environment",
      label: "Environment",
      field: "environment",
      sort: sortByGroupName,
    },
    owner: {
      name: "owner",
      label: "Owner",
      field: "owner",
      sort: sortByGroupName,
    },
    service: {
      name: "service",
      label: "Service",
      field: "service",
      sort: sortByGroupName,
    },
    repository: {
      name: "repository",
      label: "Repository",
      field: "repository",
      sort: sortByGroupName,
    },
  };

  const grouping = groupings[groupBy];

  if (!grouping) {
    throw new Error("Unsupported group-by value. Expected severity, package, asset, environment, owner, service, or repository.");
  }

  return grouping;
}

function buildOperationalTitle(grouping, groupName) {
  if (grouping.name === "severity") {
    return `[DevOps | Vanta | Security] Review and remediate ${groupName.toLowerCase()} severity findings`;
  }

  return `[DevOps | Vanta | Security] Review and remediate Vanta findings for ${grouping.name} ${groupName}`;
}

function buildJiraTitle(grouping, groupName) {
  if (grouping.name === "severity") {
    return `[DevOps | Vanta | Security] Remediate ${groupName.toLowerCase()} severity Vanta findings`;
  }

  return `[DevOps | Vanta | Security] Remediate Vanta findings for ${grouping.name} ${groupName}`;
}

function sortByGroupName([left], [right]) {
  return left.localeCompare(right);
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
