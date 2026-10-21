# Tutorial alignment, full-screen Settings and readable themes

Updated 2026-10-21. This cumulative package replaces the previously delivered edited-files ZIP. It is based on the supplied FoxiMed-main snapshot; it has not been deployed.

## Latest Settings row layout

Settings section cards now appear one per row on every screen size, including desktop and landscape. The full-screen layout and bottom brand/credit footer remain. Shorter screens scroll the section list so labels and tap targets keep their usable size. Color choices and controls inside an expanded section retain their existing layout. The browser regression checks that all nine card edges align, each card follows the previous row, and the last card is reachable above the footer.

## Latest Hedo adjustment

Hedo's previous dark purple palette is restored by using its original CSS colors again. The purple gradients, accents and section titles retain their prior appearance. Only the top-bar FoxiMed wordmark receives a lighter violet (`#c4b5fd`) for readability; its measured contrast against the header is 5.58:1. Other themes and the tutorial, full-screen Settings and drug-reader changes remain included.

The updated browser regression verifies the original Hedo primary/gradient values, clearing another theme's inline palette, the unchanged purple reference heading and the brighter top-bar name. Twelve Settings layouts, all 108 submenu checks, controls/focus, all six theme switches, voice smoke checks and service-worker cache checks pass. Earlier unaffected suites retain their previous validation results.

## Tutorial alignment and welcome fox

The previous tutorial inherited `align-items:center` from the retired slide card. The app's navigation-height measurement could also overwrite the reserved app viewport after resize. Both conflicts are fixed: the new card uses private `fm-tour-*` classes and `onboarding.css`, and its reserved viewport takes priority over the normal navigation offset.

The panel now follows FoxiOra v12.27's four rows: location/skip, scrolling copy, progress, and full-width actions. Grid items stretch to the same inner edges. The default bottom dock has a 520 px maximum width and a 260 px/42% height cap; a 260 px side dock is used at FoxiOra's compact-landscape breakpoint. Enlarged text gets more copy space where needed. Borders, controls and words wrap within the copy area; navigation stays outside that scroll area. No old `.tutorial-box` or `.onboarding-box` class is applied to the new panel.

The welcome screen reuses the startup fox silhouette and bottom-to-top orange fill. It waits for the mask, fonts and page load, waits until the startup overlay is fully hidden and the fox is visible, then allows two painted frames before starting the 2.8-second animation. Back/replay starts a new animation; leaving cancels pending work. Reduced-motion users get the completed mark, and a failed mask load falls back to the existing fox image. Navigation is never blocked by the animation.

`tutorial-layout-results.json` records 147 step checks: nine viewport sizes in light/dark plus three layouts at 200% text. They check internal alignment, child borders/control bounds, horizontal overflow, copy/progress/action separation, visible navigation and separate app/guide viewports. Rotation, delayed-mask/startup readiness, visible fill progression, completion, replay and reduced motion pass. Browser viewport simulations do not establish physical iPhone/Safari keyboard behavior.

## Full-screen Settings

Settings fills the viewport with a fixed header, a scrollable section area and a bottom brand/credit footer. The footer includes the fox, FoxiMed, “Designed & developed by” and Mohammad Mahdi Taghavi. Nine section cards use a single column at every viewport size. Open sections use the full content width. Short screens scroll the list while the header and brand/credit footer stay visible. Enlarged system text can also scroll rather than being clipped.

Submenus now use labelled 44 px controls, 16 px text inputs/selects, clear theme-mode labels, spaced color choices, distinct history/log deletion actions, isolated mixed-script names/values and a cleaner support link. Native dark select menus use the correct color scheme. Profile, theme/font, calculator defaults, keyboard focus containment, Escape/close and focus restoration were checked. Existing control IDs, preferences, data/export/support actions and voice shortcut are preserved. The calculator drug count is labelled explicitly to distinguish it from the reference catalog.

`settings-theme-results.json` records twelve full-screen layouts, 108 expanded submenu checks and control/keyboard checks. It also records measured headline contrast across all six dark themes. Hedo retains its original purple palette and only its top-bar brand is brightened. The other five themes retain their lighter heading accents, with tested visible heading ratios of 5.45:1 or higher. This is a focused headline check, not a claim of a complete accessibility audit.

## Retained drug behavior

Switching topics keeps the activated heading in place; the measured long-insulin heading shift remains below 0.4 px at 320/390/1280 px. PDF topic order, initially closed topics, lazy chunks, compact cards and bottom source attribution remain. All ten book files, the compact index, the reader JavaScript and the original PDF are byte-for-byte unchanged from the preceding delivery. Only the drug stylesheet receives the dark heading color rule.

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

Upload all replacements together, preserving repository paths; do not delete unrelated files. Current assets: `style.css?v=48`, `script.js?v=54`, `drug-reference.css?v=8`, `drug-reference.js?v=8`, `drug-reference-index.js?v=3`, `onboarding.js?v=3`, `service-worker.js?v=55`, `settings.css?v=2`, `onboarding.css?v=1`, and lazy book chunks `?v=4`.

Clinical scope remains limited: the 2008 source has not been fully clinically validated. Incomplete or incorrectly scoped punctuation/fractions/tables in the source cannot safely be reconstructed from display text alone. Unpaired source brackets remain isolated and visible instead of guessed. Existing duplicate headings, unresolved metadata and Abciximab source issues remain in the review queue. No new warning/source banners were added to cards.
