# Technical Decisions

## Decision 001: CLI First

Date: 2026-06-03

Status: accepted

Decision:

Start with a CLI before building a webapp.

Reasoning:

- validates data transformation and output formatting with less complexity;
- keeps the first implementation close to the operational export workflow;
- avoids frontend and deployment decisions before the data model is proven;
- supports TDD around business logic.

Implications:

- first interface reads local JSON shaped like Vanta API responses;
- first outputs are Markdown, JSON, and task-style text;
- webapp remains a future option after the CLI proves useful.

## Decision 002: Node.js With Native APIs

Date: 2026-06-03

Status: accepted

Decision:

Use Node.js with native APIs and no runtime dependencies for the first CLI milestone.

Reasoning:

- Node is available locally;
- native `node:test` is enough for the first transformation tests;
- avoiding dependencies reduces setup cost and keeps the MVP simple.

Implications:

- no dependency installation is required for the first milestone;
- command execution uses `node`;
- package scripts are used only as local conveniences.

