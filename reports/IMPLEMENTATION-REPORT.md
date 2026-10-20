# FoxiMed Drug Reference implementation report

## Current result

The latest revision is documented in `LATEST-UPDATE.md`. The tutorial now has isolated styles and FoxiOra v12.27's panel structure and responsive rules. The welcome fox fills after assets and the visible screen are ready. Settings is full screen with compact section cards, clearer controls and a fixed brand/credit footer. Hedo and other dark themes use readable heading accents. Prior drug-scroll/source-order/performance/spelling/cache work remains included; book data, reader JavaScript, index and PDF are unchanged from the preceding delivery.

The earlier implementation details below are retained for traceability. Current behavior and test results take precedence in `LATEST-UPDATE.md`, `FINAL-CHECKS.json` and `drug-reference-ui-results.json`.

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

- Syntax checks for all 34 root/test JavaScript files and compilation of the importer Python source.
- Complete data schema, duplicate-ID, required-name, numeric PDF-page/year, stable-ID, chunk relationship, and metadata/index consistency checks.
- Checks against combined monographs, non-monograph extraction debris, corruption in headings, and quarantined aliases.
- Reader tests across all 827 titles and 7,004 sections: no detected sentence-contaminated headings; reflow/direction preserve text and numeric values; corrected fibrillation spelling and complete dose/unit examples.
- Service-worker tests for no eager book precache, cached detail access offline, and extraction-revision isolation.
- Existing voice-pipeline smoke suite, including its simulated worker lifecycle tests. Its logged simulated worker crash is an intentional fixture and the suite finishes PASS.
- Rendered Chromium tests at 1280, 390, and 320 px: single-column alignment, no horizontal overflow, 66 px closed card headers matching Tools, short/long names, two-level details, long monographs, missing optional fields, source footer placement, Persian/English/brand/normalized/partial and empty searches, result paging, category buttons, one expanded record, click/Escape closure, Settings separation, Tools search/clear, request failure/retry, and switching records during an in-flight load. No page JavaScript errors occurred.
- HTML local script/style references resolve. Updated source, cache, and voice checks are wired into the supplied Pages workflow.

Limitations: external font CDNs were blocked in the local harness, so Persian/Latin layout was inspected using installed fallback fonts. For the latest visual inspection, Font Awesome 6.4.0 CSS/fonts were supplied locally to the QA browser to verify the actual icons and chevrons; no application dependencies were added. This was Chromium viewport testing, not physical iOS/Android or Safari testing. The full remote Emscripten/model build, actual microphone recognition, GitHub Actions run, and live deployment were not performed.

## Repository, pull request, and deployment status

The supplied ZIP has archive commit metadata `4468c9df0564c2e5ab65a38545efd26751910405`, but contains no Git history or working-tree state. Public GitHub, PR #5, Actions, and the live site were unavailable through the research tools. No branch was checked out remotely, no commit was pushed, no PR was merged/closed, and no conflicts or deployment were claimed resolved. The delivered files are based on the supplied snapshot. All unchanged files were excluded from the replacement package, including the large old Vosk archive and unchanged voice engine files.

Your remaining actions are to reconcile against any newer repository changes, upload the replacement files together, run/inspect the workflow, accept the app update, and verify the live Drugs tab. Clinical review of the queued source issues remains outstanding before treating the imported text as current clinical guidance.

## Every changed or added file

The exact cumulative inventory, SHA-256 hashes and reasons are in `replacement-files.json`. Tutorial, Settings and heading fixes are included with the earlier drug/data/cache repairs. Book data, reader JavaScript, index and source PDF are unchanged from the preceding delivery. Recognition-engine code is unchanged.

| File | Reason |
| --- | --- |
| `.github/workflows/pages-sherpa-koochik.yml` | Retain generated voice build validation; validate the current onboarding module syntax before publication. |
| `UPLOAD-INSTRUCTIONS.md` | Current manual upload paths, both new stylesheets, revisions and verification steps. |
| `drug-reference-book-01.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-02.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-03.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-04.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-05.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-06.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-07.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-08.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-09.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-book-10.js` | Regenerated display headings/sections with explicit spelling corrections; raw source, IDs and numeric clinical content retained. |
| `drug-reference-index.js` | Current compact name index, corrected headings and retained original-name discovery aliases. |
| `drug-reference-source.pdf` | Unchanged original PDF copied under the path used by footer page links. |
| `drug-reference.css` | Retain reader styling and stable scroll behavior; use readable dark-mode reference headings. |
| `drug-reference.js` | Preserve the activated topic heading while switching; follow PDF topic order, show brands first and keep every topic initially closed. |
| `index.html` | Full-screen Settings with preserved controls, bottom fox/name/credit, isolated tutorial markup and current asset revisions. |
| `onboarding.css` | Private stretch-aligned tutorial grid, FoxiOra v12.27 responsive dock/sidebar rules, scrollable copy and visible fox fill. |
| `onboarding.js` | Isolated responsive coaching panel, measured app viewport and fox fill after assets/fonts/startup visibility and painted frames. |
| `reports/COMPACT-ACCORDION-UPDATE.md` | Historical compact-card revision, explicitly pointing to the current update. |
| `reports/DRUG-READER-UPDATE.md` | Historical two-stage reader revision, explicitly pointing to the current update. |
| `reports/FINAL-CHECKS.json` | Nine passing suites, syntax/data preservation and focused tutorial/Settings/contrast results. |
| `reports/IMPLEMENTATION-REPORT.md` | Current outcome with complete cumulative replacement inventory and prior implementation history. |
| `reports/LATEST-UPDATE.md` | Current tutorial alignment/fox readiness, full-screen Settings, theme contrast evidence and retained prior fixes. |
| `reports/SECOND-SPELLING-PASS.json` | Additional NLM terminology evidence, source-verified vitamin-name suffixes, wording counts and scope. |
| `reports/SECOND-TITLE-CORRECTIONS.csv` | Every English/Persian title difference from the previous edited-files delivery. |
| `reports/compact-accordion-checks.json` | Historical check record retained with a pointer to current results. |
| `reports/drug-data-audit.json` | Current generated dataset/journal counts; source and stable-ID review status retained. |
| `reports/drug-data-corrections.csv` | Updated cumulative metadata journal against original IDs, with explicit editorial and validation limits. |
| `reports/drug-data-review.csv` | Complete source-entry review queue; no clinical validation implied. |
| `reports/drug-reader-audit.json` | All-title audit counts, precise source boundary/numeric duplicate removal and clinical validation limits. |
| `reports/drug-reader-checks.json` | Historical check record retained with a pointer to current results. |
| `reports/drug-reader-title-corrections.csv` | Every Persian/English title difference from the prior delivered package with stable ID and PDF page. |
| `reports/drug-reference-density.json` | 390 px before/after card-height measurement using the actual Font Awesome 6.4.0 icons in the QA browser. |
| `reports/drug-reference-performance.json` | Historical first performance-repair sample, labelled separately from this layout revision. |
| `reports/drug-reference-readability-visual.json` | Current local-browser density and zero-eager-detail-request measurements for the reader revision. |
| `reports/drug-reference-ui-results.json` | Current rendered drug/search/card/keyboard/bidi/tutorial and user-state restoration results. |
| `reports/drug-source-duplicate-headings.json` | Retained duplicate/incomplete English source headings for review. |
| `reports/drug-spelling-verification.json` | NLM RxNorm term lookup evidence and primary fibrillation references for targeted spelling checks. |
| `reports/navigation-layout-results.json` | Current long-topic position stability and retained controls/tutorial separation results. |
| `reports/replacement-files.json` | Exact cumulative replacement inventory and hashes; self hash/size omitted. |
| `reports/settings-theme-results.json` | Twelve full-screen/closed-menu layouts, 108 submenu checks, controls/focus and six-theme headline contrast. |
| `reports/tutorial-layout-results.json` | 147 step geometry checks, rotation, delayed-ready visible fill, completion, replay and reduced motion. |
| `script.js` | Apply the default dark palette and readable heading tokens; Settings focus/keyboard/scroll behavior and clean tutorial launch. |
| `scripts/check-voice-assets.py` | Verify three generated scripts, valid WASM and nonempty model data; detect HTML fallbacks. |
| `scripts/drug-reference-editorial.json` | Traceable heading/word spelling corrections and paired heading typography; no dose/unit autocorrections. |
| `scripts/drug-reference-original-ids.json` | Original 764-entry identity map for reproducible ID preservation. |
| `scripts/drug-reference-overrides.json` | Documented, sourced exclusion of ambiguous acetaminophen brand aliases. |
| `scripts/drug_reference_sections.py` | Shared source section parser; recognize the reversed pure Multivitamin indication label without rewriting clinical values. |
| `scripts/rebuild-drug-reference.py` | Repeatable source extraction and editorial spelling with partial-name/digit boundary protection. |
| `service-worker.js` | Cache matching current tutorial/Settings styles and scripts, headline styling and prior lazy drug/voice assets. |
| `settings.css` | Full-screen Settings, compact closed menu, full-width submenus, accessible controls and fixed bottom brand/credit. |
| `style.css` | Retain shared app styles; remove superseded tour overrides and use readable solid dark-mode headline accents. |
| `tests/drug-reference-cache.test.js` | Current lazy-book revision isolation and on-demand/offline voice-script cache reuse. |
| `tests/drug-reference-data.test.js` | Validate the complete dataset, relationships, source status and preserved IDs. |
| `tests/drug-reference-reader.test.js` | Whole-source content/numeric preservation plus all-monograph source ordering, seed mechanism order and brands-first checks. |
| `tests/drug-reference-ui.test.js` | Mobile/desktop closed topics, keyboard, floating close, parentheses geometry, interactive tour and user-state restoration. |
| `tests/navigation-layout.test.js` | Retain drug scroll and Settings controls checks; target the isolated tutorial card. |
| `tests/settings-theme-ui.test.js` | Browser checks for full-screen Settings, no closed-menu scrolling, all submenus, working controls, focus and dark headline contrast. |
| `tests/tutorial-layout.test.js` | Browser checks for aligned internal rows/borders/control bounds, screen separation and readiness-gated fox animation. |
| `tests/voice-assets.test.py` | Generated bundle fixture checks for missing files, HTML fallback and invalid WebAssembly. |
| `tests/voice-pipeline-smoke.test.js` | Retain voice smoke checks while validating current offline styles, isolated status markup and updated settings copy. |
| `voice-commands.js` | Open the collapsed Settings contact card before the existing voice support shortcut highlights it. |
