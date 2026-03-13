---
name: app-release-growth-ops
description: 'Handle Expo app release readiness, Railway deployment, Neon database checks, API environment wiring, analytics QA, deep links, and launch operations for mobile and backend products.'
argument-hint: 'Release goal, platform, or launch scope'
---

# App Release Growth Ops

## When to Use
- Prepare a mobile app or backend for release.
- Validate Railway plus Neon environments.
- Connect app builds to API URLs, analytics, or deep links.
- Run launch-readiness reviews across product, backend, and measurement.

## Procedure
1. Confirm the release target: development, staging, or production, and which mobile platforms or public URLs are involved.
2. Verify backend readiness: environment variables, health endpoint, database connectivity, auth flow, and error handling.
3. Verify data layer readiness: schema state, seed or import status, and rollback considerations for Neon-backed data.
4. Verify app wiring: API base URL, environment flags, deep links, icon and splash assets, permissions, and update channel strategy.
5. Verify measurement: sign-up, login, purchase or lead events, attribution touchpoints, and dashboard visibility.
6. Verify operational safety: secrets handling, deployment order, post-release smoke test, and fallback path.

## Release Checklist
- Backend health reachable
- Database connectivity confirmed
- App points at the right environment
- Critical events verified
- Post-release smoke test defined