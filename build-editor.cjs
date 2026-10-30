"use strict";
const fs = require("node:fs");
const path = require("node:path");
const C = require("./quiz-core.js");
const here = __dirname;
let html = fs.readFileSync(path.join(here, "editor-shell.html"), "utf8");
const practice = JSON.parse(fs.readFileSync(path.join(here, "local-json", "practice_questions.quiz.json"), "utf8"));
const errors = C.validate(practice, "new");
if (errors.length) throw new Error("Invalid practice example:\n" + errors.join("\n"));
const practiceMarker = "/*__PRACTICE_JSON__*/";
if (!html.includes(practiceMarker)) throw new Error("Missing build marker: " + practiceMarker);
html = html.replace(practiceMarker, () => JSON.stringify(practice).replace(/</g, "\\u003c"));
for (const [marker, filename] of [
  ["/*__EDITOR_CSS__*/", "editor.css"],
  ["/*__CORE_JS__*/", "quiz-core.js"],
  ["/*__EDITOR_JS__*/", "editor.js"]
]) {
  const content = fs.readFileSync(path.join(here, filename), "utf8");
  if (!html.includes(marker)) throw new Error("Missing build marker: " + marker);
  if (/<\/(?:script|style)/i.test(content)) throw new Error("Unsafe inline closing tag in " + filename);
  html = html.replace(marker, () => content);
}
fs.writeFileSync(path.join(here, "quiz-editor.html"), html);
console.log("Built quiz-editor.html (self-contained; no runtime dependencies).");
