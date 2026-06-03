# Vanta Findings Exporter

## Overview

Vanta Findings Exporter is an internal tool proposal for turning Vanta vulnerability findings into operation-ready outputs.

The project is intended to help Security, DevOps, SRE, and engineering teams review, group, prioritize, and communicate vulnerability remediation work without manually opening each finding in the Vanta UI.

The stack is not defined yet. This repository starts with documentation first, then incremental implementation.

The first Vanta API spike was successful: OAuth authentication works with a read-only Manage Vanta application, and the project can read vulnerability and vulnerable asset data from the Vanta API.

## Problem

Vanta centralizes vulnerability findings, but operational treatment can still require manual work:

- open findings one by one;
- copy vulnerability details manually;
- identify impacted assets and environments;
- group findings by severity, package, asset, repository, or team;
- prepare remediation notes for Daily Status Reports, Jira, or other operational workflows.

This process is slow, repetitive, and error-prone when the number of findings grows.

## Goal

Create a small, practical tool that can transform Vanta finding data into clean lists, summaries, and operational tasks.

The initial goal is not to replace Vanta. The goal is to create a focused operational layer for exporting, grouping, and preparing remediation work.

## Practical Use Cases

- Generate a consolidated list of active vulnerabilities.
- Group findings by severity, impacted asset, package, repository, or environment.
- Identify high-priority remediation work.
- Generate Markdown summaries for status updates.
- Generate operational tasks in the format used by Daily Status Report or Jira.
- Support copy and paste workflows for teams that do not work directly inside Vanta.
- Prepare remediation packs by service, environment, or owning team.

## Initial Scope

The first implementation phase should focus on data transformation and output generation using real Vanta API response shapes validated during the API spike.

Initial scope:

- define a minimal internal model based on Vanta API fields;
- create sanitized fixtures based on real API response shapes;
- normalize finding data into an internal model;
- group findings by severity, asset, and package;
- generate a Markdown summary;
- generate operational task text;
- keep the implementation local and simple;
- defer full production-grade API integration until the data model and outputs are validated.

## Out of Scope for Now

- Production-grade Vanta API sync.
- Webhooks or scheduled jobs.
- Jira, Slack, GitHub, or Linear integration.
- Persistent database.
- Multi-user access control.
- Production deployment.
- Complex dashboards.
- Automated remediation.

## Expected Inputs

Future inputs may include:

- Vanta API vulnerability findings;
- Vanta API vulnerable asset data;
- simulated JSON fixtures matching expected Vanta data;
- local environment mapping files, such as asset ID, asset name, asset prefix, or AWS account ID to environment;
- optional ownership mapping files, such as repository, service, or team.

Example environment mapping:

```json
{
  "assetIds": {
    "asset_001": "production"
  },
  "assetNames": {
    "preproduction-backend": "staging"
  },
  "assetNamePrefixes": {
    "dev-": "development"
  }
}
```

## Expected Outputs

Expected outputs may include:

- normalized JSON;
- CSV exports;
- Markdown summaries;
- grouped technical reports;
- operational task descriptions;
- remediation checklists;
- severity and SLA summaries.

Example future task format:

```md
[DevOps | Vanta | Security] Review and remediate high severity findings

:progress_bar: Analyze Vanta findings, group impacted assets by severity/package, define remediation actions, validate fixed versions, and document evidence for operational follow-up.
```

## Vanta API Integration

The first API spike confirmed that the project can authenticate and read from the Vanta API using a read-only Manage Vanta OAuth application.

The CLI now includes a `fetch` command that reads Vanta credentials from `.env` or process environment variables and writes raw Vanta-shaped JSON to explicit output files.

Validated endpoints:

- `POST https://api.vanta.com/oauth/token`
- `GET https://api.vanta.com/v1/vulnerabilities`
- `GET https://api.vanta.com/v1/vulnerable-assets`
- `GET https://api.vanta.com/v1/vulnerable-assets/{vulnerableAssetId}`

Validated behavior:

- OAuth works with `client_credentials`;
- read-only scope works for listing vulnerabilities and vulnerable assets;
- pagination is returned through `pageInfo`;
- `vulnerability.targetId` resolves to a vulnerable asset;
- filtering by `vulnerableAssetId` works;
- filtering by `isFixAvailable=true` works;
- filtering with `includeVulnerabilitiesWithoutSlas=true` works.

Confirmed vulnerability fields:

- `id`
- `name`
- `description`
- `integrationId`
- `packageIdentifier`
- `vulnerabilityType`
- `targetId`
- `firstDetectedDate`
- `sourceDetectedDate`
- `lastDetectedDate`
- `severity`
- `cvssSeverityScore`
- `scannerScore`
- `isFixable`
- `fixedVersion`
- `remediateByDate`
- `relatedVulns`
- `relatedUrls`
- `externalURL`
- `scanSource`
- `deactivateMetadata`

Confirmed vulnerable asset fields:

- `id`
- `name`
- `assetType`
- `hasBeenScanned`
- `imageScanTag`
- `scanners`

The expected integration will use Vanta endpoints for:

- vulnerability findings;
- vulnerable assets;
- metadata needed to map findings to assets, environments, and remediation context.

Before implementing full integration, the project should still validate:

- rate limits;
- response shape with larger pages;
- response shape across multiple vulnerability scanners;
- whether all fields shown in the Vanta UI are available through the API;
- how to map assets to environments reliably.

## Possible Output Formats

- JSON for automation and downstream tooling.
- CSV for spreadsheets and manual review.
- Markdown for status reports, pull requests, Jira descriptions, and documentation.
- Plain text for quick copy and paste.

## Initial MVP Proposal

The initial MVP should use the validated Vanta API shape, but avoid building a full production integration too early.

Proposed MVP:

1. Define a minimal internal finding schema.
2. Create sanitized JSON fixtures based on real Vanta API response shapes.
3. Normalize findings into the internal model.
4. Group findings by severity, asset, and package.
5. Generate a Markdown summary.
6. Generate operational task text in the expected Daily Status Report/Jira style.
7. Validate output with realistic simulated examples.

Full Vanta API integration should happen only after the MVP proves that the internal model and output formats are useful.

## Development Methodology

This project should follow an incremental, documentation-driven workflow:

1. Document the idea.
2. Validate the scope.
3. Define the MVP.
4. Choose the stack.
5. Create the base project structure.
6. Add tests where they protect business logic.
7. Implement small features.
8. Validate outputs.
9. Update documentation.
10. Repeat.

TDD should be used where it provides clear value, especially for:

- data normalization;
- finding transformation;
- grouping logic;
- filtering logic;
- output generation;
- severity and priority rules;
- operational task formatting.

TDD should not be applied mechanically to every file. Tests should protect the logic that can break silently or affect operational decisions.

## Definition of Done

A future feature is done when:

- the scope is understood;
- expected behavior is documented;
- tests are created or updated when applicable;
- the code is simple and readable;
- basic error handling is present;
- documentation is updated;
- validation commands are executed and recorded;
- no secrets are exposed;
- local execution is supported;
- outputs are validated with realistic simulated or real approved examples.

## Security Considerations

This project may handle API credentials, vulnerability findings, asset names, account identifiers, and other sensitive security data.

Security rules:

- never hardcode secrets;
- never commit `.env` files;
- provide a `.env.example` when environment variables are introduced;
- read secrets from environment variables or a secure secret manager;
- mask tokens and credentials in logs;
- avoid storing sensitive findings unless there is a clear need;
- treat real exports and generated outputs as sensitive information;
- avoid sending findings to third-party services without explicit approval;
- keep local fixtures synthetic unless real data is approved for development use.

Required environment variables when API integration is introduced:

```text
VANTA_CLIENT_ID=
VANTA_CLIENT_SECRET=
VANTA_API_SCOPE=vanta-api.all:read
```

## Technical Decisions Pending

The following decisions are intentionally open:

- frontend stack, if a web UI is needed later;
- whether to evolve from CLI to webapp, API service, or hybrid;
- data validation/schema library;
- output template strategy;
- whether to persist historical findings;
- how to map AWS accounts, regions, assets, repositories, and environments;
- how to authenticate users if a webapp is built;
- deployment target for internal use;
- strategy for secret management;
- naming and structure for operational task templates.

Decisions already made:

- first interface: CLI;
- initial runtime: Node.js;
- initial dependency strategy: no runtime dependencies;
- initial test strategy: native `node:test`.

Decision log: [docs/DECISIONS.md](docs/DECISIONS.md)

## API Spike Results

Status: completed successfully.

Date: 2026-06-03.

Detailed notes: [docs/API_SPIKE.md](docs/API_SPIKE.md)

Result:

- read-only OAuth application was created in Vanta Developer Console;
- OAuth token request succeeded;
- vulnerability list request succeeded;
- vulnerable asset list request succeeded;
- vulnerable asset lookup by ID succeeded;
- relationship between vulnerability `targetId` and vulnerable asset ID was confirmed;
- operational filters were partially validated.

Known observations:

- API responses are nested under `results`;
- `results` may be a single object or an array, depending on the response shape;
- each result includes `pageInfo` and `data`;
- `data` can contain multiple items;
- local transformation supports multiple `results[].data[]` blocks;
- live API pagination must still fetch all pages explicitly;
- real outputs must be treated as sensitive security data.

Follow-up questions:

- Which scanners are present in production data?
- Which asset naming conventions identify environment reliably?
- Do we need AWS account ID, region, repository, or team ownership for the first MVP?
- Should the first user interface be CLI-only, webapp-only, or CLI first with webapp later?

## Roadmap

### Phase 0: Documentation

- Create initial README.
- Align project goals and non-goals.
- Define MVP boundaries.
- Record technical decisions as they are made.

### Phase 1: MVP Design

- Define internal finding schema.
- Define sanitized sample input JSON based on Vanta API response shape.
- Define environment mapping input.
- Define expected Markdown and task outputs.
- Choose stack.
- Define test strategy.

Detailed MVP proposal: [docs/MVP.md](docs/MVP.md)

### Phase 2: Local Transformation MVP

- Parse simulated JSON input.
- Normalize findings.
- Group findings by severity, asset, and package.
- Generate Markdown output.
- Generate operational task output.
- Add tests for core logic.

### Phase 3: Vanta API Spike

- Validate Vanta API access. Done.
- Confirm available fields. Done.
- Confirm pagination and filters. Partially done.
- Compare API data with Vanta UI expectations.
- Update internal model if needed.

### Phase 4: Vanta API Integration

- Implement authenticated API client.
- Fetch vulnerability findings.
- Fetch vulnerable assets.
- Map findings to environments.
- Generate outputs from live data.

### Phase 5: Operationalization

- Add UI or CLI improvements.
- Add export options.
- Add ownership mapping.
- Add optional integrations with Jira, Slack, or GitHub.
- Define deployment model.

## Local Development

The first milestone uses Node.js with no external dependencies.

Create a local `.env` file when API credentials are needed. This file must not be committed.

Use `.env.example` as the template.

Run tests:

```sh
npm test
```

Generate a Markdown summary from sanitized fixtures:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json
```

Generate a Markdown summary with explicit environment mapping:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json --environment-map fixtures/environment-map.sample.json
```

Generate a Markdown summary from paginated sanitized fixtures:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json
```

Filter by severity:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --severity high
```

Filter to findings with a fix available:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --fixable-only
```

Filter by package and environment:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --package nginx --environment production
```

Filter by asset:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --asset production-api
```

Filter by due date:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --due-before 2026-06-11
```

Filter overdue findings:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --overdue
```

Filter findings due soon:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --due-soon 14
```

Combine filters:

```sh
npm run cli -- tasks --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --severity medium --fixable-only
```

Filter matching is exact and case-insensitive.

`--due-before` uses `remediateByDate`, expects `YYYY-MM-DD`, and excludes findings without a due date.

`--overdue` and `--due-soon` use `remediateByDate`, compare against the current execution date, and exclude findings without a due date.

Generate normalized JSON from sanitized fixtures:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json --format json
```

Generate CSV from sanitized fixtures:

```sh
npm run cli -- summarize --vulnerabilities fixtures/vanta-vulnerabilities.paginated.sample.json --assets fixtures/vanta-assets.paginated.sample.json --format csv
```

Generate operational task text:

```sh
npm run cli -- tasks --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json
```

Generate Jira-ready task text:

```sh
npm run cli -- tasks --vulnerabilities fixtures/vanta-vulnerabilities.sample.json --assets fixtures/vanta-assets.sample.json --severity high --format jira
```

Task output includes:

- grouped task title by severity;
- environment summary;
- package summary;
- impacted asset summary;
- per-finding details with environment, asset, package, fixed version, due date, and external link.

Fetch live Vanta data:

```sh
npm run cli -- fetch --vulnerabilities-out exports/vulnerabilities.json --assets-out exports/assets.json
```

Export live Vanta data directly:

```sh
npm run cli -- export --severity high --fixable-only --format csv
```

Export live operational tasks:

```sh
npm run cli -- export --environment production --format tasks
```

Export live Jira-ready tasks:

```sh
npm run cli -- export --environment production --format jira
```

Use fetched data with the existing workflow:

```sh
npm run cli -- summarize --vulnerabilities exports/vulnerabilities.json --assets exports/assets.json --format csv
```

Files under `exports/` are ignored by Git and should be treated as sensitive security data.

Latest live fetch validation:

- `page-size 1` fetched 9 vulnerability result blocks and 40 vulnerable asset result blocks;
- normalized live findings count: 9;
- direct live export validation returned 9 fixable findings and 4 package groups;
- no raw finding content should be printed in logs or committed.

JSON output note:

- summary groupings are emitted as arrays of `{ "name": "...", "count": 1 }`;
- this avoids duplicate-key issues in case-insensitive JSON consumers when package names differ only by casing.

## Next Steps

Recommended next steps:

1. Validate the CLI output against expected operational usage.
2. Expand sanitized fixtures with more Vanta response shapes.
3. Validate live fetch output against real Vanta data.
4. Add AWS account and region mapping when those fields are confirmed.
5. Add output templates tuned for Jira/Daily Status Report.
