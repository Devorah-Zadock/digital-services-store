/* Pure data model + constraint math for the school schedule builder.
   No DOM access here on purpose — schedule-worker.js pulls this file
   in via importScripts() to reuse the exact same problem shape and
   conflict math the solver optimizes against, so what schedule-render.js
   highlights as a conflict after a manual drag is never out of sync
   with what the solver itself counts as a hard violation. */

const SCHEDULE_DAY_NAMES = ["א", "ב", "ג", "ד", "ה", "ו"];
const SCHEDULE_MAX_DAYS = 6;
const SCHEDULE_MAX_PERIODS = 12;

/* Soft-cost weight for each distinct day a teacher has at least one
   lesson on — smaller than the per-gap-hour weight (1) so avoiding a
   mid-day gap still wins when the two pull in different directions, but
   large enough that, given a free choice, the solver clusters a
   teacher's few weekly hours onto fewer days instead of spreading them
   across the whole week for no reason. */
const SCHEDULE_TEACHER_DAY_WEIGHT = 0.4;

function scheduleUid(prefix) {
  return prefix + "_" + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
}

function defaultScheduleState() {
  return {
    name: "מערכת שעות חדשה",
    settings: { days: 5, periodsPerDay: 8 },
    subjects: [],    // { id, name, color, roomId, maxConsecutive: number|null }
    classes: [],     // { id, name, maxDailyPeriod: number|null }
    teachers: [],    // { id, name, subjectIds: [], unavailable: ["d-p", ...] }
    rooms: [],       // { id, name, count }
    assignments: [], // { id, classId, subjectId, teacherId, weeklyHours }
    timetable: null, // { placement: { lessonId: {day,period} }, hard, soft, generatedAt }
  };
}

function scheduleDayName(index) {
  return SCHEDULE_DAY_NAMES[index] || "יום " + (index + 1);
}

function slotKey(day, period) {
  return day + "-" + period;
}

/* Display fallback everywhere a name is rendered (checkboxes, dropdown
   options, print/CSV) — an entity newly added via its "+" button starts
   with an empty name (see scheduleAdd* below) so its placeholder shows
   instead of text the user has to delete first; this is what keeps that
   empty name from rendering as a blank, unlabeled option elsewhere. */
function scheduleDisplayName(name) {
  const trimmed = (name || "").trim();
  return trimmed || "(ללא שם)";
}

/* How many consecutive same-value entries `sortedPeriods` has beyond
   `maxConsecutive`, summed over every run — e.g. periods [1,2,3,5] with
   maxConsecutive 2 has one run of length 3, so this returns 1. Shared by
   the worker's incremental bookkeeping and this file's from-scratch
   evaluator so both score a max-consecutive violation identically. */
function scheduleConsecutiveExcess(sortedPeriods, maxConsecutive) {
  if (!maxConsecutive || maxConsecutive <= 0) return 0;
  let excess = 0, runStart = 0;
  for (let i = 1; i <= sortedPeriods.length; i++) {
    const brokeRun = i === sortedPeriods.length || sortedPeriods[i] !== sortedPeriods[i - 1] + 1;
    if (brokeRun) {
      const runLen = i - runStart;
      if (runLen > maxConsecutive) excess += runLen - maxConsecutive;
      runStart = i;
    }
  }
  return excess;
}

/* --- CRUD (mutate state in place, return the new/removed item) ---
   Every new row starts with an empty name on purpose: the input shows
   its placeholder ("מקצוע חדש" etc.) instead of real text the user has
   to select-all-and-delete before they can type their own. */

function scheduleAddSubject(state, name, color, roomId) {
  const s = { id: scheduleUid("subj"), name: name || "", color: color || "#1F5C4E", roomId: roomId || null, maxConsecutive: null };
  state.subjects.push(s);
  return s;
}
function scheduleRemoveSubject(state, id) {
  state.subjects = state.subjects.filter((s) => s.id !== id);
  state.teachers.forEach((t) => { t.subjectIds = t.subjectIds.filter((sid) => sid !== id); });
  state.assignments = state.assignments.filter((a) => a.subjectId !== id);
}

function scheduleAddClass(state, name) {
  const c = { id: scheduleUid("cls"), name: name || "", maxDailyPeriod: null };
  state.classes.push(c);
  return c;
}
function scheduleRemoveClass(state, id) {
  state.classes = state.classes.filter((c) => c.id !== id);
  state.assignments = state.assignments.filter((a) => a.classId !== id);
}

function scheduleAddTeacher(state, name) {
  const t = { id: scheduleUid("tch"), name: name || "", subjectIds: [], unavailable: [] };
  state.teachers.push(t);
  return t;
}
function scheduleRemoveTeacher(state, id) {
  state.teachers = state.teachers.filter((t) => t.id !== id);
  state.assignments = state.assignments.filter((a) => a.teacherId !== id);
}

function scheduleAddRoom(state, name, count) {
  const r = { id: scheduleUid("room"), name: name || "", count: Math.max(1, count || 1) };
  state.rooms.push(r);
  return r;
}
function scheduleRemoveRoom(state, id) {
  state.rooms = state.rooms.filter((r) => r.id !== id);
  state.subjects.forEach((s) => { if (s.roomId === id) s.roomId = null; });
}

function scheduleAddAssignment(state, classId, subjectId, teacherId, weeklyHours) {
  const a = { id: scheduleUid("asg"), classId, subjectId, teacherId, weeklyHours: Math.max(1, weeklyHours || 1) };
  state.assignments.push(a);
  return a;
}
function scheduleRemoveAssignment(state, id) {
  state.assignments = state.assignments.filter((a) => a.id !== id);
}

function scheduleTeachersForSubject(state, subjectId) {
  return state.teachers.filter((t) => t.subjectIds.includes(subjectId));
}

/* --- Build the plain-data problem the solver optimizes, and expand
   each weekly-hours assignment into individual lesson units. --- */

function buildScheduleProblem(state) {
  const lessons = [];
  state.assignments.forEach((a) => {
    const hours = Math.max(0, Math.round(a.weeklyHours || 0));
    for (let i = 0; i < hours; i++) {
      lessons.push({ id: a.id + "_" + i, assignmentId: a.id, classId: a.classId, subjectId: a.subjectId, teacherId: a.teacherId });
    }
  });
  return {
    days: state.settings.days,
    periods: state.settings.periodsPerDay,
    lessons,
    teacherUnavailable: state.teachers.map((t) => ({ id: t.id, unavailable: t.unavailable || [] })),
    subjectRoom: state.subjects.filter((s) => s.roomId).map((s) => ({ subjectId: s.id, roomId: s.roomId })),
    roomCount: state.rooms.map((r) => ({ id: r.id, count: r.count || 1 })),
    subjectMaxConsecutive: state.subjects.filter((s) => s.maxConsecutive > 0).map((s) => ({ subjectId: s.id, max: s.maxConsecutive })),
    classMaxPeriod: state.classes.filter((c) => c.maxDailyPeriod > 0).map((c) => ({ classId: c.id, maxPeriod: c.maxDailyPeriod })),
  };
}

/* --- Constraint math shared by the solver and the manual-edit UI --- */

function scheduleEvaluatePlacement(problem, placement) {
  const teacherUnavailSet = {};
  problem.teacherUnavailable.forEach((t) => { teacherUnavailSet[t.id] = new Set(t.unavailable); });
  const subjectRoomMap = {};
  problem.subjectRoom.forEach((sr) => { subjectRoomMap[sr.subjectId] = sr.roomId; });
  const roomCountMap = {};
  problem.roomCount.forEach((r) => { roomCountMap[r.id] = r.count; });
  const subjectMaxMap = {};
  (problem.subjectMaxConsecutive || []).forEach((s) => { subjectMaxMap[s.subjectId] = s.max; });
  const classMaxPeriodMap = {};
  (problem.classMaxPeriod || []).forEach((c) => { classMaxPeriodMap[c.classId] = c.maxPeriod; });

  const teacherSlot = {}, classSlot = {}, roomSlot = {};
  let hard = 0;
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos) { hard += 50; return; }
    const sk = slotKey(pos.day, pos.period);
    const tk = lesson.teacherId + "|" + sk;
    teacherSlot[tk] = (teacherSlot[tk] || 0) + 1;
    const ck = lesson.classId + "|" + sk;
    classSlot[ck] = (classSlot[ck] || 0) + 1;
    if (teacherUnavailSet[lesson.teacherId] && teacherUnavailSet[lesson.teacherId].has(sk)) hard += 1;
    const roomId = subjectRoomMap[lesson.subjectId];
    if (roomId) roomSlot[roomId + "|" + sk] = (roomSlot[roomId + "|" + sk] || 0) + 1;
    const maxPeriod = classMaxPeriodMap[lesson.classId];
    if (maxPeriod && pos.period >= maxPeriod) hard += 1;
  });
  Object.values(teacherSlot).forEach((c) => { if (c > 1) hard += c - 1; });
  Object.values(classSlot).forEach((c) => { if (c > 1) hard += c - 1; });
  Object.keys(roomSlot).forEach((rk) => {
    const roomId = rk.split("|")[0];
    const cap = roomCountMap[roomId] || 1;
    if (roomSlot[rk] > cap) hard += roomSlot[rk] - cap;
  });

  const classSubjectDayPeriods = {};
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos || !subjectMaxMap[lesson.subjectId]) return;
    const key = lesson.classId + "|" + lesson.subjectId + "|" + pos.day;
    (classSubjectDayPeriods[key] = classSubjectDayPeriods[key] || []).push(pos.period);
  });
  Object.keys(classSubjectDayPeriods).forEach((key) => {
    const subjectId = key.split("|")[1];
    const sorted = classSubjectDayPeriods[key].slice().sort((a, b) => a - b);
    hard += scheduleConsecutiveExcess(sorted, subjectMaxMap[subjectId]);
  });

  let soft = 0;
  const teacherDayPeriods = {};
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos) return;
    teacherDayPeriods[lesson.teacherId] = teacherDayPeriods[lesson.teacherId] || {};
    (teacherDayPeriods[lesson.teacherId][pos.day] = teacherDayPeriods[lesson.teacherId][pos.day] || []).push(pos.period);
  });
  Object.values(teacherDayPeriods).forEach((byDay) => {
    Object.values(byDay).forEach((periodsArr) => {
      const sorted = periodsArr.slice().sort((a, b) => a - b);
      const span = sorted[sorted.length - 1] - sorted[0] + 1;
      soft += Math.max(0, span - sorted.length); // window/gap hours (duplicates from a double-booking must never make this negative)
      soft += SCHEDULE_TEACHER_DAY_WEIGHT; // one active day for this teacher — nudges fewer, more compact working days
    });
  });

  return { hard, soft, cost: hard * 1000 + soft };
}

/* Returns the set of lesson ids currently involved in a hard conflict
   (double-booking, unavailability, a class scheduled past its daily
   limit, or a subject run past its max-consecutive limit) — used to
   highlight offending cells red after a manual drag on the results grid. */
function scheduleFindConflicts(problem, placement) {
  const teacherUnavailSet = {};
  problem.teacherUnavailable.forEach((t) => { teacherUnavailSet[t.id] = new Set(t.unavailable); });
  const subjectRoomMap = {};
  problem.subjectRoom.forEach((sr) => { subjectRoomMap[sr.subjectId] = sr.roomId; });
  const roomCountMap = {};
  problem.roomCount.forEach((r) => { roomCountMap[r.id] = r.count; });
  const subjectMaxMap = {};
  (problem.subjectMaxConsecutive || []).forEach((s) => { subjectMaxMap[s.subjectId] = s.max; });
  const classMaxPeriodMap = {};
  (problem.classMaxPeriod || []).forEach((c) => { classMaxPeriodMap[c.classId] = c.maxPeriod; });

  const teacherSlot = {}, classSlot = {}, roomSlot = {};
  const classSubjectDayLessons = {}; // "classId|subjectId|day" -> [{period, lessonId}]
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos) return;
    const sk = slotKey(pos.day, pos.period);
    (teacherSlot[lesson.teacherId + "|" + sk] = teacherSlot[lesson.teacherId + "|" + sk] || []).push(lesson.id);
    (classSlot[lesson.classId + "|" + sk] = classSlot[lesson.classId + "|" + sk] || []).push(lesson.id);
    const roomId = subjectRoomMap[lesson.subjectId];
    if (roomId) (roomSlot[roomId + "|" + sk] = roomSlot[roomId + "|" + sk] || []).push(lesson.id);
    if (subjectMaxMap[lesson.subjectId]) {
      const key = lesson.classId + "|" + lesson.subjectId + "|" + pos.day;
      (classSubjectDayLessons[key] = classSubjectDayLessons[key] || []).push({ period: pos.period, lessonId: lesson.id });
    }
  });

  const bad = new Set();
  Object.values(teacherSlot).forEach((ids) => { if (ids.length > 1) ids.forEach((id) => bad.add(id)); });
  Object.values(classSlot).forEach((ids) => { if (ids.length > 1) ids.forEach((id) => bad.add(id)); });
  Object.keys(roomSlot).forEach((rk) => {
    const roomId = rk.split("|")[0];
    const cap = roomCountMap[roomId] || 1;
    if (roomSlot[rk].length > cap) roomSlot[rk].forEach((id) => bad.add(id));
  });
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos) return;
    if (teacherUnavailSet[lesson.teacherId] && teacherUnavailSet[lesson.teacherId].has(slotKey(pos.day, pos.period))) {
      bad.add(lesson.id);
    }
    const maxPeriod = classMaxPeriodMap[lesson.classId];
    if (maxPeriod && pos.period >= maxPeriod) bad.add(lesson.id);
  });
  Object.keys(classSubjectDayLessons).forEach((key) => {
    const subjectId = key.split("|")[1];
    const maxConsecutive = subjectMaxMap[subjectId];
    const entries = classSubjectDayLessons[key].slice().sort((a, b) => a.period - b.period);
    let runStart = 0;
    for (let i = 1; i <= entries.length; i++) {
      const brokeRun = i === entries.length || entries[i].period !== entries[i - 1].period + 1;
      if (brokeRun) {
        if (i - runStart > maxConsecutive) {
          for (let j = runStart; j < i; j++) bad.add(entries[j].lessonId);
        }
        runStart = i;
      }
    }
  });
  return bad;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SCHEDULE_DAY_NAMES, SCHEDULE_MAX_DAYS, SCHEDULE_MAX_PERIODS, SCHEDULE_TEACHER_DAY_WEIGHT,
    scheduleUid, defaultScheduleState, scheduleDayName, slotKey, scheduleDisplayName, scheduleConsecutiveExcess,
    scheduleAddSubject, scheduleRemoveSubject, scheduleAddClass, scheduleRemoveClass,
    scheduleAddTeacher, scheduleRemoveTeacher, scheduleAddRoom, scheduleRemoveRoom,
    scheduleAddAssignment, scheduleRemoveAssignment, scheduleTeachersForSubject,
    buildScheduleProblem, scheduleEvaluatePlacement, scheduleFindConflicts,
  };
}
