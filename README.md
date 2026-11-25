# RockBogini Next
Current development snapshot, not a finished game. The legacy root project is retained.
Requirements: Linux VPS, Docker Engine, Compose v2.20+, OpenSSL.
Run from repository root: `bash next/install.sh`. Open http://SERVER:8080.
Set WEB_PORT to change the web port. API uses loopback 18991; choose a different host port in next-server/compose.yaml if occupied.
For public production use configure HTTPS via a reverse proxy. Fresh database; no live player data or secrets included.
Server battle reports are connected to the client; original models, backgrounds and movement are implemented, browser visual acceptance pending. NEXT-012 reference scope accepted for integration, full parity remains incomplete. Next: NEXT-013.3.1. See [ROADMAP](docs/ROADMAP.md).
Included assets are the current client subset, not the entire original asset library. Verify redistribution rights before reuse.
