# Frontend Plan

## Goal

Build a local web interface for DevOps users to inspect Vanta findings, understand impact, copy remediation-ready context, and generate operational exports without working directly from terminal output.

## Product Direction

The app should open directly into the operational dashboard. Onboarding/setup instructions are shown only when required files are missing.

Primary workflow:

1. Check setup status.
2. Test Vanta connection.
3. Fetch latest findings.
4. Generate or update asset map.
5. Inspect findings by environment, severity, and service.
6. Copy one finding or an environment pack.
7. Generate Jira-ready tasks.

## Design Direction

- Dark minimal interface.
- Dense but readable information layout.
- No landing page.
- No mandatory welcome screen after setup is complete.
- Charts visible in the first viewport.
- Findings table and details panel visible together.
- Copy-ready content should be direct and operational.

## Technical Direction

Initial frontend stack:

- Native Node.js local server.
- Vanilla HTML/CSS/JavaScript with ES modules.
- No runtime frontend dependencies for the first version.
- Backend reads `.env`, `exports/`, and `config/asset-map.json`.
- Browser never receives or stores Vanta client secrets.

This keeps the monolith small and avoids framework overhead until the product shape is validated.

## Current Screens

- Setup/status cards.
- Ordered action strip.
- Summary and distribution charts.
- Filter panel.
- Findings list.
- Finding detail panel.
- Copy-ready context block.

## Security Notes

- `.env` remains local and ignored by Git.
- `exports/` remains local and ignored by Git.
- `config/asset-map.json` remains local and ignored by Git.
- Browser calls local API endpoints; it does not read secrets directly.

## Next UI Iterations

1. Improve visual polish after browser review.
2. Add persistent UI preferences if needed.
3. Add better task templates once Jira wording is finalized.
4. Add asset-map editing only if manual JSON editing remains painful.
5. Add import/export controls for operational packs.
