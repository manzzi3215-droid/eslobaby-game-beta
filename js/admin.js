/* =============================================================================
 * admin.js — 관리자(Admin) 대시보드 (v0.10.21-beta 개편)
 * -----------------------------------------------------------------------------
 * 우측 하단 톱니바퀴 → 비밀번호 로그인 → 대시보드(날짜별 핵심 통계 + 일 마감/다운로드).
 * 일반 사용자에게는 노출되지 않고, 게임 로직/디자인과 분리되어 동작.
 * 데이터는 window.Analytics(LocalStorage) 에서 읽어온다.
 *
 * ▶ 비밀번호: config.admin.password(기본 '0000') 를 fallback 으로,
 *   변경분은 LocalStorage 'eslo_admin_pw_v1' 에만 저장(통계 초기화·일 마감과 무관하게 유지).
 *   ※ 서버 인증이 아닌 클라이언트측 간단 접근 방지 장치일 뿐임.
 * ▶ 일 마감: 스냅샷/마감표시/시각기록 + CSV(UTF-8 BOM) 다운로드. 삭제·초기화가 아님.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.ESLO_CONFIG;
  var ADMIN = (CFG && CFG.admin) || {};
  var PW_KEY = 'eslo_admin_pw_v1';   // 비밀번호 전용 키(통계와 분리)

  // 오류 로그 화면 라벨(가독성용, 선택)
  var SCENE_LABEL = {
    gate: '게이트', missionIntro: 'MISSION', bodywashIntro: '바디워시 소개',
    bodywashUse: 'STEP1 ① 바디워시', bodywashRinse: 'STEP1 ② 샤워', warning: '경고',
    residue: '계면활성제 설명', esloIntro: '이슬로 소개', esloUse: 'STEP2 이슬로',
    esloRinse: 'STEP3 샤워', missionSuccess: 'MISSION 성공', biodegradeInfo: '생분해 설명',
    beforeAfterCompare: 'PAGE 12 선택', brandFinal: '결과(브랜드)', rewardFinal: '완료/증정',
  };

  var GAME_NAME = (CFG && CFG.meta && CFG.meta.title) || '이슬로 베이비 미니게임';

  var gearBtn, overlay;
  var selDate = null;   // 대시보드에서 선택된 날짜(YYYY-MM-DD)

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function div(cls, text) { return el('div', cls, text); }

  function fmtMs(ms) {
    if (!ms) return '–';
    var s = Math.round(ms / 1000);
    if (s < 60) return s + '초';
    var m = Math.floor(s / 60);
    return m + '분 ' + (s % 60) + '초';
  }
  function pct(n) { return Math.round((n || 0) * 100) + '%'; }

  /* ---------- 비밀번호 (config fallback + LocalStorage 오버라이드) ---- */
  function effectivePassword() {
    try { var v = window.localStorage.getItem(PW_KEY); if (v != null && v !== '') return v; } catch (e) {}
    return (ADMIN.password != null) ? String(ADMIN.password) : '0000';
  }
  function isValidPw(v) { return /^\d{4}$/.test(String(v || '')); }   // 4자리 숫자 규칙
  function savePassword(v) {
    try { window.localStorage.setItem(PW_KEY, String(v)); return true; }
    catch (e) { return false; }
  }

  /* ---------- 톱니바퀴 진입 버튼 ---------------------------------- */
  function buildGear() {
    gearBtn = el('button', 'admin-gear');
    gearBtn.setAttribute('aria-label', '설정');
    gearBtn.title = '설정';
    gearBtn.innerHTML =
      '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">' +
      '<path fill="currentColor" d="M19.14 12.94a7.5 7.5 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.3 7.3 0 00-1.62-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54c-.58.24-1.12.56-1.62.94l-2.39-.96a.5.5 0 00-.6.22L2.71 8.84a.5.5 0 00.12.64l2.03 1.58a7.5 7.5 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54c.58-.24 1.12-.56 1.62-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z"/>' +
      '</svg>';
    gearBtn.addEventListener('click', openLogin);
    return gearBtn;
  }

  /* ---------- 오버레이 (로그인 / 대시보드 공용) -------------------- */
  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = div('admin-overlay');
    overlay.style.display = 'none';
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    document.getElementById('app').appendChild(overlay);
    return overlay;
  }

  function openLogin() {
    try { if (window.Game && window.Game.pause) window.Game.pause(); } catch (e) {}
    ensureOverlay();
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var card = div('admin-login');
    card.addEventListener('click', function (e) { e.stopPropagation(); });

    card.appendChild(div('admin-login-title', '관리자 로그인'));
    card.appendChild(div('admin-login-desc', '비밀번호를 입력하세요'));

    var input = el('input', 'admin-input');
    input.type = 'password';
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('maxlength', '8');
    input.placeholder = '비밀번호';

    var err = div('admin-login-err');
    err.style.visibility = 'hidden';
    err.textContent = '비밀번호가 올바르지 않습니다.';

    var btn = el('button', 'admin-btn admin-btn-primary', '입장');
    function tryLogin() {
      if (input.value === effectivePassword()) {
        selDate = null;   // 진입 시 오늘로 초기화
        openDashboard();
      } else {
        err.style.visibility = 'visible';
        input.value = '';
        input.focus();
      }
    }
    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); });

    var cancel = el('button', 'admin-btn admin-btn-ghost', '닫기');
    cancel.addEventListener('click', close);

    var row = div('admin-login-actions');
    row.appendChild(cancel);
    row.appendChild(btn);

    card.appendChild(input);
    card.appendChild(err);
    card.appendChild(row);
    overlay.appendChild(card);
    setTimeout(function () { input.focus(); }, 60);
  }

  function close() {
    if (overlay) { overlay.style.display = 'none'; overlay.innerHTML = ''; }
  }

  /* ---------- 대시보드 조각 -------------------------------------- */
  function statCard(label, value, danger) {
    var c = div('admin-stat' + (danger ? ' is-accent' : ''));
    c.appendChild(div('admin-stat-val', value));
    c.appendChild(div('admin-stat-label', label));
    return c;
  }

  function toast(msg, kind) {
    if (!overlay) return;
    var t = div('admin-toast' + (kind ? ' admin-toast-' + kind : ''), msg);
    overlay.appendChild(t);
    setTimeout(function () { if (t && t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  /* ---------- CSV (UTF-8 BOM) ----------------------------------- */
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function buildCsv(day, totals, updatedAtStr) {
    var rows = [];
    rows.push([GAME_NAME + ' — 통계']);
    rows.push([]);
    rows.push(['[일일 요약]']);
    rows.push(['행사/게임명', GAME_NAME]);
    rows.push(['통계 날짜', day.date]);
    rows.push(['마감 시각', day.closed ? (day.closedAt || '') : '(미마감)']);
    rows.push(['플레이 수', day.plays]);
    rows.push(['완료 수', day.completes]);
    rows.push(['완료율', pct(day.completeRate)]);
    rows.push(['평균 플레이 시간', fmtMs(day.avgPlayMs)]);
    rows.push(['총 플레이 시간', fmtMs(day.totalPlayMs)]);
    rows.push(['PAGE12 정답 수', day.correct]);
    rows.push(['PAGE12 오답 수', day.wrong]);
    rows.push(['오류 수', day.errors]);
    rows.push([]);
    rows.push(['[전체 누적]']);
    rows.push(['전체 플레이 수', totals.plays]);
    rows.push(['전체 완료 수', totals.completes]);
    rows.push(['전체 완료율', pct(totals.completeRate)]);
    rows.push(['전체 평균 플레이 시간', fmtMs(totals.avgPlayMs)]);
    rows.push(['마지막 업데이트 시각', updatedAtStr || '']);
    var body = rows.map(function (r) { return r.map(csvCell).join(','); }).join('\r\n');
    return '﻿' + body;   // UTF-8 BOM → Excel 한글 정상
  }
  function downloadText(filename, text) {
    var blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = el('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { try { URL.revokeObjectURL(url); } catch (e) {} }, 1500);
  }
  function downloadFor(dk, st) {
    var name = 'eslobaby_game_stats_' + dk + '.csv';
    downloadText(name, buildCsv(st.day, st.totals, st.updatedAtStr));
    return name;
  }

  /* ---------- 일 마감 / 초기화 처리 ------------------------------ */
  function doCloseDay(dk) {
    if (!window.confirm(dk + ' 통계를 마감하고 파일로 저장할까요?')) return;
    var res = (window.Analytics && window.Analytics.closeDay(dk)) || { ok: false };
    if (!res.ok) { toast('마감 저장 실패 · 통계는 그대로 유지됩니다', 'danger'); openDashboard(); return; }
    var st = window.Analytics.getStats(dk);   // 마감 반영된 최신 스냅샷
    try {
      downloadFor(dk, st);
      toast('마감 완료 · 파일 저장됨');
    } catch (e) {
      // 데이터는 마감·보존됨 — 파일 생성만 실패
      toast('마감됨 · 파일 다운로드 실패(통계 보존)', 'danger');
    }
    openDashboard();
  }
  function doReDownload(dk) {
    var st = window.Analytics && window.Analytics.getStats(dk);
    if (!st) { toast('다운로드 실패', 'danger'); return; }
    try { downloadFor(dk, st); toast('파일 다시 저장됨'); }
    catch (e) { toast('다운로드 실패(통계 보존)', 'danger'); }
  }
  function doReset() {
    if (!window.confirm('모든 통계를 초기화할까요? 되돌릴 수 없습니다. (비밀번호는 유지됩니다)')) return;
    var ok = window.Analytics && window.Analytics.reset();
    toast(ok ? '통계가 초기화되었습니다' : '초기화 저장 실패', ok ? '' : 'danger');
    selDate = null;
    openDashboard();
  }

  /* ---------- 비밀번호 변경 폼 ----------------------------------- */
  function buildPasswordForm() {
    var wrap = div('admin-pwform');
    var mkInput = function (ph) {
      var i = el('input', 'admin-input admin-input-sm');
      i.type = 'password'; i.setAttribute('inputmode', 'numeric');
      i.setAttribute('autocomplete', 'off'); i.setAttribute('maxlength', '4');
      i.placeholder = ph;
      return i;
    };
    var cur = mkInput('현재 비밀번호');
    var nw = mkInput('새 비밀번호(숫자 4자리)');
    var cf = mkInput('새 비밀번호 확인');
    var msg = div('admin-pwmsg');
    var btn = el('button', 'admin-btn admin-btn-primary admin-btn-sm', '비밀번호 변경');

    function fail(t) { msg.className = 'admin-pwmsg is-err'; msg.textContent = t; }
    function ok(t) { msg.className = 'admin-pwmsg is-ok'; msg.textContent = t; }

    btn.addEventListener('click', function () {
      if (cur.value !== effectivePassword()) { fail('현재 비밀번호가 일치하지 않습니다.'); cur.focus(); return; }
      if (!nw.value || !cf.value) { fail('새 비밀번호를 입력하세요.'); return; }
      if (!isValidPw(nw.value)) { fail('새 비밀번호는 숫자 4자리여야 합니다.'); nw.focus(); return; }
      if (nw.value !== cf.value) { fail('새 비밀번호가 서로 일치하지 않습니다.'); cf.focus(); return; }
      if (savePassword(nw.value)) {
        ok('비밀번호가 변경되었습니다.');
        cur.value = nw.value = cf.value = '';
      } else {
        fail('저장에 실패했습니다(브라우저 저장 불가).');
      }
    });

    wrap.appendChild(cur);
    wrap.appendChild(nw);
    wrap.appendChild(cf);
    wrap.appendChild(btn);
    wrap.appendChild(msg);
    return wrap;
  }

  /* ---------- 접이식 섹션 --------------------------------------- */
  function collapsible(titleText, open) {
    var wrap = div('admin-collapse' + (open ? ' is-open' : ''));
    var head = el('button', 'admin-collapse-head');
    head.appendChild(el('span', 'admin-collapse-title', titleText));
    var caret = el('span', 'admin-collapse-caret', '▾');
    head.appendChild(caret);
    var bodyEl = div('admin-collapse-body');
    head.addEventListener('click', function () { wrap.classList.toggle('is-open'); });
    wrap.appendChild(head);
    wrap.appendChild(bodyEl);
    wrap._body = bodyEl;
    wrap._head = head;
    return wrap;
  }

  /* ---------- 대시보드 ------------------------------------------- */
  function openDashboard(dateKey) {
    ensureOverlay();
    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    var A = window.Analytics;
    var today = (A && A.todayKey && A.todayKey()) || '';
    if (dateKey) selDate = dateKey;
    if (!selDate) selDate = today;

    var st = (A && A.getStats(selDate)) || null;

    var panel = div('admin-panel');
    panel.addEventListener('click', function (e) { e.stopPropagation(); });

    // 헤더
    var header = div('admin-header');
    header.appendChild(div('admin-title', ADMIN.title || '관리자 대시보드'));
    var closeBtn = el('button', 'admin-close', '✕');
    closeBtn.setAttribute('aria-label', '닫기');
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    var body = div('admin-body');

    if (!st) {
      body.appendChild(div('admin-empty', '통계를 불러올 수 없습니다.'));
    } else {
      // 저장 실패 경고
      if (st.saveOk === false) {
        body.appendChild(div('admin-warn', '⚠ 통계 저장에 실패했습니다(브라우저 저장 불가). 데이터가 유지되지 않을 수 있습니다.'));
      }

      // (A) 날짜 선택
      var dateNav = div('admin-datenav');
      var prev = el('button', 'admin-date-btn', '‹');
      prev.setAttribute('aria-label', '이전 날짜');
      var input = el('input', 'admin-date-input');
      input.type = 'date'; input.value = selDate; if (today) input.max = today;
      var next = el('button', 'admin-date-btn', '›');
      next.setAttribute('aria-label', '다음 날짜');
      prev.addEventListener('click', function () { openDashboard(A.shiftDate(selDate, -1)); });
      next.addEventListener('click', function () { openDashboard(A.shiftDate(selDate, +1)); });
      input.addEventListener('change', function () { if (input.value) openDashboard(input.value); });
      dateNav.appendChild(prev);
      dateNav.appendChild(input);
      dateNav.appendChild(next);
      body.appendChild(dateNav);

      // 상태 배지 (마감/추가데이터/오늘)
      var d = st.day;
      var badges = div('admin-badges');
      if (selDate === today) badges.appendChild(el('span', 'admin-badge admin-badge-today', '오늘'));
      if (d.closed && d.hasPostCloseData) {
        badges.appendChild(el('span', 'admin-badge admin-badge-warn', '마감 후 추가 데이터 있음'));
      } else if (d.closed) {
        badges.appendChild(el('span', 'admin-badge admin-badge-done', '마감 완료 · ' + (d.closedAt || '')));
      }
      if (badges.childNodes.length) body.appendChild(badges);

      // (B) 핵심 통계 4종
      if (!d.exists) {
        body.appendChild(div('admin-empty', '수집된 데이터가 없습니다.'));
      }
      var grid = div('admin-stats-grid admin-stats-core');
      grid.appendChild(statCard('플레이 수', String(d.plays)));
      grid.appendChild(statCard('완료 수', String(d.completes)));
      grid.appendChild(statCard('완료율', pct(d.completeRate)));
      grid.appendChild(statCard('평균 플레이 시간', fmtMs(d.avgPlayMs)));
      body.appendChild(grid);

      // (C) 전체 누적 (작게)
      var tot = st.totals;
      var totRow = div('admin-totals');
      totRow.appendChild(div('admin-totals-item', '전체 누적 플레이 ' + tot.plays));
      totRow.appendChild(div('admin-totals-item', '전체 누적 완료 ' + tot.completes));
      body.appendChild(totRow);
      if (st.legacy && (st.legacy.completes || st.legacy.plays)) {
        body.appendChild(div('admin-legacy',
          '이전 누적(날짜 미상): 완료 ' + (st.legacy.completes || 0) + '건 포함'));
      }

      // (D) 오류 로그 — 접이식(없으면 한 줄 상태)
      var errs = st.errors || [];
      if (!errs.length) {
        body.appendChild(div('admin-errstatus', '최근 오류 없음 ✓'));
      } else {
        var ec = collapsible('최근 오류 로그 (' + errs.length + ')', false);
        errs.slice(0, 10).forEach(function (er) {
          var item = div('admin-err');
          item.appendChild(div('admin-err-top', (er.t || '') + ' · ' + (SCENE_LABEL[er.screen] || er.screen || '-')));
          item.appendChild(div('admin-err-msg', er.msg));
          item.appendChild(div('admin-err-ua', er.ua || ''));
          ec._body.appendChild(item);
        });
        body.appendChild(ec);
      }

      // (E) 설정(비밀번호 변경) — 접이식
      var pc = collapsible('설정 · 비밀번호 변경', false);
      pc._body.appendChild(buildPasswordForm());
      pc._body.appendChild(div('admin-pwnote',
        '※ 이 비밀번호는 서버 인증이 아닌 간단한 접근 방지 장치입니다. 통계 초기화·일 마감을 해도 유지됩니다.'));
      body.appendChild(pc);
    }

    panel.appendChild(body);

    // 푸터: 마감(주 실행) / 재다운로드 / 초기화(위험, 분리)
    var footer = div('admin-footer');
    footer.appendChild(div('admin-foot-info',
      '저장: ' + (st ? st.storage : '–') + ' · ' + (CFG.meta ? CFG.meta.version : '')));

    var actions = div('admin-foot-actions');
    if (st) {
      var closeDayBtn = el('button', 'admin-btn admin-btn-primary admin-btn-sm',
        (st.day.closed && st.day.hasPostCloseData) ? (selDate + ' 다시 마감') : (selDate + ' 마감'));
      closeDayBtn.addEventListener('click', function () { doCloseDay(selDate); });
      actions.appendChild(closeDayBtn);

      if (st.day.closed) {
        var dl = el('button', 'admin-btn admin-btn-ghost admin-btn-sm', '다시 다운로드');
        dl.addEventListener('click', function () { doReDownload(selDate); });
        actions.appendChild(dl);
      }
    }
    footer.appendChild(actions);

    // 위험 영역(초기화) — 시각적으로 분리
    var danger = div('admin-foot-danger');
    var resetBtn = el('button', 'admin-btn admin-btn-danger admin-btn-sm', '통계 초기화');
    resetBtn.addEventListener('click', doReset);
    danger.appendChild(resetBtn);
    footer.appendChild(danger);

    panel.appendChild(footer);
    overlay.appendChild(panel);
  }

  /* ---------- 초기화 -------------------------------------------- */
  function init() {
    if (ADMIN.gearEnabled === false) return;
    var app = document.getElementById('app');
    if (!app) return;
    app.appendChild(buildGear());
    ensureOverlay();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }

  window.Admin = { open: openLogin, close: close };
})();
