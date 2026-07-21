/* =============================================================================
 * sfx.js — 효과음(SFX) (v0.4.3-beta)
 * -----------------------------------------------------------------------------
 * - 기본은 Web Audio 로 합성한 가볍고 귀여운 효과음(무료·무설치·저용량).
 * - config.sfx.files[name] 에 경로가 있으면 그 오디오 파일을 대신 재생 → 추후 교체 용이.
 * - 자동재생 정책 대응: 첫 사용자 제스처에서 오디오 컨텍스트 resume.
 * - 게임 로직/판정/타이밍에는 전혀 영향 없음(전부 try/catch, 실패해도 무음으로 진행).
 * ========================================================================== */
(function () {
  'use strict';

  var CFG = window.ESLO_CONFIG || {};
  var S = CFG.sfx || {};
  var enabled = S.enabled !== false;
  var master = (S.volume != null) ? S.volume : 0.35;
  var files = S.files || {};

  var ctx = null, masterGain = null;
  var last = {};                      // 이름별 최근 재생시각(연타 방지)
  var fileCache = {};                 // 파일 오디오 캐시

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = master;
      masterGain.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  // 첫 제스처에서 컨텍스트 활성화 (모바일/자동재생 정책)
  function resume() { try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {} }
  ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (ev) {
    window.addEventListener(ev, function () { ensureCtx(); resume(); }, { passive: true });
  });

  /* ---------- 합성 헬퍼 ---------------------------------------------- */
  function env(gainNode, t0, peak, dur) {
    var g = gainNode.gain;
    g.setValueAtTime(0.0001, t0);
    g.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + 0.012);
    g.exponentialRampToValueAtTime(0.0001, t0 + dur);
  }
  function tone(freq, type, dur, opt) {
    if (!ensureCtx()) return;
    opt = opt || {};
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opt.slideTo) osc.frequency.exponentialRampToValueAtTime(opt.slideTo, t0 + dur);
    env(g, t0, opt.gain != null ? opt.gain : 0.4, dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function chord(freqs, type, dur) {
    freqs.forEach(function (f, i) {
      setTimeout(function () { tone(f, type || 'sine', dur, { gain: 0.32 }); }, i * 70);
    });
  }
  function noise(dur, opt) {
    if (!ensureCtx()) return;
    opt = opt || {};
    var t0 = ctx.currentTime;
    var len = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = opt.filter || 1000;
    var g = ctx.createGain();
    env(g, t0, opt.gain != null ? opt.gain : 0.25, dur);
    src.connect(lp); lp.connect(g); g.connect(masterGain);
    src.start(t0); src.stop(t0 + dur + 0.02);
  }

  /* ---------- 원샷 중첩 방지 (cry/laugh 재진입 시 정리 후 재생) -------- */
  var oneShots = {};                  // name -> [oscillators]
  function killOneShot(name) {
    var arr = oneShots[name]; if (!arr) return;
    arr.forEach(function (n) { try { n.stop(); } catch (e) {} try { n.disconnect(); } catch (e) {} });
    oneShots[name] = [];
  }
  function regOneShot(name, node) { (oneShots[name] = oneShots[name] || []).push(node); }

  // v0.10.3: 아이 울음 "으앙~" — 조금 더 높고 둥근 톤 + 부드러운 비브라토(약 0.82s, 더 귀엽게·덜 자극적).
  function cry() {
    if (!ensureCtx()) return;
    killOneShot('cry');
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    var lfo = ctx.createOscillator(), lfoG = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t0);
    osc.frequency.linearRampToValueAtTime(720, t0 + 0.12);   // 살짝 "으" 올림(귀여운 시작)
    osc.frequency.linearRampToValueAtTime(480, t0 + 0.78);   // 완만히 "앙~" 내림
    lfo.type = 'sine'; lfo.frequency.value = 9; lfoG.gain.value = 12;   // 더 부드럽게 떨리는 울음(덜 자극적)
    lfo.connect(lfoG); lfoG.connect(osc.frequency);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.44, t0 + 0.05);
    g.gain.setValueAtTime(0.44, t0 + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.82);
    osc.connect(g); g.connect(masterGain);
    osc.start(t0); lfo.start(t0); osc.stop(t0 + 0.85); lfo.stop(t0 + 0.85);
    regOneShot('cry', osc); regOneShot('cry', lfo);
  }

  // v0.10.3: 아이 웃음 "꺄르르~" — 밝은 사인 톤 + 자연스러운 오르내림 리듬(약 0.62s, 더 밝고 자연스럽게).
  function laugh() {
    if (!ensureCtx()) return;
    killOneShot('laugh');
    var notes = [                                   // 자연스러운 "하-하-하" 오르내림(밝게)
      { f: 760,  at: 0.00 },
      { f: 940,  at: 0.10 },
      { f: 1080, at: 0.19 },
      { f: 940,  at: 0.30 },
      { f: 1200, at: 0.40 },
    ];
    for (var i = 0; i < notes.length; i++) {
      var t0 = ctx.currentTime + notes[i].at;
      var osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(notes[i].f, t0);
      osc.frequency.linearRampToValueAtTime(notes[i].f * 1.18, t0 + 0.05);   // 밝게 살짝 올림
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
      osc.connect(g); g.connect(masterGain);
      osc.start(t0); osc.stop(t0 + 0.14);
      regOneShot('laugh', osc);
    }
  }

  // v0.10.14: PAGE 5 경보 알람 — 짧고 선명한 2톤 사이렌(hi-lo-hi-lo). 외부 음원 없이 Web Audio 합성.
  //   - onDone: 마지막 톤 종료(oscillator ended) 시 1회 호출 → 이어서 안내 음성 재생(겹침 없음).
  //   - 오디오 컨텍스트 불가/실패 시에도 onDone 을 즉시 호출해 음성 흐름이 끊기지 않게 함(fallback).
  //   - 알람 시작 시 BGM duck(낮춤) → 이어지는 음성도 duck 유지 → 사이에 볼륨이 튀지 않음.
  //   - 고주파를 lowpass 로 억제(귀에 거슬리지 않게), 총 길이 ~0.9s(흐름 지연 최소).
  function alarm(onDone) {
    var done = false;
    function fire() { if (done) return; done = true; if (typeof onDone === 'function') { try { onDone(); } catch (e) {} } }
    if (!ensureCtx()) { fire(); return; }               // 오디오 불가 → 즉시 다음(음성) 진행
    killOneShot('alarm');
    try { duckBGM(); } catch (e) {}                      // 경보~음성 동안 BGM 낮춤(사이 복귀 없음)
    var t0 = ctx.currentTime;
    var seq = [880, 620, 880, 620];                     // hi-lo-hi-lo 사이렌(경보 느낌)
    var beep = 0.16, gap = 0.05, last = null, lastEnd = t0;
    for (var i = 0; i < seq.length; i++) {
      var st = t0 + i * (beep + gap);
      var osc = ctx.createOscillator(), g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600;   // 거슬리는 고주파 억제
      osc.type = 'square';
      osc.frequency.setValueAtTime(seq[i], st);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.5, st + 0.012);
      g.gain.setValueAtTime(0.5, st + beep - 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, st + beep);
      osc.connect(g); g.connect(lp); lp.connect(masterGain);
      osc.start(st); osc.stop(st + beep + 0.02);
      regOneShot('alarm', osc);
      last = osc; lastEnd = st + beep;
    }
    if (last) last.onended = fire;                       // 정확한 종료 기준(마지막 톤 ended)
    setTimeout(fire, (lastEnd - t0) * 1000 + 140);       // 일부 환경 대비 안전 fallback(1회 가드)
  }
  function stopAlarm() { killOneShot('alarm'); }

  // v0.10.15: PAGE 12 퀴즈 오답음 "삐-빅" — 짧은 2톤 하강 부저(경보 알람과 구분되는 짧고 명확한 오답 피드백).
  //   square + lowpass(1.3kHz) 로 거슬리는 고주파 억제, 총 ~0.27s. 재생 실패해도 시각 피드백/게임엔 영향 없음.
  function wrong() {
    if (!ensureCtx()) return;
    killOneShot('wrong');
    var t0 = ctx.currentTime;
    var seq = [440, 340];                                // 삐-빅(하강 = 오답 느낌)
    var beep = 0.11, gap = 0.05;
    for (var i = 0; i < seq.length; i++) {
      var st = t0 + i * (beep + gap);
      var osc = ctx.createOscillator(), g = ctx.createGain();
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300;
      osc.type = 'square';
      osc.frequency.setValueAtTime(seq[i], st);
      g.gain.setValueAtTime(0.0001, st);
      g.gain.exponentialRampToValueAtTime(0.42, st + 0.01);
      g.gain.setValueAtTime(0.42, st + beep - 0.025);
      g.gain.exponentialRampToValueAtTime(0.0001, st + beep);
      osc.connect(g); g.connect(lp); lp.connect(masterGain);
      osc.start(st); osc.stop(st + beep + 0.02);
      regOneShot('wrong', osc);
    }
  }
  function stopFeedbackSfx() { killOneShot('wrong'); }

  // v0.10.15: 퀴즈 오답/정답 피드백음 + BGM Ducking(자기완결).
  //   - 'wrong' = 짧은 오답 부저, 'correct' = 기존 성공음(success, 밝은 상승 아르페지오) 재사용.
  //   - 재생 시작 시 duckBGM → holdMs 후 unduck. 단, 페이지 음성이 이어지면(voiceActive) unduck 하지 않아
  //     (정답→PAGE 13 음성) BGM 볼륨이 튀지 않음. 실패해도 게임/이동엔 무영향.
  var sfxDuckTimer = null;
  function playFeedback(type) {
    try {
      if (type === 'correct') { if (SOUNDS.success) SOUNDS.success(); }
      else { wrong(); }
    } catch (e) {}
    try {
      duckBGM();
      if (sfxDuckTimer) clearTimeout(sfxDuckTimer);
      var hold = (type === 'correct') ? 2400 : 620;      // 정답: PAGE 13 음성이 이어받을 시간 확보
      sfxDuckTimer = setTimeout(function () { sfxDuckTimer = null; if (!voiceActive) unduckBGM(); }, hold);
    } catch (e) {}
  }

  // 이름별 합성 효과음 (귀엽고 가벼운 톤)
  var SOUNDS = {
    click:    function () { tone(680, 'triangle', 0.09, { slideTo: 900, gain: 0.42 }); },
    scene:    function () { tone(500, 'sine', 0.16, { slideTo: 720, gain: 0.34 }); },
    pop:      function () { tone(900, 'triangle', 0.08, { slideTo: 1300, gain: 0.34 }); },
    splash:   function () { noise(0.14, { gain: 0.32, filter: 1300 }); },
    drip:     function () { tone(1500, 'sine', 0.07, { slideTo: 800, gain: 0.24 }); },
    water:    function () { noise(0.55, { gain: 0.16, filter: 850 }); },
    success:  function () { chord([523, 659, 784, 1046], 'sine', 0.5); },
    warn:     function () { tone(420, 'sine', 0.32, { slideTo: 250, gain: 0.4 }); },
    complete: function () { chord([659, 784, 988, 1318], 'triangle', 0.55); },
    cry:      cry,      // v0.10.2: PAGE 5 진입 시 아이 울음
    laugh:    laugh,    // v0.10.2: PAGE 10 진입 시 아이 웃음
  };

  var THROTTLE = { pop: 55, splash: 55, drip: 90, scene: 120, click: 40 };

  function playFile(url) {
    try {
      var a = fileCache[url];
      if (!a) { a = new Audio(url); a.preload = 'auto'; fileCache[url] = a; }
      var clone = a.cloneNode();
      clone.volume = Math.min(1, master);
      clone.play().catch(function () {});
    } catch (e) {}
  }

  function play(name) {
    if (!enabled) return;
    var now = Date.now();
    var gap = THROTTLE[name] || 30;
    if (last[name] && now - last[name] < gap) return;   // 연타 방지
    last[name] = now;
    try {
      if (files[name]) { playFile(files[name]); return; }   // 실제 음원 우선
      if (SOUNDS[name]) SOUNDS[name]();                      // 합성음
    } catch (e) {}
  }

  // 버튼 클릭음 (모든 button 요소, 위임 리스너) — 개별 버튼 코드 수정 불필요
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.closest && t.closest('button')) play('click');
  }, true);

  // v0.10.5: 배경음악(BGM) 제거 — 반복 BGM이 현장 분위기와 맞지 않아 완전 삭제.
  //   효과음(click/scene/pop/…, PAGE5 cry·PAGE10 laugh)과 오디오 컨텍스트/제스처 활성화 구조는 그대로 유지.
  //   BGM은 파일이 아니라 Web Audio 합성 코드였으므로 삭제할 음원 파일·preload·SW 캐시 항목은 없음.

  /* =============================================================================
   * 페이지 음성 플레이어 (v0.10.6) — 단일 HTMLAudioElement 로 상태 1개만 관리.
   * -----------------------------------------------------------------------------
   * - 페이지마다 Audio 객체를 새로 만들지 않음(단일 재사용) → 중복/겹침 방지.
   * - 새 페이지 재생 전 기존 음성 즉시 정지(currentTime 0). play() reject/error 는 콘솔 warn 만.
   * - 자동재생: 첫 사용자 제스처(게임 시작 버튼) 이후 각 페이지 재생 허용.
   * ========================================================================== */
  var voiceEl = null, voiceActive = false;
  function ensureVoiceEl() {
    if (!voiceEl) { voiceEl = new Audio(); voiceEl.preload = 'auto'; }
    return voiceEl;
  }
  function stopVoice() {
    voiceActive = false;
    if (!voiceEl) return;
    try { voiceEl.onended = null; voiceEl.onerror = null; } catch (e) {}
    try { voiceEl.pause(); } catch (e) {}
    try { voiceEl.currentTime = 0; } catch (e) {}
    try { voiceDiag('voice_stop'); } catch (e) {}   // [diag] 정지 기록(동작 불변)
  }
  function voiceUrlForPage(page) {
    var V = (CFG.voice || {});
    return V[page] || V[String(page)] || null;
  }
  function hasVoiceForPage(page) { return !!voiceUrlForPage(page); }
  // [diag] 페이지 음성 진단 훅 — 재생 동작은 일절 변경하지 않고, 상태만 전역(window.__esloVoiceState)에
  //   기록하고 영상 진단 스토어(window.__esloVideoDiag, game.js)로 라우팅한다. 훅이 없으면 조용히 no-op.
  function voiceDiag(ev, url, extra) {
    try {
      var st = { ev: ev, url: url || (voiceEl && voiceEl.currentSrc) || null,
        playing: !!(voiceEl && !voiceEl.paused && !voiceEl.ended && voiceEl.currentTime > 0),
        ct: +((voiceEl && voiceEl.currentTime) || 0).toFixed(2),
        dur: +((voiceEl && voiceEl.duration) || 0).toFixed(2),
        paused: voiceEl ? voiceEl.paused : null, ts: Date.now() };
      if (extra) for (var k in extra) st[k] = extra[k];
      window.__esloVoiceState = st;
      if (typeof window.__esloVideoDiag === 'function') {
        window.__esloVideoDiag({ src: 'voice', ev: ev, page: (st.page != null ? st.page : null),
          voiceUrl: st.url, voicePlaying: st.playing, voiceCt: st.ct, merr: (st.code != null ? st.code : null) });
      }
    } catch (e) {}
  }
  // 해당 페이지 음성 재생(1회). onEnded: 정상 종료 시 콜백(중첩 방지 위해 stop 시 해제). 없으면 false.
  //   v0.10.11: 페이지 음성 재생 중 BGM 자동 duck(낮춤), 종료/실패/음원없음 시 unduck(복귀).
  function playVoiceForPage(page, onEnded) {
    stopVoice();                                  // 이전 음성 즉시 정지 + currentTime 0
    var url = voiceUrlForPage(page);
    if (!url) { unduckBGM(); return false; }       // 음원 없는 페이지 → BGM 원래 볼륨 복귀, 조용히 skip(게임 진행 무영향)
    ensureVoiceEl();
    voiceEl.onended = function () { voiceDiag('voice_end', url, { page: page }); unduckBGM(); voiceEl.onended = null; if (typeof onEnded === 'function') { try { onEnded(); } catch (e) {} } };
    voiceEl.onerror = function () { voiceDiag('voice_error', url, { page: page, code: voiceEl && voiceEl.error && voiceEl.error.code }); unduckBGM(); try { console.warn('[eslo] voice load error:', url); } catch (e) {} };
    try { voiceEl.src = url; voiceEl.currentTime = 0; } catch (e) {}
    voiceActive = true;
    duckBGM();                                       // v0.10.11: 페이지 음성 시작 → BGM 자동 낮춤(페이드)
    voiceDiag('voice_start', url, { page: page });   // [diag] 재생 시작 기록(동작 불변)
    var p = voiceEl.play();
    if (p && p.then) p.then(function () { voiceDiag('voice_play_ok', url, { page: page }); }, function (e) { voiceDiag('voice_play_reject', url, { page: page, err: e && e.name }); unduckBGM(); });   // 재생 차단 시 BGM 복귀
    if (p && p.catch) p.catch(function () { try { console.warn('[eslo] voice play blocked:', url); } catch (e) {} });   // 무한 재시도 X, 게임 무영향
    return true;
  }
  function pauseVoice() { if (voiceActive && voiceEl && !voiceEl.paused) { try { voiceEl.pause(); } catch (e) {} } }
  function resumeVoice() { if (voiceActive && voiceEl && voiceEl.paused) { var p = voiceEl.play(); if (p && p.catch) p.catch(function () {}); } }
  function stopAllAudio() { stopVoice(); killOneShot('cry'); killOneShot('laugh'); killOneShot('alarm'); killOneShot('wrong'); }

  /* =============================================================================
   * 배경음(BGM) + 자동 Ducking (v0.10.11)
   * -----------------------------------------------------------------------------
   * - 오디오 전용 파일(assets/audio/bgm.m4a, mp4 아님) loop 재생 → Flip Pro 불필요 영상 디코딩 없음.
   * - 첫 사용자 제스처(게임 시작 버튼) 이후 startBGM. 게임 종료(게이트 복귀) 시 stopBGM. 다시 시작 시 처음부터.
   * - 페이지 음성 재생 중 자동으로 볼륨을 낮춤(duck), 종료 시 복귀(unduck). 단일 fade 엔진(진행 중 fade
   *   취소 후 현재값→목표로 램프)이라 페이지 연속 전환에도 볼륨이 꼬이지 않음.
   * - 영상(PAGE 6·11)은 muted 라 BGM/음성과 오디오 충돌 없음. BGM은 항상 페이지 음성보다 작게.
   * ========================================================================== */
  var bgmEl = null, bgmFadeTimer = null, bgmActive = false;
  var BGM_BASE = (CFG.sfx && CFG.sfx.bgmVolume != null) ? CFG.sfx.bgmVolume : 0.12;
  var BGM_DUCK = (CFG.sfx && CFG.sfx.bgmDuckVolume != null) ? CFG.sfx.bgmDuckVolume : 0.045;
  var BGM_FADE_MS = (CFG.sfx && CFG.sfx.bgmFadeMs != null) ? CFG.sfx.bgmFadeMs : 400;   // 300~500ms 권장
  function bgmUrl() { return (CFG.sfx && CFG.sfx.bgm) || null; }
  function ensureBgmEl() {
    if (bgmEl) return bgmEl;
    var url = bgmUrl(); if (!url) return null;
    bgmEl = new Audio(url); bgmEl.loop = true; bgmEl.preload = 'auto';
    try { bgmEl.volume = BGM_BASE; } catch (e) {}
    return bgmEl;
  }
  function clearBgmFade() { if (bgmFadeTimer) { clearInterval(bgmFadeTimer); bgmFadeTimer = null; } }
  function fadeBgmTo(target, ms) {
    if (!bgmEl) return;
    clearBgmFade();
    target = Math.max(0, Math.min(1, target));
    var start = bgmEl.volume, delta = target - start, t0 = Date.now();
    if (Math.abs(delta) < 0.002 || ms <= 0) { try { bgmEl.volume = target; } catch (e) {} return; }
    bgmFadeTimer = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      try { bgmEl.volume = Math.max(0, Math.min(1, start + delta * k)); } catch (e) {}
      if (k >= 1) clearBgmFade();
    }, 30);
  }
  // v0.10.12: 브라우저 자동재생 정책 대응 — 첫 화면에서 재생 시도, 차단되면 첫 사용자 제스처에서 재생.
  //   제스처 리스너는 BGM이 실제로 재생되면 즉시 해제(이후 정지/재생 버튼과 충돌하지 않음).
  var bgmUnlockBound = false;
  function bgmTryPlay() {
    if (!bgmEl) return;
    if (!bgmEl.paused) { unbindBgmUnlock(); return; }   // 이미 재생 중 → 위치 유지, 제스처 해제
    var p = bgmEl.play();
    if (p && p.then) p.then(function () { unbindBgmUnlock(); }, function () { /* 자동재생 차단: 조용히 대기(콘솔 미출력) */ });
    else unbindBgmUnlock();
  }
  function bgmUnlockHandler() { if (bgmActive) bgmTryPlay(); }
  function bindBgmUnlock() {
    if (bgmUnlockBound) return; bgmUnlockBound = true;
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (ev) { document.addEventListener(ev, bgmUnlockHandler, true); });
  }
  function unbindBgmUnlock() {
    if (!bgmUnlockBound) return; bgmUnlockBound = false;
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(function (ev) { document.removeEventListener(ev, bgmUnlockHandler, true); });
  }
  // v0.10.12: 첫 화면부터 BGM(싱글턴). currentTime 은 초기화하지 않음 → 게이트↔게임 이동에도 위치 유지·재시작 금지.
  function startBGM() {
    var el = ensureBgmEl(); if (!el) return;
    bgmActive = true;
    bindBgmUnlock();     // 자동재생 차단 대비 첫 제스처 재생 예약
    bgmTryPlay();        // 자동재생 허용 시 즉시 재생(현재 위치에서 이어서)
  }
  // 완전 정지(위치 0). 게이트 복귀에서는 호출하지 않음(BGM 지속). 필요 시(세션 완전 종료 등)만 사용.
  function stopBGM() {
    bgmActive = false; clearBgmFade(); unbindBgmUnlock();
    if (!bgmEl) return;
    try { bgmEl.pause(); bgmEl.currentTime = 0; bgmEl.volume = BGM_BASE; } catch (e) {}
  }
  function pauseBGM() { if (bgmEl && !bgmEl.paused) { try { bgmEl.pause(); } catch (e) {} } }
  function resumeBGM() { if (bgmActive && bgmEl && bgmEl.paused) { var p = bgmEl.play(); if (p && p.catch) p.catch(function () {}); } }
  function duckBGM() { if (bgmEl && bgmActive) fadeBgmTo(BGM_DUCK, BGM_FADE_MS); }     // 페이지 음성 중 낮춤
  function unduckBGM() { if (bgmEl && bgmActive) fadeBgmTo(BGM_BASE, BGM_FADE_MS); }   // 음성 종료 시 복귀

  window.SFX = {
    play: play,
    setEnabled: function (v) { enabled = !!v; },
    setVolume: function (v) { master = v; if (masterGain) masterGain.gain.value = v; },
    // v0.10.6: 페이지 음성 제어
    playVoiceForPage: playVoiceForPage,
    hasVoiceForPage: hasVoiceForPage,
    stopVoice: stopVoice,
    pauseVoice: pauseVoice,
    resumeVoice: resumeVoice,
    stopAllAudio: stopAllAudio,
    // v0.10.14: PAGE 5 경보 알람(합성). onDone 은 알람 종료 시 1회 호출 → 이어서 안내 음성.
    playAlarm: alarm,
    stopAlarm: stopAlarm,
    // v0.10.15: PAGE 12 퀴즈 오답/정답 피드백음(+BGM Ducking 자기완결). type='wrong'|'correct'.
    playFeedback: playFeedback,
    stopFeedbackSfx: stopFeedbackSfx,
    // v0.10.11: 배경음(BGM) 제어 (loop·ducking은 내부에서 페이지 음성과 연동)
    startBGM: startBGM,
    stopBGM: stopBGM,
    pauseBGM: pauseBGM,
    resumeBGM: resumeBGM,
  };
})();
