# FoxiMed 5.4.2 — drug-reader layout and dopamine verification

Prepared 24 October 2026; not deployed. This is part of the cumulative replacement ZIP.

The generic source/review notice above each opened drug card is removed. Source/page links remain in the footer, and clinical contraindication/precaution topics remain intact.

All 398 source timing tables now render as 562 route cards. Each card labels onset, peak and duration independently; small phones stack these fields vertically. Exact source anchors prevent a layout from being applied to different text. The original book chunks and original PDF are unchanged.

Numeric quantities use isolated left-to-right spans. Digits, signs, ranges, units, ratios and mixed fractions stay together. Safe numeric ranges have consistent lower-to-upper ordering in quantity/age contexts; ratios and equations are not reordered. Plain slash notation is preserved because the source uses it for decimals as well as fractions. It is not globally guessed into either a decimal or a fraction.

The PDF's genuine stacked fractions were identified from fraction bars and their numerator/denominator geometry. Ninety-four fractions across 65 sections are restored for display, including oral atropine onset of half to two hours and mixed fractions in disopyramide timings. Temporary extraction copies were checked for page-character integrity; final overrides preserve the source words in order. Fraction-bearing table cells use geometric positions rather than PDF stream order. See `drug-reference-layout-audit.json` and the exact original/text anchors in `drug-reference-presentation.js`.

## Dopamine results

The production formula already gives the expected weighted answers:

`mL/h = dose (mcg/kg/min) × weight (kg) × 60 ÷ concentration (mcg/mL)`

| Source example | Final preparation | Weight | Dose (mcg/kg/min) | Exact app result (mL/h) | Published result |
| --- | --- | --- | --- | --- | --- |
| DailyMed 1 | 200 mg / 250 mL | 60 kg | 2 | 9 | 9 |
| DailyMed 2 | 400 mg / 250 mL | 70 kg | 5 | 13.125 | 13.13 |
| NHS central chart | 200 mg / 50 mL | 70 kg | 5 | 5.25 | 5.3 |
| NHS peripheral chart | 400 mg / 260 mL | 70 kg | 5 | 13.65 | 13.7 |

The NHS preparation adds 10 mL of concentrate to a 250 mL bag, giving a **final 260 mL**, which is required to reproduce its answers. These examples verify arithmetic, not a universal preparation or prescribing recommendation. Published chart values are rounded to one decimal; the app retains internal precision and displays two decimals. Some other chart cells have inconsistent rounding, which was not copied into the formula.

The database's universal-looking `800 mcg/mL` maximum was removed for dopamine. DailyMed provides higher-concentration examples and the NHS chart uses 4000 mcg/mL centrally. A short concentration note now refers to the actual product, venous route and local protocol. No substitute universal maximum was invented. Existing dosing ranges and weight-toggle defaults remain unchanged.

Sources checked 24 October 2026:

- [DailyMed dopamine concentrate label](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=fc1eb709-ce72-413e-9043-8e463ef0fd36), updated 30 October 2025; sections 2.1–2.2.
- [Gloucestershire Hospitals NHS dopamine chart](https://www.gloshospitals.nhs.uk/documents/22897/Dopamine_infusion_chart.pdf), approved February 2025, review February 2028.

## Validation and scope

- Eight source examples/cells, both pump methods, 32 forward/reverse runs: pass. Actual weight toggle, missing/changed weight, Persian input, absolute mcg/min mode, history/copy units and displayed rounding: pass.
- All 827 titles and 7004 source sections retain their source tokens through numeric formatting; all 398 timing tables render, with exact source and timing-character checks: pass.
- Fifty-six rendered reference views at 280/320/390/1280 px in light/dark, including half and mixed fractions, with no horizontal overflow: pass. Selected timing views were visually inspected.
- Existing reader search/paging/disclosure/retry/tutorial and bracket-position regressions: pass.
- All 4608 main forward/reverse arithmetic cases across 14 drugs and 15 manual-factor independence cases: pass. Existing calculator safety tests: pass.
- Real service worker with browser/server network denied: all ten book chunks, corrected timing/fraction presentation, original PDF and offline reopening: pass. Compact invitation, manual/automatic migration, reused files and old-package preservation on failure: pass.
- Offline inventory: 44 files, 24,181,760 bytes (23.06 MiB). Exact byte sizes and SHA-256 match the runtime.

Physical devices, Safari/WebKit and a new voice-model build were not tested. External Font Awesome requests were blocked in the local browser checks; icon-specific appearance is outside these results. All 827 clinical monographs and pair-specific compatibility claims still require qualified clinical review; this update verifies presentation and selected dopamine arithmetic only.

Palettes, broad accessibility, existing touch targets, assistant download flow and Telegram controls remain outside this change. The fox images, larger launcher layout, glow and fill effects are unchanged. See `scope-preservation-5.4.2.json`.
