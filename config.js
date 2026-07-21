/* =============================================================================
 * config.js  —  프로젝트 전역 설정 (교체/수정은 대부분 이 파일에서만)
 * -----------------------------------------------------------------------------
 * 나중에 실제 에셋이 준비되면 아래 경로에 같은 위치로 파일만 넣으면 됩니다.
 * 코드는 수정할 필요가 없습니다.
 *
 *   - 이미지 교체 : assets/ 폴더에 파일을 넣고 아래 ASSETS 경로만 확인
 *   - QR 교체     : assets/qr/kakao-qr.png 를 넣으면 자동 반영
 *   - 배경 교체   : assets/images/background.png 를 넣으면 욕실 배경으로 자동 반영
 *   - 문구 수정   : 아래 TEXTS 값만 수정
 *   - 색상 수정   : css/theme.css 의 :root 변수에서 수정
 *   - 타이밍 수정 : 아래 TIMINGS 값(ms)만 수정
 *   - 게이지 색   : 아래 gauge.colorStops 배열만 수정
 *
 * 이미지 파일이 아직 없으면 자동으로 Placeholder(간단 일러스트)가 표시됩니다.
 * 브랜드명 표기는 반드시 "eslo" 로 통일합니다.
 * ========================================================================== */

window.ESLO_CONFIG = {
  /* --- 프로젝트 메타 --------------------------------------------------- */
  meta: {
    version: 'v0.10.19-beta',
    title: '이슬로(eslo) 베이비 미니게임',
  },

  /* --- 에셋 경로 -------------------------------------------------------
   * 값이 비어있거나("") 파일이 없으면 Placeholder(일러스트)가 대신 표시됩니다.
   * ------------------------------------------------------------------- */
  assets: {
    qr:        'assets/qr/kakao-qr.png',        // 카카오 채널 QR
    logo:      'assets/images/logo.png',        // eslo 로고
    // 아기 캐릭터 (v0.4.2-beta: 실제 1x 에셋 적용)
    child:     'assets/images/baby-basic.png',  // 기본 상태
    childSad:  'assets/images/baby-sad.png',    // 피부 자극·실패(울상+발진)
    childHappy:'assets/images/baby-happy.png',  // 미션 성공·깨끗해진 상태
    childWonder:'assets/images/baby-wonder_2.png', // Page1(MISSION): 양손에 바디워시·이슬로 제품 (v0.9.8: baby-wonder_2로 교체, 위치/크기/애니메이션 동일)
    background:'assets/images/background-v3.jpg',   // 욕실 배경(세로/모바일, v3: 신규 원본 일러스트) — 비우면 SVG 욕실 연출
    backgroundWide:'assets/images/background-wide-v3.jpg', // 욕실 배경(가로/데스크톱, v3: v3 원본을 Higgsfield outpaint로 좌우 확장) — 비우면 세로 배경 사용
    magnifier: 'assets/images/magnifier.png',   // 돋보기 (현재 흐름 미사용)
    bubble:    'assets/images/bubble.png',      // 거품 (비우면 도형 거품)
    warningLight: '',   // v0.10.4: 경고등/비상등 — 실제 렌더는 SVG siren placeholder(shape:'siren'). 존재하지 않는 png 참조로 인한 404 제거(빈 값이면 이미지 요청 없이 placeholder 사용, 시각 동일).
    // v0.10.7: 파일명 변경(캐시버스트) — 삼성 사이니지에 남은 구 영상 HTTP 캐시 우회. 1차 재생 소스.
    profVideo: 'assets/images/prof-signage.mp4',        // PAGE 6 영상 (1024×768, Constrained Baseline L3.1)
    bioVideo:  'assets/images/prof-nongye-signage.mp4', // PAGE 11 영상 (동일 규격)
    // v0.10.7: 2차 보수 폴백 소스(1차 재생 실패 시 교체) — 640×480 Baseline L3.0, 무B프레임·CABAC off·무음.
    profVideoLo: 'assets/images/prof-signage-lo.mp4',
    bioVideoLo:  'assets/images/prof-nongye-signage-lo.mp4',
    // 계면이(gyemeon) — v0.4.2-beta: 실제 1x 에셋. 표정 변형 5종 + Scene 8 씻김용 sad.
    surfactant:   'assets/images/gyemeon1.png',       // 기본 단일 fallback
    gyemeon: [
      'assets/images/gyemeon1.png',   // 웃음(장난)
      'assets/images/gyemeon2.png',   // 뾰루퉁
      'assets/images/gyemeon3.png',   // 화남
      'assets/images/gyemeon4.png',   // 능글(웃음)
      'assets/images/gyemeon5.png',   // 놀람
    ],
    gyemeonSad:   'assets/images/gyemeon6-sad.png',   // Scene 8: 씻겨 내려갈 때 표정
    products: {
      bodywash: 'assets/images/normal_wash.png', // 일반 바디워시 (자사일반 바디워시 라벨)
      shower:   'assets/images/washhead.png',   // 샤워기(핸드 샤워헤드)
      eslo:     'assets/images/eslo-bath.png',  // eslo 바스앤샴푸
    },
    // 엔딩 3종 카드
    ending: {
      bath:     'assets/images/eslo-bath.png',
      cleanser: 'assets/images/eslo-cleanser.png',
      lotion:   'assets/images/eslo-lotion.png',
    },
    // v0.10.2: PAGE 14(미션 완료/증정 안내) 중앙 제품 이미지
    rewardProduct: 'assets/images/이슬로-바스앤샴푸-미니.png',
  },

  /* --- Placeholder 라벨 ------------------------------------------------ */
  placeholders: {
    qr:        'QR 코드\n(임시)',
    logo:      'eslo',
    child:     '아이',
    childSad:  '아이(울상)',
    childHappy:'아이(미소)',
    magnifier: '돋보기',
    bodywash:  '일반',
    shower:    '샤워기',
    eslo:      'eslo',
    warningLight: '경고등',
    surfactant:   '계면이',
    endBath:     '바스앤샴푸',
    endCleanser: '엉덩이 클렌저',
    endLotion:   '로션',
    rewardProduct: '이슬로 바스앤샴푸(여행용)',   // v0.10.2: PAGE 14 제품 이미지 대체 라벨
  },

  /* --- 문구(텍스트) ---------------------------------------------------- */
  texts: {
    step: 'STEP',
    page: 'Page',                  // v0.3.3: 화면 하단 페이지 번호 접두 (예: "Page 1 / 10")
    homeButton: '처음으로',
    replayButton: '다시하기',

    // 상단 진행 표시 (v0.2.5 — MISSION → STEP1 → STEP2 → STEP3 → MISSION 성공!)
    // 실제 체험 STEP은 STEP1~3 총 3개만 존재. 나머지는 MISSION/설명 화면.
    phases: ['MISSION', 'STEP1', 'STEP2', 'STEP3', 'MISSION 성공!'],

    gate: {
      step:   '카카오 채널 추가',
      title:  '카카오 채널을 추가하고\n게임을 시작해볼까요?',
      desc:   'QR 코드를 스캔하고 채널을 추가하면\n게임을 시작할 수 있어요',
      joinButton: '채널 추가 하러가기',              // v0.9.8: 카카오 채널로 이동(새 탭)
      joinUrl:    'https://pf.kakao.com/_nCzPn',      // 카카오 채널 링크(버튼 클릭 시 새 탭 이동)
      button: '채널 추가 완료했어요!',                // 게임 시작(스타트) 버튼 — 그대로 유지
      // (구버전 보존) title: '게임 참여 전\neslo 카카오 채널을 추가해주세요'
    },

    mission: {
      badge:  '오늘의 미션',
      goal:   '우리 아기 피부를\n깨끗하게 지켜주세요!',
      target: '나쁜 계면이를 모두 씻어내세요!',
    },

    // eslo 핵심 키워드 (PAGE 7 제품 주변 말풍선 — 순서: 왼쪽위 / 왼쪽아래 / 오른쪽중간)
    //   v0.9.1: 순서 변경(생분해 → 안심 베이비케어 → 피부에 남지 않는 계면활성제). 말풍선은 모두 줄바꿈 허용.
    esloKeywords: ['생분해', '안심 베이비케어', '피부에 남지 않는 착한 계면활성제'],

    success: {
      title: '🎉 미션 성공!',
      desc:  '우리 아기 피부를\n깨끗하게 지켰어요!',
    },

    scenes: {
      /* --- v0.2.5 시놉시스 문구 (★ 원문 그대로 — 임의 수정 금지) ------- */
      // v0.4.5: 의미 단위 줄바꿈으로 가독성 개선 (문구 단어는 그대로, \n만 추가)
      missionIntro: '민감한 우리 아이 피부,\n어떤 바디워시를 써야 할까요?',
      bodywashIntro: '먼저 일반 바디워시를\n사용해서 씻어볼까요?',   // v0.6.x: PAGE 1-1 신규 안내
      bodywashUse:  '일반 바디워시로\n거품을 내어 씻겨주세요.',
      bodywashRinse: '샤워기로\n깨끗하게 씻어내주세요',   // v0.3.1: STEP1 ② 샤워 단계
      residue:      '바디워시 속 나쁜 계면활성제가\n피부에 남아\n자극을 유발했어요!',
      // v0.9.4: PAGE6 영상 설명 문구 — '나쁜 계면활성제'만 붉은 강조 span, 나머지는 일반 텍스트.
      //   (lead=강조 앞 / emph=나쁜 계면활성제 / tail=강조 뒤 나머지 2줄 포함)
      residueVideoLead: '일반 바디워시 속 ',
      residueVideoEmph: '나쁜 계면활성제',
      residueVideoTail: '는\n물에 씻기지 않고 피부에 남아\n자극을 유발해요!',
      // (구버전 보존 v0.2.5~v0.3.0) residue: '바디워시 속 나쁜 계면활성제는 피부에 남아 자극을 유발해요!'
      esloIntro:    '이제 이슬로 베이비\n생분해 워시로 씻어볼까요?',
      esloProductName: '이슬로 생분해 바스앤샴푸',   // PAGE 7 제품명 캡션
      esloUse:      '이슬로 바디워시로\n거품을 내어 씻겨주세요',
      esloRinse:    '샤워기로 깨끗하게\n씻어내 주세요',
      missionSuccess: '깨끗해진 피부,\n이슬로의 생분해 기술 덕분이에요!',
      missionSuccessEmph: '생분해',   // PAGE 10 강조 단어 (span 분리)

      // v0.7.x — PAGE 10-1(영상 설명, 현재 placeholder) / PAGE 10-2(비포·애프터 비교)
      bioLead: '이슬로의 착한 계면활성제는\n물에 쉽게 씻겨 내려가\n',   // 앞 2줄(본문)
      bioEmph: '피부에 남지 않아요!',                                       // 마지막 줄 강조(키컬러)
      videoPlaceholder: '영상 준비 중',                                     // 영상 미첨부 시 안내
      compareLead: '민감한 우리 아이 피부\n',                  // v0.10.16: 안내 음성(page12.m4a)과 일치하도록 원복
      compareEmph: '생분해 케어는 선택이 아니라 필수!',          // v0.10.16: 안내 음성과 일치(퀴즈 기능·카드·안내문은 유지)
      compareTail: '',
      compareBadLabel: '일반 계면활성제\n바디워시',           // v0.9.4: 2줄
      compareGoodLabel: '착한 계면활성제\n이슬로 생분해 워시',   // v0.10.1: 우측 라벨 문구 변경(2줄)
      compareVs: 'VS',
      brandFinalTitle: '우리 아이 피부를 지키는\n착한 계면활성제\n안심 생분해 케어, 이슬로',   // v0.10.1: 3줄 구성 변경
      brandFinalDesc:  '',   // v0.9.1: 마지막 페이지 하단 문구 삭제(로고·제품 정렬만 유지)
      // v0.10.2: PAGE 13 제품 3종 하단 제품명 (좌 → 중앙 → 우 순서)
      finalProductNames: ['바스 앤 샴푸', '엉덩이 클렌저', '바디 로션'],
      // v0.10.2: PAGE 14 — 미션 완료 / 증정 안내 화면
      rewardTitle: '💙 생분해 미션 완료! 💙',
      rewardDesc:  '직원에게 화면을 보여주시고\n여행용 바스 앤 샴푸 받아가세요!',   // 정확히 2줄

      // 이슬로 사용 장면 POINT 안내 박스 (v0.2.5: 흐름에서 제외 — 보존)
      pointTitle:   'POINT!',
      point:        '이슬로 사용 단계부터\n계면이(나쁜 성분)가\n붙어있는 상태로\n시작됩니다.',

      // (참고) 흐름 정리로 현재 미사용 — 삭제하지 않고 남겨둠
      opening:      '우리 아기, 깨끗하게 씻겨볼까요?',                       // (v0.2.4 STEP 2)
      bodywashUseOld: '일반 바디워시로\n거품을 내어 씻겨주세요',              // (v0.2.4 STEP 3)
      warning:      '민감도 100%!\n경고! 피부 자극 위험!',                  // (v0.2.4 STEP 4 — v0.2.5는 게이지만 표시)
      distress:     '왜 그런지 살펴볼까요?',                                // (v0.2.4 STEP 5 — v0.2.5에서 장면 제거)
      residueOld:   '바디워시 속 나쁜 계면활성제가\n피부에 남아 자극이 일어났어요!', // (v0.2.4 STEP 6)
      transition:   '이슬로는 달라요',                                      // (v0.2.4 STEP 7)
      ending:       '깨끗해진 피부, 건강한 미소!',                           // (v0.2.4 STEP 10)
      endingSub:    '우리 아기, 이제 안심하고 촉촉하게 케어해요',
      endingBrand:  '이슬로 베이비 3종',
      endingProducts: '바스앤샴푸 · 엉덩이 클렌저 · 로션',
      cleanSkin:    '피부가 깨끗하고 편안해졌어요!',
      rinse1:       '거품을 깨끗하게 씻어주세요.',
      check1:       '정말 깨끗하게 씻겨졌는지\n함께 확인해볼까요?',
      check2:       '피부에 계면활성제가\n남아 있는지 확인해볼까요?',
      summary:      '착한 계면활성제로 우리 아이 피부를 지키는\n안심 생분해 케어, eslo.',
      endingOld:    '우리 아이 피부를 위한\n안심 생분해 케어',
      endingSubOld: 'eslo 베이비와 함께\n깨끗한 목욕 습관을 시작해보세요.',
    },

    hints: {
      dragWash:     '일반 바디워시를 아이 몸에 문질러 주세요',
      dragWashEslo: '이슬로 제품을 아이 몸에 문질러주세요.',   // v0.3.3 (구: '제품을 아이 몸에 문질러 주세요')
      dragShower:   '샤워기를 아이 몸에 문질러 주세요',   // v0.3.1: STEP1 샤워 단계
      dragRinse:    '샤워기를 아이 몸에 문질러주세요.',   // v0.3.3 (구: '샤워기로 헹굴수록 계면이와 자극이 사라져요')
      tapNext:      '화면을 탭하거나 다음 버튼을 눌러주세요',
      quizSelect:   '우리 아이에게 꼭 필요한\n안심 워시를 선택해주세요.',   // v0.10.18: PAGE 12 선택 안내(2줄: 1줄 보조 + 2줄 행동 강조)
      videoWatch:   '영상을 끝까지 보면 다음으로 넘어가요',   // v0.9.3: 필수 시청 영상 재생 중 안내
      videoTapPlay: '화면을 터치하면 영상을 재생합니다',        // v0.10.5: 자동재생 차단/재생 실패 시 안내(개발자용 오류문구 아님)
      homeHint:     "※ 모든 장면 상단의 '처음으로' 버튼을 누르면 게임 시작 화면으로 돌아갑니다.",
    },

    gauge: {
      title: '민감도 게이지',
      warn:  '경고! 피부 자극 위험!',
      warnSub: '피부에 남은 나쁜 계면활성제가\n트러블을 유발했어요!',   // v0.7.x: 경고 화면 본문(2줄)
      calm:  '피부 진정 완료!',
      // (구버전 보존) warn: '민감도 100% · 피부 자극 위험!'
    },
  },

  /* --- 타이밍 (밀리초) ------------------------------------------------- */
  timings: {
    messageAutoAdvance: 3200,
    missionAutoAdvance: 4200,
    inspectAutoAdvance: 3600,
    dragFallback:       9000,   // 드래그 미조작 시 자동 완료
    completePause:      900,
    warningHold:        2000,
    calmHold:           1600,   // 게이지 0% "진정 완료" 를 보여주는 시간
    successHold:        3600,
    rewardHold:         2200,   // v0.10.3: PAGE 13 순차 등장 완료 후 완성 화면을 충분히 볼 수 있도록(약 2.2초) 유지 후 PAGE 14 자동 전환
  },

  /* --- 게임 동작 옵션 --------------------------------------------------- */
  options: {
    tapToAdvance: true,
    dragThreshold: 1.0,
    // 상단 STEP 번호 클릭으로 장면 이동 (테스트/팀 시연용).
    // ★ 실제 행사 운영 전에는 false 로 바꿔 잠금 처리하세요.
    stepNavigationEnabled: true,
  },

  /* --- 민감/자극 게이지 색 --------------------------------------------
   * 게이지 값(0~1)에 따라 아래 색을 순서대로 보간합니다.
   * v0.2.5 게이지 규칙: 0% → 파랑 / 50% → 주황 / 100% → 빨강
   *   STEP1: 0% → 100% (빨강)
   *   STEP2: 100% → 50% (주황)
   *   STEP3: 50% → 0% (파랑)
   * (구버전 5색 보간 보존: ['#5db6e6','#8fe3c4','#ffe08a','#ffb85c','#ff5a5a'])
   * ------------------------------------------------------------------- */
  gauge: {
    colorStops: ['#5db6e6', '#ffb85c', '#ff5a5a'],
    warnThreshold: 0.98,
    calmThreshold: 0.02,    // 이 값 이하이면 "진정 완료" (0% 취급)
    surfactantCount: 6,     // v0.4.3: 8→6 (얼굴 가림 완화·화면 정리, 판정과 무관)
  },

  /* --- 효과음(SFX) (v0.4.3-beta) --------------------------------------
   * 기본은 Web Audio 로 합성한 가볍고 귀여운 효과음(무료·무설치).
   * 추후 실제 음원으로 교체하려면 files 에 경로를 넣으면 그 파일을 재생합니다.
   *   예) files: { click: 'assets/sounds/click.mp3', success: 'assets/sounds/success.mp3', ... }
   * ------------------------------------------------------------------- */
  sfx: {
    enabled: true,
    volume: 0.32,           // 효과음(SFX) 마스터 볼륨(0~1) — PAGE5 울음·PAGE10 웃음·버튼음 등
    files: {},              // 비어있으면 합성음 사용
    // v0.10.11: 배경음(BGM) — 오디오 전용 파일(mp4 아님, Flip Pro 불필요 영상 디코딩 방지).
    //   loop 재생, 첫 사용자 제스처(게임 시작) 이후 시작, 게이트 복귀 시 정지. 페이지 음성 중 자동 duck.
    bgm:           'assets/audio/bgm.m4a',
    bgmVolume:     0.12,    // 기본 BGM 볼륨(항상 페이지 음성보다 작게)
    bgmDuckVolume: 0.045,   // 페이지 음성 재생 중 낮춘 BGM 볼륨
    bgmFadeMs:     400,     // duck/unduck 페이드 시간(ms, 300~500 권장)
  },

  /* --- 페이지별 AI 안내 음성 (v0.10.6-beta) ---------------------------
   * PAGE 번호(사용자 표시 1~14) → 음성 파일 경로. scenes 인덱스 = PAGE − 1.
   * 각 PAGE 진입 시 1회 재생, 페이지 이동 시 이전 음성 즉시 정지(currentTime 0).
   * 원본은 (PAGE N).mp4(비디오+AAC) → 오디오만 무손실 추출한 .m4a(AAC). 파일 없으면 조용히 skip(게임 진행 무영향).
   * ------------------------------------------------------------------- */
  voice: {
    1:  'assets/audio/voice/page01.m4a',
    2:  'assets/audio/voice/page02.m4a',
    3:  'assets/audio/voice/page03.m4a',
    4:  'assets/audio/voice/page04.m4a',
    5:  'assets/audio/voice/page05.m4a',
    6:  'assets/audio/voice/page06.m4a',
    7:  'assets/audio/voice/page07.m4a',
    8:  'assets/audio/voice/page08.m4a',
    9:  'assets/audio/voice/page09.m4a',
    10: 'assets/audio/voice/page10.m4a',
    11: 'assets/audio/voice/page11.m4a',
    12: 'assets/audio/voice/page12.m4a',
    13: 'assets/audio/voice/page13.m4a',
    14: 'assets/audio/voice/page14.m4a',
  },

  /* --- 관리자(Admin) 모드 (v0.4.0-beta) -------------------------------
   * 운영자용 대시보드. 일반 사용자에게는 노출되지 않습니다.
   *   password : 관리자 비밀번호 (여기서 쉽게 변경)
   *   gearEnabled : 우측 하단 톱니바퀴 표시 여부 (false 면 완전 숨김)
   *   firebase : 추후 Firebase 연동 설정 자리 (null 이면 LocalStorage 사용)
   * ------------------------------------------------------------------- */
  admin: {
    password: 'eslo2024',
    gearEnabled: true,
    firebase: null,
    title: '관리자 대시보드',
  },
};
