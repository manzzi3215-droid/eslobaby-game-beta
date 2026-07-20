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
  window.SFX = {
    play: play,
    setEnabled: function (v) { enabled = !!v; },
    setVolume: function (v) { master = v; if (masterGain) masterGain.gain.value = v; },
  };
})();
