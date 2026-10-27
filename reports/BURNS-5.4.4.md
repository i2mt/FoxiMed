# FoxiMed 5.4.4 — restore the simple burn-percentage workflow

Prepared 27 October 2026; not deployed. This cumulative package includes the earlier drug-reader, calculator, onboarding and offline changes.

## User flow

The main tool now starts with adult/child, an immediately visible percentage result, and the front/back body map. Selecting a region updates the result automatically. Weight, elapsed time, previous fluids and an independently measured percentage are not required to use the map.

Children can use the map without entering age. When the selected regions depend on age, the result is a range across the 0–15-year reference chart; it is not an assumed average child. A closed, optional age control refines that range. Intermediate ages use linear interpolation between the chart's reference ages. Fixed regions such as the trunk produce the same percentage without age refinement. Adult estimates use the adult Lund–Browder column.

The optional adult-fluid panel is closed by default. Its two method cards show the coefficient, method name and applicable scope. No method is silently chosen:

- Traditional Parkland: 4 mL/kg/%TBSA.
- ABA initial estimate: 2 mL/kg/%TBSA, restricted to adult TBSA of at least 20%.

The panel reads the map estimate automatically and asks for weight. It shows the initial 24-hour volume and its first-eight/next-sixteen-hour split without requiring a time questionnaire. Independently assessed TBSA can be supplied in a separate optional correction control; doing so changes only the fluid calculation, not the map result. Elapsed time and prior fluid are requested only when the optional continuation control is opened. Remaining volumes are labelled mathematical differences, not automatic catch-up rates. Pediatric fluid dosing remains outside this tool.

## Percentage mapping and sources

The old mixed percentage table was not restored: its adult values summed to 102.5%. The new pure calculation module uses an explicit Lund–Browder region mapping. There are 32 unique percentage regions represented by 34 SVG targets. Chest/abdomen are linked as the chart's single 13% anterior trunk; upper/lower back are linked as the single 13% posterior trunk. This avoids inventing separate Lund–Browder percentages for those subdivisions. Buttocks total 5%, perineum 1%, and all missing posterior neck, hand and foot targets are now present. The original 29 target geometries are unchanged. Anterior left/right labels now follow patient orientation.

Reference half-surface growth values:

| Reference age | Half head | Half one thigh | Half one lower leg |
| --- | --- | --- | --- |
| 0 | 9.5 | 2.75 | 2.5 |
| 1 | 8.5 | 3.25 | 2.5 |
| 5 | 6.5 | 4 | 2.75 |
| 10 | 5.5 | 4.25 | 3 |
| 15 | 4.5 | 4.5 | 3.25 |
| Adult | 3.5 | 4.75 | 3.5 |

Each anterior/posterior upper arm is 2%, forearm 1.5%, hand 1.25% and foot 1.75%. The fixed regions sum to 60%; head/thigh/lower-leg regions sum to 40% at every implemented reference age. The complete map totals 100%, without clamping an incorrect sum. Unknown-age ranges are calculated from complete, correlated age-specific totals rather than adding independent minimum and maximum region percentages.

Sources checked 27 October 2026:

- [Scottish Ambulance Service / ScotSTAR CG032, Appendix 1, page 14](https://static1.squarespace.com/static/54a40119e4b0fbd5ffb33811/t/653c10bed3fb417b530643b0/1698435263792/CG032%2BBurns.pdf): numerical head/thigh/lower-leg age table. Its fluid protocol is not adopted by this update.
- [Dubai Health Authority burns guideline, Appendix 2, page 25](https://dha.gov.ae/uploads/032024/35%20-%20DHA%20Telehealth%20Clinical%20Guidelines%20for%20Virtual%20Management%20of%20Burns2024329667.pdf): fixed region values, particularly the 1.25% hand surface. Published diagrams/tables vary; the implementation uses the explicit values recorded above, not an unverified picture label or a normalized hybrid table.
- [ABA guideline, DOI 10.1093/jbcr/irad125](https://pubmed.ncbi.nlm.nih.gov/38051821/): adult ≥20% scope and 2 mL initial estimate; traditional Parkland remains separately identified.
- [Royal Children's Hospital acute burns guidance](https://www.rch.org.au/clinicalguide/guideline_index/Burns/): age-specific pediatric assessment and exclusion of epidermal erythema.

This is a coarse whole-region estimate, not pixel tracing of a wound. A tap selects the complete highlighted region, as explained beside the map. Partial-region burns need independent assessment; an assessed percentage can override fluid input. The interpolation and unknown-age range presentation are implementation choices, not new clinical formulas. The changes have arithmetic and UI verification, not prospective clinical or physical-device validation.

## Verification

- Source reference columns, worked anatomical totals, linked-region deduplication, 63 full-body age checks, unknown-age correlation, invalid ages and both fluid coefficients: pass.
- Real browser clicks: immediate adult percentage, child range and optional age, select/deselect, all 32 regions, full-body 100%, linked trunk targets, formula switching, Persian weight/time/percent input, manual override, invalid/cleared fields, pediatric fluid restriction and reset: pass.
- Twenty primary adult/child viewport states at 280, 320, 390, 568 landscape and 1280 px in light/dark: pass. Optional fluid controls stay closed in the main flow and contain their content when expanded. Selected views were visually inspected.
- A blur/change bug found during testing is fixed: the shared numeric handler invalidated the live fluid result before a following click, collapsing the result under the control being pressed. The burn inputs now recompute on change as well as input. The real blur interaction is covered by the browser test.
- All 4608 main forward/reverse pump cases and 15 manual factor-independence cases: pass. Existing calculator safety regressions pass.
- Original source-reader integrity tests pass. Earlier reader rendering results are retained as historical, since those runtime files did not change.
- With browser/server network denied, the automatic burn map and downloaded drug reference/PDF work offline. Manual/automatic package migration, reuse and preservation on quota failure pass. Test fixtures now stage the failure before allowing an automatic update and await in-progress verification before eviction checks.
- Current offline inventory: 46 files, 24,199,045 bytes. App version, asset URLs, worker cache and inventory hashes match.

Chromium viewport tests were used; physical devices, Safari/WebKit and a new voice-model build were not tested. Palettes, existing touch-target geometry, fox pixels and loading effect, assistant download flow, Telegram controls, calculator formulas and drug-reference runtime remain unchanged. See `scope-preservation-5.4.4.json`.
