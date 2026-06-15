const state = {
  findings: [],
  summary: null,
  selectedFindingId: null,
  selectedEnvironment: "",
  findingsNeedsFetch: false,
  activity: [],
  filters: {
    environment: "",
    severity: "",
    service: "",
    search: "",
    fixableOnly: false,
  },
};

const elements = {
  statusGrid: document.querySelector("#statusGrid"),
  reloadButton: document.querySelector("#reloadButton"),
  testConnectionButton: document.querySelector("#testConnectionButton"),
  fetchButton: document.querySelector("#fetchButton"),
  fetchTestsButton: document.querySelector("#fetchTestsButton"),
  generateMapButton: document.querySelector("#generateMapButton"),
  exportCsvButton: document.querySelector("#exportCsvButton"),
  generateTasksButton: document.querySelector("#generateTasksButton"),
  copyEnvironmentButton: document.querySelector("#copyEnvironmentButton"),
  copyFindingButton: document.querySelector("#copyFindingButton"),
  clearFiltersButton: document.querySelector("#clearFiltersButton"),
  clearActivityButton: document.querySelector("#clearActivityButton"),
  environmentFilter: document.querySelector("#environmentFilter"),
  severityFilter: document.querySelector("#severityFilter"),
  serviceFilter: document.querySelector("#serviceFilter"),
  searchInput: document.querySelector("#searchInput"),
  fixableOnlyFilter: document.querySelector("#fixableOnlyFilter"),
  totalFindings: document.querySelector("#totalFindings"),
  activeCount: document.querySelector("#activeCount"),
  findingsHeading: document.querySelector("#findingsHeading"),
  findingsList: document.querySelector("#findingsList"),
  findingDetails: document.querySelector("#findingDetails"),
  environmentList: document.querySelector("#environmentList"),
  severityChart: document.querySelector("#severityChart"),
  environmentChart: document.querySelector("#environmentChart"),
  serviceChart: document.querySelector("#serviceChart"),
  severitySparkline: document.querySelector("#severitySparkline"),
  toast: document.querySelector("#toast"),
  activityLog: document.querySelector("#activityLog"),
  testsCount: document.querySelector("#testsCount"),
  testsList: document.querySelector("#testsList"),
};

await initialize();

async function initialize() {
  bindEvents();
  renderActivity();
  await refreshStatus();
  await loadFindings();
  await loadTests();
}

function bindEvents() {
  elements.reloadButton.addEventListener("click", loadFindings);
  elements.testConnectionButton.addEventListener("click", () => runAction("Testing Vanta connection", "/api/test-connection"));
  elements.fetchButton.addEventListener("click", async () => {
    await runAction("Fetching latest findings", "/api/fetch");
    await loadFindings();
  });
  elements.fetchTestsButton.addEventListener("click", async () => {
    await runAction("Fetching failing tests", "/api/fetch-tests");
    await loadTests();
  });
  elements.generateMapButton.addEventListener("click", () => runAction("Generating asset map skeleton", "/api/generate-map-skeleton"));
  elements.exportCsvButton.addEventListener("click", () => exportOutput("csv", "service"));
  elements.generateTasksButton.addEventListener("click", () => exportOutput("jira", "service"));
  elements.copyFindingButton.addEventListener("click", copySelectedFinding);
  elements.copyEnvironmentButton.addEventListener("click", copyEnvironmentPack);
  elements.clearFiltersButton.addEventListener("click", clearFilters);
  elements.clearActivityButton.addEventListener("click", clearActivity);
  elements.environmentFilter.addEventListener("change", (event) => updateFilter("environment", event.target.value));
  elements.severityFilter.addEventListener("change", (event) => updateFilter("severity", event.target.value));
  elements.serviceFilter.addEventListener("change", (event) => updateFilter("service", event.target.value));
  elements.searchInput.addEventListener("input", (event) => updateFilter("search", event.target.value));
  elements.fixableOnlyFilter.addEventListener("change", (event) => updateFilter("fixableOnly", event.target.checked));
}

async function refreshStatus() {
  const status = await getJson("/api/status");
  const cards = [
    ["Vanta credentials", status.env],
    ["Vulnerability export", status.vulnerabilities],
    ["Asset export", status.assets],
    ["Tests export", status.tests],
    ["Test entities", status.testEntities],
    ["Asset map", status.assetMap],
  ];

  elements.statusGrid.innerHTML = cards.map(([label, item]) => renderStatusCard(label, item)).join("");
}

async function loadFindings() {
  try {
    const data = await getJson("/api/findings");
    state.findings = data.findings;
    state.summary = data.summary;
    state.findingsNeedsFetch = Boolean(data.needsFetch);
    state.selectedFindingId ??= state.findings[0]?.id ?? null;
    hydrateFilters();
    render();
    await refreshStatus();
    addActivity(data.needsFetch ? "running" : "success", data.message ?? `Loaded ${state.findings.length} findings from local exports.`);
  } catch (error) {
    addActivity("error", error.message);
  }
}

async function loadTests() {
  try {
    const data = await getJson("/api/tests");
    renderTests(data.tests, data.summary);
    if (data.needsFetch) {
      addActivity("running", data.message);
    }
  } catch {
    renderTests([], { totalTests: 0, failingEntities: 0 });
  }
}

function hydrateFilters() {
  hydrateSelect(elements.environmentFilter, ["", ...unique(state.findings.map((finding) => finding.environment))], "All environments");
  hydrateSelect(elements.severityFilter, ["", ...unique(state.findings.map((finding) => finding.severity))], "All severities");
  hydrateSelect(elements.serviceFilter, ["", ...unique(state.findings.map((finding) => finding.service))], "All services");
}

function render() {
  const findings = getVisibleFindings();
  const selected = findings.find((finding) => finding.id === state.selectedFindingId) ?? findings[0] ?? null;
  state.selectedFindingId = selected?.id ?? null;

  elements.totalFindings.textContent = findings.length;
  elements.activeCount.textContent = `${findings.length} active`;
  elements.findingsHeading.textContent = state.filters.environment || "All environments";

  renderCharts(findings);
  renderEnvironmentList();
  renderFindingsList(findings);
  renderFindingDetails(selected);
}

function renderCharts(findings) {
  renderBarChart(elements.severityChart, countBy(findings, "severity"), severityColor);
  renderDonut(elements.environmentChart, countBy(findings, "environment"));
  renderCompactBars(elements.serviceChart, countBy(findings, "service"));
  renderSparkline(elements.severitySparkline, countBy(findings, "severity"));
}

function renderEnvironmentList() {
  const counts = countBy(state.findings, "environment");
  elements.environmentList.innerHTML = Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([environment, count]) => `
      <button class="env-button ${state.filters.environment === environment ? "active" : ""}" data-environment="${escapeHtml(environment)}" type="button">
        <strong>${escapeHtml(environment)}</strong>
        <span>${count}</span>
      </button>
    `)
    .join("");

  elements.environmentList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      const environment = button.dataset.environment;
      updateFilter("environment", state.filters.environment === environment ? "" : environment);
      elements.environmentFilter.value = state.filters.environment;
    });
  });
}

function renderFindingsList(findings) {
  if (findings.length === 0) {
    elements.findingsList.innerHTML = `<div class="empty-state">${state.findingsNeedsFetch ? "Click 02 Fetch latest findings to load Vanta vulnerability data." : "No findings match the selected filters."}</div>`;
    return;
  }

  elements.findingsList.innerHTML = findings.map((finding) => `
    <button class="finding-row ${finding.id === state.selectedFindingId ? "active" : ""}" data-id="${escapeHtml(finding.id)}" type="button">
      <span class="severity-pill severity-${escapeHtml(finding.severity)}">${escapeHtml(finding.severity)}</span>
      <span>
        <strong class="finding-title">${escapeHtml(finding.title)}</strong>
        <span class="finding-meta">${escapeHtml(finding.environment)} / ${escapeHtml(finding.service)} / ${escapeHtml(finding.packageIdentifier)}</span>
      </span>
      <span class="finding-badges">
        <span class="due-pill">Due ${escapeHtml(formatDueDate(finding.remediateByDate))}</span>
        <span class="count-pill">${finding.fixedVersion ? "fix available" : "review"}</span>
      </span>
    </button>
  `).join("");

  elements.findingsList.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedFindingId = button.dataset.id;
      render();
    });
  });
}

function renderFindingDetails(finding) {
  if (!finding) {
    elements.findingDetails.className = "finding-details empty-state";
    elements.findingDetails.textContent = "Select a finding to inspect the remediation context.";
    return;
  }

  elements.findingDetails.className = "finding-details";
  elements.findingDetails.innerHTML = `
    <div class="detail-block">
      <h3>${escapeHtml(finding.title)}</h3>
      <p>${escapeHtml(finding.description || "No description provided.")}</p>
    </div>
    <div class="detail-block">
      <h3>Operational context</h3>
      <p>${escapeHtml(buildFindingContext(finding))}</p>
    </div>
    <div class="detail-block">
      <h3>Copy block</h3>
      <p class="copy-context">${escapeHtml(buildCopyBlock(finding))}</p>
    </div>
  `;
}

function renderTests(tests, summary = {}) {
  elements.testsCount.textContent = `${summary.totalTests ?? tests.length} tests`;

  if (tests.length === 0) {
    elements.testsList.innerHTML = `<div class="empty-state">Fetch Vanta tests to list controls and entities that need remediation.</div>`;
    return;
  }

  elements.testsList.innerHTML = tests.map((test) => `
    <article class="test-card">
      <div>
        <span class="status-pill">${escapeHtml(test.status)}</span>
        <h3>${escapeHtml(test.name)}</h3>
        <p>${escapeHtml(test.description || "No description provided.")}</p>
      </div>
      <div class="test-meta">
        <span>Category: ${escapeHtml(test.category)}</span>
        <span>Integration: ${escapeHtml(test.integration)}</span>
        <span>Owner: ${escapeHtml(test.owner)}</span>
        <span>Due date: ${escapeHtml(formatDueDate(test.dueDate))}</span>
        <span>Failing entities: ${test.failingEntities.length}</span>
      </div>
      <pre>${escapeHtml(buildTestCopyBlock(test))}</pre>
    </article>
  `).join("");
}

function updateFilter(name, value) {
  state.filters[name] = value;
  if (name === "environment") {
    elements.environmentFilter.value = value;
  }
  render();
}

function clearFilters() {
  state.filters = {
    environment: "",
    severity: "",
    service: "",
    search: "",
    fixableOnly: false,
  };
  elements.environmentFilter.value = "";
  elements.severityFilter.value = "";
  elements.serviceFilter.value = "";
  elements.searchInput.value = "";
  elements.fixableOnlyFilter.checked = false;
  render();
}

function getVisibleFindings() {
  const search = state.filters.search.toLowerCase().trim();

  return state.findings.filter((finding) => {
    if (state.filters.environment && finding.environment !== state.filters.environment) return false;
    if (state.filters.severity && finding.severity !== state.filters.severity) return false;
    if (state.filters.service && finding.service !== state.filters.service) return false;
    if (state.filters.fixableOnly && !finding.isFixable) return false;
    if (search && ![
      finding.title,
      finding.packageIdentifier,
      finding.assetName,
      finding.service,
      finding.repository,
      finding.environment,
      finding.remediateByDate,
    ].join(" ").toLowerCase().includes(search)) return false;
    return true;
  });
}

async function runAction(label, path) {
  addActivity("running", label);
  try {
    await postJson(path, {});
    await refreshStatus();
    addActivity("success", `${label}: done`);
  } catch (error) {
    addActivity("error", error.message);
  }
}

async function exportOutput(format, groupBy) {
  const filters = {
    environment: state.filters.environment,
    severity: state.filters.severity,
    service: state.filters.service,
    fixableOnly: state.filters.fixableOnly,
  };
  const result = await postJson("/api/export", { format, groupBy, filters });
  addActivity("success", `Saved ${format.toUpperCase()} export grouped by ${groupBy}: ${result.path}`);
}

async function copySelectedFinding() {
  const finding = state.findings.find((item) => item.id === state.selectedFindingId);
  if (!finding) return;
  await navigator.clipboard.writeText(buildCopyBlock(finding));
  addActivity("success", `Copied finding context: ${finding.title}`);
}

async function copyEnvironmentPack() {
  const findings = getVisibleFindings();
  const environment = state.filters.environment || "all environments";
  const pack = [
    `[DevOps | Vanta | Security] Findings for ${environment}`,
    "",
    ...findings.map(buildCopyBlock),
  ].join("\n\n---\n\n");

  await navigator.clipboard.writeText(pack);
  addActivity("success", `Copied ${findings.length} findings for ${environment}.`);
}

function addActivity(status, message) {
  state.activity = [
    {
      status,
      message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    },
    ...state.activity,
  ].slice(0, 8);

  renderActivity();
  showToast(message);
}

function renderActivity() {
  if (state.activity.length === 0) {
    elements.activityLog.innerHTML = `<div class="activity-empty">No workflow actions yet.</div>`;
    return;
  }

  elements.activityLog.innerHTML = state.activity.map((item) => `
    <div class="activity-item ${escapeHtml(item.status)}">
      <span>${escapeHtml(item.time)}</span>
      <strong>${escapeHtml(item.status)}</strong>
      <p>${escapeHtml(item.message)}</p>
    </div>
  `).join("");
}

function clearActivity() {
  state.activity = [];
  renderActivity();
}

function buildFindingContext(finding) {
  return [
    `Severity: ${finding.severity}`,
    `Environment: ${finding.environment}`,
    `Service: ${finding.service}`,
    `Repository: ${finding.repository}`,
    `Asset: ${finding.assetName}`,
    `Package: ${finding.packageIdentifier}`,
    `Fixed version: ${finding.fixedVersion ?? "not provided"}`,
    `Due date: ${formatDueDate(finding.remediateByDate)}`,
    `AWS account: ${finding.awsAccountId ?? "not provided"}`,
    `AWS region: ${finding.awsRegion ?? "not provided"}`,
  ].join("\n");
}

function buildCopyBlock(finding) {
  return [
    `[DevOps | Vanta | Security] Remediate ${finding.title}`,
    "",
    "Context:",
    buildFindingContext(finding),
    "",
    "Description:",
    finding.description || "No description provided.",
    "",
    "Expected action:",
    "Analyze the affected repository/service, update the vulnerable package to the fixed version when available, validate the build, and document evidence for the Vanta remediation workflow.",
  ].join("\n");
}

function buildTestCopyBlock(test) {
  return [
    `[DevOps | Vanta | Compliance] Remediate failing test: ${test.name}`,
    "",
    "Context:",
    `Status: ${test.status}`,
    `Category: ${test.category}`,
    `Integration: ${test.integration}`,
    `Owner: ${test.owner}`,
    `Due date: ${formatDueDate(test.dueDate)}`,
    `Frameworks: ${test.frameworks.length > 0 ? test.frameworks.join(", ") : "not provided"}`,
    `Controls: ${test.controls.length > 0 ? test.controls.join(", ") : "not provided"}`,
    "",
    "Failing entities:",
    ...(test.failingEntities.length > 0
      ? test.failingEntities.map((entity) => `- ${entity.name} (${entity.type}) ${entity.region ?? ""}`.trim())
      : ["- none returned"]),
    "",
    "Expected action:",
    "Review the failing Vanta test, remediate the affected cloud/resource configuration, rerun validation, and document evidence for compliance follow-up.",
  ].join("\n");
}

function renderStatusCard(label, item) {
  return `
    <article class="status-card ${item.exists ? "ready" : "missing"}">
      <strong><span class="status-dot"></span>${escapeHtml(label)}</strong>
      <span>${item.exists ? `Ready / ${formatSize(item.size)}` : "Missing"}</span>
    </article>
  `;
}

function renderBarChart(target, counts, colorFn) {
  const entries = Object.entries(counts).sort(([, left], [, right]) => right - left);
  if (entries.length === 0) {
    target.innerHTML = `<div class="chart-empty">No data for the selected filters.</div>`;
    return;
  }

  const total = entries.reduce((sum, [, count]) => sum + count, 0);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  target.innerHTML = entries.map(([name, count]) => `
    <div class="bar-row" style="--bar-width:${Math.max(7, (count / max) * 100)}%; --bar-color:${colorFn(name)}">
      <span class="bar-label">
        <strong>${escapeHtml(formatChartLabel(name))}</strong>
        <small>${Math.round((count / total) * 100)}%</small>
      </span>
      <span class="bar-track"><span class="bar-fill"></span></span>
      <strong class="bar-value">${count}</strong>
    </div>
  `).join("");
}

function renderCompactBars(target, counts) {
  renderBarChart(target, Object.fromEntries(Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5)), serviceColor);
}

function renderSparkline(target, counts) {
  const entries = Object.entries(counts).sort(([, left], [, right]) => right - left);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  target.innerHTML = entries.map(([name, count]) => `
    <div class="sparkline-bar" style="height:${Math.max(14, (count / max) * 86)}px; --bar-color:${severityColor(name)}" title="${escapeHtml(formatChartLabel(name))}: ${count}">
      <span>${escapeHtml(String(count))}</span>
    </div>
  `).join("");
}

function renderDonut(target, counts) {
  const entries = Object.entries(counts).sort(([, left], [, right]) => right - left);
  if (entries.length === 0) {
    target.innerHTML = `<div class="chart-empty">No environments selected.</div>`;
    return;
  }

  const total = Math.max(1, entries.reduce((sum, [, count]) => sum + count, 0));
  const colors = ["#46d9ff", "#7dffb2", "#ffcf5a", "#ff7777", "#9b8cff", "#f28dff"];
  let cursor = 0;
  const stops = entries.map(([, count], index) => {
    const start = cursor;
    cursor += (count / total) * 360;
    return `${colors[index % colors.length]} ${start}deg ${cursor}deg`;
  }).join(", ");

  target.innerHTML = `
    <div class="donut" style="background: conic-gradient(${stops})">
      <div class="donut-total"><strong>${total}</strong><span>findings</span></div>
    </div>
    <div class="legend">
      ${entries.map(([name, count], index) => `
        <div class="legend-row">
          <span><i style="background:${colors[index % colors.length]}"></i>${escapeHtml(formatChartLabel(name))}</span>
          <strong>${count}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] ?? "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function hydrateSelect(select, values, emptyLabel) {
  const current = select.value;
  select.innerHTML = values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value || emptyLabel)}</option>`).join("");
  select.value = values.includes(current) ? current : "";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function severityColor(severity) {
  return {
    CRITICAL: "#c9a0ff",
    HIGH: "#ff5f6d",
    MEDIUM: "#ffbf3f",
    LOW: "#4ee69a",
  }[severity] ?? "#46d9ff";
}

function serviceColor(name) {
  if (name === "unknown") return "#9b8cff";
  return "#46d9ff";
}

function formatChartLabel(value) {
  if (!value || value === "unknown") return "Unmapped";
  return value;
}

function formatSize(size) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function formatDueDate(value) {
  if (!value) return "not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

async function getJson(path) {
  const response = await fetch(path);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

async function postJson(path, payload) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
