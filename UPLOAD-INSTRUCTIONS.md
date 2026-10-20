# FoxiMed upload instructions

This archive contains replacement and new files for the supplied FoxiMed-main.zip snapshot. It is not a complete repository backup.

1. Back up your repository or create a branch before applying the files.
2. Extract this ZIP and copy its contents into the repository root, preserving relative paths. Overwrite matching files; add new files and folders. In particular, preserve `.github/workflows/` and upload the updated workflow there.
3. Keep all other existing files, including icons, calculator files, voice files, manifest, seed data, and catalog. No deletions are required. Do not replace the repository with only this ZIP's contents.
4. Run the checks below, or let the updated GitHub Actions workflow run its data, cache, and voice checks. The workflow still builds the pinned voice model before publishing Pages.
5. Commit and upload all replacements together. After deployment, accept the app's update prompt and reload. Confirm `drug-reference-index.js?v=2`, `drug-reference.js?v=6`, `drug-reference.css?v=5`, `style.css?v=44`, `script.js?v=51`, and `service-worker.js?v=50` are served. Opening the tab should request no numbered book chunks; opening a drug should request one `drug-reference-book-NN.js?v=3` file.
6. The original PDF is included as `drug-reference-source.pdf` for the small source link at the bottom of details. Upload it alongside the application files.

Read `reports/IMPLEMENTATION-REPORT.md` for changes, checks, limitations, and the data review queue. This cumulative update includes the compact Tools-style accordion revision. Closed cards show names and a chevron; tap the whole header for the overview, then use “اطلاعات بیشتر” inside it for the full monograph. The shared Tools close bar appears after the open header scrolls away. Source attribution stays as one muted sentence at the bottom. See `reports/COMPACT-ACCORDION-UPDATE.md` for the earlier compact-card changes. See `reports/DRUG-READER-UPDATE.md` for the current title, spelling, RTL/LTR and topic-reading revision.

## Local checks

```sh
node tests/drug-reference-data.test.js
node tests/drug-reference-cache.test.js
node tests/drug-reference-reader.test.js
node tests/voice-pipeline-smoke.test.js
node --check drug-reference.js
node --check service-worker.js
```

The optional rendered suite requires Playwright and a Chromium installation in your testing environment:

```sh
node tests/drug-reference-ui.test.js
```

You can set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to an existing Chromium executable. Playwright is a testing dependency only; the app has no new runtime dependencies.

## Rebuilding the PDF import

The generated files are already included; you do not need to rebuild them to upload this update. To reproduce the extraction, install PyMuPDF and Poppler's `pdftotext`, then run:

```sh
python3 scripts/rebuild-drug-reference.py drug-reference-source.pdf
node tests/drug-reference-data.test.js
```

`reports/replacement-files.json` lists the exact files and SHA-256 hashes included for upload. GitHub's current main/PR state was not accessible during this work. If your repository has changed since the supplied snapshot, reconcile the changed HTML, JavaScript, workflow, and tests instead of overwriting newer unrelated work.
