# Copilot MCP and CLI Stack

## What Was Added In This Workspace
- `.github/copilot-instructions.md` defines a default working style that combines product delivery, design quality, SEO, analytics, and performance.
- `.github/skills/technical-seo-audit/SKILL.md` adds a reusable SEO audit workflow.
- `.github/skills/landing-page-delivery/SKILL.md` adds a reusable landing page and marketing implementation workflow.
- `.github/skills/app-release-growth-ops/SKILL.md` adds a reusable release and launch workflow for Expo, Railway, and Neon.

## Current Stack Assumptions
- This workspace is a monorepo with Expo mobile under `shalhevet-app` and Express backend under `backend`.
- The preferred hosted backend path is Railway.
- The preferred managed database path is Neon PostgreSQL.
- Backend database checks already exist through `backend/package.json` scripts:
  - `npm run db:check`
  - `npm run db:init:pg`
  - `npm run db:import:json`

## Recommended MCP Priority
1. GitHub MCP: repo search, PRs, issues, reviews, branch awareness.
2. Browser or Playwright MCP: visual QA, funnel validation, pixel and analytics checks.
3. PostgreSQL MCP: direct schema and data inspection for Neon-backed systems.
4. Google Search Console and GA4 custom MCP: indexing, query data, CTR, events, and funnel visibility.
5. Figma MCP: design-to-code alignment and component inspection.
6. CMS MCP for WordPress, Shopify, Webflow, Notion, or Airtable when client work depends on them.
7. SEO data MCP for Ahrefs or Semrush if you rely on external keyword and backlink data.

## Recommended CLI Priority
1. `git` and `gh` for version control and GitHub operations.
2. `railway` for deployment checks and service management.
3. `psql` for direct PostgreSQL access when needed.
4. `eas` for Expo build and release workflows.
5. `lighthouse` for performance and public-page audits.
6. `playwright` for repeatable browser checks.

## Suggested Install Sequence
1. Install GitHub CLI.
2. Install Railway CLI.
3. Install EAS CLI.
4. Install Lighthouse CLI.
5. Add a browser automation path through Playwright.
6. Add MCP servers in this order: GitHub, Browser, PostgreSQL, Search Console and GA4, Figma, CMS.

## What Still Requires Your Login Or Secrets
- GitHub authentication
- Railway authentication and project linking
- Neon connection or database credentials
- Search Console and GA4 API credentials
- Figma or CMS tokens
- Any ad platform, SEO platform, or analytics vendor credentials

## Good Default Rules For Your Profile
- For build work, think in code, UX, conversion, analytics, and SEO at the same time.
- For marketing pages, do not separate visual design from metadata, schema, accessibility, and tracking.
- For app releases, treat backend health, API wiring, database readiness, and event verification as one release workflow.
- Prefer the current Railway plus Neon path before proposing infrastructure changes.

## First Real Upgrades To Make Next
1. Add GitHub MCP.
2. Add Browser or Playwright MCP.
3. Add PostgreSQL MCP for Neon.
4. Add a custom Search Console plus GA4 MCP.
5. Authenticate `gh`, `railway`, and `eas` in your local environment.