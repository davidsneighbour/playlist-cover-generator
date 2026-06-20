# Backlog

All open work is tracked as GitHub issues. See [ROADMAP.md](ROADMAP.md) for the current priority view; the issue tracker is authoritative.

The Vitest suite, both builds (`npm run build`, `npm run build:lib`), and lint all pass. The project is MIT licensed and publish-ready at version 0.2.0. For what the editor does see [README.md](README.md); for how it is built see [AGENTS.md](AGENTS.md).

---

## Out of scope (non-goals)

* **Server-backed cloud save** — the share link encodes the layout in the URL hash (`#s=...`). A real cloud save would require a server and auth, which this embeddable, dependency-light component deliberately does not include.
