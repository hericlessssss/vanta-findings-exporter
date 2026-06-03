export function filterFindings(findings, filters = {}) {
  const dueBefore = filters.dueBefore ? parseDateFilter(filters.dueBefore, "due-before") : null;
  const referenceDate = startOfUtcDay(filters.referenceDate ? new Date(filters.referenceDate) : new Date());
  const dueSoonWindow = filters.dueSoon ? parsePositiveInteger(filters.dueSoon, "due-soon") : null;

  return findings.filter((finding) => {
    if (filters.severity && finding.severity !== normalizeSeverity(filters.severity)) {
      return false;
    }

    if (filters.fixableOnly && !finding.isFixable) {
      return false;
    }

    if (filters.package && !matchesCaseInsensitive(finding.packageIdentifier, filters.package)) {
      return false;
    }

    if (filters.environment && !matchesCaseInsensitive(finding.environment, filters.environment)) {
      return false;
    }

    if (filters.asset && !matchesCaseInsensitive(finding.assetName, filters.asset)) {
      return false;
    }

    if (dueBefore && !isDueBefore(finding.remediateByDate, dueBefore)) {
      return false;
    }

    if (filters.overdue && !isOverdue(finding.remediateByDate, referenceDate)) {
      return false;
    }

    if (dueSoonWindow && !isDueSoon(finding.remediateByDate, referenceDate, dueSoonWindow)) {
      return false;
    }

    return true;
  });
}

function normalizeSeverity(severity) {
  return String(severity).toUpperCase();
}

function matchesCaseInsensitive(value, expected) {
  return String(value ?? "").toLowerCase() === String(expected).toLowerCase();
}

function parseDateFilter(value, name) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new Error(`Invalid --${name} value. Expected YYYY-MM-DD.`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid --${name} value. Expected YYYY-MM-DD.`);
  }

  return date;
}

function parsePositiveInteger(value, name) {
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`Invalid --${name} value. Expected a positive number of days.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid --${name} value. Expected a positive number of days.`);
  }

  return parsed;
}

function isDueBefore(value, dueBefore) {
  if (!value) {
    return false;
  }

  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  return dueDate < dueBefore;
}

function isOverdue(value, referenceDate) {
  if (!value) {
    return false;
  }

  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  return dueDate < referenceDate;
}

function isDueSoon(value, referenceDate, days) {
  if (!value) {
    return false;
  }

  const dueDate = new Date(value);

  if (Number.isNaN(dueDate.getTime())) {
    return false;
  }

  const dueSoonEnd = addUtcDays(referenceDate, days);

  return dueDate >= referenceDate && dueDate < dueSoonEnd;
}

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date, days) {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
