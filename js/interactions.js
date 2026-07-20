/* =============================================================================
 * interactions.js — 드래그/터치(문지르기) 인터랙션 모듈
 * -----------------------------------------------------------------------------
 * Pointer Events 사용 → 마우스 / 터치 / 펜을 하나의 코드로 처리.
 * makeRubbable(): 도구를 아이 몸 위에서 문지르면 진행도가 쌓이고,
 *                 목표 도달 시 onComplete 호출.
 * ========================================================================== */
(function () {
  'use strict';
  var CFG = window.ESLO_CONFIG;

  /**
   * @param {Object} p
   *   @param {HTMLElement} p.tool      드래그하는 도구 요소
   *   @param {HTMLElement} p.body      드롭 대상(아이 몸)
   *   @param {HTMLElement} p.stage     좌표 기준이 되는 무대
   *   @param {Function}    p.onProgress(ratio 0~1)
   *   @param {Function}    p.onComplete()
   * @returns {Function} cleanup()  — 장면 전환 시 리스너 해제용
   */
  function makeRubbable(p) {
    var dragging = false;
    var progress = 0;
    var completed = false;
    var lastX = null, lastY = null;
    var threshold = CFG.options.dragThreshold;

    // 문지른 거리를 진행도로 환산할 때 기준이 되는 총 거리(px)
    var TARGET_DISTANCE = 900;

    // v0.10.5: 잡는 기준점(세로 앵커). 0=이미지 상단, 0.5=중앙(기본), 1=하단.
    //   값이 클수록 손가락이 이미지 아래쪽을 잡고 이미지는 손가락 "위쪽"에 보임(화면 중앙·아기 가림 감소).
    //   판정(isOverBody/거리/완료)은 손가락 좌표 기준 그대로 — 시각 앵커만 변경.
    var grabAnchorY = (p.grabAnchorY != null) ? p.grabAnchorY : 0.5;
    var TOOL_TRANSFORM = 'translate(-50%, ' + (-grabAnchorY * 100) + '%)';

    function stageRect() { return p.stage.getBoundingClientRect(); }

    function moveToolTo(clientX, clientY) {
      var r = stageRect();
      var x = clientX - r.left;
      var y = clientY - r.top;
      p.tool.style.left = x + 'px';
      p.tool.style.top = y + 'px';
      p.tool.style.transform = TOOL_TRANSFORM;
    }

    function isOverBody(clientX, clientY) {
      var b = p.body.getBoundingClientRect();
      return clientX >= b.left && clientX <= b.right &&
             clientY >= b.top  && clientY <= b.bottom;
    }

    function addProgress(dist) {
      if (completed) return;
      progress = Math.min(1, progress + dist / TARGET_DISTANCE);
      p.onProgress(progress);
      if (progress >= threshold) complete();
    }

    function complete() {
      if (completed) return;
      completed = true;
      p.onProgress(1);
      p.onComplete();
    }

    function onDown(e) {
      dragging = true;
      p.tool.setPointerCapture && p.tool.setPointerCapture(e.pointerId);
      lastX = e.clientX; lastY = e.clientY;
      moveToolTo(e.clientX, e.clientY);
      e.preventDefault();
    }

    function onMove(e) {
      if (!dragging) return;
      moveToolTo(e.clientX, e.clientY);
      if (isOverBody(e.clientX, e.clientY) && lastX !== null) {
        var dx = e.clientX - lastX;
        var dy = e.clientY - lastY;
        addProgress(Math.sqrt(dx * dx + dy * dy));
      }
      lastX = e.clientX; lastY = e.clientY;
      e.preventDefault();
    }

    function onUp(e) {
      dragging = false;
      lastX = lastY = null;
      if (e && e.pointerId != null && p.tool.releasePointerCapture) {
        try { p.tool.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    }

    p.tool.addEventListener('pointerdown', onDown);
    p.tool.addEventListener('pointermove', onMove);
    p.tool.addEventListener('pointerup', onUp);
    p.tool.addEventListener('pointercancel', onUp);

    // 현장 안전장치: 일정 시간 조작이 없어도 자동 완료
    var fallback = setTimeout(complete, CFG.timings.dragFallback);

    return function cleanup() {
      clearTimeout(fallback);
      p.tool.removeEventListener('pointerdown', onDown);
      p.tool.removeEventListener('pointermove', onMove);
      p.tool.removeEventListener('pointerup', onUp);
      p.tool.removeEventListener('pointercancel', onUp);
    };
  }

  window.Interactions = { makeRubbable: makeRubbable };
})();
