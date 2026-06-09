import { flattenVantaData } from "./vanta-response.js";

export function normalizeTests(testResponse, entityResponsesByTestId = {}) {
  const tests = flattenVantaData(testResponse);

  return tests.map((test) => {
    const entities = flattenVantaData(entityResponsesByTestId[test.id] ?? { results: [] });

    return {
      id: test.id,
      name: test.name ?? test.displayName ?? test.title ?? test.id,
      description: test.description ?? "",
      status: normalizeStatus(test.status ?? test.testStatus),
      dueDate: normalizeDate(test.dueDate ?? test.remediateByDate ?? test.slaDeadline ?? test.deadline),
      category: test.category ?? test.testCategory ?? "unknown",
      integration: test.integration ?? test.integrationName ?? "unknown",
      owner: normalizeOwner(test.owner),
      frameworks: normalizeList(test.frameworks ?? test.frameworkIds),
      controls: normalizeList(test.controls ?? test.controlIds),
      remediation: test.remediation ?? test.remediationInstructions ?? "",
      failingEntities: entities.map(normalizeTestEntity),
    };
  });
}

function normalizeTestEntity(entity) {
  return {
    id: entity.id,
    name: entity.name ?? entity.displayName ?? entity.resourceName ?? entity.id,
    status: normalizeStatus(entity.status ?? entity.entityStatus),
    type: entity.type ?? entity.resourceType ?? entity.entityType ?? entity.responseType ?? "unknown",
    dueDate: normalizeDate(entity.dueDate ?? entity.remediateByDate ?? entity.slaDeadline ?? entity.deadline),
    integration: entity.integration ?? entity.integrationName ?? "unknown",
    resourceId: entity.resourceId ?? entity.externalId ?? null,
    accountId: entity.accountId ?? entity.awsAccountId ?? null,
    region: entity.region ?? entity.awsRegion ?? null,
  };
}

function normalizeDate(value) {
  return value ?? null;
}

function normalizeStatus(status) {
  return String(status ?? "unknown").toUpperCase();
}

function normalizeOwner(owner) {
  if (!owner) return "unknown";
  if (typeof owner === "string") return owner;
  return owner.email ?? owner.name ?? owner.id ?? "unknown";
}

function normalizeList(value) {
  if (!value) return [];
  if (!Array.isArray(value)) return [String(value)];
  return value.map((item) => {
    if (typeof item === "string") return item;
    return item.id ?? item.name ?? item.displayName ?? String(item);
  });
}
