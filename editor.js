(function () {
  "use strict";
  const C = globalThis.QuizCore;
  const $ = id => document.getElementById(id);
  const legacyStorageKey = "galway-quiz-studio-v1";
  const storageKey = legacyStorageKey + ":" + location.pathname;
  let bank = C.project(), selected = "", target = "new", dirty = false, draftTimer, exportResult;
  function node(tag, attrs = {}, text = "") {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    if (text) el.textContent = text;
    return el;
  }
  function button(text, fn, className = "") { return node("button", { onclick: fn, class: className, type: "button" }, text); }
  function status(text, error = false) { $("status").textContent = text; $("status").className = error ? "error" : ""; }
  function active() { return bank.questions.find(q => q.id === selected); }
  function touched() {
    dirty = true;
    $("issues").hidden = true;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      try {
        const saved = JSON.stringify(bank);
        C.shape(JSON.parse(saved));
        localStorage.setItem(storageKey, saved);
        status("Draft saved in this browser. Download Save project for a durable backup.");
      } catch (e) {
        status("Browser draft could not be saved (" + e.message + "). Use Save project to download your work.", true);
      }
    }, 350);
    list(); preview();
  }
  function commit(fn) { fn(); touched(); editor(); }
  function field(label, value, callback, options = {}) {
    const wrapper = node("label", {}, label);
    const input = options.area ? node("textarea", { rows: options.rows || 3 }) :
      node("input", { type: options.number ? "number" : "text" });
    input.value = value;
    if (options.number) input.step = options.step || "any";
    if (options.min !== undefined) input.min = String(options.min);
    input.addEventListener("input", () => { callback(options.number ? input.valueAsNumber : input.value); touched(); });
    wrapper.append(input);
    if (options.help) wrapper.append(node("span", { class: "hint" }, options.help));
    return wrapper;
  }
  function select(label, value, choices, callback) {
    const wrapper = node("label", {}, label), input = node("select");
    for (const [id, text] of choices) input.append(node("option", { value: id }, text));
    input.value = value;
    input.addEventListener("change", () => commit(() => callback(input.value)));
    wrapper.append(input); return wrapper;
  }
  function panel(title, help = "") {
    const el = node("section", { class: "field-panel" });
    el.append(node("h3", {}, title));
    if (help) el.append(node("p", { class: "hint" }, help));
    return el;
  }
  function textRows(parent, values, label, ordered = false) {
    values.forEach((value, i) => {
      const row = node("div", { class: "row" });
      row.append(node("span", { class: "row-index" }, String(i + 1)));
      const input = node("input", { type: "text", "aria-label": `${label} ${i + 1}` });
      input.value = value;
      input.addEventListener("input", () => { values[i] = input.value; touched(); });
      row.append(input);
      if (ordered) {
        const up = button("↑", () => commit(() => { [values[i - 1], values[i]] = [values[i], values[i - 1]]; }));
        up.disabled = i === 0; up.setAttribute("aria-label", `Move ${label} ${i + 1} up`); row.append(up);
        const down = button("↓", () => commit(() => { [values[i + 1], values[i]] = [values[i], values[i + 1]]; }));
        down.disabled = i === values.length - 1; down.setAttribute("aria-label", `Move ${label} ${i + 1} down`); row.append(down);
      }
      const remove = button("Remove", () => commit(() => values.splice(i, 1)));
      remove.setAttribute("aria-label", `Remove ${label} ${i + 1}`);
      row.append(remove); parent.append(row);
    });
    parent.append(button("+ Add " + label.toLowerCase(), () => commit(() => values.push(""))));
  }
  function choiceRows(parent, choices, multiple, group) {
    choices.forEach((choice, i) => {
      const row = node("div", { class: "row" }), correct = node("label", { class: "correct" });
      const mark = node("input", { type: multiple ? "checkbox" : "radio", name: group,
        "aria-label": `Correct choice ${i + 1}` });
      mark.checked = choice.correct;
      mark.addEventListener("change", () => {
        if (!multiple) choices.forEach(c => { c.correct = false; });
        choice.correct = mark.checked; touched();
      });
      correct.append(mark, document.createTextNode("Correct"));
      const input = node("input", { type: "text", "aria-label": `Choice ${i + 1}` });
      input.value = choice.text;
      input.addEventListener("input", () => { choice.text = input.value; touched(); });
      row.append(correct, input, button("Remove", () => commit(() => choices.splice(i, 1))));
      parent.append(row);
    });
    parent.append(button("+ Add choice", () => commit(() => choices.push({ text: "", correct: false }))));
  }
  function list() {
    const box = $("question-list"); box.replaceChildren();
    bank.questions.forEach((q, i) => {
      const b = button("", () => { selected = q.id; editor(); list(); });
      b.className = "question-link" + (q.id === selected ? " active" : "");
      b.setAttribute("aria-current", q.id === selected ? "true" : "false");
      b.append(node("span", {}, `${i + 1}. ${q.title || "Untitled question"}`),
        node("small", {}, `${C.TYPES[q.type]} · ${Number.isFinite(q.points) ? q.points : "?"} pt`));
      box.append(b);
    });
    $("question-count").textContent = String(bank.questions.length);
    const total = bank.questions.reduce((n, q) => n + (Number.isFinite(q.points) ? q.points : 0), 0);
    $("summary").textContent = `${bank.questions.length} entries · ${Number(total.toFixed(3))} points`;
  }
  function move(direction) {
    const i = bank.questions.findIndex(q => q.id === selected), j = i + direction;
    if (j < 0 || j >= bank.questions.length) return;
    commit(() => { [bank.questions[i], bank.questions[j]] = [bank.questions[j], bank.questions[i]]; });
  }
  function editor() {
    const box = $("editor"), q = active();
    box.replaceChildren();
    if (!q) {
      box.append(node("div", { class: "empty" }));
      box.firstChild.append(node("h2", {}, "Your next quiz starts here"),
        node("p", {}, "Choose a question type on the left, or load the example bank."),
        button("+ Add multiple choice", () => add("multiple_choice"), "primary"));
      $("preview-section").hidden = true; return;
    }
    const actions = node("div", { class: "question-actions" });
    const index = bank.questions.indexOf(q);
    const up = button("↑ Move up", () => move(-1)), down = button("↓ Move down", () => move(1));
    up.disabled = index === 0; down.disabled = index === bank.questions.length - 1;
    actions.append(button("Duplicate", () => commit(() => {
      const copy = C.clone(q); copy.id = C.question().id; copy.title = q.title ? q.title + " (copy)" : "";
      bank.questions.splice(index + 1, 0, copy); selected = copy.id;
    })), up, down, button("Delete", () => {
      if (!confirm(`Delete "${q.title || "Untitled question"}"? This cannot be undone.`)) return;
      commit(() => {
        bank.questions.splice(index, 1);
        bank.questions.forEach(other => { if (other.stimulusId === q.id) other.stimulusId = ""; });
        selected = bank.questions[Math.min(index, bank.questions.length - 1)]?.id || "";
      });
    }, "danger"));
    box.append(actions);
    box.append(select("Question type", q.type, Object.entries(C.TYPES), type => {
      if (type !== q.type && confirm("Change type? The answer settings for this question will be reset.")) {
        const fresh = C.question(type);
        Object.assign(fresh, { id: q.id, title: q.title, prompt: q.prompt, solution: q.solution,
          points: ["text_only", "stimulus"].includes(type) ? 0 : (q.points || 1) });
        bank.questions[index] = fresh;
      }
    }));
    if (C.ADVANCED.includes(q.type) || (q.type === "calculated" && target === "new")) {
      const descriptions = {
        ordering: "Portable QTI ordering. Canvas recognition must be tested. Not available in Classic.",
        categorization: "Portable QTI exports this as many-to-one matching, not guaranteed native Canvas Categorisation.",
        hotspot: "Draw a rectangle on a local PNG/JPEG image. Portable hotspot import requires Canvas testing.",
        stimulus: "A stimulus is shared information, not a scored question. Students read it before answering the linked questions. Export repeats these givens in each linked question; it does not create a native Canvas linked stimulus.",
        calculated: "New Quizzes export creates a separate numerical item for every sample. Classic exports a calculated question."
      };
      box.append(node("div", { class: "notice" }, descriptions[q.type]));
    }
    const columns = node("div", { class: "columns" });
    columns.append(field("Question title", q.title, v => { q.title = v; }),
      field("Points", q.points, v => { q.points = v; }, { number: true, min: 0 }));
    box.append(columns, field(q.type === "stimulus" ? "Shared givens / context (not the answer)" : "Question text", q.prompt, v => { q.prompt = v; },
      { area: true, rows: 5, help: q.type === "stimulus" ?
        "Example: A stereo rig has f = 1000 px and B = 0.2 m. Link separate questions asking for depth at different disparities. Keep points at zero." :
        "Plain text; line breaks are preserved. For blanks/formulas, use [name] placeholders." }));
    if (!["text_only", "stimulus"].includes(q.type)) {
      const stimuli = bank.questions.filter(s => s.type === "stimulus");
      box.append(select("Shared stimulus (optional)", q.stimulusId,
        [["", "None — all givens are in this question"], ...stimuli.map(s => [s.id, s.title || "Untitled stimulus"])], v => { q.stimulusId = v; }));
      box.append(node("p", { class: "hint" }, "A stimulus supplies shared givens above this question. Choose the same stimulus for questions using the same setup; check Student preview below."));
    } else if (q.type === "stimulus") {
      const linked = bank.questions.filter(other => other.stimulusId === q.id);
      const el = panel(`Linked questions (${linked.length})`,
        "This entry has no answer box and no marks. At least one question must use it. Add a linked question here, or choose this stimulus in an existing question.");
      linked.forEach(other => el.append(button(other.title || "Untitled question", () => {
        selected = other.id; editor(); list();
      })));
      const label = node("label", {}, "Type of linked question"), type = node("select");
      for (const [id, text] of Object.entries(C.TYPES))
        if (!["stimulus", "text_only"].includes(id)) type.append(node("option", { value: id }, text));
      type.value = "numerical";
      label.append(type);
      el.append(label, button("+ Add linked question", () => add(type.value, q.id)));
      box.append(el);
    }
    if (["multiple_choice", "multiple_answers"].includes(q.type)) {
      const el = panel("Answer choices", q.type === "multiple_choice" ? "Mark exactly one correct answer." : "Mark all correct answers.");
      choiceRows(el, q.choices, q.type === "multiple_answers", q.id); box.append(el);
    } else if (q.type === "true_false") {
      box.append(select("Correct answer", String(q.answer), [["true", "True"], ["false", "False"]], v => { q.answer = v === "true"; }));
    } else if (q.type === "short_answer") {
      const el = panel("Accepted answers", "Each row is an accepted phrase. Comparison is case-insensitive.");
      textRows(el, q.answers, "Answer"); box.append(el);
    } else if (["fill_in_multiple_blanks", "multiple_dropdowns"].includes(q.type)) {
      const el = panel("Blanks", "Use each name in the question text, for example [blank1].");
      q.blanks.forEach((b, i) => {
        const sub = panel("Blank " + (i + 1));
        sub.append(field("Placeholder name", b.name, v => { b.name = v; }));
        if (q.type === "multiple_dropdowns") choiceRows(sub, b.choices, false, q.id + "_b" + i);
        else textRows(sub, b.answers, "Accepted answer");
        sub.append(button("Remove blank", () => commit(() => q.blanks.splice(i, 1)), "danger"));
        el.append(sub);
      });
      el.append(button("+ Add blank", () => commit(() => q.blanks.push({
        name: "blank" + (q.blanks.length + 1), answers: [""],
        choices: [{ text: "", correct: false }, { text: "", correct: false }]
      }))));
      box.append(el);
    } else if (q.type === "matching") {
      const el = panel("Correct pairs", "Right-hand answers can be reused.");
      q.pairs.forEach((pair, i) => {
        const row = node("div", { class: "row" });
        row.append(field(`Left ${i + 1}`, pair.left, v => { pair.left = v; }),
          field(`Right ${i + 1}`, pair.right, v => { pair.right = v; }),
          button("Remove", () => commit(() => q.pairs.splice(i, 1))));
        el.append(row);
      });
      el.append(button("+ Add pair", () => commit(() => q.pairs.push({ left: "", right: "" }))));
      el.append(node("h3", {}, "Optional distractors")); textRows(el, q.distractors, "Distractor"); box.append(el);
    } else if (q.type === "numerical") {
      const n = q.numeric, el = panel("Numerical answer", "State the units in the question. Students enter a number only.");
      el.append(select("Answer mode", n.mode, [["exact", "Value ± absolute tolerance"], ["range", "Inclusive range"],
        ["precision", "Significant figures"]], v => { n.mode = v; }));
      if (n.mode === "range") {
        el.append(field("Minimum", n.min, v => { n.min = v; }, { number: true }),
          field("Maximum", n.max, v => { n.max = v; }, { number: true }));
      } else {
        el.append(field("Correct value", n.value, v => { n.value = v; }, { number: true }));
        el.append(n.mode === "exact" ?
          field("Absolute tolerance", n.tolerance, v => { n.tolerance = v; }, { number: true, min: 0 }) :
          field("Significant figures", n.figures, v => { n.figures = v; }, { number: true, step: 1, min: 1 }));
      }
      box.append(el);
    } else if (q.type === "ordering") {
      const el = panel("Correct sequence", "Enter the steps in the correct order. The QTI interaction requests shuffled presentation.");
      textRows(el, q.items, "Step", true); box.append(el);
    } else if (q.type === "categorization") {
      const el = panel("Categories and their correct items");
      q.categories.forEach((c, i) => {
        const sub = panel("Category " + (i + 1));
        sub.append(field("Category name", c.name, v => { c.name = v; }));
        textRows(sub, c.items, "Item");
        sub.append(button("Remove category", () => commit(() => q.categories.splice(i, 1)), "danger")); el.append(sub);
      });
      el.append(button("+ Add category", () => commit(() => q.categories.push({ name: "", items: [""] })))); box.append(el);
    } else if (q.type === "hotspot") {
      hotspot(box, q);
    } else if (q.type === "calculated") {
      const el = panel("Formula and generated variants", "Arithmetic only: + - * / ^ and parentheses. No functions or scripts.");
      el.append(field("Formula", q.formula, v => { q.formula = v; }));
      q.variables.forEach((v, i) => {
        const row = node("div", { class: "row" });
        row.append(field("Name", v.name, n => { v.name = n; }),
          field("Minimum", v.min, n => { v.min = n; }, { number: true }),
          field("Maximum", v.max, n => { v.max = n; }, { number: true }),
          field("Decimals", v.decimals, n => { v.decimals = n; }, { number: true, step: 1, min: 0 }),
          button("Remove", () => commit(() => q.variables.splice(i, 1))));
        el.append(row);
      });
      el.append(button("+ Add variable", () => commit(() => q.variables.push({ name: "", min: 1, max: 10, decimals: 0 }))));
      const row = node("div", { class: "row" });
      row.append(field("Samples (1–100)", q.samples, v => { q.samples = v; }, { number: true, step: 1 }),
        field("Answer decimals", q.decimalPlaces, v => { q.decimalPlaces = v; }, { number: true, step: 1 }),
        field("Absolute tolerance", q.tolerance, v => { q.tolerance = v; }, { number: true }));
      el.append(row);
      const results = node("pre", { class: "preview-text" });
      el.append(button("Check generated samples", () => {
        try { results.textContent = C.formulaSets(q).slice(0, 10).map(s =>
          Object.entries(s.values).map(([k, v]) => `${k}=${v}`).join(", ") + ` → ${s.answer}`).join("\n"); }
        catch (e) { results.textContent = e.message; status(e.message, true); }
      }), results); box.append(el);
    } else if (["essay", "file_upload"].includes(q.type)) {
      box.append(node("p", { class: "hint" }, "Manual grading required. Use the instructor notes for your rubric."));
    }
    box.append(field("Instructor notes / worked solution (not in ZIP)", q.solution, v => { q.solution = v; },
      { area: true, rows: 3, help: "Saved in your private project JSON only. Not shown in the student preview." }));
    preview();
  }
  function hotspot(box, q) {
    const el = panel("Image and correct rectangle", "PNG or JPEG, at most 5 MB and 8000 × 8000 pixels. Drag over the correct area or enter coordinates.");
    const upload = node("input", { type: "file", accept: "image/png,image/jpeg", "aria-label": "Hotspot image" });
    upload.addEventListener("change", async () => {
      const file = upload.files[0]; if (!file) return;
      const controls = [...el.querySelectorAll("input,textarea,button")];
      controls.forEach(control => { control.disabled = true; });
      status("Loading hotspot image...");
      try {
        if (file.size > 5 * 1024 * 1024 || !["image/png", "image/jpeg"].includes(file.type))
          throw new Error("Choose a PNG/JPEG image up to 5 MB.");
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Could not read the image.")); reader.readAsDataURL(file);
        });
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve; img.onerror = () => reject(new Error("The image could not be decoded.")); img.src = data;
        });
        if (img.naturalWidth > 8000 || img.naturalHeight > 8000) throw new Error("Image dimensions exceed 8000 pixels.");
        q.image = { data, name: file.name, width: img.naturalWidth, height: img.naturalHeight, alt: q.image.alt, rect: null };
        touched(); editor();
      } catch (e) { status(e.message, true); }
      finally { controls.forEach(control => { control.disabled = false; }); }
    });
    el.append(upload, field("Image alternative text", q.image.alt, v => { q.image.alt = v; }));
    if (q.image.data) {
      const stage = node("div", { class: "hotspot-stage", "aria-label": "Drag to select correct rectangle" });
      const image = node("img", { src: q.image.data, alt: q.image.alt || "Hotspot image" });
      const rect = node("div", { class: "hotspot-rect" }); stage.append(image, rect);
      function draw() {
        const r = q.image.rect;
        rect.hidden = !r;
        if (r) Object.assign(rect.style, { left: `${100 * r[0] / q.image.width}%`, top: `${100 * r[1] / q.image.height}%`,
          width: `${100 * (r[2] - r[0]) / q.image.width}%`, height: `${100 * (r[3] - r[1]) / q.image.height}%` });
      }
      const point = e => {
        const bounds = stage.getBoundingClientRect();
        return [Math.max(0, Math.min(q.image.width, Math.round((e.clientX - bounds.left) / bounds.width * q.image.width))),
          Math.max(0, Math.min(q.image.height, Math.round((e.clientY - bounds.top) / bounds.height * q.image.height)))];
      };
      let start = null;
      stage.addEventListener("pointerdown", e => {
        e.preventDefault(); start = point(e); stage.setPointerCapture(e.pointerId);
      });
      stage.addEventListener("pointermove", e => {
        if (!start) return;
        const end = point(e);
        q.image.rect = [Math.min(start[0], end[0]), Math.min(start[1], end[1]), Math.max(start[0], end[0]), Math.max(start[1], end[1])];
        draw();
      });
      stage.addEventListener("pointerup", () => { if (start) { start = null; touched(); editor(); } });
      stage.addEventListener("pointercancel", () => { start = null; touched(); });
      el.append(stage, node("p", { class: "hint" }, `${q.image.name} · ${q.image.width} × ${q.image.height} pixels`));
      const coords = node("div", { class: "image-coordinates" });
      ["Left x", "Top y", "Right x", "Bottom y"].forEach((label, i) => coords.append(
        field(label, q.image.rect?.[i] ?? 0, value => {
          if (!q.image.rect) q.image.rect = [0, 0, 0, 0];
          q.image.rect[i] = value; draw();
        }, { number: true, step: 1, min: 0 })));
      el.append(coords); draw();
    }
    box.append(el);
  }
  function preview() {
    const q = active(), box = $("preview"); box.replaceChildren();
    $("preview-section").hidden = !q;
    if (!q) return;
    const stimulus = bank.questions.find(s => s.id === q.stimulusId);
    if (stimulus) {
      const context = node("div", { class: "preview-context" });
      context.append(node("strong", {}, "Shared givens: " + stimulus.title),
        node("div", { class: "preview-text" }, stimulus.prompt));
      box.append(context);
    }
    if (q.type === "stimulus")
      box.append(node("p", { class: "hint" }, "Shared context only — no student response or marks. Select a linked question to see these givens together with its question text."));
    box.append(node("h3", {}, q.title || "Untitled question"), node("div", { class: "preview-text" }, q.prompt || "Your question text will appear here."));
    if (["multiple_choice", "multiple_answers", "true_false"].includes(q.type)) {
      const ul = node("ul", { class: "preview-choices" });
      const values = q.type === "true_false" ? ["True", "False"] : q.choices.map(c => c.text);
      values.forEach(value => ul.append(node("li", {}, (q.type === "multiple_answers" ? "☐ " : "○ ") + (value || "Empty choice"))));
      box.append(ul);
    } else if (q.type === "hotspot" && q.image.data) {
      box.append(node("img", { src: q.image.data, alt: q.image.alt, style: "max-width:100%;max-height:320px" }));
      box.append(node("p", { class: "hint" }, "Students select a location. The answer rectangle is not shown in this preview."));
    } else if (q.type === "ordering") {
      // Do not display the authored correct sequence as a student preview.
      const ul = node("ul");
      [...q.items].reverse().forEach(value => ul.append(node("li", {}, value || "Empty step")));
      box.append(ul, node("p", { class: "hint" }, "Example shuffled presentation; Canvas controls the actual shuffle."));
    } else if (q.type === "matching" || q.type === "categorization") {
      const pairs = q.type === "matching" ? q.pairs : q.categories.flatMap(c => c.items.map(left => ({ left, right: c.name })));
      pairs.forEach(pair => box.append(node("p", {}, (pair.left || "Empty item") + " → [choose an answer]")));
    } else if (!["stimulus", "text_only", "multiple_dropdowns", "fill_in_multiple_blanks"].includes(q.type)) {
      box.append(node("p", { class: "preview-answer" }, q.type === "file_upload" ? "[Upload a file]" :
        q.type === "essay" ? "[Written response]" : "[Enter your answer]"));
    }
  }
  function add(type, stimulusId = "") {
    if (bank.questions.length >= 500) { status("Maximum 500 entries per project.", true); return; }
    commit(() => { const q = C.question(type); q.stimulusId = stimulusId; bank.questions.push(q); selected = q.id; });
  }
  function replace(next) {
    clearTimeout(draftTimer);
    bank = next; selected = bank.questions[0]?.id || "";
    $("bank-title").value = bank.title; touched(); editor();
  }
  function mayReplace() { return !bank.questions.length || confirm("Replace the current bank? Save project first if you need to keep it."); }
  function download(name, bytes, type) {
    const blob = new Blob([bytes], { type }), url = URL.createObjectURL(blob);
    const link = node("a", { href: url, download: name }); document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  function filename(suffix) { return (bank.title.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80) || "question_bank") + suffix; }
  function showErrors(errors) {
    const box = $("issues"); box.replaceChildren();
    box.hidden = !errors.length;
    if (!errors.length) return;
    box.append(node("strong", {}, `Please fix ${errors.length} issue${errors.length === 1 ? "" : "s"} before export.`));
    const ul = node("ul"); errors.forEach(error => ul.append(node("li", {}, error))); box.append(ul);
    box.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  for (const [id, label] of Object.entries(C.TYPES)) $("add-type").append(node("option", { value: id }, label));
  $("add-question").addEventListener("click", () => add($("add-type").value));
  $("bank-title").addEventListener("input", e => { bank.title = e.target.value; touched(); });
  $("target").addEventListener("change", e => { target = e.target.value; editor(); $("issues").hidden = true; });
  $("new-project").addEventListener("click", () => { if (mayReplace()) replace(C.project()); });
  $("load-example").addEventListener("click", () => {
    try {
      const next = JSON.parse($("practice-data").textContent);
      C.shape(next);
      if (mayReplace()) {
        replace(next);
        status("Practice Q1–Q20 loaded. Select the Q13 shared stereo rig to explore its linked questions. Use New Quizzes export for this example.");
      }
    } catch (error) { status("Could not load practice example: " + error.message, true); }
  });
  $("load-project").addEventListener("click", () => $("project-file").click());
  $("project-file").addEventListener("change", async e => {
    const file = e.target.files[0]; if (!file) return;
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error("Project file exceeds 30 MB.");
      const next = JSON.parse(await file.text()); C.shape(next);
      if (mayReplace()) { replace(next); status("Project loaded. Incomplete questions can be edited before export."); }
    } catch (error) { status("Could not open project: " + error.message, true); }
    e.target.value = "";
  });
  $("save-project").addEventListener("click", () => {
    try {
      C.shape(bank);
      // JSON cannot preserve NaN from an empty number field.
      const roundTrip = JSON.parse(JSON.stringify(bank)); C.shape(roundTrip);
      download(filename(".quiz.json"), JSON.stringify(bank, null, 2), "application/json");
      dirty = false; status("Project download requested. Save the JSON in local-json (or move it there from Downloads). Keep it private; use Open project to edit it later.");
    } catch (e) { status("Cannot save project: " + e.message + " Check empty numeric fields.", true); }
  });
  $("validate").addEventListener("click", () => {
    const errors = C.validate(bank, target); showErrors(errors);
    status(errors.length ? "Validation failed. See the listed issues." : "Validation passed. Review compatibility notes during export.", !!errors.length);
  });
  $("export").addEventListener("click", async () => {
    try {
      const errors = C.validate(bank, target); showErrors(errors);
      if (errors.length) { status("Export blocked until the listed issues are fixed.", true); return; }
      const snapshot = C.clone(bank);
      for (const q of snapshot.questions.filter(q => q.type === "hotspot")) {
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = () => reject(new Error(`${q.title}: image could not be decoded. Upload it again.`));
          image.src = q.image.data;
        });
        if (image.naturalWidth !== q.image.width || image.naturalHeight !== q.image.height)
          throw new Error(`${q.title}: stored image dimensions do not match the actual image. Upload it again.`);
      }
      exportResult = C.build(snapshot, target);
      for (const [name, content] of Object.entries(exportResult.files)) {
        if (name.endsWith(".xml")) {
          const parsed = new DOMParser().parseFromString(content, "application/xml");
          if (parsed.querySelector("parsererror")) throw new Error("Generated XML could not be parsed: " + name);
        }
      }
      $("export-summary").textContent = `${exportResult.count} exported items · ${exportResult.points} total points · ${target === "new" ? "QTI 2.1 for New Quizzes" : "Classic QTI 1.2"}`;
      $("export-notices").replaceChildren(...exportResult.notices.map(value => node("li", {}, value)));
      $("export-confirm").checked = false; $("download-zip").disabled = true;
      $("export-dialog").showModal();
    } catch (e) { status("Export failed: " + e.message, true); }
  });
  $("export-confirm").addEventListener("change", e => { $("download-zip").disabled = !e.target.checked; });
  $("download-zip").addEventListener("click", () => {
    if (!$("export-confirm").checked || !exportResult) return;
    try {
      download(filename(target === "new" ? "_new_quizzes.zip" : "_classic.zip"), C.zip(exportResult.files), "application/zip");
      $("export-dialog").close(); status("ZIP download requested. Save it in export (or move it there from Downloads), then import into an unpublished Canvas quiz and test it.");
    } catch (e) { status("ZIP creation failed: " + e.message, true); }
  });
  $("help-open").addEventListener("click", () => $("help-dialog").showModal());
  document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => $(b.dataset.close).close()));
  window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });
  try {
    const stored = localStorage.getItem(storageKey) ||
      (location.pathname.endsWith("/quiz-editor.html") ? localStorage.getItem(legacyStorageKey) : null);
    if (stored) {
      bank = C.shape(JSON.parse(stored)); selected = bank.questions[0]?.id || "";
      status("Restored your local draft. Use Save project for a durable backup.");
    } else status("Ready. Start a bank or load the example. Nothing is sent to a server.");
  } catch (e) { status("Local draft storage is unavailable or invalid: " + e.message + ". Use project save/load.", true); }
  $("bank-title").value = bank.title; list(); editor();
})();
