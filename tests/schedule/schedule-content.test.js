// Unit tests for the schedule builder's pure logic (js/schedule-content.js).
// Run: node --test tests/schedule/
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const S = require("../../js/schedule-content.js");

function school() {
  const st = S.defaultScheduleState();
  st.settings = { days: 2, periodsPerDay: 3 }; // 6 slots
  const math = S.scheduleAddSubject(st, "מתמטיקה");
  const eng = S.scheduleAddSubject(st, "אנגלית");
  const c1 = S.scheduleAddClass(st, "ז1");
  const t1 = S.scheduleAddTeacher(st, "רונית"); t1.subjectIds.push(math.id);
  const t2 = S.scheduleAddTeacher(st, "דוד"); t2.subjectIds.push(eng.id);
  const a1 = S.scheduleAddAssignment(st, c1.id, math.id, t1.id, 2);
  const a2 = S.scheduleAddAssignment(st, c1.id, eng.id, t2.id, 2);
  return { st, math, eng, c1, t1, t2, a1, a2 };
}
const full = (st) => {
  // a valid placement: every lesson in its own slot
  const p = {}; let i = 0;
  S.buildScheduleProblem(st).lessons.forEach((l) => { p[l.id] = { day: Math.floor(i / st.settings.periodsPerDay), period: i % st.settings.periodsPerDay }; i++; });
  return p;
};

test("health: complete, conflict-free timetable is ok", () => {
  const { st } = school();
  const h = S.scheduleTimetableHealth(st, full(st));
  assert.equal(h.total, 4); assert.equal(h.placed, 4); assert.equal(h.ok, true);
});

test("health: lessons added after generating are reported missing (not ok)", () => {
  const { st, a1 } = school();
  const p = full(st);
  a1.weeklyHours = 4;
  const h = S.scheduleTimetableHealth(st, p);
  assert.equal(h.missing.length, 2); assert.equal(h.ok, false);
  assert.deepEqual(S.scheduleLessonGroups(st, h.missing), ["מתמטיקה – ז1 (2)"]);
});

test("health: lessons outside the days/periods are reported, not counted as placed", () => {
  const { st } = school();
  const p = full(st);
  st.settings.periodsPerDay = 1;
  const h = S.scheduleTimetableHealth(st, p);
  assert.ok(h.outOfRange.length > 0); assert.equal(h.ok, false);
  assert.equal(h.placed + h.outOfRange.length + h.missing.length, h.total);
});

test("health: a double-booking is a conflict (not ok)", () => {
  const { st } = school();
  const p = full(st);
  const ids = Object.keys(p); p[ids[1]] = { ...p[ids[0]] };
  const h = S.scheduleTimetableHealth(st, p);
  assert.ok(h.conflicts.size >= 2); assert.equal(h.ok, false);
});

test("health: no lessons at all is never 'ok'", () => {
  const st = S.defaultScheduleState();
  assert.equal(S.scheduleTimetableHealth(st, {}).ok, false);
});

test("capacity: exactly full fits, one hour over is reported per class", () => {
  const { st, a1 } = school();
  a1.weeklyHours = 4; // 4 + 2 = 6 = 2 days × 3 periods
  assert.deepEqual(S.scheduleCapacityCheck(st), []);
  a1.weeklyHours = 5;
  const p = S.scheduleCapacityCheck(st);
  assert.equal(p.length, 1); assert.equal(p[0].kind, "class"); assert.equal(p[0].need, 7); assert.equal(p[0].have, 6);
});

test("capacity: class daily limit shrinks what fits", () => {
  const { st, c1 } = school();
  c1.maxDailyPeriod = 1; // 2 slots only, 4 hours needed
  const p = S.scheduleCapacityCheck(st).find((x) => x.kind === "class");
  assert.equal(p.have, 2); assert.equal(p.need, 4);
});

test("capacity: teacher availability counts, blocks outside the grid don't", () => {
  const { st, t1, a1 } = school();
  a1.weeklyHours = 5;
  t1.unavailable = ["0-0", "5-9"]; // 5-9 is outside a 2×3 grid
  const c = S.scheduleCapacityCheck(st);
  const tp = c.find((x) => x.kind === "teacher");
  assert.equal(tp, undefined); // 5 ≤ 6 − 1
  t1.unavailable = ["0-0", "0-1"];
  assert.equal(S.scheduleCapacityCheck(st).find((x) => x.kind === "teacher").have, 4);
});

test("capacity: a special room is shared by every subject that needs it", () => {
  const { st, math, eng } = school();
  const lab = S.scheduleAddRoom(st, "מעבדה", 1);
  math.roomId = lab.id; eng.roomId = lab.id;
  const c2 = S.scheduleAddClass(st, "ז2");
  const t = st.teachers[0];
  S.scheduleAddAssignment(st, c2.id, math.id, t.id, 3);
  const room = S.scheduleCapacityCheck(st).find((x) => x.kind === "room");
  assert.equal(room.need, 7); assert.equal(room.have, 6);
});

test("validate: assignment with a deleted teacher is an error; unmarked subject is a warning", () => {
  const { st, t1, t2, a1, a2 } = school();
  assert.deepEqual(S.scheduleValidateAssignments(st), { errors: [], warnings: [] });
  t1.subjectIds = [];
  const v = S.scheduleValidateAssignments(st);
  assert.equal(v.errors.length, 0); assert.equal(v.warnings[0].assignmentId, a1.id);
  a2.teacherId = "gone";
  const v2 = S.scheduleValidateAssignments(st);
  assert.deepEqual(v2.errors, [{ assignmentId: a2.id, missing: ["teacher"] }]);
  void t2;
});

test("signature: changes with what the solver uses, not with names/colours or order of blocked slots", () => {
  const { st, math, t1, a1 } = school();
  const s0 = S.scheduleInputsSignature(st);
  math.name = "חשבון"; math.color = "#000000"; t1.name = "רונית כהן";
  assert.equal(S.scheduleInputsSignature(st), s0);
  t1.unavailable = ["0-1", "0-0"]; const s1 = S.scheduleInputsSignature(st);
  t1.unavailable = ["0-0", "0-1"]; assert.equal(S.scheduleInputsSignature(st), s1);
  assert.notEqual(s1, s0);
  a1.weeklyHours = 3; assert.notEqual(S.scheduleInputsSignature(st), s1);
});

test("existing evaluator and conflict finder are unchanged for a valid placement", () => {
  const { st } = school();
  const p = full(st);
  const prob = S.buildScheduleProblem(st);
  assert.equal(S.scheduleEvaluatePlacement(prob, p).hard, 0);
  assert.equal(S.scheduleFindConflicts(prob, p).size, 0);
});

// ---- the solver itself (js/schedule-worker.js), loaded without a real Worker
function loadSolver() {
  const fs = require("fs"), vm = require("vm"), path = require("path");
  const dir = path.join(__dirname, "..", "..", "js");
  const ctx = { self: {}, console, Date, Math, Set, Object, Array, JSON };
  ctx.importScripts = (f) => vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx);
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(dir, "schedule-worker.js"), "utf8") + "\nthis.solve = solve;", ctx);
  return ctx.solve;
}

test("solver: places every lesson of a feasible school with 0 hard violations", () => {
  const solve = loadSolver();
  const { st } = school();
  st.settings = { days: 5, periodsPerDay: 6 };
  const prob = S.buildScheduleProblem(st);
  const r = solve(prob, 1500, null, () => {});
  assert.equal(Object.keys(r.placement).length, prob.lessons.length);
  assert.equal(S.scheduleEvaluatePlacement(prob, r.placement).hard, 0);
});

test("solver: 'complete' mode moves only the given lessons; the rest stay exactly in place", () => {
  const solve = loadSolver();
  const { st, a1 } = school();
  st.settings = { days: 5, periodsPerDay: 6 };
  const first = solve(S.buildScheduleProblem(st), 1000, null, () => {});
  a1.weeklyHours = 4; // two new lessons with no slot
  const prob = S.buildScheduleProblem(st);
  const h = S.scheduleTimetableHealth(st, first.placement);
  const movable = h.missing.map((l) => l.id);
  assert.equal(movable.length, 2);
  const r = solve(prob, 1000, first.placement, () => {}, movable);
  for (const id of Object.keys(first.placement)) assert.deepEqual(r.placement[id], first.placement[id], id);
  const after = S.scheduleTimetableHealth(st, r.placement);
  assert.equal(after.missing.length, 0); assert.equal(after.ok, true);
});
