# FoxiMed 5.4.3 — mixed Persian, Latin and numeric drug text

Prepared 24 October 2026; not deployed. This cumulative update addresses the two acetaminophen screenshots.

System/category labels such as Hep, Hem, Met, Derm, CNS, GI and CV now occupy separate labelled rows. The parser recognizes source labels before or after their description, separates multiple labels on a line, and retains wrapped continuation text. Narrow phones stack the label above its description. Labels retain their original abbreviations. Ordinary Latin runs have a little more inline separation from Persian text, using the existing palette and typography.

Ranges written with the Persian connector «تا» are rendered as a single isolated left-to-right range. A value such as «۲۴ تا ۷۲ ساعت» reads as «24–72 ساعت»; the numbers cannot exchange positions or wrap independently. Ratios and slash notation retain their earlier handling. Numeric digits are never globally reversed.

## Targeted acetaminophen clinical-source correction

The original PDF and its extracted poisoning section contain 21–42, 42–84 and 27–69-hour intervals. This cannot be repaired by CSS. The exact poisoning-section text has a separate, source-attributed update based on [Merck Manual Professional's acute acetaminophen poisoning table](https://www.merckmanuals.com/professional/multimedia/table/stages-of-acute-acetaminophen-poisoning), checked 24 October 2026:

- Stage I: 0–24 hours.
- Stage II: 24–72 hours.
- Stage III: 72–96 hours.
- Stage IV: more than five days.

Its stage descriptions are concise Persian paraphrases of that same table. This is a specific clinical passage update, not a guessed transcription reversal. The footer adds a link identifying the source for those stages. Original book chunks and original PDF remain intact, and the update applies only if its original section matches exactly. The generic top-of-card review notice remains removed.

Other monographs have not been globally fact-corrected or clinically validated by this change. Existing fraction-layout overrides remain separate from the clinical update; all 94 recovered fractions and 398 timing tables retain their prior verification.

## Validation

- Displayed-character inventory matches the original source in all 626 sections containing recognized system labels; no words, values or punctuation were lost by label layout.
- Prefix labels, suffix labels, multiple labels per line, wrapped continuations, Persian range connectors, ratios, slash notation and exact clinical-source anchoring pass.
- Sixteen rendered adverse-effect/poisoning views at 280/320/390/1280 px in light/dark pass. Labels and descriptions do not overlap; there is no horizontal page overflow. Actual glyph positions confirm the three updated time ranges read left to right on one line. Selected phone and desktop views were visually inspected. Two additional Captopril views check that the longer Hypersensitivity label stacks above its description.
- All 827 titles / 7004 original source sections pass the source-preserving reader test; all 398 timing tables / 562 route cards and 65 fraction sections pass their earlier integrity tests.
- Existing drug search, paging, categories, disclosures, keyboard, retry, tutorial and bracket/numeric-position browser checks pass.
- All 4608 pump arithmetic cases and 15 manual factor-independence cases pass. Calculator formulas and drugDatabase.js are unchanged from 5.4.2.
- Real service-worker offline tests pass for all ten monograph chunks, corrected mixed-script text, the updated acetaminophen stages and their source link, earlier timing/fraction layouts, and original PDF. Compact automatic/manual offline updates retain reuse and failure-preservation behavior.
- Exact offline inventory: 44 files, 24,186,960 bytes. Current app, worker and asset revisions match.

Browser tests used Chromium, with external font/icon requests blocked. Physical iPhone/Android and Safari/WebKit were not tested. No voice-model build or deployment was performed. Existing palettes, fox assets/loading effect, assistant download flow, touch targets and Telegram controls are preserved.
