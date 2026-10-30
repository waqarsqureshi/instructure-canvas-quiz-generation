"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const C = require("./quiz-core.js");
const practice = require("./local-json/practice_questions.quiz.json");

function bank(type, extra = {}) {
  const b = C.project();
  b.title = "Test & review";
  b.questions = [Object.assign(C.question(type), { title: "Test", prompt: "Question", solution: "INSTRUCTOR_ONLY_SECRET" }, extra)];
  return b;
}
const choices = () => [{ text: "A", correct: true }, { text: "B", correct: false }];
function fixtures() {
  const b = C.project(); b.title = "All interactions";
  const add = (type, extra) => b.questions.push(...bank(type, extra).questions);
  add("multiple_choice", { choices: choices() });
  add("multiple_answers", { choices: [...choices(), { text: "C", correct: true }] });
  add("true_false");
  add("short_answer", { answers: ["colour", "color"] });
  add("fill_in_multiple_blanks", { prompt: "First [a], second [b].",
    blanks: [{ name: "a", answers: ["one", "1"], choices: choices() }, { name: "b", answers: ["two"], choices: choices() }] });
  add("multiple_dropdowns", { prompt: "Choose [answer].", blanks: [{ name: "answer", answers: [""], choices: choices() }] });
  add("matching", { pairs: [{ left: "a", right: "1" }, { left: "b", right: "2" }], distractors: ["3"] });
  add("numerical", { numeric: { mode: "exact", value: 5, tolerance: 0.01, min: 0, max: 10, figures: 3 } });
  add("calculated", { prompt: "Multiply [a] by [b].", samples: 3 });
  add("essay");
  add("file_upload");
  add("text_only");
  add("ordering", { items: ["Step one", "Step two", "Step three"] });
  add("categorization", { categories: [{ name: "A", items: ["one", "two"] }, { name: "B", items: ["three"] }] });
  add("hotspot", { image: { data: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0u8AAAAASUVORK5CYII=",
    name: "pixel.png", width: 1, height: 1, alt: "Test image", rect: [0, 0, 1, 1] } });
  add("stimulus");
  b.questions[0].stimulusId = b.questions.at(-1).id;
  return b;
}
function readZip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength), files = {};
  let offset = 0;
  const decoder = new TextDecoder();
  while (view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, "Store-only compression");
    const size = view.getUint32(offset + 18, true), nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true), start = offset + 30 + nameLength + extraLength;
    const name = decoder.decode(bytes.slice(offset + 30, offset + 30 + nameLength));
    const data = bytes.slice(start, start + size);
    assert.equal(C.crc32(data), view.getUint32(offset + 14, true), "CRC matches");
    files[name] = data; offset = start + size;
  }
  assert.equal(view.getUint32(offset, true), 0x02014b50);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 14, true), Object.keys(files).length);
  assert.equal(view.getUint32(bytes.length - 6, true), offset);
  return files;
}

test("all 16 authoring forms validate and produce portable exports", () => {
  const b = fixtures();
  assert.deepEqual(new Set(b.questions.map(q => q.type)), new Set(Object.keys(C.TYPES)));
  assert.deepEqual(C.validate(b), []);
  const result = C.build(b);
  assert.equal(result.count, 17); // stimulus removed; 1 formula replaced by 3 variants
  assert.match(result.files["assessment.xml"], /assessmentItemRef/);
  assert.match(result.files["imsmanifest.xml"], /imsqti_item_xmlv2p1/);
});
test("classic exports all Classic forms and calculated extension", () => {
  const b = fixtures();
  b.questions = b.questions.filter(q => !C.ADVANCED.includes(q.type));
  b.questions.forEach(q => { q.stimulusId = ""; });
  assert.deepEqual(C.validate(b, "classic"), []);
  const result = C.build(b, "classic");
  assert.equal(result.count, 12);
  assert.match(result.files["assessment/questions.xml"], /<itemproc_extension><calculated>/);
  assert.match(result.files["assessment/questions.xml"], /<render_fib fibtype="Decimal">/);
});
test("advanced types are blocked for Classic without silent omission", () => {
  const b = fixtures();
  assert.equal(C.validate(b, "classic").filter(v => /not supported in Classic/.test(v)).length, 4);
  assert.throws(() => C.build(b, "classic"), /not supported/);
});
test("solutions are absent from ZIP but present in saved project", () => {
  const b = fixtures();
  for (const target of ["new", "classic"]) {
    const next = C.clone(b);
    if (target === "classic") {
      next.questions = next.questions.filter(q => !C.ADVANCED.includes(q.type));
      next.questions.forEach(q => { q.stimulusId = ""; });
    }
    const result = C.build(next, target);
    assert.ok(JSON.stringify(next).includes("INSTRUCTOR_ONLY_SECRET"));
    for (const content of Object.values(result.files))
      if (typeof content === "string") assert.ok(!content.includes("INSTRUCTOR_ONLY_SECRET"));
  }
});
test("ZIP signatures, directory counts, CRC and binary image preservation", () => {
  const b = fixtures(), built = C.build(b);
  const zipped = C.zip(built.files), entries = readZip(zipped);
  assert.equal(Object.keys(entries).length, Object.keys(built.files).length);
  const image = Object.keys(entries).find(name => name.endsWith(".png"));
  assert.deepEqual(entries[image], C.imageBytes(b.questions.find(q => q.type === "hotspot").image).bytes);
  assert.equal(C.crc32(new TextEncoder().encode("123456789")), 0xcbf43926);
});
test("ZIP rejects path traversal", () => {
  for (const name of ["../secret", "/absolute", "a\\b", "a/../b"])
    assert.throws(() => C.zip({ [name]: "bad" }), /Unsafe/);
});
test("correct choices map to correctResponse and Classic condition keys", () => {
  const b = bank("multiple_answers", { choices: [...choices(), { text: "C", correct: true }] });
  const q = b.questions[0], xml = C.build(b).files[`items/${q.id}.xml`];
  assert.match(xml, /cardinality="multiple" baseType="identifier"><correctResponse><value>a0<\/value><value>a2/);
  assert.match(C.build(b, "classic").files["assessment/questions.xml"], /<not><varequal[^>]*>a1/);
});
test("true/false false is keyed to the second option", () => {
  const b = bank("true_false", { answer: false }), q = b.questions[0];
  assert.match(C.build(b).files[`items/${q.id}.xml`], /<correctResponse><value>a1<\/value>/);
});
test("QTI text is XML-escaped, not executable markup", () => {
  const b = bank("essay", { prompt: '<script>alert("x")</script> & <b>text</b>' });
  const result = C.build(b).files[`items/${b.questions[0].id}.xml`];
  assert.ok(!result.includes("<script>"));
  assert.match(result, /&lt;script&gt;/);
  assert.match(result, /&amp;/);
});
test("numeric tolerance boundaries are explicit, not rtol metadata", () => {
  const exact = { mode: "exact", value: 5, tolerance: 0.01, min: 0, max: 10, figures: 3 };
  assert.deepEqual(C.bounds(exact), { low: 4.99, high: 5.01, exclusive: false });
  assert.deepEqual(C.bounds({ ...exact, mode: "range", min: -2, max: 4 }), { low: -2, high: 4, exclusive: false });
  assert.deepEqual(C.bounds({ ...exact, mode: "precision", value: 12.3 }), { low: 12.25, high: 12.35, exclusive: true });
  const b = bank("numerical", { numeric: exact });
  const text = C.build(b).files[`items/${b.questions[0].id}.xml`];
  assert.match(text, /<gte>.*4.99/);
  assert.match(text, /<lte>.*5.01/);
});
test("blank alternative answers and dropdown declaration are present", () => {
  const b = fixtures(), q = b.questions.find(q => q.type === "fill_in_multiple_blanks");
  const text = C.build(b).files[`items/${q.id}.xml`];
  assert.match(text, /caseSensitive="false"/);
  assert.match(text, /<baseValue baseType="string">one<\/baseValue>/);
  assert.match(text, /<baseValue baseType="string">1<\/baseValue>/);
});
test("ordering declares ordered responses and requests shuffled steps", () => {
  const b = bank("ordering", { items: ["a", "b", "c"] }), q = b.questions[0];
  const text = C.build(b).files[`items/${q.id}.xml`];
  assert.match(text, /cardinality="ordered"/);
  assert.match(text, /<orderInteraction responseIdentifier="RESPONSE" shuffle="true">/);
});
test("categorisation is many-to-one matching and warns about native mapping", () => {
  const b = bank("categorization", { categories: [{ name: "A", items: ["one", "two"] }, { name: "B", items: ["three"] }] });
  const result = C.build(b), text = result.files[`items/${b.questions[0].id}.xml`];
  assert.match(text, /<value>l0 r0<\/value><value>l1 r0<\/value><value>l2 r1<\/value>/);
  assert.match(text, /matchMax="3"/);
  assert.ok(result.notices.some(n => n.includes("may display it as Matching")));
});
test("stimulus is repeated only inside linked items and disclosure is present", () => {
  const b = fixtures(), s = b.questions.find(q => q.type === "stimulus");
  s.prompt = "Unique shared setup";
  const result = C.build(b);
  assert.ok(!result.files[`items/${s.id}.xml`]);
  assert.match(result.files[`items/${b.questions[0].id}.xml`], /Unique shared setup/);
  assert.ok(!result.files[`items/${b.questions[1].id}.xml`].includes("Unique shared setup"));
  assert.ok(result.notices.some(n => n.includes("not imported as a native linked")));
});
test("manual questions have no automatic score assignment", () => {
  for (const type of ["essay", "file_upload", "text_only"]) {
    const b = bank(type), text = C.build(b).files[`items/${b.questions[0].id}.xml`];
    assert.ok(!text.includes("<responseProcessing>"));
  }
});
test("formula arithmetic precedence, unary powers and scientific constants", () => {
  assert.equal(C.formula("a + b * 3", { a: 2, b: 4 }), 14);
  assert.equal(C.formula("-a ^ 2 + b", { a: 2, b: 3 }), -1);
  assert.equal(C.formula("a ^ -b", { a: 2, b: 3 }), 0.125);
  assert.equal(C.formula("(a + b) * 1e2", { a: 2, b: 3 }), 500);
  assert.equal(C.formula("a**b", { a: 2, b: 3 }), 8);
});
test("formula parser refuses scripts, functions, unused variables and invalid results", () => {
  for (const expression of ["alert(a)", "a.constructor", "a[b]", "a % b", "a / (b-b)", "a ^ 101 + b", "a + c", "a"])
    assert.throws(() => C.formula(expression, { a: 2, b: 3 }), undefined, expression);
});
test("formula sets are deterministic and become separate numeric variants", () => {
  const b = bank("calculated", { prompt: "Multiply [a] by [b].", samples: 3 }), q = b.questions[0];
  const sets = C.formulaSets(q);
  assert.deepEqual(sets, C.formulaSets(q));
  sets.forEach(s => assert.equal(s.answer, s.values.a * s.values.b));
  const result = C.build(b);
  assert.equal(result.count, 3); assert.equal(result.points, 3);
  const first = result.files[`items/${q.id}_v1.xml`];
  assert.ok(!first.includes("[a]"));
  assert.ok(result.notices.some(n => n.includes("separate numerical question")));
});
test("invalid answers, points, ranges and placeholders block export", () => {
  const cases = [
    bank("multiple_choice"),
    bank("multiple_choice", { choices: [{ text: "A", correct: true }, { text: "A", correct: false }] }),
    bank("essay", { points: -1 }), bank("essay", { points: NaN }),
    bank("numerical", { numeric: { mode: "range", min: 2, max: 1, value: 0, tolerance: 0, figures: 3 } }),
    bank("fill_in_multiple_blanks", { prompt: "Missing [b].",
      blanks: [{ name: "a", answers: ["x"], choices: choices() }] }),
    bank("calculated", { prompt: "No placeholders" }),
    bank("ordering", { items: ["same", "same"] }),
    bank("matching", { pairs: [{ left: "a", right: "1" }, { left: "a", right: "2" }] }),
    bank("stimulus"),
    bank("essay", { stimulusId: "does_not_exist" })
  ];
  for (const b of cases) assert.ok(C.validate(b).length > 0, JSON.stringify(b));
});
test("malformed project input cannot be silently loaded", () => {
  for (const b of [null, {}, { format: "canvas-browser-v1", title: "x", questions: "bad" }])
    assert.throws(() => C.shape(b));
  const b = bank("essay"); b.questions.push(C.clone(b.questions[0]));
  assert.throws(() => C.shape(b), /unique IDs/);
  const noId = bank("essay"); delete noId.questions[0].id;
  assert.throws(() => C.shape(noId), /unique IDs/);
  assert.ok(C.validate(bank("essay", { prompt: "\x00" })).length);
});
test("hotspot blocks remote URLs, SVG, invalid bounds and invalid file signatures", () => {
  const image = fixtures().questions.find(q => q.type === "hotspot").image;
  for (const data of ["https://example.org/a.png", "data:image/svg+xml;base64,AAAA", "data:image/png;base64,AAAA"])
    assert.throws(() => C.imageBytes({ ...image, data }));
  for (const rect of [[0, 0, 2, 1], [1, 0, 0, 1], [0, 0, 0, 0]])
    assert.ok(C.validate(bank("hotspot", { image: { ...image, rect } })).length);
});
test("embedded example is valid and export notices cover all adaptations", () => {
  const b = C.example();
  assert.deepEqual(C.validate(b), []);
  assert.equal(C.build(b).count, 5);
  assert.ok(C.notices(b, "new").some(v => v.includes("Instructor solutions")));
});

test("practice example covers every source question and subpart with original marks", () => {
  assert.deepEqual(C.validate(practice, "new"), []);
  const source = fs.readFileSync(path.join(__dirname, "..", "exam", "Practice_Questions.md"), "utf8");
  const blocks = source.split(/^### Q(?=\d+ )/m).slice(1);
  assert.equal(blocks.length, 20);
  const scored = practice.questions.filter(q => q.type !== "stimulus");
  assert.equal(scored.length, 76);
  assert.equal(scored.filter(q => q.type === "numerical").length, 43);
  assert.equal(scored.filter(q => q.type === "essay").length, 33);
  assert.equal(practice.questions.length, 88);
  assert.equal(scored.reduce((sum, q) => sum + q.points, 0), 180);
  for (const block of blocks) {
    const [, number, marks] = block.match(/^(\d+) .*?\*\((\d+) marks\)\*/);
    const prefix = "practice_q" + number.padStart(2, "0");
    const entries = scored.filter(q => q.id === prefix || q.id.startsWith(prefix + "_"));
    assert.ok(entries.length, `Missing Q${number}`);
    assert.equal(entries.reduce((sum, q) => sum + q.points, 0), Number(marks), `Q${number} total`);
    entries.forEach(q => {
      assert.match(q.title, new RegExp(`^Q${number}(?:\\(| —)`));
      assert.ok(q.solution.trim(), q.id + " needs instructor notes");
      assert.ok(!/\\(?:begin|frac|mathbf|times)\b/.test(q.prompt), q.id + " has unrendered LaTeX");
    });
    for (const part of block.split(/^\((?=[a-z]\))/m).slice(1)) {
      const letter = part[0], weight = Number(part.match(/\*\*\((\d+)\)\*\*/)[1]);
      if (entries.length === 1 && entries[0].id === prefix) {
        const inPrompt = entries[0].prompt.match(new RegExp(`\\(${letter}\\)[\\s\\S]*?\\[(\\d+) marks\\]`));
        assert.ok(inPrompt, `Missing Q${number}(${letter})`);
        assert.equal(Number(inPrompt[1]), weight);
      } else {
        const parts = entries.filter(q => q.title.startsWith(`Q${number}(${letter})`));
        assert.ok(parts.length, `Missing Q${number}(${letter})`);
        assert.equal(parts.reduce((sum, q) => sum + q.points, 0), weight, `Q${number}(${letter}) marks`);
      }
    }
  }
});

test("all practice numerical keys agree with independent calculations and requested rounding", () => {
  const mv = (m, v) => m.map(row => row.reduce((sum, value, i) => sum + value * v[i], 0));
  const project = v => v.slice(0, 2).map(value => value / v[2]);
  const roadInverse = [[0.9, 0.2, -100], [0, 2, -100], [0, -0.004, 2]];
  const left = project(mv(roadInverse, [200, 200, 1]));
  const right = project(mv(roadInverse, [600, 200, 1]));
  const surgicalInverse = [[1, 0, 0], [0, 1, 0], [-0.002, -0.001, 1]];
  const tip = project(mv(surgicalInverse, [250, 0, 1]));
  const tail = project(mv(surgicalInverse, [125, 250, 1]));
  const L = [10, 20, 30, 40, 50, 60, 70, 80, 90];
  const cost = (window, power) => L.reduce((sum, value, i) => sum + Math.abs(value - window[i]) ** power, 0);
  const R0 = [12, 22, 28, 38, 52, 61, 72, 79, 93], R1 = [50, 60, 70, 80, 90, 100, 10, 20, 30];
  const boardCamera = mv([[1, 0, 0], [0, 0.8, -0.6], [0, 0.6, 0.8]], [100, 100, 0])
    .map((value, i) => value + [0, 50, 1000][i]);
  const board = project(mv([[1000, 0, 500], [0, 1000, 400], [0, 0, 1]], boardCamera));
  const Z = 0.2 / (0.10 - 0.06);
  const p4 = [-1600, -1200, -5];
  const translation = mv([[1/800, 0, -320/800], [0, 1/800, -240/800], [0, 0, 1]], p4);
  const centre = translation.map(value => -value);
  const expected = {
    q04_a_f: 8/0.005, q04_b_u: 1600*0.5/5 + 640, q04_b_v: 1600*(-0.2)/5 + 480,
    q05_b_u: 800*0.25/(3+2) + 320, q05_b_v: 800*0.125/(3+2) + 240,
    q06_b_left_x: left[0], q06_b_left_y: left[1], q06_b_right_x: right[0], q06_b_right_y: right[1],
    q06_c_width: Math.hypot(right[0]-left[0], right[1]-left[1])/100,
    q07_b_tip_x: tip[0], q07_b_tip_y: tip[1], q07_b_tail_x: tail[0], q07_b_tail_y: tail[1],
    q07_c_length: Math.hypot(tip[0]-tail[0], tip[1]-tail[1]),
    q08_b_u: 320 + 800*Math.tan(10*Math.PI/180), q08_b_v: 240,
    q13_a_40: 1000*0.2/40, q13_a_25: 1000*0.2/25, q13_a_10: 1000*0.2/10,
    q13_b: 20**2/(1000*0.2),
    q14_a_sad0: cost(R0, 1), q14_a_ssd0: cost(R0, 2), q14_a_sad1: cost(R1, 1), q14_a_ssd1: cost(R1, 2),
    q16_b_u: board[0], q16_b_v: board[1], q17_a_det: 0, q17_a_rank: 2,
    q18_b_value: 0.05*(-0.2) + 0.2*0.05, q18_c_x: 0.10*Z, q18_c_y: 0.05*Z, q18_c_z: Z,
    q19_a: 1500*0.4/30, q19_b_10: 10**2*0.5/(1500*0.4), q19_b_40: 40**2*0.5/(1500*0.4),
    q19_c: 30**2*0.5/(1.5*1500),
    q20_a_x: centre[0], q20_a_y: centre[1], q20_a_z: centre[2],
    q20_c_tx: translation[0], q20_c_ty: translation[1], q20_c_tz: translation[2]
  };
  const numerical = practice.questions.filter(q => q.type === "numerical");
  assert.deepEqual(new Set(numerical.map(q => q.id)), new Set(Object.keys(expected).map(id => "practice_" + id)));
  const built = C.build(practice);
  for (const q of numerical) {
    const value = expected[q.id.replace("practice_", "")];
    assert.ok(Math.abs(value - q.numeric.value) < 1e-10 * Math.max(1, Math.abs(value)), q.id + " key");
    const bounds = C.bounds(q.numeric);
    const rounding = q.prompt.match(/(one|two|three) decimal place/);
    const answer = rounding ? Number(value.toFixed({ one: 1, two: 2, three: 3 }[rounding[1]])) : value;
    assert.ok(answer >= bounds.low - 1e-12 && answer <= bounds.high + 1e-12, q.id + " rounding accepted");
    const xml = built.files[`items/${q.id}.xml`];
    assert.ok(xml.includes(`<baseValue baseType="float">${bounds.low}</baseValue>`), q.id + " lower bound exported");
    assert.ok(xml.includes(`<baseValue baseType="float">${bounds.high}</baseValue>`), q.id + " upper bound exported");
  }
});

test("practice stimuli link within their source question and export without instructor notes", () => {
  const built = C.build(practice, "new");
  assert.equal(built.count, 76);
  assert.equal(built.points, 180);
  const withoutNotes = C.clone(practice);
  withoutNotes.questions.forEach(q => { q.solution = ""; });
  assert.deepEqual(C.build(withoutNotes, "new").files, built.files, "All worked notes excluded from export");
  for (const stimulus of practice.questions.filter(q => q.type === "stimulus")) {
    const linked = practice.questions.filter(q => q.stimulusId === stimulus.id);
    assert.ok(linked.length > 1, stimulus.id + " demonstrates reuse");
    assert.ok(!built.files[`items/${stimulus.id}.xml`], "No standalone stimulus item");
    linked.forEach(q => {
      assert.equal(q.id.slice(0, 12), stimulus.id.slice(0, 12));
      assert.ok(built.files[`items/${q.id}.xml`].includes('class="stimulus-context"'));
    });
  }
  const stereo = practice.questions.filter(q => q.stimulusId === "practice_q13_context");
  assert.equal(stereo.length, 5);
  stereo.forEach(q => {
    const xml = built.files[`items/${q.id}.xml`];
    assert.match(xml, /f = 1000 pixels/);
    assert.match(xml, /B = 0.2 metres/);
  });
  assert.ok(C.validate(practice, "classic").some(message => message.includes("not supported in Classic")));
  const zipped = readZip(C.zip(built.files));
  assert.equal(Object.keys(zipped).filter(name => name.startsWith("items/")).length, 76);
});

test("standalone HTML embeds the same loadable practice project without a network dependency", () => {
  const html = fs.readFileSync(path.join(__dirname, "quiz-editor.html"), "utf8");
  const data = html.match(/<script type="application\/json" id="practice-data">([\s\S]*?)<\/script>/);
  assert.ok(data, "Practice data is embedded");
  assert.deepEqual(JSON.parse(data[1]), practice);
  assert.ok(!data[1].includes("<"), "Embedded data cannot close its script element");
  assert.ok(!html.includes("/*__PRACTICE_JSON__*/"));
  assert.ok(!/<script[^>]+\bsrc=/.test(html), "No external runtime scripts");
  assert.equal((html.match(/<button id="load-example">/g) || []).length, 1);
  assert.ok(!html.includes("load-practice"), "Use the existing example button, not a separate practice button");
});

module.exports = { fixtures };
