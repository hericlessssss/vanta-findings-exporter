# Vanta API Spike

## Status

Completed successfully on 2026-06-03.

## Purpose

Validate whether a read-only Vanta OAuth application can support the first version of Vanta Findings Exporter.

The spike focused on API feasibility, response shape, pagination, and relationships between vulnerabilities and vulnerable assets.

## OAuth

Validated endpoint:

```text
POST https://api.vanta.com/oauth/token
```

Validated setup:

- application type: Manage Vanta;
- access level: read access;
- grant type: `client_credentials`;
- scope: `vanta-api.all:read`;
- token type: `Bearer`;
- token expiration observed: 3599 seconds.

## Endpoints Tested

```text
GET https://api.vanta.com/v1/vulnerabilities?pageSize=1
GET https://api.vanta.com/v1/vulnerabilities?pageSize=3&isDeactivated=false
GET https://api.vanta.com/v1/vulnerabilities?pageSize=1&isFixAvailable=true&isDeactivated=false
GET https://api.vanta.com/v1/vulnerabilities?pageSize=1&includeVulnerabilitiesWithoutSlas=true&isDeactivated=false
GET https://api.vanta.com/v1/vulnerable-assets?pageSize=1
GET https://api.vanta.com/v1/vulnerable-assets/{vulnerableAssetId}
GET https://api.vanta.com/v1/vulnerabilities?pageSize=3&vulnerableAssetId={targetId}
```

## Validated Behavior

- OAuth authentication works.
- Vulnerabilities can be listed.
- Vulnerable assets can be listed.
- Vulnerable assets can be fetched by ID.
- `vulnerability.targetId` resolves to a vulnerable asset ID.
- Vulnerabilities can be filtered by vulnerable asset ID.
- `isFixAvailable=true` returns fixable vulnerabilities.
- Fixable vulnerabilities can include `fixedVersion`.
- `includeVulnerabilitiesWithoutSlas=true` is accepted.
- `severity=HIGH` is accepted, but returned no active results during the test.

## Response Shape

Top-level response shape:

```text
results
```

Observed implementation detail: `results` may be a single object or an array. Transformation code supports both shapes.

Each result includes:

```text
pageInfo
data
```

Observed `pageInfo` fields:

```text
endCursor
hasNextPage
hasPreviousPage
startCursor
```

Important implementation note: `data` can contain multiple items, so transformation code should flatten all `results[].data[]` entries while preserving pagination metadata.

Local transformation now validates this behavior with sanitized paginated fixtures containing multiple `results` entries. Live API fetch logic still needs to request subsequent pages with the cursor returned by Vanta.

The CLI now includes a live `fetch` command that requests subsequent pages with `pageCursor` and writes aggregated Vanta-shaped JSON. Raw fetched files should be written to `exports/`, which is ignored by Git.

## Confirmed Vulnerability Fields

```text
id
name
description
integrationId
packageIdentifier
vulnerabilityType
targetId
firstDetectedDate
sourceDetectedDate
lastDetectedDate
severity
cvssSeverityScore
scannerScore
isFixable
fixedVersion
remediateByDate
relatedVulns
relatedUrls
externalURL
scanSource
deactivateMetadata
```

## Confirmed Vulnerable Asset Fields

```text
id
name
assetType
hasBeenScanned
imageScanTag
scanners
```

## Product Implications

The API supports the core product direction:

- list vulnerabilities;
- extract remediation fields;
- group by severity, package, and asset;
- connect vulnerabilities to impacted assets;
- produce Markdown, JSON, CSV, or task-style outputs.

The API still needs validation for:

- larger page sizes;
- multiple pages;
- multiple scanners;
- environment mapping;
- AWS account and region availability;
- differences between API details and Vanta UI drawer details.

## Security Notes

- The OAuth client secret must never be committed.
- `.env` must remain ignored by Git.
- Real findings and generated outputs must be treated as sensitive security data.
- Fixtures should be synthetic or sanitized unless explicitly approved.

## Next Step

Use this response shape to define the first internal `Finding` model and create sanitized fixtures for transformation tests.
