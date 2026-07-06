/* =============================================================================
 * scenes.js — 장면 "데이터" 정의 (순서/타입/문구/에셋)
 * -----------------------------------------------------------------------------
 * 장면 순서를 바꾸거나 추가/삭제하려면 이 배열만 수정하세요.
 *
 * v0.2.5 구조: Scene(내부 관리용)과 STEP(사용자 표시용)을 분리합니다.
 *   - STEP은 실제 체험 단계 3개만 존재: STEP1(바디워시) / STEP2(이슬로) / STEP3(샤워)
 *   - 나머지는 MISSION 화면 · 설명 화면 · MISSION 성공 · 최종 브랜드 화면
 *   - phase: 상단 진행 표시 위치 (0=MISSION, 1=STEP1, 2=STEP2, 3=STEP3, 4=MISSION 성공!)
 *   - step : 카드에 표시할 STEP 번호 (1~3, 없으면 배지 미표시)
 *
 * type 종류:
 *   'missionIntro'   : MISSION 인트로 (배지 + 문구)
 *   'drag'           : 도구를 아이 몸으로 드래그 (action: 'foam' | 'rinse')
 *                      - gauge: 'rise' | 'hold' | 'fall'
 *                      - gaugeFrom/gaugeTo: 게이지 시작/목표값 (0~1)
 *                      - surfactantFrom/surfactantTo: 계면이 잔량 비율 (0~1)
 *                      - requireGaugeZero: 게이지 0% 확인 후에만 완료
 *   'warning'        : 민감도 100% 경고 연출 (게이지 100% + 경고등 + 울상)
 *   'closeup'        : 피부 클로즈업 (skin: 'irritated'), surfactant: 계면이 노출
 *   'brand'          : 이슬로 제품 + 핵심 키워드
 *   'missionSuccess' : MISSION 성공! (웃는 아이 + 반짝임)
 *   'brandFinal'     : 최종 브랜드 페이지 (제품 3종 + 문구 + 다시하기)
 *   (보존: 'mission' | 'message' | 'reaction' | 'success' | 'ending' — 현재 흐름 미사용)
 * ========================================================================== */
(function () {
  'use strict';
  var T = window.ESLO_CONFIG.texts;

  window.ESLO_SCENES = [
    // 장면 ② — MISSION
    { id: 'missionIntro', type: 'missionIntro', phase: 0,
      title: T.scenes.missionIntro },

    // 장면 ③ — STEP1 ①: 바디워시로 거품 (문지를수록 거품+계면이 함께 생성)
    //   v0.3.3: surfactantGrow — 거품과 함께 계면활성제 캐릭터가 점점 늘어나는 연출.
    { id: 'bodywashUse', type: 'drag', phase: 1, step: 1,
      title: T.scenes.bodywashUse,
      tool: 'bodywash', action: 'foam', hint: T.hints.dragWash,
      gauge: 'rise', gaugeFrom: 0, gaugeTo: 0.5,
      surfactant: true, surfactantGrow: true },

    // 장면 ③-2 — STEP1 ②: 샤워기로 헹구기 (거품만 사라지고 계면이는 그대로 남음)
    //   "깨끗이 씻은 것처럼 보이지만 실제로는 계면활성제가 남아 있다."
    { id: 'bodywashRinse', type: 'drag', phase: 1, step: 1,
      title: T.scenes.bodywashRinse,
      tool: 'shower', action: 'rinse', hint: T.hints.dragShower,
      gauge: 'rise', gaugeFrom: 0.5, gaugeTo: 1,
      surfactant: true, surfactantFrom: 1, surfactantTo: 1 },

    // 장면 ④ — 설명: 민감도 100% 경고 (STEP 배지·제목 없음, 게이지만 유지)
    { id: 'warning', type: 'warning', phase: 1 },

    // 장면 ⑤ — 설명: 나쁜 계면활성제 (피부 클로즈업)
    { id: 'residue', type: 'closeup', phase: 1,
      title: T.scenes.residue, skin: 'irritated', surfactant: true },

    // 장면 ⑥ — 설명: 이슬로 소개 (제품 + 키워드)
    { id: 'esloIntro', type: 'brand', phase: 2,
      title: T.scenes.esloIntro, keywords: T.esloKeywords },

    // 장면 ⑦ — STEP2: 이슬로 사용 (문지를수록 거품+계면이 함께 생성 — STEP1①과 동일)
    { id: 'esloUse', type: 'drag', phase: 2, step: 2,
      title: T.scenes.esloUse,
      tool: 'eslo', action: 'foam', hint: T.hints.dragWashEslo,
      gauge: 'fall', gaugeFrom: 1, gaugeTo: 0.5,
      surfactant: true, surfactantGrow: true },

    // 장면 ⑧ — STEP3: 샤워 (거품과 계면이가 함께 씻겨 내려가 모두 사라짐)
    { id: 'esloRinse', type: 'drag', phase: 3, step: 3,
      title: T.scenes.esloRinse,
      tool: 'shower', action: 'rinse', hint: T.hints.dragRinse,
      gauge: 'fall', gaugeFrom: 0.5, gaugeTo: 0,
      surfactant: true, surfactantFrom: 1, surfactantTo: 0,
      requireGaugeZero: true },

    // 장면 ⑨ — MISSION 성공! (웃는 아이 + 반짝임, 제품 이미지 없음)
    { id: 'missionSuccess', type: 'missionSuccess', phase: 4,
      title: T.scenes.missionSuccess },

    // 장면 ⑩ — 최종 브랜드 페이지 (제품 3종 + 문구 + 다시하기)
    { id: 'brandFinal', type: 'brandFinal', phase: 4,
      title: T.scenes.brandFinalTitle, desc: T.scenes.brandFinalDesc },
  ];

  /* (v0.2.4 이전 장면 구성 — 복구 대비 참고용 보존)
   * opening(reaction) → bodywashUse(rise) → warning → distress(reaction,sad)
   * → residue(closeup) → transition(brand) → esloUse(hold+weaken+point)
   * → esloRinse(fall+requireGaugeZero) → ending(3종 통합)
   * ※ v0.2.5에서 opening → missionIntro 로 대체, distress 장면 제거,
   *   ending → missionSuccess + brandFinal 두 장면으로 분리 */
})();
