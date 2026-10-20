> Historical revision. The current single-stage, initially closed topics and tutorial changes are documented in `LATEST-UPDATE.md`.

# Compact Drug Reference accordion update

This cumulative package replaces the previous delivery and keeps its data repairs and loading optimization.

## Requested interaction

- Closed cards show Persian/English names and a chevron. The full-width header is a single accessible button: tap the icon, name, arrow, or remaining header space to open; tap again to close. Enter/Space also work. Only one drug opens at a time.
- Headers directly reuse Tools' accordion typography, icon sizing, padding and chevron styles. Borders, radius, open-state highlight and category icon gradients follow that tab. Long names fit compactly while closed and wrap for reading when opened.
- First tap shows the drug class, brand names, available forms/strengths and the source's complete indication/dose and key contraindication/precaution sections, where present. Draft records use their available introduction, uses, precautions and nursing fields. No clinical synopsis or dose is invented or cut in the middle of a recommendation.
- “اطلاعات بیشتر” is rendered only inside the opened accordion, at the bottom of the overview. It opens all available sections. “نمایش خلاصه” returns to the overview. The card header and chevron remain the close control in both levels.
- Dedicated pregnancy/breastfeeding sections and the book's pregnancy classification are omitted from closed headers and overview metadata; they remain accessible in the comprehensive view. Relevant contraindication text is not medically rewritten.
- Each level ends in one muted source sentence. There are no repeated source banners.

## Shared Tools scrolling close behavior

Tools and Drugs now call the same `addAccordionFloatBar` helper. It observes the correct scroll pane and shows the existing close bar after the opened header scrolls away while the card remains on screen. Closing returns to the card header. The bar measures the actual app header, including changes in mobile/safe-area height; hidden bars have no pointer targets. Listeners and observers are removed on closing or tab changes. Long titles truncate inside the bar so they cannot push the close button outside the viewport. Tools' own opening/closing and history behavior is preserved.

## Measured size and checks

Closed drug headers and the reference Tools card both measured **66 px** at 1280, 390 and 320 px viewport widths. In an additional 390 px visual check using the app's Font Awesome 6.4.0 icons, the previous drug card measured 175.375 px and the revised one measured 66 px. Persian/Latin fonts used installed fallbacks in the local harness. Dark mode was visually inspected as well.

The UI suite covers density, single-row layout, no overflow, header/icon/name/keyboard toggling, two-stage details, one source footer, pregnancy classification hidden from the overview, scrolling close controls, header resizing, clear Settings hit targets, tab changes, Tools' own controls, search/filter/paging, long names/monographs, missing optional fields, load failure/retry and rapid record switching. Full data, cache and voice smoke tests and JavaScript syntax checks also pass. See the JSON reports for exact results.

## Upload

Upload all files from this ZIP to the repository root, preserving paths and overwriting matching files. It contains all previous required data/source files plus the current UI revision; it can be applied either to the supplied original snapshot or on top of the first delivery. Keep unrelated repository files. If you have made newer edits, reconcile them before replacing files.

Current references: `style.css?v=44`, `script.js?v=50`, `drug-reference.css?v=4`, `drug-reference.js?v=5`, `service-worker.js?v=49`. The name index and lazy book chunk revisions are unchanged. The service-worker app cache is `FoxiMed_v5.3.2_drug_reference_3`; the voice-model cache remains unchanged.

This update does not alter the drug catalogue, monograph data, importer, or original PDF from the first delivery. The earlier audit and clinical-review limitations still apply. No repository push or live deployment was performed.
