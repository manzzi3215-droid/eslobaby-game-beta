/* =============================================================================
 * game.js — 게임 엔진 (장면 전환 · 상태 관리 · 각 타입별 렌더링)
 * -----------------------------------------------------------------------------
 * UI 로직의 중심. 장면 "데이터"(scenes.js)와 "인터랙션"(interactions.js),
 * "컴포넌트"(components.js)를 조합해 실제 화면(카드형)을 만든다.
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.ESLO_CONFIG;
  var SCENES = window.ESLO_SCENES;
  var C = window.Components;

  var TOTAL_STEPS = SCENES.length + 1;   // 게이트(STEP 1) 포함

  var app;
  var brandLogo, bottomHint;                     // 항상 떠있는 요소들
  var controlPanel, playBtn, pauseBtn, prevBtn, nextBtn;  // 좌측 컨트롤 (처음으로/플레이/이전/정지/다음)
  var currentScreen = null;
  var timers = [];
  var cleanups = [];
  var index = 0;
  var busy = false;
  var paused = false;                    // 정지(⏸): v0.8.x — 현재 화면의 영상·CSS 애니메이션 일시정지 (페이지 이동과 무관)
  var videoGateLocked = false;           // v0.9.3: 필수 시청 영상(Page6·Page11)이 끝나기 전엔 다음 이동 잠금
  var autoNextScheduled = false;         // v0.9.4: 완료 이벤트 기반 자동 전환 — 장면당 1회 가드

  // 장면 간 유지되는 게임 상태 (자극 게이지 값 등)
  var state = { irritation: 0 };

  /* ---------- 유틸 ---------------------------------------------------- */
  function div(cls) { var d = document.createElement('div'); if (cls) d.className = cls; return d; }
  function setTimer(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
  function clearScene() {
    timers.forEach(clearTimeout); timers = [];
    cleanups.forEach(function (f) { try { f(); } catch (_) {} }); cleanups = [];
  }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  // v0.4.3: 효과음 재생 (SFX 모듈 없거나 실패해도 게임에 영향 없음)
  function sfx(name) { try { if (window.SFX) window.SFX.play(name); } catch (_) {} }

  function lerpColor(a, b, t) {
    function rgb(h) {
      h = h.replace('#', '');
      return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    var A = rgb(a), B = rgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' +
                    Math.round(A[1] + (B[1] - A[1]) * t) + ',' +
                    Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  // 게이지 값(0~1) → 여러 색 구간 보간 (빨강↔파랑)
  function gaugeColor(ratio) {
    var s = CFG.gauge.colorStops;
    ratio = clamp01(ratio);
    var seg = ratio * (s.length - 1);
    var i = Math.min(s.length - 2, Math.floor(seg));
    return lerpColor(s[i], s[i + 1], seg - i);
  }

  // 화면 전환(더블 버퍼 페이드)
  function showScreen(buildFn) {
    var prev = currentScreen;
    var el = div('screen');
    buildFn(el);
    app.appendChild(el);
    void el.offsetWidth;
    el.classList.add('is-active');
    currentScreen = el;
    busy = true;
    setTimeout(function () { busy = false; }, 460);
    if (prev) {
      // v0.2.8: 다음 장면은 오른쪽에서 들어오고, 이전 장면은 왼쪽으로 밀려나며 사라짐
      prev.classList.remove('is-active');
      prev.classList.add('is-leaving');
      setTimeout(function () { prev.remove(); }, 450);
    }
  }

  /* ---------- 진행 표시 (v0.2.7: 하단 페이지 인디케이터, 카드뉴스형) -----
   * v0.2.5까지는 상단에 큰 라벨(MISSION/STEP1..)을 나열했으나,
   * v0.2.7부터 하단 중앙의 작고 깔끔한 원형 인디케이터로 변경.
   *   - 현재 페이지: 진한 파랑 + 라벨(작게) 표시
   *   - 나머지 페이지: 연한 파랑 점
   *   - 클릭 시 해당 구간 첫 장면으로 이동 (stepNavigationEnabled 잠금 유지)
   * (라벨 텍스트는 config.texts.phases 로 관리 — 그대로 유지)
   * ------------------------------------------------------------------- */
  var PHASES = CFG.texts.phases;

  // v0.3.0 — STEP별 컬러 테마 (game.js 가 .screen 에 theme-* 클래스 부여).
  // Scene 구조/문구는 건드리지 않고, 장면 id 로 분위기 색만 매핑 (시각 전용).
  var SCENE_THEME = {
    missionIntro:   'mint',
    bodywashIntro:  'blue',
    bodywashUse:    'blue',
    bodywashRinse:  'blue',
    warning:        'red',
    residue:        'red',
    esloIntro:      'mint',
    esloUse:        'sky',
    esloRinse:      'orange',
    missionSuccess: 'success',
    biodegradeInfo: 'brand',
    beforeAfterCompare: 'brand',
    brandFinal:     'brand',
  };

  // 각 phase 가 시작되는 장면 index (클릭 이동용)
  function firstSceneOfPhase(p) {
    for (var i = 0; i < SCENES.length; i++) {
      if (SCENES[i].phase === p) return i;
    }
    return 0;
  }

  // 카드 하단 페이지 인디케이터(작은 원형 점)를 만들어 반환 (v0.2.8: 카드 안쪽)
  //   현재 페이지: 진한 파랑 / 나머지: 연한 파랑. 클릭 시 해당 구간 첫 장면 이동.
  function buildPageDots(phase) {
    var wrap = div('page-dots-in');
    var navOn = CFG.options.stepNavigationEnabled;
    for (var i = 0; i < PHASES.length; i++) {
      var cls = 'pdot' + (i === phase ? ' is-current' : '');
      var n;
      if (navOn) {
        n = document.createElement('button');
        n.className = cls + ' is-clickable';
        n.addEventListener('click', (function (target) {
          return function (e) {
            e.stopPropagation();          // 탭-진행(tapAdvance)과 충돌 방지
            goToStep(firstSceneOfPhase(target) + 2);
          };
        })(i));
      } else {
        n = div(cls);
      }
      n.title = PHASES[i];                // 툴팁으로 라벨 안내
      wrap.appendChild(n);
    }
    return wrap;
  }

  // 장면별 상단 배지 라벨 계산 (v0.2.8)
  //   실제 체험 단계 → STEP1~3 / MISSION 인트로 → MISSION / 성공 → MISSION 성공!
  //   그 외(설명·최종 브랜드)는 배지 없음
  function badgeLabel(opts) {
    if (opts.step != null) return CFG.texts.step + opts.step;
    if (opts.type === 'missionIntro') return PHASES[0];
    // v0.9.3: Page10(missionSuccess) 파란 배지 삭제 — 아래 success-title/desc 와 중복이라 제거
    return null;
  }

  // el 에 카드뉴스형 카드(상단 처음으로+배지 헤더 + 제목 + 본문 + 하단 점) 구성
  //   opts.phase : 진행 표시 위치 (null 이면 헤더·점 숨김 — 게이트)
  //   opts.step  : 실제 체험 단계 번호 (1~3)
  //   titleMod   : 'warn' 등 제목 스타일 변형 (선택)
  function shell(el, opts, title, buildBody, titleMod) {
    opts = opts || {};

    // v0.3.0 — STEP별 컬러 테마 클래스를 화면(screen)에 부여 (게이트는 기본 blue)
    el.classList.add('theme-' + (SCENE_THEME[opts.id] || 'blue'));

    var card = div('scene-card');

    // 카드 상단 헤더: 중앙 STEP/MISSION 배지 (게이트에는 헤더 없음)
    // v0.3.1: 카드 내부 "처음으로" 미니 버튼 삭제 — 좌측 고정 컨트롤의 처음으로로 일원화.
    if (opts.phase != null) {
      var badge = badgeLabel(opts);
      if (badge) {
        var header = div('card-header');
        var bd = div('card-badge');
        bd.textContent = badge;
        header.appendChild(bd);
        card.appendChild(header);
      }
    }

    if (title) {
      var t = div('card-title' + (titleMod ? ' is-' + titleMod : ''));
      t.textContent = title;
      card.appendChild(t);
    }
    var body = div('screen-body');
    buildBody(body);
    card.appendChild(body);

    // 카드 하단 페이지 인디케이터 + 페이지 번호 (게이트 제외)
    if (opts.phase != null) {
      card.appendChild(buildPageDots(opts.phase));
      // v0.3.3: 화면 하단 작은 페이지 번호 (예: "Page 1 / 10") — 모든 장면 동일 위치
      var pageNum = div('page-num');
      pageNum.textContent = CFG.texts.page + ' ' + (index + 1) + ' / ' + SCENES.length;
      card.appendChild(pageNum);
    }

    // v0.10.0: 로고를 카드 바로 위에 붙이기 위해 카드를 wrapper로 감싸고 로고를 wrapper 안으로 이동.
    //   세로: wrapper가 카드를 세로 중앙 배치, 로고는 카드 상단 위 absolute(간격 일정). 가로/데스크톱: .scene-wrap{display:contents} 로 무영향.
    var wrap = div('scene-wrap');
    if (brandLogo) wrap.appendChild(brandLogo);   // 항상 떠있는 단일 로고 요소를 현재 화면 wrapper로 relocate
    wrap.appendChild(card);
    el.appendChild(wrap);
  }

  /* ---------- 게이트: 카카오 채널 추가 -------------------------------- */
  function renderGate() {
    clearScene();
    if (window.Analytics) window.Analytics.endSession();   // v0.4.0: 진행 중 세션 종료
    index = 0;
    state.irritation = 0;
    paused = false;            // 게이트 복귀 시 정지 상태 초기화
    updateCtrlButtons();
    toggleChrome(false);
    showScreen(function (el) {
      // v0.2.5: STEP 배지·진행 표시 없이 게이트 문구(gate-title) + QR + 버튼만 구성
      // (안내문(gate.desc)은 config 에 보존 — 표시만 제외)
      shell(el, {}, '', function (body) {
        var title = div('gate-title');
        title.textContent = CFG.texts.gate.title;

        // v0.9.8: QR 이미지 삭제. 카카오 채널 이동 버튼(새 탭) 추가 + 기존 완료(스타트) 버튼 유지.
        var joinBtn = C.createButton(CFG.texts.gate.joinButton, function () {
          window.open(CFG.texts.gate.joinUrl, '_blank', 'noopener');
        });
        joinBtn.classList.add('btn-kakao');

        var btn = C.createButton(CFG.texts.gate.button, startGame);

        body.appendChild(title);
        body.appendChild(joinBtn);
        body.appendChild(btn);
      });
    });
  }

  /* ---------- 진행 제어 --------------------------------------------- */
  function startGame() {
    index = 0; state.irritation = 0; paused = false;
    if (window.Analytics) window.Analytics.startSession();   // v0.4.0: 플레이 세션 시작
    renderScene();
  }
  function goHome() { clearScene(); renderGate(); }

  // ---- 공통 페이지 이동 (v0.8.x) — 탭 / 다음 / 이전 모두 이 두 함수만 사용 ----
  //   clearScene(타이머·영상·cleanup 정리) → index 변경 → 게이지 보정 → renderScene(버튼/페이지 갱신).
  //   자동 전환은 없다. 사용자가 탭 또는 다음/이전을 눌러야만 이동.
  function goNext() {
    if (busy) return;
    if (videoGateLocked) return;                 // v0.9.3: 필수 시청 영상이 끝나기 전엔 이동 금지(탭·다음 공통)
    if (index >= SCENES.length - 1) return;      // 마지막 장면: 이동 없음
    clearScene();
    index++;
    state.irritation = irritationForIndex(index); // 건너뛴 게이지 값을 목표값으로 보정
    renderScene();
  }
  function goPrev() {
    if (busy) return;
    if (index <= 0) return;                       // PAGE 1: 이전 없음(비활성)
    clearScene();
    index--;
    state.irritation = irritationForIndex(index); // 되돌아간 장면 진입 시점 게이지로 보정
    renderScene();
  }

  // v0.9.4: 완료 이벤트 기반 자동 전환 (지정 6개 장면만: scene.autoNext). 전역/단순 타이머 전환 아님.
  //   - 실제 완료 콜백(드래그 onComplete / 영상 ended)에서만 예약.
  //   - setTimer 로 예약 → clearScene(모든 네비게이션 진입점: 다음/이전/처음으로/goToStep/renderScene) 시 자동 취소.
  //   - autoNextScheduled 로 장면당 1회 보장(중복 이벤트로 2페이지 이상 건너뜀 방지).
  //   - 발화 시 여전히 같은 장면인지 + busy/영상잠금 아님을 재확인(수동 이동과 경쟁 방지).
  var AUTO_NEXT_DELAY = 450;             // 완료 후 짧은 여운(ms)
  function scheduleAutoNext(fromIndex) {
    if (autoNextScheduled) return;
    if (index !== fromIndex) return;
    autoNextScheduled = true;
    setTimer(function () {
      if (index !== fromIndex) return;            // 이미 이탈(수동 이동/이전/처음으로/goToStep)
      if (busy || videoGateLocked) return;        // 전환 중이거나 영상 잠김이면 스킵
      goNext();
    }, AUTO_NEXT_DELAY);
  }

  // ⏸ 정지 / ▶ 플레이 (v0.8.x): 현재 화면의 영상·CSS 애니메이션만 일시정지/재개. 페이지 이동과 무관.
  function applyPauseState() {
    var scr = currentScreen;
    if (!scr) return;
    scr.classList.toggle('is-anim-paused', paused);      // CSS: 장면 애니메이션 일시정지
    var v = scr.querySelector('video');
    if (v) {
      if (paused) { v.pause(); }
      else { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    }
  }
  function pauseGame() { paused = true; applyPauseState(); updateCtrlButtons(); }
  function playGame() { paused = false; applyPauseState(); updateCtrlButtons(); }

  function updateCtrlButtons() {
    if (playBtn) playBtn.classList.toggle('is-active', !paused);
    if (pauseBtn) pauseBtn.classList.toggle('is-active', paused);
    // 이전: PAGE 1(index 0)에서 비활성 / 다음: 마지막 장면에서 비활성
    if (prevBtn) {
      var atFirst = index <= 0;
      prevBtn.disabled = atFirst;
      prevBtn.classList.toggle('is-disabled', atFirst);
      prevBtn.setAttribute('aria-disabled', atFirst ? 'true' : 'false');
    }
    if (nextBtn) {
      // v0.9.3: 마지막 장면 또는 필수 시청 영상 재생 중이면 다음 버튼 비활성
      var lockNext = (index >= SCENES.length - 1) || videoGateLocked;
      nextBtn.disabled = lockNext;
      nextBtn.classList.toggle('is-disabled', lockNext);
      nextBtn.setAttribute('aria-disabled', lockNext ? 'true' : 'false');
    }
  }

  // 대상 장면 시작 시점의 게이지 값을 계산
  // (각 게이지 장면의 목표값(gaugeTo)을 순서대로 반영: rise 이후=100%,
  //  STEP2 이후=50%, STEP3 이후=0%)
  function irritationForIndex(target) {
    var irr = 0;
    for (var i = 0; i < target; i++) {
      var sc = SCENES[i];
      if (sc.gauge === 'rise') irr = (sc.gaugeTo != null ? sc.gaugeTo : 1);
      else if (sc.gauge === 'fall') irr = (sc.gaugeTo != null ? sc.gaugeTo : 0);
    }
    return irr;
  }

  // 장면 이동 (테스트/시연용, config.options.stepNavigationEnabled)
  // step: 1=게이트, 2~=장면 순서 (내부 Scene 번호 — 사용자 표시 STEP1~3과 별개)
  function goToStep(step) {
    if (videoGateLocked) return;         // v0.9.3: 필수 시청 영상 재생 중엔 페이지점 점프도 금지(끝까지 시청 강제)
    clearScene();
    if (step <= 1) { renderGate(); return; }
    index = Math.min(step - 2, SCENES.length - 1);
    state.irritation = irritationForIndex(index);
    renderScene();
  }

  function renderScene() {
    clearScene();
    toggleChrome(true);
    videoGateLocked = false;             // v0.9.3: 장면 진입 시 영상 잠금 초기화(영상 렌더러가 필요 시 다시 잠금)
    autoNextScheduled = false;           // v0.9.4: 자동 전환 예약 초기화(이전 장면 타이머는 clearScene 이 이미 정리)
    var scene = SCENES[index];
    updateCtrlButtons();                 // 다음 버튼 활성/비활성 갱신
    if (window.Analytics) window.Analytics.enterScene(scene.id, scene.phase);  // v0.4.0: 통계
    sfx('scene');                        // v0.4.3: Scene 시작 효과음
    // 진행 표시(페이지 점)는 카드 안쪽에서 shell 이 직접 그림 (v0.2.8)
    (RENDERERS[scene.type] || RENDERERS.message)(scene);
    applyPauseState();                   // v0.8.x: 정지 상태면 새 화면의 영상·애니메이션도 정지 유지
  }

  /* ---------- 타입별 렌더러 ------------------------------------------ */
  var RENDERERS = {
    missionIntro: renderMissionIntro,       // v0.2.5 — MISSION 인트로
    info: renderInfo,                       // v0.6.x — STEP 안내(배지+문구+제품 이미지)
    drag: renderDrag,
    warning: renderWarning,
    closeup: renderCloseup,
    video: renderVideo,                     // v0.6.x — PAGE 5-1 설명 영상(prof.mp4) / v0.7.x PAGE 10-1(placeholder)
    compare: renderCompare,                 // v0.7.x — PAGE 10-2 비포/애프터 비교
    brand: renderBrand,
    missionSuccess: renderMissionSuccess,   // v0.2.5 — MISSION 성공!
    brandFinal: renderBrandFinal,           // v0.2.5 — 최종 브랜드 페이지
    mission: renderMission,     // (보존 — 현재 흐름 미사용)
    message: renderMessage,     // (보존 — 현재 흐름 미사용)
    reaction: renderReaction,   // (보존 — 현재 흐름 미사용)
    success: renderSuccess,     // (보존 — 현재 흐름 미사용)
    ending: renderEnding,       // (보존 — 현재 흐름 미사용)
  };

  // MISSION 인트로 (v0.2.5) — 미션 문구 + 아이 캐릭터(v0.3.0, 욕조/거품 느낌)
  function renderMissionIntro(scene) {
    showScreen(function (el) {
      shell(el, scene, '', function (body) {
        var badge = div('mission-badge');           // (v0.3.0: 헤더 배지로 대체, CSS로 숨김)
        badge.textContent = PHASES[0];              // "MISSION"

        var goal = div('mission-goal');
        goal.textContent = scene.title;

        // 아이 캐릭터 (레퍼런스처럼 미션 화면 중앙에 배치)
        // v0.6.x: Page1 대표 이미지 = 양손에 바디워시·이슬로를 든 아기(baby-wonder). 없으면 childHappy 폴백.
        var stage = div('stage');
        var childBody = C.createAsset({
          src: CFG.assets.childWonder || CFG.assets.childHappy, label: CFG.placeholders.childHappy,
          shape: 'baby', variant: 'happy', className: 'child-body child-wonder',
        });
        stage.appendChild(childBody);

        // v0.9.3: 아이 양옆에 "?" 픽토그램 — 어떤 바디워시를 써야 할지 궁금해하는 연출(부드러운 둥실 모션)
        ['q-left', 'q-right'].forEach(function (side) {
          var q = div('q-mark ' + side);
          q.textContent = '?';
          q.setAttribute('aria-hidden', 'true');
          stage.appendChild(q);
        });

        body.appendChild(badge);
        body.appendChild(goal);
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // STEP 안내(정보) 페이지 (v0.6.x, PAGE 1-1) — 배지 + 문구 + 제품 이미지 1개.
  //   기존 카드/배지/텍스트/페이지 전환 스타일(shell)을 그대로 재사용. 이미지는 scene.image(도구 키).
  function renderInfo(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var asset = C.createAsset({
          src: toolSrc(scene.image), label: toolLabel(scene.image), shape: toolShape(scene.image),
          className: 'info-product' + (scene.image ? ' info-' + scene.image : ''),
        });
        body.appendChild(asset);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // MISSION 성공! (v0.2.5) — 웃는 아이 + 반짝임 (제품 이미지 없음)
  function renderMissionSuccess(scene) {
    showScreen(function (el) {
      shell(el, scene, '', function (body) {
        var burst = div('confetti-layer');
        addConfetti(burst, 26);

        var title = div('success-title');
        title.textContent = PHASES[4];              // "MISSION 성공!"

        var desc = div('success-desc');
        // v0.7.x: '생분해' 등 강조 단어만 span 분리 (KEY COLOR·짧은 shine 1회). 나머지는 DOM 텍스트.
        if (scene.emph && scene.title.indexOf(scene.emph) >= 0) {
          var parts = scene.title.split(scene.emph);
          desc.appendChild(document.createTextNode(parts[0]));
          var sp = document.createElement('span');
          sp.className = 'success-emph';
          sp.textContent = scene.emph;
          desc.appendChild(sp);
          desc.appendChild(document.createTextNode(parts.slice(1).join(scene.emph)));
        } else {
          desc.textContent = scene.title;
        }

        var stage = div('stage');
        var childBody = C.createAsset({
          src: CFG.assets.childHappy, label: CFG.placeholders.childHappy,
          shape: 'baby', variant: 'happy', className: 'child-body',
        });
        addSparkles(stage, 8);
        stage.appendChild(childBody);

        body.appendChild(burst);
        body.appendChild(title);
        body.appendChild(desc);
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      sfx('success');                      // v0.4.3: 성공 효과음
      tapAdvance(el);    });
  }

  // 최종 브랜드 페이지 (v0.2.5) — 제품 3종 + 브랜드 문구 + 다시하기
  // (장면 전환은 공통 Fade — showScreen 의 더블 버퍼 페이드 사용)
  function renderBrandFinal(scene) {
    showScreen(function (el) {
      el.classList.add('is-brand-final');   // v0.9.2: 마지막 페이지 전용 스코프(낮은 가로 화면 겹침 방지 CSS용)
      shell(el, scene, scene.title, function (body) {
        // v0.10.1: 카드 중앙 엔딩 로고(.ending-logo) 제거 — 상단 브랜드 로고(shell brandLogo)는 유지.
        // v0.4.4: Page 6과 동일한 3종 히어로 배치
        var hero = buildProductHero();

        body.appendChild(hero);
        // v0.9.1: 하단 문구(brandFinalDesc) 삭제 — 값이 있을 때만 표시(현재는 빈 값이라 미표시).
        if (scene.desc) {
          var desc = div('ending-sub');
          desc.textContent = scene.desc;
          body.appendChild(desc);
        }
        body.appendChild(C.createButton(CFG.texts.replayButton, renderGate));
      });
      sfx('complete');                     // v0.4.3: 최종 완료 효과음
    });
  }

  // 오늘의 미션 (보존 — 현재 흐름 미사용)
  function renderMission(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var badge = div('mission-badge');
        badge.textContent = CFG.texts.mission.badge;

        var goal = div('mission-goal');
        goal.textContent = CFG.texts.mission.goal;

        var intro = C.createMent(scene.text);

        var target = div('mission-target');
        var germ = C.createAsset({ src: CFG.assets.surfactant, label: CFG.placeholders.surfactant, shape: 'germ', className: 'mini-germ' });
        var tgtText = div('mission-target-text');
        tgtText.textContent = CFG.texts.mission.target;
        target.appendChild(germ);
        target.appendChild(tgtText);

        body.appendChild(badge);
        body.appendChild(goal);
        body.appendChild(intro);
        body.appendChild(target);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 멘트형 (보존 — 현재 흐름 미사용)
  function renderMessage(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        body.appendChild(C.createMent(scene.text, scene.strong));
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 아이 반응 (울상/미소) — (보존 — 현재 흐름 미사용)
  function renderReaction(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var stage = div('stage');

        var childSrc = scene.mood === 'sad' ? CFG.assets.childSad :
                       scene.mood === 'happy' ? CFG.assets.childHappy : CFG.assets.child;
        var childLabel = scene.mood === 'sad' ? CFG.placeholders.childSad :
                         scene.mood === 'happy' ? CFG.placeholders.childHappy : CFG.placeholders.child;

        var childBody = C.createAsset({
          src: childSrc, label: childLabel, shape: 'baby', variant: scene.mood,
          className: 'child-body' + (scene.mood === 'sad' ? ' is-distress' : ''),
        });
        if (scene.mood === 'sad') addIrritations(childBody, 6);
        if (scene.sparkle) addSparkles(stage, 7);

        stage.appendChild(childBody);
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 민감도 100% 경고 — v0.3.2: 게이지 제거, 경고 문구 2줄 + 큰 비상 경고등 + 울상 아이
  function renderWarning(scene) {
    showScreen(function (el) {
      el.classList.add('warning-scene');   // v0.4.1: 경고 연출(엣지 글로우·가벼운 흔들림) 트리거
      // 메인 경고 문구는 카드 제목(빨강)으로 표시
      shell(el, scene, CFG.texts.gauge.warn, function (body) {   // 경고! 피부 자극 위험!
        // 추가 문구
        var sub = div('warning-sub');
        sub.textContent = CFG.texts.gauge.warnSub;               // 우리 아이 피부가 불편해요!

        var stage = div('stage');
        var childBody = C.createAsset({
          src: CFG.assets.childSad, label: CFG.placeholders.childSad,
          shape: 'baby', variant: 'sad', className: 'child-body is-distress',
        });
        // v0.4.3: Page 4 아기 얼굴 위 빨간 원(irritation) 제거 — baby-sad 이미지에 이미 발진이 있어 불필요
        // v0.6.x: baby-sad 주변에 계면이(자극 원인) — 안전 슬롯 분산(얼굴 보호·좌우 균형·겹침 방지),
        //   gyemeon2/3/5, 은은한 floating. (baby-sad=481×705 동일 규격이라 기존 슬롯 그대로 적용)
        var warnSurf = addSurfactants(childBody, 5, surfactantFaces('residue'), true);
        warnSurf.forEach(function (s) { s.classList.add('mood-float'); });
        stage.appendChild(childBody);

        // 비상 경고등 (기존보다 크게, 반응형) — 무대 좌하단
        var light = C.createAsset({
          src: CFG.assets.warningLight, label: CFG.placeholders.warningLight,
          shape: 'siren', className: 'warning-light is-big',
        });
        stage.appendChild(light);

        body.appendChild(sub);
        body.appendChild(stage);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      }, 'warn');
      sfx('warn');                         // v0.4.3: 경고/실패 효과음
      tapAdvance(el);    });
  }

  // 드래그형 (거품 + 게이지 + 계면이)
  // v0.2.5 게이지 규칙 — 장면별 gaugeFrom → gaugeTo 로 진행:
  //   STEP1: 0 → 1 (빨강) / STEP2: 1 → 0.5 (주황) / STEP3: 0.5 → 0 (파랑)
  function renderDrag(scene) {
    var myIndex = index;                    // v0.9.4: 완료 시 자동 전환 대상 장면 고정
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var mode = scene.gauge;               // 'rise' | 'hold' | 'fall'
        var gauge = null, startLevel = 0, endLevel = 0;
        if (mode) {
          gauge = buildGauge(mode);
          // 시작값: gaugeFrom 지정 시 그 값, 아니면 rise=0 / hold·fall=현재값(100%)
          startLevel = scene.gaugeFrom != null ? clamp01(scene.gaugeFrom)
                     : (mode === 'rise' ? 0 : clamp01(state.irritation || 1));
          // 목표값: gaugeTo 지정 시 그 값, 아니면 rise=1 / fall=0 / hold=시작값
          endLevel = scene.gaugeTo != null ? clamp01(scene.gaugeTo)
                   : (mode === 'rise' ? 1 : (mode === 'fall' ? 0 : startLevel));
          gauge.set(startLevel);
          // v0.3.2: STEP 화면에서는 민감도 게이지를 사용자에게 표시하지 않음
          //   (내부 로직/게이지 객체는 유지 — state.irritation 갱신·완료 판정에 사용,
          //    화면에는 붙이지 않아 계면이 연출·문구 전달에 집중)
        }

        var stage = div('stage');

        var childBody = C.createAsset({
          src: CFG.assets.child, label: CFG.placeholders.child,
          shape: 'baby', variant: 'neutral', className: 'child-body',
        });

        var foam = div('foam-layer');
        childBody.appendChild(foam);
        var bubbles = buildBubbles(foam, 42);
        var isRinse = scene.action === 'rinse';
        setFoam(bubbles, isRinse ? 1 : 0);

        // v0.4.1: 샤워(헹굼) 장면은 아래로 흐르는 물 연출 추가 (STEP1②·STEP3)
        if (isRinse) { stage.classList.add('is-rinsing'); addWaterFlow(stage, 10); sfx('water'); }  // v0.4.3: 물줄기 효과음

        // 계면이 연출 (v0.3.3):
        //   surfactantGrow  : 문지를수록 계면이가 하나씩 생겨남 (거품과 동시) — STEP1①/STEP2
        //   surfactantFrom/To: 헹굼 진행도에 따라 씻겨나가는 비율 (STEP3: 1→0 모두 제거)
        //   (STEP1②는 From=To=1 → 씻기지 않고 그대로 남음: 거품만 사라지는 연출)
        var surfEls = [];
        var surfGrow = !!scene.surfactantGrow;
        var surfWashFraction = 0;   // 이번 장면에서 씻어낼 비율 (표시 개수 기준)
        // v0.4.2: Scene 8(esloRinse) — 씻겨 내려가는 순간 gyemeon6-sad 로 표정 교체
        var washFaceSrc = scene.washFace ? CFG.assets.gyemeonSad : null;
        if (washFaceSrc) { var pre = new Image(); pre.src = washFaceSrc; }   // 미리 로드(교체 시 깜빡임 방지)
        if (scene.surfactant) {
          var surfCount = CFG.gauge.surfactantCount;   // 총 계면이 개수 (표시 최대치)
          // v0.4.3: 아기 얼굴 영역을 피해 몸(팔·배·다리) 주변에만 배치(avoidFace=true)
          surfEls = addSurfactants(childBody, surfCount, surfactantFaces(scene.surfactantMood), true);
          // v0.4.1: 장면별 감정 모션 (playful/clinging/anxious/panic)
          if (scene.surfactantMood) {
            surfEls.forEach(function (s) { s.classList.add('mood-' + scene.surfactantMood); });
          }
          if (surfGrow) {
            // 처음엔 모두 숨김 → 진행도에 따라 등장
            surfEls.forEach(function (s) { s.classList.add('is-pending'); });
            revealSurfactants(surfEls, scene.surfactantFrom != null ? clamp01(scene.surfactantFrom) : 0);
          } else {
            var surfFrom = scene.surfactantFrom != null ? clamp01(scene.surfactantFrom) : 1;
            if (scene.surfactantTo != null && surfFrom > 0) {
              surfWashFraction = clamp01(1 - clamp01(scene.surfactantTo) / surfFrom);
            } else if (isRinse) {
              surfWashFraction = 1;   // (구버전 호환: rinse 는 전부 씻겨나감)
            }
          }
        }

        var meter = div('rub-meter');
        var fill = div('fill');
        meter.appendChild(fill);
        childBody.appendChild(meter);

        var tool = C.createAsset({
          src: toolSrc(scene.tool), label: toolLabel(scene.tool),
          shape: toolShape(scene.tool),
          className: 'drag-tool' + (scene.tool ? ' tool-' + scene.tool : ''),  // v0.4.3: 도구별 크기 보정용
        });
        tool.style.left = scene.toolLeft || '18%';   // v0.6.x: 장면별 시작 위치(샤워기 좌측 이동 등)
        tool.style.top = scene.toolTop || '22%';

        // v0.4.4: "이걸 움직이세요" 드래그 유도 연출 — 펄스 링(tool::before) + 손가락 힌트 (판정 영향 없음)
        var handHint = div('drag-hint'); handHint.textContent = '👆';
        handHint.style.left = '30%'; handHint.style.top = '40%';
        // 처음 잡는 순간 유도 연출 종료 (게임 로직/판정과 무관, UI만)
        tool.addEventListener('pointerdown', function () { stage.classList.add('is-grabbed'); }, { once: true });

        stage.appendChild(childBody);
        stage.appendChild(tool);
        stage.appendChild(handHint);
        body.appendChild(makeHint(scene.hint));   // 보조문구 (제목 아래)
        body.appendChild(stage);

        // POINT! 안내 박스 (esloUse 등 scene.point 가 있을 때)
        if (scene.point) {
          var pb = div('point-box');
          var pbT = div('pb-title');
          pbT.textContent = CFG.texts.scenes.pointTitle;
          var pbB = div('pb-body');
          pbB.textContent = scene.point;
          pb.appendChild(pbT);
          pb.appendChild(pbB);
          body.appendChild(pb);
        }

        function applyGauge(r) {
          if (!gauge) return 0;
          // 시작값 → 목표값 사이를 진행도(r)에 따라 보간
          var level = mode === 'hold' ? startLevel : startLevel + (endLevel - startLevel) * r;
          gauge.set(level);
          if (mode !== 'hold') state.irritation = level;
          return level;
        }

        var cleanup = window.Interactions.makeRubbable({
          tool: tool, body: childBody, stage: stage,
          onProgress: function (r) {
            fill.style.width = (r * 100) + '%';
            setFoam(bubbles, isRinse ? (1 - r) : r);   // 거품: 생성(foam) 또는 씻김(rinse)
            if (surfGrow) revealSurfactants(surfEls, r);            // 계면이 점점 생성
            if (scene.weaken) weakenSurfactants(surfEls, r);
            if (surfWashFraction > 0) washSurfactants(surfEls, r * surfWashFraction, washFaceSrc);  // 계면이 씻김
            applyGauge(r);
          },
          onComplete: function () {
            // 게이지(내부)를 목표값으로 확정
            if (gauge) {
              gauge.set(endLevel);
              if (mode !== 'hold') state.irritation = endLevel;
            }
            if (surfGrow) revealSurfactants(surfEls, 1);            // 계면이 모두 생성
            if (scene.weaken) weakenSurfactants(surfEls, 1);
            if (surfWashFraction > 0) washSurfactants(surfEls, surfWashFraction, washFaceSrc);

            if (scene.requireGaugeZero && state.irritation > CFG.gauge.calmThreshold) {
              state.irritation = 0;
              if (gauge) gauge.set(0);
            }
            // v0.9.4: 지정 장면(Page3·4·8·9)만 — 드래그 완료(계면이 모두 생성 / 거품 모두 제거) 직후 자동 전환.
            //   완료 이벤트(onComplete) 1회 기준. clearScene 이 이탈/수동이동 시 예약 취소.
            if (scene.autoNext) scheduleAutoNext(myIndex);
          },
        });
        cleanups.push(cleanup);
      });
      tapAdvance(el);   // v0.8.x: 드래그 화면도 빈 영역 탭으로 다음 이동(도구 탭·드래그는 제외)
    });
  }

  // 피부 클로즈업 (설명 화면 — STEP 배지 없음)
  function renderCloseup(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var panel = div('closeup-panel' + (scene.skin === 'irritated' ? ' is-irritated' : ''));
        addIrritations(panel, 8);
        if (scene.surfactant) {
          // v0.4.3: Page 5 계면이 — 더 작게 + 물속에 둥둥 떠다니는 floating (판정과 무관)
          var closeSurf = addSurfactants(panel, 5, surfactantFaces(scene.surfactantMood));
          closeSurf.forEach(function (s) { s.classList.add('mood-float'); });
        }

        body.appendChild(panel);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 설명 영상 페이지 (v0.6.x PAGE 5-1 / v0.7.x PAGE 10-1).
  //   기존 shell(카드/배지/페이지 표시/전환) 재사용. 본문 = 문구(강조 span) + 영상 or placeholder.
  //   scene.video 지정 → autoplay·muted·loop·playsinline 영상(씬 이탈 시 cleanups 로 정지).
  //   scene.video 미지정 → video 요소/네트워크 요청 없이 placeholder 만 렌더(404 없음).
  //   scene.emphClass: 강조 span 클래스(기본 shake-emph=소프트 레드/흔들림, 'key-emph'=키컬러/차분).
  function renderVideo(scene) {
    var myIndex = index;                    // v0.9.4: 영상 정상 종료 시 자동 전환 대상 장면 고정
    showScreen(function (el) {
      shell(el, scene, '', function (body) {
        // 문구: lead(본문) + 강조 span(+선택 tail)
        if (scene.lead || scene.emph) {
          var cap = div('card-title video-caption');
          if (scene.lead) cap.appendChild(document.createTextNode(scene.lead));
          if (scene.emph) {
            var emph = document.createElement('span');
            emph.className = scene.emphClass || 'shake-emph';
            emph.textContent = scene.emph;
            cap.appendChild(emph);
          }
          if (scene.tail) cap.appendChild(document.createTextNode(scene.tail));
          body.appendChild(cap);
        }

        // 영상 or placeholder (영역 크기·스타일 동일)
        var vwrap = div('info-video');
        var hint = makeHint(CFG.texts.hints.tapNext);   // 기본(비필수시청 영상=탭 이동). 필수시청이면 아래서 "영상을 끝까지…"로 설정, 종료 후에도 유지
        var src = scene.video ? (CFG.assets[scene.video] || scene.video) : null;
        if (src) {
          // v0.9.3: requireEnd 영상은 반드시 끝까지 재생(loop 없이 1회) → 종료 전엔 이동 잠금
          var mustWatch = !!scene.requireEnd;
          var v = document.createElement('video');
          v.muted = true; v.defaultMuted = true;           // muted 는 src 전에 (autoplay 허용)
          v.loop = !mustWatch; v.autoplay = true;
          v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
          v.setAttribute('preload', 'auto'); v.setAttribute('aria-hidden', 'true');
          v.src = src;
          vwrap.appendChild(v);
          var tryPlay = function () { var p = v.play(); if (p && p.catch) p.catch(function () {}); };
          v.addEventListener('loadeddata', tryPlay);
          tryPlay();
          // v0.9.1: 영상 영역 탭 → 다음 페이지로 이동(다른 페이지와 동일). 재생/정지는 좌측 ▶/⏸ 버튼 사용.
          //   (이전 v0.8.x의 "영상 탭=재생/정지 토글"은 PAGE 6→7 전환이 안 되는 원인이라 제거)
          if (mustWatch) {
            videoGateLocked = true;                        // 종료 전 이동 잠금
            vwrap.classList.add('is-gated');
            hint.textContent = CFG.texts.hints.videoWatch; // "영상을 끝까지 보면 다음으로 넘어가요"
            // 잠금 해제(종료·오류 공통). 이미 해제됐으면 false(중복 방지).
            // v0.9.5: 종료 후 자동 전환되므로 "화면을 탭하면…" 문구로 바꾸지 않는다(잘못된 탭 유도 방지).
            //   안내문 텍스트를 유지(변경 없음) → 깜빡임·레이아웃 흔들림 없음. 오류 시에도 탭 문구 미표시.
            var unlock = function () {
              if (!videoGateLocked) return false;
              videoGateLocked = false;
              vwrap.classList.remove('is-gated');
              vwrap.classList.add('is-ended');             // 종료 표시(테두리 강조)용 — 문구는 그대로 유지
              updateCtrlButtons();                         // 다음 버튼 활성화(오류 시 수동 이동 대비)
              return true;
            };
            // v0.9.4: 정상 종료(ended)에만 자동 전환 예약. 오류(error)는 잠금 해제만(자동 이동 안 함).
            v.addEventListener('ended', function () {
              if (!unlock()) return;                       // 중복 ended 가드
              if (scene.autoNext) scheduleAutoNext(myIndex);
            });
            v.addEventListener('error', function () { unlock(); });
            updateCtrlButtons();                           // 다음 버튼 비활성 즉시 반영
          }
          // 씬 이탈 시 영상 정지·해제 (재진입 시 새 요소로 처음부터 재생)
          cleanups.push(function () { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (_) {} });
        } else {
          // v0.7.x: 영상 미첨부 → placeholder (video/네트워크 요청 없음)
          vwrap.classList.add('is-placeholder');
          var ph = div('video-ph-text');
          ph.textContent = CFG.texts.scenes.videoPlaceholder || '';
          vwrap.appendChild(ph);
        }
        body.appendChild(vwrap);
        body.appendChild(hint);
      });
      tapAdvance(el);
    });
  }

  // PAGE 10-2 (v0.7.x) — 비포/애프터 비교 (일반 바디워시 vs 이슬로). 기존 shell 재사용.
  //   본문 = 메인 문구(강조 span) + 좌(baby-sad)·VS·우(baby-happy) 비교 카드. 텍스트는 DOM 렌더.
  function renderCompare(scene) {
    showScreen(function (el) {
      shell(el, scene, '', function (body) {
        var T = CFG.texts.scenes;
        // 메인 문구: lead + 강조(생분해 계면활성제) + tail
        var title = div('card-title compare-title');
        title.appendChild(document.createTextNode(T.compareLead || ''));
        var em = document.createElement('span'); em.className = 'key-emph'; em.textContent = T.compareEmph || '';
        title.appendChild(em);
        title.appendChild(document.createTextNode(T.compareTail || ''));
        body.appendChild(title);

        // 비교 섹션 (접근성: role/aria-label)
        var row = div('compare-row');
        row.setAttribute('role', 'group');
        row.setAttribute('aria-label', '일반 바디워시와 이슬로 베이비 비교');

        // v0.9.1: 각 아이 오른쪽 엉덩이 부분에 제품 이미지를 얹는다(아이보다 조금 작게, 자연스럽게).
        //   일반 바디워시(baby-sad) = normal_wash / 이슬로(baby-happy) = eslo-bath.
        function makeCard(cls, labelText, imgSrc, imgLabel, prodSrc, prodLabel, prodCls) {
          var card = div('compare-card ' + cls);
          var lab = div('compare-label');
          lab.textContent = labelText;
          var figure = div('compare-figure');
          var img = C.createAsset({ src: imgSrc, label: imgLabel, shape: 'baby', className: 'compare-img' });
          figure.appendChild(img);
          if (prodSrc) {
            var prod = C.createAsset({
              src: prodSrc, label: prodLabel, shape: 'product',
              className: 'compare-prod ' + (prodCls || ''),
            });
            prod.setAttribute('aria-hidden', 'true');
            figure.appendChild(prod);
          }
          card.appendChild(lab);
          card.appendChild(figure);
          return card;
        }
        var left  = makeCard('compare-bad',  T.compareBadLabel,  CFG.assets.childSad,   CFG.placeholders.childSad,
                              CFG.assets.products.bodywash, CFG.placeholders.bodywash, 'compare-prod-wash');
        var right = makeCard('compare-good', T.compareGoodLabel, CFG.assets.childHappy, CFG.placeholders.childHappy,
                              CFG.assets.ending.bath, CFG.placeholders.endBath, 'compare-prod-eslo');

        // v0.9.1: 가운데 'VS' 텍스트 삭제(요청). 두 카드만 나란히.
        row.appendChild(left);
        row.appendChild(right);
        body.appendChild(row);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 이슬로 소개 (제품 3종 히어로 + 키워드 — 설명 화면, STEP 배지 없음)
  //   v0.4.4: 단일 제품 → 3종 브랜드 메인 비주얼(가운데 크게·좌우 뒤로 회전·겹침)
  function renderBrand(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        if (scene.single) {
          // v0.7.x (PAGE 7 전용): 단일 제품(eslo-bath) + 주변 말풍선 키워드 3개 + 제품명.
          var stage = div('eslo-single-stage');
          var prod = C.createAsset({
            src: CFG.assets.ending[scene.single] || CFG.assets.ending.bath,
            label: CFG.placeholders.endBath, shape: 'product', variant: 'mint',
            className: 'eslo-hero-single',
          });
          stage.appendChild(prod);
          // 말풍선 배치: 왼쪽위(kw-1) / 왼쪽아래(kw-2) / 오른쪽중간(kw-3) — 텍스트는 DOM 텍스트로(접근성)
          (scene.keywords || []).slice(0, 3).forEach(function (k, i) {
            var b = div('kw-bubble kw-' + (i + 1));
            b.textContent = k;
            stage.appendChild(b);
          });
          body.appendChild(stage);
          if (scene.productName) {
            var pn = div('eslo-product-name');
            pn.textContent = scene.productName;
            body.appendChild(pn);
          }
        } else {
          var hero = buildProductHero();
          var list = div('keyword-list');
          (scene.keywords || []).forEach(function (k) {
            var row = div('keyword');
            row.textContent = '✔ ' + k;
            list.appendChild(row);
          });
          body.appendChild(hero);
          body.appendChild(list);
        }
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 이슬로 베이비 3종 (v0.4.5: 가로 일렬 나란히 배치 — 겹침 없이 모두 잘 보이게)
  //   Page 6(이슬로 소개) / Page 10(최종 브랜드)에서 공통 사용.
  function buildProductHero() {
    var hero = div('product-hero');
    var items = [
      { src: CFG.assets.ending.bath,     label: CFG.placeholders.endBath },
      { src: CFG.assets.ending.cleanser, label: CFG.placeholders.endCleanser },
      { src: CFG.assets.ending.lotion,   label: CFG.placeholders.endLotion },
    ];
    items.forEach(function (it, i) {
      hero.appendChild(C.createAsset({
        src: it.src, label: it.label, shape: 'product', variant: 'mint',
        className: 'ph-item ph-' + (i + 1),
      }));
    });
    return hero;
  }

  // 미션 성공 연출 (보존 — 현재 흐름 미사용, missionSuccess 로 대체)
  function renderSuccess(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var burst = div('confetti-layer');
        addConfetti(burst, 26);
        addSparkles(burst, 8);

        var title = div('success-title');
        title.textContent = CFG.texts.success.title;

        var desc = div('success-desc');
        desc.textContent = CFG.texts.success.desc;

        body.appendChild(burst);
        body.appendChild(title);
        body.appendChild(desc);
        body.appendChild(makeHint(CFG.texts.hints.tapNext));
      });
      tapAdvance(el);    });
  }

  // 구 엔딩 (보존 — 현재 흐름 미사용, missionSuccess + brandFinal 로 분리)
  function renderEnding(scene) {
    showScreen(function (el) {
      shell(el, scene, scene.title, function (body) {
        var sub = div('ending-sub');
        sub.textContent = scene.sub || '';
        body.appendChild(sub);

        // 웃는 아이 + 반짝임 (미션 성공 느낌)
        var row = div('ending-row');
        var stage = div('ending-baby');
        var childBody = C.createAsset({
          src: CFG.assets.childHappy, label: CFG.placeholders.childHappy,
          shape: 'baby', variant: 'happy', className: 'child-body',
        });
        addSparkles(stage, 6);
        stage.appendChild(childBody);
        row.appendChild(stage);

        // 이슬로 베이비 3종 (로고 + 제품 3개 + 제품명 캡션)
        var brandBox = div('ending-brand');
        var logo = C.createAsset({ src: CFG.assets.logo, label: CFG.placeholders.logo, shape: 'logo', className: 'ending-logo' });
        var brandName = div('ending-brand-name');
        brandName.textContent = CFG.texts.scenes.endingBrand;
        var cards = div('cards is-compact');
        cards.appendChild(buildCard(CFG.assets.ending.bath, CFG.placeholders.endBath, 'mint', false));
        cards.appendChild(buildCard(CFG.assets.ending.cleanser, CFG.placeholders.endCleanser, 'blue', false));
        cards.appendChild(buildCard(CFG.assets.ending.lotion, CFG.placeholders.endLotion, 'cream', false));
        var caption = div('ending-caption');
        caption.textContent = CFG.texts.scenes.endingProducts;
        brandBox.appendChild(logo);
        brandBox.appendChild(brandName);
        brandBox.appendChild(cards);
        brandBox.appendChild(caption);
        row.appendChild(brandBox);

        body.appendChild(row);
        body.appendChild(C.createButton(CFG.texts.replayButton, renderGate));
      });
    });
  }

  /* ---------- 게이지 컴포넌트 --------------------------------------- */
  // mode: 'rise' | 'hold' | 'fall' — "피부 진정 완료!"는 하강(fall) 모드에서만 표시
  function buildGauge(mode) {
    var TG = CFG.texts.gauge;

    var wrap = div('gauge-wrap');
    var head = div('gauge-head');

    var label = div('gauge-label');
    label.textContent = TG.title;

    var right = div('gauge-right');
    var percent = div('gauge-percent');
    percent.textContent = '0%';
    var warn = C.createAsset({ src: CFG.assets.warningLight, label: CFG.placeholders.warningLight, shape: 'siren', className: 'warning-light' });
    right.appendChild(percent);
    right.appendChild(warn);

    head.appendChild(label);
    head.appendChild(right);

    var bar = div('gauge-bar');
    var fillEl = div('gauge-fill');
    bar.appendChild(fillEl);

    var status = div('gauge-status');

    wrap.appendChild(head);
    wrap.appendChild(bar);
    wrap.appendChild(status);

    function set(ratio) {
      ratio = clamp01(ratio);
      var col = gaugeColor(ratio);
      fillEl.style.width = (ratio * 100) + '%';
      fillEl.style.background = col;
      percent.textContent = Math.round(ratio * 100) + '%';
      percent.style.color = col;
      // 경고 연출(문구+흔들림+경고등)은 상승(rise) 계열에서만 —
      // 이슬로 사용(hold)/헹굼(fall)은 100%여도 조용히 표시 (레퍼런스 기준)
      if (mode === 'rise' && ratio >= CFG.gauge.warnThreshold) {
        wrap.classList.add('is-warning'); wrap.classList.remove('is-calm');
        status.textContent = TG.warn;
      } else if (mode === 'fall' && ratio <= CFG.gauge.calmThreshold) {
        // "피부 진정 완료!"는 헹굼(하강) 장면에서 0% 도달했을 때만
        wrap.classList.add('is-calm'); wrap.classList.remove('is-warning');
        status.textContent = TG.calm;
      } else {
        wrap.classList.remove('is-warning', 'is-calm');
        status.textContent = '';
      }
    }
    return { el: wrap, set: set };
  }

  /* ---------- 헬퍼 --------------------------------------------------- */
  function makeHint(text) {
    var h = div('hint');
    h.textContent = text || '';
    return h;
  }
  // v0.8.x: 화면 탭 → 다음 (공통 goNext). 인터랙티브 요소/드래그/스와이프는 제외.
  //   - pointerdown 이 인터랙티브(버튼·드래그도구·영상·제품)에서 시작하면 이동 금지
  //   - pointerdown→up 이동거리가 임계 초과면 탭 아님(드래그/스와이프 오인 방지)
  var TAP_MOVE_MAX = 12;   // px
  function isInteractiveTarget(t) {
    // v0.9.1: 설명 영상(.info-video/video)은 제외 목록에서 빼서, 다른 페이지들과 동일하게
    //   영상 영역을 탭해도 다음으로 넘어가도록 한다(PAGE 6→7 전환 실패 수정).
    //   영상 재생/정지는 좌측 컨트롤의 ▶/⏸ 버튼으로 유지된다.
    return !!(t && t.closest && t.closest(
      '.ctrl-btn, button, a, .drag-tool, .drag-hint, .eslo-hero-single, .info-product'));
  }
  function tapAdvance(el) {
    if (!CFG.options.tapToAdvance) return;
    var sx = 0, sy = 0, downInteractive = false, downId = null;
    el.addEventListener('pointerdown', function (e) {
      sx = e.clientX; sy = e.clientY; downId = e.pointerId;
      downInteractive = isInteractiveTarget(e.target);
    });
    el.addEventListener('pointerup', function (e) {
      if (busy) return;                                         // 전환 중
      if (e.pointerId !== downId) return;                       // 다른 포인터
      if (downInteractive || isInteractiveTarget(e.target)) return;   // 버튼/드래그/영상/제품 탭
      if (Math.abs(e.clientX - sx) > TAP_MOVE_MAX ||
          Math.abs(e.clientY - sy) > TAP_MOVE_MAX) return;      // 드래그/스와이프
      goNext();                                                 // 탭 = 다음 (공통 이동)
    });
  }

  function toolSrc(tool) {
    if (tool === 'bodywash') return CFG.assets.products.bodywash;
    if (tool === 'shower') return CFG.assets.products.shower;
    if (tool === 'eslo') return CFG.assets.products.eslo;
    return '';
  }
  function toolLabel(tool) {
    if (tool === 'bodywash') return CFG.placeholders.bodywash;
    if (tool === 'shower') return CFG.placeholders.shower;
    if (tool === 'eslo') return CFG.placeholders.eslo;
    return '';
  }
  function toolShape(tool) {
    if (tool === 'bodywash') return 'pump';
    if (tool === 'shower') return 'shower';
    if (tool === 'eslo') return 'eslo';
    return '';
  }

  function buildBubbles(layer, count) {
    var arr = [];
    for (var i = 0; i < count; i++) {
      var b = div('foam-bubble');
      var size = 10 + Math.random() * 22;
      b.style.width = size + 'px';
      b.style.height = size + 'px';
      b.style.left = (8 + Math.random() * 84) + '%';
      b.style.top = (6 + Math.random() * 88) + '%';
      b.style.opacity = '0';                          // v0.4.1: 부드럽게 나타남(opacity 전환)
      b.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';  // 살짝 떠오르는 흔들림 변주
      layer.appendChild(b);
      arr.push(b);
    }
    return arr;
  }
  function setFoam(bubbles, ratio) {
    var n = Math.round(bubbles.length * ratio);
    bubbles.forEach(function (b, i) { b.style.opacity = i < n ? '1' : '0'; });
  }

  // ---- 계면이 배치: 안전 슬롯 + 약간의 랜덤 오프셋 (v0.6.x) ----------------
  //   목적: 얼굴 중앙(눈·코·입·볼) 가림 방지 + 몸 전체 고른 분산 + 계면이끼리 겹침 방지.
  //   좌표는 모두 parent(childBody/panel) 기준 비율(%)이라 모바일/데스크톱 자동 대응.
  //   각 슬롯 = { x, y(중심 %), ox, oy(허용 오프셋 %), g(그룹) }.
  //
  //   ● 캐릭터(childBody) 슬롯 — 얼굴 코어(x16~84, y28~56)를 피해 머리위·양옆·어깨·가슴·배·다리에 분산.
  //   각 슬롯의 s: 좌/우(L/R) 또는 중앙(C) — 좌우 쏠림 방지에 사용.
  var BODY_SLOTS = [
    { x: 36, y: 12, ox: 5, oy: 3, g: 'head', s: 'L' },     // 머리 위 왼쪽(hair)
    { x: 58, y: 11, ox: 5, oy: 3, g: 'head', s: 'R' },     // 머리 위 오른쪽(hair)
    { x: 11, y: 33, ox: 3, oy: 5, g: 'head', s: 'L' },     // 왼쪽 머리 가장자리(관자/귀, 얼굴 코어 밖)
    { x: 89, y: 32, ox: 3, oy: 5, g: 'head', s: 'R' },     // 오른쪽 머리 가장자리
    { x: 24, y: 61, ox: 5, oy: 2, g: 'shoulder', s: 'L' }, // 왼쪽 어깨(얼굴 코어 아래 유지)
    { x: 74, y: 60, ox: 5, oy: 2, g: 'shoulder', s: 'R' }, // 오른쪽 어깨
    { x: 36, y: 67, ox: 5, oy: 3, g: 'chest', s: 'L' },    // 가슴 왼쪽
    { x: 60, y: 65, ox: 5, oy: 3, g: 'chest', s: 'R' },    // 가슴 오른쪽
    { x: 30, y: 76, ox: 5, oy: 3, g: 'belly', s: 'L' },    // 배 왼쪽
    { x: 60, y: 75, ox: 5, oy: 3, g: 'belly', s: 'R' },    // 배 오른쪽
    { x: 26, y: 88, ox: 5, oy: 3, g: 'leg', s: 'L' },      // 다리/무릎 왼쪽
    { x: 62, y: 88, ox: 5, oy: 3, g: 'leg', s: 'R' },      // 다리/무릎 오른쪽
  ];
  //   ● 클로즈업(피부 패널) 슬롯 — 얼굴 없음. 테두리+중앙에 고르게 산포.
  var PANEL_SLOTS = [
    { x: 26, y: 26, ox: 6, oy: 6, g: 'a', s: 'L' },
    { x: 70, y: 23, ox: 6, oy: 6, g: 'b', s: 'R' },
    { x: 48, y: 48, ox: 7, oy: 7, g: 'c', s: 'C' },
    { x: 24, y: 70, ox: 6, oy: 6, g: 'd', s: 'L' },
    { x: 73, y: 68, ox: 6, oy: 6, g: 'e', s: 'R' },
    { x: 50, y: 84, ox: 6, oy: 5, g: 'f', s: 'C' },
  ];

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // n개의 서로 다른 슬롯을 (1)그룹 라운드로빈으로 세로 분산 + (2)좌/우 균형으로 골라
  //   한쪽 몰림 없이 몸 전체에 고르게 배치. (같은 그룹·같은 쪽에 쏠리지 않게)
  function pickSlots(slots, n) {
    var byGroup = {};
    slots.forEach(function (s) { (byGroup[s.g] = byGroup[s.g] || []).push(s); });
    var groups = shuffle(Object.keys(byGroup));
    groups.forEach(function (g) { byGroup[g] = shuffle(byGroup[g]); });
    var picked = [];
    var side = { L: 0, R: 0 };
    var guard = 0;
    while (picked.length < n && guard < 500) {
      guard++;
      var progressed = false;
      for (var gi = 0; gi < groups.length && picked.length < n; gi++) {
        var pool = byGroup[groups[gi]];
        if (!pool.length) continue;
        // 이 그룹에서 현재 부족한 쪽(L/R)을 우선 선택 (쏠림 방지)
        var idx = 0;
        if (pool.length > 1) {
          var want = side.L <= side.R ? 'L' : 'R';
          for (var pi = 0; pi < pool.length; pi++) { if (pool[pi].s === want) { idx = pi; break; } }
        }
        var chosen = pool.splice(idx, 1)[0];
        if (chosen.s === 'L') side.L++; else if (chosen.s === 'R') side.R++;
        picked.push(chosen);
        progressed = true;
      }
      if (!progressed) break;   // 슬롯이 모자라면(요청 n > 슬롯 수) 중단
    }
    return picked;
  }

  // 슬롯 기준점 + 랜덤 오프셋으로 겹치지 않는 최종 좌표(%) 목록 생성.
  //   yWeight: 박스 종횡비 보정(세로가 길수록 같은 %도 px가 크다) — childBody≈1.47, panel≈0.9.
  //   minDist: 폭-% 단위 최소 중심 거리(계면이 폭 ≈ 14~16% 기준 겹침 50% 미만 확보).
  function slotPositions(slots, n, yWeight, minDist) {
    var chosen = pickSlots(slots, n);
    var placed = [];
    var K = 8;   // 오프셋 재시도 최대 횟수
    for (var i = 0; i < chosen.length; i++) {
      var s = chosen[i];
      var best = null;
      for (var k = 0; k <= K; k++) {
        var offScale = k === K ? 0 : 1;   // 마지막 시도는 오프셋 0(슬롯 기준점 폴백)
        var x = s.x + (Math.random() * 2 - 1) * s.ox * offScale;
        var y = s.y + (Math.random() * 2 - 1) * s.oy * offScale;
        var ok = true;
        for (var p = 0; p < placed.length; p++) {
          var dx = x - placed[p].x;
          var dy = (y - placed[p].y) * yWeight;   // y를 폭-% 단위로 환산
          if (Math.sqrt(dx * dx + dy * dy) < minDist) { ok = false; break; }
        }
        if (ok) { best = { x: x, y: y }; break; }
        if (k === K) best = { x: x, y: y };   // 재시도 실패 시 기준점 사용
      }
      placed.push(best);
    }
    return placed;
  }

  // 계면이: outer(위치·씻김) + inner(감정 모션·이미지) 래퍼 구조 (v0.4.1)
  //   faceList: 표정 변형 이미지 경로 배열(없으면 기본 단일). 인스턴스마다 무작위 선택 (v0.4.2)
  //   avoidFace: true 면 아기 얼굴을 피해 몸 전체에 분산(childBody). false 면 피부 패널(closeup).
  //   v0.6.x: 순수 랜덤 → 안전 슬롯 기반 배치로 교체(얼굴 가림·뭉침 방지). 개수·종류·로직 불변.
  function addSurfactants(parent, n, faceList, avoidFace) {
    var arr = [];
    var slots = avoidFace ? BODY_SLOTS : PANEL_SLOTS;
    var yWeight = avoidFace ? 1.47 : 0.9;   // childBody(481/705) / panel(≈정사각) 종횡비 보정
    var positions = slotPositions(slots, n, yWeight, 13);
    for (var i = 0; i < n; i++) {
      var wrap = div('surfactant');
      var pos = positions[i] || { x: 50, y: 70 };   // 슬롯 부족 시 안전 기본값
      wrap.style.left = pos.x.toFixed(2) + '%';
      wrap.style.top  = pos.y.toFixed(2) + '%';
      var src = (faceList && faceList.length)
        ? faceList[Math.floor(Math.random() * faceList.length)]
        : CFG.assets.surfactant;
      var inner = C.createAsset({ src: src, label: CFG.placeholders.surfactant, shape: 'germ', className: 'surfactant-inner' });
      inner.style.animationDelay = (Math.random() * 0.5).toFixed(2) + 's';  // 감정 모션 변주
      wrap.appendChild(inner);
      parent.appendChild(wrap);
      arr.push(wrap);
    }
    return arr;
  }
  // 장면 감정(mood) → 어울리는 계면이 표정(gyemeon) 인덱스 풀 (v0.4.2)
  var MOOD_FACES = {
    // v0.6.x: PAGE 2·3·5(바디워시 사용/헹굼/계면활성제 설명)은 gyemeon2·3·5 만 사용(인덱스 1,2,4)
    playful:  [1, 2, 4],   // 바디워시 거품 (PAGE 2)
    clinging: [1, 2, 4],   // 바디워시 헹굼 잔류 (PAGE 3)
    residue:  [1, 2, 4],   // 계면활성제 설명 (PAGE 5, 표정 선택 전용)
    anxious:  [1, 2],   // 뾰루퉁/화남 (불안) — 이슬로 사용(PAGE 7), 변경 없음
    panic:    [4, 2],   // 놀람/화남 — 이슬로 헹굼(PAGE 8), 변경 없음
  };
  function surfactantFaces(mood) {
    var g = CFG.assets.gyemeon;
    if (!g || !g.length) return null;                 // 배열 없으면 기본 단일 사용
    var idxs = MOOD_FACES[mood];
    return idxs ? idxs.map(function (i) { return g[i]; }) : g.slice();
  }
  // 헹구는 진행도(r)에 따라 계면이들을 아래로 씻겨보냄
  //   washFaceSrc: 지정 시(Scene 8) 씻겨 내려가기 시작하는 순간 표정을 그 이미지로 교체 (v0.4.2)
  function washSurfactants(surfEls, r, washFaceSrc) {
    var washed = Math.round(surfEls.length * clamp01(r));
    surfEls.forEach(function (s, i) {
      if (i < washed && !s.classList.contains('is-washed')) {
        s.classList.add('is-washed');
        sfx('splash');                      // v0.4.3: 계면이 씻김(맞을 때) 효과음
        if (washFaceSrc) {
          var img = s.querySelector('img');
          if (img) img.src = washFaceSrc;   // gyemeon6-sad 로 표정 변경 후 그대로 씻겨 내려감
        }
      }
    });
  }
  // v0.3.3: 문지를수록 계면이가 하나씩 생겨나는 연출 (진행도 r 만큼 표시)
  function revealSurfactants(surfEls, r) {
    var shown = Math.round(surfEls.length * clamp01(r));
    surfEls.forEach(function (s, i) {
      var was = s.classList.contains('is-shown');
      s.classList.toggle('is-shown', i < shown);
      if (!was && i < shown) sfx('pop');    // v0.4.3: 계면이 등장 효과음
    });
  }
  // v0.4.1: 샤워 물줄기(아래로 흐르는 물방울) — 장식용, 드래그 방해 없음
  function addWaterFlow(stage, n) {
    var layer = div('water-layer');
    for (var i = 0; i < n; i++) {
      var w = div('water-drop');
      w.style.left = (10 + Math.random() * 80) + '%';
      w.style.height = (14 + Math.random() * 14).toFixed(0) + 'px';   // 길이 변주
      w.style.animationDelay = (Math.random() * 1.6).toFixed(2) + 's';
      w.style.animationDuration = (0.9 + Math.random() * 0.7).toFixed(2) + 's';
      layer.appendChild(w);
    }
    stage.appendChild(layer);
  }
  // 문지를수록 계면이가 약해지는(옅어지는) 느낌
  function weakenSurfactants(surfEls, r) {
    var op = 1 - clamp01(r) * 0.55;
    surfEls.forEach(function (s) {
      if (s.classList.contains('is-washed')) return;
      s.style.opacity = op;
      s.style.filter = 'saturate(' + (1 - clamp01(r) * 0.5) + ')';
    });
  }

  function addIrritations(parent, n) {
    for (var i = 0; i < n; i++) {
      var d = div('irritation');
      d.style.left = (20 + Math.random() * 60) + '%';
      d.style.top = (20 + Math.random() * 60) + '%';
      d.style.animationDelay = (i * 90) + 'ms';
      parent.appendChild(d);
    }
  }
  function addSparkles(parent, n) {
    for (var i = 0; i < n; i++) {
      var s = div('sparkle');
      s.textContent = '✦';
      s.style.left = (10 + Math.random() * 80) + '%';
      s.style.top = (10 + Math.random() * 80) + '%';
      s.style.animationDelay = (i * 180) + 'ms';
      parent.appendChild(s);
    }
  }
  function addConfetti(parent, n) {
    var colors = ['#7fbce6', '#b8e6d9', '#ffe08a', '#ffb0c4', '#c9b8f0'];
    for (var i = 0; i < n; i++) {
      var c = div('confetti');
      c.style.left = (Math.random() * 100) + '%';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = (Math.random() * 600) + 'ms';
      c.style.animationDuration = (1400 + Math.random() * 900) + 'ms';
      parent.appendChild(c);
    }
  }

  function buildCard(src, label, variant, showName) {
    var card = div('product-card');
    var visual = C.createAsset({ src: src, label: label, shape: 'product', variant: variant, className: 'card-visual' });
    card.appendChild(visual);
    if (showName !== false) {           // 엔딩은 캡션 한 줄로 대체 (개별 이름 생략)
      var name = div('card-name');
      name.textContent = label;
      card.appendChild(name);
    }
    return card;
  }

  /* ---------- 항상 떠있는 요소 토글 --------------------------------- */
  function toggleChrome(show) {
    var d = show ? '' : 'none';
    if (controlPanel) controlPanel.style.display = d;
    if (bottomHint) bottomHint.style.display = d;
  }

  /* ---------- 좌측 컨트롤 패널 (처음으로/플레이/정지/다음) ----------------- */
  function makeCtrlButton(icon, label, onClick) {
    var b = document.createElement('button');
    b.className = 'ctrl-btn';
    b.type = 'button';
    b.setAttribute('aria-label', label);   // v0.8.x: 접근성
    var ico = div('ctrl-ico');
    ico.innerHTML = icon;   // v0.10.0: 유니코드 글리프 → 인라인 SVG(통통·둥근, OS 무관)
    ico.setAttribute('aria-hidden', 'true');
    var lbl = div('ctrl-lbl');
    lbl.textContent = label;
    b.appendChild(ico);
    b.appendChild(lbl);
    b.addEventListener('click', onClick);
    return b;
  }
  // v0.10.0: 컨트롤 픽토그램 — 통통·둥근 인라인 SVG(이모지/OS별 글리프 미사용). 5개 시각 무게 통일.
  var CTRL_SVG = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.7" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 5.5h13"/><path d="M7.5 13.5 12 9l4.5 4.5"/><path d="M12 9.4V18.8"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2.8" stroke-linejoin="round"><path d="M9 6.5 17.3 12 9 17.5Z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6.5 8.4 12 14 17.5"/><path d="M8.8 12H18"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6.2" y="5" width="4.3" height="14" rx="2.15"/><rect x="13.5" y="5" width="4.3" height="14" rx="2.15"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 6.5 15.6 12 10 17.5"/><path d="M15.2 12H6"/></svg>'
  };
  function buildControlPanel() {
    controlPanel = div('control-panel');
    // v0.8.x 순서: 처음으로 / 플레이 / 이전 / 정지 / 다음
    var homeB = makeCtrlButton(CTRL_SVG.home, CFG.texts.homeButton, goHome);   // v0.10.0: 맨 처음으로(상단 바+위 화살표)
    playBtn = makeCtrlButton(CTRL_SVG.play, '플레이', playGame);
    prevBtn = makeCtrlButton(CTRL_SVG.prev, '이전', goPrev);   // v0.8.x — 이전 장면으로 이동
    pauseBtn = makeCtrlButton(CTRL_SVG.pause, '정지', pauseGame);
    nextBtn = makeCtrlButton(CTRL_SVG.next, '다음', goNext);   // v0.2.7 — 다음 장면으로 즉시 이동
    prevBtn.classList.add('is-prev');
    nextBtn.classList.add('is-next');                // v0.2.8 — 파란 화살표 강조
    controlPanel.appendChild(homeB);
    controlPanel.appendChild(playBtn);
    controlPanel.appendChild(prevBtn);
    controlPanel.appendChild(pauseBtn);
    controlPanel.appendChild(nextBtn);
    controlPanel.style.display = 'none';
    updateCtrlButtons();
    app.appendChild(controlPanel);
  }

  /* ---------- 초기화 ------------------------------------------------- */
  function init() {
    app = document.getElementById('app');

    // 전역 욕실 배경: 이미지가 있으면 사용, 없으면 SVG 욕실 연출
    var bg = div('bg-layer');
    app.appendChild(bg);
    bg.innerHTML = C.shapeSVG('bathroom');
    for (var i = 0; i < 6; i++) {
      var deco = div('bg-bubble');
      deco.style.left = (Math.random() * 90 + 2) + '%';
      deco.style.width = deco.style.height = (30 + Math.random() * 70) + 'px';
      deco.style.animationDelay = (Math.random() * 6) + 's';
      bg.appendChild(deco);
    }
    if (CFG.assets.background) {
      var probe = new Image();
      probe.onload = function () {
        bg.innerHTML = '';
        // 세로(모바일)·가로(데스크톱) 배경을 CSS 변수로 넘기고, 전환은 CSS 미디어쿼리가 담당.
        // 변수 안의 url()은 소비되는 CSS 파일(css/) 기준으로 상대해석되므로, 절대 URL로 고정한다.
        var toUrl = function (p) { return 'url("' + new URL(p, document.baseURI).href + '")'; };
        bg.style.setProperty('--bg-portrait', toUrl(CFG.assets.background));
        if (CFG.assets.backgroundWide) {
          bg.style.setProperty('--bg-wide', toUrl(CFG.assets.backgroundWide));
        }
        bg.classList.add('has-image');
      };
      probe.src = CFG.assets.background;
    }

    // 브랜드 로고 (우상단, 항상)
    brandLogo = C.createAsset({ src: CFG.assets.logo, label: CFG.placeholders.logo, shape: 'logo', className: 'brand-logo' });
    app.appendChild(brandLogo);

    // 좌측 컨트롤 패널: 처음으로/플레이/정지/다음 (운영자용 고정 컨트롤, 게임 중 표시)
    // (v0.2.1까지의 좌상단 "처음으로" 버튼을 이 패널로 통합)
    // 사용자용 "처음으로"·페이지 점은 카드 안쪽(shell)에 별도 표시 (v0.2.8)
    buildControlPanel();

    // 하단 안내 (게임 중)
    bottomHint = div('bottom-hint');
    bottomHint.textContent = CFG.texts.hints.homeHint;
    bottomHint.style.display = 'none';
    app.appendChild(bottomHint);

    renderGate();
  }

  // 외부 제어 API (콘솔/시연용): Game.goToStep(3), Game.pause() 등
  window.Game = {
    init: init,
    goToStep: goToStep,
    goHome: goHome,
    play: playGame,
    pause: pauseGame,
    next: goNext,        // v0.2.7 — 다음 장면으로 즉시 이동
  };
})();
