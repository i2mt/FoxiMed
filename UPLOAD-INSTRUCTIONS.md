# FoxiMed upload instructions

This is a cumulative replacement package based on the supplied FoxiMed-main ZIP, not a complete repository backup.

1. Back up your repository. Copy the ZIP contents into its root, preserving paths and overwriting matches. Keep every unrelated existing file. Include the new `burns-core.js`, `burns.css`, `drug-reference-presentation.js`, `calculator-guidance.js`, `calculator-guidance.css`, `reference-offline.js`, `reference-offline.css`, `reference-offline-manifest.json`, the updated `calculation-core.js`, `drugDatabase.js`, `voice-ui.js`, the lossless icon files, and all earlier welcome/onboarding/Settings replacements. Upload the files together.
2. Keep `.github/workflows/pages-sherpa-koochik.yml` at that exact path. The workflow validates the drug reader, cache, voice source and generated asset checker, then builds the pinned voice bundle.
3. In GitHub Settings → Pages, use **GitHub Actions** as the source. Push to the configured main/master branch or run the included workflow. Publish its generated `_site`; do not publish only the source tree if you need offline voice recognition.
4. Verify `sherpa-koochik/sherpa-onnx-asr.js`, `sherpa-onnx-vad.js`, `sherpa-onnx-wasm-main-vad-asr.js`, `.wasm` and `.data` all exist in the deployed bundle. The workflow checks them before publication. Source-only manual uploads do not contain these generated files. Do not upload placeholder JavaScript or HTML under those names.
5. Upload the unchanged `drug-reference-source.pdf` for the source-footer link. No deletions are needed.
6. Accept the app's update prompt and reload. Confirm current URLs: `style.css?v=51`, `script.js?v=60`, `drug-reference.css?v=8`, `drug-reference.js?v=9`, `drug-reference-index.js?v=3`, `onboarding.js?v=5`, `voice-commands.js?v=46`, `settings.css?v=3`, `onboarding.css?v=1`, `welcome.js?v=2`, `welcome.css?v=2`, `service-worker.js?v=61`. Also include `converters.js?v=3` and `manifest.json` (version 5.4.1). No numbered book chunk should be requested on first launch; after an earlier completed download, automatic updates may fetch changed files if enabled; its URL ends in `?v=4`.
7. On a new browser profile, verify loading → installation guidance → install/open from the Home Screen → optional three-step setup → choice of app entry or tutorial. The old install and name popups should not appear. Verify live themes, Back, skip/Escape, saved preferences and reload. Returning users see one optional update/setup invitation, including users who finished the earlier setup. Dismissal keeps their preferences and is remembered. Existing users can also replay installation/setup in Settings → About. On small portrait phones all six colors appear before the preview; a footer cue indicates any remaining content below. Installation should be tested on the actual iPhone/Android browser: local tests simulate the platform events. Browser setup is not migrated across isolated storage if installation is postponed.
8. Verify: card open → all available topics closed; no More info button; choose a topic to read, then switch from a long topic without losing the tapped heading. Settings is full screen with one section card per row and the brand/credit at the bottom. Tap the icon, title or arrow to open/close each submenu. Check long expanded sections, rotation and the name field with the keyboard open on iPhone/Safari and Android; the included touch emulation does not replace physical-device verification. Confirm Hedo keeps its original purple dark-mode colors while the top-bar name is brighter. The tutorial uses a separate navy coaching area, aligns at different sizes and can be replayed from About. On welcome, the fox fill starts after the screen is loaded and visible. Feature tips begin only on later idle visits, at most weekly; they can be disabled under Notifications. The updated drug-reference launch note remains included.

9. Check gentle required-field outlines and the ready Calculate button in forward, reverse, weight and custom modes. In Reference, use the compact opt-in download strip; confirm it disappears after verified completion. Use Settings → Data & Offline Reference for download/resume, manual update checks, removal and the automatic app-version update switch. Test unopened drugs and the original PDF offline. The main calculator has no drip selector; Tools/manual retain drop calculations. The displayed size is about 24.2 MB; assistant models are separate. Review `reports/AUDIT-FIXES-5.4.0.md` for clinical limits, including confirmed TBSA requirements.
10. After changing any packaged runtime file, run `python3 scripts/build-reference-offline-manifest.py`; upload its regenerated JSON together with the matching runtime files. CI checks for a stale manifest. Do not rename runtime files or append HTML fallbacks under their paths.

Current offline asset URLs are `reference-offline.js?v=6`, `reference-offline.css?v=2` and `reference-offline-manifest.json?v=6`. Read `reports/MIXED-SCRIPT-5.4.3.md` for current mixed-script changes and `reports/DRUG-READER-5.4.2.md` for earlier reader/dopamine checks and `reports/COMPACT-OFFLINE-5.4.1.md` for earlier offline behavior; earlier main drip-selector instructions are superseded.

Read `reports/LATEST-UPDATE.md` for changes, the console-log diagnosis, verification and limitations. Exact replacement paths and hashes are in `reports/replacement-files.json`. Older update reports are historical.

## Local checks

```sh
node tests/drug-reference-data.test.js
node tests/drug-reference-cache.test.js
node tests/drug-reference-reader.test.js
node tests/drug-reference-presentation.test.js
node tests/mixed-script-reader.test.js
node tests/burns-core.test.js
node tests/voice-pipeline-smoke.test.js
node tests/pump-without-drip.test.js
python3 tests/voice-assets.test.py
python3 scripts/build-reference-offline-manifest.py --check
```

Optional rendered checks require Playwright and Chromium:

```sh
node tests/drug-reference-ui.test.js
node tests/mixed-script-reader.test.js --ui
node tests/burns-flow.test.js
node tests/dopamine-and-reference-layout.test.js
node tests/navigation-layout.test.js
node tests/tutorial-layout.test.js
node tests/settings-theme-ui.test.js
node tests/settings-mobile.test.js
node tests/welcome-discovery.test.js
node tests/welcome-responsive.test.js
node tests/welcome-upgrade.test.js
node tests/persian-numbers.test.js
node tests/calculator-safety.test.js
node tests/reference-offline.test.js
node tests/compact-offline-update.test.js
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing browser binary. These are test dependencies only. The full Emscripten/model build, actual microphone recognition and live deployment were not run here.

The importer remains reproducible with PyMuPDF and Poppler:

```sh
python3 scripts/rebuild-drug-reference.py drug-reference-source.pdf
```

If the repository has changed since the supplied snapshot, reconcile the modified HTML/script/workflow files before overwriting newer unrelated work. Clinical source issues remain listed for review; generated text is not a fully validated clinical database.

The current icon-specific Settings touch suite is blocked when the external Font Awesome CDN is denied. Separate full-header/keyboard and theme/control suites passed. Existing historical icon-touch reports must not be read as a current pass for that failure condition. Colors, accessibility overhaul, existing touch-target sizes, assistant download behavior and Telegram controls were excluded as requested.

The 5.4.2 presentation sidecar is required alongside drug-reference.js. Keep it in the offline manifest and deploy both together. It preserves original book files and uses exact source anchors; re-extracting/replacing a book requires revalidating those anchors with the presentation test. The generic note above each opened drug card has been removed; footer source/page links remain.

The current reader assets are drug-reference.js?v=11, drug-reference.css?v=10 and drug-reference-presentation.js?v=2. Upload them together with this version’s HTML, worker and offline manifest. The acetaminophen poisoning update has its own footer source link and exact source anchor.

For 5.4.4, include burns-core.js?v=1 and burns.css?v=1 with script.js?v=63, the updated HTML/worker and regenerated offline inventory. The burn map now calculates its own percentage; older instructions requiring a separate TBSA entry are superseded by reports/BURNS-5.4.4.md.

For 5.4.5, upload the matching index.html, script.js?v=64, burns.css?v=2, worker and offline inventory together. burns-core.js?v=1 is unchanged. Read reports/BURNS-POLISH-5.4.5.md for the shared percentage input and remaining-volume result layout.
