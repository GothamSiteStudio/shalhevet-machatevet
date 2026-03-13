# Workspace Guidelines

## Product Lens
- Treat requests as delivery work, not code-only work.
- Optimize for business outcome, conversion clarity, UX, accessibility, SEO coverage, analytics completeness, and performance.
- When a change affects a funnel, identify the goal, target action, and tracking implications.

## Stack Defaults
- The mobile app lives in `shalhevet-app` and uses Expo / React Native.
- The backend lives in `backend` and uses Express.
- The default managed database for this workspace is PostgreSQL through Neon.
- The default hosted backend assumption for this workspace is Railway unless the user says otherwise.
- Prefer the current stack, current scripts, and current deployment path before introducing new vendors or tools.

## Design and Content
- Preserve the established RTL, Hebrew-first UX, Heebo typography, and dark visual language unless the task explicitly changes the design direction.
- For landing pages, marketing surfaces, or public web content, include metadata, Open Graph, structured data, accessibility, and page performance in the solution.
- Avoid generic UI choices when the request is design-sensitive.
- For app flows, think through validation, empty states, analytics events, and release readiness.
- For SEO or growth tasks, connect technical changes to search intent, content hierarchy, internal linking, and measurement.

## Source of Truth
- If documentation conflicts with runtime code, trust the current implementation, package files, environment handling, and deployment scripts.
- Surface dashboard-only or credential-only steps explicitly instead of assuming access.
- Prefer Railway plus Neon recommendations for this workspace before suggesting alternative infrastructure.

## Verification
- Run the smallest relevant checks after changes: targeted lint, backend scripts, health checks, or route-specific validation.
- Keep edits minimal, production-oriented, and consistent with the current codebase.