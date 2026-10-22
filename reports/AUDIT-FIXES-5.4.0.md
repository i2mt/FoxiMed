# FoxiMed 5.4.0 — approved audit work

Updated 22 October 2026. Prepared for upload; not deployed. This is a cumulative replacement package including the earlier first-launch, welcome, tutorial, Settings and drug-reader changes.

## Calculator guidance

Missing required inputs receive a quiet outline using the existing theme. The main Calculate button stays subdued until the current inputs are valid, then returns to the full existing theme color and says ready. Guidance follows the selected drug, custom amount/final volume, weight requirement and forward/reverse mode. Selecting Calculate with missing information reveals the first missing field. Readiness describes input completeness, not clinical approval. No flashing, pulsing or new theme palette was introduced.

## Audit disposition

“Fixed” below describes the reproduced software defect. It does not certify a drug dose, clinical policy or patient-specific decision.

| Finding | Disposition in this package |
| --- | --- |
| C01 Voice confirmation/execution units | Fixed: mass, rate period and weight dimensions use the shared conversion engine before confirmation; executed values use the converted units. Incompatible dimensions are rejected. |
| C02 Manual grams to micrograms | Fixed: 1 g = 1,000,000 mcg; independently tested across all mass pairs, time periods and weight modes. |
| C03 Biological units versus mass | Fixed: no generic conversion between units and g/mg/mcg. |
| C04 Electrolyte factors | Fixed elemental Ca/Mg equivalent weights and matching legacy factors. UI distinguishes elemental ion mass from salt/product mass. |
| C05 Nutrition units | Fixed daily water arithmetic and complete-formula volume; removed subtraction of protein calories from complete feed. Calorie density and water fraction are visible editable assumptions. Estimates retain clinical-review limits. |
| C06 Guide/copy mode and units | Fixed: calculation, guide, copy and history use the same record, preparation and active dose unit. |
| C07 Fractional amount rounded to zero | Fixed: meaningful nonzero precision retained; preparation no longer adds the drug twice. |
| H01 History reconstruction | Fixed complete schema for new records: strength, count/custom amount, final volume, method, weight, unit, mode and actual input. Restore does not create another record. Old records remain explicitly archived, with no automatic reconstruction. |
| H02 Stale results | Fixed input/select invalidation in Tools and manual calculation; empty/invalid paired converter input clears the counterpart/result. Ventilator and nutrition segmented controls invalidate previous output. |
| H03 Tab changes reset drafts | Fixed: converter initialization runs once. |
| H04 Inferred tubing factor | Fixed: optional explicit 10/15/20/60 drops/mL selection; no factor inferred from solution volume. Pump calculation works without selecting a set. |
| H05 Diluent versus final volume | Fixed labels and preparation sequence: final volume includes drug volume. |
| H06 Invalid inputs/scope | Fixed reproduced negative BMI, age 150 CrCl and zero-volume percentage cases; added positive/finite checks and adult scope for BMI, IBW, CrCl and nutrition. This is not an exhaustive physiologic-range validation of all tools. |
| H07 Normal-pH mixed blood gas | Reproduced branch fixed: compensation is checked even with normal pH. VBG explicitly states that arterial compensation rules are preliminary for venous samples. Full clinician-reviewed decision-table validation remains outstanding. |
| H08 Compatibility keys | Fixed canonical ordering, lasix/furosemide and tng/nitroglycerin aliases, name resolution, and conflicting duplicate handling. All existing known pairs are reachable. Pair-specific clinical sources/conditions still require review; no new compatibility claims were invented. |
| H09 Alert settings | Fixed settings wiring to dose indicators/warnings and result compatibility lists. Stored dose/concentration/rate limits are checked where units are supported; malformed or absent limits are not represented as comprehensive protection. UI states that the limits lack a recorded clinical-review date. |
| H10 Clinical data governance | Added prominent provenance/review status to reference entries; targeted heparin/norepinephrine legacy-note corrections have source URLs. All 827 extracted monographs remain clinically unvalidated. Full pharmacy/clinical review is outstanding. |
| H11 Burns | Requires confirmed TBSA, explicit adult protocol, elapsed time from injury and fluid already given. Supports explicitly selected traditional 4 mL and ABA adult ≥20% 2 mL initial estimates; remaining volume is not presented as an automatic catch-up pump prescription. Stored adult map percentages totalled 102.5%; unvalidated adult/pediatric percentage tables were retired. Diagrams record regions only. Automatic age-specific TBSA estimation and pediatric fluids await qualified review. |
| H12 Cancel log deletion | Fixed duplicate local export/delete handlers. Cancel preserves the log; export has one owner. Telegram controls were not changed. |
| H13 Corrupt settings/false-ready loader | Fixed malformed settings recovery; readiness is gated on successful app initialization. A stalled initializer shows reload guidance instead of revealing a blank app as ready. |
| H14 Silent 70 kg voice assumption | Fixed: actual weight is required for a weight-based command; missing weight blocks execution and asks for it. |
| M01 Artificial startup delay | Shortened timed branding sequence, gated on initialization and a decoded/painted fox; minimum visible effect retained. Local audit samples were approximately 4.0 s before and 2.8 s after; these are not production benchmarks. |
| M02 Logo size | Lossless PNG recompression only: identical dimensions and decoded RGBA pixels, including transparency. Main fox 1,381,741 → 1,265,904 bytes; clean mask 16,074 → 15,407 bytes. Fox size/glow/fill retained. |
| M03 Assistant download | Deferred exactly as requested. Preload conditions, model cache namespace and generated model behavior retained. |
| M04 CDN icons/fonts | External icon/font dependency remains. Icon/accessibility fallback changes were left out of this scope; one icon-specific touch suite is blocked with that CDN denied. Offline drug text/PDF work with browser fallback fonts. |
| M05 Whole-reference offline | Implemented explicit opt-in package, about 23.9 MB uncompressed: all ten chunks, index/catalog/data, source PDF and necessary same-origin app shell. Progress, cancel/resume, integrity verification, quota/error handling, removal and eviction detection. No whole-reference/model download on launch. |
| M06 Programmatic labels | Deferred: accessibility excluded. |
| M07 Zoom/text scaling overhaul | Deferred: accessibility excluded. Existing setup responsive behavior retained. |
| M08 Touch targets | Deferred exactly as requested. |
| M09 Theme contrast/colors | Deferred exactly as requested. Only the separately requested calculator readiness treatment uses existing theme colors. |
| M10 Telegram controls | Deferred exactly as requested; no messages sent. |
| M11 Duplicate Enter | Fixed one calculation/history entry per Enter, routed to the current mode. |
| M12 Branding/units | Copy/export/history identify FoxiMed; canonical calculator records and outputs use mL/h and explicit dose units. Historical content is not silently reinterpreted. |
| M13 Shortcuts | Fixed startup handling: converters opens Tools; calculate opens Calculator. Real installed-OS shortcut behavior still needs hardware testing. |
| M14 Modal/selection accessibility | Deferred: accessibility excluded. |

The optional saved name can now be deliberately cleared using the existing Settings save action. “Last update” shows the release date rather than today's date on every visit.

## Offline behavior and maintenance

The Reference tab offers an explicit download with size, status and cancel/resume. Every packaged file must match expected size and SHA-256 before completion. A failed HTML deployment fallback, interruption, quota failure or missing cached file cannot be labelled complete. Completed files remain available for a retry. The original PDF is included. The package includes a cached copy of the app shell, so root navigation and the Tools shortcut reopen offline even if the ordinary shell cache is absent.

The controlling service worker must acknowledge support for the complete reference package. An older worker cannot produce a ready-offline status; the UI requests applying the update/reloading first. Ordinary app updates preserve the dedicated reference cache. An explicitly completed replacement can remove an older reference package. Browser/OS storage eviction and clearing site data can still remove downloaded files; the UI explains this and can recheck them. Downloads are specific to each browser/profile/installed storage. External icon/fonts and assistant models are not part of this package.

After changing a packaged runtime file, run `python3 scripts/build-reference-offline-manifest.py`. CI's `--check` mode rejects a stale manifest. Upload all runtime replacements together. The model cache namespace is unchanged.

## Verification and limits

- Independent arithmetic: 36 combinations across mass pairs, time periods and weight modes, plus inverse round trips and incompatible-unit rejection. The broader audit also checked 28 main drug configurations and 15 manual mass cases against independent expected values.
- Browser regression: all 14 drugs' readiness states, missing weight/custom amount/custom volume, negative input, reverse mode, missing-field action, complete and custom history, single Enter, three previously incorrect voice commands, missing-weight rejection, precision, Ca/Mg, daily water, burn timing/prior fluid/scope, stale output, normal-pH mixed gas, compatibility aliases and cancel-delete.
- Responsive calculator: 280, 320, 390, 568 and 1280 px widths in light/dark; no horizontal overflow. Existing welcome tests cover 14 layouts/70 states, theme visibility, short screens and update invitations; tutorial checks cover 21 layouts/147 steps.
- Real service-worker test at a nested `/app/` path: no automatic reference/model download, corrupt-response rejection, cancellation, resume, all ten unopened chunks and source PDF with both browser and server network denied, navigation fallback, cache eviction, quota failure and a nonacknowledging older worker.
- Drug data/cache/reader, voice pipeline/asset fixtures, Persian/Arabic numbers, drug UI, navigation, tutorial, Settings/theme, welcome/discovery, responsive welcome and upgrade tests pass. Syntax checks pass for all root JavaScript files. Current machine-readable summaries are in `FINAL-CHECKS.json`, `calculator-safety-results.json`, and `reference-offline-results.json`.
- The icon-specific Settings touch suite could not pass with external Font Awesome blocked; full Settings headers, controls and keyboard activation passed separate suites. The old `settings-mobile-results.json` is historical and is not evidence of a pass under this blocked-CDN condition.
- Chromium emulation only. Physical iPhone/Android, Safari/WebKit, actual OS install/keyboard/shortcut behavior, real microphone recognition, production hosting/compression, low-memory hardware and the full model build were not tested. No production deployment was performed.
- No exhaustive validation of 827 monographs, 435 compatibility records or every clinical recommendation. Clinical review remains necessary; software regression checks do not establish clinical certification.

## Primary clinical sources consulted

- [DailyMed calcium gluconate](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=788ab6d7-d80c-0220-e053-2991aa0ae6e9) and [magnesium sulfate](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=e921a46b-9a5b-4163-9c88-224247541f14): elemental versus product mass.
- [ATS arterial blood-gas interpretation](https://www.thoracic.org/professionals/clinical-resources/critical-care/clinical-education/abgs.php): compensation and mixed processes.
- [ABA burn-shock guideline](https://doi.org/10.1093/jbcr/irad125): adult ≥20% TBSA scope and selected initial estimate.
- [SCCM Surviving Sepsis Campaign 2026](https://www.sccm.org/clinical-resources/guidelines/guidelines/surviving-sepsis-campaign-international-guidelines-for-management-of-sepsis-and-septic-shock-2026) and [DailyMed heparin](https://dailymed.nlm.nih.gov/dailymed/lookup.cfm?setid=feec2820-502f-4a97-84c9-f173729c51d3): targeted legacy-note review.

Sources consulted 21 October 2026. Source consultation dates are not fabricated clinical sign-off dates for the database.
