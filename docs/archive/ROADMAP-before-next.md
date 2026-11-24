# Дорожная карта

| ID | Задача | Статус | Доказательство |
|---|---|---|---|
| REC-01 | Inventory | done | reports/asset-inventory.json |
| REC-02 | Extract client modules | done | decompiled/main/_index.json |
| REC-03 | UUID and dependency graph | done | reports/dependency-audit.json |
| REC-04 | Texture and Spine recovery | in_progress | reports/REC-04-pilot.json |
| REC-05 | Prefab reconstruction | pending |  |
| REC-06 | Scene reconstruction | pending |  |
| REC-07 | Editable Cocos Creator 2.4 project | pending |  |
| REC-08 | HTML5 build | pending |  |
| REC-09 | Runtime parity checks | pending |  |
| REC-10 | Story and mechanics edit/rebuild tests | pending |  |
| REC-11 | Content editor design | pending |  |
| REC-12 | Independent online architecture design | pending |  |

REC-04: indexed 36336 import files; d1adcrd5qw exit 0. Static metadata audit {'sampler_recovered': 1237, 'spine_payloads': 2702, 'texture_meta': 21927, 'sprite_meta': 21466, 'duplicate_uuid': 0}. Spine atlas text preserved in report; packed texture descriptors, full editor schema and import test remain open.

REC-04: packed texture scan k2sonj7au5 launched with four workers; pilot/cocos24-import prepared with PNG, atlas and skel. Official Cocos 2.4 editor supports Windows/macOS, Ubuntu native editor not supported. Import acceptance pending.

REC-04: Wine pilot cja0l8nmnw exit 0, Windows cmd and Mesa llvmpipe OpenGL 4.5 verified; wine32/RPC warnings remain. Linux upstream cloned at 34e137a5431a55c9496130262b0ecbc94590c026; root license absent, old Electron and bundled native binaries, official editor required. Debian 12 isolated base build launched; no third-party scripts executed, editor import unverified.

REC-04: Debian 12 image built (0ci2dcqut4); GL smoke result pending. Official Cocos forum Windows 2.4.6-p1 URL returned HTTP 200, 641335386 bytes. Vendor download and license extraction job fv4jb6xss0 started; no editor executed or modified pending license review. Wine 64-bit cmd and OpenGL 4.5 previously verified.

REC-04: fv4jb6xss0 exit 0; official 2.4.6-p1 ZIP SHA256 7d33fa224dcd330163054f1bba7c29662f22470a2222cba828b204702fc8faff. Bundled LICENSE.rtf sections 1.2, 1.3.1, 3.1 reviewed: native editor modification paused; unmodified Wine route preferred subject to account/license compliance. Linux GL smoke hung; cleanup and full ZIP CRC job hhmqmsxb1x launched. Editor and Spine import not verified.

REC-04: ZIP CRC passed; a9fb79cq2j exit 0, original editor extracted and remote image built. Container rec04-cocos-auth started via 4usrnrua77, loopback only 127.0.0.1:16080, dedicated home volume, read-only editor and pilot. Public HTTPS access not enabled: no existing TLS listener/certificate found. Editor/import not yet verified.

2026-11-24 REC-04: noVNC is reachable at https://rikagro.ru:8443/vnc.html via standalone TLS Nginx gateway. Auth path repaired using /run/rec04-novnc/htpasswd without chmod of /home/gamedev; tested anonymous HTTP 401, authorized HTTP 200, authenticated WebSocket HTTP 101, unauthorized WS HTTP 401. rec04-novnc-expire.timer closes ONLY isolated gateway after 60 minutes; original Cocos container remains running. Termalin internal-site option unavailable because all 100 slots are occupied. Cocos account sign-in and Spine import not yet performed.

REC-04: isolated HTTPS gateway moved from 8443 to free port 443; local auth 401/200 verified; expiration timer preserved.

REC-04: compatibility build 5jhuiamv3p installed Wine32 and Mesa i386; image export pending. Job 3kmmlto4s3 waits for image and runs isolated Wine smoke and six GUI window checks. Existing protected noVNC unchanged; editor window and import not yet verified.

REC-04: compatibility image export completed; Wine32 prefix initialized, OLE/RpcSs and hostname warnings remain. Jobs 5jhuiamv3p and 3kmmlto4s3 still running; six GUI checks not yet available. No noVNC switch performed.

REC-04: 5jhuiamv3p exit 0, Wine cmd Windows 10.0.19043 verified. 3kmmlto4s3 GUI test in progress; live X11 inspection found only DXGI/IME helper windows, empty NET_CLIENT_LIST, login server unavailable in offline test. Job 76nk2vxy59 launched with ordinary network, no published ports, --disable-gpu and no project argument to isolate Dashboard startup. Existing noVNC unchanged. Disk 9.3 GiB before test.

REC-04: user requested removal of experimental Cocos editor infrastructure. Wine/Linux Docker images, test containers, dedicated home volume, temporary HTTPS gateway and vendor downloads removed. Recovered assets, reports and pilot project retained. Editor import unverified; REC-04 remains open.

D-009: user approved direct HTML5/Cocos2d-JS route, superseding D-001 editor requirement. Preserve original and all recovered assets; editor-specific tasks deferred. VPS only, no public exposure before security audit. WEB-01 baseline tests job mz7j3fw0mf.

## Active HTML5 roadmap
- WEB-01: Isolated Elixir baseline and tests (in_progress)
- WEB-02: Local HTML5 launch and security audit (pending)
- WEB-03: Browser runtime and battle smoke (pending)
- WEB-04: Configuration decode and reversible editing (pending)
- WEB-05: Client module rebuild and UI editing (pending)
- WEB-06: Story, hero and mechanics edit acceptance (pending)
- WEB-07: Lunex RPG Studio (pending)
- WEB-08: Independent online architecture and Android packaging (pending)

WEB-01: dependencies compiled, 202 application modules compiling. Hex reported Bandit 1.14.0 HIGH and Plug 1.20.3 MEDIUM advisories. Sequential remediation/retest job eyy4lg4h3c started after baseline mz7j3fw0mf. WEB-02 preliminary review: unsigned local JWT, URL account selection, loopback stop endpoint; no public exposure allowed. Static path uses Path.safe_relative. Runtime launch pending tests.

2026-11-24 WEB-01 accepted: baseline jobs mz7j3fw0mf and eyy4lg4h3c exited 2 (369 tests, 1 failure each). Root cause was incorrect test expectation: new guild trial immediately receives legitimate NPC attacks after daily tick. Corrected only isolated test assertion to validate HP bounds and NPC ownership, no production battle logic changed. Bandit 1.15.0, Plug 1.20.4, telemetry 1.4.3. Jobs mprib5j1f4 and vwgr6goz99 exit 0: 369/369 passed with seeds 412431 and 175797; after web patch another 369/369; mix hex.audit clean. Four RpcProto.js cross-language checks report skipped (missing RACON_DECOMPILED). WEB-02 sandbox qb-web02-sandbox live, 127.0.0.1:18081 only, readonly filesystem and client, no public port. Fixed static path for empty path and optional container bind mode, original unchanged. HTTP root 302, HTML 200, shim 200, JS 200, config 200, bundle 200, WebP/atlas/skel/mp3 200, Range 206, missing 404, WS 101. Full browser rendering/login/battle not yet verified, security audit open: unsigned local JWT and account selection. Other projects untouched.

2026-11-24 WEB-02: user approved Termalin full access. Certificate /etc/letsencrypt/live/game1-rikagro valid until 2027-02-22. Created dedicated Nginx /etc/nginx/conf.d/game1.conf (only rikagro.ru:443 /game1/ proxy), Basic Auth credentials only on VPS /etc/nginx/game1 (640 htpasswd, 600 password). nginx -t success, reload success; HTTPS unauthenticated /game1/ and game HTML/shim 401, /game1/__racon/stop 403, HTTP root 200. qb-web02-sandbox active loopback 127.0.0.1:18081, root HTTPS outside /game1/ 404. Test job sg9ryxzsy2 exited 0; 369/369 twice. Authenticated live request could not be tested because tool safety blocked commands involving credential use. Browser gameplay still not verified; WEB-02 not marked done. Original game and other projects untouched.

2026-11-24 WEB-02 PUBLIC GUEST: user explicitly authorized Termalin deployment and password removal. Workdir runtime/server only: HMAC-SHA256 signed 900-second launcher code, random per-browser guest cookie (HttpOnly/Secure/SameSite=Lax), checked cookie binding on /__game/login, reject arbitrary Pid, disable login_debug in public mode. Runtime data_dir points to persistent /work/server/data (private chmod 700), mounted writable in isolated Docker qb-game1-public; auto restart unless-stopped. Original read-only; GitHub and unrelated services untouched. Tests 3 guest targeted + 372 total twice (0 failures) in logs/game1-auth-final-tests.log, job 57u11qwshh exit 0. Live end-to-end: no password root 302; HTML/shim/engine 200; WebSocket upgrade 101; signed token + correct browser cookie login succeeded, mismatched/no cookie rejected ErrCode 1012, arbitrary Pid ignored; UID retained after container restart and accounts.json/secret persisted. Dedicated nginx /etc/nginx/conf.d/game1.conf game1 Basic Auth off, referrer no-referrer and noindex headers, /__racon/stop blocked 403, nginx -t success, reload. Main HTTP rikagro.ru remained 200. Browser visual rendering/gameplay not verified; WEB-02 remains in_progress. Note: bearer WS token from successful login remains sensitive and persistent, no full security audit/rate limit. Backups in backups/*.before-game1 and nginx-game1-before-*.conf. Previous test-only container qb-web02-previous and qb-game1-before-persistence stopped, not used.

RTB-01: isolated experimental combat core created; parallel damage and persistent positions tested. Original client integration and visual acceptance pending.

RTB-01 correction: initial test failed due to sequential position reads; fixed with tick-start snapshot. Retest passed; no client integration yet.

2026-11-24 RTB-02: experimental /game1-rtb/ live, isolated Docker qb-game1-rtb on loopback 18082; original /game1/ unchanged. Browser Playwright followed tutorial -> Adventure -> Start -> 1-1 victory -> rewards/level-up -> 1-2. Runtime metrics first battle 4 actors, 7 attack actions, 10 hit events, 86 overlapping update frames, 1 reposition, 0 forced returns, 0 runtime errors. Original server battle report and reward settlement retained; real-time report playback only, server turn-based engine not converted. Nginx TLS proxy and cookie path dedicated. Browser log experiments/rtb01/build/browser-control.log; source experiments/rtb01/public/runtime.js, build.mjs; output experiments/rtb01/build/index.a6b84.js; build-manifest.json. Further testing of all skills and multi-wave mechanics still required.

2026-11-24: project renamed to /home/gamedev/rocbogini. RTB 0.2 is sole active version, container rocbogini, /game1 redirects to /game1-rtb/. Legacy server and player data archived, no deletion. Next development RTB 0.3 server timing.

RTB-03: skill metadata adapter and independent cooldown prototype implemented; 14 tests passed if confirmed in reports/RTB03-skill-adapter.log. Initial fixture syntax corrected. Original table integration and effect execution pending; production unchanged.

RTB-03: real table tests passed 2/2, 10948 skill IDs, 354 hero rows, 1326 unlocked IDs at level 100/star 5. Adapter copied into main server source under battle/rtb; not wired into battle execution or deployed. Test-only 1000ms conversion. Report reports/RTB03-real-tables.log. VPS only.

2026-11-24 RTB-03 (Termalin): main battle.ex now accepts scheduler: :realtime with positive round_ms (default 1000). It uses virtual millisecond action due times and existing action/perform/after_action/buff/report pipeline, including original damage, healing, shields, stuns and passives. No new protocol: compatibility BattleReport (NewRound, HeroAction, RoundEnd). Classic scheduler: :rounds remains default and unchanged. Main-source scheduler.ex and 4 tests added. Test run: 31/31 (including existing battle and trigger suites) passed with offline isolated container, 0 failures; original cross-language RpcProto test skipped without RACON_DECOMPILED. THIS IS NOT yet full native simultaneous RTB or live deployment. Current rocbogini stays RTB 0.2. Backup: backups/rtb03-server-20261124. Next: further integration tests, correct timing/per-action cooldown and client report playback, then guarded live rollout and browser verification.

2026-11-24 RTB-03 (Termalin, stage 2): additional real-engine compatibility checks passed 34/34 in reports/RTB03-main-battle-tests.log, including actual passive buffs, damage event, HP bounds, action window uniqueness, protobuf round-trip and legacy regression. The server `scheduler: :realtime` implementation is coded and tested but LIVE engine remains unchanged; ability cooldowns currently still tied to report round end and are not yet fully virtual-time independent. No true simultaneous damage resolution or native realtime report protocol. Following steps: decouple skill cooldown, validate multiunit report parity, then guarded runtime rollout.

2026-11-24 RTB-03 test-server rollout (Termalin): user confirmed no real players, only owner testing. Main `battle.ex` virtual-ms scheduler, original effect engine, original passive buffs, speed-based action interval, independent absolute-ms skill cooldowns; story handler now uses RTB-03 under config flag enabled by RACON_RTB=1. Other modes remain classic. Predeploy 40/40 passing isolated battle/adventure suite (reports/RTB03-predeploy-tests.log), one old cross-language check skipped, integration bootstrapped Dispatch in isolated test harness. Actual beam artifacts installed in runtime/server/_build/test/lib/racon/ebin, runtime flag enabled on test server via runtime.exs, live rocbogini restarted. Post-restart transient 502 on initial startup then HTTPS /game1-rtb/ 200; scheduler module present; independently launched installed-beam battle smoke result=4 rounds=5 pages=13 (test max_rounds=5), no exception. Original player test data copied to backups/rtb03-server-20261124/rtb-data.before-deploy.tar.gz and prior beams backed up there. Browser player battle challenge/settlement still to test; native simultaneous damage and realtime client protocol still incomplete. RTB-03 remains in_progress, test-server deployment complete.

RTB-03 Termalin: enabled story regression initially 2/6 failures (timeout); actual speed 58-60, corrected provisional reference from 1000 to 60. Enabled-mode suite 40 tests, 0 failures (one cross-language check skipped); real Dispatch 725 handlers. Scheduler beam deployed, HTTP 200. Browser gameplay and native concurrency pending.

2026-11-24 Termalin: owner requested original turn-based combat due to balance. Disabled RTB03 story flag explicitly, restored original client JS playback (verified original SHA256), restarted game; HTTP 200. RTB development paused, source retained, no player data changed. Backup backups/turnbased-restore-20261124.

2026-11-24 Termalin: summon freeze investigation found repeated missing Hero_Culot1401 ASTC texture HTTP 404; WebP counterpart present. All 176 local ASTC files have WebP counterparts. Disabled ASTC selection in Cocos texture selector, cache-busted engine URL, node syntax and public engine hash/WebP HTTP verified. Android summon retest pending. Turn-based combat untouched. Backup backups/summon-texture-20261124.

2026-11-24 Termalin: owner confirmed summon fix and authorized cleanup. RU-01 complete: 27625 source hashes verified, sample recovery passed, recovery script paths corrected, pilot archived, browser executable verified; removed recovered/native, pilot, browser-test/packages only. Runtime and player data retained. RU-02 next: lossless locale export/import, then Cyrillic font and Russian UI. RTB remains paused.

RU-02 complete via Termalin: tools/locale_codec.py exports/imports 88034 unique English keys with byte-exact decompressed protobuf roundtrip. Initial Russian draft in localization/ru.json and packed ru verified; not deployed. RU-03 next: language registration, Cyrillic font, cache/version handling; RU-04 UI; RU-05 heroes/skills; RU-06 items; RU-07 story/tasks/tutorial; RU-08 events/shops; RU-09 graphics; RU-10 mobile QA.

RU-03 Termalin: initial Russian preview deployed using existing en locale slot to preserve English graphical bundles and server language routing. Original en and EZFont backed up in backups/ru03-20261124. DejaVu Sans with Cyrillic installed, license retained. Packed translation roundtrip verified and public locale/font hashes checked. Native ru selector and mobile visual QA pending. RU-04 initial UI translation expanded. No combat or account changes.

RU-04 Termalin: contextual UI batch (battle, lottery, inventory, tournament); glossary and reproducible translation script saved. Placeholder and markup validation passed for UI, protobuf roundtrip and public locale hash verified. Ambiguous terms left untranslated pending mechanic review. Mobile QA pending.

PIXI migration: user requested new PixiJS + Spine + TypeScript client, preserve turn-based balance and contextual Russian localization. PIXI-01 foundation created separately under pixi-client, pinned PixiJS 7.4.3 and Spine 3.8 runtime 4.0.6, React/TS/Vite production build verified. Existing live client untouched. Next PIXI-02 real Spine 3.8.99 asset loading from original indexes and Lunex Asset Library; PIXI-03 protocol adapter; PIXI-04 vertical slice login/home/formation/story battle/settlement; PIXI-05 feature parity; PIXI-06 admin/content editors; PIXI-07 mobile QA and APK/PWA. Elixir retained initially; PostgreSQL migration separate. Original-client localization paused in favor of reusable translations. No public deployment or asset license claims.

PIXI-02 in progress via Termalin: Culot1401 avatar skeleton/atlas/WebP extracted from original client, TypeScript loader and animation selector compiled. Browser smoke blocked by WebGL renderer initialization on VPS; no visual or animation pass claimed. Next diagnose software WebGL or test on Android. Original game untouched.

PIXI-02 Termalin: owner deferred GitHub, VPS only. Prefer Lunex Asset Library adapted assets. Catalog contains 2696 queensblade records; imported Culot1401_Avatar with verified skeleton/texture SHA256 using pixi-client/tools/import_library.py, client switched to library assets, build passed. Browser animation validation remains pending. Library unchanged.

PIXI-02 Termalin: full migration confirmed. Imported 10 distinct avatar sets from library with prior successful runtime decode records and verified hashes. Added modular 5x5 scene and sequential animation demo, production build passed. Demo has no damage/rewards and is not connected to server. Browser QA pending. Next protocol adapter for original adventure challenge/report/settlement. VPS only, original game untouched.

ARCH-C approved: staged migration to Node.js/TypeScript/Fastify, PostgreSQL, Redis, REST/WebSocket. Elixir remains live reference until parity and cutover approval. VPS only; GitHub deferred. No production data changes. SERVER-01 isolated foundation; SERVER-02 protocol/table inventory and parity fixtures; SERVER-03 auth/persistence; SERVER-04 deterministic battle parity; SERVER-05 progression/economy/summon; SERVER-06 remaining feature parity; SERVER-07 migration and cutover.

SERVER-01: isolated Fastify/TypeScript foundation created in next-server; pg/redis dependencies installed, not connected. Health/capabilities tests passed. WebSocket rejects unauthenticated connections by design; no gameplay implemented. No public listener or production changes.
