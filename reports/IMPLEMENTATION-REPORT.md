# FoxiMed Drug Reference implementation report

## Result

The Drug Reference now uses one full-width card per row, the Tools tab's existing theme variables and surface treatments, a dedicated “اطلاعات بیشتر” button, and structured inline details. Source attribution is a single muted sentence at the bottom of the information, with a link to the corresponding original PDF page. Repeated warning and source banners were removed as requested. Close controls remain inside each expanded card; the app header is unobstructed.

## Root causes

- The original CSS explicitly switched between two and three columns. Small fonts, an entire clickable card header, and inconsistent available metadata made the results hard to scan.
- Ten numbered book scripts totaling about 7.97 MB were loaded synchronously before the application script finished startup. Each search called a function that revisited every source heading, rebuilt the combined dataset, and searched full monograph bodies. Every render rebuilt over a thousand cards, including when opening or closing a single drug.
- Drug details appended a fixed floating close bar to `document.body`, borrowing shared accordion positioning, using a hard-coded scroll/header threshold, and surviving outside the Drugs tab's component boundary. Its visibility, pointer events, stacking, and responsive positioning could conflict with the header. The replacement removes that overlay and its scroll listener entirely. Browser tests verify that the new close controls do not intersect Settings and never open it.
- The local `Validate voice pipeline source` command failed with `page must register the v45 service worker`: the test also hard-coded release 5.2.0 and an old release-note revision, while this snapshot identifies itself as 5.3.2 and registers worker v47. Those assertions now check consistency with the current version and a versioned worker URL. Voice runtime files were not changed. GitHub's actual latest failed-job logs could not be retrieved, so this is a reproduced snapshot failure, not a claim about unseen logs.
- PDF font dictionaries encoded compound lam-alef glyphs in a way that extractors either omitted them, emitted `R`/combining artifacts, or reversed their letters. The importer fixes that decoding in a temporary extraction-only PDF copy, then normalizes the resulting glyph. The original supplied PDF is preserved byte-for-byte. White heading spans identify record boundaries, with wrapped headings grouped together; bibliography and publisher pages are excluded.

## Performance and behavior

A small name/brand/class index replaces eager monograph scripts. Results are paginated in groups of 40. Search normalization and metadata are prepared once, search input is debounced by 80 ms, exact names precede prefix and other matches, and opening a record changes only that card. A record loads its corresponding chunk once and reuses the result. Failed loads show retry controls, and switching records during a pending request cannot replace the wrong card.

Local Chromium comparison, with external resources blocked and no network throttling:

| Measurement | Supplied snapshot | Edited version |
| --- | ---: | ---: |
| Initial drug JavaScript body bytes | 8,035,317 | 378,553 |
| Book requests before opening details | 10 | 0 |
| Initial result cards | 1,169 | 40 |
| First tab initialization, one local sample | 38.2 ms | 18.3 ms |

The roughly 95.3% payload reduction is the main startup improvement. These are local measurements, not mobile-device or live-network guarantees. See `drug-reference-performance.json` for the recorded run; search elapsed times there include the test's deliberate 150 ms wait.

Discovery searches names, aliases, brands, and classifications. It no longer implicitly scans every monograph body, which would defeat on-demand loading. Existing category controls and public `initDrugReference` / `openDrugReferenceDrug` hooks remain. All 1,169 previously discoverable identifiers are retained in the 1,229-record combined result set.

Numbered chunks use revision-specific cache-first requests after first use. They are not all downloaded during service-worker installation. **Offline tradeoff:** a detail chunk must have been opened online before it is available offline; the complete catalog is no longer precached automatically. The PDF link similarly needs its original file available. App-shell cache identity and affected URLs were bumped. Voice-model cache identity, voice files, and unrelated app behavior are preserved.

## Data audit and limits

- Structurally checked: 827 source-derived PDF entries, all 23 existing draft records, and all 493 name-catalog records; after existing ID precedence, 1,229 identifiers are searchable.
- Preserved: all 764 original PDF-record IDs. Added: 63 entries recovered from separate PDF heading bands. For example, A.C.A is separated from Abciximab.
- Repaired decoding: 7,456 lam-alef glyph occurrences through two font encoding dictionaries. Sample PDF pages were rendered and visually inspected, including pages 24, 27, and 348. This was not a page-by-page visual review of the whole book.
- Re-extracted metadata differs in 409 English-name fields, 164 Persian-name fields, and 369 brand fields. Together with 63 recovered records, the field journal has 1,005 rows. These are automated extraction differences, **not 1,005 individually clinician-validated corrections**.
- The full original PDF is included unchanged, with page references per entry. The text, year, sections, IDs, and existing field types remain available; provenance and chunk metadata are additive.
- The unqualified Aspirin and Anacin aliases were excluded from acetaminophen discovery, following targeted checks of current DailyMed labels. The old source text and original brand line remain preserved for review, and the exclusion is documented in `scripts/drug-reference-overrides.json`. This does not establish current Iranian product availability or validate the rest of that monograph.
- Pending source review: three duplicate English-title groups (six entries), four headings without a Persian title in the band, 17 unresolved/absent therapeutic classes, 129 absent/unresolved brands, and 19 very short or unstructured entries. Duplicate titles were retained because they can represent distinct substances/forms or source inconsistencies; see `drug-source-duplicate-headings.json`.
- Abciximab's source infusion number and its aspirin/heparin recommendation are explicitly queued for specialist review. No dose, unit, fraction, contraindication, or clinical recommendation was automatically rewritten. PDF extraction can still flatten fractions or mix numeric reading order. **No complete monograph has been clinically validated.** Every PDF entry remains marked `extraction-unreviewed`; the full review queue is in `drug-data-review.csv`.

Primary label references used for the targeted brand check:

- [Tylenol Extra Strength label, updated July 22, 2026](https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=103d109d-f520-409c-8da2-eb6b0fbec891)
- [Bayer Aspirin label](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=356e4ff4-a7f1-4a50-9b86-2555e232b300&type=display)
- [Anacin label](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=51ab0ee3-3c94-424d-a30a-2d6c14e3d8ff)

## Verification

Passed locally:

- Syntax checks for all 32 root/test JavaScript files and compilation of the importer Python source.
- Complete data schema, duplicate-ID, required-name, numeric PDF-page/year, stable-ID, chunk relationship, and metadata/index consistency checks.
- Checks against combined monographs, non-monograph extraction debris, corruption in headings, and quarantined aliases.
- Service-worker tests for no eager book precache, cached detail access offline, and extraction-revision isolation.
- Existing voice-pipeline smoke suite, including its simulated worker lifecycle tests. Its logged simulated worker crash is an intentional fixture and the suite finishes PASS.
- Rendered Chromium tests at 1280, 390, and 320 px: single-column alignment, no horizontal overflow, short/long names, long monographs, missing optional fields, source footer placement, Persian/English/brand/normalized/partial and empty searches, result paging, category buttons, one expanded record, click/Escape closure, Settings separation, Tools search/clear, request failure/retry, and switching records during an in-flight load. No page JavaScript errors occurred.
- HTML local script/style references resolve. Updated source, cache, and voice checks are wired into the supplied Pages workflow.

Limitations: external font/icon CDNs were blocked in the local browser harness, so layout was inspected using installed fallback fonts. This was Chromium viewport testing, not physical iOS/Android or Safari testing. The full remote Emscripten/model build, actual microphone recognition, GitHub Actions run, and live deployment were not performed.

## Repository, pull request, and deployment status

The supplied ZIP has archive commit metadata `4468c9df0564c2e5ab65a38545efd26751910405`, but contains no Git history or working-tree state. Public GitHub, PR #5, Actions, and the live site were unavailable through the research tools. No branch was checked out remotely, no commit was pushed, no PR was merged/closed, and no conflicts or deployment were claimed resolved. The delivered files are based on the supplied snapshot. All unchanged files were excluded from the replacement package, including the large old Vosk archive and the existing voice implementation.

Your remaining actions are to reconcile against any newer repository changes, upload the replacement files together, run/inspect the workflow, accept the app update, and verify the live Drugs tab. Clinical review of the queued source issues remains outstanding before treating the imported text as current clinical guidance.

## Every changed or added file

See the following table and `replacement-files.json` for exact paths and integrity hashes. The three old alphabetical book files are unreferenced in the supplied HTML and were left untouched; this update does not load them.

| File | Reason |
| --- | --- |
| `.github/workflows/pages-sherpa-koochik.yml` | Run drug schema/cache/syntax checks before the existing voice build. |
| `UPLOAD-INSTRUCTIONS.md` | Manual upload, verification and reproduction instructions. |
| `drug-reference-book-01.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-02.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-03.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-04.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-05.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-06.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-07.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-08.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-09.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-book-10.js` | Regenerated heading-bounded PDF monographs with repaired ligature decoding, preserved IDs, provenance and review status. |
| `drug-reference-index.js` | Small generated metadata index; startup no longer loads complete monographs. |
| `drug-reference-source.pdf` | Unchanged original PDF copied under the path used by footer page links. |
| `drug-reference.css` | Tools-style single-column responsive cards, readable details, accessible controls and muted source footer. |
| `drug-reference.js` | Cached metadata search, 40-result paging, lazy details, in-card close controls, retry and async race handling. |
| `index.html` | Replace eager book scripts with index, add paging controls, remove obsolete detail placeholder and repeated warning, bump asset URLs. |
| `reports/IMPLEMENTATION-REPORT.md` | Root causes, every changed file, data audit, checks, repository/deployment status and limitations. |
| `reports/drug-data-audit.json` | Machine-readable extraction/validation counts and unresolved-review totals. |
| `reports/drug-data-corrections.csv` | Before/after metadata journal with original IDs, PDF pages and verification limits. |
| `reports/drug-data-review.csv` | Complete source-entry review queue; no clinical validation implied. |
| `reports/drug-reference-performance.json` | Measured local before/after startup payload and interaction sample. |
| `reports/drug-reference-ui-results.json` | Successful rendered suite output. |
| `reports/drug-source-duplicate-headings.json` | Retained duplicate/incomplete English source headings for review. |
| `script.js` | Update existing release notes for the new loading/layout behavior and revision; no runtime voice changes. |
| `scripts/drug-reference-original-ids.json` | Original 764-entry identity map for reproducible ID preservation. |
| `scripts/drug-reference-overrides.json` | Documented, sourced exclusion of ambiguous acetaminophen brand aliases. |
| `scripts/rebuild-drug-reference.py` | Repeatable PDF boundary/ligature extraction, stable-ID mapping, metadata and audit generation. |
| `service-worker.js` | New app cache revision, small-index precache, on-demand versioned book cache; preserve model cache. |
| `tests/drug-reference-cache.test.js` | Exercise lazy caching, offline reuse and revision isolation. |
| `tests/drug-reference-data.test.js` | Validate the complete dataset, relationships, source status and preserved IDs. |
| `tests/drug-reference-ui.test.js` | Optional real Chromium regression suite for desktop/mobile widths and async behavior. |
| `tests/voice-pipeline-smoke.test.js` | Replace obsolete release-specific assertions with current-version consistency checks. |
| `reports/replacement-files.json` | Exact replacement inventory and SHA-256 integrity hashes; excludes its own hash. |
