/* =============================================================================
 * analytics.js — 플레이 통계 수집 (v0.10.21-beta 개편: 한국시간 날짜별 집계)
 * -----------------------------------------------------------------------------
 * - 저장소는 LocalStorage 단일 키 'eslo_admin_v1'. 오프라인 전용(서버·Firebase 없음).
 * - 게임 로직에는 영향을 주지 않으며, 실패해도 게임이 멈추지 않도록 전부 try/catch.
 *
 * ▶ 날짜별 집계 (v2 구조)
 *   - 날짜 키는 Asia/Seoul(한국시간) 기준 'YYYY-MM-DD' (브라우저 UTC/로컬 TZ 영향 배제).
 *   - 완료는 "게임 시작 날짜" 기준으로 집계 → 자정 전 시작·자정 후 완료해도 시작일에 묶임.
 *   - byDate[날짜] = { plays, completes, completeTimeMs, correct, wrong, errors,
 *                      updatedAt, closed, closedAt, closedAtMs }
 *   - totals = 전체 누적(기존 v1 값과 연속). legacy = v1 의 날짜 미상 완료/시간(별도 보존).
 *
 * ▶ v1 → v2 마이그레이션(1회): 기존 playsByDate(날짜 아는 '시작수')만 byDate 로 이관,
 *   날짜를 알 수 없는 completes/completeTimeMs 는 legacy 로 보존(특정 날짜에 임의 합산 금지).
 * ========================================================================== */
(function () {
  'use strict';

  var KEY = 'eslo_admin_v1';   // 통계(기존 키 재사용 — 마이그레이션 대상)
  var MAX_ERRORS = 30;
  var SCHEMA = 2;

  var session = null;          // 진행 중 플레이 세션(메모리)
  var lastSceneId = 'gate';
  var lastSaveOk = true;

  function now() { return Date.now(); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }

  // 한국시간(Asia/Seoul) 'YYYY-MM-DD'
  function dateKeyKST(ms) {
    var t = (ms == null) ? now() : ms;
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(t));
    } catch (e) {
      var k = new Date(t + 9 * 3600 * 1000);   // UTC+9 폴백
      return k.getUTCFullYear() + '-' + p2(k.getUTCMonth() + 1) + '-' + p2(k.getUTCDate());
    }
  }
  function todayKey() { return dateKeyKST(now()); }

  // 한국시간 'YYYY-MM-DD HH:mm' (표시용)
  function nowKstStr(ms) {
    var t = (ms == null) ? now() : ms;
    try {
      var parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false,
      }).formatToParts(new Date(t));
      var m = {};
      parts.forEach(function (p) { m[p.type] = p.value; });
      return m.year + '-' + m.month + '-' + m.day + ' ' + m.hour + ':' + m.minute;
    } catch (e) {
      var k = new Date(t + 9 * 3600 * 1000);
      return k.getUTCFullYear() + '-' + p2(k.getUTCMonth() + 1) + '-' + p2(k.getUTCDate()) +
             ' ' + p2(k.getUTCHours()) + ':' + p2(k.getUTCMinutes());
    }
  }

  // 날짜 문자열 ±delta (UTC 정오 기준으로 계산해 TZ/DST 경계 안전)
  function shiftDate(dk, delta) {
    var a = String(dk).split('-');
    var dt = new Date(Date.UTC(+a[0], (+a[1] || 1) - 1, +a[2] || 1, 12, 0, 0));
    dt.setUTCDate(dt.getUTCDate() + (delta | 0));
    return dt.getUTCFullYear() + '-' + p2(dt.getUTCMonth() + 1) + '-' + p2(dt.getUTCDate());
  }

  function newDay(dateKey) {
    return {
      date: dateKey, plays: 0, completes: 0, completeTimeMs: 0,
      correct: 0, wrong: 0, errors: 0,
      updatedAt: 0, closed: false, closedAt: null, closedAtMs: 0,
    };
  }
  function defaults() {
    return {
      schema: SCHEMA,
      byDate: {},
      totals: { plays: 0, completes: 0, completeTimeMs: 0 },
      legacy: null,
      errors: [],
      migratedV2: false,
      updatedAt: 0,
    };
  }

  var data = defaults();

  function detectDevice() {
    var ua = navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'iPhone';
    if (/Android/i.test(ua)) return 'Android';
    return '기타';
  }

  function isLegacyV1(o) {
    // v1 구조: byDate 없음 + (totalPlays|playsByDate|funnel) 존재
    return o && typeof o === 'object' && !o.byDate &&
           (('totalPlays' in o) || ('playsByDate' in o) || ('funnel' in o));
  }

  function migrateFromV1(o) {
    var d = defaults();
    d.migratedV2 = true;

    var pbd = (o && o.playsByDate) || {};
    var sumPlays = 0;
    for (var k in pbd) if (pbd.hasOwnProperty(k)) {
      var n = pbd[k] | 0; sumPlays += n;
      var day = newDay(k);
      day.plays = n;                 // 날짜 아는 '플레이 시작'만 이관(완료는 미상)
      day.updatedAt = o.updatedAt || 0;
      d.byDate[k] = day;
    }
    var oldPlays = (o && o.totalPlays) | 0;
    var oldComp = (o && o.completes) | 0;
    var oldTime = (o && o.completeTimeMs) | 0;

    // 전체 누적은 기존 값과 연속(완료/시간 포함)
    d.totals.plays = oldPlays || sumPlays;
    d.totals.completes = oldComp;
    d.totals.completeTimeMs = oldTime;

    // 날짜 미상분은 별도 보존(특정 날짜에 합산하지 않음)
    d.legacy = {
      note: 'v1 이전 누적 (완료·시간은 날짜 미상 — 특정 날짜에 합산하지 않음)',
      plays: Math.max(0, oldPlays - sumPlays),
      completes: oldComp,
      completeTimeMs: oldTime,
      funnel: (o && o.funnel) || null,
      devices: (o && o.devices) || null,
      migratedAt: nowKstStr(now()),
    };
    d.errors = (o && Array.isArray(o.errors)) ? o.errors.slice(0, MAX_ERRORS) : [];
    return d;
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) { data = defaults(); return; }
      var parsed = JSON.parse(raw);
      if (isLegacyV1(parsed)) {
        data = migrateFromV1(parsed);
        save();                       // 마이그레이션 결과 1회 저장(이후 재마이그레이션 안 됨)
      } else {
        // v2(또는 이후) 구조 — 기본 구조와 병합(누락 필드 방어)
        var d = defaults();
        for (var kk in parsed) if (parsed.hasOwnProperty(kk)) d[kk] = parsed[kk];
        if (!d.byDate || typeof d.byDate !== 'object') d.byDate = {};
        d.totals = Object.assign({ plays: 0, completes: 0, completeTimeMs: 0 }, d.totals || {});
        if (!Array.isArray(d.errors)) d.errors = [];
        data = d;
      }
    } catch (e) { data = defaults(); }   // 손상 데이터여도 게임/대시보드 정상 동작
  }

  function save() {
    data.updatedAt = now();
    try { window.localStorage.setItem(KEY, JSON.stringify(data)); lastSaveOk = true; }
    catch (e) { lastSaveOk = false; }
    return lastSaveOk;
  }

  function dayOf(dateKey) {
    if (!data.byDate[dateKey]) data.byDate[dateKey] = newDay(dateKey);
    return data.byDate[dateKey];
  }

  /* ---------- 세션 훅 (game.js 에서 호출) ---------------------------- */
  function startSession() {
    endSession();
    var t = now();
    var dk = dateKeyKST(t);
    session = { start: t, dateKey: dk, completed: false };
    var day = dayOf(dk);
    day.plays += 1; day.updatedAt = t;
    data.totals.plays += 1;
    save();
  }

  function enterScene(sceneId, phase) {
    lastSceneId = sceneId;
    if (!session) return;
    if (sceneId === 'missionSuccess' && !session.completed) {
      session.completed = true;
      var t = now();
      var day = dayOf(session.dateKey);        // 시작 날짜 기준(자정 넘겨도 시작일 집계)
      var elapsed = Math.max(0, t - session.start);
      day.completes += 1;
      day.completeTimeMs += elapsed;
      day.updatedAt = t;
      data.totals.completes += 1;
      data.totals.completeTimeMs += elapsed;
      save();
    }
  }

  // PAGE 12 정답/오답 기록(향후 분석용 — 대시보드 기본 노출 없음). 게임 로직과 독립.
  function recordAnswer(isCorrect) {
    try {
      var dk = session ? session.dateKey : todayKey();
      var day = dayOf(dk);
      if (isCorrect) day.correct += 1; else day.wrong += 1;
      day.updatedAt = now();
      save();
    } catch (e) {}
  }

  function endSession() {
    if (!session) return;
    session = null;
  }

  function logError(msg) {
    try {
      data.errors.unshift({
        t: nowKstStr(now()),
        screen: lastSceneId,
        msg: String(msg || '알 수 없는 오류').slice(0, 300),
        ua: detectDevice() + ' · ' + (navigator.userAgent || '').slice(0, 90),
      });
      if (data.errors.length > MAX_ERRORS) data.errors.length = MAX_ERRORS;
      var day = dayOf(todayKey()); day.errors += 1; day.updatedAt = now();
      save();
    } catch (e) {}
  }

  /* ---------- 조회 (admin.js 에서 사용) ----------------------------- */
  function storageMode() {
    try { window.localStorage.setItem('__t', '1'); window.localStorage.removeItem('__t'); return 'LocalStorage'; }
    catch (e) { return '메모리(저장 불가)'; }
  }

  function statsForDate(dk) {
    var day = data.byDate[dk] || null;
    var plays = day ? day.plays : 0;
    var comp = day ? day.completes : 0;
    var hasData = !!(day && (day.plays || day.completes || day.correct || day.wrong || day.errors || day.closed));
    return {
      date: dk, exists: hasData,
      plays: plays, completes: comp,
      completeRate: plays ? comp / plays : 0,
      avgPlayMs: comp ? Math.round(day.completeTimeMs / comp) : 0,
      totalPlayMs: day ? day.completeTimeMs : 0,
      correct: day ? day.correct : 0,
      wrong: day ? day.wrong : 0,
      errors: day ? day.errors : 0,
      closed: day ? !!day.closed : false,
      closedAt: day ? day.closedAt : null,
      updatedAt: day ? day.updatedAt : 0,
      // 마감 후 추가 데이터 발생 여부(updatedAt 이 마감시각보다 나중)
      hasPostCloseData: !!(day && day.closed && day.closedAtMs && day.updatedAt > day.closedAtMs),
    };
  }

  function getStats(dateKey) {
    try {
      var dk = dateKey || todayKey();
      var t = data.totals || { plays: 0, completes: 0, completeTimeMs: 0 };
      return JSON.parse(JSON.stringify({
        day: statsForDate(dk),
        totals: {
          plays: t.plays, completes: t.completes,
          completeRate: t.plays ? t.completes / t.plays : 0,
          avgPlayMs: t.completes ? Math.round(t.completeTimeMs / t.completes) : 0,
        },
        legacy: data.legacy || null,
        errors: data.errors || [],
        storage: storageMode(),
        saveOk: lastSaveOk,
        version: (window.ESLO_CONFIG && ESLO_CONFIG.meta && ESLO_CONFIG.meta.version) || '',
        today: todayKey(),
        updatedAtStr: data.updatedAt ? nowKstStr(data.updatedAt) : '–',
      }));
    } catch (e) { return null; }
  }

  /* ---------- 일 마감 / 초기화 -------------------------------------- */
  // 마감: 스냅샷/마감표시/시각기록(삭제·초기화 아님). 여러 번 눌러도 중복 합산 없음(플래그만).
  function closeDay(dateKey) {
    try {
      var dk = dateKey || todayKey();
      var day = dayOf(dk);
      var t = now();
      day.closed = true;
      day.closedAtMs = t;
      day.closedAt = nowKstStr(t);
      day.updatedAt = t;               // closedAtMs 와 동일 → hasPostCloseData=false (이후 플레이 시 true)
      var ok = save();
      return { ok: ok, snapshot: statsForDate(dk) };
    } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
  }

  function reset() {
    // 통계만 초기화 (비밀번호는 별도 키라 영향 없음)
    data = defaults();
    data.migratedV2 = true;            // 초기화 후 재마이그레이션 방지
    return save();
  }

  /* ---------- 초기화(오류 캡처) ------------------------------------- */
  function init() {
    load();
    try {
      window.addEventListener('error', function (e) {
        logError((e && e.message) ? e.message : 'error');
      });
      window.addEventListener('unhandledrejection', function (e) {
        var r = e && e.reason;
        logError('Promise: ' + ((r && r.message) ? r.message : r));
      });
    } catch (e) {}
  }
  init();

  window.Analytics = {
    startSession: startSession,
    enterScene: enterScene,
    endSession: endSession,
    recordAnswer: recordAnswer,
    logError: logError,
    getStats: getStats,
    closeDay: closeDay,
    reset: reset,
    todayKey: todayKey,
    shiftDate: shiftDate,
  };
})();
