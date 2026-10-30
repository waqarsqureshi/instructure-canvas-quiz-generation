# Quiz Studio: browser authoring for Canvas

An offline question-bank editor that helps instructors **bulk-load existing
questions instead of entering them one at a time in Canvas**. Convert a bank
from Word into the editor's JSON format using an AI assistant, review and
validate the whole bank here, then generate a Canvas QTI ZIP.

You can also write and edit questions directly through forms. No server is
needed, and you do not have to write Canvas XML by hand.

**Open [quiz-editor.html](quiz-editor.html) in your browser.** It is a single,
self-contained HTML file. No Python, Node.js, server, installation, CDN or
internet connection is needed to write questions and download a ZIP.
Use a regular desktop browser such as Edge, Chrome or Firefox. Restricted IDE
preview browsers may intercept or suppress file downloads.

## AI development attribution

This code was generated and iteratively refined with assistance from an
**AI assistant using Copilot SDK in Visual Studio Code**, under instructor
direction. The AI-assisted work included the browser editor, question-format
validation, QTI/ZIP export, automated tests and documentation.

AI generation is not a guarantee of correctness. Instructors should review
question content, answer keys and imported scoring before using a quiz with
students. This is an independent teaching tool, not an official or certified
product of Instructure, Microsoft or the University of Galway.

## Quick start from GitHub

1. Download the repository using **Code > Download ZIP**, then extract it.
   Alternatively, download the generated [quiz-editor.html](quiz-editor.html)
   file itself; no other file is needed to run the editor.
2. Open the HTML file in a desktop browser. Viewing the file on GitHub shows
   its source, not the running application.
3. Click **Load example** to explore the complete computer-vision practice
   bank, or **New bank** to create your own questions.
4. Use **Save project** for an editable backup and **Export Canvas ZIP** for
   a Canvas import package. These are different file formats.
5. Import into an unpublished Canvas quiz and verify the result before use.

## Instructor workflow

### Bulk loading from a Word question bank

**Word bank → AI-assisted conversion → project JSON → review and validate in
Quiz Studio → QTI XML packaged as ZIP → Canvas**

1. Prepare the Word document with clear question numbers, types, marks,
   choices, units and any answer keys or worked solutions.
2. Give the document, or its copied text, to an institution-approved AI
   assistant with the [conversion prompt](AUTHORING_GUIDE.md#ai-conversion-prompt).
   Use an AI service approved for the sensitivity of the material; this editor
   does not upload your document or call an AI service.
3. Save the AI output as a `.quiz.json` file in [local-json/](local-json/).
   It must follow **`canvas-browser-v1`**, not an arbitrary JSON layout.
4. Click **Open project** and select that file to load the bank in one operation.
   Save your current project first: opening another project replaces it rather
   than merging banks.
5. Review every question against the Word source, including extracted
   equations, answer keys, marks and missing subparts. Use **Student preview**
   and **Validate**, then correct any reported issues.
6. Select the export target, click **Export Canvas ZIP**, and save the ZIP in
   [export/](export/). The tool generates the QTI XML and package structure.
7. Import the ZIP into Canvas and check presentation and grading before
   publishing.

**Validation checks structure and answer settings, not the truth of AI-generated
answers or completeness against your Word document.** Both need instructor
review. Malformed JSON may be rejected at opening; well-formed but incomplete
questions can be corrected in the editor before export.

### How Word, JSON and XML fit together

| Format | Role |
|---|---|
| Word document | Your original question bank; convert it externally with AI or another authoring process |
| Project JSON | The editable bank that **Open project** reads and **Save project** writes |
| QTI XML | The assessment/item, answer-key and scoring structures generated for Canvas |
| Canvas ZIP | The QTI XML and manifest packaged for import into Canvas |

The [format references](#format-provenance-and-references) explain the XML
standards behind the export. JSON is the simpler authoring layer, **not** the
format uploaded to Canvas.

The editor does **not** directly import Word, arbitrary XML, or existing Canvas
ZIPs. An AI assistant can also help interpret an existing QTI XML bank and map
supported content into project JSON, but that is a separate conversion task,
not a guaranteed lossless migration. Formatting, assets, vendor-specific
metadata and scoring rules may not have equivalent editor fields; review
those differences explicitly.

### Creating or editing questions directly

1. Name the bank.
2. Select a question type and click **Add question**.
3. Enter the question, answers, points and optional instructor notes.
4. Duplicate or reorder questions to build the bank quickly.
5. Click **Save project** to download an editable `.quiz.json` backup.
6. Select **New Quizzes** or **Classic Quizzes**, then **Export Canvas ZIP**.
7. Fix any validation errors. Review the export summary and compatibility notes,
   acknowledge them, and download the ZIP.
8. Import into an **unpublished test quiz**, check the questions and scoring,
   then publish when satisfied.

See [AUTHORING_GUIDE.md](AUTHORING_GUIDE.md) for detailed form instructions.
The same essentials and source links are available inside **Help & references**.

## Where your files go

Two subfolders beside [quiz-editor.html](quiz-editor.html) keep editable projects
separate from Canvas import packages:

| Folder | Contents | How to use it |
|---|---|---|
| [local-json/](local-json/) | Editable `.quiz.json` projects, including the bundled practice example | **Save project** into this folder; **Open project** to select a JSON file here |
| [export/](export/) | Exported Canvas `.zip` packages | **Export Canvas ZIP**, then **Download ZIP** into this folder; select that ZIP when importing in Canvas |

In your browser's **Downloads** settings, enable **Ask where to save each file
before downloading** (or the equivalent option). Choose the relevant folder in
the save dialog. If your browser saves directly to Downloads, move the file
into the relevant folder afterwards.

The standalone HTML cannot force a download location or automatically write
beside itself. The folders organise your files; they are not automatic save
destinations. **Load example** still uses embedded data and works without them.
Keep both folders private: JSON projects contain solutions, and ZIPs contain
grading keys. ZIPs are not editable project backups.

## Full practice-question example

Click **Load example**, or use **Open project** to select
[practice_questions.quiz.json](local-json/practice_questions.quiz.json). Save your current
project first; the editor asks before replacing a non-empty bank. The example
is embedded in the HTML, so the button works offline without the sibling JSON.

The example adapts all questions and subparts from the CT4109 *Practice
Questions — Weeks 1–4*, with worked instructor notes based on the accompanying
*Practice Solution Manual*. Those original teaching documents are not bundled
in the standalone editor folder.

- **76 scored items:** 43 numerical and 33 manually graded essays.
- **12 shared stimuli:** common givens, not extra questions or marks.
- **180 points**, preserving each original question's total and subpart marks.
  Split coordinate answers use fractional points.
- Scalar calculation responses are separated for automatic scoring; matrices,
  derivations and explanations remain written responses. Original Q numbers
  and part letters are retained in titles.
- Readable plain-text mathematics replaces source LaTeX. Numerical prompts
  specify units and rounding where needed; editable tolerances allow rounding.

A **stimulus** is shared information used by related questions. For example,
Q13's stimulus gives `f = 1000 px` and `B = 0.2 m`; linked questions ask for depth
at different disparities. Select **Q13 — Shared stereo rig** to see its five
linked questions, then select one to preview the givens above its question.
Use **Add linked question** to reuse that setup.

Use the **New Quizzes** target for this example. Export repeats the givens in
each linked item, not as a native Canvas stimulus; Classic blocks stimuli.
Worked notes stay in the project, not the ZIP. **Both the example JSON and the
HTML contain the worked solutions; publish them only if that content is
intended to be public practice material.** Canvas ZIPs also contain answer
keys. Additional MCQs/true–false questions from the original teaching collection
are not included in this Q1–Q20 example.

## Export targets: important distinction

### New Quizzes: portable QTI 2.1

This is the default target. It is **not a certified native Canvas exporter**.
The public New Quizzes API documents question types, but does not establish a
complete native QTI encoding for all advanced interactions. This tool therefore
uses portable QTI encodings and explicitly discloses the adaptations below.

| Authored type | Portable export |
|---|---|
| MCQ, multiple answers, true/false | QTI choice interaction and response keys |
| Short answer, numerical | Text-entry interactions with explicit scoring |
| Multiple blanks/dropdowns | Embedded text-entry/inline-choice interactions |
| Matching | Standard matching interaction |
| Essay, file upload | Manual-grading interactions |
| Ordering | Standard ordering interaction; Canvas recognition requires testing |
| Hotspot | Standard rectangular hotspot with the PNG/JPEG bundled in the ZIP; requires Canvas testing |
| Categorisation | **Many-to-one matching**, potentially displayed as Matching in Canvas, not native Categorisation |
| Shared stimulus | Text repeated inside every linked question, **not a native linked stimulus** |
| Formula | One numerical item **per generated sample**, not a native randomised Formula item |
| Information | Non-interactive item; check Canvas presentation after import |

These conversions are shown before export, never silently applied. Formula
variants increase both the exported item count and total points. Select the
desired variants from the imported bank rather than assigning every variant
unintentionally.

Portable auto-scoring is all-or-nothing per question. Canvas may apply its own
scoring interpretation. Preview correct, partially correct and incorrect answers.
The standalone tool cannot verify live Canvas import behaviour.

### Classic Quizzes: QTI 1.2

The 12 Classic types remain available, including a calculated-question extension
for formulas. Classic export **blocks** ordering, categorisation, hotspots and
shared stimuli rather than dropping or converting them silently.

## Importing

**New Quizzes:** Create an empty, unpublished New Quiz, open **Build**, and use
its QTI import option (usually in the options menu). Select the downloaded ZIP.
Institution versions and enabled features may change the labels or available
import routes. Do not select a Classic course-content import by mistake.

**Classic:** Use **Settings > Import Course Content > QTI .zip file**. Choose a
destination bank if offered. Leave conversion to New Quizzes disabled for this
Classic-targeted package.

In both cases, inspect import warnings, question types, points, image sizing,
answer keys, scoring and visibility before publishing. The portable QTI 2.1
package does not configure Canvas-specific publication or result visibility.

## Saving, privacy and limitations

- **Save project** is the durable backup. Reopen that JSON using **Open project**.
  The ZIP is an import package, not the editor's editable project.
- Browser draft saving is best-effort. Private browsing, storage limits and
  moving the HTML file can affect it. A storage error is shown explicitly.
- Everything stays in your browser until you manually save or import it.
  Following a reference link opens an external website.
- Keep project files and ZIPs private. Projects contain instructor notes;
  ZIPs contain scoring keys. Instructor notes are **not included in the ZIP**.
- Prompt text is plain text with line breaks. HTML and LaTeX are not rendered.
- Hotspots accept one local PNG/JPEG image up to 5 MB / 8000 pixels per dimension,
  with one rectangular correct region. No SVG, remote-image fetching or general
  attachment packaging.
- Formula syntax is a safe arithmetic subset, not the entire Canvas formula
  language. Details are in the authoring guide.
- Project limit: 500 entries. ZIP limit: 100 MB. No Canvas login or API token is
  requested.

Use **Load example** for the full practice set.

## Files and developer checks

- [quiz-editor.html](quiz-editor.html): generated, self-contained instructor app;
  this is the only file needed to run it.
- [quiz-core.js](quiz-core.js): project validation, safe formulas, QTI export and
  dependency-free ZIP writer.
- [editor.js](editor.js), [editor.css](editor.css),
  [editor-shell.html](editor-shell.html): editable application sources.
- [build-editor.cjs](build-editor.cjs): bundles those sources into the HTML.
- [practice_questions.quiz.json](local-json/practice_questions.quiz.json): editable
  Q1–Q20 instructor example, also embedded by the build.
- [test-quiz-core.cjs](test-quiz-core.cjs): Node.js tests.

Only developers changing the source need Node.js (20 or later):

```powershell
node build-editor.cjs
```

The build embeds the application sources and the practice JSON into the HTML.
It has no external package dependencies.


### Repeat the Canvas test before publishing a quiz

1. Create an **unpublished test quiz** and select the intended export engine.
2. Export the bank and import its ZIP using the matching route described in
   [Importing](#importing).
3. Compare question counts, titles, prompts, units and points.
4. Preview correct and incorrect answers. Check numerical rounding/tolerances,
   manual grading, and any partial-credit behaviour.
5. For advanced types, check ordering, hotspot regions, categorisation-as-
   matching, repeated stimulus text and generated formula variants separately.
   The bundled Q1–Q20 example does not exercise every supported type.
6. Confirm worked instructor notes are not visible to students. Configure
   Canvas result/answer visibility separately; the ZIP contains grading keys.
7. Record the test date, quiz engine, browser, tested types, import warnings and
   results. Do not include student information or access credentials in reports.

## Format provenance and references

The forms, `canvas-browser-v1` project JSON and editor are custom designs.
**Project JSON is not a Canvas standard.** New export follows portable QTI 2.1;
Classic export follows Canvas's QTI 1.2 conventions.

Sources consulted **29 October 2026**:

| Source | Used for |
|---|---|
| [1EdTech QTI 2.1 Implementation Guide](https://www.imsglobal.org/question/qtiv2p1/imsqti_implv2p1.html) | Standard interactions, declarations, assessment structure and scoring. |
| [Official QTI 2.1 XML schema](https://www.imsglobal.org/xsd/imsqti_v2p1.xsd) | Schema validation of the generated portable assessment and all question-type examples. |
| [Instructure New Quiz Items documentation](https://developerdocs.instructure.com/services/canvas/resources/new_quiz_items) | Native question-type names and stimulus relationships. This is an API reference, **not a QTI import guarantee**. |
| [Canvas Classic item exporter: `qti_items.rb`](https://github.com/instructure/canvas-lms/blob/master/lib/cc/qti/qti_items.rb) | Classic question types, numeric encodings, answer conditions and calculated extension. |
| [Canvas QTI package generator: `qti_generator.rb`](https://github.com/instructure/canvas-lms/blob/master/lib/cc/qti/qti_generator.rb) | Classic resources, assessment metadata and manifest dependencies. |
| [Canvas New Quizzes integration: `new_quizzes_generator.rb`](https://github.com/instructure/canvas-lms/blob/master/lib/cc/qti/new_quizzes_generator.rb) | Shows native export being obtained from another service; it does not define every advanced question encoding. |
| [New Quizzes-related ZIP fixture](https://github.com/instructure/canvas-lms/blob/master/gems/plugins/qti_exporter/spec_canvas/fixtures/qti/lti_qti_new_quizzes.zip) | Inspected package layout; it does not establish native ordering/categorisation/hotspot/stimulus encodings. |
| [Canvas calculated fixture](https://github.com/instructure/canvas-lms/blob/master/gems/plugins/qti_exporter/spec_canvas/fixtures/canvas/calculated_simple.xml) | Calculated extension and variable-set structure. |
| [Canvas multiple-blank fixture](https://github.com/instructure/canvas-lms/blob/master/gems/plugins/qti_exporter/spec_canvas/fixtures/canvas/fimb.xml) | Grouped blank responses and alternatives. |

The last two fixtures are converted QTI 2.1 importer fixtures, not proof of
current New Quizzes behaviour. GitHub links point to moving `master` branches,
not pinned releases. This is an independent teaching tool, not an
Instructure-provided or certified product.
