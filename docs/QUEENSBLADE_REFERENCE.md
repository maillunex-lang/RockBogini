# Queen's Blade reference — 2026-11-26

Owner confirmed QueensBladeH5 is the original reference for RockBogini, not a separate game.

Windows reference root: `C:\SOURCE\QueensBladeH5\racon2-main` (read-only for porting). Extraction verified by 7-Zip exit 0: 92,161 files, 51,805 directories. Original ZIP retained. Cocos Creator 2.4 compiled client under `client/G123Live/Queen-Blade`; reconstructed Elixir backend under `server`; protobuf schemas under `proto`; developer guide under `docs/DEVELOPING.md`. This is a reconstructed backend, not official server source; unsupported requests may return stubs. Local runtime launch is not yet verified (Hex setup pending).

## Continuation
Keep SINGLE-PROJECT-001: canonical development tree `/home/gamedev/rocbogini/`, existing PixiJS 7 / Spine 3.8 / React / TypeScript client and Fastify Next server. No new game, no full project copies, no change to original runtime. Windows reference is an additional source, not a replacement for existing audited VPS reference until differences are checked.

Active task remains NEXT-026.1, then campaign and hero window parity. Compare original prefab geometry, atlas sprites, Spine animation and localization with current implementation; record provenance and hashes for selected imports. Verify redistribution rights before publishing assets; do not upload raw archive, account data, secrets or bundled runtimes. Run build/tests and visual QA before marking any task done. No deployment or parity completion claimed by this note.
