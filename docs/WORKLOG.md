# Журнал
2026-11-24: архив удален по запросу, распакованный оригинал сохранен.
2026-11-24: REC-01/02: job kvs1cjgt7r exit 0; инвентаризация и извлечение модулей завершены. Предупреждения Node записаны в STATUS.

REC-03: проверены 20221 ссылки модулей, 51140 связей манифестов, индекс 68435 идентификаторов ресурсов. Нет отсутствующих целей модулей, файлов модулей, зависимостей пакетов и неверных индексов. Один отсутствующий versioned native ресурс Font: 898056a8-6add-431c-9738-0becf0ca273c. Проверка внутренних ссылок сериализованных объектов остается для REC-04/05/06. Отчет reports/dependency-audit.json. Следующая задача REC-04.

Уточнение: EZFont.ttf найден во вложенном каталоге версии; отсутствующих versioned файлов по проверенным манифестам нет.

2026-11-24: D-007: по разрешению владельца установлен системный python3-pil 12.1.1. REC-04: пилот PNG/atlas/skel извлечен, пиксели совпадают, импорт редактора не проверен. reports/REC-04-pilot.json.

REC-04: job i09x2ldyq6 запущен и проверен, процесс активен.

REC-04: переход на параллельную обработку xb69l8zioq.

REC-04: active job uxtje05yyz; xb69l8zioq exited safely because old worker survived job_stop; old worker terminated and verified absent. Four workers nice 10.

REC-04: job uxtje05yyz running; first 1000 records, zero errors; vmstat 99-100 percent busy, available RAM 6.1 GiB, disk 32 GiB free. Initial speed includes reused files; final benchmark pending.

REC-04: job uxtje05yyz reached 24750/27625 with zero reported errors. Metadata manifest index created at reports/REC-04-metadata-index.json; not editor .meta files. Final native audit and import pending.

REC-04: native job uxtje05yyz exit 0, 27625 records, zero conversion errors. Independent hash audit fj4kncg4oz started. Provisional texture metadata generated; editor validation and exact sampler/border recovery pending. {'texture_meta_candidates': 21887, 'frame_submeta_candidates': 21098, 'missing_or_ambiguous_texture': 23}

REC-04: independent audit fj4kncg4oz passed, 27625 records, no hash failures or missing files. Shared texture candidate repair and Spine link index: {'shared_texture_candidates': 35, 'frames': 14, 'spine_link_candidates': 2701, 'spine_unresolved': 2}; conflicts 4. Editor import and packed records pending.

REC-04: 354/368 packed records decoded, 14 pending; 3/4 conflicting UUIDs pixel equivalent, 1 genuine variant conflict preserved. Packed meta update {'packed_submeta_added': 354}. Exact importer settings and Spine metadata still pending; no editor validation.

REC-04: redirect resolution 14/14; unresolved 0. UUID variant mapping generated (5 groups expected), reference rewrite and importer settings pending.

REC-04: indexed 36336 import files; d1adcrd5qw exit 0. Static metadata audit {'sampler_recovered': 1237, 'spine_payloads': 2702, 'texture_meta': 21927, 'sprite_meta': 21466, 'duplicate_uuid': 0}. Spine atlas text preserved in report; packed texture descriptors, full editor schema and import test remain open.

REC-04: packed texture scan k2sonj7au5 launched with four workers; pilot/cocos24-import prepared with PNG, atlas and skel. Official Cocos 2.4 editor supports Windows/macOS, Ubuntu native editor not supported. Import acceptance pending.

REC-04: Wine pilot cja0l8nmnw exit 0, Windows cmd and Mesa llvmpipe OpenGL 4.5 verified; wine32/RPC warnings remain. Linux upstream cloned at 34e137a5431a55c9496130262b0ecbc94590c026; root license absent, old Electron and bundled native binaries, official editor required. Debian 12 isolated base build launched; no third-party scripts executed, editor import unverified.

REC-04: Debian 12 image built (0ci2dcqut4); GL smoke result pending. Official Cocos forum Windows 2.4.6-p1 URL returned HTTP 200, 641335386 bytes. Vendor download and license extraction job fv4jb6xss0 started; no editor executed or modified pending license review. Wine 64-bit cmd and OpenGL 4.5 previously verified.

REC-04: fv4jb6xss0 exit 0; official 2.4.6-p1 ZIP SHA256 7d33fa224dcd330163054f1bba7c29662f22470a2222cba828b204702fc8faff. Bundled LICENSE.rtf sections 1.2, 1.3.1, 3.1 reviewed: native editor modification paused; unmodified Wine route preferred subject to account/license compliance. Linux GL smoke hung; cleanup and full ZIP CRC job hhmqmsxb1x launched. Editor and Spine import not verified.

REC-04: ZIP CRC passed; a9fb79cq2j exit 0, original editor extracted and remote image built. Container rec04-cocos-auth started via 4usrnrua77, loopback only 127.0.0.1:16080, dedicated home volume, read-only editor and pilot. Public HTTPS access not enabled: no existing TLS listener/certificate found. Editor/import not yet verified.

2026-11-24 REC-04: noVNC is reachable at https://rikagro.ru:8443/vnc.html via standalone TLS Nginx gateway. Auth path repaired using /run/rec04-novnc/htpasswd without chmod of /home/gamedev; tested anonymous HTTP 401, authorized HTTP 200, authenticated WebSocket HTTP 101, unauthorized WS HTTP 401. rec04-novnc-expire.timer closes ONLY isolated gateway after 60 minutes; original Cocos container remains running. Termalin internal-site option unavailable because all 100 slots are occupied. Cocos account sign-in and Spine import not yet performed.

REC-04: isolated HTTPS gateway moved from 8443 to free port 443; local auth 401/200 verified; expiration timer preserved.

REC-04: smartphone noVNC connection confirmed; editor process exited after Dashboard initialization. Wine32, Mesa i386, winbind and X11 diagnostics compatibility image build 5jhuiamv3p in progress; GUI not verified.

REC-04: compatibility build 5jhuiamv3p installed Wine32 and Mesa i386; image export pending. Job 3kmmlto4s3 waits for image and runs isolated Wine smoke and six GUI window checks. Existing protected noVNC unchanged; editor window and import not yet verified.

REC-04: compatibility image export completed; Wine32 prefix initialized, OLE/RpcSs and hostname warnings remain. Jobs 5jhuiamv3p and 3kmmlto4s3 still running; six GUI checks not yet available. No noVNC switch performed.

REC-04: 5jhuiamv3p exit 0, Wine cmd Windows 10.0.19043 verified. 3kmmlto4s3 GUI test in progress; live X11 inspection found only DXGI/IME helper windows, empty NET_CLIENT_LIST, login server unavailable in offline test. Job 76nk2vxy59 launched with ordinary network, no published ports, --disable-gpu and no project argument to isolate Dashboard startup. Existing noVNC unchanged. Disk 9.3 GiB before test.

REC-04: user requested removal of experimental Cocos editor infrastructure. Wine/Linux Docker images, test containers, dedicated home volume, temporary HTTPS gateway and vendor downloads removed. Recovered assets, reports and pilot project retained. Editor import unverified; REC-04 remains open.

D-009: user approved direct HTML5/Cocos2d-JS route, superseding D-001 editor requirement. Preserve original and all recovered assets; editor-specific tasks deferred. VPS only, no public exposure before security audit. WEB-01 baseline tests job mz7j3fw0mf.

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

2026-11-24 Termalin stage 2: 34/34 suite passed in offline Docker; road map reread and extended. Production process unchanged. Next task: skill/action cooldown independence and safe game integration.

2026-11-24 Termalin: RTB-03 story server rollout using main source, compiled 4 beams, restarted rocbogini. HTTP briefly 502 during startup then HTTP 200, installed simulator smoke passed. User confirmed no production players. Roadmap reread and updated, continue work via Termalin on browser battle challenge/settlement and native concurrency.

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

NEXT roadmap approved: 28 stages, archived legacy roadmap, NEXT-003 static inventory generated; detailed screen/formula mapping pending. Original unchanged, VPS only.

NEXT-003: static screen/request/config/battle function mapping saved in reports/NEXT-003-mapping.json; manual classification and formula parity pending. No original changes.

NEXT-003: documented missing GenreEnergy baseline gap, original 3x3 positions per camp, turn ordering, attribute layers, economy and battle test contracts in reports/NEXT-003-findings.md. No original changes.

NEXT-003: isolated offline Elixir baseline 379 tests, 0 failures; four client protobuf cross-check branches skipped (Node unavailable). Exported 4 seeded battle reports and 3 attribute panel fixtures. Screen classification remains pending. Original unchanged.

NEXT-003: generated provisional migration coverage for all 657 explicit handlers and 1068 screen candidates. Manual review of indirect UI dependencies and unsupported RPCs remains; do not claim full coverage.

NEXT-003: UI dependency traversal and schema/handler gap inventory generated; ambiguous UI and unhandled schema requests require review. Original unchanged.

NEXT-003: all 270 schema gaps indexed by non-protocol client references and reference documentation. Runtime reachability remains unverified. See reports/NEXT-003-gap-review.json. Original unchanged.

NEXT-003 closed as inventory baseline, not full runtime parity. Deferred review assigned in reports/NEXT-003-deferred.json; final reconciliation NEXT-028. NEXT-004 active. Original unchanged.

NEXT-004: isolated Chromium SwiftShader smoke passed squad loading and sequential attacks; screenshot reports/NEXT-004-squad.png; visual inspection and cache/performance pending.

NEXT-004: shared Spine cache and responsive canvas built and browser-tested; software renderer metrics in reports/NEXT-004-cache-smoke.log. Cache eviction and visual inspection pending.

NEXT-004: reference-counted Spine leases; idle cache limited to 4 (provisional); browser test verified 10 active, 4 idle, successful reentry, zero errors. Long-run memory and visual QA pending. Original unchanged.

NEXT-004: 15 exit/reentry cycles passed after test HTTP server favicon handling; initial 404 retained in log. GPU memory and prolonged soak not measured.

NEXT-004: basic bounded hit VFX, damage label demo value 100, ticker cleanup; build and browser smoke passed. Visual inspection and effect-specific assertions pending.

NEXT-004: final smoke effect lifecycle PASS, but visual inspection of reports/NEXT-004-hit.png shows shadows and VFX instead of full heroes. Stage remains open; inspect atlas/skins and asset selection.

NEXT-004: fixed missing skin1 activation and centered pivot using library studio reference. Screenshot visually inspected: heroes visible, inconsistent apparent size remains; software renderer 50 FPS, zero errors. Stage open.

NEXT-004: body attachment bounds normalization for all 10 heroes; screenshot inspected, all visible at comparable body scale; software FPS 28, JS heap 22.3 MB, zero errors. Aura overlap and performance remain; stage open.

NEXT-004: three provisional quality presets, decorative attachment filter, particle counts and FPS caps; browser switch test passed. Visual verification of all presets and device profiling pending.

NEXT-004: persistent quality mode and auto downgrade after two 3s slow windows; browser smoke passed. Thresholds provisional, real device QA pending.

NEXT-004 accepted as rendering foundation after visual comparison of low/medium/high screenshots; all ten heroes visible. Aura art refinement NEXT-013; device profiling and long soak NEXT-027. NEXT-005 started.

NEXT-005: isolated Compose PostgreSQL 16 and Redis 7 healthy, no published ports; Redis ephemeral by design. API integration and migrations pending.

NEXT-005: storage pool, Redis client, readiness endpoint and initial transactional migration; isolated integration tests 3/3 passed, no skips. API container and shared contracts pending.

NEXT-005: non-root multi-stage API container healthy, isolated restart of all three services verified migration timestamp preserved and readiness HTTP 200. Shared contracts and final acceptance pending.

NEXT-005 accepted: shared contracts 4/4, isolated reference 379 tests passed including four JS decoder branches using reconstructed loader with numeric int64 mode (safe-range fixtures only). NEXT-006 started.

NEXT-006: migration 2 accounts/sessions, salted scrypt, hashed opaque guest tokens with 365-day expiration; isolated tests passed. No public auth routes yet; rate limits, registration and recovery pending.

NEXT-006: isolated registration/login/guest/session/logout routes and provisional Redis IP limit 30/min; integration tests passed. Email verification, guest linking, recovery, rate-limit dedicated tests and deployment pending.

NEXT-026: 1101 translated entries, +305 event/UI strings, placeholder/tag and codec roundtrip verified; new client localization draft only.

NEXT-006: Russian login preview built; browser smoke PASS at 320/360/768px, tabs, validation and preview error. API integration pending.

NEXT-006 progress: new Pixi client login/register/guest, auto-session restoration, logout, guest email+password linking, preserving account UUID and rotating bearer. Browser tests pass with mocked API. Server integration tests 9/9 against isolated PostgreSQL+Redis; private API container deployed healthy, /ready 200. Original remains HTTP 200. No production exposure, no email delivery/recovery, no full end-to-end browser-to-real-API test yet.

NEXT-006 ACCEPTED: new API isolated healthy; real-browser E2E guest -> email link -> recovery codes -> password reset -> reload -> new password login PASS. 10/10 server tests. Original HTTP 200. Server list currently one intentionally available test server; email verification out of scope while delivery disabled.

NEXT-007: migration 4, lazy profile and item initialization from original template, authenticated GET profile, 11/11 tests. Rename pricing, avatar editing, progression and client UI pending.

NEXT-007: original config exported, PATCH profile with atomic rename costs 0/100/300, name length 3-8, original icon/frame validation, 11/11 tests. UI and progression pending.

NEXT-007: Russian responsive profile UI and rename API integration built. Avatar placeholder, original portrait mapping not verified; browser integration and progression pending.

NEXT-007: 600 original XP thresholds and diamond rewards exported; atomic internal XP service, 12/12 tests; real browser profile rename/reload/mobile fit PASS. Avatar graphics and energy semantics pending; module unlock integration deferred to gameplay.

NEXT-007: 584 original UserInfo images SHA-matched to library, avatar/frame selector, real browser avatar change and rename PASS. Default frame 3101 missing native image, CSS fallback; intelligence item 7 dispatch resource, no invented campaign stamina. Remaining default frame mapping and final parity review.

NEXT-008 started: SHA-verified original city background from library, real profile/currency header, nine original module labels, navigation and battle return. Browser PASS at 320/360/768 widths. Unported modules explicitly marked, layout provisional. NEXT-007 remains open for frame parity.

Test stand: https://rikagro.ru/testtest/ uses isolated Next API and database. Publish verified stages with tools/publish_testtest.sh. Public temporary preview, no production cutover.

User decision: follow original approved 28-stage sequence; graphics within each stage, final visual polish NEXT-026; publish verified increments to testtest.

NEXT-007 functional acceptance: real API avatar/frame/rename persistence PASS; default frame 3101 visual fallback deferred NEXT-026, XP reward callers and dispatch gameplay at their respective stages. Published testtest. NEXT-008 active.

NEXT-008 original five dock destinations, separate mail/friends/rank/bag/task shortcuts, modal shell, real browser PASS, published testtest. Original atlas graphics and real notification state still pending.

NEXT-008: eight atlas sprites extracted from SHA-matched library texture; seven used in dock and shortcuts. Browser PASS; published. Remaining city graphics, notifications. NEXT-013 provisional impact timing 45%, user accepted preview; exact per-animation timing deferred.

NEXT-008: user requested original UI reconstruction. 23 original MainUIPanel atlas sprites extracted with SHA verification, Header/Bottom and hexagon frames integrated. Responsive browser PASS; published. Prefab geometry, remaining window frames, notification state and exact visual parity pending.

NEXT-008: extracted 184 MainUIPanel node records into public/city/prefab-layout.json; applied original Header/Dock proportions, dock centers and currency coordinates. Browser PASS 320/360/768; published. Full hierarchy/anchors and modal graphics still pending.

NEXT-008: imported 10 SHA-verified Common atlas sprites with capInsets metadata; applied nine-slice modal/profile borders, title and close button. City/profile browser PASS, published. Exact prefab-specific frame selection, remaining city geometry and notifications pending. NEXT-007 provisional portrait scale 74% verified functional.

NEXT-008.1: extracted nine module IDs, coordinates and sizes from MainScenePanel prefab into src/city/sceneLayout.ts; replaced grid with responsive mapped coordinates. Browser PASS, published. Vertical coordinates normalized to available area; exact scene camera and individual module graphics pending.

NEXT-008.2 partial: paginated visual avatar/frame picker added, original thumbnails and real PATCH API; existing profile regression PASS, published. Direct picker interaction test and exact original picker geometry pending; numeric selects retained. NEXT-008.1 individual module sprites still pending.

NEXT-008.2: filtered profile manifest against original server IDs (579 resources), removed numeric selects, sorted visual picker, added default frame option. Direct picker selection and persistence browser PASS after sorting fix; published. Original picker geometry and animated frames pending.

NEXT-008.2: original HeadFrame table (130 rows) verified in isolated Elixir reference. Only HeadFrame 3177 has Effect=UI_effect_TXK_wujingzhidian. Spine 3.8 skeleton, atlas and texture copied with SHA256 checks from Lunex Asset Library and mapped to original animation Ani_UI_effect_TXK_wujingzhidian. Profile now renders actual Spine overlay only for 3177; 129 other frames remain static (correct). Playwright with actual Next API checked frame selection, animation canvas, reload, removal, viewport; profile/city regression PASS. Published https://rikagro.ru/testtest/, original game HTTP200. NEXT-008 remains in_progress: exact original window/picker prefab, city building sprites, notifications and visual QA pending.

Решение пользователя: графическую полировку отложить до NEXT-026. Существующие ресурсы сохранить. NEXT-008 завершать по функциональным критериям: навигация, десятый вход 1055, адаптация, корректные состояния; реальные уведомления и ограничения подключать при реализации соответствующих механик. NEXT-009 и далее сохраняют порядок. Не задерживать перенос механик ради декоративного соответствия. NEXT-013 сохраняет обязательную синхронизацию попаданий и боевых событий.

NEXT-008 functional acceptance: all nine active city entrances tested; original tenth module 1055 inactive and shares Angels coordinates, retained as deferred metadata. Profile and navigation regression PASS; published. Visual polish NEXT-026; real notifications and unlocks with feature slices. NEXT-009 started.

По решению пользователя NEXT-009 отложен до NEXT-024. NEXT-010 начат. Сохранять редактируемые конфигурации и разделение UI/логики.

NEXT-010: exported original hero and skill tables from isolated reference: {'BuffBase': 19623, 'BuffDescription': 2019, 'FormationType': 12, 'HeroBase': 354, 'HeroLevel': 1340, 'HeroLevelAttribute': 198, 'HeroStar': 12, 'SkillBase': 10948, 'SkillEffect': 17119}. SkillBase/SkillEffect/BuffBase/BuffDescription are actual sources, not Skill. Integration pending.

NEXT-010: 354 original hero records projected into typed TypeScript catalog; read-only list/detail API tested and deployed. Ownership, skill unlock logic and client hero screen pending.

NEXT-010.2: original three starter heroes, migration 5, atomic collection initialization and authenticated GET /v1/heroes. Persistence/isolation tests passed; deployed. Third hero power zero retained pending recalculation. Client screen pending.

NEXT-010.3: functional heroes screen with actual authenticated collection, original three library portraits and Russian names, stored attributes and skill IDs. Browser tests passed and published. Skill descriptions and attribute recalculation pending.

Решение пользователя: собственные фантазийные имена вместо оригинальных/обычных имён. 11303 Аэлирис, 12301 Вейрисса, 12402 Селестари. ID и баланс сохранены. Браузерный тест PASS, опубликовано. Остальные имена назначать при переносе каталога.

NEXT-010.4: base attribute, growth, star, passive skill unlock and weighted power TypeScript calculation matches 72 original Elixir fixtures. Existing stored template stats differ from base-only calculation; do not overwrite until equipment/team and other modifiers are audited.

NEXT-010.5: base calculation and skill slots exposed in authenticated API; seven starter skill descriptions translated, fantasy names, unlock levels displayed, base stats separately from stored stats. Tests passed and published. Other heroes localization and complete modifiers pending.

NEXT-011.1: six original player formations 101–106, six slots, original default 1001/1002, migration 6, authenticated GET/PUT, ownership and duplicate validation, atomic stored power sum. UI pending. NEXT-010 residual modifiers/localization remain open.

NEXT-011.2: touch formation editor, original six layouts, real hero portraits, assign/move/remove, save/reload verified, published. Battle integration and unsaved changes confirmation pending.

NEXT-011.3: internal battle snapshot from saved formation, original positions, initial attrs, active/passive skills and cooldowns. Two stored starter units match Elixir exactly; third requires full HeroAttrs.compute (reference HP370), deliberately rejected until ported. Empty formation rejected. Tests passed. Not exposed publicly; row bonuses and skins pending.

NEXT-011 done for starter scope: original team bonuses and level/star scores reproduce all three starter battle units exactly. Fallback restricted to matching starter identity/level/star. Full dynamic modifiers, row bonuses, skins and unsaved-change prompt deferred to corresponding mechanics. NEXT-012 in progress. 19 tests passed. Internal code only, no deployment.

NEXT-012.1: internal round scheduler with original speed/camp/station ordering, fixed round order, dead skip, winner priority and timeout, immutable input, round hooks. 22 tests passed. Actual actions, queue, buff speed and report protocol pending; not deployed. NEXT-026 visual parity: original rectangular hero cards, 4-column grid, faction/class icons, stars, filters, original UI atlas.

NEXT-012.2: Target.ex rules ported to TypeScript, row/column/neighbor/self/dead/previous target selection, priorities and count. 25 tests passed. Random source injected; exact Elixir RNG parity and live battle integration pending. Original Target.ex itself documents inferred meanings of some target types. No deployment.

NEXT-012.3: pure hit formula from Battle.hit, physical/magical/true/elemental, dodge, crit, penetration cap, faction, PvP, multiplier floor and variance. 28 tests passed. Effective attribute hook, RNG injection. HP application, shields, special damage and Elixir differential fixtures pending. Not deployed.

NEXT-012.4: action planning, original 10948 skill configs, 295 model animation configs, 82 multi-hit actions, cooldown consumption/tick, normal fallback, taunt/disable hooks, effect group placement and split damage. 30 tests passed. Effect execution and buff triggers pending. No deployment.

NEXT-012.5a: imported 19623 BuffBase and 17119 SkillEffect projections; attribute stacking, dynamic HP-based modifiers, immunity, tags, trigger limits, expiry and temporary cleanup. 32 tests passed. Effect execution, stacking application, trigger dispatch and conditions pending. No deployment.

NEXT-012.5b partial: buff application for 601/111/371/345/117, stack cap, refresh, proportional HP, removal, control chance and fail-closed unsupported effects. 34 tests passed. DOT, trigger dispatch, HP expiry integration, conditions and damage execution pending. No deployment.

NEXT-012.5c partial: trigger dispatch, relative event codes, recursion guard depth 4, source attribution, round-end 502 and expiration 1, cooldown tick. 36 tests passed. Effect execution callback only; DOT/HOT actual damage, conditions and integrated round loop pending. No deployment.

NEXT-012.5d partial: original special damage 118 formula, base params, caps, resistance, tagged modifiers, trigger integration test with isolated unmitigated HP sink. 38 tests passed. Production mitigation/death pipeline, tag modifier application and named DOT parity pending. No deployment.

NEXT-012.6a: HP damage mitigation, immunity, counted and HP shields, ratio/flat reduction, hit cap, lethal guard, healing modifiers/overflow and revival. 41 tests passed. Buff configuration attachment, guard skill dispatch, death events, periodic integration and full parity pending. No deployment.

NEXT-012.6b partial: shared execution for 101/102/105/137/118/103/104/119/112, normal and periodic damage through same mitigation, heal overflow and accumulated damage, round-end DOT/HOT integration tests. 43 tests passed. Full SkillEffect traversal, defense buff attachment, death events and extra actions pending. No deployment.

NEXT-012.6c partial: automatic simulation connects round order, original skill/effect/buff traversal, supported instant effects, buff application and round-end triggers; deterministic integration test. 44 tests passed. Unsupported conditions/effects recorded; defense attachment, passive/death events, exact RNG, multi-hit report and parity pending. No deployment.

NEXT-012.6d partial: defense buff configuration opcodes 405/411/412/413/501/502/504/602/603 attached through applyBuff, simulation base value integration, stacked shield test. 45 tests passed. Passive initialization, death events, extra skills and squad parity pending. No deployment.

NEXT-012.6e partial: initial passive skill traversal, round start 501 and preturn 163, temporary cleanup, stun/silence/crit tags, two-by-two simulation test. 46 tests passed. Passive-specific fixtures, death events, extra actions, taunt and full parity pending. No deployment.

NEXT-012.6f partial: shared round trigger engine, damage/heal/revive/death reactions, death buff cleanup, bounded extra skill queue (12), lethal guard skill queue. 47 tests passed. Exact event context, extra action type/target semantics, dedicated counterattack fixtures and parity pending. No deployment.

NEXT-012.7: versioned internal result summary, original outcome codes 2/3/4, sorted hero final HP/buffs and damage/hurt/healing, aggregate camp statistics. 48 tests passed including victory/defeat/timeout. New JSON summary is not original protobuf, no rewards or public endpoint, full parity pending. No deployment.

## Правило приёмки этапов (2026-11-24)
Каждый этап закрывается только после выполнения 100% утверждённого объёма, интеграционных проверок и документирования доказательств. Исключения только по отдельному согласованию. NEXT-012 остаётся in_progress; переход к NEXT-013 заблокирован до полной приёмки. Ранее начатые этапы не считать доказательством полной готовности.

NEXT-012 acceptance audit: configuration opcode inventory saved to reports/NEXT-012-completion-audit.json. Counts are static, not proof of runtime support. Next: condition languages, missing start/trigger opcodes, mixed effects, targeting and differential tests. Acceptance gate remains closed.

NEXT-012 completion: effect conditions 1–5 and logical markers ported from Elixir; integrated in simulation. 49 tests passed. Unknown catalog codes 101/400/700 remain unresolved; first-action semantics for extra actions require parity checks. Gate remains closed.

NEXT-012: start conditions 1–7,10,11 ported and integrated, 50 tests passed. Client BattleConsts identifies effect condition 101 Field, start 8 MemberElementCount and 12 BattleTagType, but no execution semantics located; effect 400/700 and start 28 unnamed. Remain unresolved, no invented semantics. Gate closed.

NEXT-012: trigger condition evaluator ported and connected. 51 tests passed. Event metadata propagation and unsupported codes remain; gate closed.

NEXT-012: damage/heal events now carry skill, buff, value and provisional attack type metadata; passive and extra skill IDs propagated. 51 regression tests passed. Exact attack type mapping, buff lifecycle events and dedicated integration fixtures remain. Gate closed.

NEXT-012: corrected SkillAttackType mapping from BattleConsts and Elixir action/queue: normal turn 1, queued skill uses configured type, passive 0. 52 tests passed. Guard type, instant extra skill semantics and end-to-end event parity remain unverified. Gate closed.

NEXT-012: partial stack removal, dispel 113, removal 115/116/131, before-dispel 2, attach 157 and control 124/146, fresh duration based on turn/end phase. 53 tests passed. Mixed instant/persistent effects, replacement 122 and differential parity remain. Gate closed.

NEXT-012.9: ordered mixed instant/persistent effects, replacement 122 with depth guard, event 121, lethal attachment guard. 55 tests passed. Replacement integration parity and immediate skill 120 remain unverified. Gate closed.

NEXT-012.10: skill 120 instant vs animated queue, -1/-2 aliases, event target ordering 2/7, depth 8 and queue limit 12. 56 tests passed. Guard attack type and end-to-end action triggers/parity remain unverified. Gate closed.

NEXT-012.11: taunt tag 15, animated action lifecycle events 153/101/102/154/155/123/144/162/161/503, target metadata and temporary cleanup. 56 regression tests passed. Dedicated differential action fixtures and head/tail modifiers remain. Gate closed.

APK-002 isolated prototype built; no deployment or server changes.

APK 0.2 built with static manifest and resource store; no production changes.

NEXT-012.12 partial: max HP damage 106 with boss cap, skill head/tail modifiers 373/374. 58 tests passed. Remaining unsupported effects and description events require audit; gate closed.

APK 0.3 built; production unchanged.

Approved priority change: NEXT-010 full hero asset catalog first, then effect mapping and hero editor, then resume NEXT-012.12. Exact-name audit recorded in reports/NEXT-010-hero-assets.json; ambiguous matches require verification. No runtime assets copied yet.

NEXT-010.2: original HeroBase only; exact boss/angel naming variants from Queen Blade library; verified skeleton and texture hashes for unique matches; public hero-asset-map.json metadata only. Ambiguous and missing models remain unresolved.

NEXT-010.3 partial: 272 original models linked from verified library (228723187 bytes), lazy Spine preview with search and animation selection published at /testtest/hero-preview.html. Build and HTTP checks passed; visual browser validation and 24 unresolved models remain. Main game unchanged.

NEXT-010.2/3: original HeroSkillConfig BundleName exported for all 296 models, resolves ambiguous candidates and four missing aliases; published updated verified model map and original animation event timelines. Browser visual checks and effect rendering pending.

NEXT-010.5 partial: skill effect map generated from original bundle dependencies and exact animation names; verified single-page Spine assets linked and published. Missing/ambiguous effects recorded, playback not yet implemented.

NEXT-010.5: multi-page Spine atlas support implemented; 202 additional effect mappings imported (25 assets), build and HTTP manifest check passed. Browser rendering still unverified. 95 mappings remain.

Generated Android resource packs in runtime/client/android-packs; no service restart.

NEXT-010.5: decoded original SkillEffect prefab skeleton UUID references including packed Cocos imports; 1697/1750 mappings, 287 assets, zero ambiguous, 53 missing across nine models. Published manifest; visual playback pending.

NEXT-010.5: recovered nine original effect skeletons and texture sets; Spine 3.8 binary parser verified 47 additional animation names, 1744/1750 matched. Six names absent from original referenced skeletons; browser texture/render validation pending.

NEXT-010.5: four explicit original-skeleton naming aliases recorded separately from 1744 exact matches; two unresolved Culot3501 names remain. Alias visual parity unverified.

NEXT-010.6 partial: hero preview extended with actual Spine skin selector, per-model effect preview including aliases, JSON export. TypeScript and Vite build passed, HTTP published. No server persistence or browser visual verification yet.

NEXT-010.6.2 partial: local timeline editor reads original skills, edits start/duration/offsets/layer/follow flags, highlights events on playback clock, resets and exports original plus draft JSON. TypeScript/Vite and HTTP passed. No synchronized Spine playback, server writes or browser test yet.

NEXT-010.6.3 partial: effect preview drag with pointer capture, X/Y/scale/rotation controls, origin marker, reset and export placement. Layer flag export only; coordinates preview-local. TypeScript/Vite/HTTP passed; browser interaction unverified.

NEXT-010.6.4 partial: two-actor timeline preview with selectable opponent, original animation events, effect layers, offsets and demonstration hit counter; movement/audio/damage and exact positioning pending. TypeScript/Vite/HTTP passed; browser rendering unverified.

NEXT-010.6.5 partial: migration 7 and append-only studio draft storage, optimistic revision checks with transaction lock, history and restore as new revision; PostgreSQL integration test passed. No public write routes or UI persistence until admin authorization.


NEXT-010.6.6: linked-account admin allowlist (migration 8), live-session authorization and rate limit, isolated studio GET/PUT/restore, version conflicts/history, hero and skill draft UI. Full backend test suite 60/60 passes; TS and Vite pass. Deployed only next API and test page; studio public request without bearer 401, Next ready 200, original game HTTP 200. No administrator has been provisioned automatically; original game content remains unchanged. Browser UI and on-device interaction not yet verified.

NEXT-010.6.6: studio_admins role-gated server API (me, history, save and restore) now deployed to isolated next API, editor login and revision controls built; full 60/60 integration tests pass including non-admin denial and revision conflict, original game HTTP200. No admin has been assigned automatically. Browser visual acceptance pending.

NEXT-012.13 partial: original BuffBase/BuffDescription export used for description events 125/128 (report types 23/24), separate simulation description journal; persistent 373/374 attachment and group ordering tested. Full suite 62/62 passed. Client rendering and original report differential verification pending; parity gate remains closed.

NEXT-012.14 partial: dodge emits 158 and counts as attacked; element damage 137 no longer emits ordinary attack reactions; passive silence and death listener extra-skill tests added. Full suite 64/64 passed. Differential battle report and dodge integration fixtures pending.

NEXT-012.15 partial: shield absorption report type 4 journal, death guard description and guard skill ordering aligned to reference; combined shield and low-HP guard regression tests. Full suite 66/66 passed. Client rendering and differential reports pending.

NEXT-012.16 partial: healing overflow and full-HP heal reactions aligned, recovery journal types 5/7/22 added, damage-based healing and blocked-overflow regression tests. Full suite 68/68 passed. Nested extra-effect report parity and client integration pending.

NEXT-012.17 audit: static effect inventory reports/NEXT-012.17-inventory.json; distinguishes reference-handled and reference-skipped candidates, no parity claims. Baseline 68/68 tests. Next: differential fixtures and shared action context for trigger effects; parity gate remains closed.

NEXT-012.18 partial: trigger 117 resets selected/all cooldowns; 111/601 trigger accumulators explicitly discarded as in reference fire(). Regression suite 69/69. Differential real battle fixtures still pending; parity gate closed.

NEXT-012.19 partial: isolated Elixir reference and TypeScript comparison on stage 100101, four seeds, identical initial units; 4/4 winner and round count match, no unsupported issues. RNG algorithms differ; exact hero stats and skill sequence parity not established. Export and comparison scripts saved, gate closed.

NEXT-012.20 partial: OTP 27 exsss BigInt port matches 3200/3200 reference RNG draws; 100/100 stage 100101 battles match result, rounds and final per-unit HP/damage/hurt/healing exactly. 70/70 tests. Same stage and lineup only; diverse stages, bosses, skill sequence and production RNG wiring pending; parity gate closed.

NEXT-012.21 partial: 120 comparative battles across 12 campaign maps, two formations, five seeds. 115/120 exact final metrics, 120/120 winner and rounds, zero reported unsupported issues. Five mismatches on map 100134 require trace comparison. Same three starter heroes, no dedicated boss coverage. Gate closed.

NEXT-012.22 partial: fixed premature StartWorkCondition evaluation before chance draw, matching reference try_apply order. Replayed all 220 fixtures: 220/220 exact final metrics; 70/70 tests. Dedicated boss and diverse hero coverage pending, parity gate closed.

NEXT-012.23: 80 synthetic six-v-six comparisons using 24 original hero IDs, levels 60/120, 38 distinct passive skills, 40 normal and 40 boss-flagged scenarios. 80/80 exact final metrics. Eight diagnostic categories remain (reference skip/false candidates); real boss encounters and event sequence parity pending. Gate closed.

NEXT-012.24: reference source confirms start effects 301/372/403/414/505/506/615 skipped and unknown trigger 11/start condition 8 false. Retained diagnostics. 72/72 real AllianceTest boss-map fixtures match final metrics and animated action sequence (round, actor, skill, targets). Synthetic attackers, not full guild handler; campaign bosses and hitpoint event parity pending. 70/70 tests. Gate closed.

NEXT-012.25 partial: added animated action hitpoint damage/dodge trace, original split and extra damage classification, fixed effect chance before condition. 72/72 boss damage-event sequences and 372/372 final metrics match, 70/70 tests. Healing/shield/death/buff event ordering, instant pages, API wiring and campaign bosses remain pending; gate closed.

Landing refresh: eight original Spine models in two showcases, rotating burst attacks, decorative particles, offscreen ticker suspension, NEXT-012.25 metrics. TypeScript/Vite and HTTP 200 verified; browser visual QA pending.

Landing: six original UIHeroAvatar Dynamic portraits, touch pan-y and pointer-events none on canvas. Build and HTTP verified; browser/mobile QA pending.

NEXT-012.26 partial: added shield, heal, revive and death to animated hitpoint trace. 72/72 boss fixtures match expanded health-event sequence (838 heals, 403 shields, 25 deaths; no revives or extra heals in sample). 70/70 tests. Buff lifecycle, instant pages, revive coverage and API wiring pending; gate closed.

NEXT-012.27 partial: animated visible buff add/remove events, stack count, counted shield versus numeric shield event ordering, death cleanup. 72/72 expanded event comparisons (6831 adds, 407 removes), 372/372 final metrics, 70/70 tests. Instant pages, revive cleanup and dedicated expiration/refresh coverage pending. Gate closed.

NEXT-012.28 partial: ordered round-start, pre-turn instant and round-end health/buff event pages; revive cleanup emits visible buff removal; dead actor after pre-turn trigger cannot act. 72/72 full selected event page sequences, 372/372 final metrics, 70/70 tests. Dedicated revive fixtures, description events, report metadata and API pending. Gate closed.

NEXT-012.28.1: integrated description event types 23/24 into report pages; corrected instant skill extra flag inheritance. 72/72 boss page sequences including 11214 description events; 15/15 synthetic revive scenarios with original skill IDs 1150530,1350130,1355310 (10 actual revives, boosted enemy HP and initially dead ally). 387/387 final metrics, 70/70 tests. Campaign bosses, full report metadata and API pending. Gate closed.

NEXT-012.29: original MapBase inventory: 2241 type-1 campaign maps, none marked IsBossBattle; 400 type-3 maps marked IsBossBattle. Sampled 24 maps of each, two synthetic six-hero formations, three seeds, original Unit.stage defenders without overrides. 288/288 final metrics and selected report event pages, cumulative 675 unique fixtures, 70/70 tests. Not exhaustive map coverage; handler progression, report metadata and API remain pending. Gate closed.

NEXT-012.30 partial: authenticated POST /v1/battle/preview uses server-owned formation, original Unit.stage export for 2241 maps, server RNG, ordered pages and summary. Stage lock and 12/min/account rate limit. No rewards or progression mutation. 71/71 tests, deployed isolated API. JSON data file avoids TypeScript heap exhaustion. Full report metadata, authoritative progression and acceptance pending; parityReady remains false.

NEXT-012.30.1 partial: migration 9 persistent challenge reports, single pending battle, transactional settlement and first-clear uniqueness, idempotent retries, original 2241 MapAdventure reward/level/next records, XP and level rewards, intelligence cap. Integration test concurrent settlement and replay, 71/71 tests. Deployed isolated API. Idle settlement, module unlocks, cancel/recovery endpoints, retention and full acceptance remain pending; parityReady false.

NEXT-012.30.2: authenticated pending report recovery and battle-ID-specific cancellation, serialized with settlement using profile row lock. Tested report equality, account isolation, stale cancellation, replacement, repeated cancellation, no reward/progress changes. 72/72 tests, deployed API. Recovery returns full report from beginning, not client playback timestamp. Idle/module integration, retention and acceptance pending.

NEXT-012.31 partial acceptance: reran 675/675 fixtures with all available comparison fields, 72/72 tests. Added per-page HP/death/visible buff snapshots and API finalPage type 99. Snapshot parity not yet compared. 17 diagnostic categories require classification; event Params, RoundSkills/RoundBuffId, hero metadata, idle/module integration and retention pending. Gate remains closed.

NEXT-012.31.1: original per-page HeroStatus differential export, 16771/16771 snapshots across 375 existing fixtures (72 alliance, 144 campaign, 144 type3, 15 revive). HP, max HP, death and visible buff IDs/counts match; buff ordering normalized. Reusable comparator and four export scripts saved. Remaining report metadata/Params and diagnostic classification pending. Gate closed.

NEXT-012.31.2: extra damage event Params carries source actor ID, empty params normalized for other events. 39114/39114 events across 72 alliance fixtures match including Params. All 17 observed diagnostic categories classified against reference fallback: 14 start effects skipped, 3 conditions false; diagnostics retained, not proof of original commercial engine completeness. 72/72 tests, isolated API deployed. Remaining round metadata, hero identity, broader Params checks, idle/modules and retention. Gate closed.

NEXT-012.31.3 partial: roundSkills first ready active per living unit, roundBuffId=0 for tested campaign/alliance maps. 1080/1080 original round metadata comparisons, 72/72 tests. Added hero report metadata with original monster sid/star/skin/skills export for 2241 maps and initial/final stats. Hero metadata shape integration-tested, not fully differential. Nonempty MapType.RoundBuff exists (e.g. type4), application not implemented; explicit remaining gate item. API deployed.

NEXT-012.31.3.1: optional round buff schedule applied before event501, living units sorted by ID, unchecked application. Original ten map types share ten escalating 601 buffs at rounds6-15. Six synthetic 15-round map7 fixtures match final metrics, event pages and all 60 nonzero round buff IDs; 72/72 tests. Campaign API unchanged schedule empty; future noncampaign routes must supply schedule. Generic arbitrary round buff effects not verified. Gate remains closed.

NEXT-012.31.4 partial: migration10 persistent idle points/rewards and unlocked modules. First clear settles old-stage rates before stage change in same transaction; winning settlement refreshes eligible modules. Original config exported; base non-VIP rates and weighted random libraries supported. 72/72 tests including 10-minute accrual and replay invariance. VIP/tower/highest-power history, claim/quick battle API and full differential economy tests remain NEXT019/014; module initial refresh pending. Reference idle formula itself is approximate per source. API deployed.

NEXT-012.31.4.1: independent regression tests for split idle accrual, fractional carry, zero-minute stage change, strict module threshold 1053, 720-minute cap and idempotent module refresh. 75/75 tests. Test fixture initializes profile before refresh (lazy profile creation). No runtime changes; VIP/claim and full module lifecycle remain later stages.

NEXT-012.31.4.2: compact full report to archived marker transactionally on settlement, cancellation or replacement; pending report remains intact, settlement receipt and battle ID retained for retry/expired semantics. No historical bulk cleanup, no row deletion, receipt growth remains; long-term retention policy requires separate decision. 75/75 tests including compacted reports and existing recovery/isolation/idempotency. API deployed.

NEXT-012.31.5 partial acceptance: 681/681 unique reference fixtures, 16771/16771 status snapshots, 39114/39114 Params events, 75/75 tests. Fixed comparator to filter actual events by historical fixture event scope (no simulation change). Remaining hero identity differential, round metadata regression and broader Params coverage before gate; noncampaign and visual integration later. No claim of commercial engine completeness.

NEXT-012.31.5.1: extracted shared reportHeroes serializer; 375 existing reference battles checked for 3132/3132 hero records (18 fields), 2131/2131 round-start metadata records and 68712/68712 events including Params. 75/75 tests; API deployed. Tested reference battle/report scope accepted for NEXT013 visual integration; full commercial parity, player modifiers, noncampaign routes and visual acceptance remain unverified; parityReady stays false.

NEXT-013.1 partial: authenticated report client challenge/pending/cancel/settle, ordered event inspection and authoritative HP snapshots in technical campaign screen, old animation demo retained separately. TypeScript/Vite build and HTTP200 verified; browser interaction and Pixi scene binding pending. No client damage calculation.

NEXT-013.1.1 partial: server report drives original Spine model selection, ActionIndex timeline animation and indexed hit timing, target damage labels and death/revive visibility, authoritative page snapshots. Manual page advance waits for animation completion. Temporary layout/background, missing timeline fallback, no original VFX or browser acceptance yet. TypeScript/Vite and HTTP200 verified.

NEXT-013.2 partial: recovered 19 original BattleBg WebP assets by UUID/version, verified hashes and image decode, all 2241 campaign maps covered. Ported BattleHelper station map, camp orientation and original .875 avatar scale, depth sorting, 1080x1920 viewport with centered 2520 background. Viewport origin and crop provisional, visual browser acceptance pending. Build and HTTP200 verified.

NEXT-013.3 partial: corrected one-based ActionIndex from AJBattleViewPort/Skills.hit_count; all PlayAction timeline events, MoveTo/MoveBack reference coordinates, quartic easing and blink thirds, cleanup of motion frames, stable fallback hit timing. 8/8 pure motion assertions, TypeScript/Vite and HTTP200. Browser acceptance, common skill models, death animation and VFX remain pending.

2026-11-25: synchronized canonical roadmap, Markdown table, current status, public landing and GitHub documentation; NEXT-013.3.1 next, NEXT-012 limited reference acceptance only.

Landing refresh: curated two visible character assets from user screenshot, solo cards, duo scene, combat showcase, lazy portrait initialization. Build/HTTP verified; browser visual acceptance pending.

Landing v3: explicit game entry URL, replaced cropped card illustrations with original full combat models, dark fantasy palette and 18+ label. TypeScript/Vite and HTTP verified; visual and click acceptance pending.

Landing v4: nine distinct models, seven alternating gallery scenes, two requested exact assets, lazy canvas loading. Build and manifest verified, visual acceptance pending.

NEXT-013.3.1 partial: original AJBattleActor death opacity sequence 1000ms, revive delay/fade 500ms, hurt return 200ms, per-unit tween cancellation and authoritative snapshot reconciliation. 9/9 lifecycle assertions, TypeScript/Vite and HTTP200. Common Core/Pet model lookup and browser acceptance remain pending.

Fixed session HTTP404 caused by missing VITE_NEXT_API_URL in manual builds; default now derived from Vite BASE_URL. Public session endpoint 401 without token, ready true, compiled API path verified. No account changes.

Battle screenshot fixes: automatic sequential playback, pause after current action, service page labels instead of actor 0, ground positions shifted 260 design pixels down; movement center aligned. Build passed, visual acceptance pending.

NEXT-013.3.2 partial: exported 249 Core/Pet skill mappings and 63 original timelines, client selects CoreModel and one-based ActionIndex. Angel actor assets and common skill VFX remain pending; no browser acceptance. Build and public manifest verified. Next NEXT-013.4.1.

NEXT-013.4.1 partial: original Spine effects types 2/6/8 loaded per action before playback, timed layers, hit target selection, offsets and cleanup. Team/multirow references approximate; common assets, projectiles and browser acceptance pending. TypeScript/Vite and HTTP200 verified.

NEXT-013.4.2 partial: original type7 Spine projectiles per server target, linear flight, rotation, original duration, layer and cleanup. Target HUD offset temporarily 90px; common effect assets and browser acceptance pending. TypeScript/Vite and HTTP200. Next 013.4.3.

NEXT-013.4.3 partial: original type9 dark_screen (190/255, 200ms fades) and shock_screen (30ms, 6px vertical/3px horizontal approximate deterministic shake), 967 hero timeline events. TypeScript/Vite HTTP200. Browser acceptance pending; next sound.

NEXT-013.4.4 partial: 1669/1733 original sound events mapped through bundle dependencies, 328 unique clips, timeline playback and volume slider. 64 unresolved events, browser autoplay and audible acceptance pending. TypeScript/Vite and HTTP200. Next NEXT-013.5 HUD.

NEXT-013.5.1 partial: per-actor HP bars, buff count, damage/heal/crit colors, event-based approximate HP with authoritative page reconciliation. Fixed HUD height 175px, energy absent from report, original buff icons and visual acceptance pending. TypeScript/Vite HTTP200.

Cursor handoff: NEXT-013.5.2; stale roadmap headers and missing original path corrected; docs/CURSOR_HANDOFF.md added. No game code changed.

NEXT-013.5.2 partial: HeroBase HUDOffsetY+15 per actor (10 distinct values), BattleBuffList 834 icons via DescriptionId, HP semantics (incl. share/shield/dodge/revive) and buff add/remove events, original float digit/label atlases. Energy researched: no hero energy bar; PetEnergy only with PetId; not invented. TypeScript/Vite/publish HTTP200; health tests 4/4. Chromium/Playwright unavailable — visual/mobile acceptance open. Matrix reports/NEXT-013.5.2-hud-matrix.json. Next NEXT-013.6.

NEXT-013.6 partial: unified gameClock with real pause and x1/x2/x3 driving timers, motion, Spine timeScale and audio rate; auto-battle respects pause. Original multipliers 1.3/1.7/2.4 documented as difference. Clock tests 3/3; TypeScript/Vite/publish HTTP200. Chromium QA open. Next NEXT-013.7.

NEXT-013.7 partial: ResultScreen with win/lose, rewards, squad damage/hurt/heal stats; auto-settle after final page; server settle idempotency already covered by battleRoutes tests. Original WinBoard art and Chromium QA open. Next NEXT-013.8.

NEXT-013.8 in_progress: inventoried 10 invalid common-skill ActionIndex values; client skips invalid timelines. Visual/mobile acceptance blocked without Chromium/Playwright. Residual list reports/NEXT-013.8-residuals.json.

2026-11-25 D-011: owner accepts NEXT-013 visual QA personally; close 013.8/013 for roadmap advance. NEXT-014.1: exported AdventureChapter+MapWorld via next-audit; shipped campaign-chapters.json, campaignRoutes GET /v1/campaign, CampaignScreen; City label Кампания; 77/77 tests; API rebuild; testtest publish. Evidence reports/NEXT-014.1-*.
2026-11-25 NEXT-014.1.1: fixed TypeError buffs not iterable — report.heroes lacked buffs; HUD init crashed after first unit so enemies missing. Normalized buffs in validateReport/createHud/applyHealth. reports/NEXT-014.1.1-*.
2026-11-25 SINGLE-PROJECT-001 + AUDIT-001…018 (critical/partial): settlement state, campaign terminal 105701, clears/NextId, revive semantics, multi-tex wiring, clock order, floats, volume, Squad removed, HUD HTTP, ActionIndex0 documented, disk hardlink reclaim 90%→85%, publish script, GIT_MIGRATION_PLAN. Evidence reports/CURSOR-AUDIT-FIXES.md.
2026-11-25 NEXT-014.2: MapWorld world map UI + locale names (en.json MapWorld_name_*), worldStatus API, spine multi-texture load, 81/81 tests, testtest publish. Evidence reports/NEXT-014.2-*.
2026-11-25 NEXT-014.3: campaign map guides (RU locale_ui_guide_*) + StoryChapter tab + StoryDialog; export tool; 82/82 tests; publish. reports/NEXT-014.3-*.
2026-11-25 NEXT-014.4: GuideGroup sequencing, player_guide_groups, tutorial API/UI; 83/83 tests; publish. reports/NEXT-014.4-*.
2026-11-25 NEXT-014.5–014.14 batch: MapAdventure Type=2 (449 bosses), enemy/reward preview, module+item names, WinBoard, campaignComplete, chapter heros, stage labels, tutorial skip; campaign-map-meta.json; 84/84 tests; API deploy + testtest publish. reports/NEXT-014.5-14-*.
2026-11-25 Settle white-screen hotfix (Pixi teardown/ResultScreen boundary) published.
2026-11-25 Plan A: RU StoryChapter titles, plot-video stub, GET /v1/inventory + InventoryScreen; 86/86; publish. reports/NEXT-014-tails-015-*.

2026-11-25 NEXT-015.2: ItemIcon hardlinks (3724), POST use/sell, InventoryScreen actions; publish testtest. reports/NEXT-015.2.md.

2026-11-25 NEXT-016.1: hero level/star growth MVP; HeroLevel costs; publish. reports/NEXT-016.1.md.

2026-11-25 NEXT-016.2: star fodder + MaxStarLevel; auto-pick; publish. reports/NEXT-016.2.md.

2026-11-25 NEXT-016.3: PVE talent upgrade/reset; publish. reports/NEXT-016.3.md.

2026-11-25 NEXT-016.4: hero job unlock/switch/reset (★12 roots); publish. reports/NEXT-016.4.md.

2026-11-25 NEXT-016.5: luck skill study/upgrade/clear (★11/12); publish. reports/NEXT-016.5.md.

2026-11-25 NEXT-017.1: equipment put-on/off (slots 1–4); publish. reports/NEXT-017.1.md.

2026-11-25 NEXT-017.2: equipment forge NextId/Xp + coin; publish. reports/NEXT-017.2.md.

2026-11-25 NEXT-017.3: equipment attrs + score into hero power; publish. reports/NEXT-017.3.md.

2026-11-25 NEXT-017.4: holy equipment put-on/off/level-up + attrs/suit→power; publish. reports/NEXT-017.4.md.

2026-11-25 NEXT-017.5: holy star/step up (HolyEquipmentStar materials+unlock); publish. reports/NEXT-017.5.md.

2026-11-25 NEXT-017.6: holy blessing unlock/bless/replace/clear + attrs→power; publish. reports/NEXT-017.6.md.
