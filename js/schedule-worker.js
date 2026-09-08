/* Simulated-annealing timetable solver. Runs off the main thread so the
   page never freezes while it searches — schedule-render.js posts a
   { cmd: "solve", problem, timeBudgetMs, initialPlacement } message and
   gets back periodic { type: "progress" } messages plus one final
   { type: "done" } message with the best placement found.

   All constraint bookkeeping (teacherCnt/classCnt/roomCnt/gap arrays) is
   kept incrementally rather than recomputed from scratch on every move —
   with a few hundred lessons and tens of thousands of SA iterations, a
   full O(lessons) rescan per move would burn the whole time budget on
   bookkeeping instead of search. */

function gapCost(sortedPeriods) {
  if (sortedPeriods.length === 0) return 0;
  const span = sortedPeriods[sortedPeriods.length - 1] - sortedPeriods[0] + 1;
  // Duplicate periods (the same teacher double-booked at one slot) would
  // otherwise make length > span and drive this negative — which would
  // reward the search for creating conflicts instead of penalizing them.
  return Math.max(0, span - sortedPeriods.length);
}
function insertSorted(arr, v) {
  arr.push(v);
  arr.sort((a, b) => a - b);
}
function removeOne(arr, v) {
  const idx = arr.indexOf(v);
  if (idx !== -1) arr.splice(idx, 1);
}

function makeSolverState(problem) {
  const teacherUnavailSet = {};
  problem.teacherUnavailable.forEach((t) => { teacherUnavailSet[t.id] = new Set(t.unavailable); });
  const subjectRoomMap = {};
  problem.subjectRoom.forEach((sr) => { subjectRoomMap[sr.subjectId] = sr.roomId; });
  const roomCap = {};
  problem.roomCount.forEach((r) => { roomCap[r.id] = r.count; });
  return {
    days: problem.days, periods: problem.periods,
    teacherUnavailSet, subjectRoomMap, roomCap,
    teacherCnt: Object.create(null), classCnt: Object.create(null), roomCnt: Object.create(null),
    teacherDayPeriods: Object.create(null), classSubjDay: Object.create(null),
    placement: Object.create(null), hard: 0, soft: 0,
  };
}

function trialHardDelta(S, lesson, day, period) {
  const sk = day + "-" + period;
  let d = 0;
  if ((S.teacherCnt[lesson.teacherId + "#" + sk] || 0) >= 1) d++;
  if ((S.classCnt[lesson.classId + "#" + sk] || 0) >= 1) d++;
  const roomId = S.subjectRoomMap[lesson.subjectId];
  if (roomId && (S.roomCnt[roomId + "#" + sk] || 0) >= (S.roomCap[roomId] || 1)) d++;
  if (S.teacherUnavailSet[lesson.teacherId] && S.teacherUnavailSet[lesson.teacherId].has(sk)) d++;
  return d;
}

function place(S, lesson, day, period) {
  const sk = day + "-" + period;
  const tKey = lesson.teacherId + "#" + sk;
  const tc = S.teacherCnt[tKey] || 0;
  if (tc >= 1) S.hard += 1;
  S.teacherCnt[tKey] = tc + 1;

  const cKey = lesson.classId + "#" + sk;
  const cc = S.classCnt[cKey] || 0;
  if (cc >= 1) S.hard += 1;
  S.classCnt[cKey] = cc + 1;

  const roomId = S.subjectRoomMap[lesson.subjectId];
  if (roomId) {
    const rKey = roomId + "#" + sk;
    const rc = S.roomCnt[rKey] || 0;
    if (rc >= (S.roomCap[roomId] || 1)) S.hard += 1;
    S.roomCnt[rKey] = rc + 1;
  }
  if (S.teacherUnavailSet[lesson.teacherId] && S.teacherUnavailSet[lesson.teacherId].has(sk)) S.hard += 1;

  const tdKey = lesson.teacherId + "#" + day;
  const arr = S.teacherDayPeriods[tdKey] || (S.teacherDayPeriods[tdKey] = []);
  S.soft -= gapCost(arr);
  insertSorted(arr, period);
  S.soft += gapCost(arr);

  const csdKey = lesson.classId + "#" + lesson.subjectId + "#" + day;
  const csd = S.classSubjDay[csdKey] || 0;
  if (csd >= 1) S.soft += 0.5;
  S.classSubjDay[csdKey] = csd + 1;

  S.placement[lesson.id] = { day, period };
}

function remove(S, lesson) {
  const pos = S.placement[lesson.id];
  if (!pos) return;
  const { day, period } = pos;
  const sk = day + "-" + period;

  const tKey = lesson.teacherId + "#" + sk;
  const tc = S.teacherCnt[tKey] || 0;
  if (tc >= 2) S.hard -= 1;
  S.teacherCnt[tKey] = tc - 1;

  const cKey = lesson.classId + "#" + sk;
  const cc = S.classCnt[cKey] || 0;
  if (cc >= 2) S.hard -= 1;
  S.classCnt[cKey] = cc - 1;

  const roomId = S.subjectRoomMap[lesson.subjectId];
  if (roomId) {
    const rKey = roomId + "#" + sk;
    const rc = S.roomCnt[rKey] || 0;
    if (rc > (S.roomCap[roomId] || 1)) S.hard -= 1;
    S.roomCnt[rKey] = rc - 1;
  }
  if (S.teacherUnavailSet[lesson.teacherId] && S.teacherUnavailSet[lesson.teacherId].has(sk)) S.hard -= 1;

  const tdKey = lesson.teacherId + "#" + day;
  const arr = S.teacherDayPeriods[tdKey];
  S.soft -= gapCost(arr);
  removeOne(arr, period);
  S.soft += gapCost(arr);

  const csdKey = lesson.classId + "#" + lesson.subjectId + "#" + day;
  const csd = S.classSubjDay[csdKey] || 0;
  if (csd >= 2) S.soft -= 0.5;
  S.classSubjDay[csdKey] = csd - 1;

  delete S.placement[lesson.id];
}

function snapshotPlacement(placement) {
  const out = {};
  for (const id in placement) out[id] = { day: placement[id].day, period: placement[id].period };
  return out;
}

function solve(problem, timeBudgetMs, initialPlacement, onProgress) {
  const S = makeSolverState(problem);
  const lessons = problem.lessons;
  const { days, periods } = problem;

  lessons.forEach((lesson) => {
    const given = initialPlacement && initialPlacement[lesson.id];
    if (given && given.day < days && given.period < periods) {
      place(S, lesson, given.day, given.period);
      return;
    }
    let bestDay = 0, bestPeriod = 0, bestDelta = Infinity;
    for (let t = 0; t < 8; t++) {
      const day = Math.floor(Math.random() * days);
      const period = Math.floor(Math.random() * periods);
      const delta = trialHardDelta(S, lesson, day, period);
      if (delta < bestDelta) { bestDelta = delta; bestDay = day; bestPeriod = period; }
      if (delta === 0) break;
    }
    place(S, lesson, bestDay, bestPeriod);
  });

  let bestPlacement = snapshotPlacement(S.placement);
  let bestHard = S.hard, bestSoft = S.soft;

  if (lessons.length > 1) {
    let temp = 6.0;
    const coolingRate = 0.9995;
    const startTime = Date.now();
    let iter = 0;
    let sinceImprovement = 0;

    while (Date.now() - startTime < timeBudgetMs) {
      iter++;
      const beforeCost = S.hard * 1000 + S.soft;
      const swap = Math.random() < 0.75;

      if (swap) {
        const i = lessons[Math.floor(Math.random() * lessons.length)];
        let j = lessons[Math.floor(Math.random() * lessons.length)];
        let guard = 0;
        while (j.id === i.id && guard < 5) { j = lessons[Math.floor(Math.random() * lessons.length)]; guard++; }
        if (j.id === i.id) continue;
        const posI = S.placement[i.id], posJ = S.placement[j.id];
        remove(S, i); remove(S, j);
        place(S, i, posJ.day, posJ.period);
        place(S, j, posI.day, posI.period);
        const delta = (S.hard * 1000 + S.soft) - beforeCost;
        if (delta > 0 && Math.random() > Math.exp(-delta / temp)) {
          remove(S, i); remove(S, j);
          place(S, i, posI.day, posI.period);
          place(S, j, posJ.day, posJ.period);
        }
      } else {
        const i = lessons[Math.floor(Math.random() * lessons.length)];
        const posI = S.placement[i.id];
        const newDay = Math.floor(Math.random() * days);
        const newPeriod = Math.floor(Math.random() * periods);
        remove(S, i);
        place(S, i, newDay, newPeriod);
        const delta = (S.hard * 1000 + S.soft) - beforeCost;
        if (delta > 0 && Math.random() > Math.exp(-delta / temp)) {
          remove(S, i);
          place(S, i, posI.day, posI.period);
        }
      }

      temp = Math.max(0.01, temp * coolingRate);

      const curCost = S.hard * 1000 + S.soft;
      if (curCost < bestHard * 1000 + bestSoft) {
        bestHard = S.hard; bestSoft = S.soft;
        bestPlacement = snapshotPlacement(S.placement);
        sinceImprovement = 0;
      } else {
        sinceImprovement++;
      }

      if (iter % 400 === 0) {
        onProgress(iter, S.hard, S.soft, bestHard, bestSoft);
      }
      // Converged and stable for a long stretch — stop early instead of
      // burning the rest of the time budget on a solution that's already found.
      if (bestHard === 0 && sinceImprovement > 15000) break;
    }
    onProgress(iter, S.hard, S.soft, bestHard, bestSoft);
  }

  return { placement: bestPlacement, hard: bestHard, soft: bestSoft };
}

self.onmessage = function (e) {
  const msg = e.data;
  if (msg.cmd !== "solve") return;
  const problem = msg.problem;
  const timeBudgetMs = msg.timeBudgetMs || 4000;

  if (!problem.lessons.length) {
    self.postMessage({ type: "done", placement: {}, hard: 0, soft: 0 });
    return;
  }

  const result = solve(problem, timeBudgetMs, msg.initialPlacement || null, (iter, hard, soft, bestHard, bestSoft) => {
    self.postMessage({ type: "progress", iter, hard, soft, bestHard, bestSoft });
  });

  self.postMessage({ type: "done", placement: result.placement, hard: result.hard, soft: result.soft });
};
