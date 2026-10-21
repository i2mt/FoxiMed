# FoxiMed upload instructions

This is a cumulative replacement package based on the supplied FoxiMed-main ZIP, not a complete repository backup.

1. Back up your repository. Copy the ZIP contents into its root, preserving paths and overwriting matches. Keep every unrelated existing file. Include the new `welcome.js`, `welcome.css`, `onboarding.css` and `settings.css`, plus all other replacements. Upload the files together.
2. Keep `.github/workflows/pages-sherpa-koochik.yml` at that exact path. The workflow validates the drug reader, cache, voice source and generated asset checker, then builds the pinned voice bundle.
3. In GitHub Settings → Pages, use **GitHub Actions** as the source. Push to the configured main/master branch or run the included workflow. Publish its generated `_site`; do not publish only the source tree if you need offline voice recognition.
4. Verify `sherpa-koochik/sherpa-onnx-asr.js`, `sherpa-onnx-vad.js`, `sherpa-onnx-wasm-main-vad-asr.js`, `.wasm` and `.data` all exist in the deployed bundle. The workflow checks them before publication. Source-only manual uploads do not contain these generated files. Do not upload placeholder JavaScript or HTML under those names.
5. Upload the unchanged `drug-reference-source.pdf` for the source-footer link. No deletions are needed.
6. Accept the app's update prompt and reload. Confirm current URLs: `style.css?v=50`, `script.js?v=58`, `drug-reference.css?v=8`, `drug-reference.js?v=8`, `drug-reference-index.js?v=3`, `onboarding.js?v=5`, `voice-commands.js?v=45`, `settings.css?v=3`, `onboarding.css?v=1`, `welcome.js?v=2`, `welcome.css?v=2`, `service-worker.js?v=59`. Also include `converters.js?v=2` and `manifest.json` (version 5.3.3). No numbered book chunk should be requested until opening a drug; its URL ends in `?v=4`.
7. On a new browser profile, verify loading → installation guidance → install/open from the Home Screen → optional three-step setup → choice of app entry or tutorial. The old install and name popups should not appear. Verify live themes, Back, skip/Escape, saved preferences and reload. Returning users see one optional update/setup invitation, including users who finished the earlier setup. Dismissal keeps their preferences and is remembered. Existing users can also replay installation/setup in Settings → About. On small portrait phones all six colors appear before the preview; a footer cue indicates any remaining content below. Installation should be tested on the actual iPhone/Android browser: local tests simulate the platform events. Browser setup is not migrated across isolated storage if installation is postponed.
8. Verify: card open → all available topics closed; no More info button; choose a topic to read, then switch from a long topic without losing the tapped heading. Settings is full screen with one section card per row and the brand/credit at the bottom. Tap the icon, title or arrow to open/close each submenu. Check long expanded sections, rotation and the name field with the keyboard open on iPhone/Safari and Android; the included touch emulation does not replace physical-device verification. Confirm Hedo keeps its original purple dark-mode colors while the top-bar name is brighter. The tutorial uses a separate navy coaching area, aligns at different sizes and can be replayed from About. On welcome, the fox fill starts after the screen is loaded and visible. Feature tips begin only on later idle visits, at most weekly; they can be disabled under Notifications. The updated drug-reference launch note remains included.

Read `reports/LATEST-UPDATE.md` for changes, the console-log diagnosis, verification and limitations. Exact replacement paths and hashes are in `reports/replacement-files.json`. Older update reports are historical.

## Local checks

```sh
node tests/drug-reference-data.test.js
node tests/drug-reference-cache.test.js
node tests/drug-reference-reader.test.js
node tests/voice-pipeline-smoke.test.js
python3 tests/voice-assets.test.py
```

Optional rendered checks require Playwright and Chromium:

```sh
node tests/drug-reference-ui.test.js
node tests/navigation-layout.test.js
node tests/tutorial-layout.test.js
node tests/settings-theme-ui.test.js
node tests/settings-mobile.test.js
node tests/welcome-discovery.test.js
node tests/welcome-responsive.test.js
node tests/welcome-upgrade.test.js
node tests/persian-numbers.test.js
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing browser binary. These are test dependencies only. The full Emscripten/model build, actual microphone recognition and live deployment were not run here.

The importer remains reproducible with PyMuPDF and Poppler:

```sh
python3 scripts/rebuild-drug-reference.py drug-reference-source.pdf
```

If the repository has changed since the supplied snapshot, reconcile the modified HTML/script/workflow files before overwriting newer unrelated work. Clinical source issues remain listed for review; generated text is not a fully validated clinical database.
