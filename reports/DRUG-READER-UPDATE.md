> Historical revision. The current single-stage, initially closed topics and tutorial changes are documented in `LATEST-UPDATE.md`.

# Drug reader, title and mixed-direction update

Updated 2026-10-20. This is a cumulative replacement package based on the supplied source ZIP, including the earlier performance and compact-card fixes.

## Changes

- Fixed the importer root cause: Persian names now come only from actual white title spans in the PDF, including adjacent name numbers/letters. Clinical text above a heading cannot become its name. The body boundary no longer starts four points above the heading. Carryover clinical lines belong to the preceding drug. All 827 source record IDs are preserved.
- Audited all 827 imported titles. Compared with the previous delivery, 126 Persian titles and 134 English display names changed. This includes contaminated titles for Aminoglutethimide, Nitrazepam, Cetylpyridium-B, and Multivitamin Plus Iron. See `drug-reader-title-corrections.csv` for every name difference.
- Applied 134 explicit English heading spelling/spacing corrections, with original names kept as discovery aliases and in `sourceHeading`. NLM RxNorm returned term matches for 115 of the checked terms. The remaining editorial entries are simple spelling/route typography or paired-source reviews; they are not represented as RxNorm-verified. Exact lookup results and URLs are in `drug-spelling-verification.json`.
- Corrected the detected Persian fibrillation misspellings (including the extra letter in the ventricular phrase) and the detected fibrinolysis transposition in display sections. Raw `sourceText` and the supplied PDF remain available unchanged apart from corrected record boundaries; no dose or recommendation is copy-edited.
- A reversed pure heading in Multivitamin is recognized as the indication/route/dose section, so its clinical body is no longer hidden in metadata. This changes section boundaries only.
- Opened cards now have a short metadata area, a separate forms/strengths area, and labeled topic disclosures. The complete indication/route/dose topic opens first. Other topics open individually. The comprehensive action still reveals all monograph topics, including pregnancy/lactation. Long forms lists are also behind a topic control. Text is not truncated to make a clinical summary.
- Reflowed PDF hard line breaks within paragraphs while retaining separate numbered instructions, bullets, system rows, and printed forms rows. Long source tables retain their rows rather than being assigned inferred column meanings.
- Explicit RTL paragraphs and isolated LTR islands keep English text and numeric expressions together. Short number/unit runs do not wrap across lines; adjacent numbers/units receive visual spacing without changing their characters. Limited paired punctuation repair is confined to extracted Latin acronyms and the reversed closing parenthesis at the start of a pure English form line.
- Closed cards remain 66 px high and use the existing Tools coloring, header, chevron, whole-header toggle and shared scroll-close helper. Source attribution remains one muted footer sentence.
- Startup still renders 40 cards and requests no book chunks. Index, reader, styles, worker and data revisions were bumped together to avoid stale cached titles/details.

## Validation

- All 827 titles and 7,004 display sections pass renderer/content preservation checks. Inline direction isolation preserves every source character; paragraph reflow preserves the text apart from explicitly recognized printed label markers. Numeric values are not reversed, converted, rounded or reconstructed.
- The source numeric-token comparison has one intentional duplicate removal: the pediatric Multivitamin line was also imported into Multivitamin Plus Iron. Its three numeric tokens remain in the correct Multivitamin entry. Other moved numeric lines are retained under the preceding correct entry.
- Drug schema/stable IDs/index relationships, lazy/offline cache revision isolation, reader preservation, existing voice smoke tests, and rendered UI regressions are included. CI now runs the reader regression as well.
- Rendered tests cover 1280, 390 and 320 px, compact density, contaminated-name regressions, fibrillation text, non-wrapping LTR numeric runs, topic keyboard/exclusive behavior, two information levels, scrolling close bars, Settings, Tools, search, paging, load failures and request races.
- Visual QA used local Font Awesome 6.4.0 assets and installed Persian/Latin fallback fonts, in Chromium light/dark views. No browser screenshots are included in the upload ZIP.

## Limits

This is an extraction, typography and editorial update, not a clinical validation of the 2008 source book. Original source inconsistencies and flattened dose/fraction/table layout still require specialist review. No complete monograph is marked clinically validated. Four Persian headings are absent in the source bands; unresolved classes/brands, three duplicate English-title groups and short entries remain listed in `drug-data-review.csv`. The earlier Abciximab source issues remain queued. Physical iOS/Android/Safari, the live site and the remote model build have not been tested here.

## Upload

Copy the archive contents into the repository root, preserving paths and overwriting matches. Keep all unrelated existing files. Upload all numbered book chunks, the index and the reader assets together. See `UPLOAD-INSTRUCTIONS.md` and `replacement-files.json`.

Current URLs: `drug-reference-index.js?v=2`, `drug-reference.js?v=6`, `drug-reference.css?v=5`, `script.js?v=51`, `style.css?v=44`, `service-worker.js?v=50`, and lazily requested `drug-reference-book-NN.js?v=3`.
