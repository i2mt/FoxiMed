# FoxiMed 5.4.5 — clear burn-fluid inputs and remaining-volume results

Prepared 28 October 2026; not deployed. This cumulative update addresses the burn-section layout and apparently missing ABA calculation.

The adult/child map flow stays separate from optional fluid planning. The fluid panel now has one visible percentage field shared by both methods, next to weight. It is filled from the map until edited. Manual values are explicitly identified and retained when switching methods; a Use map action restores automatic tracking. Clearing a manual value no longer silently substitutes a different percentage. The primary body-map estimate remains the result of the selected regions.

The two method cards are compact and remain side by side on narrow normal-text layouts. The total's label sits above its amount instead of being squeezed beside a long number. The burn content is capped at 720 px and centered on desktop, so fields and their labels do not stretch across the full page. Weight, percentage, time and prior-fluid inputs use consistent 40 px shells, short labels, separate unit suffixes and equal alignment. Optional time/prior-fluid controls remain closed in the normal map flow.

Remaining fluid is no longer rendered as a faint explanatory paragraph. It has bold amounts in the normal primary text color, a time-left value, and separate labels for the current time window and the complete first 24 hours. Once eight hours have elapsed, the duplicate current-window amount is hidden because it equals the 24-hour remaining amount. Invalid or incomplete inputs clear the previous result immediately. A recorded amount above the formula's total yields zero mathematical remainder with an explicit explanation; it does not prescribe stopping or catching up fluids.

## ABA behavior and worked checks

The arithmetic core was unchanged. Previously, selecting ABA with TBSA below 20% hid the amount and placed the reason in a low-emphasis hint; this could look like a nonworking calculation. The applicable scope is now checked before weight, and a visible status card states the entered percentage and explains why an amount is unavailable. Eligible ABA values calculate immediately from the same displayed percentage used by Parkland.

The [ABA guideline abstract](https://pubmed.ncbi.nlm.nih.gov/38051821/) was checked again on 27 October 2026: its population is adults with at least 20% TBSA and it recommends a 2 mL/kg/%TBSA starting estimate. This scope is preserved, not bypassed to force a number to appear.

For 70 kg, 30% TBSA, two hours elapsed and 1000 mL already received:

| Method | First 24 h estimate | First 8 h target | Remaining to 8 h | Remaining to 24 h | Time left to 8 h |
| --- | --- | --- | --- | --- | --- |
| Traditional Parkland, factor 4 | 8400 mL | 4200 mL | 3200 mL | 7400 mL | 6 h |
| ABA, factor 2 | 4200 mL | 2100 mL | 1100 mL | 3200 mL | 6 h |

These are formula totals and differences, not automatic pump rates or treatment indications. The starting time is the injury, not admission. Pediatric fluid dosing remains outside this panel.

## Validation

- Real mouse/keyboard input in Chromium verifies map inheritance, manual percentages, formula switching, Persian digits, blur, reset, restoring map values, incomplete/invalid data and pediatric restriction.
- ABA at 19.99% shows a visible scope explanation and no stale amount; 20% and 30% produce their expected volumes. At 30% and 70 kg, the app produces 4200 mL and the 1100/3200 mL remaining amounts above.
- First/second time windows, exactly eight hours, prior fluids above the formula total, cleared prior-fluid input and invalid 24-hour elapsed input are covered. Late-window duplicates are not displayed.
- Twenty adult/child primary viewport states and ten expanded-fluid states at 280/320/390/568 landscape/1280 px in light/dark pass without horizontal overflow. The paired time/intake shells have equal top positions and 40 px heights.
- Both remaining amounts use fully opaque primary text, at least 18 px and bold weight, across all six palettes in light/dark. The total's label stays above its value. Enlarged-text containment passes. Selected phone and desktop views were visually inspected. Expanded panels, field shells and result grids are checked against both the centered body and viewport bounds.
- All 63 full-body age checks and existing burn-core arithmetic checks pass. All 4608 main-calculator forward/reverse cases and 15 manual-factor cases pass. The broader calculator safety test passes with the new result fields.
- The real service-worker offline suite passes, including the automatic burn map, complete reference and PDF, cache eviction and quota handling. Automatic/manual migration is checked with current release assets.
- Offline inventory: 46 files, 24,207,913 bytes, with exact sizes and SHA-256 matching the runtime. App, worker and asset versions are aligned.

Browser checks used Chromium viewport simulation. Physical devices and Safari/WebKit were not tested. Existing palettes, SVG geometry, percentage/volume arithmetic, fox assets/effect, assistant flow, Telegram controls and reference runtime remain unchanged. Input sizing and calculated-text styling are intentionally revised only in the burn section. See `scope-preservation-5.4.5.json`.
