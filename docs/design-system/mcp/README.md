# Design System MCP Contracts

This directory defines minimal MCP contract scaffolds for warning-first, frontend-only design-system automation.

## Scope
- Target app: `apps/frontend`
- Enforcement mode: warning-only (v1)
- Source of truth: code-first tokens and content style guide

## Servers
- `design-tokens-server.contract.yaml`
- `content-policy-server.contract.yaml`
- `storybook-qa-server.contract.yaml`
- `visual-regression-server.contract.yaml`
- `governance-server.contract.yaml`

## Notes
- Contracts are implementation-agnostic and can be implemented in Node.js, Python, or another MCP-compatible runtime.
- Follow MCP security practices: validate inputs, rate limit tools, sanitize outputs, and avoid leaking internal errors.
