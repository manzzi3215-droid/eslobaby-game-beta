# CLAUDE.md — 이슬로(eslo) 베이비 미니게임 개발 가이드

이 파일은 Claude Code가 이 프로젝트를 이어서 작업할 때 **반드시 먼저 읽어야 하는** 개발 가이드입니다.

## 프로젝트 개요

이슬로 베이비페어 현장에서 고객 참여용으로 사용할 웹 기반 미니게임입니다.

목적은 부모 고객이 게임을 하면서 자연스럽게 아래 메시지를 이해하도록 하는 것입니다.

1. 일반 바디워시는 피부에 계면활성제가 남아 자극을 유발할 수 있다.
2. 이슬로는 피부에 남지 않는 생분해 계면활성제 컨셉이다.
3. 우리 아이 피부에는 이슬로 베이비가 더 안심된다는 인식을 남기는 것이 목표다.

## 현재 버전

**v0.9.1-beta** (버전은 `config.js`의 `meta.version` 및 `CHANGELOG.md`와 항상 일치시킬 것)
※ v0.9.1-beta(patch): **PAGE 6→7 전환 오류 수정 + PAGE 7·12·마지막 페이지 디자인 정리**. 흐름/페이지 순서/문구/게임 로직 불변.
  - **PAGE 6→7 수정**: `isInteractiveTarget`에서 `.info-video, video` 제거 + `renderVideo`의 "영상 탭=재생/정지 토글" 핸들러 제거 → 영상 영역 탭도 다음으로 이동(다른 페이지와 동일). 영상 재생/정지는 좌측 ▶/⏸ 버튼(`applyPauseState`)으로만 유지.
  - PAGE 7: `.eslo-hero-single`/`.eslo-product-name` 확대. `esloKeywords` 순서 변경(생분해→안심 베이비케어→피부에 남지 않는 계면활성제). `.kw-bubble`=흰색 비정형 물방울(흰 배경+얇은 파란 border, 3개 모두 줄바꿈, blob 라디우스), 제품과 겹침 방지 폭 조정.
  - PAGE 12: `renderCompare`에서 'VS'(`.compare-vs`) 삭제. `makeCard`에 제품 오버레이 추가 → `.compare-figure`(relative) 안에 `.compare-prod`(absolute, 오른쪽 엉덩이) — 일반=normal_wash / 이슬로=eslo-bath, 아이보다 작게.
  - 마지막 페이지: `.ending-logo` 축소+상하 여백. `brandFinalDesc` 빈 값(하단 문구 삭제) + `renderBrandFinal`은 desc 있을 때만 렌더.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.1-beta`.
※ v0.9.0-beta(minor): **컨트롤/네비게이션 리팩터** — 콘텐츠/페이지 순서 불변.
  - 컨트롤 순서: **처음으로 / 플레이 / 이전 / 정지 / 다음**(`buildControlPanel`). `이전`=`goPrev`(index 0 비활성), `다음`=`goNext`(마지막 비활성). 둘 다 `clearScene→index±→irritationForIndex→renderScene`.
  - **자동 페이지 전환 전부 삭제**(`setTimer(next,…)`·`next()`·`queuedNext` 제거, 드래그 onComplete proceed 제거). 이동은 화면 탭 또는 다음/이전 버튼만.
  - **탭 진행**(`tapAdvance`): screen의 pointerdown/up. `isInteractiveTarget`(.ctrl-btn/button/a/.drag-tool/.drag-hint/.eslo-hero-single/.info-product)면 이동 금지 + 이동거리 >12px면 탭 아님(드래그 오인 방지). ※ v0.9.1: `.info-video/video` 제외 → 영상 탭도 이동.
  - **플레이/정지**(`applyPauseState`): 현재 화면 `<video>` pause/play + `.is-anim-paused`(CSS animation-play-state). 페이지 이동과 무관. `paused`는 renderScene에서 유지, 처음으로/startGame에서 초기화. ※ v0.9.1: 영상 탭=토글 제거(영상 탭은 이동), 재생/정지는 ▶/⏸ 버튼만.
  - `dragFallback`(9s)만 유지(드래그 자체 완료, 페이지 이동 아님).
※ v0.8.0-beta(minor): 신규 2페이지(PAGE 10-1 생분해 설명 placeholder, PAGE 10-2 비포/애프터 비교) + PAGE 5·7·8·9·10 개선. **총 13페이지.**
  - PAGE 10-1 `biodegradeInfo`(type `video`): `scene.video` 미지정 → `renderVideo`가 video 요소/요청 없이 placeholder(`.info-video.is-placeholder`, 4:3, "영상 준비 중") 렌더. 추후 `scene.video` asset key만 넣으면 영상 교체.
  - PAGE 10-2 `beforeAfterCompare`(type `compare`, `renderCompare`): 좌 baby-sad(일반 바디워시)/VS/우 baby-happy(이슬로) 비교 카드. `.compare-*` 페이지 한정 클래스, 375px 2열 유지·≤360px 세로 스택.
  - PAGE 5 경고 제목 확대(`.warning-scene .card-title`)·본문 2줄·baby-sad 계면이 5. PAGE 7 단일 제품(eslo-bath)+말풍선 키워드 3(`.kw-bubble`)+제품명+floating. PAGE 8/9 문구 2줄. PAGE 10 '생분해' 강조(`.success-emph`).
  - 강조: `.key-emph`(키컬러·정적 glow·모션 없음, 10-1/10-2), `.success-emph`(shine 1회), `.shake-emph`(P5-1). 모두 reduced-motion 대응.
※ v0.7.0-beta(minor): STEP1 흐름 확장 + 계면이 배치 개선 + 영상 설명 페이지.
  - PAGE 1-1(신규 `info` 타입): "먼저 일반 바디워시를…" + `normal_wash.png`.
  - PAGE 2 `bodywashUse`=일반 바디워시 거품, PAGE 3 `bodywashRinse`=샤워 씻어냄. 제품 `products.bodywash`=normal_wash, `products.shower`=washhead(핸드 샤워헤드). 샤워기 `toolLeft/toolTop`으로 좌측 이동(얼굴 비가림).
  - 계면이: `addSurfactants`가 **안전 슬롯**(BODY_SLOTS/PANEL_SLOTS)+얼굴보호(x16~84,y28~56)+좌우균형+충돌검사. PAGE 2·3·5는 `MOOD_FACES` playful/clinging/residue=[1,2,4](gyemeon2/3/5). PAGE 5(warning)에 baby-sad 주변 계면이 5개(mood-float).
  - PAGE 5-1: 기존 `residue`를 `type:'video'`로 교체 → `prof.mp4`(autoplay/muted/loop/playsinline, `renderVideo`, `cleanups`로 lifecycle). 문구 마지막 `자극을 유발해요!`는 `.shake-emph`(emphShake 2회, reduced-motion 대응). prof.mp4는 sw precache 제외(8MB).
※ v0.6.1-beta(패치): Page1(MISSION) 문구 + 대표 이미지 `baby-wonder.png`(`.child-wonder`).
※ `feature/motion-test` 브랜치에서 진행한 **안정 릴리스**입니다(실험 표기 -motion-test → -beta 로 전환).
  욕실 배경 시스템·반응형 배경·**KEY COLOR #6DA1FF 디자인 시스템**을 도입했으며, 게임 로직/문구/관리자 기능은 불변.
  모션인식·Idle 애니메이션·효과음 등 추가 기능은 다음 버전 예정.
※ **배경(v0.6.0-beta)**: 세로(모바일) `assets/images/background-v2.png`, 가로(데스크톱) `assets/images/background-wide-v2.webp`.
  전환은 CSS `@media (min-aspect-ratio: 1/1)` + `--bg-portrait`/`--bg-wide`(game.js `init`), 경로는 `config.assets.background`/`backgroundWide`.
  (Higgsfield outpaint로 가로 확장, nano_banana inpaint로 변기 제거. v1 원본 `background.png`/`background-wide.webp`도 보존.)
※ **디자인 시스템(v0.6.0-beta)**: 색 토큰은 `css/theme.css`의 `--key`(#6DA1FF)/`--key-deep`/`--key-soft`/`--sky-*`/`--mint-*` 기준.
  컴포넌트 리파인은 `css/game.css` 맨 끝 "v0.5.0-motion-test 브랜드 리파인" 레이어(카드/버튼/게이지/타이포/앰비언트).
  STEP별 `theme-*`(game.js `SCENE_THEME`)는 전부 키컬러로 수렴(경고=소프트 레드만 예외).
※ 폰트는 **Jua**(Google Fonts, index/share 로드). 로고는 투명 PNG(흰 배경 flood-fill 제거).
  제품 3종은 가로 일렬(`buildProductHero`). 문구 줄바꿈은 config `\n`.
※ 이 저장소는 운영본과 분리된 **beta 미러**입니다.
- STEP 화면 민감도 게이지는 사용자 화면에 미표시(내부 로직/`buildGauge`는 유지).
- STEP 연출: 제품(바디워시/이슬로) 문지르면 거품+계면이 동시 생성(`surfactantGrow`).
  STEP1 샤워는 거품만 제거(계면이 잔류), STEP3 샤워는 거품+계면이 모두 제거.
- 각 화면 하단에 `Page N / 10` 표시(`.page-num`).
- **관리자 대시보드**(v0.4.0-beta): 우측 하단 톱니바퀴 → 비밀번호(`config.admin.password`) → 통계.
  수집은 `js/analytics.js`(LocalStorage `eslo_admin_v1`, Firebase 확장 가능), UI는 `js/admin.js`.
  game.js 훅은 startGame/renderScene/renderGate 3곳뿐(게임 로직 불변).
- **연출(v0.4.1-beta)**: 화면 전환(페이드+슬라이드), 계면이 감정 모션(outer+inner 래퍼, `surfactantMood`),
  거품 opacity 전환·떠오름, 샤워 물줄기(`.water-drop`), 경고 엣지 글로우/흔들림(`.warning-scene`), 성공 팝.
  전부 transform/opacity 기반(경량). 애니메이션은 백그라운드 탭에서 멈춰 보일 수 있으나 실제 브라우저는 정상.
- **실제 에셋(v0.4.2-beta)**: 아기(`baby-basic/happy/sad.png`, 481×705 세로형 → `.child-body` aspect-ratio 보정)·
  계면이(`gyemeon1~5.png` 표정 무작위 + mood별 표정 풀, `config.assets.gyemeon`) 적용.
  **Scene 8(esloRinse) 씻김 순간 `gyemeon6-sad.png` 로 표정 교체**(game.js `washSurfactants` 의 `washFaceSrc`).
  placeholder(SVG) fallback 구조 유지.

## 실행 방식

- `index.html` 더블클릭으로 실행
- 빌드 도구 없음
- 서버 불필요
- 오프라인 실행 가능

## 주요 구조

| 파일 | 역할 |
|---|---|
| `config.js` | 문구, 이미지 경로, 타이밍, 옵션 관리 |
| `js/scenes.js` | 게임 단계 흐름 관리 |
| `js/game.js` | 장면 렌더링, 자동 진행, 게이지, 인터랙션 관리 |
| `js/interactions.js` | 드래그/터치 처리 |
| `js/components.js` | placeholder/SVG 컴포넌트 관리 |
| `css/theme.css` | 색상, 폰트, 공통 디자인 변수 |
| `css/game.css` | 게임 화면 레이아웃 및 애니메이션 |
| `css/share.css` | 공유 페이지 전용 스타일 (v0.2.6~) |
| `css/admin.css` | 관리자 대시보드 스타일 (v0.4.0-beta) |
| `js/analytics.js` | 플레이 통계 수집 (LocalStorage, Firebase 확장 가능) (v0.4.0-beta) |
| `js/admin.js` | 관리자 대시보드 UI(톱니바퀴→로그인→통계) (v0.4.0-beta) |
| `js/sfx.js` | 효과음(Web Audio 합성, config.sfx.files 로 교체 가능) (v0.4.3-beta) |
| `assets/sounds/` | 효과음 음원 자리(교체용, README 참고) (v0.4.3-beta) |
| `assets/` | 추후 실제 이미지, 효과음, 로고 파일 저장 |
| `share.html` | 공유용 QR 페이지 (v0.2.6~) |
| `js/qrcode.js` | 외부 라이브러리 없는 QR 코드 생성기 (v0.2.6~) |
| `js/share.js` | 공유 페이지 로직 (v0.2.6~) |
| `manifest.webmanifest` / `sw.js` | PWA 매니페스트 · 서비스워커(기본 캐싱) (v0.2.6~) |
| `.github/workflows/pages.yml` | GitHub Actions Pages 자동 배포 |

## 핵심 유지 원칙

1. 기존 기능을 임의로 삭제하지 않는다.
2. 이미지와 게임 로직은 분리한다.
3. 모든 이미지와 문구는 나중에 쉽게 교체 가능해야 한다.
4. config 기반 구조를 유지한다.
5. 모바일/세로 화면 대응을 유지한다.
6. 오프라인 실행 가능 상태를 유지한다.
7. STEP 클릭 이동 기능은 유지하되, config 옵션(`options.stepNavigationEnabled`)으로 잠금 가능해야 한다.
8. 처음으로/플레이/정지/다음 컨트롤은 유지한다.
9. 변경 시 README.md와 CHANGELOG.md를 함께 갱신한다.
10. 작업 완료 후 반드시 git status를 확인한다.

## 브랜드 표기

브랜드명은 반드시 **`eslo`** 입니다. `esllo`가 **아닙니다**.

잘못된 표기가 남지 않도록 주의해주세요. (한글 표기는 "이슬로")

## 현재 게임 흐름 (v0.2.5 — MISSION + STEP 3단계 구조)

Scene(내부 관리용)과 STEP(사용자 표시용)은 분리되어 있습니다.
사용자에게 보이는 STEP은 **STEP1 / STEP2 / STEP3** 3개뿐이며,
진행 표시는 `MISSION → STEP1 → STEP2 → STEP3 → MISSION 성공!` 5개 항목입니다.
(v0.3.0~ 화면은 **유리카드 + STEP별 컬러 테마**. 디자인 시스템은 `css/game.css` 하단
"v0.3.0 디자인 시스템" 레이어에 모여 있고, STEP별 테마는 game.js `SCENE_THEME` 이 `.screen` 에
`theme-*` 클래스로 부여. 카드 상단 헤더=처음으로+배지, 하단=페이지 점, 좌측 고정 컨트롤=운영자용.
※ 디자인만 리뉴얼했고 기능/구조/문구는 불변.)

1. 카카오 채널 추가 (게이트 — STEP 배지 없음)
2. MISSION — "민감한 우리 아이 샤워, 어떤 제품을 써야 좋을까요?"
3. **STEP1 ①** 바디워시 거품 (게이지 0%→50%) ← v0.3.1: STEP1을 2단계로 분리
4. **STEP1 ②** 샤워 헹굼 (게이지 50%→100%, 빨강+경고) — STEP2/3과 동일한 제품→샤워 UX
5. 설명 — 민감도 100% 경고 (배지·제목 없음, 게이지만)
6. 설명 — 나쁜 계면활성제 ("…계면활성제가 피부에 남아 자극을 유발했어요!")
7. 설명 — 이슬로 소개
8. **STEP2** 이슬로 사용 (게이지 100%→50% 주황, 계면이 절반 제거)
9. **STEP3** 샤워 (게이지 50%→0% 파랑, 계면이 모두 제거)
10. MISSION 성공! (웃는 아이 + 반짝임, 제품 이미지 없음)
11. 최종 브랜드 페이지 (제품 3종 + 브랜드 문구 + 다시하기)
※ STEP1·STEP2 공통 UX: 제품 드래그 → 샤워기 드래그 → 자동 진행. 카드 내부 처음으로 버튼 없음(좌측 컨트롤로 일원화).

※ 장면 문구는 원문 그대로 사용해야 하며 임의 수정(맞춤법 포함) 금지.

## 현재 주요 기능

- 카카오 채널 추가 게이트
- 자동 장면 진행
- 페이지 클릭 이동 (하단 페이지 인디케이터 클릭 / `?step=N` 파라미터)
- 모바일/세로 화면 대응
- 카드뉴스형 화면 (v0.2.7~)
- 민감도 게이지 (rise/hold/fall 모드)
- 계면이 캐릭터 placeholder
- 처음으로/플레이/정지/다음 버튼
- 이미지 교체 가능한 assets 구조
- Git 버전 관리 (원격: https://github.com/manzzi3215-droid/eslobaby-game2.git )
- GitHub Pages(Actions) 배포 · PWA · 공유 QR 페이지(share.html)

## 버전 관리 규칙

- 작은 문구/스타일 수정: **patch** 버전 증가 (예: v0.2.3 → v0.2.4)
- 기능 추가: **minor** 버전 증가 (예: v0.2.x → v0.3.0)
- 최종 배포 안정화: **v1.0.0**

작업 완료 후 아래를 수행합니다.

1. 변경 파일 요약
2. README.md 갱신
3. CHANGELOG.md 갱신
4. git status 확인
5. 필요 시 커밋 메시지 제안

## 커밋 메시지 규칙

예시:

- `feat: add sound effects for game interactions`
- `fix: correct sensitivity gauge transition`
- `style: refine mobile portrait layout`
- `docs: add project guide for Claude`
- `chore: archive draft assets`

## 앞으로 우선순위

1. 게임 속도와 자동 전환 타이밍 조정
2. 드래그 조작감 개선
3. 애니메이션 강화
4. 효과음 추가
5. 실제 제품 이미지 적용
6. 계면이 캐릭터 퀄리티 개선
7. 베이비페어 운영용 관리자/통계 기능 검토

## 주의사항

- 이미지는 현재 placeholder 중심으로 유지한다.
- AI 생성 이미지 퀄리티가 낮을 경우 무리해서 적용하지 않는다.
- 최종 이미지는 실제 제품 누끼 또는 디자이너 제작 파일로 교체할 예정이다.
- 새 PC에서 작업 시작 전에는 반드시 `git pull`을 먼저 한다.
- 작업 종료 전에는 반드시 commit/push 여부를 확인한다.
