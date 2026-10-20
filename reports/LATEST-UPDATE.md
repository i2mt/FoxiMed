# Stable drug topics, grouped Settings and docked tutorial

Updated 2026-10-20. This cumulative package replaces the previously delivered edited-files ZIP. It is based on the supplied FoxiMed-main snapshot; it has not been deployed.

## Latest navigation changes

- Drug topic activation now closes/opens sections synchronously and compensates the Drugs pane scroll offset to keep the activated heading in place. Native smooth anchoring is disabled for this pane. Pointer and keyboard activation still use accessible native summaries; all topics start closed.
- Imported topics follow the PDF monograph sequence. The opening identity/classification block is followed by its forms/strengths, then the source's pharmacology, indications/dose and subsequent sections in their original order. The separate forms block stays at its original position rather than being promoted to the top. Name/brand information leads the opening metadata; seed entries likewise place mechanism before dosing. No medical text or dose has been changed in this revision.
- Settings uses nine compact, initially closed section cards. Existing control IDs, settings, themes, defaults, history/export actions and support links are preserved. The voice support shortcut explicitly opens the contact section before highlighting it. Settings groups are independent of the Tools/drug accordion history logic.
- The tutorial adapts Foxiora v12.27's separate coaching viewport. Navy guidance uses a fixed palette distinct from the app. On phones the app scrolls above a dedicated bottom dock; desktop/landscape uses a separate side panel. Header/panel/visual-viewport measurements update the layout for resizing and keyboard changes. Welcome content scrolls inside its card while navigation remains visible. Completion/skip restores the app layout and previous discovery state.
- New rendered regression checks use the long insulin monograph at 320/390/1280 px. Heading movement after switching is below 0.4 px; keyboard closing is stable. Settings keyboard access and theme/font/calculator-default changes pass. All seven tutorial steps reserve non-overlapping app/guidance areas at 320×568, 390×844, 1280×900 and 740×400. Geometry and results are in `navigation-layout-results.json`.

## Drug cards

- Opening a drug shows its metadata and every available information topic in one view. **Every topic starts closed**, including after closing/reopening a card. There is no More info/summary stage or button. Users explicitly open a topic; the existing exclusive topic behavior remains.
- Closed card headers remain 66 px high, matching Tools. Whole-header click, keyboard controls, the shared scrolling close bar, color themes, search, filters and paging remain.
- Drug category and brands now have separate, spaced metadata surfaces, smaller labels and icons. Brand names use direction-isolated chips. Forms/strengths are a closed topic with distinct, spaced source rows. Repeated printed names/brands/forms are removed only from the redundant identity display; raw source text remains available in the data/PDF.
- Source attribution stays as one faded sentence at the bottom.

## Spelling and parentheses

- Scanned all 827 imported headings again. 67 heading fields differ from the prior delivery: 63 English and 4 Persian. This includes spelling, spacing and paired heading punctuation, not 67 independent clinical corrections. Every change is in `SECOND-TITLE-CORRECTIONS.csv`.
- The targeted additional terminology pass checked 16 terms against NLM RxNorm, with 15 returned matches; the remaining Bephenium spelling uses its paired source wording. Exact responses and URLs are in `SECOND-SPELLING-PASS.json`. Vitamin D3/D2/B2 suffixes were checked against the actual English first lines in the supplied source. Doses, routes and units are not inferred or autocorrected.
- Additional display-word fixes include infusion/IV/nursing misspellings, anaphylaxis, acetaminophen/codeine, lozenges, effervescent and ropinirole. The importer uses explicit editorial rules and a boundary check to avoid replacing a partial name before a source digit.
- Parentheses are no longer consumed by a Latin run. Balanced Persian, English, numeric and nested groups are isolated as complete groups in their own direction. Reversed paired source punctuation and the displaced acronym pattern are normalized in the display; numeric instruction markers have separate badges.
- Whole-section checks cover 7,004 sections. Every non-parenthesis word/character and numeric sequence survives typography/reflow (apart from recognized printed label markers). 1,105 sections contain paired source bracket patterns handled by the normalizer. Browser checks verify actual opening/closing glyph positions for Persian, English, nested and unit expressions at three widths.
- All ten book chunks, the name index and the original source PDF are byte-for-byte unchanged from the previous delivery. Prior spelling changes remain included cumulatively.

## Tutorial and release note

- New seven-step introduction, based on Foxiora's short welcome and hands-on guidance: welcome, isolated calculation practice, live drug search, topic selection, Tools search, text examples for the assistant, and getting started.
- The practice is separate from real clinical values/history. Tutorial discovery changes are restored on exit; no settings or clinical history are changed. Next, Back, skip, Escape, keyboard cycling and Settings replay are supported. Completion is remembered.
- Voice is previewed visually without calling the tab-switch/model-preload path. Text examples do not record audio or execute a clinical command. The install/name prompts wait until the tour is clear.
- Launch-style 5.3.2 release note introduces the completely redesigned Iran drug reference with over 1,100 searchable drug entries, the available information topics, and the new tutorial. This is the searchable-entry count, not a verified count of distinct active ingredients. Some catalog-only entries still lack a full source monograph; the UI does not invent one.

## Console log follow-up

The provided v49/v50 warnings mean Cache.add could not fetch three generated voice scripts. The source package contains only `sherpa-koochik/README.md`; those scripts, WASM and model data are generated by the existing Pages workflow. The console alone does not identify HTTP status or prove whether the cause is missing deployment files, a path error, or a network failure. No live deployment URL/status was verified.

- The service worker no longer requests generated voice scripts during app-shell installation. When voice is actually used, scripts and model assets share the pinned runtime/model cache. Cache tests verify offline reuse. Unavailable generated JavaScript produces a specific diagnostic at use time and is not cached as a success.
- The workflow now validates three generated scripts, WASM signature and model data before publication, rejecting missing files and HTML fallback pages. Its existing model hash/size checks remain.
- **Deployment requirement:** publish the workflow-generated `_site`, including all five required files under `sherpa-koochik/`. Set GitHub Pages source to GitHub Actions. Uploading only source files to a branch cannot create the compiled voice runtime. This package does not include a freshly compiled model/runtime; the full remote build and actual microphone recognition were not run here.
- `[KoochikASR] adapter build=v34-rizeh-offline` is informational. The adapter build ID need not match the service-worker revision.
- The browser's `beforeinstallprompt.preventDefault()` message is informational: the app uses its own install UI and calls `prompt()` only when the user chooses Install. The native-install UI refreshes if that event arrives late; the prompt is not forced during onboarding.

## Verification and upload

Current data, reader, cache, voice-source/worker and generated-asset fixture checks are recorded in `FINAL-CHECKS.json`. Rendered Chromium checks cover 1280/390/320 widths; additional visual QA covers dark 320 px and all tutorial actions at 320×568 and 1280×900. Font Awesome 6.4.0 is supplied locally to the QA browser; Persian/Latin text uses installed fallbacks because the external font CDN is blocked. No browser screenshots are included in the ZIP.

The drug startup payload is 395,498 bytes, versus 8,035,317 bytes in the supplied original snapshot. Initial results remain capped at 40 with no book requests. Detail chunks load on first opening a drug and are cached by revision. Offline details still require a previous online opening of the corresponding chunk.

Upload all replacements together, preserving repository paths; do not delete unrelated files. Current assets: `style.css?v=46`, `script.js?v=52`, `drug-reference.css?v=7`, `drug-reference.js?v=8`, `drug-reference-index.js?v=3`, `onboarding.js?v=2`, `service-worker.js?v=52`, and lazy book chunks `?v=4`.

Clinical scope remains limited: the 2008 source has not been fully clinically validated. Incomplete or incorrectly scoped punctuation/fractions/tables in the source cannot safely be reconstructed from display text alone. Unpaired source brackets remain isolated and visible instead of guessed. Existing duplicate headings, unresolved metadata and Abciximab source issues remain in the review queue. No new warning/source banners were added to cards.
