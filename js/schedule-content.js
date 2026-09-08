/* Pure data model + constraint math for the school schedule builder.
   No DOM access here on purpose — schedule-worker.js pulls this file
   in via importScripts() to reuse the exact same problem shape and
   conflict math the solver optimizes against, so what schedule-render.js
   highlights as a conflict after a manual drag is never out of sync
   with what the solver itself counts as a hard violation. */

const SCHEDULE_DAY_NAMES = ["א", "ב", "ג", "ד", "ה", "ו"];
const SCHEDULE_MAX_DAYS = 6;
const SCHEDULE_MAX_PERIODS = 12;

function scheduleUid(prefix) {
  return prefix + "_" + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 7);
}

function defaultScheduleState() {
  return {
    name: "מערכת שעות חדשה",
    settings: { days: 5, periodsPerDay: 8 },
    subjects: [],    // { id, name, color, roomId }
    classes: [],     // { id, name }
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

/* --- CRUD (mutate state in place, return the new/removed item) --- */

function scheduleAddSubject(state, name, color, roomId) {
  const s = { id: scheduleUid("subj"), name: name || "מקצוע חדש", color: color || "#1F5C4E", roomId: roomId || null };
  state.subjects.push(s);
  return s;
}
function scheduleRemoveSubject(state, id) {
  state.subjects = state.subjects.filter((s) => s.id !== id);
  state.teachers.forEach((t) => { t.subjectIds = t.subjectIds.filter((sid) => sid !== id); });
  state.assignments = state.assignments.filter((a) => a.subjectId !== id);
}

function scheduleAddClass(state, name) {
  const c = { id: scheduleUid("cls"), name: name || "כיתה חדשה" };
  state.classes.push(c);
  return c;
}
function scheduleRemoveClass(state, id) {
  state.classes = state.classes.filter((c) => c.id !== id);
  state.assignments = state.assignments.filter((a) => a.classId !== id);
}

function scheduleAddTeacher(state, name) {
  const t = { id: scheduleUid("tch"), name: name || "מורה חדש/ה", subjectIds: [], unavailable: [] };
  state.teachers.push(t);
  return t;
}
function scheduleRemoveTeacher(state, id) {
  state.teachers = state.teachers.filter((t) => t.id !== id);
  state.assignments = state.assignments.filter((a) => a.teacherId !== id);
}

function scheduleAddRoom(state, name, count) {
  const r = { id: scheduleUid("room"), name: name || "חדר מיוחד", count: Math.max(1, count || 1) };
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
  });
  Object.values(teacherSlot).forEach((c) => { if (c > 1) hard += c - 1; });
  Object.values(classSlot).forEach((c) => { if (c > 1) hard += c - 1; });
  Object.keys(roomSlot).forEach((rk) => {
    const roomId = rk.split("|")[0];
    const cap = roomCountMap[roomId] || 1;
    if (roomSlot[rk] > cap) hard += roomSlot[rk] - cap;
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
    });
  });

  const classSubjectDay = {};
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos) return;
    const key = lesson.classId + "|" + lesson.subjectId + "|" + pos.day;
    classSubjectDay[key] = (classSubjectDay[key] || 0) + 1;
  });
  Object.values(classSubjectDay).forEach((c) => { if (c > 1) soft += (c - 1) * 0.5; });

  return { hard, soft, cost: hard * 1000 + soft };
}

/* Returns the set of lesson ids currently involved in a hard conflict
   (double-booking or unavailability) — used to highlight offending
   cells red after a manual drag on the results grid. */
function scheduleFindConflicts(problem, placement) {
  const teacherUnavailSet = {};
  problem.teacherUnavailable.forEach((t) => { teacherUnavailSet[t.id] = new Set(t.unavailable); });
  const subjectRoomMap = {};
  problem.subjectRoom.forEach((sr) => { subjectRoomMap[sr.subjectId] = sr.roomId; });
  const roomCountMap = {};
  problem.roomCount.forEach((r) => { roomCountMap[r.id] = r.count; });

  const teacherSlot = {}, classSlot = {}, roomSlot = {};
  problem.lessons.forEach((lesson) => {
    const pos = placement[lesson.id];
    if (!pos) return;
    const sk = slotKey(pos.day, pos.period);
    (teacherSlot[lesson.teacherId + "|" + sk] = teacherSlot[lesson.teacherId + "|" + sk] || []).push(lesson.id);
    (classSlot[lesson.classId + "|" + sk] = classSlot[lesson.classId + "|" + sk] || []).push(lesson.id);
    const roomId = subjectRoomMap[lesson.subjectId];
    if (roomId) (roomSlot[roomId + "|" + sk] = roomSlot[roomId + "|" + sk] || []).push(lesson.id);
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
    if (pos && teacherUnavailSet[lesson.teacherId] && teacherUnavailSet[lesson.teacherId].has(slotKey(pos.day, pos.period))) {
      bad.add(lesson.id);
    }
  });
  return bad;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SCHEDULE_DAY_NAMES, SCHEDULE_MAX_DAYS, SCHEDULE_MAX_PERIODS,
    scheduleUid, defaultScheduleState, scheduleDayName, slotKey,
    scheduleAddSubject, scheduleRemoveSubject, scheduleAddClass, scheduleRemoveClass,
    scheduleAddTeacher, scheduleRemoveTeacher, scheduleAddRoom, scheduleRemoveRoom,
    scheduleAddAssignment, scheduleRemoveAssignment, scheduleTeachersForSubject,
    buildScheduleProblem, scheduleEvaluatePlacement, scheduleFindConflicts,
  };
}
