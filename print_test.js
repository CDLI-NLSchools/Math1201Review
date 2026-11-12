/* Print-format tests for the Math 1201 Review app, full bank (147 entries,
   Units 1 to 7): the practice sheet / exam package (one sheet button
   driven by Multiple choice and Constructed Response counts plus an answer-key
   checkbox; Download Word file and Copy for Google Docs on both views;
   Edit controls; Extra space at the 2.3 factor); mid-scope and
   final-scope exam composition against the 2026-2027 TOS blueprint
   (SR 27 at 10/15/2, CR 23 with Level 3 at exactly 8, total 50) across
   repeated trials with zero cross-section duplicates; unit tests for
   all seven units at 25 marks. */
const fs = require("fs"), vm = require("vm");
const html = fs.readFileSync("/home/hatch/workspace/math-1201-review/index.html", "utf8");
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const els = {}, listeners = {};
function makeEl(id) {
  return { id, value: "", textContent: "", innerHTML: "", hidden: false, open: false, disabled: false,
    dataset: {}, style: {},
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(t, fn) { (listeners[id] = listeners[id] || {})[t] = fn; },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    querySelectorAll() { return []; }, querySelector() { return null; },
    scrollIntoView() {}, focus() {}, appendChild() {}, removeChild() {} };
}
function parseChks(htmlStr, cls) {
  if (!htmlStr) return [];
  const out = [];
  const re = new RegExp('<input[^>]*class="' + cls + '"[^>]*>', 'g');
  let m; while ((m = re.exec(htmlStr))) {
    const tag = m[0];
    const val = (tag.match(/value="([^"]*)"/) || [])[1];
    out.push({ value: val, checked: / checked/.test(tag), addEventListener() {} });
  }
  return out;
}
const documentStub = {
  getElementById(id) { return els[id] || (els[id] = makeEl(id)); },
  querySelectorAll(sel) {
    if (sel === ".unitChk") return parseChks(els.unitGrid && els.unitGrid.innerHTML, "unitChk");
    if (sel === ".unitChk:checked") return parseChks(els.unitGrid && els.unitGrid.innerHTML, "unitChk").filter(c => c.checked);
    if (sel === ".indChk") return parseChks(els.indBox && els.indBox.innerHTML, "indChk");
    if (sel === ".indChk:checked") return parseChks(els.indBox && els.indBox.innerHTML, "indChk").filter(c => c.checked);
    return [];
  }, querySelector() { return null; },
  createElement() { return makeEl("anon"); },
  createTreeWalker() { return { nextNode() { return null; } }; },
  body: makeEl("body") };
const sandbox = { console, URLSearchParams, document: documentStub,
  location: { search: "", pathname: "/index.html", origin: "http://test", href: "http://test/index.html" },
  history: { replaceState() {} }, navigator: {}, window: {}, setTimeout, clearTimeout, print() {}, NodeFilter: { SHOW_TEXT: 4 } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
blocks.forEach((b, i) => vm.runInContext(b, sandbox, { filename: "block" + i }));
const fails = [];
const ok = (c, m) => { if (!c) fails.push(m); };
const S = sandbox;
const el = id => documentStub.getElementById(id);

// 1. type pools: every entry probes to exactly one of mc or no-choices;
//    the retired worksheet path stays gone
const mcN = S.BANK.filter(e => S.probeType(e) === "mc").length;
const ncN = S.BANK.filter(e => S.probeType(e) !== "mc").length;
ok(mcN > 0 && ncN > 0 && mcN + ncN === 147, "type split " + mcN + "/" + ncN + " of 147");
ok(typeof S.worksheetPred === "undefined", "worksheetPred still defined");
ok(typeof S.drawSheetSet === "function", "drawSheetSet missing");
ok(typeof S.wsBox === "function", "wsBox missing");
ok(!html.includes("goWorksheet") && !html.includes("Make a worksheet"), "worksheet button survives in the page");
ok(Object.keys(S.CR_MARKS).length === 71, "CR_MARKS has 71 entries, saw " + Object.keys(S.CR_MARKS).length);
ok(Object.keys(S.CR_MARKS).every(id => S.BANK.some(e => e.id === id)), "a CR_MARKS id is not in the bank");
// type stability: an entry's type must not vary across draws (the engine
// caches the probed type; a mixed entry would break the sheet counts)
for (const e of S.BANK) {
  const t0 = S.probeType(e); let stable = true;
  for (let i = 0; i < 200; i++) { const q = e.gen(); const isMc = q.type === "mc"; if ((t0 === "mc") !== isMc) { stable = false; break; } }
  ok(stable, e.id + " is not type-stable across draws");
  if (fails.length) break;
}
// 2. sheet draw, direct: exact type counts
const d = S.drawSheetSet({ units: [1, 2, 3], inds: [], midCap: false, mcCount: 4, ncCount: 6, mix: [20, 60, 20], order: "unit" });
ok(d.items.length === 10, "drawSheetSet served " + d.items.length);
ok(d.items.filter(q => q.type === "mc").length === 4, "drawSheetSet mc count " + d.items.filter(q => q.type === "mc").length);
ok(d.items.filter(q => q.type !== "mc").length === 6, "drawSheetSet no-choices count " + d.items.filter(q => q.type !== "mc").length);
const d0 = S.drawSheetSet({ units: [1, 2, 3], inds: [], midCap: false, mcCount: 0, ncCount: 3, mix: [20, 60, 20], order: "unit" });
ok(d0.items.length === 3 && d0.items.every(q => q.type !== "mc"), "zero MC count did not give an all no-choices sheet");
// generated questions must appear in both halves of the draw (type is
// enforced on generated questions, not just on static ones)
let genSeen = 0;
for (let t = 0; t < 25; t++) {
  const dd = S.drawSheetSet({ units: [1, 2, 3], inds: [], midCap: false, mcCount: 5, ncCount: 5, mix: [20, 60, 20], order: "random" });
  dd.items.forEach(q => { if (q._entry && q._entry.kind === "gen") genSeen++; });
}
ok(genSeen > 100, "generated entries barely appear in sheet draws: " + genSeen);
// 3. mid exam composition, repeated strict trials: blueprint exact
for (let t = 0; t < 30; t++) {
  const ex = S.composeExam([1, 2, 3], []);
  ok(ex && ex.srItems.length === 27, "exam SR count " + (ex && ex.srItems.length));
  if (!ex) break;
  ok(ex.short === false, "mid exam flagged short on a strict trial");
  const src = { 1: 0, 2: 0, 3: 0 }; ex.srItems.forEach(it => src[it.q._entry.level]++);
  ok(src[1] === 10 && src[2] === 15 && src[3] === 2, "exam SR level split " + JSON.stringify(src));
  ok(ex.crMarks === 23, "exam CR marks " + ex.crMarks);
  ok(ex.l3Marks === 8, "exam CR Level 3 marks " + ex.l3Marks);
  ok(ex.total === 50, "exam total " + ex.total);
  ok(ex.crItems.every(it => S.CR_MARKS[it.q._entry.id] === it.marks && it.q._entry.level >= 2), "a CR item is untagged or below Level 2");
  ok(ex.srItems.every(it => it.q.type === "mc"), "an SR item is not multiple choice");
  const canons = new Set(); let dup = false;
  ex.srItems.concat(ex.crItems).forEach(it => { const c = S.canonQ(it.q); if (canons.has(c)) dup = true; canons.add(c); });
  ok(!dup, "duplicate question inside one exam");
  if (fails.length) break;
}
// 3b. 200 more composed exams: zero cross-section duplicates, and a short
//     paper is always flagged, never silently short
for (let t = 0; t < 200; t++) {
  const ex = S.composeExam([1, 2, 3], []);
  if (!ex) { ok(false, "composeExam returned null on the banked mid scope"); break; }
  const canons = new Set(); let dup = false;
  ex.srItems.concat(ex.crItems).forEach(it => { const c = S.canonQ(it.q); if (canons.has(c)) dup = true; canons.add(c); });
  ok(!dup, "duplicate question inside one exam (trial " + t + ")");
  ok(ex.total === 50 || ex.short === true, "exam silently short: total " + ex.total + " with short flag " + ex.short);
  if (fails.length) break;
}
// 4. unit tests compose to 25 on every unit, repeatedly
for (const u of [1, 2, 3, 4, 5, 6, 7]) {
  for (let t = 0; t < 30; t++) {
    const ut = S.composeExam([u], []);
    ok(ut && ut.total === 25 && ut.srMarks === 11 && ut.crMarks === 14 && ut.short === false, "unit " + u + " test totals " + (ut && ut.total + "/" + ut.srMarks + "/" + ut.crMarks + " short=" + (ut && ut.short)));
    ok(ut && [4, 5, 6].includes(ut.l3Marks), "unit " + u + " test Level 3 CR marks " + (ut && ut.l3Marks));
    const canons = new Set(); let dup = false;
    if (ut) ut.srItems.concat(ut.crItems).forEach(it => { const c = S.canonQ(it.q); if (canons.has(c)) dup = true; canons.add(c); });
    ok(!dup, "duplicate question inside unit " + u + " test");
    if (fails.length) break;
  }
  if (fails.length) break;
}
// 5. final exam composition, repeated strict trials: blueprint exact
for (let t = 0; t < 30; t++) {
  const ex = S.composeExam([4, 5, 6, 7], []);
  ok(ex && ex.srItems.length === 27, "final exam SR count " + (ex && ex.srItems.length));
  if (!ex) break;
  ok(ex.short === false, "final exam flagged short on a strict trial");
  const src = { 1: 0, 2: 0, 3: 0 }; ex.srItems.forEach(it => src[it.q._entry.level]++);
  ok(src[1] === 10 && src[2] === 15 && src[3] === 2, "final exam SR level split " + JSON.stringify(src));
  ok(ex.crMarks === 23, "final exam CR marks " + ex.crMarks);
  ok(ex.l3Marks === 8, "final exam CR Level 3 marks " + ex.l3Marks);
  ok(ex.total === 50, "final exam total " + ex.total);
  ok(ex.crItems.every(it => S.CR_MARKS[it.q._entry.id] === it.marks && it.q._entry.level >= 2), "a final CR item is untagged or below Level 2");
  ok(ex.srItems.every(it => it.q.type === "mc"), "a final SR item is not multiple choice");
  ok([4, 5, 6, 7].every(u => ex.srItems.concat(ex.crItems).some(it => it.q._entry.unit === u)), "a final-scope unit is unrepresented in a composed exam");
  const canons = new Set(); let dup = false;
  ex.srItems.concat(ex.crItems).forEach(it => { const c = S.canonQ(it.q); if (canons.has(c)) dup = true; canons.add(c); });
  ok(!dup, "duplicate question inside one final exam");
  if (fails.length) break;
}
// 5b. 200 more composed final exams: zero cross-section duplicates, and a
//     short paper is always flagged, never silently short
for (let t = 0; t < 200; t++) {
  const ex = S.composeExam([4, 5, 6, 7], []);
  if (!ex) { ok(false, "composeExam returned null on the banked final scope"); break; }
  const canons = new Set(); let dup = false;
  ex.srItems.concat(ex.crItems).forEach(it => { const c = S.canonQ(it.q); if (canons.has(c)) dup = true; canons.add(c); });
  ok(!dup, "duplicate question inside one final exam (trial " + t + ")");
  ok(ex.total === 50 || ex.short === true, "final exam silently short: total " + ex.total + " with short flag " + ex.short);
  if (fails.length) break;
}
// 5c. final-scope sheet draw serves exact type counts
const df = S.drawSheetSet({ units: [4, 5, 6, 7], inds: [], midCap: false, mcCount: 4, ncCount: 6, mix: [20, 60, 20], order: "unit" });
ok(df.items.length === 10, "final-scope sheet draw served " + df.items.length);
ok(df.items.filter(q => q.type === "mc").length === 4, "final-scope sheet mc count " + df.items.filter(q => q.type === "mc").length);
ok(df.items.filter(q => q.type !== "mc").length === 6, "final-scope sheet no-choices count " + df.items.filter(q => q.type !== "mc").length);
// 6. sheet UI path: two typed draws through the real button, exact counts
el("countIn").value = "10"; el("lv1").value = "20"; el("lv2").value = "60"; el("lv3").value = "20";
el("wsMcIn").value = "1"; el("wsCrIn").value = "1"; el("orderIn").value = "unit"; el("chkIn").value = "each";
el("mcCountIn").value = "4"; el("ncCountIn").value = "6"; el("keyChk").checked = true;
// The sheet and exam Edit controls are teacher-only since the teacher-mode
// UI split (Nov 10, 2026), so the print flows below run with TEACHER on.
S.TEACHER = true;
(listeners.presetMid || {}).click && listeners.presetMid.click();
ok(JSON.stringify(S.state.units) === "[1,2,3]", "mid preset set units " + JSON.stringify(S.state.units));
let calls = []; const origDraw = S.drawSet;
S.drawSet = function (u, i, n, m, o, c, pr) { calls.push({ n, pred: typeof pr }); return origDraw(u, i, n, m, o, c, pr); };
(listeners.goSheet || {}).click && listeners.goSheet.click();
S.drawSet = origDraw;
ok(calls.length === 2 && calls[0].n === 4 && calls[1].n === 6 && calls.every(x => x.pred === "function"), "sheet UI path did not make two typed draws, saw " + JSON.stringify(calls));
const paperOf = () => els.printArea.innerHTML.split('<div class="keybreak">')[0];
ok(paperOf().includes("Math 1201: Practice Sheet"), "sheet title missing");
ok(!/worksheet/i.test(els.printArea.innerHTML) && !/worksheet/i.test(els.session.innerHTML), "worksheet wording survives in the sheet view");
ok(els.session.innerHTML.includes("Download Word file") && els.session.innerHTML.includes("Copy for Google Docs") && !els.session.innerHTML.includes("Copy for Word"), "sheet view lacks the Word download and Docs copy buttons");
ok(els.session.innerHTML.includes("Edit the sheet"), "sheet view lacks the Edit control");
for (let t = 0; t < 10; t++) {
  (listeners.goSheet || {}).click && listeners.goSheet.click();
  const paper = paperOf();
  ok((paper.match(/class="pq"/g) || []).length === 10, "sheet question count " + (paper.match(/class="pq"/g) || []).length);
  ok((paper.match(/class="opts"/g) || []).length === 4, "sheet option groups " + (paper.match(/class="opts"/g) || []).length);
  ok(els.printArea.innerHTML.includes("Answer Key"), "answer key missing with the checkbox on");
  if (fails.length) break;
}
el("keyChk").checked = false;
(listeners.goSheet || {}).click && listeners.goSheet.click();
ok(!els.printArea.innerHTML.includes("Answer Key"), "answer key printed with the checkbox off");
ok((paperOf().match(/class="pq"/g) || []).length === 10, "key-off sheet question count");
el("keyChk").checked = true;
el("mcCountIn").value = "0"; el("ncCountIn").value = "0";
(listeners.goSheet || {}).click && listeners.goSheet.click();
ok(els.session.innerHTML.includes("Set the Multiple choice and Constructed Response counts"), "zero-count sheet did not explain itself");
el("mcCountIn").value = "4"; el("ncCountIn").value = "6";
// 7. rendered exam: print shapes, Edit and download/copy controls
(listeners.goExam || {}).click && listeners.goExam.click();
ok(els.printArea.innerHTML.includes("Section A: Selected Response (27 marks)"), "exam Section A header");
ok(els.printArea.innerHTML.includes("Section B: Constructed Response (23 marks)"), "exam Section B header");
ok(els.printArea.innerHTML.includes("Total marks: 50"), "exam total line");
ok(els.printArea.innerHTML.includes("Answer record"), "paper answer record heading missing");
ok(els.printArea.innerHTML.includes('class="recGrid"'), "paper record grid missing");
ok((els.printArea.innerHTML.match(/class="lt"/g) || []).length === 27 * 4, "paper record grid should hold 27x4 letters, saw " + (els.printArea.innerHTML.match(/class="lt"/g) || []).length);
ok(els.printArea.innerHTML.includes("<b>A.</b>"), "Section A options are not lettered on the paper");
ok(els.session.innerHTML.includes("Print the exam paper") && els.session.innerHTML.includes("Print the answer key"), "split print buttons");
ok(els.session.innerHTML.includes("Edit the exam"), "exam view lacks the Edit control");
ok(els.session.innerHTML.includes("Download Word file") && els.session.innerHTML.includes("Copy for Google Docs") && !els.session.innerHTML.includes("Copy for Word"), "exam view lacks the Word download and Docs copy buttons");
(listeners.printKeyBtn || {}).click && listeners.printKeyBtn.click();
ok(els.printArea.innerHTML.includes("Answer Key"), "key print does not swap printArea to the key");
ok(els.printArea.innerHTML.includes('class="recGrid"'), "key answer grid missing");
ok((els.printArea.innerHTML.match(/class="lt rk"/g) || []).length === 27, "key grid should mark exactly 27 correct letters, saw " + (els.printArea.innerHTML.match(/class="lt rk"/g) || []).length);
ok(els.printArea.innerHTML.includes("Appendix: Section A worked solutions"), "key appendix heading missing");
ok(els.printArea.innerHTML.includes('class="solAppendix"'), "key appendix container missing");
// 7b. rendered final exam: same print shapes on the final scope
(listeners.presetFinal || {}).click && listeners.presetFinal.click();
ok(JSON.stringify(S.state.units) === "[4,5,6,7]", "final preset set units " + JSON.stringify(S.state.units));
(listeners.goExam || {}).click && listeners.goExam.click();
ok(els.printArea.innerHTML.includes("Math 1201: Practice Exam"), "final exam title missing");
ok(els.printArea.innerHTML.includes("Unit 4, Unit 5, Unit 6, Unit 7") || els.printArea.innerHTML.includes("Units 4"), "final exam scope line missing: " + els.printArea.innerHTML.slice(0, 400));
ok(els.printArea.innerHTML.includes("Section A: Selected Response (27 marks)"), "final exam Section A header");
ok(els.printArea.innerHTML.includes("Section B: Constructed Response (23 marks)"), "final exam Section B header");
ok(els.printArea.innerHTML.includes("Total marks: 50"), "final exam total line");
ok((els.printArea.innerHTML.match(/class="lt"/g) || []).length === 27 * 4, "final paper record grid should hold 27x4 letters, saw " + (els.printArea.innerHTML.match(/class="lt"/g) || []).length);
ok(els.session.innerHTML.includes("Download Word file") && els.session.innerHTML.includes("Copy for Google Docs") && !els.session.innerHTML.includes("Copy for Word"), "final exam view lacks the Word download and Docs copy buttons");
(listeners.presetMid || {}).click && listeners.presetMid.click();
// 8. Working space, split by question type: two selects, multiple choice
//    defaulting to None and constructed response to Extra space; a sheet on
//    untouched defaults boxes only the constructed response questions, the
//    MC factor raises MC boxes at base x factor, and at 2.3 on the CR side
//    the pre-split geometry holds (sheet 276/345/391, Section B marks x 62
//    x CR factor)
const mcSelIx = html.indexOf('id="wsMcIn"'), crSelIx = html.indexOf('id="wsCrIn"');
ok(mcSelIx > 0 && crSelIx > mcSelIx, "working-space selects missing or out of order");
ok(!html.includes('id="wsIn"'), "the retired single working-space select survives");
const mcSel = html.slice(mcSelIx, html.indexOf("</select>", mcSelIx));
const crSel = html.slice(crSelIx, html.indexOf("</select>", crSelIx));
ok(mcSel.includes('<option value="0" selected>'), "MC working space does not default to None");
ok(crSel.includes('<option value="2.3" selected>'), "CR working space does not default to Extra space");
ok(mcSel.indexOf('<option value="2.3">Extra space</option>') >= 0 && mcSel.indexOf('<option value="2.3">Extra space</option>') < mcSel.indexOf('<option value="1">Full space</option>'), "MC space list lost the Extra-first order");
ok(crSel.indexOf('<option value="2.3" selected>Extra space</option>') >= 0 && crSel.indexOf('<option value="2.3" selected>Extra space</option>') < crSel.indexOf('<option value="1">Full space</option>'), "CR space list lost the Extra-first order");
ok(S.wsBox(150).includes('height:150px') && S.wsBox(150).includes("wshandle"), "wsBox markup");
ok(S.wsBox(0) === "" && S.wsBox(345).includes("height:345px"), "wsBox zero and Extra heights");
const segsOf = () => paperOf().split('<div class="pq">').slice(1);
const segH = sg => { const m = sg.match(/class="ws wsbox" style="height:(\d+)px"/); return m ? +m[1] : 0; };
el("wsMcIn").value = "0"; el("wsCrIn").value = "2.3";
(listeners.goSheet || {}).click && listeners.goSheet.click();
let segs = segsOf();
ok(segs.length === 10, "default sheet question segments " + segs.length);
ok(segs.filter(sg => sg.includes('class="opts"')).length === 4 && segs.filter(sg => sg.includes('class="opts"')).every(sg => segH(sg) === 0), "default sheet puts a box under a multiple choice question");
ok(segs.filter(sg => !sg.includes('class="opts"')).length === 6 && segs.filter(sg => !sg.includes('class="opts"')).every(sg => [345, 391].includes(segH(sg))), "default sheet CR boxes not at Extra heights: " + segs.map(segH).join(","));
el("wsMcIn").value = "0.5";
(listeners.goSheet || {}).click && listeners.goSheet.click();
segs = segsOf();
ok(segs.filter(sg => sg.includes('class="opts"')).every(sg => [60, 85].includes(segH(sg))), "MC boxes at half space are not base x 0.5: " + segs.map(segH).join(","));
ok(segs.filter(sg => !sg.includes('class="opts"')).every(sg => [345, 391].includes(segH(sg))), "CR boxes moved when only the MC factor changed");
el("wsMcIn").value = "2.3";
(listeners.goExam || {}).click && listeners.goExam.click();
const secB = els.printArea.innerHTML.split("Section B: Constructed Response")[1] || "";
const bHeights = [...secB.matchAll(/class="ws wsbox" style="height:(\d+)px"/g)].map(m => +m[1]);
ok(bHeights.length >= 3, "Section B box count " + bHeights.length);
bHeights.forEach(h => { const m = Math.round(h / (62 * 2.3)); ok(Math.max(80, Math.round(m * 62 * 2.3)) === h, "Section B box height " + h + " does not follow marks x 62 x 2.3"); });
(listeners.goSheet || {}).click && listeners.goSheet.click();
const sHeights = [...paperOf().matchAll(/class="ws wsbox" style="height:(\d+)px"/g)].map(m => +m[1]);
ok(sHeights.length === 10, "sheet box count at Extra space " + sHeights.length);
ok(sHeights.every(h => [276, 345, 391].includes(h)), "sheet box heights at Extra space: " + sHeights.join(","));
ok(sHeights.includes(345), "no 345px box (the Extra-space no-choices height) on the sheet");
el("wsMcIn").value = "1"; el("wsCrIn").value = "1";
// 8b. settings links: wsmc/wscr are written only when off their defaults,
//     and a legacy ws parameter still applies to both factors on load when
//     the new parameter for that factor is absent
el("wsMcIn").value = "0"; el("wsCrIn").value = "2.3";
const uDef = S.settingsToURL();
ok(!uDef.includes("wsmc=") && !uDef.includes("wscr=") && !/[?&]ws=/.test(uDef), "default working space leaked into the settings link: " + uDef);
el("wsMcIn").value = "0.5"; el("wsCrIn").value = "1";
const uSet = S.settingsToURL();
ok(uSet.includes("wsmc=0.5") && uSet.includes("wscr=1"), "off-default working space missing from the settings link: " + uSet);
sandbox.location.search = "?ws=0.25";
S.applyURL();
ok(el("wsMcIn").value === "0.25" && el("wsCrIn").value === "0.25", "legacy ws link did not set both factors: " + el("wsMcIn").value + "/" + el("wsCrIn").value);
sandbox.location.search = "?ws=0.25&wsmc=1&wscr=0.5";
S.applyURL();
ok(el("wsMcIn").value === "1" && el("wsCrIn").value === "0.5", "new link parameters did not beat the legacy one: " + el("wsMcIn").value + "/" + el("wsCrIn").value);
sandbox.location.search = "?ws=0.25&wsmc=1";
S.applyURL();
ok(el("wsMcIn").value === "1" && el("wsCrIn").value === "0.25", "legacy ws did not fill the absent CR parameter: " + el("wsMcIn").value + "/" + el("wsCrIn").value);
sandbox.location.search = "";
el("wsMcIn").value = "1"; el("wsCrIn").value = "1";
// 9. Word download: the MathML-to-OMML converter over a fake KaTeX tree
ok(typeof S.mathToOmml === "function" && typeof S.makeWordDocx === "function" && typeof S.downloadWordFile === "function", "word download functions not exposed");
ok(typeof S.mmlString === "undefined" && typeof S.buildWordDoc === "undefined" && typeof S.wordHtml === "undefined", "retired Word clipboard builders still defined");
const xEl = (tag, attrs, kids) => { const at = {}; (attrs || []).forEach(p => { at[p[0]] = p[1]; }); return { nodeType: 1, localName: tag, tagName: tag, attributes: (attrs || []).map(p => ({ name: p[0], value: p[1] })), childNodes: kids || [], getAttribute(n) { return n in at ? at[n] : null; } }; };
const xTx = s => ({ nodeType: 3, nodeValue: s });
const fakeMath = xEl("math", [["xmlns", "http://www.w3.org/1998/Math/MathML"]], [
  xEl("semantics", [], [
    xEl("mrow", [], [
      xEl("mfrac", [], [xEl("mi", [], [xTx("x")]), xEl("mn", [], [xTx("2")])]),
      xEl("mo", [], [xTx("+")]),
      xEl("msqrt", [], [xEl("mi", [], [xTx("x")])]),
      xEl("mo", [], [xTx("+")]),
      xEl("msup", [], [xEl("mi", [], [xTx("x")]), xEl("mn", [], [xTx("2")])])
    ]),
    xEl("annotation", [["encoding", "application/x-tex"]], [xTx("\\frac{x}{2} + \\sqrt{x} + x^2")])
  ])
]);
let omml = "";
try { omml = S.mathToOmml(fakeMath, { fb: {} }); } catch (e) { ok(false, "mathToOmml threw: " + e.message); }
ok(omml.includes("<m:f>"), "OMML lacks m:f for the fraction");
ok(omml.includes("<m:rad>"), "OMML lacks m:rad for the radical");
ok(omml.includes("<m:sSup>"), "OMML lacks m:sSup for the superscript");
ok(omml.includes("Cambria Math"), "OMML math runs lack the Cambria Math font property");
ok(!omml.includes("annotation"), "OMML leaks annotation markup");
ok(!omml.includes("\\frac") && !omml.includes("\\sqrt"), "OMML leaks raw TeX");
sandbox.TextEncoder = require("util").TextEncoder;
{
  const z = S.zipStore([{ name: "a.txt", data: new sandbox.TextEncoder().encode("hello") }]);
  ok(z[0] === 80 && z[1] === 75, "zipStore output does not start with PK");
}
ok(!html.includes("Copy for Word") && !html.includes("copyWordBtn"), "the retired copy-for-Word control survives in the page");
console.log(fails.length ? "PRINT TEST FAIL: " + fails.join(" | ") : "PRINT TEST PASS: sheet draws exactly 4 MC + 6 no-choices with the key on and none with it off on both scopes; mid and final exams each compose to 50 across 30 strict trials and 200 watched trials (SR 27 at 10/15/2, CR 23 with Level 3 at exactly 8, zero cross-section duplicates, never silently short, every final unit represented); unit tests for all seven units compose to 25; paper carries the answer record grid and the key mirrors it with 27 marked letters plus the compact solutions appendix; split working space (MC defaults to None, CR to Extra) boxes sheets by question type: defaults box only constructed response, at 2.3/2.3 sheet boxes run 276/345/391 and Section B boxes follow marks x 62 x CR factor; settings links carry wsmc/wscr and still honour legacy ws; the Word download converts MathML to OMML (m:f, m:rad, m:sSup) with no annotation or raw TeX, and the retired copy-for-Word button is gone");
process.exit(fails.length ? 1 : 0);
