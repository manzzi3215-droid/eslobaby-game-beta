# CHANGELOG

이 프로젝트의 모든 주요 변경 사항을 기록합니다.
버전은 `major.minor.patch` (예: v0.2.0) 형식을 따릅니다.

- **major** : 큰 구조 변경 / 호환 깨짐
- **minor** : 기능 추가
- **patch** : 버그 수정 / 소소한 개선

> 원칙: 기존 기능은 임의로 삭제하지 않고, **추가·개선** 방식으로 발전시킵니다.

---

## [v0.10.21-beta] - 2026-07-22
### 관리자 대시보드 개편(비번·간소화·날짜별 통계·일 마감/다운로드) + PAGE 12 `선택`·손가락 디자인
**게임 진행·자동 전환·영상·음성·PAGE 12 정답/오답 로직·PAGE 13 이동·일반 사용자 성능에는 영향 없음.**

### 1. 관리자 비밀번호
- 기본 비밀번호 **`0000`** 적용(`config.admin.password`). 코드 한 곳(config)에서 관리.
- **비밀번호 변경 기능** 추가(대시보드 접이식 `설정`): 현재→새→새 확인 검증(현재 일치·확인 일치·빈 값 불가·숫자 4자리). 변경분은 LocalStorage **`eslo_admin_pw_v1`**(통계와 별도 키)에 저장 → 새로고침/재실행·**통계 초기화·일 마감과 무관하게 유지**. 최초/미설정 환경은 `0000`. 입력은 `type=password`.
- ※ 이 비밀번호는 서버 인증이 아닌 **클라이언트측 간단 접근 방지 장치**입니다(서버/로그인 미추가).

### 2. 대시보드 간소화
- **STEP 퍼널·화면별 체류시간·기기 분포**를 렌더링 + 관련 수집 계산까지 완전 제거(공용 로직·게임 진행·핵심 수집은 유지). 과거 LocalStorage 데이터가 남아도 오류 없이 동작.
- 상단: 선택 날짜 + 핵심 4지표(플레이 수·완료 수·완료율·평균 플레이 시간). 아래: 전체 누적 플레이/완료(작게). `최근 오류 로그`는 접이식(없으면 `최근 오류 없음 ✓` 한 줄). 360px 가로 스크롤 없음.

### 3. 한국시간 날짜별 통계
- **원인**: 기존 `analytics.js`는 단일 전역 카운터(`totalPlays/completes/completeTimeMs`)에 저장하고 `playsByDate`만 날짜별(그마저 '시작 수'만). 완료/시간/완료율이 전역이라 날짜 분리 불가. `today()`도 브라우저 로컬 TZ.
- **구조 v2**: `byDate[YYYY-MM-DD] = { plays, completes, completeTimeMs, correct, wrong, errors, updatedAt, closed, closedAt, closedAtMs }` + `totals`(전체 누적) + `legacy`. 날짜 키는 **Asia/Seoul**(Intl `en-CA`, UTC 오차 방지). **완료는 게임 시작 날짜 기준** 집계(자정 전 시작·자정 후 완료 → 시작일).
- PAGE 12 정답/오답 수·오류 수는 데이터에 보존(기본 대시보드 미노출). `game.js`에 `Analytics.recordAnswer` 훅(try/catch).

### 4. 기존 데이터 마이그레이션(1회)
- v1 감지 시 `playsByDate`(날짜 아는 시작수)만 `byDate`로 이관, **날짜를 알 수 없는 완료/시간은 `legacy`로 별도 보존**(오늘 등 특정 날짜에 임의 합산 안 함). 전체 누적은 기존 값과 연속. 마이그레이션 결과 1회 저장(재실행 없음). 손상/누락 데이터도 방어(오류 없이 기본값).

### 5. 날짜 선택
- `‹ [날짜 input] ›`(기본 오늘, 이전/다음 버튼, 모바일 date input). 데이터 없는 날짜는 오류 대신 `수집된 데이터가 없습니다`. 마감된 날짜는 `마감 완료` 배지.

### 6. 일 마감 + 파일 다운로드
- `[선택 날짜] 마감`(주 실행): 확인창(`YYYY-MM-DD 통계를 마감하고 파일로 저장할까요?`) → 스냅샷 → 마감 표시·시각 기록 → **CSV 다운로드** → 성공/실패 안내. **삭제·초기화 아님**(마감 후에도 조회 가능).
- 재마감/재다운로드 안전(플래그만 변경 — 중복 합산 없음), 같은 날짜 재다운로드 허용. 마감 후 추가 플레이 발생 시 `마감 후 추가 데이터 있음` 배지 + `다시 마감`. 다운로드 실패해도 통계 보존. `통계 초기화`는 위험 작업으로 분리(강한 확인, 비밀번호는 유지).
- **다운로드 방식 = CSV(UTF-8 BOM)**: 현재 XLSX 생성 라이브러리가 없고 SheetJS(수백 KB) 추가는 오프라인 실행·로딩·SW 캐시에 부담 → CSV 채택. Excel에서 한글 정상, `[일일 요약]`+`[전체 누적]` 블록. 파일명 `eslobaby_game_stats_YYYY-MM-DD.csv`. Blob+`a[download]` 순수 클라이언트(서버/Firebase/CDN 없음).

### 7. PAGE 12 디자인
- `선택` 강조: **남색 배경 칩·패딩·라운드·그림자 제거** → 본문에 자연스럽게 이어지는 텍스트. 연노랑 박스 대비 위해 노랑 → **선명한 딥블루 `#1E56B0`**(AA), `font-size:1.06em`·굵기 유지. **`pickBob` 모션 속도·범위 불변**, reduced-motion 처리 유지. 문구 2줄·`선택해주세요` 붙여쓰기 유지.
- 손가락 이모지 `☝️`: 한 단계 **확대**(`clamp(24px,5.2vw,36px)`, ≤360 `22~26`, 가로 저높이 `22~28`). 위치·`fingerTap` 모션·`pointer-events:none`·`aria-hidden` 유지. 문구/카드 비가림, 화면 밖 잘림 없음.
- OR·노란 박스·카드 디자인/크기·정답/오답·정답 전 잠금·`page12.m4a`·PAGE 13 이동·카드 터치 영역 전부 불변.

### 기타
- `sw.js` `CACHE_NAME` = `eslo-game-v0.10.21-beta`(신규 자산 없음). `config.js`/README/CLAUDE 버전 일치.

---

## [v0.10.20-beta] - 2026-07-22
### PAGE 12 선택형 퀴즈 디자인 개선 — 카드 사이 `OR` · 노란 선택 CTA 박스 · `선택` 강조 모션 · 클릭 손가락
**퀴즈 로직·정답/오답 처리·카드 클릭/터치 영역·`quizLocked`(정답 전 이동 차단)·안내 음성(page12.m4a)·자동 진행·컨트롤·다른 페이지 전부 변경 없음(PAGE 12 표시/스타일만).**

### 1. 두 선택 카드 사이 `OR` 구분 표시 (장식·비클릭)
- `js/game.js renderCompare`: `left`/`right` 카드 사이에 `div('compare-or')`(텍스트 `OR`, `aria-hidden`) 삽입.
- `css/game.css` `.compare-or`: 기본/세로 2열에서는 `.compare-row`(신규 `position:relative`)의 gap 정중앙에 **절대배치**(`left/top:50%` + `translate(-50%,-50%)`) → 좌우 어느 카드에도 치우치지 않음. 흰 원형 배지 + 키 블루(`--key-deep`) 텍스트·`--key-soft` 테두리(기존 파란 UI 톤). `pointer-events:none`·`z-index:3` 로 **카드 클릭 비간섭**.
- 카드 겹침 방지: `.compare-row` gap 을 `clamp(40px,8vw,60px)`(세로 `clamp(34px,9vw,48px)`)로 넓혀 배지 공간 확보.
- ≤360px 세로 스택에서는 `.compare-or`를 `position:static`(정상 흐름)으로 전환 → 두 카드 사이에 자연스럽게 배치. 가로/작은 화면 반응형 유지.

### 2. `선택` 단어 강조 + 부드러운 모션
- `renderCompare`: 2줄째(`안심 워시를 선택해주세요.`)에서 `선택`만 `<span.quiz-pick-emph>`로 분리(나머지는 DOM 텍스트).
- `.quiz-pick-emph`: 딥네이비 칩(`#1E3A5F`) 위 밝은 로고-'베이비' 옐로우(`#FFD24A`) 글씨 → 밝은 노랑 + 한눈에 + 노란 박스 위 AA 대비 동시 충족. `선택`에만 `pickBob`(커졌다 돌아오는 1.9s ease, translateY -2px + scale 1.06) 적용. 과하지 않고 정적에 가까운 절제된 모션.

### 3. 하단 안내 문구 → 밝은 노란 라운드 박스
- `.compare-quiz-hint`: 반투명 흰 박스 → **연노랑 그라데이션**(`#FFF7D1→#FFEEA6`, 탁하지 않게) + 웜 소프트 그림자 + 둥근 모서리. 문구는 기존 2줄 구조(`quizSelect` = `우리 아이에게 꼭 필요한` / `안심 워시를 선택해주세요.`) 그대로 재사용(중복 표시 없음).
- 텍스트: 노란 배경 대비 위해 검정 대신 **딥네이비/딥블루**(1줄 `#1d3b5c`, 2줄 `#14324f`). 2줄이 1줄보다 크고 굵게(기존 크기 유지). 카드 압박 방지 위해 패딩/높이 기존 수준 유지.

### 4. 클릭 유도 손가락 아이콘
- `.compare-quiz-finger`(`☝️`, `aria-hidden`·`pointer-events:none`): 노란 박스(`position:relative`) **우측 상단 바깥**으로 살짝 걸치게 절대배치(`top:-16~-10px`, `right:-8~-3px`). 문구/카드 비가림. ≤360px·가로 저높이에서 크기·오프셋 축소해 화면 밖 잘림 방지. 아주 약한 탭 모션(`fingerTap` 2.6s, `선택` 모션과 리듬 분리).

### 접근성/모션
- `OR`·손가락은 장식(`aria-hidden`, 비클릭). `prefers-reduced-motion: reduce` 에서 `.quiz-pick-emph`·`.compare-quiz-finger` 애니메이션 제거(정적 표시 유지).

### 기타
- `sw.js` `CACHE_NAME` = `eslo-game-v0.10.20-beta`(신규 자산 없음 — 이모지/CSS/DOM 만).
- `config.js` `meta.version` = `v0.10.20-beta`, README/CLAUDE 버전 표기 일치.

---

## [v0.10.19-beta] - 2026-07-22
### PAGE 5 경고 문구 위치·간격 정리 · PAGE 12 선택 CTA 골드 강조
**두 페이지 모두 텍스트/폰트/애니메이션/음성/효과음/퀴즈 로직·카드·자동 진행은 변경 없음(위치·간격 / 색상만).**

### 1. PAGE 5 경고 문구 위치·간격 (위치·여백만)
- 문제: `경고! 피부 자극 위험!`(제목)이 카드 상단에 너무 붙고, 아래 설명(`.warning-sub`)과 간격은 벌어짐. 특히 `.screen-body`의 세로 center 로 큰 화면일수록 제목↔설명 간격이 과도(데스크톱 ~82px, Flip Pro 유사).
- 수정(`css/game.css`, `.warning-scene` 스코프): `.warning-scene .card-title { margin-top: clamp(6px,1.5vh,16px); margin-bottom: clamp(6px,1.2vh,12px) }`(제목 살짝 내림 + 설명과 간격), `.warning-scene .screen-body { justify-content: flex-start }`(설명을 제목 바로 아래로 → 큰 화면에서도 벌어지지 않음), `.warning-scene .stage { margin: auto 0 }`(아기 무대는 남은 공간에서 다시 세로 중앙).
- 결과(실측): 제목↔설명 간격 375=19·360≈·844×390=16·1280×800=20·720×1280(Flip Pro)=21px 로 **통일**, 제목은 카드 상단에서 살짝 내려옴, 아기 무대 중앙·안 잘림. **내용/폰트/색/애니메이션/음성/경고음/자동 진행 불변, 다른 페이지 공통 `.card-title`·`.screen-body`·`.stage` 무영향(스코프).**

### 2. PAGE 12 선택 CTA 색상 강조 (색상만 — 노란/골드 채택)
- `안심 워시를 선택해주세요.`(`.compare-quiz-hint-action`)의 **색상만** 딥 블루 `var(--key-deep)` → **따뜻한 앰버-골드 `#C8820A`**(+ 그림자 tint 를 웜 다크로). 크기/굵기(900)/박스/위치/카드는 그대로.
- 노란/골드 vs Glow 중 **골드 채택 이유**: PAGE 12가 전체 블루 톤(제목·카드·정답 글로우·기존 CTA 모두 블루)이라 ①블루 Glow 는 차별화가 약하고 정답 카드 파란 글로우와 혼동 위험, ②따뜻한 골드는 블루 일색에서 즉시 눈에 띄고 정답 글로우와 명확히 구분·정적(애니 없음)·형광 아님. 대비 3.16:1(라지 볼드 AA 통과, 박스가 라이트 블루 위라 실제 더 높음). 밑줄/버튼형 아님.

### 3. 버전
- `config.js` `meta.version`=`v0.10.19-beta`, `sw.js` `CACHE_NAME`=`eslo-game-v0.10.19-beta`. **CSS만 변경, 신규 오디오/이미지 없음.**

---

## [v0.10.18-beta] - 2026-07-22
### PAGE 12 선택 안내 문구 변경 · 카드 아래 배치 · 2번째 줄 행동 강조
**상단 제목·질문·카드 라벨·퀴즈 정답/오답 로직·효과음·자동 전환·BGM은 변경 없음(안내 문구 텍스트·DOM·스타일만).**

### 1. 텍스트
- `config.js` `hints.quizSelect`: `두 제품 중 안심하고 사용할 수 있는\n워시를 선택해주세요.` → **`우리 아이에게 꼭 필요한\n안심 워시를 선택해주세요.`**(2줄).
- 상단 제목 `민감한 우리 아이 피부` / 질문 `생분해 케어는 선택이 아니라 필수!`는 **page12.m4a 음성 일치 위해 유지**(변경 금지 준수).

### 2. 위치·DOM 구조
- `js/game.js` `renderCompare`: 선택 안내 문구를 두 카드 **아래**로 이동 → DOM 순서 **제목 → 카드(`.compare-row`) → 안내**. `.screen-body`(flex-column·center)의 자연 흐름 안에 배치(절대 위치 아님), 두 카드 전체 중앙 정렬.
- 2줄을 **별도 요소로 분리**: `div('hint compare-quiz-hint')` 안에 `<span class="compare-quiz-hint-sub">`(1줄) + `<strong class="compare-quiz-hint-action">`(2줄). config `\n` 기준 분리. `makeHint`는 미변경(공통 구조 보존), `.hint` 베이스 클래스만 재사용. 스크린리더는 두 요소를 자연스럽게 이어 읽음. 카드 클릭/키보드 이벤트와 무관.

### 3. 스타일 (`css/game.css`, PAGE 12 스코프)
- `.compare-quiz-hint`: 둥근 반투명 흰 박스 유지, `margin: clamp(4px,1vh,10px) auto 0`(카드 아래 소폭 간격, `.screen-body` gap 에 더함), `animation:none`.
- `.compare-quiz-hint-sub`(1줄 보조): `font-size: clamp(14px,2.1vw,20px)`, `font-weight:700`, `color:#5f7fae`(중간 톤 블루).
- `.compare-quiz-hint-action`(2줄 강조): `font-size: clamp(17px,2.6vw,26px)`(더 큼), `font-weight:900`(더 굵음), `color:var(--key-deep)`(#4E86EC, 선명한 딥 키 블루·대비↑), 은은한 text-shadow(정답 카드 파란 글로우보다 약함). 밑줄/버튼형 아님, 깜빡임 없음.
- 360px·844×390 미디어쿼리로 각 줄 1줄 유지·footprint 최소화.

### 4. QA
- 텍스트/2줄(각 1줄)/카드 아래 배치·중앙 정렬·음성 유지 확인. 반응형 360/375/390/412/844×390/1024/1280 전부 각 줄 1줄·겹침 없음(360은 카드 세로 스택 후 2번째 카드 아래, 844×390은 카드 100% 노출로 선택 용이). 2줄째가 1줄째보다 크고 굵고 선명(대비↑). 공통 `.hint` 15px 유지. 퀴즈 정답→PAGE 13·오답 유지·재진입 초기화·키보드·버튼 숨김·빈 공간 탭 차단 유지.
- `config.js` `meta.version`=`v0.10.18-beta`, `sw.js` `CACHE_NAME`=`eslo-game-v0.10.18-beta`. **신규 오디오/이미지 없음(텍스트·DOM·CSS만).**

---

## [v0.10.17-beta] - 2026-07-22
### PAGE 12 선택 안내 문구 강조·2줄화·카드 위 배치
**상단 제목·질문·카드 라벨·퀴즈 정답/오답 로직·효과음·BGM·자동 전환은 변경 없음(안내 문구 텍스트·스타일만).**

### 1. 텍스트
- `config.js` `hints.quizSelect`: `두 워시 중 하나를 선택해주세요.` → **`두 제품 중 안심하고 사용할 수 있는\n워시를 선택해주세요.`**(2줄).
- 상단 제목 `민감한 우리 아이 피부` / 질문 `생분해 케어는 선택이 아니라 필수!`는 **page12.m4a 음성과 일치 위해 그대로 유지**(변경 금지 준수).

### 2. 배치·구조
- `js/game.js` `renderCompare`: 선택 안내 문구를 **카드 위**로 이동(DOM 순서 제목 → 안내 → 카드) → 읽은 직후 두 카드 인식. `makeHint`(div.hint) 재사용 + **`compare-quiz-hint` 클래스** 부여(공통 `.hint` 스타일 미변경, PAGE 12에만 스코프). 카드 클릭·키보드 이벤트, 정답/오답 로직은 손대지 않음.

### 3. 스타일 (`css/game.css` `.compare-quiz-hint`, base `.hint` 뒤 선언)
- `white-space: pre-line`(config `\n` → 2줄), `text-align: center`, `font-size: clamp(17px,2.5vw,25px)`(공통 대비 약 +18%), `font-weight: 800`, `line-height: 1.38`, `color: var(--key-deep)`(딥 블루), `max-width: min(94%,30rem)`, 둥근 반투명 흰 박스(`background: rgba(255,255,255,.74)` + `border-radius` + 은은한 shadow), 반복 애니 없음(`animation:none`).
- 360px: `font-size: clamp(15px,4.3vw,18px)`·패딩 축소로 **2줄 유지(3줄 깨짐 없음)**. 844×390 낮은 가로: 세로 footprint 최소화(카드 세로 공간 확보, 겹침 없음).

### 4. QA
- 텍스트/2줄/음성 일치, 카드 위 배치·겹침 없음, 공통 `.hint` 영향 없음(15px 유지) 확인. 반응형 360/375/390/412/844×390/1024/1280 전부 2줄·겹침 없음(가로 844×390은 카드 하단 ~8% 스크롤, Flip Pro 등 세로 여유 화면은 무관). 퀴즈 정답→PAGE 13 이동·오답 유지·재진입 초기화·키보드 선택·버튼 숨김 유지.
- `config.js` `meta.version`=`v0.10.17-beta`, `sw.js` `CACHE_NAME`=`eslo-game-v0.10.17-beta`. **신규 오디오/이미지 파일 없음(텍스트·CSS만).**

---

## [v0.10.16-beta] - 2026-07-22
### PAGE 12 화면 문구를 안내 음성과 일치하도록 원복
**퀴즈 기능·카드·오답/정답 연출·잠금·BGM·자동 전환 등 v0.10.15 로직은 변경 없음(문구만 원복).**

- 문제: v0.10.15에서 PAGE 12 화면 텍스트를 `소중한 우리 아이 피부`/`어떤 선택으로 지켜주시겠어요?`로 바꿨으나, 안내 음성 `page12.m4a`(v0.10.6 제작)는 이전 문구를 그대로 읽어 **화면 텍스트와 음성이 불일치**.
- 배경: 14개 안내 음성은 사용자 제공 외부 TTS라 **원본 나레이터 목소리를 동일 복제 불가** → 음성을 새로 만드는 대신 화면 문구를 음성에 맞게 원복(사용자 선택).
- 수정: `config.js` `compareLead` → **`민감한 우리 아이 피부`**, `compareEmph` → **`생분해 케어는 선택이 아니라 필수!`**(page12.m4a 제작 시점 v0.10.6 문구와 일치, git `ddb0ce9`로 확인).
- 유지: PAGE 12 선택형 퀴즈(정답 선택 시에만 진행)·카드 터치/키보드 선택·오답(부저+흔들림+붉은 경고)/정답(정답음+파란 강조→PAGE 13) 연출·`quizLocked` 잠금·안내 문구 `두 워시 중 하나를 선택해주세요.` 전부 그대로.
- `config.js` `meta.version`=`v0.10.16-beta`, `sw.js` `CACHE_NAME`=`eslo-game-v0.10.16-beta`. 음원·코드 로직 변경 없음(텍스트만).

---

## [v0.10.15-beta] - 2026-07-22
### PAGE 12 선택형 퀴즈(정답 선택 시에만 진행) · 오답/정답 연출 · 문구 수정
**PAGE 5 경보음→음성→PAGE 6 자동 이동·PAGE 6·11 영상 자동재생·PAGE 7·10·13 음성 자동 전환·PAGE 3·4·8·9 인터랙션·BGM 엔진·Flip Pro has-video CSS는 변경 없음.**

### 1. PAGE 12 텍스트 수정
- `config.js`: `compareLead` `민감한 우리 아이 피부` → **`소중한 우리 아이 피부`**, `compareEmph` `생분해 케어는 선택이 아니라 필수!` → **`어떤 선택으로 지켜주시겠어요?`**, 신규 `hints.quizSelect` = **`두 워시 중 하나를 선택해주세요.`**(안내 문구). 카드 라벨(`compareBadLabel`/`compareGoodLabel`)·폰트·컬러·레이아웃은 유지.

### 2. PAGE 12를 선택형 퀴즈로 변경 (정답 선택 시에만 진행)
- `js/scenes.js`: beforeAfterCompare(PAGE 12)에 `quizRequired: true`.
- `js/game.js`: 전역 `quizLocked`(videoGate/interaction/voiceGate 와 동일 패턴). `renderScene` 진입 시 초기화 후 `scene.quizRequired` 면 잠금 → `goNext`/`goPrev`/`goToStep`(페이지점) 전부 차단, `updateCtrlButtons` 가 **다음·이전 버튼 모두 숨김**. `renderCompare` 는 `tapAdvance` 미호출(화면/빈 공간 탭 이동 없음). 처음으로(goHome)는 유지 + `renderGate` 에서 `quizLocked=false`(잠금 잔류 방지).
- 카드 선택: 두 `.compare-card` 에 `role=button`·`tabindex=0`·`aria-label` + `click`/`keydown`(Enter·Space) → **카드 전체(이미지·라벨·배경) 터치/키보드 선택**. 카드 사이 여백·빈 공간은 미선택.

### 3. 오답 카드 연출 (일반 계면활성제 바디워시 = 오답)
- 오답음: `js/sfx.js` `wrong()` — 짧은 2톤 하강 부저(square+lowpass 1.3kHz, ~0.27s, 경보 알람과 구분). Web Audio 합성(신규 파일 없음). 재생 실패해도 시각 피드백 정상.
- 흔들림: `.compare-card.is-wrong-shake { animation: cardShake .4s }`(선택 카드 중심, 소폭 1회). 연속 오답 시 클래스 remove→reflow→add 로 재실행. `prefers-reduced-motion` 시 흔들림 없음.
- 붉은 경고: `.compare-card.is-wrong`(붉은 테두리 `#e0554e` + 외곽광, 화면 전체 플래시 없음). `setTimer`(760ms) 후 원상 복귀(이미지/문구 미가림).
- 오답 후 PAGE 12 유지, 다른 카드 재선택 가능(오답만으로 이동 없음), 안내 문구 유지.

### 4. 정답 카드 연출 (착한 계면활성제 이슬로 생분해 워시 = 정답)
- 정답음: 기존 `success`(밝은 상승 아르페지오) 재사용(`SFX.playFeedback('correct')`).
- 파란 강조: `.compare-card.is-correct { animation: cardCorrect .62s }`(파란 테두리+외곽광, 은은한 1회, 네온/전체 플래시 없음). `prefers-reduced-motion` 시 정적 파란 외곽광 유지.
- 이동: 정답 선택 시 `answered=true`(두 카드 `pointer-events` 잠금) → `cardCorrect` **animationend** 기준 이동, `setTimer`(900ms) 짧은 fallback(reduced-motion/animationend 미발생·오디오 실패 대비). `advanceOnce` = `moved` 가드 + `index===myIndex` 확인 후 `quizLocked=false`→`goNext()` → **PAGE 13 정확히 1회**(중복·PAGE 14 스킵 방지). PAGE 13→14(음성 종료) 기존 유지.

### 5. 오디오/BGM·재진입·정리
- BGM Ducking: `SFX.playFeedback` 가 `duckBGM` → holdMs 후 `!voiceActive` 일 때만 `unduckBGM`(정답→PAGE 13 음성이 이어지면 볼륨 안 튐). 단일 fade 엔진 재사용(기존 음성 Ducking과 충돌 없음).
- 재진입: `renderScene` 이 새 DOM+`quizLocked` 재적용 → 이전 오답 붉은 효과·흔들림·정답 파란 강조·완료 플래그(answered/moved) 모두 초기화, 두 카드 재선택 가능. `clearScene` 이 `stopFeedbackSfx`(오답/정답음)·타이머 정리 → 늦은 animationend/timeout 은 `index` 가드로 무시.
- `js/sfx.js` `stopAllAudio` 에 `killOneShot('wrong')` 추가.

### 6. 버전·캐시
- `config.js` `meta.version`=`v0.10.15-beta`, `sw.js` `CACHE_NAME`=`eslo-game-v0.10.15-beta`. **오답/정답음은 합성 → 신규 오디오 파일 없음(PRECACHE 변경 없음).**

---

## [v0.10.14-beta] - 2026-07-22
### 음성 종료 자동 전환(PAGE 5·7·10) · PAGE 5 경보 알람 · 다음 버튼 표시 회귀 수정 · PAGE 7 문구 위치 재조정
**PAGE 6·11 영상 자동재생·6→7·11→12 자동 이동·PAGE 13 음성 종료 자동 이동·PAGE 3·4·8·9 인터랙션 필수화·BGM·Flip Pro has-video CSS·모바일 레이아웃은 변경 없음.**

### 1. PAGE 1·2·12 다음 버튼 표시 회귀 수정 (원인 규명)
- 원인: v0.10.13에서 `updateCtrlButtons` 의 `lockNext` 에 `|| (curScene && curScene.hideNext)` 를 추가하면서, hideNext 가 없는 장면에서 `lockNext` 가 **`undefined`** 로 평가됨. `classList.toggle('is-disabled', undefined)` 는 force 인자를 무시하고 **토글(깜빡임)** 하므로, updateCtrlButtons 가 여러 번 호출되는 렌더 과정에서 PAGE 1·2·12 등 non-hideNext 페이지의 다음 버튼이 `is-disabled`(opacity:0) 상태로 남아 사라짐. (이전 버튼은 `atFirst` 가 boolean 이라 정상)
- 수정: `js/game.js` `lockNext` 를 `!!(...)` 로 **boolean 강제**. → PAGE 1·2·12(및 그 외 수동 이동 페이지) 다음 버튼 정상 표시. 한 페이지씩만 이동(goNext busy 가드), 다음 버튼 탭 시 tapAdvance 는 `.ctrl-btn` 제외라 중복 이동 없음.

### 2. PAGE 5·7·10 음성 종료 후 자동 전환 (다음 버튼 숨김·탭 차단)
- `js/scenes.js`: warning(5)·esloIntro(7)·missionSuccess(10)에 `voiceNext: true`.
- `js/game.js`: 전역 `voiceGateLocked`(videoGateLocked·interactionLocked 과 동일 패턴). `renderScene` 진입 시 초기화 후 `scene.voiceNext` 면 잠금 → `goNext`/`goToStep`/`updateCtrlButtons`(다음 버튼 숨김)에서 이동 차단. 이전 버튼은 유지(goPrev 는 잠금 미검사).
- 자동 전환: `playPageVoice` 의 `autoAdvance`(음성 `ended` 콜백)에서 `index===myIndex` 확인 → `voiceGateLocked=false` → `goNext()`. **실제 음성 ended 기준(임의 타이머 아님), 1회만**(onended 는 재생 후 해제 + index 가드 + goNext busy 가드). 이전 진입의 늦은 ended 는 `index!==myIndex` 로 무시, `clearScene`(모든 네비 진입점)이 `stopVoice`(onended 해제)·`stopAlarm` 으로 정리.
- 재진입: `renderScene` 이 항상 초기화 후 `voiceNext` 재적용 + `playPageVoice` 를 새 `myIndex` 로 호출 → 이전으로 나갔다 다시 오면 처음부터 재실행(PAGE 5는 경보음부터).
- 안전 fallback: 음원/API 없음 → 잠금 해제(수동 이동 허용). 재생 실패로 ended 미도착 → `VOICE_HARD_TIMEOUT`(12s) 워치독이 잠금만 해제(자동 이동 X) → 영구 갇힘 방지.
- 안내 문구 제거: `renderWarning`/`renderBrand`/`renderMissionSuccess` 의 `makeHint(tapNext)` 삭제(빈 여백 없음, 요소 자체 제거). PAGE 5·10 의 기존 울음(cry)·웃음(laugh) 순차 재생은 자동 전환으로 대체(미재생).

### 3. PAGE 5 경보 알람 강화 (Web Audio 합성, 외부 음원 없음)
- `js/sfx.js` `alarm(onDone)` 신설 + `SFX.playAlarm`/`stopAlarm` 노출. hi-lo-hi-lo 2톤 사이렌(square, lowpass 1.6kHz 로 고주파 억제), 총 ~0.9s. 기존 `sfx('warn')` 합성음 대체(renderWarning 의 `sfx('warn')` 제거).
- 흐름: `playPageVoice(5)` 가 `playAlarm(startVoice5)` → 알람 마지막 톤 `onended`(+안전 setTimeout) 시 안내 음성 재생 → 음성 `ended` 시 PAGE 6 이동. 알람과 음성은 겹치지 않음.
- 오디오 실패 대비: `ensureCtx()` 실패 시 `onDone` 즉시 호출 → 음성 정상 진행. Flip Pro 등에서도 Web Audio 로 재생(기존 합성 효과음과 동일 경로).
- BGM: `alarm` 시작 시 `duckBGM()` → 이어지는 음성도 duck(단일 fade 엔진, 사이 복귀 없음) → 음성 `ended` 시 `unduckBGM()` 복귀. 경보~음성 동안 BGM 볼륨 튐 없음.
- 신규 **음원 파일 없음**(합성) → `sw.js` PRECACHE 변경 없음.

### 4. PAGE 7 문구 위치 재조정 (제품 과다 침범 완화)
- `css/game.css` `.kw-2`(안심 베이비케어): `left:13% top:58%` → **`left:4% top:63%`**. 이전 버튼(카드 세로 중앙) 아래로 소폭 내려 겹침을 피하면서 왼쪽으로 이동 → 제품 침범 38px → **~11px(살짝 걸침)**. 폰트·크기·색상·애니메이션·문구 불변(좌표만).
- 실기 검증(360×800/375×812/390×844/412×915/844×390/1024×768/1280×800): 이전 버튼·kw-1·kw-2 겹침 없음, kw-2 는 제품 가장자리에 3~12px 만 걸침.

### 5. 버전·캐시
- `config.js` `meta.version`=`v0.10.14-beta`, `sw.js` `CACHE_NAME`=`eslo-game-v0.10.14-beta`.

---

## [v0.10.13-beta] - 2026-07-21
### 안내 문구 변경 · PAGE 2 터치 영역 확대 · PAGE 6·11·13 다음 버튼 숨김 · PAGE 7 문구 위치 조정
**PAGE 6·11 영상 자동재생·6→7·11→12 자동 이동·PAGE 13 음성 종료 자동 이동·PAGE 3·4·8·9 인터랙션 필수화·BGM·Ducking·Flip Pro has-video CSS·모바일 레이아웃·기존 애니메이션은 변경 없음.**

### 1. 안내 문구 변경 (다음 버튼이 있는 페이지 전체)
- `config.js` `texts.hints.tapNext`: `'화면을 탭하면 다음으로 넘어가요'` → **`'화면을 탭하거나 다음 버튼을 눌러주세요'`**.
- `tapNext`는 중앙 관리(config)라 다음 버튼이 표시되는 모든 페이지에 일괄 적용. **PAGE 6·11은 영상 문구(`videoWatch` "영상을 끝까지 보면 다음으로 넘어가요")를 그대로 사용, PAGE 13은 안내 문구가 없으므로 영향 없음** — 요구대로 "다음 버튼이 없는 페이지"는 기존 문구 유지.

### 2. PAGE 2 터치 영역 확대 (일반 바디워시 제품 전체 탭 → 이동)
- `js/game.js` `isInteractiveTarget`의 탭 차단 선택자에서 **`.info-product` 제거**. 기존에는 제품 이미지가 차단 대상이라 제품을 탭해도 이동하지 않고 제품 바깥(주로 하단 빈 영역)만 이동됐음.
- 제거 후 제품 이미지 어디를 탭해도 `tapAdvance`가 다음으로 이동 → 훨씬 누르기 쉬움. **`.info-product`는 PAGE 2(유일한 `info` 타입 장면)에만 존재하므로 다른 페이지 영향 없음.** UI/디자인·레이아웃은 변경하지 않고 터치 판정 범위만 확대.

### 3. PAGE 6·11·13 카드 내부 다음 버튼 숨김 (이전 버튼·자동 전환은 유지)
- `js/scenes.js`: residue(PAGE 6)·biodegradeInfo(PAGE 11)·brandFinal(PAGE 13)에 **`hideNext: true`** 추가.
- `js/game.js` `updateCtrlButtons`: `lockNext` 계산에 `|| (curScene && curScene.hideNext)` 추가 → 해당 장면에서 다음 버튼 `disabled`+`.is-disabled`(CSS `.card-nav:disabled{opacity:0;pointer-events:none}`로 숨김). **이전 버튼(`.card-nav.is-prev`)은 그대로 유지.**
- PAGE 6·11은 영상 종료(`ended`)→`scheduleAutoNext`로 6→7·11→12 자동 이동, PAGE 13은 안내 음성 종료(`ended`)→`goNext`로 PAGE 14 자동 이동 — **자동 전환이 이동을 담당하므로 수동 다음 버튼 불필요.** 자동 전환·`videoGateLocked`·autoplay·must-watch 로직은 변경하지 않음.

### 4. PAGE 7 문구 위치 조정 (겹침 해소 · 위치만)
- `css/game.css` `.kw-2`(안심 베이비케어): `left: 0%` → **`left: 13%`** — 카드 좌측 세로 중앙의 이전 버튼(`.card-nav.is-prev`)과 겹치던 것을 오른쪽으로 이동해 간격 확보.
- `css/game.css` `.kw-1`(생분해): `left: 4%`(가로)/`3%`(세로) → **`left: 10%`/`9%`** — 제품 이미지 쪽으로 소폭 이동.
- **폰트·크기·애니메이션(kw pulse 등)·문구는 변경하지 않고 좌표(left)만 조정.** 실기 검증: 이전 버튼(l21–r63)과 kw-1(l60,t256)·kw-2(l72,t404) 겹침 없음, kw-2는 kw-3와 동일하게 제품에 인접.

### 5. 버전·캐시
- `config.js` `meta.version` = `v0.10.13-beta`, `sw.js` `CACHE_NAME` = `eslo-game-v0.10.13-beta`.

---

## [v0.10.12-beta] - 2026-07-21
### PAGE 3·4·8·9 인터랙션 필수화 · 첫 화면부터 BGM 지속 재생
**PAGE 6·11 영상 재생·autoplay·must-watch·영상 종료 후 자동 전환·has-video CSS·음성 1.2배속·BGM Ducking·카드 내부 이전/다음 구조는 변경 없음.**

### 1. PAGE 3·4·8·9 다음 버튼 삭제 + 인터랙션 강제 완료
- `js/scenes.js`: bodywashUse(3)·bodywashRinse(4)·esloUse(8)·esloRinse(9)에 `requireInteraction: true` 추가.
- `js/game.js`: 전역 `interactionLocked` 도입(videoGateLocked과 동일 패턴). 완료 전 **모든 수동 이동 차단** — `goNext`/`goToStep`/`scheduleAutoNext`/`updateCtrlButtons`(다음 버튼 disabled→CSS `.card-nav:disabled{opacity:0}`로 숨김)에 `interactionLocked` 조건 추가. 화면 탭(`tapAdvance`)·카드 탭·페이지점 점프 모두 `goNext`/`goToStep` 경유라 함께 차단.
- 잠금 설정: `renderDrag`의 buildBody에서 `if (scene.requireInteraction) interactionLocked = true`(shell이 직후 updateCtrlButtons 호출 → 다음 버튼 숨김). 해제: 드래그 `onComplete`(makeRubbable `completed` 가드로 1회)에서 `interactionLocked = false` 후 기존 `scheduleAutoNext(myIndex)` → **완료 이벤트 기준 자동 전환**(새 타이머 미추가). 3→4·4→5·8→9·9→10.
- 재진입 초기화: `renderScene` 진입 시 `interactionLocked = false` 리셋 → 이전으로 돌아갔다 재진입하면 새 makeRubbable(completed=false)로 다시 완료해야 이동. 이전 버튼은 유지(잠금은 다음/탭/점프만).
- accidental tap 방지: 완료 전 `interactionLocked`로 탭 이동 자체가 차단(+ 기존 tapAdvance의 드래그/이동거리 예외 유지).

### 2. 첫 화면부터 BGM 지속 재생 (싱글턴·위치 유지)
- `js/sfx.js`: `startBGM`에서 `currentTime = 0` **제거** → 재시작 없이 현재 위치에서 재생. 브라우저 자동재생 정책 대응 — `bindBgmUnlock`(pointerdown/touchstart/mousedown/keydown 캡처 리스너)로 **자동재생 차단 시 첫 사용자 제스처에서 재생**, 실제 재생되면 즉시 `unbindBgmUnlock`(이후 정지/재생 버튼과 충돌 없음). 차단 시 콘솔 반복 출력 없음(`play().then(…, ()=>{})`).
- `js/game.js`: `renderGate()`의 `SFX.stopBGM()` → `SFX.startBGM()`(첫 화면·게이트 복귀 모두 재생 시도, **정지·0초 초기화 안 함**). `startGame()`의 `startBGM` 호출 제거(게이트에서 이미 시작·유지). BGM Audio는 기존 싱글턴(`bgmEl`) 그대로 — 페이지마다 새로 생성하지 않음.
- 결과: 카카오 채널 추가(첫 화면)부터 재생, 게임 전체·PAGE 14·게이트 복귀까지 끊김/재시작 없이 위치 유지, loop 유지. 정지 버튼=BGM+음성 일시정지, 재생 버튼=이어서(applyPauseState). 음성 재생 중 Ducking·종료 후 복귀 그대로.

### 기타
- `sw.js` `CACHE_NAME` `eslo-game-v0.10.12-beta`(수정된 JS/CSS/오디오가 새 캐시에 포함). PRECACHE 목록(bgm.m4a·voice·JS/CSS) 그대로.

### QA (로컬 PC)
- PAGE 3·4·8·9 다음 버튼 미표시·탭/점프 이동 불가·미완료 이동 불가·이전 정상·재진입 초기화·완료 후 1회 자동 이동(3→4·4→5·8→9·9→10, 2페이지 스킵 없음). BGM: 첫 화면 재생 시도·첫 제스처 재생·게이트↔게임 끊김 없음·위치 유지·loop·Ducking·정지/재생·인스턴스 중복 없음. 회귀: PAGE 6·11 영상·6→7·11→12·must-watch·PAGE 13→14·콘솔 0·404 0.

---

## [v0.10.11-beta] - 2026-07-21
### 음성 타이밍 · 자동전환 · 네비게이션 UX · 배경음(BGM)+Ducking
**영상 렌더링 수정(has-video+CSS)·PAGE 6·11 영상 재생·autoplay·fallback·must-watch·영상 파일은 변경 없음**(Flip Pro 검증본 유지).

### 1. 모든 페이지 음성 1.2배속 (pitch 유지)
- `assets/audio/voice/page01~14.m4a`를 **ffmpeg `atempo=1.2`**(피치 보존)로 재인코딩(AAC 160k, 파일명·경로 동일). 예: page01 4.41s→3.68s, page06 6.80s→5.67s, page11 5.85s→4.88s, page13 5.41s→4.52s. config `voice` 매핑 불변.

### 2. PAGE 13 → PAGE 14 자동 전환을 "안내 음성 종료" 기준으로 변경 (타이머 미사용)
- `renderBrandFinal`의 animationend + `rewardHold` 타이머 기반 자동 전환 **제거**(순차 등장 애니메이션은 유지).
- `playPageVoice(page===13)`의 `onEnded`(audio `ended`) 콜백에서 `goNext()` 호출 → **음성이 끝나기 전에는 절대 넘어가지 않음**. 다른 페이지 전환 정책 불변.

### 3. 이전/다음 버튼을 카드뉴스 내부로 이동
- 좌측 컨트롤 패널에서 이전/다음 제거(처음으로/플레이/정지만 남김). `shell`이 게임 장면 카드마다 **카드 세로 중앙 좌·우**에 원형 네비 버튼(`.card-nav.is-prev/.is-next`) 생성, 전역 `prevBtn/nextBtn` 재지정 → `updateCtrlButtons`가 활성/비활성(첫/마지막·영상 잠금 시 숨김) 그대로 제어. 아이콘만 표시(라벨=aria-label). backdrop-filter 미사용(영상 페이지 Tizen 영향 방지). 텍스트·영상 미가림, 모바일 세로/가로·데스크톱·Flip Pro 대응.

### 4. 모션 유도 문구(.hint) 가독성 개선 (모든 페이지)
- `.hint`(예 "일반 바디워시를 아이 몸에 문질러 주세요") 크기 확대(clamp 15~21px)·굵기 800·딥 슬레이트(#17324a) 대비·흰 하이라이트 헤일로+부드러운 그림자(은은한 외곽선). 기존 pulse(0.5까지 하강) → hintPulseSoft(0.86~1)로 완화. reduced-motion 대응.

### 5. 배경음(BGM) 추가 — 오디오 전용 파일
- `배경음.mp4`(131s)에서 **오디오만 추출** → `assets/audio/bgm.m4a`(AAC 128k, ~2.1MB). **mp4 미사용**(Flip Pro 불필요 영상 디코딩 방지). `sfx.js`에 `startBGM/stopBGM/pauseBGM/resumeBGM` + 단일 fade 엔진. loop, 첫 사용자 제스처(게임 시작 버튼)에서 시작, 게이트 복귀 시 정지, 다시 시작 시 처음부터. 기본 볼륨 `config.sfx.bgmVolume`=0.12(항상 페이지 음성보다 작게). 정지/재생 버튼과 연동. 영상은 muted라 충돌 없음.

### 6. 배경음 자동 Ducking
- 페이지 음성 재생 중 BGM을 자동으로 낮춤(0.12→`bgmDuckVolume` 0.045), 음성 종료(ended)/실패/음원없음 시 복귀(→0.12). `bgmFadeMs`=400ms fade-in/out. `playVoiceForPage`가 duck, `onended`가 unduck 호출. 단일 fade 엔진이 진행 중 fade 취소 후 현재값→목표로 램프 → **페이지 연속 전환에도 볼륨 안정**. PAGE 6·11·13 포함 모든 페이지 동일.

### 기타
- `sw.js` PRECACHE에 `bgm.m4a` 추가, `CACHE_NAME` `eslo-game-v0.10.11-beta`. `config.sfx`에 `bgm/bgmVolume/bgmDuckVolume/bgmFadeMs` 추가.

### QA (로컬 PC)
- Flip Pro 영상 로직 불변·PAGE 6/11 자동재생·PAGE 13 음성 종료 후 PAGE 14 전환·음성 1.2배속·BGM loop·Ducking(음성 시작 감소/종료 복귀)·네비 버튼 위치·모션 문구 가독성·모바일/데스크톱 레이아웃·콘솔 오류 0·404 0.

---

## [v0.10.10-beta] - 2026-07-21
### PAGE 6·11 영상 렌더링 개선 (Flip Pro/Tizen 합성 문제 대응 · 영상 장면 한정 CSS 최소 수정)
삼성 Flip Pro(LH55WMBWBGCXKR, Tizen)에서 영상이 **디코딩·재생(readyState 4·buffered 전체·error none·currentTime 진행)은 되나 화면에 표시되지 않고 ~1.5초 뒤 자동 pause**되는 문제 대응. 진단(v0.10.9) 결과 조상의 `backdrop-filter`·`transform`·진입 애니메이션에 의한 합성/가시성 실패가 유력 → **가장 유력한 원인만 최소 수정**.

### 원칙 (재생 로직 무변경)
- `attemptPlay`/`play()`/fallback/must-watch gate/watchdog/`autoplay`/preload/영상 파일·경로·페이지 음성·진단 오버레이 **변경 없음**. 자동재생·자동 전환(6→7, 11→12)·Primary→Lo 폴백·SW bypass 그대로.

### Changed (영상 장면 한정 CSS)
- **영상 장면 마킹**: `js/game.js` `renderVideo`의 `if (src)` 분기에서 `.screen`에 **`has-video` 클래스 1개** 부여(실제 영상 장면=PAGE 6·11에만, placeholder 장면 제외). 시각(합성) 전용 — 재생 로직과 무관.
- **`css/game.css` 맨 끝 신규 레이어**(has-video 스코프, 소스 순서상 우선):
  - `.screen.has-video, .screen.has-video.is-active, .screen.has-video.is-leaving { transform: none; }` — 영상 조상에서 transform 레이어 제거(하드웨어 오버레이 부착 방해 해소).
  - `.screen.has-video .scene-card { backdrop-filter: none; -webkit-backdrop-filter: none; animation: none; }` — Tizen video 미표시 주 원인인 `backdrop-filter` 컨텍스트 제거 + 진입 애니메이션(cardIn) 제거(video 생성 중 transform/opacity 애니 방지).
- **유지(이번 미변경)**: `.info-video`·`video`의 `border-radius`/`overflow`(라운드 클립)는 그대로. 이번 수정으로 미해결 시 다음 단계에서 별도 검증.
- **영향 범위**: PAGE 6·11 카드만 진입 pop 애니메이션·유리 블러가 빠짐(다른 페이지 카드 디자인·배경·문구·버튼·레이아웃 불변). 진단 오버레이(`?debug=1`)·로그 그대로.
- `sw.js` `CACHE_NAME` `eslo-game-v0.10.10-beta`.

### QA (로컬 PC)
- PAGE 6·11 영상 자동재생·종료 후 PAGE 7/12 자동 전환·페이지 음성·pause/next/gate 정상. 다른 페이지 UI 변화 없음. `?debug=1` 오버레이 정상. 콘솔 오류 0.

### 실기기 검증 — 삼성 Flip Pro LH55WMBWBGCXKR (Tizen) ✅ 해결 확인 (2026-07-21)
- **PAGE 6·11 영상이 화면에 정상 표시되고 자동재생 성공** (v0.10.9까지 미표시 + ~1.5초 뒤 자동 pause → v0.10.10에서 해소). 영상 종료 후 PAGE 7/12 자동 전환도 정상.
- **원인(확정)**: `<video>` 조상 요소의 `backdrop-filter`(`.scene-card`) · `transform`(`.screen`) · 진입 애니메이션(`cardIn`)이 Tizen 브라우저에서 영상 합성(compositing)/가시성 판정을 방해 → 디코딩·재생은 되나 픽셀 미표시 + 네이티브 occlusion 자동 pause.
- **해결**: 영상 장면(PAGE 6·11)에만 `has-video` 클래스를 부여하고, 해당 장면에서만 위 합성 CSS(backdrop-filter·transform·cardIn)를 비활성화. 코덱·영상 파일·autoplay·재생 로직은 변경하지 않음.
- **다른 페이지 디자인 영향 없음**: 비영상 페이지의 유리카드(backdrop-filter blur16·transform·cardIn)는 그대로 유지 확인.

---

## [v0.10.9-beta] - 2026-07-21
### PAGE 6·11 영상 진단 빌드 (Flip Pro 원인 확인용 · 재생 로직 무변경)
삼성 Flip Pro(LH55WMBWBGCXKR, Tizen)에서 PAGE 6/11 영상이 **간헐적으로 재생되지 않는 원인**을 실기기에서 정확히 확인하기 위한 **진단 전용** 빌드. 원인 미확정 상태이므로 추측 수정 없이 **관측 기능만 추가**.

### 원칙 (재생 로직 절대 무변경)
- `attemptPlay`/`loadSource`/`onSourceFail`/`userPlay`/`showFallback`/must-watch gate/watchdog·`autoplay`/`preload`/영상 파일·경로 **한 줄도 변경하지 않음**. 자동재생·자동 전환(6→7, 11→12)·Primary→Lo 폴백·SW MP4 bypass·캐시버스트 그대로.

### Added (진단 전용)
- **영상 상태 스냅샷**(`js/game.js` `renderVideo`의 `snap()`): 매 이벤트마다 page·srcType(Primary/Lo)·file·currentSrc·readyState·networkState·duration·currentTime·paused·ended·muted·defaultMuted·playsInline·autoplay·videoWidth·videoHeight·buffered·MediaError code 기록. 읽기 전용 → 재생 동작 무영향.
- **이벤트 로그 확대**: 기존(loadedmetadata/canplay/playing/stalled/waiting/suspend/abort/emptied/error/ended)에 더해 `loadstart·loadeddata·canplaythrough·play·pause·seeking·seeked`와 스로틀(400ms) `progress·timeupdate` 관찰 리스너 추가(모두 로깅만).
- **play() 진단 래퍼**: `v.play`를 투명 프록시로 감싸 모든 호출을 `play_call`(Primary/Lo·retry·시각)/`play_resolve`(소요 dt)/`play_reject_obs`(name:message)로 기록. 실제 play를 동일 인자·순서로 호출·반환하므로 **동작·호출 순서 불변**(기존 `.catch` 체인 그대로).
- **MediaError 라벨**: 코드(1~4)를 MEDIA_ERR_ABORTED/NETWORK/DECODE/SRC_NOT_SUPPORTED로 사람이 읽기 쉽게 오버레이 출력.
- **페이지 음성 진단**(`js/sfx.js`): `voiceDiag()` 추가 — `voice_start`/`voice_play_ok`/`voice_play_reject`/`voice_end`/`voice_error`/`voice_stop` + 현재 재생 여부(`playing`) 기록. 재생 동작 무변경, 전역 훅(`window.__esloVideoDiag`)으로 영상 진단 스토어에 라우팅.
- **`?debug=1` 실시간 오버레이**(우측 하단, `id=eslo-video-overlay`, pointer-events:none): 현재 페이지·영상 파일명·Primary/Lo·currentSrc·readyState·networkState·재생상태·currentTime·frame·buffered·flags·MediaError·현재 이벤트·voice 상태를 300ms 주기+이벤트마다 갱신. 좌측 하단 히스토리 패널과 병행. **`?debug=1`이 아니면 오버레이·패널 미표시(일반 사용자 무영향)**, 진단은 `sessionStorage['eslo_video_diag']`(버퍼 400)에만 조용히 기록.
- `sw.js` `CACHE_NAME` `eslo-game-v0.10.9-beta`(구 SW 캐시가 진단 코드를 덮지 않도록 버전 상향 — 이번 배포의 핵심).

### QA (로컬)
- `?debug=1`에서 PAGE 6/11 전체 필드·이벤트 순서·play() 생명주기·음성(start/play_ok/end)·MediaError 라벨·실시간 오버레이 정상. **진단 추가 후에도 autoplay·자동 전환 그대로**(PAGE6 playing→ended→PAGE7). `?debug=1` 없을 때 오버레이·패널 미표시, 진단은 sessionStorage에만 기록. 콘솔 오류 0.

---

## [v0.10.8-beta] - 2026-07-21
### PAGE 6·11 영상 자동재생 복원 (진입 즉시 autoplay · 실패 확정 시에만 터치 안내)
페이지 흐름·문구·음성·드래그·완료 판정·PAGE6→7·11→12 자동 전환 정책 **불변**. 영상 재생을 다시 "진입 즉시 자동재생"으로 복원.

### 원인 (클릭 재생처럼 보였던 이유)
- v0.10.7의 `renderVideo`가 Tizen race 방지 목적으로 **`video.autoplay=false`** 로 두고 `autoplay` attribute 를 미설정 → 브라우저 자동 시작에 의존하지 않고 `canplay` 후 JS `play()` 에만 의존.
- 동시에 **워치독①(`VIDEO_START_TIMEOUT`=5s)** 이 **단순 타임아웃**만으로 `showFallback()` 호출 → 삼성 사이니지에서 `canplay` 가 조금 늦거나 버퍼링만 되어도 5초 뒤 "화면을 터치하면 영상을 재생합니다" + ▶ 버튼이 떠서, **자동재생 실패가 아닌데도** 사용자가 눌러야 재생되는 것처럼 동작.

### Changed
- **자동재생 우선 복원**: `video.autoplay=true` + `setAttribute('autoplay','')`. `muted/defaultMuted/playsInline=true`, `webkit-playsinline`, `preload='auto'` 유지 → **autoplay attribute(브라우저 자동 시작) + JS `play()`(명시 호출) 병행**, muted 로 Tizen 자동재생 정책 통과.
- **자동재생 지연 최소화**: `loadedmetadata` 에서도 `attemptPlay()` 호출(기존 `canplay`·1.4s 타임아웃에 더해 더 이른 시점에 재생 시도). `load()` 직후 조기 `play()` 는 여전히 미호출(Tizen race 방지).
- **단순 타임아웃 터치 안내 제거**: 워치독①(5s `showFallback`) 삭제. 터치 안내(`showFallback`)는 **오직 `onSourceFail` 체인** — Primary `play()` reject(1회 재시도 포함) 또는 `MediaError` → Lo 소스 교체 → Lo 도 reject/`MediaError` — 즉 **Primary·Lo 자동재생이 실제로 모두 실패**한 경우에만 표시. `stalled`/`waiting`/버퍼링/`canplay` 지연만으로는 표시하지 않음.
- **워치독(최종 안전망) 유지·축소**: HARD_TIMEOUT(12s)까지 재생 미시작이면 **gate 만 해제**(수동 다음 허용, 자동 이동 X → 영구 갇힘 방지). 터치 안내는 표시하지 않음. `VIDEO_START_TIMEOUT` 상수 제거.
- **자동재생 성공 시** `playing`/`timeupdate(>0.1s)` → `markPlaying()` → `hideFallback()`. 재생 중에는 ▶ 버튼·안내문이 절대 표시되지 않으며, 영상 영역 클릭 폴백도 `!playbackStarted` 가드로 비활성.

### 유지 (v0.10.7 호환성 기능 불변)
- `prof-signage.mp4`/`prof-nongye-signage.mp4`(Primary) → `prof-signage-lo.mp4`/`prof-nongye-signage-lo.mp4`(Lo) 자동 교체 폴백 구조.
- 서비스워커 `.mp4`·`Range` 요청 bypass, 영상 precache 제외, 캐시버스트 파일명, `sessionStorage['eslo_video_diag']` 진단 로그·`?debug=1` 패널·`MediaError` 기록.
- PAGE 6·11 페이지 음성(muted 영상과 동시 재생) 및 영상 종료(`ended`) 후 PAGE 7/12 자동 전환. 영상 오류만으로는 자동 다음 이동 안 함. 재생 전 화면 탭으로 다음 이동 금지(gate).
- `sw.js` `CACHE_NAME` `eslo-game-v0.10.8-beta`.

### QA
- PAGE 6·11 진입 시 클릭 없이 자동재생(`autoplay===true`, `muted===true`, `defaultMuted===true`, `playsInline` 적용, `play()` 자동 호출, `playing` 이벤트·`currentTime` 증가). 자동재생 성공 시 터치 안내 미표시. 영상 종료→PAGE 7/12 자동 전환. Primary·Lo 모두 실패한 경우에만 터치 안내 표시. 새 영상 4개 200·Range 206·구 파일명 요청 0·영상 SW 미캐시·음성 precache 유지·콘솔 오류 0·인게임 404 0.

---

## [v0.10.7-beta] - 2026-07-20
### PAGE 6·11 영상 삼성 LH55WMBWBGCXKR(Tizen 사이니지) 다단계 재생 폴백
페이지 흐름·문구·음성·드래그·완료 판정·PAGE6→7·11→12 자동 전환 정책 **불변**. 영상 재생 견고화만.

### 진단 (재인코딩 반복 금지)
- **라이브 서버 Range 정상**: `prof.mp4`/`prof_nongye.mp4` 모두 `206 Partial Content`+`Content-Range`+`Accept-Ranges: bytes`. 서버측 Range 문제 아님.
- **영상 인코딩은 이미 최적**(ffprobe): H.264 **Constrained Baseline**, **has_b_frames=0**, **refs=1**, yuv420p(tv), L3.1, ~1s GOP, faststart. Constrained Baseline은 **CABAC 금지(CAVLC 강제)**라 CABAC 이미 off. → **추가 재인코딩만 반복하지 않고** 아래 다단계 폴백으로 해결.
- 유력 원인: ①동일 파일명 HTTP 캐시(구 10Mbps 영상 잔존) ②`play()` 조기 호출 race ③Tizen muted 자동재생 제한 ④SW의 영상/Range 요청 개입.

### Changed / Added
- **캐시버스트(파일명 변경)**: `prof.mp4`→**`prof-signage.mp4`**, `prof_nongye.mp4`→**`prof-nongye-signage.mp4`**(git mv, 규격 동일 Constrained Baseline L3.1 1024×768). `config.assets.profVideo/bioVideo` 경로 변경. 새 URL이라 삼성 기기에 남은 구 영상 HTTP 캐시를 확실히 우회.
- **서비스워커 영상 bypass**: `sw.js` fetch 핸들러 최상단 — `Range` 헤더 요청 또는 `.mp4` URL은 `event.respondWith` 미호출(`return`)로 **브라우저 네이티브 처리에 위임**. SW가 Range 요청에 200(전체)을 반환해 재생이 깨지는 문제 예방. 영상 precache 제외·런타임 미캐시 유지(검증: SW 등록 상태에서 영상 Range 요청 206 통과·영상 캐시 안 됨).
- **재생 시퀀스 개선(renderVideo 재작성)**: HTML attribute + **JS property 둘 다 명시**(`muted/defaultMuted/playsInline=true`, `autoplay=false`, `preload='auto'`, `controls=false`) → `src` → DOM 삽입 → **`load()`** → **`canplay`(또는 1.4s 타임아웃) 후 `play()`**(load 직후 즉시 play 안 함 → Tizen race 방지) → `play()` reject 시 1회 재시도.
- **다중 소스 폴백**: `scene.videoFallback` 추가(config `profVideoLo`/`bioVideoLo` = **640×480, H.264 Baseline L3.0, B-frame 0, CABAC off, refs 1, 무음, ~650kbps, GOP 24, faststart**). 1차 소스 `error`/재시도 실패 시 **2차 보수 소스로 `load()`+재생 교체**(검증: 1차 오류→`prof-signage-lo.mp4` 자동 교체 재생).
- **강화 터치 재생 폴백**: 모든 소스 실패/워치독 시 `.video-fallback`(큰 ▶ 버튼 + "화면을 터치하면 영상을 재생합니다"). **영상 영역 전체 클릭**으로 재생(re-mute + 필요 시 `load()` + `play()`), 성공 시 폴백 숨김. **재생 전엔 gate 유지**(화면탭·다음 이동 금지, 재생 실패 시 자동 다음 이동 금지 → 사용자가 재생하기 전까지 페이지 유지). 최종 안전망(hard timeout)은 gate만 해제(수동 next 허용, 자동 이동 X → 영구 갇힘 방지).
- **진단 로그**: `pushVideoDiag` → `sessionStorage['eslo_video_diag']`(userAgent·page·videoUrl·srcIdx·이벤트(loadedmetadata/canplay/playing/stalled/waiting/suspend/abort/emptied/error)·readyState·networkState·currentTime·MediaError code·play reject name/msg·fallback 표시·터치 재생). **`?debug=1`일 때만** 화면 하단 숨김 패널 표시(일반 사용자 미노출, 개인정보·민감정보 저장 안 함).
- **이미지 시퀀스 폴백(4차)**: 이번엔 **미구현**(설계·용량만 검토). 위 조치로 대부분 해결 예상하며, 실기기에서 여전히 실패 시 후속 구현 권장(8~12fps WebP/JPEG ≤720p, 영상당 ~1~2.5MB 추정).
- `sw.js` `CACHE_NAME` `eslo-game-v0.10.7-beta`(구버전 캐시 정리).

### 기존/신규 영상 규격 비교
| | 1차 primary(변경 전=후, 파일명만 변경) | 2차 fallback(신규 Lo) |
|---|---|---|
| 파일 | prof.mp4 → **prof-signage.mp4** / prof_nongye.mp4 → **prof-nongye-signage.mp4** | **prof-signage-lo.mp4**(403KB) / **prof-nongye-signage-lo.mp4**(516KB) |
| 규격 | H.264 Constrained Baseline L3.1, 1024×768, 24fps, yuv420p, ~1.5/2.4Mbps, 무음, faststart | H.264 Baseline **L3.0, 640×480**, 24fps, yuv420p, B-frame 0, CABAC off, ~650kbps, 무음, faststart |

### QA
- PAGE 6·11 정상 재생(load→canplay→play 시퀀스, JS property 설정, currentTime 진행)·영상 종료→PAGE 7/12 자동 전환(7.0s/8.1s). 1차 오류→2차(Lo) 교체 재생·양 소스 실패→터치 폴백(gate 유지)·진단 로그(MediaError code 기록) 확인. SW 영상 Range 206 bypass·영상 캐시 안 됨·음성 14개 precache 유지. 구 파일명 인게임 요청 0(신 파일명 200). 14페이지 렌더·음성·드래그 정상, 8해상도 오버플로우 0, 콘솔 오류 0.

---

## [v0.10.6-beta] - 2026-07-20
### 페이지별 AI 안내 음성(PAGE 1~14) 적용
페이지 구성·흐름·문구·완료 판정·자동 전환·영상 must-watch·드래그·효과음(울음/웃음) **전부 유지**. 페이지 음성만 추가.

### Added — 페이지 음성
- 사용자 제공 ZIP(`음원.zip`)의 페이지 음원 **14개 전부 적용**(PAGE 1~14, 예외 없음). 원본 `(PAGE N).mp4`는 비디오(H.264)+오디오(AAC 44.1k stereo ~190k) 컨테이너 → **오디오만 무손실 스트림 복사(재인코딩 없음)**로 `.m4a` 추출 → `assets/audio/voice/page01~14.m4a`(총 ~1.5MB, 개별 69~165KB, 길이 3.0~6.8s).
- **매핑**: `config.voice{1..14}` 단일 관리(PAGE 번호 = `scenes` index + 1, 카카오 게이트는 음성 없음). 경로 하드코딩 없음.
- **재생 규칙**: `renderScene`이 진입 시 `playPageVoice(index+1)`로 해당 음성 1회 재생. 단일 HTMLAudioElement로 상태 1개만 관리(`window.SFX.playVoiceForPage/stopVoice/pauseVoice/resumeVoice/hasVoiceForPage/stopAllAudio`) — 페이지마다 Audio 객체 남발 없음. `clearScene`(모든 네비 진입점)이 이동 시 이전 음성 즉시 정지(`currentTime=0`) → **다음 페이지/빠른 자동 전환에도 겹침 없음**. `play()` reject·`error`는 `console.warn`만(사용자 화면 오류문구 미노출, 무한 재시도 없음, 게임 진행·페이지 조건 무영향), 누락/404여도 진행 계속.
- **효과음 순차**(기존 유지·순서만): PAGE5 음성 종료 후 `VOICE_SFX_GAP`(250ms) 뒤 울음, PAGE10 음성 종료 후 웃음. 페이지 이탈 시 예약된 울음/웃음 취소(clearScene 타이머 정리). 기존 진입 스팅어(warn/success)·음량은 불변.
- **영상 페이지(6·11)**: 영상은 `muted`라 페이지 음성과 오디오 충돌 없음 → 영상+음성 동시 재생. must-watch 잠금·영상 종료 자동 전환(6→7, 11→12) 그대로. (PAGE6 음성 6.8s ≈ 영상 6.375s + 전환 지연, PAGE11 음성 5.85s < 영상 7.375s → **자동 전환 정책 변경 없음**.)
- **pause/play 연동**: `applyPauseState`가 현재 화면 영상·CSS 애니메이션과 함께 페이지 음성도 pause/resume(정지=일시정지, 재생=이어서). 재시작/처음화면/강제 이동 시 음성 완전 정지·예약 취소·`currentTime` 초기화.
- **자동재생**: 기존 게임 시작 버튼 터치를 오디오 활성화 제스처로 사용. 이후 각 페이지 진입 시 자동 재생.

### Not applied
- **`배경음.mp4`(11.5MB, 131초 배경음악)**: 페이지 음원이 아니며, v0.10.5에서 사용자 요청으로 반복 BGM을 명시적으로 제거했으므로 **적용하지 않음**(재적용 여부는 별도 결정 필요). 프로젝트에 포함하지 않음.

### Infra
- `sw.js`: 14개 음성(m4a) `PRECACHE` 편입(오프라인 음성 재생), 기존 개별 `cache.add().catch()`라 일부 실패해도 install 미실패. 영상 캐시 정책(precache 제외·런타임) 유지. `CACHE_NAME` `eslo-game-v0.10.6-beta`(구버전 캐시 정리).

### QA
- PAGE 1~14 각 음성 1회 재생·이동 시 이전 즉시 정지·빠른 이동 겹침 없음·단일 요소 확인. PAGE5 음성→울음(+245ms)·PAGE10 음성→웃음(+231ms)·이탈 시 예약 취소·pause/resume 연동 확인. PAGE6 영상+음성 동시 재생·영상 종료→PAGE7 자동 전환 확인. 음원 14개 200(audio/mp4)·404 0·콘솔 오류 0. SW 캐시 `v0.10.6`(음성 14개 포함·영상 제외·구버전 정리)·오프라인 cache-match 200. 8해상도 오버플로우 0(레이아웃 무변경).

---

## [v0.10.5-beta] - 2026-07-20
### 전체 BGM 제거 · PAGE 3·4·8·9 드래그 하단 그립 · PAGE 6·11 영상 사이니지 호환 재인코딩 + 재생실패 fallback
페이지 구성·흐름·문구·완료 판정·자동 전환·필수 영상 정책은 **불변**. 아래 3건만 수정.

### Removed — 전체 BGM
- 반복 배경음악(BGM) **완전 제거**(현장 분위기 부적합). `js/sfx.js`의 Web Audio 합성 BGM 블록·`window.SFX`의 BGM 메서드(startBGM/pauseBGM/resumeBGM/setBgmVolume/setBgmEnabled/isBgmOn) 삭제, `js/game.js` startGame/pauseGame/playGame의 BGM 호출 삭제, `config.sfx.bgm` 삭제.
- **유지**: 효과음(버튼음·PAGE5 울음·PAGE10 웃음, 전부 Web Audio 합성)·오디오 컨텍스트·첫 제스처 활성화 구조. 정지/플레이 버튼은 현재 화면의 영상·CSS 애니메이션을 제어(applyPauseState)하므로 BGM 제거 후에도 **기능이 남아 어색한 빈 버튼이 아님**.
- BGM은 음원 파일이 아니라 코드 합성이었으므로 삭제할 **음원 파일·preload·서비스워커 캐시 항목·404 없음**.

### Changed — PAGE 3·4·8·9 드래그 하단 그립
- 도구(일반 바디워시/샤워기/이슬로 제품) 이미지의 **하단부를 잡고**, 드래그 중 이미지가 **손가락 위쪽**에 보이도록 변경 → 손가락·손이 아기·화면 중앙을 덜 가림. 측정: 이미지 중심이 손가락보다 54~71px 위, 손가락은 이미지 하단 6~7% 지점.
- 구현: `js/interactions.js` `makeRubbable`에 `grabAnchorY` 옵션(0=상단·0.5=중앙·1=하단, 기본 0.5). `js/game.js renderDrag`가 `grabAnchorY: 0.9` 전달 → `moveToolTo`의 도구 transform을 `translate(-50%,-90%)`로. 손가락 안내(👆)를 도구 하단부(도구 자식, top 88%)로 이동해 잡는 위치와 일치.
- **판정 불변**: 완료 판정·이동 거리(TARGET_DISTANCE)·드래그 임계·자동 전환은 손가락 좌표 기준 그대로(시각 앵커만 변경). 실측: 드래그 완료 시 게이지 100% → 445ms 후 다음 페이지 자동 전환(기존과 동일).
- 도구 등장 애니메이션(`productIn`, animation-fill:both)이 인라인 transform을 덮어써 앵커가 무시되던 문제 → `.stage.is-grabbed .drag-tool { animation: none }` 추가(기존 `:active` 규칙을 JS 클래스로 보강, 데스크톱 마우스·모바일 터치 공통 적용).

### Fixed — PAGE 6·11 영상 (삼성 LH55WMBWBGCXKR 재생 실패)
- **원인 진단(ffprobe)**: 두 영상 모두 H.264 **Main@Level4.1**, 1024×768, yuv420p, 24fps CFR, faststart는 정상이나 **비디오 비트레이트가 ~10Mbps로 비정상적으로 높음**(prof.mp4 9.99Mbps/8.27MB, prof_nongye.mp4 10.5Mbps/10.0MB). 사이니지 내장 하드웨어 디코더의 비트레이트/레벨 한계 초과가 재생 실패의 유력 원인. 오디오(AAC-LC 스테레오)는 게임에서 `muted`라 미사용.
- **재인코딩(보수적 사이니지 규격)**: H.264 **Constrained Baseline@Level3.1**, yuv420p, 24fps CFR, faststart, **오디오 트랙 제거**(muted라 무영향), 비트레이트 대폭 축소. 해상도·길이·화면 내용 유지. 결과: prof.mp4 **8.27MB→1.22MB(1.53Mbps)**, prof_nongye.mp4 **10.0MB→2.2MB(2.39Mbps)**. 동일 파일명·경로(config 불변), git 히스토리에 원본 보존.
- **재생 실패 대응(fallback)**: `renderVideo`에 재생 시작 추적(playing/timeupdate) + `play()` 1회 자동 재시도 + 워치독 2단(①일정 시간 미재생 시 "화면을 터치하면 영상을 재생합니다" + ▶ 재생 버튼 표시, ②최종 안전망으로 gate 잠금 해제 → 무한 대기/빈 화면 갇힘 방지). 정상 종료(ended)→자동 전환(PAGE6→7, PAGE11→12)은 그대로. 하드 오류 시 콘솔 `warn`으로 원인 기록하되 화면엔 개발자용 오류문구 미노출.

### Infra
- `sw.js` `CACHE_NAME` `eslo-game-v0.10.5-beta`. 영상(1.2/2.2MB)은 계속 precache 제외(206 Range·런타임 cache-first). BGM 관련 캐시 항목 없음(코드 합성이었음).

### QA
- BGM: 시작 후 BGM 미재생·BGM 파일 요청 0, PAGE5 울음·PAGE10 웃음 정상, 정지/재생 정상. 드래그: PAGE 3·4·8·9 하단 그립·이미지 손가락 위·완료→자동 전환 정상. 영상: PAGE 6·11 새 영상 재생(1024×768, 200 video/mp4)·ended→자동 전환·오류 시 fallback+잠금 해제 확인. 14페이지 렌더 정상, 8해상도(360/375/390/412/1024/1280/844×390/812×375) 오버플로우 0, 콘솔 오류 0, 신규/기존 404 0.

---

## [v0.10.4-beta] - 2026-07-20
### 릴리스 전 기술 정리 — PAGE 14 이미지 최적화 · warning-light 404 제거 · precache 반영
화면·문구·애니메이션·오디오 값·게임 로직·페이지 흐름 **전부 불변**. 에셋 용량/네트워크 정리만.

### Changed
- **PAGE 14 제품 이미지 최적화**: `assets/images/이슬로-바스앤샴푸-미니.png` **2754×5420 / 7.49MB(7,490,621B) → 610×1200 / 516KB(528,567B), 92.9% 절감**. sharp `lanczos3` 리사이즈만 적용(색상 변형 없음 — 표시 크기 대비 오버샘플, 원본 대비 픽셀 MAD 0.516/255=0.2%로 사실상 무손실), **투명 알파 유지(RGBA)**, 비인터레이스, 메타데이터 없음. 동일 파일명·경로 유지 → `config.assets.rewardProduct`·형식(PNG) 불변.
  - 형식 선택: PNG(풀컬러 516KB, 92.9%↓) vs WebP(49.5KB, 99.3%↓) vs PNG팔레트(139KB, 색상 양자화) 비교 → **브라우저 호환성·형식/경로 불변·색상 무변형 우선으로 풀컬러 PNG 채택**(60% 목표 크게 초과). PAGE 14 첫 로드 전송량 대폭 감소, 표시(최대 ~152×300 CSS px, 고DPI 여유) 선명도 유지.
- **warning-light.png 404 제거**: `config.assets.warningLight`이 저장소에 **존재하지 않는** `assets/images/warning-light.png`를 가리켜 진입 시 404 발생. 실제 렌더는 처음부터 `createAsset(shape:'siren')`의 **SVG siren placeholder**였음(png는 로드 실패 후 제거되던 미표시 요청). → 경로를 **`''`(빈 값)**으로 변경: 빈 src면 이미지 요청 자체가 없고 placeholder(siren)만 렌더 → **404 제거 + PAGE 5 시각 디자인 동일(회귀 없음)**. (동일 참조를 쓰는 게이지 헤더 렌더러(현재 흐름 미사용)도 함께 정리됨.)
- **서비스워커 precache 반영**: 최적화로 516KB가 된 PAGE 14 이미지를 `PRECACHE`에 추가(오프라인 첫 로드에도 완료 화면 표시). 영상(`prof.mp4`/`prof_nongye.mp4`, 수 MB)은 초기 설치 용량·저장공간 고려하여 **계속 precache 제외**(런타임 cache-first). BGM·효과음은 Web Audio 합성(`js/sfx.js` precache)이라 별도 음원 캐시 불필요. `CACHE_NAME` `eslo-game-v0.10.4-beta`(이전 캐시 정리 로직 유지).

### QA
- 전체 신규·기존 **네트워크 404 0건**(warning-light 요청 소멸, PAGE 14 이미지 200). 콘솔 오류 0, JS 예외 0.
- 오프라인: 서비스워커 설치·활성화 후 Offline 전환·새로고침 → 첫 화면·PAGE5/10/13/14·이미지·CSS·JS·합성 오디오 정상. 대용량 영상만 오프라인 미재생(의도된 정책).
- 회귀: 14페이지 흐름·자동 전환·must-watch 영상·드래그·컨트롤·오디오·레이아웃(8해상도, 오버플로우/세로 스크롤 없음) 이상 없음.

---

## [v0.10.3-beta] - 2026-07-20
### PAGE 13/14 등장 애니메이션 고급화 · 자동 전환·오디오 볼륨·효과음 미세 조정
페이지 구성·흐름·문구·게임 로직·필수 영상·드래그·배경·데스크톱 **불변**. 등장 연출/타이밍/오디오 값만 다듬음.

### Changed
- **PAGE 13 제품 등장 고급화**: `revealPop` 을 "살짝 아래(16px)에서 위로 + opacity 증가 + scale 0.9→1"로, easing을 부드러운 ease-out(`cubic-bezier(.22,.61,.36,1)`, **오버슈트/바운스 없음**), 지속 420→**520ms**. 요소 간 간격(`STEP`) 260→**300ms**(제품 소개 느낌). game.js `REVEAL_DUR`도 520 동기화(안전망 타이머 정확).
- **PAGE 13 제품명 그룹화**: 이미지↔제품명 간격 축소(`gap` clamp(3~8px)), `line-height` 1.25→**1.2**, `margin-top` 미세 추가 → 이미지+제품명이 하나의 그룹처럼. 중앙 정렬·`word-break:keep-all`·한 줄 유지 유지.
- **PAGE 14 순차 등장 추가**: 완료 문구 `rewardTitlePop`(약간 Pop) → 제품 이미지 `rewardFadeScale`(240ms 지연, Fade+Scale) → 안내문 `rewardFadeUp`(560ms 지연, 아래→위)로 순차 등장. "이벤트 참여 완료" 느낌. CSS animation-delay 기반(자동 전환 없음).
- **자동 전환 시간 조정**: `timings.rewardHold` 2000→**2200ms** — PAGE 13 순차 등장 완료 후 완성 화면을 약 2.2초 충분히 본 뒤 PAGE 14로 전환(가장 자연스러운 시간). `animationend`(1차)+안전망 타이머·1회 가드·이탈 정리·재진입 재실행 로직 그대로.
- **오디오 볼륨 최종 조정**(권장 범위 내): 효과음(SFX) `sfx.volume` 0.35→**0.32**(권장 0.30~0.35), BGM `sfx.bgm.volume` 0.15→**0.13**(권장 0.12~0.15) — BGM이 효과음/안내를 확실히 덜 방해하도록 낮은 쪽. BGM/효과음 독립 볼륨 유지.
- **효과음 미세 조정**: PAGE 5 울음(`cry`) — 더 높고 둥근 톤 + 부드러운 비브라토로 **더 귀엽게·덜 자극적**(약 0.95s→**0.82s**). PAGE 10 웃음(`laugh`) — 자연스러운 오르내림 리듬 + 밝은 글라이드로 **더 밝고 자연스럽게**(약 0.7s→**0.62s**). 둘 다 짧고 시끄럽지 않게 유지.
- 서비스워커 캐시명 `eslo-game-v0.10.3-beta`.

### QA
- 모바일 360/375/390/412 · 가로/데스크톱 844×390·812×375·1024×768·1280×800: PAGE 13(제품·제품명·순차 등장 상수·카드 내부 중앙·오버플로우 없음), PAGE 14(문구·이미지·2줄·중앙·세로 스크롤 없음). 전체 흐름 1~14 자동 전환·필수 영상·드래그·효과음·BGM 정상, 콘솔/네트워크 오류 없음.

---

## [v0.10.2-beta] - 2026-07-20
### PAGE 13 제품명·순차 등장·PAGE 14 자동 전환 · PAGE 14 미션 완료/증정 안내(신규) · 전체 BGM · PAGE 5 울음 / PAGE 10 웃음 효과음
게임 흐름/기존 페이지 로직/자동 전환/영상 필수시청/드래그/배경/데스크톱 레이아웃 **불변**. 아래 항목만 추가·수정. **총 14페이지.**

### Added / Changed — PAGE 13 (brandFinal)
- **다시하기 버튼 제거**: 카드 내 `다시하기`(btn-primary) 삭제. 재시작은 하단 컨트롤 `처음으로`로 일원화(불필요 DOM/리스너 제거).
- **제품 하단 제품명 추가**: 좌 `바스 앤 샴푸` / 중앙 `엉덩이 클렌저` / 우 `바디 로션`. 제품 이미지+제품명을 `.final-prod-card`로 묶어 그룹화. config `texts.scenes.finalProductNames`. Jua 폰트·키컬러(딥)·`word-break:keep-all`·좁은 화면 폰트 축소로 겹침/줄바꿈 방지.
- **순차 등장 모션**: 이미지→제품명 순서로 6요소가 차례로 등장(왼→중앙→오른쪽). Fade + Scale + 살짝 위로(`revealPop`), 요소 간 260ms 간격. `animation-delay` 인라인 부여.
- **전체 중앙 정렬**: 제품 그룹을 카드 내부 좌우·상하 중앙(모든 QA 해상도에서 카드 내부 포함·중앙 확인). 낮은 가로 화면은 높이 기준 축소.
- **PAGE 14 자동 전환**: 마지막 요소 `animationend`(전체 시퀀스 완료 시점)를 1차 기준으로 `rewardHold`(약 2초) 유지 후 PAGE 14 자동 이동. 애니메이션이 진행되지 않는 환경(백그라운드 탭/스로틀/모션 차단)에서도 멈추지 않도록 예상 소요시간 기반 **안전망 타이머** 병행(`autoNextScheduled` 가드로 1회만, `clearScene` 로 이탈 시 정리). PAGE 13 진입 전 타이머 미시작, 재진입 시 정상 재실행.

### Added — PAGE 14 (rewardFinal, 신규 최종 페이지)
- 상단 강조 문구 `💙 생분해 미션 완료! 💙`(가장 먼저 눈에 들어오게 키컬러 딥·굵게·soft glow) + 중앙 제품 이미지(`이슬로-바스앤샴푸-미니.png`, 비율 유지) + 하단 안내 문구 `직원에게 화면을 보여주시고 / 여행용 바스 앤 샴푸 받아가세요!`(정확히 2줄).
- 스카이블루·화이트 톤, 카드 내부 좌우·상하 중앙, 모바일 세로 스크롤 없음, 상단 로고·하단 컨트롤과 미겹침. **최종 페이지 — 자동 전환 없음, 다시하기 버튼 없음**(마지막 페이지 `다음` 컨트롤 비활성).

### Added — 오디오 (중앙 관리: js/sfx.js `window.SFX`)
- **전체 BGM**: 잔잔+발랄한 배경음악. 게임 시작 버튼(사용자 제스처) 이후 재생 시작, `loop`, 페이지 전환에도 지속. `정지`↔`플레이` 컨트롤과 연동(정지 시 BGM 정지, 재생 시 이어서). BGM/효과음 볼륨 독립(BGM 0.15 / SFX 0.35). 중복 시작 방지.
- **PAGE 5 아이 울음("으앙~", ~0.95s)**: 진입 시 1회. 재진입 시 다시 1회, 이전 재생 중이면 정리 후 재생(중첩 방지), 정지 상태면 미재생.
- **PAGE 10 아이 웃음("꺄르르~", ~0.7s)**: 진입 시 1회. 재진입 재생·중첩 방지·정지 정책 동일.
- **음원 출처/라이선스**: 외부 음원·파일 **미사용**. BGM·울음·웃음 전부 **Web Audio API로 프로젝트 자체 생성한 오리지널 합성음**(코드는 `js/sfx.js`) → 저작권/라이선스 이슈 없음(자체 저작물, CC0 상당), 별도 음원 파일·다운로드 없음, 오프라인 기본 동작.

### Docs / Infra
- 서비스워커 캐시명 `eslo-game-v0.10.2-beta`. PAGE 14 제품 이미지(7.5MB)는 초기 설치 용량 과다 방지를 위해 precache 제외 → fetch 런타임 캐시(cache-first)로 첫 방문 후 오프라인 지원(권장: 웹용으로 이미지 용량 최적화 후 precache 편입). 합성 오디오는 `js/sfx.js`(이미 precache)라 별도 음원 캐시 불필요.
- config `assets.rewardProduct`, `texts.scenes.rewardTitle/rewardDesc/finalProductNames`, `timings.rewardHold`, `sfx.bgm{enabled,volume}` 추가.

### QA
- 모바일 세로 360/375/390/412 · 가로/데스크톱 844×390·812×375·1024×768·1280×800: PAGE 13(제품 3종·제품명·순차 등장·카드 내부 중앙·오버플로우 없음), PAGE 14(문구·이미지·2줄 안내·중앙·세로 스크롤 없음·오버플로우 없음) 확인. PAGE 13→14 자동 전환 1회, 재진입 정상. 오디오(무자동재생→시작 재생, pause/resume, PAGE5 울음/PAGE10 웃음 1회) 확인. 콘솔 오류 없음, PAGE14 이미지 200 OK.

---

## [v0.10.1-beta] - 2026-07-20
### PAGE 12 문구·라벨·강조 배지 · PAGE 13 카드 로고 제거·문구 변경
게임 로직·장면 순서·자동 전환·영상·드래그·배경·레이아웃·데스크톱 **불변**. PAGE 12/13 문구·디자인만 수정.

### Changed
- **PAGE 12 메인 문구**: "민감한 아이 피부일수록 생분해 계면활성제는 필수입니다!" → "민감한 우리 아이 피부 / 생분해 케어는 선택이 아니라 필수!"(2줄 구성 유지). config `compareLead`/`compareEmph`/`compareTail`.
- **PAGE 12 우측 라벨**: "생분해 계면활성제 / 이슬로 베이비 워시" → "착한 계면활성제 / 이슬로 생분해 워시"(2줄 유지). config `compareGoodLabel`.
- **PAGE 12 강조 스타일**: "생분해 케어는 선택이 아니라 필수!"가 페이지에서 가장 먼저 눈에 들어오도록 키컬러(`--key` #6DA1FF) 배지로 강조 — pill(둥근 캡슐)·흰 텍스트·`font-weight:900`·soft shadow. `.compare-title .key-emph`로 **PAGE 12 한정 스코프**(다른 페이지 `.key-emph`는 불변), `white-space:nowrap`으로 한 줄 유지, `≤360px`는 폰트/패딩 축소로 가독성·한 줄 유지. 기존 UI 컬러와 자연스럽게 조화·과하지 않게.
- **PAGE 13 카드 중앙 로고 제거**: `renderBrandFinal`에서 카드 안 엔딩 로고(`.ending-logo`) 미렌더. **상단 브랜드 로고(전역 `brandLogo`)는 기존 유지**. 히어로(제품 3종)+다시하기 버튼 구성.
- **PAGE 13 메인 문구**: "착한 계면활성제로 / 우리아이 피부를 지키는 / 안심생분해케어, 이슬로" → "우리 아이 피부를 지키는 / 착한 계면활성제 / 안심 생분해 케어, 이슬로"(3줄 구성). config `brandFinalTitle`.
- 서비스워커 캐시명 `eslo-game-v0.10.1-beta`(구버전 캐시 삭제 로직 유지, precache 파일명 동일).

### QA
- 모바일 세로(360/375/390/412) · 모바일 가로(812×375) · 데스크톱(1280×720): 가로 오버플로우 없음, PAGE 12 강조 배지 한 줄 유지·카드 내 여유, PAGE 13 카드 중앙 로고 제거·상단 로고 유지·버튼 화면 내 표시 확인.

---

## [v0.10.0-beta] - 2026-07-16
### 게이트 중앙 정렬 · 로고 카드 위 배치 · 컨트롤 SVG 아이콘 · 문구/색상 수정
게임 로직·장면 순서·자동 전환·영상·드래그·배경·데스크톱 레이아웃 **불변**. 아래 항목만 수정.

### Changed
- **모바일 세로 게이트 중앙 정렬**: 기존에 게이트가 `.is-playing` 미부여로 중앙 정렬에서 빠져 있었음. `.is-playing` 스코프 방식을 제거하고, 공통 wrapper `.scene-wrap`로 **게이트 포함 모든 카드뉴스**를 세로 중앙 정렬. QR·버튼 구성·문구·기능 불변.
- **브랜드 로고를 카드 바로 위에**: 로고를 화면 최상단 고정에서 → 각 카드 박스 **바로 위 중앙**으로. `shell()`이 로고+카드를 `.scene-wrap`로 묶고, 세로에서 로고를 카드 상단 위 `absolute`(카드와 12~20px 일정 간격, safe-area 유지)로 배치. 게이트·Page1~13 공통. 가로/데스크톱은 `.scene-wrap{display:contents}`로 무영향(로고 우상단 유지).
- **Page 5 문구 색상**: "경고! 피부 자극 위험!"(`.warning-scene .card-title.is-warn`) → `#D1000A`, "피부에 남은 나쁜 계면활성제가/트러블을 유발했어요!"(`.warning-sub`) → `#1A3446`. 색상만 변경(내용·크기·굵기·위치·애니메이션 유지), `.warning-scene` 전용 선택자.
- **하단 컨트롤 픽토그램 → 인라인 SVG**: 유니코드 글리프(↑ ▶ ← ⏸ →)를 통통·둥근 인라인 SVG 5종으로 교체(`makeCtrlButton`, `CTRL_SVG`). currentColor라 hover/active/disabled·라벨·클릭 동작 유지, OS별 글리프 편차 제거. 처음으로=상단 바+위 화살표, 플레이=둥근 삼각형, 이전/다음=굵은 둥근 화살표, 정지=둥근 막대.
- **Page 1 문구**: "민감한 우리 아이 샤워," → "민감한 우리 아이 피부," (줄바꿈·스타일 유지).
- **Page 7 문구/키워드**: "피부에 남지 않는 계면활성제" → "피부에 남지 않는 착한 계면활성제". '생분해'(kw-1) 키워드 조금 더 크게 + 제품 쪽으로 소폭 이동(과도한 확대·이동 없음).
- **Page 11 문구**: 2번째 줄 "물에 분해되어 씻겨 내려가" → "물에 쉽게 씻겨 내려가" (3줄 구조·영상 자동 전환 로직 유지).
- 서비스워커 캐시명 `eslo-game-v0.10.0-beta`(구버전 캐시 삭제 로직 유지).

---

## [v0.9.9-beta] - 2026-07-16
### 모바일 세로: 카드뉴스 카드 상하 중앙 정렬 + 브랜드 로고 상단 중앙
모바일 세로 화면에서만 적용. 게임 로직·장면 순서·자동 전환·영상·드래그·버튼 기능·힌트·배경·데스크톱/가로 레이아웃·게이트 **전부 불변**.

### Fixed / Changed
- **원인**: 세로 미디어쿼리에서 `.screen { justify-content: flex-start }` + `.scene-card { flex:none; min-height:60vh }`라 카드가 상단부터 배치돼 아래 여백이 남고 **상단 치우침** 발생.
- **카드 중앙 정렬(세로, 카드뉴스만)**: 고정 top 대신 flexbox **auto 마진**(`.scene-card { margin-block: auto }`)으로 상하 중앙. 내용이 길면 위에서부터 스크롤되어 잘리지 않음. `.screen` 상단에 로고 영역(`padding-top: calc(56px + safe-area)`) 확보. 카드 크기·비율·내부 구성·애니메이션 불변.
- **브랜드 로고(세로, 카드뉴스만)**: 하단 중앙 → **상단 중앙**(좌우 정확히 중앙, 현재 모바일 크기 유지, safe-area 반영). 로고와 카드 겹침 없음.
- **게이트 제외 방식**: `toggleChrome(show)`가 게임 화면일 때만 `app`에 `.is-playing` 부여(게이트는 `toggleChrome(false)`라 미부여). 위 세로 규칙은 모두 `.is-playing`으로 스코프 → **게이트는 기존 배치(로고 하단·카드) 그대로**. 데스크톱/가로는 `@media (orientation: portrait)` 밖이라 불변.
- 서비스워커 캐시명 `eslo-game-v0.9.9-beta`(구버전 캐시 삭제 로직 유지).

---

## [v0.9.8-beta] - 2026-07-16
### UI 3건 수정 (게이트 카카오 버튼 · Page1 이미지 · 처음으로 아이콘)
게임 로직·진행 순서·Scene 구성·영상·자동 전환·드래그·힌트·컨트롤 위치·레이아웃·배경 **전부 불변**. 요청된 3건만 수정.

### Changed
- **게이트(카카오 채널 화면)**: QR 이미지 삭제. 신규 **"채널 추가 하러가기"** 버튼 추가 — 클릭 시 카카오 채널(`https://pf.kakao.com/_nCzPn`)을 새 탭으로 엶(`window.open(..., '_blank', 'noopener')`). 기존 **"채널 추가 완료했어요!"** 버튼은 **그대로 유지**(게임 시작/스타트). `renderGate`만 수정(QR 제거 + 링크 버튼 1개 추가), 게이트 진행 로직 불변.
  - 버튼 디자인: 기존 캡슐(`.btn-primary`, `border-radius:999px`) 모양·폰트·크기·둥근정도 그대로, 신규 버튼에 `.btn-kakao` 수정자만 추가 → **배경 `#FAE100`·텍스트 `#3C1E1E`** 색상만 변경.
  - config `texts.gate.joinButton`/`joinUrl` 신설. `assets.qr`·`texts.qr`·`gate.desc`는 보존(미표시).
- **Page1(MISSION) 이미지 교체**: `childWonder` 경로 `baby-wonder.png` → `baby-wonder_2.png`. **위치·크기·애니메이션·등장 방식 전부 동일**(경로만 교체). `sw.js` precache에 신규 이미지 추가(기존 baby-wonder.png 보존).
- **"처음으로" 컨트롤 아이콘**: 집(`🏠`) → **위쪽 화살표(`↑`)**. 컨트롤 아이콘은 유니코드 글리프 체계(`←`/`→`/`▶`/`⏸`)라 `↑`이 동일 선 굵기·크기·시각 톤으로 자연 일치. 라벨 "처음으로"·버튼 동작(`goHome`)·위치 불변.
- 서비스워커 캐시명 `eslo-game-v0.9.8-beta`.

---

## [v0.9.7-beta] - 2026-07-16
### 가로 배경 재확장 (좌우 연결 자연스럽게)
배경 이미지(가로)만 재생성. 게임 흐름·페이지·문구·UI·로직·애니메이션·레이아웃·세로 배경 **전부 불변**.

### Changed
- **가로(데스크톱) 배경 재확장**: 기존 v0.9.6 가로본은 중앙 밝은 벽 패널을 좌우 어두운 모서리가 감싸 "칸막이/알코브"처럼 끊겨 보였음. 같은 원본으로 outpaint 변형을 여러 컷 생성 후, **측벽이 넓은 평면(세로 배경과 동일한 매끈 스타일)으로 중앙↔좌우가 부드럽게 이어지는** 컷을 선택 → `assets/images/background-wide-v3.jpg`(1920×1072) 교체. 창문(차가운 프로스트)·오브젝트 위치·시안 색감·노이즈 질감 유지. 스트레치/타일/미러 없음.
- 파일명(`background-wide-v3.jpg`)·경로·세로 배경(`background-v3.jpg`)은 그대로. **코드/문서 로직 변경 없음.**
- 배포본 캐시 무효화를 위해 서비스워커 캐시명 `eslo-game-v0.9.7-beta`로 상향(precache 목록은 동일 파일명 유지).

---

## [v0.9.6-beta] - 2026-07-16
### 배경 이미지 교체 (신규 원본 + 가로 자연 확장)
게임 흐름·페이지 순서·문구·UI·로직·애니메이션·레이아웃 **전부 불변**. 배경 이미지 에셋만 교체.

### Changed
- **세로(모바일) 배경**: 신규 원본 일러스트(욕조+오리+돛단배+비누+화분, 720×1280)로 교체 → `assets/images/background-v3.jpg`. 원본 품질 그대로(재인코딩 없음).
- **가로(데스크톱) 배경**: 위 원본을 **Higgsfield outpaint**로 좌우만 자연 확장(16:9) → `assets/images/background-wide-v3.jpg`(1920×1072). 스트레치/타일/미러 없음. 중앙 구도(욕조·창문·수도꼭지)·오브젝트 위치·차가운 프로스트 창문·시안 색감·노이즈 질감 유지, 좌우 벽·바닥만 원근으로 자연스럽게 연장.
  - 변형 3개 생성 후, 창문(차가운 프로스트)·측벽(매끈, 타일 없음)·색감이 원본과 가장 일치하는 컷을 선택.
- **코드 변경 없음**: `config.assets.background`/`backgroundWide` 경로만 v3(jpg)로 교체. game.js는 config 경로를 `new URL()` 절대경로로 읽어 포맷 무관 렌더 → 로직/CSS 불변.
- 기존 v1/v2 배경 파일(`background-v2.png`, `background-wide-v2.webp` 등)은 **보존**(롤백 대비).
- 서비스워커 캐시명 `eslo-game-v0.9.6-beta`, precache 목록도 v3 파일로 교체.

---

## [v0.9.5-beta] - 2026-07-14
### Page6·11 영상 종료 후 탭 안내 문구 제거
게임 흐름·자동 전환·영상 게이트·디자인·애니메이션·레이아웃 불변. 안내문 상태 처리만 정리.

### Changed
- **Page6·Page11 영상 종료 후 안내문**: 종료 시 "화면을 탭하면 다음으로 넘어가요"로 바꾸던 처리를 제거. 종료 후 자동 전환되므로 잘못된 탭 유도를 없앰. 재생 중 문구("영상을 끝까지 보면 다음으로 넘어가요")를 **그대로 유지**(텍스트 미변경) → 깜빡임·레이아웃 흔들림 없음.
  - 구현: `renderVideo`의 `unlock()`(ended·error 공통)에서 `hint.textContent = tapNext` 한 줄 제거. 영상 ended 자동 전환·게이트 잠금·error 안전장치(자동 이동 없음, 잠금만 해제)는 그대로.
  - `hints.tapNext` config 문구는 **삭제하지 않음**(다른 수동 이동 페이지들이 계속 사용). 영상 흐름에서만 미표시.
- 서비스워커 캐시명 `eslo-game-v0.9.5-beta`.

---

## [v0.9.4-beta] - 2026-07-14
### 완료 이벤트 기반 자동 전환(6개 장면) + Page6/12 문구·강조
페이지 순서(13페이지)·이미지·영상·효과음·드래그·기존 네비게이션 구조 불변. **전역/단순 타이머 자동 전환 아님** — 각 장면의 실제 완료 이벤트에서만 이동.

### Added
- **완료 이벤트 기반 자동 전환** — 지정 6개 장면(`scene.autoNext`)만:
  - Page3→4 / Page4→5 / Page8→9 / Page9→10 : 드래그 **onComplete**(계면이 모두 생성 / 거품 모두 제거) 직후.
  - Page6→7 / Page11→12 : 영상 **ended**(정상 종료) 직후.
  - 공통 안전장치: `scheduleAutoNext`가 `setTimer`(450ms 여운)로 예약 → `clearScene`(다음/이전/처음으로/goToStep/renderScene 진입점)에서 자동 취소. `autoNextScheduled` 플래그로 장면당 1회. 발화 시 `index===fromIndex`·`!busy`·`!videoGateLocked` 재확인(수동 이동·중복 이벤트로 2페이지 건너뜀 방지). 영상 재생 중 탭/다음/페이지점 차단은 유지, 정상 종료(ended)에만 자동 이동, 오류(error)는 잠금 해제만(자동 이동 안 함).

### Changed
- **Page6 문구**: "일반 바디워시 속 **나쁜 계면활성제**는 / 물에 씻기지 않고 피부에 남아 / 자극을 유발해요!" — '나쁜 계면활성제'만 별도 span(`.bad-emph`, 붉은색 + 은은한 붉은 glow 반복, reduced-motion 정적). 길어진 문장에 맞춰 `.video-caption` 폰트/줄간격/폭 조정(카드 넘침·영상 겹침 없음, 360px 3줄 유지, 데스크톱 과소 아님).
- **Page12 비교 라벨**: 좌 "일반 계면활성제 / 바디워시", 우 "생분해 계면활성제 / 이슬로 베이비 워시" — 둘 다 2줄, 좌우 폰트·기준선·높이 균형(기존 `.compare-label` 정렬 활용). 이미지 겹침·카드 잘림 없음.
- 서비스워커 캐시명 `eslo-game-v0.9.4-beta`.

---

## [v0.9.3-beta] - 2026-07-14
### Page1 "?" 연출 · STEP 번호 정정 · 필수 시청 영상(Page6·11) · Page7 확대 · Page10 배지 삭제 · 모바일 로고 하단 이동
게임 흐름·페이지 순서(13페이지)·문구·드래그/네비게이션 구조 불변. 자동 페이지 전환 없음.

### Added
- **Page1(MISSION)**: 아이 양옆 "?" 픽토그램(`.q-mark`, 부드러운 둥실+살짝 회전 `qFloat`, reduced-motion 대응) — 어떤 바디워시를 써야 할지 궁금해하는 연출.
- **필수 시청 영상 게이트**(`requireEnd`): Page6(prof.mp4)·Page11(prof_nongye.mp4)는 영상이 끝나기 전에는 탭/다음으로 이동 불가. `videoGateLocked` + 종료(`ended`) 시 해제, 재생 중 다음 버튼 비활성·안내문("영상을 끝까지 보면 다음으로 넘어가요") → 종료 후 "화면을 탭하면 다음으로 넘어가요"로 전환. 로드 실패(`error`) 시 잠금 해제(영구 멈춤 방지).
- **Page11**: `assets/images/prof_nongye.mp4` 영상 사용(신규 asset key `bioVideo`). 기존 placeholder → 실제 영상 + 필수 시청.

### Changed
- **STEP 번호 정정**: Page3 STEP1→2, Page4 STEP1→3, Page8 STEP2→4, Page9 STEP3→5. (Page2 STEP1 유지 → 배지 순서 1→2→3→4→5)
- **Page7**: 제품 이미지·제품명·키워드 폰트 확대 + 제품 확대로 키워드가 제품에 더 가깝게 모이는 배치(겹침 없음 유지).
- **Page10(MISSION 성공!)**: 상단 파란 배지 삭제(아래 성공 문구와 중복) — `badgeLabel`에서 missionSuccess 분기 제거. 나머지 정렬 유지.
- **상단 안내 문구**(`.bottom-hint`): 글자 크기 축소(`clamp(11px,1.3vw,15px)`) — 카드 밖 넘침·과대 방지.
- **모바일(세로) 브랜드 로고**: 상단 텍스트 가림 문제 → 하단 컨트롤 바로 위 중앙으로 이동(`.brand-logo` portrait: top→bottom 72px, 폭 clamp(54,15vw,68)). 카드·페이지번호·컨트롤·설정 버튼과 겹치지 않음. (데스크톱 우상단 배치 불변)
- 서비스워커 캐시명 `eslo-game-v0.9.3-beta`.

---

## [v0.9.2-beta] - 2026-07-14
### 후속 UI 수정 — 마지막 페이지 가로화면 겹침 · 모바일 상단 로고 · 하단 컨트롤 정렬
게임 흐름·페이지 순서(13페이지)·문구·게임 로직 불변. UI 3건만 수정.

### Fixed
- **마지막 페이지(Page 13) 낮은 가로 화면 겹침/잘림 수정**: 데스크톱·태블릿·가로 모바일(높이 ≤880px)에서
  제목·로고·제품·다시하기 버튼이 겹치던 문제. `renderBrandFinal`에 `is-brand-final` 스코프 클래스 추가 후,
  `@media (orientation: landscape) and (max-height: 880px)`에서 제목·엔딩로고·제품히어로·버튼·여백을
  화면 높이(vh) 기준으로 균형 있게 축소(제품은 높이 기준으로 병 크기 조정). 세로(portrait)는 불변.
  검증: 1280×800 / 1024×768 / 844×390 / 812×375 겹침·잘림 0, 375×812 / 390×844 / 412×915 정상.
- **모바일 하단 컨트롤 5버튼 정렬**: 컨트롤 자체는 이미 중앙(±0.5px)이었고, 우측 하단 설정(톱니) 버튼이
  좁은 폭(≤360px)에서 컨트롤과 겹치던 것이 "우측 쏠림"으로 보이던 원인. `.admin-gear`를 세로 화면에서
  컨트롤 바 위로 올려(`bottom: 74px`) 겹침 제거. 메인 5버튼은 별도 fixed 정중앙 정렬 유지(설정 버튼과 분리).

### Changed
- **모바일 상단 브랜드 로고 축소·이동**: 전역 플로팅 로고(`.brand-logo`, Page 13 내부 엔딩 로고와 별개)를
  세로 화면에서 확실히 작게(폭 ~74px→~50px) 줄이고 카드 위 빈 띠 중앙으로 이동 → 본문 카드 가림 해소.
  (데스크톱 스타일은 기존 유지)
- 서비스워커 캐시명 `eslo-game-v0.9.2-beta`로 갱신.

---

## [v0.9.1-beta] - 2026-07-14
### PAGE 6→7 전환 오류 수정 + PAGE 7·12·마지막 페이지 디자인 다듬기
게임 흐름·페이지 순서(13페이지)·문구·게임 로직은 불변. 네비게이션 버그 수정과 3개 페이지의 시각 정리만.

### Fixed
- **PAGE 6→7 전환 실패 수정**: 설명 영상(PAGE 6)의 영상 영역을 탭해도 다음 페이지로 넘어가지 않던 문제.
  - 원인: `isInteractiveTarget`의 탭-제외 목록에 `.info-video, video`가 포함되어 있었고, 영상에 "탭=재생/정지 토글" 핸들러가 걸려 있어, 화면 중앙의 큰 영상을 탭하면 이동 대신 정지/재생만 되어 "멈춘 것처럼" 보였음.
  - 수정: 영상 영역을 탭-제외 목록에서 제거(다른 페이지와 동일하게 영상 탭도 다음으로 이동) + 영상의 탭-토글 핸들러 제거. 영상 재생/정지는 좌측 컨트롤의 ▶/⏸ 버튼으로 그대로 유지.
  - 결과: PAGE 1↔13 정·역방향 이동 및 PAGE 6→7 전환 100% 정상(콘솔 오류 0).

### Changed
- **PAGE 7(이슬로 소개)**: 제품 이미지(eslo-bath) 조금 더 크게, 제품명 폰트 조금 더 크게.
  키워드 순서 변경(생분해 → 안심 베이비케어 → 피부에 남지 않는 계면활성제).
  말풍선을 흰색 비정형 물방울(내부 흰색 + 얇은 파란 스트로크, 세 개 모두 줄바꿈 허용)로 정리, 제품과 겹침 방지.
- **PAGE 12(비포/애프터 비교)**: 가운데 'VS' 텍스트 삭제. baby-sad 오른쪽 엉덩이에 `normal_wash`,
  baby-happy 오른쪽 엉덩이에 `eslo-bath` 이미지를 아이보다 조금 작게 자연스럽게 배치.
- **마지막 페이지(브랜드)**: 로고를 조금 작게 + 위/아래 여백 확보(제목·제품과 겹침 방지).
  하단 문구("이슬로와 함께 … 시작해볼까요?") 삭제(`brandFinalDesc` 빈 값, 값이 있을 때만 렌더).
- 서비스워커 캐시명 `eslo-game-v0.9.1-beta`로 갱신.

---

## [v0.9.0-beta] - 2026-07-13
### 수동 네비게이션 개편 — 이전 버튼 · 자동전환 삭제 · 탭 진행 · 플레이/정지 재정의
컨트롤/이동 구조만 리팩터. 게임 콘텐츠·페이지 순서(13페이지)·문구·이미지·영상·배경·계면이·드래그 로직은 불변.

### Added
- 이전 페이지 이동 버튼(PAGE 1 비활성, PAGE 2~13 활성)
- 화면 빈 영역 탭 기반 수동 페이지 진행
- 현재 장면 영상·CSS 애니메이션 플레이/정지 제어(영상 탭=재생/정지 토글)

### Changed
- 컨트롤 순서 개편 → 처음으로 / 플레이 / 이전 / 정지 / 다음
- 모든 페이지 이동을 사용자 입력(탭·다음·이전) 기반으로 변경
- 다음/이전/탭 이동을 공통 네비게이션 함수(`goNext`/`goPrev`)로 통합
- 컨트롤 버튼에 `type`·`aria-label`·`aria-disabled` 접근성 속성

### Removed
- 페이지별 자동 화면 전환 타이머(`setTimer(next,…)` 전수) · `next()`/`queuedNext`
- 드래그 완료 후 자동 다음 이동(onComplete proceed)
- 성공·안내·경고·영상 장면의 자동 진행

### Improved
- 드래그와 화면 탭 오인 방지(인터랙티브 시작 대상 검사 + 12px 이동 임계)
- 영상 페이지 lifecycle(이탈 정지/해제·재진입 재생) 유지
- 버튼 disabled·접근성 속성, 모바일 5버튼 컨트롤 레이아웃(좁은 화면 겹침/스크롤 방지)

---

## [v0.8.0-beta] - 2026-07-13
### 신규 페이지 2개 추가(생분해 설명·Before/After 비교) + 화면 개선 (총 13페이지)
성공 화면(PAGE 10) 다음에 생분해 설명·비포/애프터 비교 페이지 2개를 추가하고,
PAGE 5·7·8·9·10의 문구·이미지·강조를 다듬었습니다. 게임 로직·드래그·계면이·배경·디자인 시스템은 불변.

### Added
- PAGE 10-1 생분해 설명 페이지(`biodegradeInfo`, video 렌더러 확장 — 영상 추후 첨부, 현재 4:3 placeholder "영상 준비 중")
- PAGE 10-2 Before / After 비교 페이지(`beforeAfterCompare`, `renderCompare` — 일반 바디워시(baby-sad) vs 이슬로(baby-happy))

### Changed
- PAGE 5 경고 화면 개선(제목 확대·본문 2줄·baby-sad 주변 계면이)
- PAGE 7 제품 소개 리디자인(단일 제품 eslo-bath + 말풍선 키워드 3 + 제품명 + floating)
- PAGE 8 문구 변경("이슬로 바디워시로…")
- PAGE 9 문구 변경("샤워기로 깨끗하게 씻어내 주세요")
- PAGE 10 성공 문구 변경 + '생분해' 강조
- `sw.js` CACHE_NAME → `eslo-game-v0.8.0-beta`
- 버전 표기 동기화(config/README/CHANGELOG/CLAUDE) → v0.8.0-beta

### Improved
- 전체 11 → **13페이지** 구조(페이지 번호/총계 자동 반영, 마지막 버튼 비활성)
- 모바일 레이아웃·반응형(비교 375px 2열 유지·≤360px 세로 스택, 말풍선 겹침 방지)
- 제품 소개 UI(말풍선 pill·제품명·floating)
- 접근성: 이미지 alt·비교 섹션 aria-label, `prefers-reduced-motion` 대응(모든 강조/모션)

---

## [v0.7.0-beta] - 2026-07-13
### STEP1 흐름 확장 · 계면이 배치 개선 · 계면활성제 설명 영상 페이지
STEP1(일반 바디워시) 구간을 확장하고, 계면이 배치를 안전 슬롯 기반으로 개선했으며,
정적 피부 클로즈업(residue) 화면을 prof.mp4 영상 설명 페이지로 교체했습니다. 총 11페이지 유지.
게임 로직·게이지·드래그 판정·성공/엔딩·효과음·배경·KEY COLOR 디자인 시스템은 불변.

### Added
- STEP1 안내 페이지(PAGE 1-1, 신규 `info` 타입): "먼저 일반 바디워시를 사용해서 씻어볼까요?" + normal_wash 이미지
- prof.mp4 기반 계면활성제 설명 영상 페이지(PAGE 5-1, `renderVideo`) — autoplay/muted/loop/playsinline
- PAGE 5(경고) baby-sad 주변 계면이 5개 연출

### Changed
- 일반 바디워시 이미지(`normal_wash.png`) · 샤워기 이미지(`washhead.png`) 교체
- 문구 수정: STEP1 안내/거품/헹굼 · 드래그 안내("일반 바디워시…") · "…씻어내주세요"
- residue 정적 화면 → prof.mp4 영상 설명 화면(문구 "일반 바디워시 속 계면활성제는…자극을 유발해요!")
- PAGE 1 비교 이미지(`baby-wonder.png`) 교체
- PAGE 2·3·5 계면이 이미지 풀을 gyemeon2/3/5 로 제한
- 샤워기 시작 위치 좌측 이동(아기 얼굴 비가림, PAGE 3·9)
- `sw.js` CACHE_NAME → `eslo-game-v0.7.0-beta`, 신규 소형 이미지 precache 추가(prof.mp4는 제외)
- 버전 표기 동기화(config/README/CHANGELOG/CLAUDE) → v0.7.0-beta

### Improved
- 계면이 **안전 슬롯 배치**: 얼굴 보호 영역(x16~84, y28~56) · 좌우 균형 · 최소 간격 충돌 검사 · 슬롯 폴백
- 계면이 얼굴 가림·한쪽 쏠림·과도한 겹침 방지, 머리위/어깨/몸통/다리 고른 분산
- 영상 lifecycle: 페이지 이탈 시 정지·해제, 재진입 시 처음부터 재생
- 경고 문구 강조 흔들림(`.shake-emph`, 진입 시 2회, 무한 반복 없음, `prefers-reduced-motion` 대응)

---

## [v0.6.1-beta] - 2026-07-13
### Page 1(MISSION) 문구 · 대표 이미지 교체 (콘텐츠 패치)
v0.6.0-beta 이후 소규모 콘텐츠 수정. **Page 1 외 모든 화면·게임 기능·디자인 시스템·배경은 불변.**

### Changed
- Page 1 문구: `어떤 제품을 써야 좋을까요?` → `어떤 바디워시를 써야 할까요?`
- Page 1 대표 이미지: `baby-happy` → `baby-wonder.png` (아기가 양손에 일반 바디워시·이슬로 바스앤샴푸를 든 비교 이미지)
- 신규 이미지 비율(662:744) 유지 + 모바일/데스크톱 배치 조정 (`.child-wonder`, `object-fit:contain` → 잘림 없음)
- `sw.js` `CACHE_NAME` → `eslo-game-v0.6.1-beta` (배포 시 이전 캐시 무효화)
- 버전 표기 동기화(config/README/CHANGELOG/CLAUDE) → `v0.6.1-beta`

---

## [v0.6.0-beta] - 2026-07-13
### 욕실 배경 시스템 · 반응형 배경 · 브랜드 디자인 시스템 리뉴얼(KEY COLOR #6DA1FF)
실제 욕실 배경을 도입하고, 화면 방향에 따라 세로/가로 배경을 자동 전환하도록 개선했습니다.
디자이너 지정 키컬러(#6DA1FF)를 기준으로 전체 UI를 "프리미엄 베이비 스킨케어 체험" 톤으로 통일했습니다.
**게임 로직·판정·자동 진행·타이밍·Scene 순서·문구·관리자 기능은 모두 불변** (시각/에셋 레이어만 변경).

### Added
- 욕실 배경 이미지 도입: 세로(모바일) `background-v2.png`, 가로(데스크톱) `background-wide-v2.webp`
- 반응형 배경 자동 전환 (`@media (min-aspect-ratio)` + CSS 변수 `--bg-portrait`/`--bg-wide`, `config.assets.backgroundWide`)
- 은은한 앰비언트 연출: 배경 위 느린 부유 빛/반짝임 (CSS 의사요소, DOM 추가 없음)
- 버튼 상태 정리: `hover` / `active(pressed)` / `disabled` 전 상태 스타일

### Changed
- **KEY COLOR #6DA1FF 기준 디자인 시스템 통일** — STEP별로 흩어진 색(파랑/민트/하늘/주황)을 키컬러로 수렴
  (경고=학습 메시지용 소프트 레드만 예외, 성공/브랜드=키컬러+연한 민트 보조)
- 보조 컬러를 화이트·아주 연한 스카이블루·아주 연한 민트로 제한, POINT 안내의 노란 톤 제거
- `sw.js` `CACHE_NAME` → `eslo-game-v0.6.0-beta` (배포 시 이전 캐시 무효화), 배경 v2 파일 precache 추가
- `config.meta.version` / README / CHANGELOG / CLAUDE.md 버전 표기 → `v0.6.0-beta`

### Improved
- 유리카드: 폭·여백 축소(더 가볍게), 투명도 상향(배경이 더 비침), 그림자·테두리·blur 프리미엄 톤 정리
- 진행 게이지: 완전 둥근 형태 + 은은한 glow + 부드러운 상승 애니메이션
- 텍스트 계층 명확화: 제목 > 강조문장(키컬러) > 설명(muted)
- 애니메이션 페이싱: 등장·전환을 더 느긋하게, 경고 흔들림 완화(2회→1회) — 힐링 무드
- 배경 노출: 카드 뒤 테마 광원 축소로 새 욕실 배경이 더 잘 보이도록 조정

---

## [v0.5.0-motion-test] - 2026-07-07
### 모션인식 연구용 실험 브랜치 분리 (feature/motion-test)
카메라/모션 인식 실험을 안정본과 분리하기 위한 브랜치 생성 단계.
**기능 구현 없음** — 버전 표기(config·README·CHANGELOG·CLAUDE)만 최소 변경했습니다.
안정본은 master의 v0.4.5-beta이며 그대로 유지됩니다. 운영본(eslobaby-game2)은 변경하지 않습니다.

### Changed
- `config.meta.version` → `v0.5.0-motion-test` (feature/motion-test 브랜치 전용)
- README/CLAUDE.md 버전 표기 및 실험 브랜치 안내 추가

---

## [v0.4.5-beta] - 2026-07-07
### 로고 배경 제거 · 제품 가로 배치 · 타이포/폰트 개선 (beta 저장소)
디자인/UI만 개선. 게임 로직·판정·점수·자동 진행·타이밍·Scene 순서·관리자 기능 불변.

### Changed
- **1) 로고 흰 배경 제거**: 공식 로고 PNG가 흰 배경(알파 없음, color type 2)이었음 → 가장자리
  **flood-fill 로 바깥 흰색만 투명화**(안쪽 "eslo baby" 글자는 보존, RGBA 로 재저장). 컨테이너 배경도
  transparent, 아주 은은한 그림자만 적용.
- **2) 제품 3종 가로 일렬 배치**(Page 6·10): 겹치던 히어로 → **나란히(겹침 없음)·동일 크기·균형 간격**.
  세로 병 비율 유지, 최대한 크게(데스크톱 3×126px, 모바일 3×96px). `buildProductHero` 는 바스앤샴푸→
  엉덩이 클렌저→로션 순.
- **3) 타이포그래피 개선**:
  - **폰트: Jua**(둥글둥글 귀여운 무료 Google Fonts) 적용 — index/share 에 로드, `theme.css --font-family`
    최상단. 오프라인 시 시스템 한글 폰트로 폴백.
  - **의미 단위 줄바꿈**(config `\n`): MISSION/바디워시/계면활성제 설명/이슬로 소개/성공/최종 문구를
    읽기 좋게 여러 줄로 분리(단어는 그대로, `\n`만 추가).
  - 줄간격(line-height)·자간(letter-spacing)·문단 여백 미세 조정, 모바일 가독성 유지.
- PWA 캐시 버전 `eslo-game-v0.4.5-beta`.

---

## [v0.4.4-beta] - 2026-07-07
### 공식 로고·실제 제품 3종 적용 + 브랜드 히어로/드래그 UX (beta 저장소)
디자인 에셋 교체 및 UI/UX 개선만. 게임 로직·판정·점수·자동 진행·타이밍·Scene 순서·관리자 기능 불변.

### Added (assets/images) — 실제 제품/로고 (웹 최적화)
- 공식 로고 `logo.png`(243×142).
- 이슬로 베이비 3종 누끼 PNG(원본 2693×5395·10MB대 → **높이 1000px·~390KB로 리사이즈**, 투명 유지):
  `eslo-bath.png`(바스앤샴푸) / `eslo-cleanser.png`(엉덩이 클렌저) / `eslo-lotion.png`(로션).

### Changed
- **1) 로고 교체**: `config.assets.logo` → 공식 로고. 우상단 브랜드 로고·엔딩 로고에 적용,
  실제 비율(`aspect-ratio:243/142`)로 잘림 없이 선명하게.
- **2) Page 2 일반 바디워시**: 펌프 SVG의 "일반 바디워시" 텍스트 제거 → 제품 형태만 표시.
- **3) 드래그 UX 개선**: 도구에 흰색 글로우 + 펄스 링(`::before`) + 손가락 힌트(👆 bob).
  처음 잡는 순간(`is-grabbed`) 유도 연출이 사라짐 — UI만, 판정과 무관.
- **4·6) Page 6·10 제품 3종 히어로**: 단순 나열 → 브랜드 메인 비주얼(`buildProductHero`):
  가운데 제품 최대, 좌우는 뒤로 `±12°` 회전·`scale 0.85`·겹침·그림자 입체감, 등장 애니메이션.
- **5) Page 7(이슬로 사용) 도구**: 이슬로 제품 이미지 = 바스앤샴푸(`eslo-bath.png`), 실제 병 비율
  (`aspect-ratio:500/1000`). 위치·씻김 애니메이션은 그대로.
- 그림자·비율·정렬 등 전반 완성도 소폭 개선, 브랜드 컬러/분위기 유지.
- PWA precache 에 로고·제품 3종 추가, 캐시 버전 `eslo-game-v0.4.4-beta`.

---

## [v0.4.3-beta] - 2026-07-07
### UI/연출 개선 + 효과음(SFX) 추가 (beta 저장소)
디자인·연출(UI/UX)만 개선. 게임 로직·판정·점수·타이밍·자동 진행·Scene 순서·관리자 기능은 불변.

### Changed
- **아기 밑 게이지바(`.rub-meter`) 숨김**: 화면에서 완전히 안 보이게 `display:none`(관련 로직/요소는 유지).
- **계면이 약 25% 축소**: `.surfactant` 크기 축소(판정과 무관), 모바일/PC 자연스러운 크기.
- **계면이 배치 개선**: 아기 **얼굴 영역을 피해 몸(팔·배·다리) 주변에만** 생성(`addSurfactants(...,avoidFace)`,
  top 48~88%). 개수 `config.gauge.surfactantCount` **6개(8→6)** 로 축소 → 더 깔끔.
- **Page 4(경고) 아기 얼굴 위 빨간 원 제거**: `addIrritations` 호출 삭제(baby-sad 이미지에 이미 발진 포함).
- **샤워기 약 25% 확대**: 도구별 클래스 `tool-shower` 로 샤워기만 크게(선명), 위치·씻김 애니메이션 불변.
- **Page 5(계면활성제 설명) 계면이 floating**: 더 작게 + `germFloat`(위아래 부드러운 이동 + 약간의 좌우
  흔들림, easing, 과하지 않은 속도). 인스턴스별 delay 로 자연스럽게 분산. 판정 영향 없음.

### Added — 효과음(SFX)
- `js/sfx.js`: **Web Audio 합성** 기반 가볍고 귀여운 효과음(무료·무설치). `config.sfx`(enabled/volume/files).
  - 버튼 클릭 / Scene 시작 / 계면이 등장(pop) / 계면이 씻김(splash) / 샤워 물줄기(water) / 물방울(drip) /
    성공(success) / 경고·실패(warn) / 완료(complete).
  - 볼륨 기본 `0.35`(과하지 않게), 첫 제스처에서 오디오 컨텍스트 활성화, 전부 try/catch(게임 영향 0).
- `assets/sounds/` 구조 + README: 실제 음원으로 교체하려면 파일을 넣고 `config.sfx.files` 에 경로 연결.
- PWA precache 에 `js/sfx.js` 추가, 캐시 버전 `eslo-game-v0.4.3-beta`.

---

## [v0.4.2-beta] - 2026-07-07
### 실제 디자인 에셋(아기·계면이) 적용 (beta 저장소)
placeholder(SVG)로 그리던 아기·계면이를 새로 받은 `1x` PNG 에셋으로 교체. **이미지 리소스만 교체**하며
게임 로직·판정·애니메이션·타이밍은 불변. placeholder 시스템은 그대로 유지(이미지 실패 시 SVG fallback).

### Added (assets/images)
- 아기 3종: `baby-basic.png`(기본) / `baby-happy.png`(성공·깨끗) / `baby-sad.png`(자극·실패).
- 계면이 6종: `gyemeon1~5.png`(표정 변형) + `gyemeon6-sad.png`(Scene 8 씻김 표정).

### Changed
- **아기 이미지 매핑**: `config.assets.child/childHappy/childSad` → 새 아기 PNG.
  아기 이미지 비율(481×705, 세로형)에 맞춰 `.child-body` 를 `aspect-ratio: 481/705` 세로 박스로 보정
  (이미지가 여백 없이 꽉 차게, 데스크톱·모바일 반응형).
- **계면이 표정 매핑**: `config.assets.gyemeon`(5종 배열) + `gyemeonSad`. 인스턴스마다 무작위 표정,
  장면 감정(mood)에 어울리는 표정 풀 선택 — playful=웃음/능글, anxious=뾰루퉁/화남, panic=놀람/화남 등.
- **Scene 8(esloRinse) 씻김 표정 교체**: 샤워기에 맞아 씻겨 내려가기 시작하는 순간 표정을
  `gyemeon6-sad.png` 로 변경한 뒤 그대로 씻겨 내려감. (평소엔 일반 계면이 표정, 씻김 순간에만 sad)
- PWA precache 에 새 이미지 9종 추가, 캐시 버전 `eslo-game-v0.4.2-beta`.

### Removed
- 별도 제거된 이미지 파일 없음(기존 `assets/images` 에는 실제 이미지가 없었고 SVG placeholder 사용 중이었음).
  config 의 이전 경로(child.png/surfactant.png 등)는 새 에셋 경로로 갱신.

---

## [v0.4.1-beta] - 2026-07-06
### 인터랙션·연출 완성도 향상 (UI/UX Polish, beta 저장소)
기능 추가 없이 전체 연출/애니메이션을 브랜드 인터랙티브 콘텐츠 수준으로 다듬음.
게임 진행 방식·기능·관리자 기능은 그대로 유지. 모든 모션은 transform/opacity 기반(경량·GPU 합성).

### Changed / Added
- **화면 전환**: 모든 STEP 동일 규칙 — 페이드 + 살짝 아래→중앙 슬라이드(translateY 12→0, 약 300ms).
  장면이 끊기지 않고 이어지는 느낌.
- **계면이 감정 모션**: 캐릭터를 outer(위치·씻김) + inner(감정) 래퍼로 분리해 충돌 없이 감정 부여.
  - STEP1① `playful`(신나게 통통) / STEP1② `clinging`(웃으며 붙어 흔들) /
    STEP2 `anxious`(불안한 떨림) / STEP3 `panic`(놀라며 흔들다 씻겨 내려감).
  - 기존 캐릭터 디자인 유지, 모션으로 감정 전달. 씻길 땐 모션 정지(성능).
- **거품**: 표시/숨김을 display→opacity 전환으로 바꿔 부드럽게 나타남/사라짐 + 살짝 떠오르는 흔들림.
- **물 효과**: 샤워(헹굼) 장면(STEP1②·STEP3)에 아래로 흐르는 물방울 연출 추가 →
  거품 생성(STEP1①)과 물 흐름(STEP3)의 차이가 명확.
- **경고 화면**: 화면 가장자리 은은한 붉은 Glow(점멸) + 카드 가벼운 흔들림 2회 + 경고 문구 팝 등장 +
  기존 경고등 점멸. (아이·보호자 대상 — 과하지 않은 수준)
- **결과(성공) 화면**: 성공 문구 팝 등장 + 반짝임/컨페티 강조로 "미션 완료·깨끗해진 피부"를 긍정적으로 전달.
- **버튼**: 클릭 시 축소→복귀, Hover(PC) 리프트, 통일된 pill radius·shadow·padding 유지(디자인 시스템 일관).

### 유지(불변)
- 자동 진행·처음으로·플레이·정지·다음·페이지 이동·**관리자(Admin)**·모바일/세로·PWA·share.html·
  GitHub Pages·assets/placeholder. 계면이 생성/잔류/씻김 로직·게이지 내부 로직·문구 전부 그대로.
- PWA 캐시 버전 `eslo-game-v0.4.1-beta`.

---

## [v0.4.0-beta] - 2026-07-06
### 관리자(Admin) 대시보드 + 플레이 분석 추가 (beta 저장소)
운영자가 게임 현황·데이터를 확인할 수 있는 관리자 페이지 추가. 일반 사용자에게는 노출되지 않으며,
게임 로직/디자인과 분리되어 동작. 저장은 LocalStorage 기본(Firebase 확장 가능 구조).
기존 게임 기능(자동진행·컨트롤·페이지 이동·PWA·share.html·GitHub Pages·모바일)은 모두 유지.

### Added
- **관리자 진입(톱니바퀴)**: 우측 하단에 은은한 설정 아이콘(40×40, 터치 영역 확보, 모든 화면 동일 위치,
  기본 opacity 0.4). `config.admin.gearEnabled: false` 로 완전 숨김 가능.
- **관리자 로그인**: 비밀번호 입력(오답 시 안내 문구). 비밀번호는 `config.admin.password` 로 분리.
- **관리자 대시보드**(`js/admin.js` + `css/admin.css`, 브랜드 톤 유리카드·모바일 카드형):
  - 플레이 통계: 오늘 플레이 / 전체 플레이 / 완료 수 / 완료율 / 평균 플레이 시간
  - STEP 퍼널: 게임 시작 → STEP1 → STEP2 → STEP3 → 완료 (단계별 인원 + 완료율 막대)
  - 화면별 평균 체류시간 (장면별)
  - 기기(OS) 분포: iPhone / Android / 기타
  - 최근 오류 로그: 발생 시간 · 화면(STEP) · 메시지 · 기기/브라우저
  - 새로고침 / 통계 초기화(확인 후)
- **분석 모듈**(`js/analytics.js`): 세션·퍼널·체류시간·기기·오류를 LocalStorage에 수집.
  전 구간 try/catch 로 게임에 영향 없음. `save()` 안 `sync()` 훅으로 **추후 Firebase 연동 확장 용이**.
- game.js 훅(최소): `startGame`(세션 시작)·`renderScene`(장면/퍼널/체류)·`renderGate`(세션 종료).
  `window.onerror`/`unhandledrejection` 자동 캡처.

### Changed
- `config.js` 에 `admin` 블록 추가(password/gearEnabled/firebase/title).
- index.html: `analytics.js`(game 앞)·`admin.js`(game 뒤) + `admin.css` 로드. 기존 로드 순서 보존.
- PWA precache 에 신규 파일 추가, 캐시 버전 `eslo-game-v0.4.0-beta`.

### 저장 방식
- **기본: LocalStorage** (`eslo_admin_v1`). 사용 불가 환경(프라이빗 모드 등)에서도 메모리로 게임은 정상.
- Firebase 미사용. `config.admin.firebase` 설정 시 `analytics.js`의 `sync()` 에서 확장(TODO 주석).

---

## [v0.3.3-beta] - 2026-07-06
### 시놉시스·인터랙션 연출 개선 + 페이지 번호 (beta 저장소)
STEP 조작 연출을 "거품 + 계면이 동시 생성 → 헹굼 시 잔류/제거"로 재구성해 이슬로의 차별점을
명확히 전달. 각 화면 하단에 페이지 번호 추가. 기능/구조/자동진행/컨트롤/PWA/share.html/모바일 유지.

### Added
- **화면 하단 페이지 번호**: 모든 장면 카드 하단(페이지 점 아래)에 작고 차분한 `Page N / 10` 표시.
  콘텐츠를 방해하지 않는 위치·크기, 모바일 세로에서도 표시. (접두어는 `texts.page`)
- **계면이 생성 연출**(`surfactantGrow`): 제품을 문지를수록 거품과 함께 계면활성제 캐릭터가
  하나씩 팝업으로 생겨남.

### Changed — STEP 연출
- **STEP1 ① 바디워시**: 문지를수록 **거품 + 계면이 동시 생성**.
- **STEP1 ② 샤워**: 헹구면 **거품만 사라지고 계면이는 그대로 남음** — "깨끗해 보이지만 실제로는
  계면활성제가 피부에 남아 있다"는 메시지.
- **STEP2 이슬로**: STEP1①과 동일하게 **거품 + 계면이 동시 생성**.
  - 조작 안내 문구: `제품을 아이 몸에 문질러 주세요` → **`이슬로 제품을 아이 몸에 문질러주세요.`**
- **STEP3 샤워**: **거품과 계면이가 함께 씻겨 내려가 모두 사라짐**(기존: 계면이만 제거).
  - 조작 안내 문구: `샤워기로 헹굴수록 계면이와 자극이 사라져요` → **`샤워기를 아이 몸에 문질러주세요.`**

### 유지(불변)
- 자동 진행·처음으로·플레이·정지·다음·페이지 이동·모바일/세로·PWA·share.html·GitHub Pages·
  assets/placeholder·게이지 내부 로직(미표시 유지)·계면활성제 설명 문구·v0.3.0 디자인 시스템.
- PWA 캐시 버전 `eslo-game-v0.3.3-beta`.

---

## [v0.3.2-beta] - 2026-07-06
### UI/UX 정리 — 게이지 단순화 + 타이포그래피 개선 (beta 저장소)
STEP 화면에서 사용자용 민감도 게이지를 제거해 계면이 연출·문구 전달에 집중하고, 전체 타이포를
카드뉴스처럼 읽기 좋게 정리. 기능/구조/자동진행/컨트롤/PWA/share.html/GitHub Pages/모바일 대응 유지.
※ 이 저장소는 운영(eslobaby-game2)과 분리된 **beta 미러**(원격: eslobaby-game-beta).

### Changed
- **STEP 화면 민감도 게이지 미표시**: STEP1①·STEP1②·STEP2·STEP3 드래그 화면에서
  게이지를 사용자 화면에 붙이지 않음. **내부 로직(게이지 객체·state.irritation·완료 판정)은 그대로 유지**
  → 드래그 완료·자동 진행·계면이 씻김 동작 불변. STEP2/3는 계면이 사라지는 연출에 집중.
- **경고 화면 리뉴얼**(게이지 제거): 메인 문구 `경고! 피부 자극 위험!` + 추가 문구
  `우리 아이 피부가 불편해요!`(신규, `texts.gauge.warnSub`) + **더 큰 비상 경고등**(반응형, 무대 좌하단,
  모바일에서 넘침/잘림 방지) + 울상 아이.
- **타이포그래피 정리**: 제목/보조문구/안내문 계층 분리, 줄 간격·문단 여백 확대, 한글 단어 단위
  줄바꿈(keep-all), 힌트는 더 작고 차분하게. 모바일 세로에서도 답답하지 않게 조정. (브랜드 톤 유지)
- PWA 캐시 버전 `eslo-game-v0.3.2-beta`.

### 유지(불변)
- 계면활성제 설명 문구 `바디워시 속 나쁜 계면활성제가 피부에 남아 자극을 유발했어요!` 그대로.
- 게이지 내부 로직·색상 규칙·Scene 구조·config·assets·placeholder·자동진행·컨트롤·페이지 이동·
  PWA·share.html·GitHub Pages·모바일/세로·v0.3.0 디자인 시스템. (게이지 CSS/`buildGauge`는 보존)

---

## [v0.3.1] - 2026-07-06
### 시나리오 보완 — STEP1 인터랙션 흐름 개선 (기능 추가 아님)
STEP1을 STEP2/STEP3와 동일한 "제품 사용 → 샤워" 2단계 UX로 통일. 게이지 상승 방식만 변경(최종 100% 유지).
config·Scene·assets·placeholder·자동진행·컨트롤·PWA·GitHub Pages·모바일/세로·v0.3.0 디자인 시스템 유지.

### Changed
- **STEP1을 2단계 인터랙션으로 분리** (STEP2/3과 동일한 조작 경험):
  - ① `bodywashUse`: 바디워시로 거품 — 게이지 **0% → 50%** (파랑→주황)
  - ② `bodywashRinse`(신규 장면): 샤워기로 헹구기 — 게이지 **50% → 100%** (주황→빨강)
  - 두 장면 모두 phase=STEP1 / step=1 (배지 "STEP1" 동일), 드래그 완료 시 자동으로 다음 장면 진행
  - 나쁜 바디워시는 헹궈도 계면활성제가 남아 자극이 100%까지 오르는 흐름
  - 기존 STEP1(단일 장면, 0→100)의 최종 결과(100%)·색상 규칙(0%파랑/50%주황/100%빨강)은 그대로
- **문구 수정**(요청 원문 그대로): 나쁜 계면활성제 설명
  - `바디워시 속 나쁜 계면활성제는 피부에 남아 자극을 유발해요!`
    → **`바디워시 속 나쁜 계면활성제가 피부에 남아 자극을 유발했어요!`**
  - 구버전 문구는 config 주석으로 보존
- **카드 내부 "🏠 처음으로" 미니 버튼 삭제**: 좌측 고정 컨트롤의 처음으로로 일원화
  (좌측 컨트롤의 처음으로 기능은 그대로 유지 / `.card-home` CSS는 복구 대비 보존)
- PWA 캐시 버전 `eslo-game-v0.3.1`

### Added (config 문구 — 교체 가능)
- `texts.scenes.bodywashRinse`(STEP1 샤워 단계 제목), `texts.hints.dragShower`(샤워 조작 안내)

---

## [v0.3.0] - 2026-07-06
### UI 전면 리디자인 — "브랜드 체험 앱" 수준 디자인 시스템 (기능/구조 불변)
기능 추가·구조 변경 없이 **디자인 시스템만 전면 리뉴얼**. config·Scene·STEP 흐름·자동재생·
플레이/정지/다음/처음으로·페이지 이동·PWA·GitHub Pages·placeholder·asset 교체·모바일 대응은
모두 그대로. 문구도 임의 변경 없음. (minor 버전)

### Added — 디자인 시스템 (css/game.css 하단 "v0.3.0 디자인 시스템" 레이어)
- **STEP별 컬러 테마**: game.js 가 `.screen` 에 `theme-*` 클래스를 부여(장면 id 기반, 시각 전용).
  MISSION→민트 / STEP1→블루 / STEP2→스카이블루 / STEP3→오렌지 / 경고→레드 /
  성공→민트+골드 / 최종→브랜드 민트. 각 테마가 `--accent/--accent-soft/--glow` 변수를 세팅.
- **유리카드(glassmorphism)**: 반투명 화이트+테마 그라데이션, `backdrop-filter: blur(16px)`,
  라운드 28~40px, 흰 테두리+테마 링, 입체 그림자, 상단 유리 하이라이트. 카드 뒤 테마 광원(`::before`).
- **게이지 리뉴얼**: 굵은 둥근 막대 + inset 트랙 그림자 + 광택 하이라이트 + 채움 이징,
  경고 시 pulse 링, 진정(0%) 시 블루 글로우.
- **STEP/MISSION 배지**: iOS pill 스타일(테마 그라데이션 + 입체 + shine 스윕).
- **페이지 인디케이터**: 현재 페이지가 알약으로 확장(테마색) + 부드러운 이징.
- **컨트롤 버튼**: 유리 버튼 + hover 상승/active 축소 + 아이콘 중심 (운영자 느낌 제거).
- **애니메이션**: 카드 등장(fade+scale), 제목 fade-up, 제품/도구 slide-in, 캐릭터 pop,
  게이지 fill, 배지 shine, POINT 카드 pop, 버블 float — 모두 200~360ms.
- **여백 축소**: 카드/본문 gap·padding·margin 축소로 화면이 꽉 차게.
- **제품/캐릭터 확대**: 캐릭터 240→300px(약 1.25×), 도구 118→150px, 제품 138→196px(약 1.4×).
  무대 하단에 욕조/거품 베이스 광원 추가로 아이·거품·욕조를 한 덩어리로 연출.
- **MISSION 화면에 아이 캐릭터 추가**(레퍼런스 반영, 기존 asset/placeholder 사용).

### Changed
- 타이포 계층 재설계(제목 900 굵기·자간 조정, 힌트/보조문구 크기 정리).
- MISSION 본문 중복 배지는 헤더 배지로 대체되어 숨김 처리(기능/텍스트는 보존).
- PWA 캐시 버전 `eslo-game-v0.3.0`.

### 유지(불변)
- config.js·Scene·STEP 흐름·게이지 로직·문구·자동 진행·컨트롤·페이지 이동·PWA·share.html·
  GitHub Pages·placeholder·모바일/세로 대응 — 전부 그대로. 클래스명/DOM 구조 유지(스타일만 교체).

### Notes
- 헤드리스/백그라운드 탭에서는 CSS 전환·애니메이션 클럭이 멈춰 프리뷰 캡처가 제한되나,
  실제 포그라운드 브라우저에서는 정상 재생됨(구조·테마·크기·오버플로우는 계산값으로 검증 완료).

---

## [v0.2.8] - 2026-07-06
### UI 톤 개편 — 레퍼런스(카드뉴스형) 반영
기능 추가가 아니라, "게임 흐름 한눈에 보기" 레퍼런스의 레이아웃/톤/구성 원칙을 현재 게임에 적용.
기존 config·assets·placeholder·모바일/세로·PWA·GitHub Pages·share.html 구조는 모두 유지.
문구는 임의 변경하지 않음(config 그대로).

### Changed
- **카드뉴스형 카드 복원(개선)**: v0.2.7의 완전 투명 카드 → 레퍼런스처럼
  **약간 투명한 화이트/블루 카드**로 변경.
  - 얇은 하늘색 테두리 + 둥근 모서리 + 부드러운 그림자 + 프로스티드 blur
  - 완전 흰색이 아니라 반투명이라 욕실 배경/거품이 은은하게 비침 (너무 큰 흰 박스 지양)
  - v0.2.7에서 텍스트마다 넣었던 반투명 박스는 제거(카드가 배경 역할) → 이중 박스 방지
- **카드 상단 헤더 신설**: 좌측 "🏠 처음으로" 미니 버튼(사용자용) + 중앙 STEP/MISSION 배지
  - 배지: 진한 파랑 알약 + 흰 글씨. STEP1~3 / MISSION / MISSION 성공! 에만 표시
    (설명·최종 브랜드 화면은 배지 없음)
  - 게이트(카카오 채널)에는 헤더 없음(요청 반영)
  - 좌측 고정 컨트롤 패널(운영자용)은 그대로 유지 → 역할 분리
- **페이지 인디케이터 위치 이동**: 화면 하단 고정 → **카드 안쪽 하단의 작은 원형 점**으로 이동.
  현재 페이지 진한 파랑, 나머지 연한 파랑. 클릭 이동·`stepNavigationEnabled` 잠금 유지.
- **"다음" 버튼 강조**: 좌측 컨트롤의 다음(→) 버튼을 파란 그라데이션 + 큰 화살표로 강조
  (레퍼런스의 카드 사이 파란 화살표 느낌 — 요구 5 반영)
- **제목 색 정리**: 제목은 진한 네이비, 위험/경고 문구만 빨강 (레퍼런스 톤)
- **PWA 캐시 버전 갱신**: `sw.js` `CACHE_NAME` → `eslo-game-v0.2.8`

### 보존(삭제 아님)
- 구버전 상단 진행 표시 CSS(top-bar/phase-list/step-badge/step-numbers/progress-bar)와
  기존 렌더러(mission/message/reaction/success/ending)는 복구 대비 유지

### Notes
- 게이지(0% 파랑 / 50% 주황 / 100% 빨강)·경고 빨강·샤워 0% 파랑 강조는 v0.2.5부터 유지
- 장면 전환은 부드러운 크로스 페이드 (헤드리스/백그라운드 탭에서는 CSS 전환이 멈춰 보일 수
  있으나 실제 포그라운드 브라우저에서는 정상 표시됨)

---

## [v0.2.7] - 2026-07-06
### UI 개선 — 카드뉴스형 화면 · 하단 페이지 인디케이터 · "다음" 컨트롤 추가
게임 기능을 새로 추가하는 작업이 아니라, 현재 화면의 형태와 조작 편의성을 개선.
기존 config·assets·placeholder·모바일/세로·GitHub Pages·PWA·share.html 구조는 모두 유지.

### Changed
- **경고 화면 문구 변경**: 게이지 경고 문구를 `민감도 100% · 피부 자극 위험!`
  → **`경고! 피부 자극 위험!`** 로 수정 (`config.texts.gauge.warn`, 구버전은 주석 보존).
  게이지 100% 표시·민감도 라벨은 유지.
- **카드뉴스형 UI**: 중앙의 큰 흰색 카드 배경(`.scene-card`) 제거 → 욕실 배경 위에
  콘텐츠가 자연스럽게 배치되는 카드뉴스 슬라이드 느낌으로 변경.
  - 제목·게이트 문구·미션 목표·성공 문구·힌트 등 **텍스트 영역에만 작은 반투명 박스/그림자**를
    적용해 가독성 확보 (완전 투명으로 안 보이는 문제 방지)
  - STEP 배지(카드 상단 STEP1~3)는 그대로 유지
- **진행 표시 → 하단 페이지 인디케이터(A안)**: 상단의 큰 라벨 나열(MISSION/STEP1..)을
  하단 중앙의 작고 깔끔한 원형 인디케이터로 정리.
  - 현재 페이지: 진한 파랑 알약 + 라벨(작게) / 나머지: 연한 파랑 점
  - 각 항목 클릭 시 해당 구간 첫 장면으로 이동 (`stepNavigationEnabled` 잠금 유지 —
    false면 클릭 비활성)
  - 라벨 텍스트는 `config.texts.phases` 로 계속 관리
- **PWA 캐시 버전 갱신**: `sw.js` `CACHE_NAME` → `eslo-game-v0.2.7` (변경분 재캐싱)

### Added
- **좌측 컨트롤 "다음(→)" 버튼 추가**: 기존 처음으로(🏠)/플레이(▶)/정지(⏸) + **다음(→)**.
  - 자동 진행 대기 없이 현재 장면을 건너뛰고 **즉시 다음 장면으로 이동**
  - 건너뛴 게이지 값은 목표값으로 보정(`irritationForIndex`)
  - **마지막 장면에서는 비활성화**(흐릿하게 표시)
  - 외부 제어 API `Game.next()` 추가
  - 터치 영역 유지(모바일 4버튼 하단 가로 배치, 인디케이터는 컨트롤 위에 배치해 겹침 방지)

### 보존(삭제 아님)
- 상단 진행 표시(`.top-bar`/`.phase-list`) 렌더링은 하단 인디케이터로 대체했으나 CSS는 보존
- 구버전 상단 STEP 표시(step-badge/step-numbers/progress-bar) CSS도 복구 대비 유지

---

## [v0.2.6] - 2026-07-06
### 공유 및 현장 접속 편의성 개선 — 공유 QR 페이지 · PWA · 배포 안내
GitHub Pages 배포 완료(https://manzzi3215-droid.github.io/eslobaby-game2/) 후,
현장/내부 공유와 모바일 접속을 쉽게 하기 위한 편의 기능 추가.
기존 게임 기능·config·assets·placeholder·모바일/세로 대응·STEP 클릭 이동·
처음으로/플레이/정지·자동 진행·오프라인 실행 구조는 모두 유지.

### Added
- **공유용 QR 페이지 (`share.html`)**: 제목·안내문·배포 URL·QR·"게임 바로가기" 버튼
  - 용도: 회사 내부 공유 / 베이비페어 현장 테스트 / 모바일 접속 안내
  - 접속: https://manzzi3215-droid.github.io/eslobaby-game2/share.html
  - 전용 스타일 `css/share.css`, 로직 `js/share.js`
- **QR 코드 생성기 (`js/qrcode.js`)**: 외부 라이브러리 없이 실제 스캔 가능한 QR을
  생성(바이트 모드 인코딩 + Reed-Solomon 오류정정 + 자동 버전/마스크 선택). 오프라인 동작.
  - 배포 URL 기준 자동 생성. 실제 QR 이미지(`assets/qr/share-qr.png`)를 넣으면 자동 교체.
- **PWA 기본 설정**
  - `manifest.webmanifest`: 앱 이름 "이슬로 베이비 미니게임", short_name "이슬로게임",
    start_url `./index.html`, display `standalone`, background/theme_color 파스텔 블루(`#eaf6ff`/`#7fbce6`)
  - `assets/icons/icon.svg`: placeholder 아이콘(추후 PNG 192/512로 교체 가능)
  - `sw.js`: 서비스워커(기본 캐싱 수준 — precache + cache-first). 상대경로라 하위 경로에서도 동작
  - `index.html`에 PWA 메타태그 추가(manifest 연결, theme-color, apple-mobile-web-app-*,
    apple-touch-icon) + 서비스워커 등록 스크립트 (기존 스크립트 로딩 순서 유지, file:// 실행 시 자동 무시)
- **README 배포 안내**: GitHub Pages 접속 링크·공유 QR 페이지·모바일 접속·홈 화면 추가 방법·
  배포 방식(GitHub Actions Pages)·수정 후 배포 방법 정리 (섹션 0 신설)

### Notes
- 경로는 상대경로 중심으로 작성 → GitHub Pages 하위 경로 `/eslobaby-game2/` 에서 정상 동작
- `index.html` 더블클릭(오프라인) 실행은 그대로 유지. (SW는 http(s)/localhost에서만 등록)
- PWA 완전 설치(일부 브라우저)용 PNG 아이콘(192/512)은 실제 로고 준비 시 추가 예정

---

## [v0.2.5] - 2026-07-06
### 시놉시스 개편 — STEP 3단계 + MISSION 구조 (레퍼런스 반영)
게임 시나리오와 STEP 구성을 전면 수정. Scene(내부 관리용)과 STEP(사용자 표시용)을 분리하고,
실제 체험 단계만 **STEP1/STEP2/STEP3** 3개로 표시. 문구는 전달받은 원문 그대로 사용(임의 수정 없음).
기존 config·assets·placeholder·모바일/세로 대응·STEP 클릭 이동·처음으로/플레이/정지·자동 진행·오프라인 실행 구조 유지.

### Changed
- **전체 흐름 재구성**: ①카카오 게이트 → ②MISSION → ③STEP1 바디워시 → ④민감도 100% 경고(설명)
  → ⑤나쁜 계면활성제(설명) → ⑥이슬로 소개(설명) → ⑦STEP2 이슬로 사용 → ⑧STEP3 샤워
  → ⑨MISSION 성공! → ⑩최종 브랜드 페이지
- **상단 진행 표시**: 10단계 점(dot) → `MISSION → STEP1 → STEP2 → STEP3 → MISSION 성공!`
  5개 항목으로 변경. 현재 진행 위치만 활성화, 나머지 비활성. 클릭 이동·`stepNavigationEnabled` 잠금 유지
- **STEP 배지**: 실제 체험 장면(STEP1~3)에만 카드 상단 배지 표시.
  게이트/MISSION/설명/성공/최종 화면에서는 미표시 (게이트의 STEP 1 배지 삭제)
- **게이지 규칙 변경**: STEP1 `0%→100%`(빨강) / STEP2 `100%→50%`(주황) / STEP3 `50%→0%`(파랑)
  - 장면별 `gaugeFrom`/`gaugeTo` 지원 (시작값→목표값 보간)
  - 게이지 색상: 0% 파랑 → 50% 주황 → 100% 빨강 3색 보간
    (구버전 5색 보간은 config 주석으로 보존)
- **계면이 제거 규칙**: STEP2에서 절반 제거(8→4), STEP3에서 모두 제거
  (장면별 `surfactantFrom`/`surfactantTo` 지원)
- **문구 교체(원문 그대로)**: MISSION/STEP1/계면활성제 설명/이슬로 소개/MISSION 성공/최종 브랜드 문구
  — 이전 문구는 config에 주석과 함께 보존
- 게이트 화면: STEP 배지·안내문(desc) 표시 제거 (문구는 config에 보존)
- 민감도 100% 경고 화면: STEP 배지·제목 텍스트 제거, 게이지(100%)+경고 연출만 표시
- STEP2(이슬로 사용): POINT! 안내 박스 표시 제거 (코드/문구/CSS 보존)
- MISSION 성공 → 최종 브랜드 페이지 전환은 기존 공통 Fade 전환 사용

### Added
- **MISSION 인트로 화면** (`missionIntro` 타입): MISSION 배지 + 미션 문구
- **MISSION 성공! 화면** (`missionSuccess` 타입): 웃는 아이 + 반짝임 + 컨페티 (제품 이미지 없음)
- **최종 브랜드 페이지** (`brandFinal` 타입): 로고 + 제품 3종 + 브랜드 문구 + 다시하기 버튼
- 상단 진행 표시용 문구 config: `texts.phases`

### Removed(흐름 정리 — 코드/문구는 보존)
- **"왜 그런지 살펴볼까요?"(distress) 장면 제거** (구 STEP 5) — reaction 렌더러/문구는 보존
- 오프닝(reaction) 장면 → MISSION 인트로로 대체 (렌더러/문구 보존)
- 구 엔딩(ending, 3종 통합) → MISSION 성공! + 최종 브랜드 페이지 2개 장면으로 분리 (렌더러 보존)

---

## [v0.2.4] - 2026-07-06
### 문서 업데이트 — 개발 가이드(CLAUDE.md) 추가
코드 변경 없음(버전 표기 갱신만). 앞으로의 작업 기준 문서를 정리.

### Added
- **CLAUDE.md**: Claude Code(또는 신규 작업자)가 프로젝트를 이어서 작업할 때
  반드시 먼저 읽어야 하는 개발 가이드
  - 프로젝트 목적/구조/실행 방식, 핵심 유지 원칙 10개
  - 브랜드 표기 규칙(반드시 `eslo`), 현재 10 STEP 흐름·주요 기능
  - 버전 관리 규칙(patch/minor/v1.0.0), 커밋 메시지 규칙
  - 앞으로 우선순위(타이밍 조정→드래그 조작감→애니메이션→효과음→실제 이미지→계면이 퀄리티→운영 기능)
  - 주의사항(placeholder 유지, git pull/push 습관 등)

### Changed
- README.md 상단에 "개발 가이드는 CLAUDE.md 참고" 안내 추가
- 버전 표기 v0.2.4로 갱신 (config.js / README.md)

---

## [v0.2.3] - 2026-07-05
### UI 표시 방식·문구 정리 (레퍼런스 반영) — 총 10 STEP 흐름
큰 기능 추가 없이 STEP 표시 방식과 문구를 레퍼런스 이미지에 맞춰 정리.
기존 config·assets·placeholder·자동 진행·모바일 대응 구조 유지.

### Changed
- **상단 STEP 표시 → 좌측 작은 점(dash) 형태 보조 표시**로 변경
  - 현재 단계만 진한 파랑(길게), 지난 단계 연파랑, 이후 흰색
  - 큰 원형 숫자·STEP 배지·와이드 진행바를 상단에서 제거(코드/CSS는 보존)
  - **STEP 클릭 이동 기능 유지**(작지만 클릭 가능, 툴팁으로 번호 표시), `stepNavigationEnabled` 잠금 유지
- **카드 상단에 현재 장면 STEP 배지 표시**: 파란 둥근 배지·흰 글씨 "STEP n" (카드 상단 중앙, 모바일 세로에서도 표시)
- **문구 전면 교체(레퍼런스 텍스트 그대로)**: 게이트/오프닝/바디워시/경고/살펴보기/계면활성제/이슬로는 달라요/이슬로 사용/헹구기/엔딩/하단 안내 — 이전 문구는 config에 주석 보존
- **흐름 재구성 (총 10 STEP)**: ① 카카오 게이트 ② 오프닝 ③ 일반 바디워시 ④ **민감도 100% 경고(신규 분리 장면)** ⑤ 왜 그런지 살펴보기 ⑥ 나쁜 계면활성제 확인 ⑦ 이슬로는 달라요 ⑧ 이슬로 바디 제품 사용 ⑨ 샤워기로 헹구기 ⑩ **깨끗해진 피부 + 이슬로 베이비 3종 엔딩(성공 연출 통합)**
- 게이지 경고 연출(문구·흔들림·경고등)은 상승 계열에서만 — 이슬로 사용(100% 유지)/헹굼 장면은 조용한 100% 표시
- 엔딩 3종은 미니 보틀 + "바스앤샴푸 · 엉덩이 클렌저 · 로션" 캡션 한 줄로 정리

### Added
- **POINT! 안내 박스** (이슬로 사용 장면): "이슬로 사용 단계부터 계면이(나쁜 성분)가 붙어있는 상태로 시작됩니다." — 가로 모드 카드 우측 플로팅(드래그 방해 없음), 세로 모드 흐름 배치

### 보존(삭제 아님)
- mission/message/success 렌더러·문구, 구버전 상단 표시 CSS(step-badge/step-numbers/progress-bar) — 복구 대비 유지

---

## [v0.2.2] - 2026-07-05
### 현장 사용성 개선 — 모바일/세로 대응 · STEP 클릭 이동 · 플레이/정지 컨트롤
베이비페어 현장에서 태블릿·노트북·모바일 모두 안정 동작하는 것이 목표.
기존 config·assets·placeholder·자동 진행 구조 유지.

### Added
- **모바일/세로 모드 대응**
  - 가로: 기존 카드형 UI 유지 / 세로: 위→아래 모바일 게임형 배치로 자동 전환
  - 세로에서 화면이 답답하면 세로 스크롤 허용, 이미지 비율 유지(object-fit/viewBox)
  - 엔딩 3종 카드는 세로에서 가로형 행(row) 카드로 재배치, 미션 목표는 세로 배치
  - 아주 좁은 화면(≤400px) 글자·게이지 미세 조정
- **STEP 클릭 이동 (테스트/시연용)**
  - 상단 STEP 번호(1~11) 클릭 시 해당 장면으로 즉시 이동 (게이트=STEP 1)
  - 이동 시 타이머/드래그/애니메이션 초기화, **게이지·계면이 상태를 장면 진행도에 맞게 자동 세팅**(rise 이전 0%, rise 이후 100%, fall 이후 0%)
  - `index.html?step=N` URL 파라미터로 특정 STEP 바로 시작 지원
  - ★ 행사 운영용 잠금: `config.options.stepNavigationEnabled = false`
- **좌측 컨트롤 패널** (세로 모드에서는 하단 중앙)
  - 🏠 처음으로: 전체 초기화 후 게이트 복귀 (기존 좌상단 버튼을 패널로 통합)
  - ▶ 플레이 / ⏸ 정지: 자동 장면 전환 일시정지·재개. 정지 중에도 드래그 조작은 가능하며, 정지 중 완료된 전환은 보류됐다가 플레이 시 이어짐
  - 터치 영역 52px+ (모바일 44px 이상 충족), 현재 모드 하이라이트 표시
- 외부 제어 API: `Game.goToStep(n)` / `Game.play()` / `Game.pause()` / `Game.goHome()`

### Fixed
- 상승(rise) 게이지 장면이 0%에서 시작할 때 "피부 진정 완료!"가 잘못 표시되던 문제 (진정 완료는 헹굼(fall) 장면에서만 표시)
- 카드 안 멘트가 제목과 겹치거나 카드 밖으로 넘치던 문제 (멘트 크기 조정 — 큰 제목은 card-title 담당)
- 세로 모드에서 카드가 화면 폭을 넘어 오른쪽이 잘리던 문제

---

## [v0.2.1] - 2026-07-05
### 핫픽스 — 게이지 감소 완료 · 욕실 배경 · 카드형 UI · eslo 오타
신규 기능 추가가 아닌 **오류 수정 + 레퍼런스 반영도 개선**. 기존 구조 유지.

### Fixed
- **STEP7~8 민감 게이지가 0%까지 내려가지 않던 문제 수정**
  - STEP7(eslo 사용): 게이지 `hold` 모드로 100% 유지 + 문지를수록 계면이가 약해지는 연출(`weaken`)
  - STEP8(샤워 헹굼): 게이지 `fall` 모드로 100%→0% 확정 하강, 계면이 아래로 씻겨나감
  - **완료 조건에 게이지 0% 확인 추가**(`requireGaugeZero`): 드래그 완료 시 게이지를 0%로 확정하고, 0%가 된 뒤에만 다음 단계로 자동 진행
  - 0% 도달 시 "피부 진정 완료!" 표시(색: 빨강→주황→노랑→민트→파랑)
- **욕실 배경 미적용 문제 수정**: 전역 배경(`.bg-layer`)에 SVG 욕실 연출(파스텔 블루 타일 + 욕조/샤워기/선반/화분/러버덕)을 넣어 **모든 장면 공통**으로 표시. `assets/images/background.png` 를 넣으면 실제 이미지로 자동 대체

### Changed
- **레퍼런스 유사도 개선(카드형 UI)**: 화면을 "상단 STEP 진행바(번호 1~11 + Progress Bar) + 중앙 둥근 카드(큰 제목 + 본문)" 구조로 재구성. 파스텔 블루 배경 위에 카드가 떠 있는 베이비페어 체험형 화면 느낌으로 정리 (좌상단 처음으로 / 우상단 로고 / 하단 안내 유지)
- 게이지에 `hold` 모드 및 `calmThreshold`(0% 판정), `calmHold` 타이밍 추가

### Renamed (브랜드 오타 수정: esllo → eslo)
- 화면 로고/placeholder/제품 라벨, `config` 텍스트·경로(`eslo-bath/cleanser/lotion.png`), 전역 변수(`ESLO_CONFIG`/`ESLO_SCENES`), 장면 id(`esloUse`/`esloRinse`), SVG shape 키(`eslo`), `esloKeywords`, README, 실행 설정(`eslo-game`), 주석까지 전면 통일. 프로젝트 전체에 `esllo` 잔존 없음(한글 브랜드명 "이슬로"는 유지)

---

## [v0.2.0] - 2026-07-05
### 욕실 컨셉 · STEP 구조 · 미션/성공 연출 · 게임화 (부모 대상 UX)
"부모가 재미있게 플레이하며 이슬로의 차별점을 이해"하도록 게임성/가독성을 강화.
기존 config·assets 분리·Placeholder·자동 진행·처음으로 버튼 구조는 유지.

### Added
- **간단 일러스트 Placeholder(SVG)**: 아기(웃음/울상/기본), 무지 흰색 펌프 바디워시, 이슬로 민트 보틀, 샤워기, 계면이(보라 스파이키 캐릭터), 경고등(사이렌), 3종 제품, 로고, QR — 실제 이미지가 오면 그대로 교체(자동 대체)
- **욕실 배경 연출**: 파스텔 블루/민트 그라데이션 + 타일감 + 떠오르는 거품 (배경 이미지 넣으면 자동 대체)
- **STEP 구조**: 모든 화면 상단에 `STEP n / 총단계` 배지 + 장면 제목 + **진행 Progress Bar**
- **오늘의 미션 화면**: "우리 아기 피부를 깨끗하게 지켜주세요!" + 게임 목표 "나쁜 계면이를 모두 씻어내세요!" (계면이 아이콘으로 목표 직관화)
- **미션 성공 연출**: "🎉 미션 성공!" + 축하 문구 + 컨페티/반짝임 애니메이션
- **다색 민감도 게이지**: 값에 따라 민트→노랑→주황→빨강(상승)/역방향(하강) 다단계 색 보간 + **퍼센트(%) 표시**, 100% 시 경고등+흔들림+"민감도 100% · 피부 자극 위험!"
- **이슬로 키워드 화면**: 제품 + ✔생분해 / ✔피부에 남지 않는 계면활성제 / ✔안심 베이비 케어
- 상단 우측 **브랜드 로고** 상시 표시, 하단 **처음으로 안내** 문구
- 신규 교체용 에셋 슬롯: `child-happy.png`(웃는 아이)

### Changed
- 게임 흐름 재구성(11단계, 아래 참고) — 계면이 제거를 게임 목표로 명확화
- **이슬로 사용 시 계면이가 붙어있는 상태로 시작** → 헹굴수록 하나씩 아래로 떨어지고 게이지 100%→0% 하강 → 깨끗한 피부
- 잔여 자극 확인을 **돋보기 제거 → 피부 클로즈업 패널**로 변경
- 깨끗한 피부 장면을 **웃는 아이 + 반짝임**으로 변경 (돋보기 삭제)
- 일반 바디워시 Placeholder를 **무지 흰색 펌프용기** 형태로 변경
- 화면 레이아웃을 "상단 STEP 헤더 + 중앙 본문" 구조로 정리(가독성/터치 UX)

### Removed(흐름 정리 — 코드/문구는 보존)
- 돋보기(inspect) 렌더 경로는 흐름에서 제외(CSS/문구는 복구 대비 보존)

### 수정된 흐름 (v0.2.0 · 총 11 STEP)
STEP1 카카오 게이트 → STEP2 오프닝+미션 → STEP3 일반 바디워시(게이지↑·경고등) →
STEP4 아이 울상/자극 → STEP5 계면이 클로즈업 → STEP6 이슬로는 달라요(제품·키워드) →
STEP7 이슬로 사용(계면이 붙음) → STEP8 샤워 헹굼(계면이 씻김·게이지↓·빨강→파랑) →
STEP9 깨끗해진 피부(미소·반짝) → STEP10 미션 성공 → STEP11 엔딩(3종·브랜드 문구)

---

## [v0.1.1] - 2026-07-05
### 민감 게이지 · 계면이 캐릭터 · 흐름 재구성 (팀 공유용 프로토타입)
기존 구조(config 기반 에셋 교체 · Placeholder · 자동 진행)는 그대로 유지.

### Added
- **민감/자극 게이지** (상단 표시)
  - 일반 바디워시 문지르는 동안 0% → 100% 상승, 값에 따라 맑은 파랑 → 붉은색으로 색 보간
  - 100% 도달 시 **경고 상태** 전환 + **경고등 Placeholder** 노출 + 흔들림/깜빡임 연출
  - 이슬로 헹구기 단계에서 게이지가 다시 등장해 100% → 0%로 하강(붉은색 → 파란색), 0% 도달 시 "피부 진정 완료"
  - 게이지 색/임계값/계면이 수는 `config.gauge` 에서 조정 가능
- **계면이 캐릭터**(placeholder): 돋보기 확인 시 피부에 붙어있고, 이슬로 헹굴 때 아래로 씻겨 내려가는 연출
- **아이 울상/피부 자극 반응 장면**(reaction 타입) + 멘트 "왜 그런지 살펴볼까요?"
- **상단 "처음으로 돌아가기" 버튼**: 모든 게임 장면에서 노출, 클릭 시 장면/타이머/인터랙션/게이지 상태를 모두 초기화하고 카카오 게이트로 복귀 (엔딩의 "다시하기"와 별개, 현장 고객 전환용)
- 장면 간 유지되는 게임 상태(`state.irritation`)로 게이지 연속성 구현
- 신규 교체용 에셋 슬롯: `warning-light.png`(경고등), `surfactant.png`(계면이), `child-sad.png`(울상 아이)

### Changed
- 게임 흐름 재구성(아래 "수정된 흐름" 참고): 바디워시 → 게이지 100%/경고등 → 울상 반응 → 돋보기(계면이) → 이슬로 → 헹구기(게이지 회복) → 깨끗한 피부
- 잔여 자극 멘트 문구 변경: "…자극을 유발해요." → "**…자극이 일어났어요!**"

### Removed(흐름 정리 — 기능 자체는 보존)
- "다시 확인하기"(피부에 계면활성제가 남아 있는지 확인) 장면을 흐름에서 제외
- 첫 번째 단독 헹구기/중간 피부확인 장면을 흐름에서 제외
  - ※ 관련 문구는 `config.texts.scenes`(rinse1/check1/check2)에 **삭제하지 않고 주석과 함께 보존** → 필요 시 scenes.js 배열에 다시 넣으면 복구 가능

### 수정된 흐름 (v0.1.1)
카카오 게이트 → 오프닝 → 일반 바디워시 사용(게이지↑) → [100% 경고등] →
아이 울상/피부 자극("왜 그런지 살펴볼까요?") → 돋보기 확인(계면이 붙음, "…자극이 일어났어요!") →
이슬로는 달라요 → 이슬로 사용 → 샤워 헹구기(계면이 씻김·게이지 100→0·붉→파랑) →
깨끗한 피부 확인 → 브랜드 정리 → 엔딩

---

## [v0.1.0] - 2026-07-05
### 최초 1차 프로토타입 (팀 내부 공유용)
게임의 **전체 흐름과 UX 확인**이 목적. 완성도보다 흐름 우선, 에셋은 Placeholder.

### Added
- 카카오 채널 추가 게이트 화면 (임시 QR Placeholder + "채널 추가 완료" 버튼, 스킵 불가)
- 12개 장면 전체 플레이 흐름
  1. 오프닝
  2. 일반 바디워시 사용(드래그로 거품 내기)
  3. 헹구기(샤워기 드래그)
  4. 피부 확인(돋보기 연출)
  5. 잔여 자극 확인(뾰루지 표현)
  6. 전환 메시지 "이슬로는 달라요"
  7. 이슬로 사용(드래그)
  8. 이슬로 헹구기(드래그)
  9. 다시 확인(돋보기 연출)
  10. 깨끗한 피부 확인(반짝임 표현)
  11. 정리 메시지
  12. 엔딩(로고 + 이슬로 베이비 3종 카드 + 다시하기)
- 인터랙션 완료 시 **자동 장면 전환** + 멘트/연출 장면 자동 전환(타이머)
- Pointer Events 기반 드래그/문지르기 인터랙션 (마우스·터치·펜 공용)
- 드래그 미조작 시 자동 완료(fallback) — 현장 흐름 끊김 방지
- **Placeholder 시스템**: 이미지 없으면 도형/카드 자동 표시, 이미지 로드 성공 시 자동 교체
- **config.js** 로 에셋 경로·문구·타이밍 일괄 관리 (코드 수정 없이 교체)
- **theme.css** 로 색상·폰트·크기 토큰 일괄 관리
- 태블릿/노트북 반응형, 큰 버튼·큰 글씨, 오프라인(file://) 실행 지원
- 진행 표시 점(progress dots), 데모 편의용 탭-조기진행 옵션

### Notes
- 실제 제품 이미지 / QR / 캐릭터 / 효과음 / 정교한 애니메이션은 다음 단계 예정
