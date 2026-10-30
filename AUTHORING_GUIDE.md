# Authoring questions in Quiz Studio

Open [quiz-editor.html](quiz-editor.html). You no longer need to write Markdown,
JSON settings, or Python commands. Use the form fields, then download a ZIP.

For an existing Word question bank, use AI to prepare a project JSON file and
load all its questions at once using **Open project**. The editor handles
validation and QTI XML/ZIP generation; it does not directly read Word or call
an AI service.

## Bulk authoring with AI

1. Prepare clearly numbered questions in Word, with marks, choices, units and
   any supplied answer keys. Check that equations, tables and images survive
   text extraction correctly.
2. Supply the document or copied text to an institution-approved AI assistant,
   together with the prompt below. Do not send confidential assessments or
   student information to an unapproved service.
3. Save the returned JSON as, for example, `my_bank.quiz.json` in
   [local-json/](local-json/). Save plain UTF-8 text, not a Word document renamed
   to `.json`. Remove surrounding Markdown fences if the AI included them.
4. In Quiz Studio, use **Open project** to load the JSON. This replaces the
   current bank after confirmation; it does not append to it.
5. Compare question and subpart coverage, total marks, mathematical notation,
   keys and solutions against the original. Review any proposed AI answers.
6. Select your target, click **Validate**, fix errors and **Save project**.
   Then **Export Canvas ZIP** to [export/](export/) and test the import.

If opening fails, the JSON syntax or required field structure may be wrong.
Give the exact error back to the AI, or correct the file, then reopen it.
If the file opens but validation fails, use the editor to fix the listed
questions. A validation pass does not prove that an answer is correct or that
the AI included every source question.

### AI conversion prompt

Copy the following prompt and supply your question bank after it. This starter
prompt covers common text-based question types. For advanced types, create
one in the editor and **Save project** to obtain an exact structural example
for the AI rather than asking it to guess the schema.

```text
Convert the attached Word question bank (or the text below) into a Quiz Studio
project. I will load it using Open project, review it, validate it and export
it as a Canvas QTI ZIP. Do not generate Canvas XML or a ZIP yourself.

Return one complete JSON object with:
{
  "format": "canvas-browser-v1",
  "title": "Use the bank's title",
  "questions": []
}
Populate questions with every source question. Do not leave the array empty.

Each question must have ALL these fields:
- id: unique ASCII identifier, starting with a letter, followed only by
  letters, digits or underscores, maximum 101 characters; e.g. q001.
- type: one of the supported types described below.
- title: retain the original question number and a short descriptive title.
- prompt: student-facing plain text, including all necessary givens and units.
- points: a positive JSON number for a scored question; not a quoted string.
- solution: private worked solution or marking notes; an empty string if absent.
- stimulusId: an empty string unless linked to a shared stimulus.

Type-specific fields:
1. multiple_choice:
   choices: [{"text":"First choice","correct":true},
             {"text":"Second choice","correct":false}]
   At least two unique non-empty choices; exactly one correct.
2. multiple_answers:
   The same choices structure, with at least one correct choice.
3. true_false:
   answer: true or false (a JSON boolean).
4. short_answer:
   answers: ["accepted answer", "another accepted spelling"]
   At least one unique non-empty accepted answer.
5. numerical:
   numeric: {"mode":"exact","value":42,"tolerance":0,
             "min":0,"max":1,"figures":3}
   Include every numeric field, even those unused in exact mode. Set value to
   the actual correct answer and tolerance to an appropriate non-negative
   absolute tolerance, consistent with the units and requested rounding.
   Put units in the prompt; the student enters a number only.
6. matching:
   pairs: [{"left":"First item","right":"Its match"},
           {"left":"Second item","right":"Its match"}]
   distractors: []
   At least two pairs with unique non-empty left labels and non-empty matches.
   Any distractors must be unique and different from the correct matches.
7. essay or file_upload:
   No extra answer fields. Use solution for the private rubric.
8. text_only:
   No extra fields. Set points to 0; use for standalone instructions.
9. stimulus:
   No extra fields. Set points to 0 and stimulusId to "".
   Store only shared student-facing givens. At least one scored question must
   refer to its id through stimulusId. Use only for a New Quizzes project:
   Classic export blocks stimuli. If my target is unknown, ask before using
   stimuli. For Classic, repeat the necessary givens inside each question.

Conversion rules:
- Preserve all source questions, subparts, choices, givens, marks and order.
  Do not silently omit or merge content. Ask about missing or ambiguous marks.
- Preserve supplied correct answers. If no key is supplied, ask whether I want
  proposed answers before generating them. Label any authorised proposed
  answers "AI-proposed: verify before use" in solution.
- Keep correct answers and worked solutions out of student-facing prompts
  and stimuli. Store answer keys in the type-specific fields.
- Use readable plain-text mathematics and row-list matrices; the editor does
  not render LaTeX, Markdown or HTML. Preserve mathematical meaning.
- Keep matrix/vector responses, derivations and multipart written questions
  as essays. Ask before splitting them into scalar numerical questions; any
  agreed split must preserve every subpart and the original total marks.
- Do not pretend an image, equation or table was preserved if it was missing
  or unreadable in the input. Ask how to handle it before final conversion.
- Do not invent field names or silently replace an unsupported question type.
  Request an editor-saved example for types not defined above.
- Use valid JSON: double quotes, escaped internal quotes and \n for line breaks;
  no comments, trailing commas, NaN, Infinity or placeholder null values.
- Maximum 500 entries per project, including stimuli. For larger banks, ask
  to create separate complete projects; do not truncate the output.
- Check question/subpart coverage and original total marks before finishing.
- If anything essential is unclear, ask me first. Otherwise return only the
  complete JSON, with no Markdown fences or introductory prose.

My Canvas target: [New Quizzes or Classic Quizzes]
My question bank: [attach the Word file or paste its contents here]
```

### Small valid JSON example

This illustrates the required structure, not the content of your own bank:

```json
{
  "format": "canvas-browser-v1",
  "title": "Arithmetic example",
  "questions": [
    {
      "id": "q001",
      "type": "numerical",
      "title": "Q1 - Multiplication",
      "prompt": "Calculate 6 times 7. Enter an integer.",
      "points": 2,
      "solution": "6 times 7 = 42.",
      "stimulusId": "",
      "numeric": {
        "mode": "exact",
        "value": 42,
        "tolerance": 0,
        "min": 0,
        "max": 1,
        "figures": 3
      }
    }
  ]
}
```

**JSON versus XML:** this JSON is the editor's custom authoring format.
**Export Canvas ZIP** generates the QTI XML, scoring structures and manifest.
Do not upload the JSON directly to Canvas. Existing QTI XML can be interpreted
with AI as a separate migration task, but the editor has no XML importer and
cannot guarantee preservation of proprietary metadata, assets or scoring.

## 1. Start a bank

- Set **Bank title**.
- Select **New Quizzes · portable QTI 2.1** or **Classic Quizzes · QTI 1.2**.
- Choose a type under **Add a question**, then click **Add question**.
- Use **Load example** for the complete Q1–Q20 practice set, or **Open project**
  to load [practice_questions.quiz.json](local-json/practice_questions.quiz.json).
  It has 76 scored items (43 numerical, 33 essay), 12 shared stimuli and 180 points.
  Each original subpart is retained; split calculations share its marks.
  Solutions are in private instructor notes. Save your current bank before
  replacing it. The practice example uses the **New Quizzes** export target.

Each scored question needs a title, question text, positive points, and the
appropriate answer settings. Information and shared stimuli use zero points.
Prompts use plain text and line breaks. HTML/LaTeX are not rendered.
Include all necessary constants, units and matrices in the question.

## 2. Common controls

- **Duplicate** makes a copy with a new ID and the same answer settings.
- **Move up/down** changes question order.
- **Delete** asks for confirmation. Deleting a stimulus removes its question links.
- Changing type asks for confirmation and resets type-specific answer settings.
- **Instructor notes** are your worked solution or rubric. They are saved in
  the private project but are never included in the ZIP or student preview.
- **Student preview** approximates the content, not the exact Canvas interface.

## 3. Multiple choice, multiple answers and true/false

For multiple choice, enter at least two unique options and mark **exactly one**
as correct. For multiple answers, mark **all** correct options. For true/false,
choose the correct boolean using the dropdown.

New portable QTI scoring is all-or-nothing. Classic uses Canvas's own
multiple-answer policies; test partial selections after import.

## 4. Short answer

Enter every accepted spelling/phrase on a separate row. Comparisons are
case-insensitive. Alternatives are literal strings, not regular expressions.

Example: accepted answers `disparity` and `stereo disparity`.

## 5. Multiple blanks and dropdowns

Write placeholders in the question text:

> In P = K[R | t], [intrinsic] is the intrinsic matrix and [rotation] is rotation.

Add blanks named `intrinsic` and `rotation` (without square brackets).
Names begin with a letter and use only letters, digits and underscores.
Every prompt placeholder needs a corresponding blank.
Use each blank placeholder exactly once in the prompt.

- Multiple blanks: enter accepted answers for each blank.
- Dropdowns: enter at least two options for each blank and mark one correct.

Use square-bracket words only for placeholders in these question types.
New portable QTI awards the question's points only when all blanks are correct;
Classic import may use partial credit.

## 6. Matching

Enter at least two left/right pairs. Left-hand labels must be unique; the same
right-hand answer can be reused. Optional distractors must differ from the
correct right-hand answers.

For example:

| Left | Right |
|---|---|
| Essential matrix | Normalised image coordinates |
| Fundamental matrix | Pixel coordinates |

## 7. Numerical

Specify units in the prompt and ask students to enter a **number only**.

- **Value ± absolute tolerance:** for value 5 and tolerance 0.01, accept 4.99
  through 5.01 inclusive. Tolerance cannot be negative.
- **Inclusive range:** minimum and maximum are both accepted.
- **Significant figures:** enter the already-rounded non-zero target and
  1–15 significant figures. This defines a numeric acceptance interval,
  not the number of characters the student must type.

A numerical item accepts one scalar. Split vector/matrix calculations into
scalar questions or use an essay for working.

## 8. Formula

Write a formula such as `f * baseline / disparity`. Add each variable with:

- name;
- inclusive minimum and maximum;
- decimal places for its value grid (0–8).

Use matching placeholders such as `[f]`, `[baseline]`, `[disparity]` in the
prompt. Every declared variable must occur in the formula and prompt.

Select 1–100 samples, answer decimal places (0–10), and absolute tolerance.
Click **Check generated samples** to inspect the first ten saved combinations.
Sampling is deterministic for the same question ID and settings; duplicates
are possible in small ranges.

Supported arithmetic: numbers, variables, parentheses, unary signs, `+`, `-`,
`*`, `/`, `^` or `**`. Functions, scripts, assignments and property access are
rejected. No `eval` is used. Division by zero and non-finite results are errors.
Exponent magnitude is limited to 100. Choose valid ranges for every possible
combination; validation checks saved samples, not all mathematical possibilities.

**New export:** each sample becomes a separate numerical question. This is not
a native randomised Canvas Formula item. The export summary shows the larger
item count and total points. Select desired variants when assembling the quiz.

**Classic export:** uses the Canvas calculated-question extension and saved
variable/answer sets. Preview it after import.

## 9. Ordering

Enter at least two unique steps in the **correct order**. Move the rows up/down
to adjust the key. Portable QTI requests shuffled student presentation.

This uses a standard QTI ordering interaction, but Canvas recognition must be
tested. Classic export is blocked.

## 10. Categorisation

Create at least two categories, each with a unique name and one or more items.
Item labels must be unique across categories.

**Portable conversion:** exports standard many-to-one matching. Canvas may show
this as Matching, not native Categorisation. The editor warns before download.
Classic export is blocked.

## 11. Hotspot

1. Upload a local PNG/JPEG (up to 5 MB and 8000 pixels per dimension).
2. Enter meaningful image alternative text.
3. Drag over the correct rectangular region.
4. Alternatively, enter **Left x, Top y, Right x, Bottom y** in original-image
   pixels. The numeric fields also provide a keyboard-accessible way to set it.
5. Check the rectangle is non-empty and inside the image.

The image is bundled in the ZIP; no external image host is needed. The student
preview does not reveal the correct rectangle. One rectangle is supported;
polygonal regions, multiple hotspots and SVG are not implemented.

Portable QTI hotspot recognition and coordinate interpretation require Canvas
testing. Classic export is blocked.

## 12. Shared stimulus

A **stimulus is shared information that students read before answering related
questions**. It might be a passage, scenario, matrix or set of given values.
It is **not a question**, has no answer box and earns no marks. It is optional:
if only one question needs the information, put it directly in that question.

### Example: one setup, several questions

| Entry | What to write |
|---|---|
| Shared stimulus | A rectified stereo rig has focal length f = 1000 pixels and baseline B = 0.2 metres. |
| Linked numerical question 1 | Find the depth for disparity d = 40 px. Enter metres. |
| Linked numerical question 2 | Find the depth for disparity d = 25 px. Enter metres. |

The student sees the common rig specifications followed by the particular
question. Put correct values in each numerical question's answer settings,
**not** in the stimulus. Worked solutions belong in **Instructor notes**.

1. Add a **Shared stimulus**, name it, enter the **Shared givens / context**,
   and leave points at zero.
2. In its **Linked questions** panel, choose a type and click
   **Add linked question**. The new question is linked automatically.
3. Alternatively, open an existing question and choose the stimulus from
   **Shared stimulus (optional)**.
4. Enter the question, points and answer settings as usual.
5. Check **Student preview**: the shared givens appear above the question text.

Select **Load example**, then **Q13 — Shared stereo rig**, to explore
the complete example with five linked questions. The panel lists those
questions so you can open them directly. At least one question must be linked
to every stimulus before export.

**Portable conversion:** the stimulus text is repeated inside every linked
question. It does not become a native Canvas linked-stimulus object. No standalone
stimulus item is emitted. Classic export is blocked.

**Privacy:** the downloadable practice JSON and the standalone HTML both
contain the example's instructor solutions. Do not distribute either to
students; use the published Canvas quiz for student access.

## 13. Essay, file upload and information

- **Essay:** question text plus your private rubric. Manually graded.
- **File upload:** state what students should submit. Mentioning PDF does not
  configure an enforced file-extension restriction. Manually graded.
- **Information:** zero-point instructions without a response. Check how Canvas
  displays this non-interactive QTI item.

## 14. Validate, export and import

Click **Validate** at any time. Export checks the same rules, then shows:

- the actual exported item count and points;
- format compatibility notes;
- intentional transformations;
- privacy and scoring reminders.

The acknowledgement checkbox must be selected before download. Save the ZIP
in the [export/](export/) folder beside the editor. Select that ZIP when
importing into Canvas, not a JSON project.

For New Quizzes, import into an empty unpublished New Quiz through its Build
screen's QTI import option. For Classic, use the course's QTI ZIP import.
Consult [README.md](README.md#importing) for details.

**Do not publish without a test attempt.** Check correct and incorrect responses,
partial selections, images, formulas, points and result visibility. A syntactically
valid QTI package is not proof of faithful Canvas import.

## 15. Save your work

**Save project** downloads a `.quiz.json` file. Save it in
[local-json/](local-json/). **Open project** restores it: browse to that folder
and select the JSON file.
These are editor files, not Canvas imports. Keep them private: they contain
correct answers, image data and instructor notes.

### Choose the correct folder

- **local-json:** editable projects, including the supplied
  [practice example](local-json/practice_questions.quiz.json). Save future
  `.quiz.json` downloads here so you can reopen and revise them.
- **export:** Canvas ZIP packages created using **Export Canvas ZIP** and
  **Download ZIP**. The supplied `example_questions.zip` is a legacy Classic
  example, not the current Q1–Q20 project export.

Both folders are beside [quiz-editor.html](quiz-editor.html). In your browser's
download settings, enable **Ask where to save each file before downloading**
(the exact label varies by browser). Choose **local-json** for JSON and
**export** for ZIP. If downloads are saved automatically in Downloads instead,
move them into the correct folder afterwards.

The editor cannot automatically write into these folders or force the save
location. It does not scan them: use **Open project** to choose a file.
**Load example** remains embedded in the HTML and works even when you copy
only that HTML file to another computer. Keep both folders instructor-only.

Browser draft saving is best-effort. Always save a project before closing or
replacing a bank. Moving the HTML file, clearing site data or using private
browsing may prevent draft restoration.

## 16. References and format provenance

The editor and `canvas-browser-v1` JSON are custom designs. The output follows
portable QTI 2.1 or Canvas Classic QTI 1.2 conventions:

- [1EdTech QTI 2.1 Implementation Guide](https://www.imsglobal.org/question/qtiv2p1/imsqti_implv2p1.html).
- [Instructure New Quiz Items API](https://developerdocs.instructure.com/services/canvas/resources/new_quiz_items)
  documents native types, not a complete QTI import format.
- [Canvas Classic QTI exporter on GitHub](https://github.com/instructure/canvas-lms/blob/master/lib/cc/qti/qti_items.rb).
- [Canvas New Quizzes export integration on GitHub](https://github.com/instructure/canvas-lms/blob/master/lib/cc/qti/new_quizzes_generator.rb).

See [README provenance and references](README.md#format-provenance-and-references)
for the full source list, consultation date, and compatibility qualifications.
