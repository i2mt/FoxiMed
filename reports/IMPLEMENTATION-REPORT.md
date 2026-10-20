# FoxiMed Drug Reference implementation report

## Result

The Drug Reference now uses one compact, full-width card per row. Its collapsed headers match the Tools accordion dimensions, colors, typography, icons, chevron, and tap behavior. First tap opens an overview; “اطلاعات بیشتر” appears only at the bottom of that overview and opens the comprehensive monograph. Dedicated pregnancy/breastfeeding sections appear only at the comprehensive level. The latest title, mixed-direction and topic-reading revision is documented in `DRUG-READER-UPDATE.md`; `COMPACT-ACCORDION-UPDATE.md` retains the earlier 66 px card measurements. Source attribution remains a single muted sentence at the bottom of either information level, with a link to the corresponding original PDF page. Repeated warning and source banners were removed as requested. The Drugs tab reuses the Tools floating-close helper. It appears after the open header scrolls away and stays below the actual app header; Settings remains unobstructed.

## Current reading revision

All 827 imported titles were audited. Names come only from title glyphs, and neighboring clinical sentences are assigned to their correct body. The current reader uses labeled exclusive topics, preserved instruction/form rows, explicit RTL paragraphs, isolated LTR numeric/unit expressions, and 134 English heading copy edits. Compared with the previous delivery, 126 Persian titles and 134 English titles differ. Source text, original headings and original-name aliases remain traceable. See `drug-reader-audit.json`, `drug-reader-title-corrections.csv`, `drug-spelling-verification.json` and `DRUG-READER-UPDATE.md` for precise scope and limits. No dose or clinical recommendation was editorially rewritten.

## Root causes

- The original CSS explicitly switched between two and three columns. Small fonts, an entire clickable card header, and inconsistent available metadata made the results hard to scan.
- Ten numbered book scripts totaling about 7.97 MB were loaded synchronously before the application script finished startup. Each search called a function that revisited every source heading, rebuilt the combined dataset, and searched full monograph bodies. Every render rebuilt over a thousand cards, including when opening or closing a single drug.
- Drug details appended a fixed floating close bar to `document.body`, borrowing shared accordion positioning, using a hard-coded scroll/header threshold, and surviving outside the Drugs tab's component boundary. Its visibility, pointer events, stacking, and responsive positioning could conflict with the header. The current revision uses the same helper for Tools and Drugs, observes the exact scroll pane, measures actual header/safe-area bounds, hides inactive controls, and cleans up listeners on closure or tab changes. Browser tests verify the close bar stays below Settings, including after simulated header-height changes.
- The local `Validate voice pipeline source` command failed with `page must register the v45 service worker`: the test also hard-coded release 5.2.0 and an old release-note revision, while this snapshot identifies itself as 5.3.2 and registers worker v47. Those assertions now check consistency with the current version and a versioned worker URL. Voice runtime files were not changed. GitHub's actual latest failed-job logs could not be retrieved, so this is a reproduced snapshot failure, not a claim about unseen logs.
- PDF font dictionaries encoded compound lam-alef glyphs in a way that extractors either omitted them, emitted `R`/combining artifacts, or reversed their letters. The importer fixes that decoding in a temporary extraction-only PDF copy, then normalizes the resulting glyph. The original supplied PDF is preserved byte-for-byte. White heading spans identify record boundaries, with wrapped headings grouped together; bibliography and publisher pages are excluded.

## Performance and behavior

The numeric before/after sample below was recorded during the first performance repair, before the compact accordion revision. It is retained as historical evidence. The current UI retains the same small index, lazy chunks, and 40-result paging; current density measurements are in `drug-reference-density.json`.

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
- Repaired decoding: 7,454 lam-alef glyph occurrences through two font encoding dictionaries. Sample PDF pages were rendered and visually inspected, including pages 24, 27, and 348. This was not a page-by-page visual review of the whole book.
- Re-extracted metadata differs in 453 English-name fields, 187 Persian-name fields, and 369 brand fields. Together with 63 recovered records, the field journal has 1072 rows. These are automated extraction differences, **not 1072 individually clinician-validated corrections**.
- The full original PDF is included unchanged, with page references per entry. The text, year, sections, IDs, and existing field types remain available; provenance and chunk metadata are additive.
- The unqualified Aspirin and Anacin aliases were excluded from acetaminophen discovery, following targeted checks of current DailyMed labels. The old source text and original brand line remain preserved for review, and the exclusion is documented in `scripts/drug-reference-overrides.json`. This does not establish current Iranian product availability or validate the rest of that monograph.
- Pending source review: three duplicate English-title groups (six entries), four headings without a Persian title in the band, 17 unresolved/absent therapeutic classes, 129 absent/unresolved brands, and 18 very short or unstructured entries. Duplicate titles were retained because they can represent distinct substances/forms or source inconsistencies; see `drug-source-duplicate-headings.json`.
- Abciximab's source infusion number and its aspirin/heparin recommendation are explicitly queued for specialist review. No dose, unit, fraction, contraindication, or clinical recommendation was automatically rewritten. PDF extraction can still flatten fractions or mix numeric reading order. **No complete monograph has been clinically validated.** Every PDF entry remains marked `extraction-unreviewed`; the full review queue is in `drug-data-review.csv`.

Primary label references used for the targeted brand check:

- [Tylenol Extra Strength label, updated July 22, 2026](https://www.dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=103d109d-f520-409c-8da2-eb6b0fbec891)
- [Bayer Aspirin label](https://dailymed.nlm.nih.gov/dailymed/fda/fdaDrugXsl.cfm?setid=356e4ff4-a7f1-4a50-9b86-2555e232b300&type=display)
- [Anacin label](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=51ab0ee3-3c94-424d-a30a-2d6c14e3d8ff)

## Verification

Passed locally:

- Syntax checks for all 33 root/test JavaScript files and compilation of the importer Python source.
- Complete data schema, duplicate-ID, required-name, numeric PDF-page/year, stable-ID, chunk relationship, and metadata/index consistency checks.
- Checks against combined monographs, non-monograph extraction debris, corruption in headings, and quarantined aliases.
- Reader tests across all 827 titles and 7,004 sections: no detected sentence-contaminated headings; reflow/direction preserve text and numeric values; corrected fibrillation spelling and complete dose/unit examples.
- Service-worker tests for no eager book precache, cached detail access offline, and extraction-revision isolation.
- Existing voice-pipeline smoke suite, including its simulated worker lifecycle tests. Its logged simulated worker crash is an intentional fixture and the suite finishes PASS.
- Rendered Chromium tests at 1280, 390, and 320 px: single-column alignment, no horizontal overflow, 66 px closed card headers matching Tools, short/long names, two-level details, long monographs, missing optional fields, source footer placement, Persian/English/brand/normalized/partial and empty searches, result paging, category buttons, one expanded record, click/Escape closure, Settings separation, Tools search/clear, request failure/retry, and switching records during an in-flight load. No page JavaScript errors occurred.
- HTML local script/style references resolve. Updated source, cache, and voice checks are wired into the supplied Pages workflow.

Limitations: external font CDNs were blocked in the local harness, so Persian/Latin layout was inspected using installed fallback fonts. For the latest visual inspection, Font Awesome 6.4.0 CSS/fonts were supplied locally to the QA browser to verify the actual icons and chevrons; no application dependencies were added. This was Chromium viewport testing, not physical iOS/Android or Safari testing. The full remote Emscripten/model build, actual microphone recognition, GitHub Actions run, and live deployment were not performed.

## Repository, pull request, and deployment status

The supplied ZIP has archive commit metadata `4468c9df0564c2e5ab65a38545efd26751910405`, but contains no Git history or working-tree state. Public GitHub, PR #5, Actions, and the live site were unavailable through the research tools. No branch was checked out remotely, no commit was pushed, no PR was merged/closed, and no conflicts or deployment were claimed resolved. The delivered files are based on the supplied snapshot. All unchanged files were excluded from the replacement package, including the large old Vosk archive and the existing voice implementation.

Your remaining actions are to reconcile against any newer repository changes, upload the replacement files together, run/inspect the workflow, accept the app update, and verify the live Drugs tab. Clinical review of the queued source issues remains outstanding before treating the imported text as current clinical guidance.

## Every changed or added file

The exact current inventory, SHA-256 hashes, and reasons are in `replacement-files.json`. The latest UI revision changes `drug-reference.js`, `drug-reference.css`, the shared close helper in `script.js`, its text-overflow rule in `style.css`, version references in `index.html` and `service-worker.js`, the UI regression suite, and the associated instructions/reports. The seed/catalogue and PDF bytes are unchanged; the numbered book data and index are regenerated with corrected title boundaries and editorial names. The older data repair and its repeatable importer remain included in this cumulative package.


| File | Reason |
| --- | --- |
| `.github/workflows/pages-sherpa-koochik.yml` | Run data, cache, reader preservation and syntax regressions before the existing voice build. |
| `UPLOAD-INSTRUCTIONS.md` | Cumulative root-upload instructions and current asset revisions, checks and reader behavior. |
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
| `drug-reference.css` | Readable topic hierarchy, instruction blocks, short dose/unit grouping, theme support and unchanged 66 px collapsed density. |
| `drug-reference.js` | Topic-based progressive reading, isolated RTL/LTR and numeric/unit runs, preserved forms rows and compact Tools interactions. |
| `index.html` | Current reader, index, CSS, app script and service worker URL revisions. |
| `reports/COMPACT-ACCORDION-UPDATE.md` | Latest revision requirements, changes, actual density measurements, checks and upload guidance. |
| `reports/DRUG-READER-UPDATE.md` | Current title, mixed-direction, spelling, progressive reading, checks and limitations report. |
| `reports/IMPLEMENTATION-REPORT.md` | Updated cumulative report including shared scrolling-close behavior and current verification limits. |
| `reports/compact-accordion-checks.json` | Current full data/cache/voice/UI and JavaScript syntax check results. |
| `reports/drug-data-audit.json` | Machine-readable extraction/validation counts and unresolved-review totals. |
| `reports/drug-data-corrections.csv` | Before/after metadata journal with original IDs, PDF pages and verification limits. |
| `reports/drug-data-review.csv` | Complete source-entry review queue; no clinical validation implied. |
| `reports/drug-reader-audit.json` | All-title audit counts, precise source boundary/numeric duplicate removal and clinical validation limits. |
| `reports/drug-reader-checks.json` | Current passing data/cache/reader/voice/UI checks and validation scope. |
| `reports/drug-reader-title-corrections.csv` | Every Persian/English title difference from the prior delivered package with stable ID and PDF page. |
| `reports/drug-reference-density.json` | 390 px before/after card-height measurement using the actual Font Awesome 6.4.0 icons in the QA browser. |
| `reports/drug-reference-performance.json` | Historical first performance-repair sample, labelled separately from this layout revision. |
| `reports/drug-reference-readability-visual.json` | Current local-browser density and zero-eager-detail-request measurements for the reader revision. |
| `reports/drug-reference-ui-results.json` | Current passing rendered UI suite with 66 px Drugs/Tools measurements at three viewport widths. |
| `reports/drug-source-duplicate-headings.json` | Retained duplicate/incomplete English source headings for review. |
| `reports/drug-spelling-verification.json` | NLM RxNorm term lookup evidence and primary fibrillation references for targeted spelling checks. |
| `reports/replacement-files.json` | Exact cumulative replacement inventory and integrity hashes; excludes its own hash. |
| `script.js` | Share Tools floating-close behavior with Drugs; observe actual pane/header boundaries, clean up listeners and restore bars safely on tab changes. |
| `scripts/drug-reference-editorial.json` | Explicit heading and body spelling corrections; original source and aliases retained. |
| `scripts/drug-reference-original-ids.json` | Original 764-entry identity map for reproducible ID preservation. |
| `scripts/drug-reference-overrides.json` | Documented, sourced exclusion of ambiguous acetaminophen brand aliases. |
| `scripts/drug_reference_sections.py` | Shared source section parser; recognize the reversed pure Multivitamin indication label without rewriting clinical values. |
| `scripts/rebuild-drug-reference.py` | Extract names only from actual title glyphs; correct body boundaries and apply traceable editorial spelling without changing doses. |
| `service-worker.js` | Current app cache/asset references and revision-3 lazy chunk caching with offline reuse. |
| `style.css` | Constrain long titles inside the shared floating close bar; all other styles retained. |
| `tests/drug-reference-cache.test.js` | Exercise lazy caching, offline reuse and revision isolation. |
| `tests/drug-reference-data.test.js` | Validate the complete dataset, relationships, source status and preserved IDs. |
| `tests/drug-reference-reader.test.js` | Full-dataset text/numeric preservation, title contamination, editorial spellings and mixed-direction expression regressions. |
| `tests/drug-reference-ui.test.js` | Rendered title, spelling, numeric-unit, topic keyboard, density, two-stage reading, shared close bar and existing UI regressions. |
| `tests/voice-pipeline-smoke.test.js` | Replace obsolete release-specific assertions with current-version consistency checks. |
