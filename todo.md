# Backlog

The deferred backlog from the initial implementation is fully implemented, tested, and documented, and the project is MIT licensed and publish-ready ([LICENSE.md](LICENSE.md), `"license": "MIT"`). The Vitest suite (one file per `src/lib` module) and both builds (`npm run build`, `npm run build:lib`) pass. For what the editor does see [README.md](README.md); for how it is built see [AGENTS.md](AGENTS.md). Completed work is not re-listed here — its history lives in git and in the architecture docs.

There are no open items. The actual public `npm publish` (and bumping the version past `0.1.0`) is a manual release step left to the maintainer.

## Out of scope (non-goals)

* **Server-backed cloud save** — the share link encodes the layout in the URL hash (`#s=...`), so sharing is client-only and needs no backend. A real cloud save would require a server and auth, which this embeddable, dependency-light component deliberately does not include. Documented in [AGENTS.md](AGENTS.md).

# Ideas

*
