# MVP Proposal

## Objective

Build the smallest useful version of Vanta Findings Exporter that can transform Vanta-like vulnerability data into operational outputs.

The MVP should prove the data model, grouping rules, and output formats before building a full webapp or production-grade API sync.

## Recommended MVP Shape

Start with a local transformation workflow:

1. Load sanitized or fetched JSON shaped like Vanta API responses.
2. Flatten paginated Vanta response data.
3. Normalize vulnerabilities and vulnerable assets into internal models.
4. Join vulnerabilities to assets through `targetId`.
5. Apply explicit environment and ownership mapping when provided.
6. Apply operational filters such as severity, fixable-only, owner, service, or repository.
7. Group findings by severity, package, asset, owner, service, or repository.
8. Generate Markdown output.
9. Generate operational task text.

This can later become a CLI, webapp, or backend workflow.

## Initial Internal Models

### Finding

```text
id
title
description
severity
cvssSeverityScore
scannerScore
packageIdentifier
vulnerabilityType
isFixable
fixedVersion
remediateByDate
firstDetectedDate
sourceDetectedDate
lastDetectedDate
relatedVulns
relatedUrls
externalURL
scanSource
assetId
assetName
assetType
environment
owner
service
repository
awsAccountId
awsRegion
```

### Asset

```text
id
name
assetType
hasBeenScanned
imageScanTag
scanners
environment
```

### Environment Mapping

Environment should not be guessed permanently from raw strings without a configurable mapping.

Initial options:

- map by vulnerable asset ID;
- map by exact asset name;
- map by asset name prefix;
- map by AWS account ID when available;
- map repository, service, and owner metadata when provided.

Mapping entries can be either a string or an object.

String entries map only the environment:

```json
{
  "assetIds": {
    "asset_001": "production"
  }
}
```

Object entries can include operational metadata:

```json
{
  "assetIds": {
    "asset_001": {
      "environment": "production",
      "owner": "devops",
      "service": "backend",
      "repository": "sfj/backend",
      "awsAccountId": "910976932103",
      "awsRegion": "eu-west-1"
    }
  }
}
```

The versioned template lives at `config/asset-map.example.json`.

The real local mapping file should be `config/asset-map.json`, which is ignored by Git because it may contain internal operational metadata.

The CLI can generate a starter mapping file from fetched Vanta assets:

```sh
npm run cli -- generate-map-skeleton --assets exports/assets.json --out config/asset-map.json
```

The generated skeleton should use asset IDs as keys, infer simple environments from asset names when possible, and leave operational ownership fields as `unknown` or `null` for manual completion.

Open question: the first API sample did not confirm whether AWS account ID and region are directly available in vulnerable asset fields. This must be validated before environment grouping becomes part of the MVP acceptance criteria.

## Initial Outputs

### Markdown Summary

Should include:

- total findings;
- counts by severity;
- counts by package;
- impacted assets;
- fixable findings;
- due dates when available.

Supported filters:

- severity;
- fixable-only;
- package;
- environment;
- asset;
- owner;
- service;
- repository;
- due-before;
- overdue;
- due-soon.

Current filter matching is exact and case-insensitive.

`due-before` uses `remediateByDate`, expects `YYYY-MM-DD`, and excludes findings without a due date.

`overdue` and `due-soon` use `remediateByDate`, compare against the current execution date, and exclude findings without a due date.

When no findings match selected filters, output should make that clear instead of silently returning an empty task list.

### Operational Task

Future task format:

```md
[DevOps | Vanta | Security] Review and remediate high severity findings

:progress_bar: Analyze Vanta findings, group impacted assets by severity/package, define remediation actions, validate fixed versions, and document evidence for operational follow-up.
```

Current task output includes:

- one task block per selected grouping;
- supported groupings: severity, package, asset, environment, owner, service, repository;
- environment summary;
- package summary;
- impacted asset summary;
- owner, service, repository, AWS account, and AWS region summary;
- per-finding details:
  - environment;
  - asset;
  - owner;
  - service;
  - repository;
  - AWS account;
  - AWS region;
  - package;
  - fixed version;
  - due date;
  - external link.

### JSON

Should output normalized findings using the internal model.

Summary groupings should be arrays of `{ name, count }` rows rather than objects keyed by group name. This avoids parser issues when two package names differ only by casing.

### CSV

Should support spreadsheet review with columns such as:

```text
severity,package,fixedVersion,assetName,environment,remediateByDate,externalURL
```

Current CSV columns:

```text
severity,title,packageIdentifier,assetName,environment,owner,service,repository,awsAccountId,awsRegion,isFixable,fixedVersion,remediateByDate,relatedVulns,externalURL
```

CSV values with commas, quotes, or newlines must be escaped correctly.

### File Output

The CLI should support writing rendered outputs directly to a selected local file with `--out <file>`.

Supported commands:

- `summarize`;
- `tasks`;
- `export`.

When `--out` is provided, the CLI should write the selected output format to disk and print only a short confirmation with the destination path.

Files under `exports/` are ignored by Git and should be treated as sensitive security data.

## Suggested Test Strategy

Use tests for logic that affects operational decisions:

- flattening Vanta paginated responses;
- normalizing vulnerability fields;
- joining vulnerabilities to assets;
- filtering by severity;
- filtering by fix availability;
- grouping by severity;
- grouping by package;
- detecting fixable findings;
- formatting Markdown summaries;
- formatting operational task text.

Avoid testing framework setup before the stack is chosen.

## Stack Decision

Stack is still pending.

Recommended direction for discussion:

- CLI first if the goal is fast validation and export;
- webapp first if visual filtering is the immediate priority;
- hybrid later if both workflows become useful.

No stack should be installed until this decision is made.

## MVP Acceptance Criteria

The MVP is acceptable when:

- it can read sanitized Vanta-shaped JSON;
- it can fetch live Vanta-shaped JSON with read-only API credentials;
- it can flatten `results[].data[]`, including multiple `results` entries;
- it can normalize findings into the internal model;
- it can join findings to assets by `targetId`;
- it can apply explicit environment mapping;
- it can apply optional owner, service, repository, AWS account, and AWS region mapping;
- it can generate a starter asset map skeleton from fetched Vanta assets;
- it can filter by severity;
- it can filter to fixable findings;
- it can filter by package;
- it can filter by environment;
- it can filter by asset;
- it can filter by owner;
- it can filter by service;
- it can filter by repository;
- it can filter by due date;
- it can filter overdue findings;
- it can filter due-soon findings;
- it can group by severity, package, asset, environment, owner, service, and repository;
- it can generate Markdown summary output;
- it can generate CSV output;
- it can generate task-style output;
- it can write rendered outputs to local files with `--out`;
- tests cover transformation and formatting logic;
- no secrets or real sensitive findings are committed.

## Next Decisions

1. Decide CLI first, webapp first, or hybrid.
2. Choose implementation stack.
3. Define sanitized fixture files.
4. Define exact Markdown output format.
5. Define first test cases.
