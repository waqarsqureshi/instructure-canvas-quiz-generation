/* Portable QTI authoring model and offline ZIP writer. No network or dependencies. */
(function (root) {
  "use strict";
  const TYPES = {
    multiple_choice: "Multiple choice", multiple_answers: "Multiple answers",
    true_false: "True / false", short_answer: "Short answer",
    fill_in_multiple_blanks: "Multiple blanks", multiple_dropdowns: "Multiple dropdowns",
    matching: "Matching", numerical: "Numerical", calculated: "Formula",
    essay: "Essay", file_upload: "File upload", text_only: "Information",
    ordering: "Ordering", categorization: "Categorisation", hotspot: "Hotspot",
    stimulus: "Shared stimulus"
  };
  const ADVANCED = ["ordering", "categorization", "hotspot", "stimulus"];
  const QTI21 = "http://www.imsglobal.org/xsd/imsqti_v2p1";
  const QTI12 = "http://www.imsglobal.org/xsd/ims_qtiasiv1p2";
  const encoder = new TextEncoder();
  const x = value => String(value).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
  const tag = (name, attrs = {}, body = "") =>
    `<${name}${Object.entries(attrs).map(([k, v]) => ` ${k}="${x(v)}"`).join("")}>${body}</${name}>`;
  const p = value => String(value).split(/\n\s*\n/).map(line =>
    `<p>${x(line).replace(/\n/g, "<br/>")}</p>`).join("");
  const xml = body => '<?xml version="1.0" encoding="UTF-8"?>\n' + body;
  const clone = value => JSON.parse(JSON.stringify(value));
  const unique = values => new Set(values.map(v => v.trim().toLowerCase())).size === values.length;
  const validText = s => typeof s === "string" &&
    !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(s) &&
    !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/u.test(s);
  const finite = value => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e100;
  let serial = 0;
  function id() {
    return "q_" + Date.now().toString(36) + "_" + (++serial).toString(36) +
      "_" + Math.random().toString(36).slice(2, 8);
  }
  function question(type = "multiple_choice") {
    const q = { id: id(), type, title: "", prompt: "", points: 1, solution: "", stimulusId: "" };
    if (["multiple_choice", "multiple_answers"].includes(type))
      q.choices = [{ text: "", correct: false }, { text: "", correct: false }];
    if (type === "true_false") q.answer = true;
    if (type === "short_answer") q.answers = [""];
    if (["fill_in_multiple_blanks", "multiple_dropdowns"].includes(type))
      q.blanks = [{ name: "blank1", answers: [""], choices: [{ text: "", correct: false }, { text: "", correct: false }] }];
    if (type === "matching") {
      q.pairs = [{ left: "", right: "" }, { left: "", right: "" }];
      q.distractors = [];
    }
    if (type === "numerical") q.numeric = { mode: "exact", value: 0, tolerance: 0.01, min: 0, max: 1, figures: 3 };
    if (type === "ordering") q.items = ["", ""];
    if (type === "categorization") q.categories = [{ name: "", items: [""] }, { name: "", items: [""] }];
    if (type === "hotspot") q.image = { data: "", name: "", width: 0, height: 0, alt: "", rect: null };
    if (type === "calculated") {
      q.formula = "a * b";
      q.variables = [{ name: "a", min: 1, max: 10, decimals: 0 }, { name: "b", min: 1, max: 10, decimals: 0 }];
      q.samples = 5; q.decimalPlaces = 2; q.tolerance = 0.01;
    }
    if (["text_only", "stimulus"].includes(type)) q.points = 0;
    return q;
  }
  function project() {
    return { format: "canvas-browser-v1", title: "Untitled question bank", questions: [] };
  }
  function shape(bank) {
    const fail = s => { throw new Error(s); };
    if (!bank || typeof bank !== "object" || bank.format !== "canvas-browser-v1" ||
        typeof bank.title !== "string" || !Array.isArray(bank.questions))
      fail("Not a canvas-browser-v1 project. Load a project saved by this editor.");
    if (bank.questions.length > 500) fail("A project can contain at most 500 entries.");
    function strings(values, label) {
      if (!Array.isArray(values) || values.length > 1000 || values.some(v => typeof v !== "string"))
        fail(`${label} must be a list of text values.`);
    }
    function rows(values, names, label) {
      if (!Array.isArray(values) || values.length > 1000) fail(`${label} must be a list.`);
      for (const row of values) {
        if (!row || typeof row !== "object" || names.some(n => typeof row[n] !== "string"))
          fail(`${label} contains an invalid row.`);
      }
    }
    function choiceRows(values) {
      rows(values, ["text"], "Choices");
      if (values.some(v => typeof v.correct !== "boolean")) fail("Choice flags must be booleans.");
    }
    const ids = new Set();
    for (const q of bank.questions) {
      if (!q || !Object.hasOwn(TYPES, q.type) || typeof q.id !== "string" ||
          !/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(q.id) || ids.has(q.id))
        fail("Question types and unique IDs must be valid.");
      ids.add(q.id);
      for (const key of ["title", "prompt", "solution", "stimulusId"])
        if (typeof q[key] !== "string") fail(`${q.id}: missing text field ${key}.`);
      if (typeof q.points !== "number") fail(`${q.id}: points must be a number.`);
      if (["multiple_choice", "multiple_answers"].includes(q.type)) choiceRows(q.choices);
      if (q.type === "true_false" && typeof q.answer !== "boolean") fail("True/false answer must be a boolean.");
      if (q.type === "short_answer") strings(q.answers, "Answers");
      if (["fill_in_multiple_blanks", "multiple_dropdowns"].includes(q.type)) {
        rows(q.blanks, ["name"], "Blanks");
        for (const b of q.blanks) { strings(b.answers, "Blank answers"); choiceRows(b.choices); }
      }
      if (q.type === "matching") { rows(q.pairs, ["left", "right"], "Pairs"); strings(q.distractors, "Distractors"); }
      if (q.type === "ordering") strings(q.items, "Ordering items");
      if (q.type === "categorization") {
        rows(q.categories, ["name"], "Categories");
        for (const c of q.categories) strings(c.items, "Category items");
      }
      if (q.type === "numerical") {
        if (!q.numeric || !["exact", "range", "precision"].includes(q.numeric.mode) ||
            ["value", "tolerance", "min", "max", "figures"].some(k => typeof q.numeric[k] !== "number"))
          fail("Numerical settings are invalid.");
      }
      if (q.type === "calculated") {
        if (typeof q.formula !== "string" ||
            ["samples", "decimalPlaces", "tolerance"].some(k => typeof q[k] !== "number"))
          fail("Formula settings are invalid.");
        rows(q.variables, ["name"], "Variables");
        for (const v of q.variables)
          if (["min", "max", "decimals"].some(k => typeof v[k] !== "number")) fail("Variable settings must be numbers.");
      }
      if (q.type === "hotspot") {
        const im = q.image;
        if (!im || ["data", "name", "alt"].some(k => typeof im[k] !== "string") ||
            typeof im.width !== "number" || typeof im.height !== "number" ||
            (im.rect !== null && (!Array.isArray(im.rect) || im.rect.length !== 4 || im.rect.some(v => typeof v !== "number"))))
          fail("Hotspot image settings are invalid.");
        if (im.data) imageBytes(im);
      }
    }
    function scan(value) {
      if (typeof value === "string" && !validText(value)) fail("Text contains an invalid XML character.");
      if (Array.isArray(value)) value.forEach(scan);
      else if (value && typeof value === "object") Object.values(value).forEach(scan);
    }
    scan(bank);
    return bank;
  }
  function validate(bank, target = "new") {
    const errors = [];
    try { shape(bank); } catch (e) { return [e.message]; }
    if (!["new", "classic"].includes(target)) return ["Unknown export target."];
    if (!bank.title.trim()) errors.push("Enter a bank title.");
    if (!bank.questions.length) errors.push("Add at least one question.");
    const stimuli = new Set(bank.questions.filter(q => q.type === "stimulus").map(q => q.id));
    const names = values => values.length > 0 && values.every(v => v.trim()) && unique(values);
    for (let index = 0; index < bank.questions.length; index++) {
      const q = bank.questions[index], prefix = `${index + 1}. ${q.title || TYPES[q.type]}: `;
      const error = s => errors.push(prefix + s);
      if (!q.title.trim()) error("enter a title.");
      if (!q.prompt.trim()) error("enter the question text.");
      const info = ["text_only", "stimulus"].includes(q.type);
      if (!finite(q.points) || (info ? q.points !== 0 : q.points <= 0))
        error(info ? "information/stimulus must have zero points." : "points must be a positive finite number.");
      if (q.stimulusId && (!stimuli.has(q.stimulusId) || info)) error("select an existing stimulus for a scored question.");
      if (target === "classic" && ADVANCED.includes(q.type))
        error(`${TYPES[q.type]} is not supported in Classic; use New Quizzes export or change the question type.`);
      function checkChoices(cs, multiple = false) {
        if (cs.length < 2 || !names(cs.map(c => c.text))) error("use at least two unique, non-empty choices.");
        const correct = cs.filter(c => c.correct).length;
        if (multiple ? correct < 1 : correct !== 1) error(multiple ? "mark at least one correct choice." : "mark exactly one correct choice.");
      }
      if (["multiple_choice", "multiple_answers"].includes(q.type)) checkChoices(q.choices, q.type === "multiple_answers");
      if (q.type === "short_answer" && !names(q.answers)) error("enter unique accepted answers.");
      if (["fill_in_multiple_blanks", "multiple_dropdowns"].includes(q.type)) {
        const placeholders = [...q.prompt.matchAll(/\[([A-Za-z][A-Za-z0-9_]*)\]/g)].map(m => m[1]);
        const ids = q.blanks.map(b => b.name);
        if (!names(ids) || ids.some(n => !/^[A-Za-z][A-Za-z0-9_]*$/.test(n)) ||
            placeholders.length !== ids.length || new Set(placeholders).size !== ids.length ||
            ids.some(n => !placeholders.includes(n)))
          error("each [placeholder] must occur once and match a unique blank name.");
        q.blanks.forEach(b => {
          if (q.type === "multiple_dropdowns") checkChoices(b.choices);
          else if (!names(b.answers)) error(`blank ${b.name}: enter unique accepted answers.`);
        });
      }
      if (q.type === "matching") {
        if (q.pairs.length < 2 || !names(q.pairs.map(v => v.left)) || q.pairs.some(v => !v.right.trim()))
          error("enter at least two pairs with unique left-hand labels.");
        const rights = q.pairs.map(v => v.right.trim().toLowerCase());
        if (q.distractors.length && (!names(q.distractors) || q.distractors.some(v => rights.includes(v.trim().toLowerCase()))))
          error("distractors must be unique and different from correct answers.");
      }
      if (q.type === "numerical") {
        const n = q.numeric;
        if (Object.entries(n).some(([k, v]) => k !== "mode" && !finite(v))) error("numerical settings must be finite.");
        if (n.mode === "exact" && n.tolerance < 0) error("tolerance must not be negative.");
        if (n.mode === "range" && n.min > n.max) error("range minimum exceeds maximum.");
        if (n.mode === "precision" && (!Number.isInteger(n.figures) || n.figures < 1 || n.figures > 15 || n.value === 0))
          error("precision needs a non-zero value and 1 to 15 significant figures.");
      }
      if (q.type === "ordering" && (q.items.length < 2 || !names(q.items)))
        error("enter at least two unique steps in the correct order.");
      if (q.type === "categorization" &&
          (q.categories.length < 2 || !names(q.categories.map(c => c.name)) ||
           q.categories.some(c => !names(c.items)) || !unique(q.categories.flatMap(c => c.items))))
        error("enter at least two unique categories, each with items; item labels must be unique.");
      if (q.type === "hotspot") {
        const im = q.image, r = im.rect;
        if (!im.data || !im.alt.trim()) error("upload an image and enter alternative text.");
        if (![im.width, im.height].every(v => Number.isInteger(v) && v > 0 && v <= 8000)) error("image dimensions must be 1 to 8000 pixels.");
        if (!r || r.some(v => !Number.isInteger(v) || v < 0) ||
            (r && (r[0] >= r[2] || r[1] >= r[3] || r[2] > im.width || r[3] > im.height)))
          error("draw a non-empty correct rectangle inside the image.");
      }
      if (q.type === "calculated") {
        try { formulaSets(q); } catch (e) { error(e.message); }
      }
      if (q.type === "stimulus" && !bank.questions.some(other => other.stimulusId === q.id))
        error("link at least one question to this stimulus.");
    }
    return errors;
  }
  function notices(bank, target) {
    const result = [];
    if (target === "new") {
      result.push("Portable QTI 2.1: import into an empty New Quiz and test before publishing. Native Canvas interpretation is not certified.");
      if (bank.questions.some(q => q.type === "categorization"))
        result.push("Categorisation uses a standard many-to-one matching interaction. Canvas may display it as Matching, not native Categorisation.");
      if (bank.questions.some(q => q.type === "ordering" || q.type === "hotspot"))
        result.push("Ordering and hotspots use standard QTI 2.1 interactions. Their recognition by your Canvas New Quizzes importer must be checked.");
      if (bank.questions.some(q => q.type === "stimulus"))
        result.push("Shared stimulus text is repeated inside each linked question, not imported as a native linked Canvas stimulus.");
      if (bank.questions.some(q => q.type === "calculated"))
        result.push("Each formula sample becomes a separate numerical question. This increases the item count/total points; choose variants from the imported bank. It is not a native randomised Formula item.");
      if (bank.questions.some(q => q.type === "text_only"))
        result.push("Information is exported as a non-interactive QTI item; check how Canvas displays it.");
      result.push("Portable auto-scoring is all-or-nothing per question. Canvas may apply its own policies. Essay/file-upload items require manual grading.");
    } else {
      result.push("Classic QTI 1.2: inspect scoring and visibility after import. Multiple answers, matching and blanks use Canvas Classic conventions.");
    }
    result.push("Instructor solutions are kept in the saved project only, not in the QTI ZIP. Correct response keys are necessarily included in QTI; keep ZIPs private.");
    return result;
  }
  // Recursive-descent arithmetic parser: no eval/Function, assignments, calls or property access.
  function formula(expression, variables) {
    if (expression.length > 500) throw new Error("Formula is limited to 500 characters.");
    const tokens = expression.replace(/\*\*/g, "^").match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z][A-Za-z0-9_]*|[()+\-*/^]|\S/g) || [];
    let position = 0;
    const used = new Set();
    function checked(value) {
      if (!finite(value)) throw new Error("Formula result is not finite or is too large.");
      return value;
    }
    function atom() {
      const token = tokens[position++];
      if (token === "(") {
        const v = sum();
        if (tokens[position++] !== ")") throw new Error("Missing closing parenthesis.");
        return v;
      }
      if (/^(?:\d|\.)/.test(token || "") && finite(Number(token))) return Number(token);
      if (Object.hasOwn(variables, token)) { used.add(token); return variables[token]; }
      throw new Error(`Unknown formula token: ${token || "(end)"}.`);
    }
    function power() {
      const a = atom();
      if (tokens[position] !== "^") return a;
      position++;
      const b = unary();
      if (Math.abs(b) > 100) throw new Error("Exponent magnitude must not exceed 100.");
      return checked(Math.pow(a, b));
    }
    function unary() {
      if (tokens[position] === "+") { position++; return unary(); }
      if (tokens[position] === "-") { position++; return -unary(); }
      return power();
    }
    function product() {
      let a = unary();
      while (tokens[position] === "*" || tokens[position] === "/") {
        const op = tokens[position++], b = unary();
        if (op === "/" && b === 0) throw new Error("Formula divides by zero.");
        a = checked(op === "*" ? a * b : a / b);
      }
      return a;
    }
    function sum() {
      let a = product();
      while (tokens[position] === "+" || tokens[position] === "-") {
        const op = tokens[position++], b = product();
        a = checked(op === "+" ? a + b : a - b);
      }
      return a;
    }
    const value = sum();
    if (position !== tokens.length) throw new Error("Unexpected formula token: " + tokens[position]);
    if (Object.keys(variables).some(name => !used.has(name))) throw new Error("Use every declared variable in the formula.");
    return checked(value);
  }
  function formulaSets(q) {
    if (!Number.isInteger(q.samples) || q.samples < 1 || q.samples > 100 ||
        !Number.isInteger(q.decimalPlaces) || q.decimalPlaces < 0 || q.decimalPlaces > 10 ||
        !finite(q.tolerance) || q.tolerance < 0)
      throw new Error("Use 1 to 100 samples, 0 to 10 answer decimal places, and a non-negative tolerance.");
    if (!q.variables.length || q.variables.length > 20 || !unique(q.variables.map(v => v.name)))
      throw new Error("Use 1 to 20 uniquely named variables.");
    const placeholders = new Set([...q.prompt.matchAll(/\[([A-Za-z][A-Za-z0-9_]*)\]/g)].map(m => m[1]));
    for (const v of q.variables) {
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(v.name) || !placeholders.has(v.name))
        throw new Error("Use valid variable names with matching [placeholders] in the prompt.");
      if (!finite(v.min) || !finite(v.max) || v.min > v.max || !Number.isInteger(v.decimals) || v.decimals < 0 || v.decimals > 8)
        throw new Error("Check variable ranges and decimals (0 to 8).");
      const scale = 10 ** v.decimals;
      if ([v.min, v.max].some(n => Math.abs(n * scale - Math.round(n * scale)) > 1e-6 ||
          !Number.isSafeInteger(Math.round(n * scale))) ||
          !Number.isSafeInteger(Math.round(v.max * scale) - Math.round(v.min * scale) + 1))
        throw new Error("Variable endpoints must fit the decimal grid and safe integer range.");
    }
    if (placeholders.size !== q.variables.length) throw new Error("Every [placeholder] must name a variable.");
    let seed = 2166136261;
    for (const char of q.id) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619) >>> 0;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    return Array.from({ length: q.samples }, () => {
      const values = {};
      for (const v of q.variables) {
        const scale = 10 ** v.decimals, lo = Math.round(v.min * scale), hi = Math.round(v.max * scale);
        values[v.name] = (lo + Math.floor(random() * (hi - lo + 1))) / scale;
      }
      return { values, answer: Number(formula(q.formula, values).toFixed(q.decimalPlaces)) };
    });
  }
  function imageBytes(image) {
    const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image.data);
    if (!match || match[2].length > 7 * 1024 * 1024) throw new Error("Hotspots accept PNG/JPEG images up to 5 MB.");
    let bytes;
    try { bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0)); }
    catch { throw new Error("Invalid image base64 data."); }
    const good = match[1] === "png" ?
      [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v) :
      bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!good || bytes.length > 5 * 1024 * 1024) throw new Error("Invalid or oversized PNG/JPEG image.");
    return { bytes, extension: match[1] === "png" ? "png" : "jpg" };
  }
  function bounds(n) {
    if (n.mode === "range") return { low: n.min, high: n.max, exclusive: false };
    const tolerance = n.mode === "exact" ? n.tolerance :
      0.5 * 10 ** (Math.floor(Math.log10(Math.abs(n.value))) - n.figures + 1);
    const clean = v => Number(v.toPrecision(15));
    return { low: clean(n.value - tolerance), high: clean(n.value + tolerance), exclusive: n.mode === "precision" };
  }
  function prepared(bank, target) {
    const stimuli = new Map(bank.questions.filter(q => q.type === "stimulus").map(q => [q.id, q]));
    return bank.questions.filter(q => q.type !== "stimulus").flatMap(original => {
      const q = clone(original);
      q.context = q.stimulusId ? stimuli.get(q.stimulusId).prompt : "";
      if (q.type !== "calculated" || target === "classic") return [q];
      return formulaSets(q).map((set, index) => ({
        ...q, id: q.id + "_v" + (index + 1), type: "numerical",
        title: q.title + ` - variant ${index + 1}`,
        prompt: q.prompt.replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/g, (_, name) => String(set.values[name])),
        numeric: { mode: "exact", value: set.answer, tolerance: q.tolerance, min: 0, max: 1, figures: 3 }
      }));
    });
  }
  function declaration(identifier, baseType, values, cardinality = "single") {
    return tag("responseDeclaration", { identifier, cardinality, baseType },
      values.length ? tag("correctResponse", {}, values.map(v => tag("value", {}, x(v))).join("")) : "");
  }
  const variable = id => tag("variable", { identifier: id });
  const base = (value, type = "float") => tag("baseValue", { baseType: type }, x(value));
  const matchCorrect = id => tag("match", {}, variable(id) + tag("correct", { identifier: id }));
  function testNumeric(n, response) {
    const b = bounds(n);
    return tag("and", {},
      tag(b.exclusive ? "gt" : "gte", {}, variable(response) + base(b.low)) +
      tag("lte", {}, variable(response) + base(b.high)));
  }
  function testText(answers, response) {
    const parts = answers.map(answer =>
      tag("stringMatch", { caseSensitive: "false", substring: "false" }, variable(response) + base(answer, "string")));
    return parts.length === 1 ? parts[0] : tag("or", {}, parts.join(""));
  }
  function item21(q, files) {
    const declarations = [], checks = [];
    let body = (q.context ? tag("div", { class: "stimulus-context" }, p(q.context)) : "") + p(q.prompt);
    const response = "RESPONSE";
    function select(cs, multiple = false) {
      declarations.push(declaration(response, "identifier", cs.flatMap((c, i) => c.correct ? ["a" + i] : []),
        multiple ? "multiple" : "single"));
      checks.push(matchCorrect(response));
      body += tag("choiceInteraction", { responseIdentifier: response, shuffle: "false",
        maxChoices: multiple ? cs.length : 1 },
      cs.map((c, i) => tag("simpleChoice", { identifier: "a" + i }, x(c.text))).join(""));
    }
    if (["multiple_choice", "multiple_answers"].includes(q.type)) select(q.choices, q.type === "multiple_answers");
    else if (q.type === "true_false") select([{ text: "True", correct: q.answer }, { text: "False", correct: !q.answer }]);
    else if (q.type === "short_answer") {
      declarations.push(declaration(response, "string", [q.answers[0]]));
      checks.push(testText(q.answers, response));
      body += tag("p", {}, tag("textEntryInteraction", { responseIdentifier: response, expectedLength: "40" }));
    } else if (q.type === "numerical") {
      const n = q.numeric;
      declarations.push(declaration(response, "float", [n.mode === "range" ? (n.min + n.max) / 2 : n.value]));
      checks.push(testNumeric(n, response));
      body += tag("p", {}, tag("textEntryInteraction", { responseIdentifier: response, expectedLength: "15" }));
    } else if (["fill_in_multiple_blanks", "multiple_dropdowns"].includes(q.type)) {
      const used = new Set();
      body = (q.context ? p(q.context) : "") + "<p>" +
        x(q.prompt).replace(/\n/g, "<br/>").replace(/\[([A-Za-z][A-Za-z0-9_]*)\]/g, (_, name) => {
          const b = q.blanks.find(v => v.name === name), rid = "blank_" + name;
          // Repeated occurrences refer to the same response, but only declare it once.
          if (!used.has(name)) {
            used.add(name);
            if (q.type === "multiple_dropdowns") {
              declarations.push(declaration(rid, "identifier", [String(b.choices.findIndex(c => c.correct))].map(i => "a" + i)));
              checks.push(matchCorrect(rid));
            } else {
              declarations.push(declaration(rid, "string", [b.answers[0]]));
              checks.push(testText(b.answers, rid));
            }
          }
          return q.type === "multiple_dropdowns" ?
            tag("inlineChoiceInteraction", { responseIdentifier: rid, shuffle: "false" },
              b.choices.map((c, i) => tag("inlineChoice", { identifier: "a" + i }, x(c.text))).join("")) :
            tag("textEntryInteraction", { responseIdentifier: rid, expectedLength: "20" });
        }) + "</p>";
    } else if (q.type === "ordering") {
      declarations.push(declaration(response, "identifier", q.items.map((_, i) => "a" + i), "ordered"));
      checks.push(matchCorrect(response));
      body += tag("orderInteraction", { responseIdentifier: response, shuffle: "true" },
        q.items.map((v, i) => tag("simpleChoice", { identifier: "a" + i }, x(v))).join(""));
    } else if (["matching", "categorization"].includes(q.type)) {
      const pairs = q.type === "matching" ? q.pairs :
        q.categories.flatMap(c => c.items.map(label => ({ left: label, right: c.name })));
      const rights = [...new Set(pairs.map(v => v.right))].concat(q.type === "matching" ? q.distractors : []);
      const correct = pairs.map((v, i) => `l${i} r${rights.indexOf(v.right)}`);
      declarations.push(declaration(response, "directedPair", correct, "multiple"));
      checks.push(matchCorrect(response));
      body += tag("matchInteraction", { responseIdentifier: response, shuffle: "false", maxAssociations: pairs.length },
        tag("simpleMatchSet", {}, pairs.map((v, i) =>
          tag("simpleAssociableChoice", { identifier: "l" + i, matchMax: "1" }, x(v.left))).join("")) +
        tag("simpleMatchSet", {}, rights.map((v, i) =>
          tag("simpleAssociableChoice", { identifier: "r" + i, matchMax: pairs.length }, x(v))).join("")));
    } else if (q.type === "hotspot") {
      const { bytes, extension } = imageBytes(q.image), path = `items/${q.id}.${extension}`;
      files[path] = bytes;
      declarations.push(declaration(response, "identifier", ["correct_region"]));
      checks.push(matchCorrect(response));
      body += tag("hotspotInteraction", { responseIdentifier: response, maxChoices: "1" },
        tag("object", { data: `${q.id}.${extension}`, type: extension === "png" ? "image/png" : "image/jpeg",
          width: q.image.width, height: q.image.height }, x(q.image.alt)) +
        tag("hotspotChoice", { identifier: "correct_region", shape: "rect",
          coords: q.image.rect.join(","), hotspotLabel: "Selected region" }));
    } else if (q.type === "essay") {
      declarations.push(declaration(response, "string", []));
      body += tag("extendedTextInteraction", { responseIdentifier: response, expectedLines: "8" });
    } else if (q.type === "file_upload") {
      declarations.push(declaration(response, "file", []));
      body += tag("uploadInteraction", { responseIdentifier: response });
    }
    const score = tag("outcomeDeclaration", { identifier: "SCORE", cardinality: "single", baseType: "float",
      normalMinimum: "0", normalMaximum: q.points }, tag("defaultValue", {}, tag("value", {}, "0")));
    const setScore = value => tag("setOutcomeValue", { identifier: "SCORE" }, base(value));
    const processing = checks.length ? tag("responseProcessing", {},
      tag("responseCondition", {},
        tag("responseIf", {}, (checks.length === 1 ? checks[0] : tag("and", {}, checks.join(""))) + setScore(q.points)) +
        tag("responseElse", {}, setScore(0)))) : "";
    return xml(tag("assessmentItem", { xmlns: QTI21, identifier: q.id, title: q.title,
      adaptive: "false", timeDependent: "false" }, declarations.join("") + score + tag("itemBody", {}, body) + processing));
  }
  function meta12(values) {
    return tag("qtimetadata", {}, Object.entries(values).map(([k, v]) =>
      tag("qtimetadatafield", {}, tag("fieldlabel", {}, x(k)) + tag("fieldentry", {}, x(v)))).join(""));
  }
  const material = value => tag("material", {}, tag("mattext", { texttype: "text/html" }, x(value)));
  function item12(q) {
    let interaction = "", processing = "";
    const rid = "response1";
    const eq = (value, response = rid) => tag("varequal", { respident: response, case: "No" }, x(value));
    const cond = (test, value = 100, action = "Set", continuing = "No") =>
      tag("respcondition", { continue: continuing }, tag("conditionvar", {}, test) +
        (value === null ? "" : tag("setvar", { varname: "SCORE", action }, String(value))));
    const choose = (cs, response = rid, label = "", multiple = false) =>
      tag("response_lid", { ident: response, rcardinality: multiple ? "Multiple" : "Single" },
        (label ? material(p(label)) : "") + tag("render_choice", {}, cs.map(c =>
          tag("response_label", { ident: c.id }, material(p(c.text)))).join("")));
    const fib = decimal => tag("response_str", { ident: rid, rcardinality: "Single" },
      tag("render_fib", decimal ? { fibtype: "Decimal" } : {}, tag("response_label", { ident: "answer1" })));
    if (["multiple_choice", "multiple_answers", "true_false"].includes(q.type)) {
      const cs = (q.type === "true_false" ? [{ text: "True", correct: q.answer }, { text: "False", correct: !q.answer }] : q.choices)
        .map((c, i) => ({ ...c, id: "a" + i }));
      interaction = choose(cs, rid, "", q.type === "multiple_answers");
      processing = cond(q.type === "multiple_answers" ?
        tag("and", {}, cs.map(c => c.correct ? eq(c.id) : tag("not", {}, eq(c.id))).join("")) :
        eq(cs.find(c => c.correct).id));
    } else if (q.type === "short_answer") {
      interaction = fib(false);
      processing = cond(q.answers.map(a => eq(a)).join(""));
    } else if (q.type === "numerical") {
      interaction = fib(true);
      const b = bounds(q.numeric), comparisons =
        tag(b.exclusive ? "vargt" : "vargte", { respident: rid }, String(b.low)) +
        tag("varlte", { respident: rid }, String(b.high));
      processing = cond(q.numeric.mode === "range" ? comparisons :
        tag("or", {}, eq(q.numeric.value) + tag("and", {}, comparisons)));
    } else if (q.type === "essay" || q.type === "file_upload") {
      interaction = q.type === "essay" ? fib(false) : "";
      processing = cond(tag("other"), null);
    } else if (q.type === "matching") {
      const rights = [...new Set(q.pairs.map(v => v.right))].concat(q.distractors);
      const cs = rights.map((text, i) => ({ id: "m" + i, text }));
      q.pairs.forEach((v, i) => {
        interaction += choose(cs, "response_p" + i, v.left);
        processing += cond(eq("m" + rights.indexOf(v.right), "response_p" + i), 100 / q.pairs.length, "Add", "Yes");
      });
    } else if (["fill_in_multiple_blanks", "multiple_dropdowns"].includes(q.type)) {
      q.blanks.forEach((b, i) => {
        const cs = (q.type === "multiple_dropdowns" ? b.choices : b.answers.map(text => ({ text, correct: true })))
          .map((v, j) => ({ ...v, id: `b${i}_${j}` }));
        interaction += choose(cs, "response_" + b.name, b.name);
        processing += cond(cs.filter(c => c.correct).map(c => eq(c.id, "response_" + b.name)).join(""),
          100 / q.blanks.length, "Add", "Yes");
      });
    } else if (q.type === "calculated") {
      interaction = fib(true);
      processing = cond(tag("other"));
    }
    let extension = "";
    if (q.type === "calculated") {
      extension = tag("itemproc_extension", {}, tag("calculated", {},
        tag("answer_tolerance", {}, String(q.tolerance)) +
        tag("formulas", { decimal_places: q.decimalPlaces }, tag("formula", {}, x(q.formula.replace(/\*\*/g, "^")))) +
        tag("vars", {}, q.variables.map(v => tag("var", { name: v.name, scale: v.decimals },
          tag("min", {}, String(v.min)) + tag("max", {}, String(v.max)))).join("")) +
        tag("var_sets", {}, formulaSets(q).map((s, i) => tag("var_set", { ident: "set" + i },
          Object.entries(s.values).map(([name, value]) => tag("var", { name }, String(value))).join("") +
          tag("answer", {}, String(s.answer)))).join(""))));
    }
    return tag("item", { ident: q.id, title: q.title },
      tag("itemmetadata", {}, meta12({ question_type: q.type + "_question", points_possible: q.points })) +
      tag("presentation", {}, material(p(q.prompt)) + interaction) +
      (q.type === "text_only" ? "" : tag("resprocessing", {},
        tag("outcomes", {}, tag("decvar", { varname: "SCORE", vartype: "Decimal", minvalue: "0", maxvalue: "100" })) + processing)) + extension);
  }
  function build(bank, target = "new") {
    const errors = validate(bank, target);
    if (errors.length) throw new Error(errors.join("\n"));
    const questions = prepared(bank, target), files = {};
    if (!questions.length) throw new Error("Nothing to export.");
    const total = questions.reduce((a, q) => a + q.points, 0);
    let resources = "";
    if (target === "new") {
      const refs = questions.map(q => {
        const path = `items/${q.id}.xml`;
        files[path] = item21(q, files);
        const asset = Object.keys(files).find(key => key.startsWith("items/" + q.id + ".") && key !== path);
        resources += tag("resource", { identifier: q.id, type: "imsqti_item_xmlv2p1", href: path },
          tag("file", { href: path }) + (asset ? tag("file", { href: asset }) : ""));
        return tag("assessmentItemRef", { identifier: q.id, href: path });
      }).join("");
      files["assessment.xml"] = xml(tag("assessmentTest", { xmlns: QTI21, identifier: "assessment", title: bank.title },
        tag("testPart", { identifier: "part1", navigationMode: "linear", submissionMode: "individual" },
          tag("assessmentSection", { identifier: "section1", title: bank.title, visible: "true" }, refs))));
      resources = tag("resource", { identifier: "assessment", type: "imsqti_test_xmlv2p1", href: "assessment.xml" },
        tag("file", { href: "assessment.xml" }) + questions.map(q => tag("dependency", { identifierref: q.id })).join("")) + resources;
      files["imsmanifest.xml"] = xml(tag("manifest", { xmlns: "http://www.imsglobal.org/xsd/imscp_v1p1", identifier: "manifest" },
        tag("metadata", {}, tag("schema", {}, "IMS Content") + tag("schemaversion", {}, "1.1.4")) +
        tag("organizations") + tag("resources", {}, resources)));
    } else {
      files["assessment/questions.xml"] = xml(tag("questestinterop", { xmlns: QTI12 },
        tag("assessment", { ident: "assessment", title: bank.title },
          tag("section", { ident: "section1" }, questions.map(item12).join("")))));
      files["assessment/assessment_meta.xml"] = xml(tag("quiz", { xmlns: "http://canvas.instructure.com/xsd/cccv1p0", identifier: "assessment" },
        tag("title", {}, x(bank.title)) + tag("quiz_type", {}, "practice_quiz") + tag("points_possible", {}, String(total)) +
        tag("available", {}, "false") + tag("hide_results", {}, "always") + tag("show_correct_answers", {}, "false")));
      resources = tag("resource", { identifier: "assessment", type: "imsqti_xmlv1p2" },
        tag("file", { href: "assessment/questions.xml" }) + tag("dependency", { identifierref: "quizmeta" })) +
        tag("resource", { identifier: "quizmeta", type: "associatedcontent/imscc_xmlv1p1/learning-application-resource", href: "assessment/assessment_meta.xml" },
          tag("file", { href: "assessment/assessment_meta.xml" }));
      files["imsmanifest.xml"] = xml(tag("manifest", { xmlns: "http://www.imsglobal.org/xsd/imsccv1p1/imscp_v1p1", identifier: "manifest" },
        tag("metadata", {}, tag("schema", {}, "IMS Content") + tag("schemaversion", {}, "1.1.3")) +
        tag("organizations") + tag("resources", {}, resources)));
    }
    return { files, count: questions.length, points: total, notices: notices(bank, target) };
  }
  const crcTable = Array.from({ length: 256 }, (_, value) => {
    for (let n = 0; n < 8; n++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const value of bytes) crc = crcTable[(crc ^ value) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    const local = [], central = [];
    let offset = 0, centralSize = 0, count = 0;
    const block = size => { const bytes = new Uint8Array(size); return [bytes, new DataView(bytes.buffer)]; };
    for (const [path, content] of Object.entries(files)) {
      if (!/^[A-Za-z0-9_./-]+$/.test(path) || path.includes("..") || path.startsWith("/")) throw new Error("Unsafe ZIP path.");
      const name = encoder.encode(path), bytes = typeof content === "string" ? encoder.encode(content) : content;
      const crc = crc32(bytes), [header, h] = block(30);
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x800, true);
      h.setUint16(12, 33, true); // 1980-01-01; reproducible archives
      h.setUint32(14, crc, true); h.setUint32(18, bytes.length, true); h.setUint32(22, bytes.length, true);
      h.setUint16(26, name.length, true);
      local.push(header, name, bytes);
      const [entry, e] = block(46);
      e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true);
      e.setUint16(8, 0x800, true); e.setUint16(14, 33, true);
      e.setUint32(16, crc, true); e.setUint32(20, bytes.length, true); e.setUint32(24, bytes.length, true);
      e.setUint16(28, name.length, true); e.setUint32(42, offset, true);
      central.push(entry, name); centralSize += 46 + name.length;
      offset += 30 + name.length + bytes.length; count++;
      if (offset > 100 * 1024 * 1024 || count > 60000) throw new Error("Archive exceeds the 100 MB / 60000 file limit.");
    }
    const [end, e] = block(22);
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, count, true); e.setUint16(10, count, true);
    e.setUint32(12, centralSize, true); e.setUint32(16, offset, true);
    const result = new Uint8Array(offset + centralSize + 22);
    let cursor = 0;
    for (const bytes of [...local, ...central, end]) { result.set(bytes, cursor); cursor += bytes.length; }
    return result;
  }
  function example() {
    const bank = project();
    bank.title = "Computer vision - browser authoring example";
    const add = (type, title, prompt, data) => {
      const q = Object.assign(question(type), { title, prompt }, data);
      bank.questions.push(q); return q;
    };
    add("multiple_choice", "Depth and disparity", "With fixed focal length and baseline, doubling disparity makes depth:",
      { choices: [{ text: "Twice as large", correct: false }, { text: "Half as large", correct: true }],
        solution: "Z = fB/d." });
    add("numerical", "Stereo depth", "f = 1000 px, B = 0.2 m, d = 40 px. Enter depth in metres.",
      { numeric: { mode: "exact", value: 5, tolerance: 0.01, min: 0, max: 10, figures: 3 } });
    add("ordering", "Calibration workflow", "Arrange the following operations in order.",
      { items: ["Collect image/object correspondences", "Normalise the points", "Build the DLT system", "Solve with SVD"] });
    add("categorization", "Transformation invariants", "Assign each property to the appropriate group.",
      { categories: [{ name: "Preserved by all invertible homographies", items: ["Collinearity", "Cross-ratio"] },
        { name: "Not preserved by a general homography", items: ["Angles", "Parallelism"] }] });
    const stimulus = add("stimulus", "Shared stereo setup", "A rectified stereo rig has f = 1000 px and B = 0.2 m.");
    add("essay", "Stereo assumptions", "Explain the assumptions behind the relation Z = fB/d.",
      { stimulusId: stimulus.id, points: 3 });
    return bank;
  }
  const api = { TYPES, ADVANCED, project, question, shape, validate, notices, formula, formulaSets,
    imageBytes, bounds, prepared, build, zip, crc32, example, clone };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.QuizCore = api;
})(globalThis);
