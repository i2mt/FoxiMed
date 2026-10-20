# FoxiMed upload instructions

This is a cumulative replacement package based on the supplied FoxiMed-main ZIP, not a complete repository backup.

1. Back up your repository. Copy the ZIP contents into its root, preserving paths and overwriting matches. Keep every unrelated existing file. Upload the new `onboarding.js` and all updated index/book files together.
2. Keep `.github/workflows/pages-sherpa-koochik.yml` at that exact path. The workflow validates the drug reader, cache, voice source and generated asset checker, then builds the pinned voice bundle.
3. In GitHub Settings → Pages, use **GitHub Actions** as the source. Push to the configured main/master branch or run the included workflow. Publish its generated `_site`; do not publish only the source tree if you need offline voice recognition.
4. Verify `sherpa-koochik/sherpa-onnx-asr.js`, `sherpa-onnx-vad.js`, `sherpa-onnx-wasm-main-vad-asr.js`, `.wasm` and `.data` all exist in the deployed bundle. The workflow checks them before publication. Source-only manual uploads do not contain these generated files. Do not upload placeholder JavaScript or HTML under those names.
5. Upload the unchanged `drug-reference-source.pdf` for the source-footer link. No deletions are needed.
6. Accept the app's update prompt and reload. Confirm current URLs: `style.css?v=46`, `script.js?v=52`, `drug-reference.css?v=7`, `drug-reference.js?v=8`, `drug-reference-index.js?v=3`, `onboarding.js?v=2`, `voice-commands.js?v=44`, `service-worker.js?v=52`. No numbered book chunk should be requested until opening a drug; its URL ends in `?v=4`.
7. Verify: card open → all available topics closed; no More info button; choose a topic to read, then switch from a long topic without losing the tapped heading. Settings opens as section cards. The tutorial uses a separate navy coaching area and can be replayed from the About section in Settings. The updated launch note appears once for returning users.

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
```

Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` if using an existing browser binary. These are test dependencies only. The full Emscripten/model build, actual microphone recognition and live deployment were not run here.

The importer remains reproducible with PyMuPDF and Poppler:

```sh
python3 scripts/rebuild-drug-reference.py drug-reference-source.pdf
```

If the repository has changed since the supplied snapshot, reconcile the modified HTML/script/workflow files before overwriting newer unrelated work. Clinical source issues remain listed for review; generated text is not a fully validated clinical database.
