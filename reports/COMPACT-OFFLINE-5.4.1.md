# FoxiMed 5.4.1 — compact offline controls and pump calculations

Updated 22 October 2026. Prepared for upload; not deployed. Earlier 5.4.0 audit work remains included, with the main drip-selector behavior superseded by this update.

- The Reference tab uses a compact download strip: title, size, Download and Later. It measures 48 px high at the tested 320–1280 px widths and 59 px at 280 px. It disappears after a verified complete download. Later dismisses it across reloads.
- Settings → Data & Offline Reference owns download/resume, manual update checking, removal and the automatic-update switch. Reference controls appear first in that Settings section. Explanations and detailed status stay there.
- First-time reference download remains user-initiated. After a completed download, automatic updates follow app releases by default and can be disabled in Settings. Valid cached files are reused; only missing/changed files need fetching. A fully verified earlier package migrates without another whole-reference download. A failed update retains the previous complete package. Cancel pauses automatic continuation for the current version; removal prevents automatic redownload.
- The main calculator no longer has a drip-factor selector, a drops/minute result, or extra guide text asking for tubing selection. Forward and reverse calculations use dose, preparation, final volume and weight where applicable, and return pump results in mL/hour. They do not infer a factor from syringe/bag volume or pump type.
- Tools and manual calculation retain explicit drip factors for gravity/drop calculations. In the manual calculator the factor is optional for mL/hour; leaving it blank hides the drops/minute result while preserving the pump calculation.

## Expected-answer checks

`tests/pump-without-drip.test.js` executes the production input/calculation functions with no main drip selector in the DOM. All **4,608** tested forward/reverse cases across all **14 drugs**, available strengths, both pump modes, weight modes, ampoule/custom amounts and six final volumes match independently calculated values. It also checks concentration and duration. Fifteen manual cases confirm the same mL/hour answer with no factor and with 10, 15, 20 or 60 selected.

Synthetic arithmetic examples, not dosing recommendations:

| Preparation | Calculation input | Expected pump rate |
| --- | --- | --- |
| Heparin 10,000 units in final 50 mL | 1,000 units/hour | 5 mL/hour |
| Norepinephrine 4 mg in final 50 mL | 0.1 mcg/kg/min at 70 kg | 5.25 mL/hour |
| Fentanyl 1,000 mcg in final 50 mL | 10 mcg/hour | 0.5 mL/hour |
| Unspecified drug, 1 g in final 50 mL | 10 mcg/min | 0.03 mL/hour |

These are dimensional-arithmetic regressions. They do not validate a prescription or the clinical content of every drug monograph.

## Verification

- Pump expected-value suite: 4,608 main cases and 15 manual-factor independence cases passed without browser dependencies; added to CI.
- Calculator browser regression: all 14 drugs' readiness behavior, forward/reverse/custom/weight modes, complete history, conversions, missing-weight rejection and the other 5.4.0 safety regressions passed in Chromium.
- Compact/offline update browser suite: five widths, persistent dismissal, Settings controls, no first-time automatic download, synthetic prior-release migration, automatic and manual updates, disabled auto-update preference, zero extra downloads for unchanged monographs/PDF, prior-cache preservation on failure and removal behavior passed.
- Real service-worker tests at `/app/`: cancellation/resume, exact-byte/SHA-256 checks, all ten chunks and the complete PDF offline, app-shell fallback, cache eviction, quota errors and capability checks passed. The compact invitation hides after success.
- Settings/theme regression: 12 layouts and all 108 submenu checks passed. No palette, accessibility overhaul, existing target-size, assistant-download or Telegram-control changes were made.
- Runtime syntax and exact offline-manifest validation passed. Current summaries are in `FINAL-CHECKS.json`, `pump-without-drip-results.json`, `compact-offline-update-results.json`, `calculator-safety-results.json` and `reference-offline-results.json`.

Chromium testing does not replace physical iPhone/Android or Safari testing. The prior clinical-review limits and external icon/font dependency remain documented in `AUDIT-FIXES-5.4.0.md`. Older reports are historical.

## Drop-factor context

The main calculator computes volumetric pump flow. Drop factors describe the administration tubing and are used to convert volumetric flow to drops/minute. They are not a universal pump setting: [B. Braun's Infusomat Space pump-set catalog](https://www.bbraunusa.com/en/products/b/infusomat-space-pumpsets.html) lists different drop factors, including 15, 20 and 60 drops/mL. No fixed factor is assigned merely because the selected device is a syringe or infusion pump.
