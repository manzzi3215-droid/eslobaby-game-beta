# CLAUDE.md — 이슬로(eslo) 베이비 미니게임 개발 가이드

이 파일은 Claude Code가 이 프로젝트를 이어서 작업할 때 **반드시 먼저 읽어야 하는** 개발 가이드입니다.

## 프로젝트 개요

이슬로 베이비페어 현장에서 고객 참여용으로 사용할 웹 기반 미니게임입니다.

목적은 부모 고객이 게임을 하면서 자연스럽게 아래 메시지를 이해하도록 하는 것입니다.

1. 일반 바디워시는 피부에 계면활성제가 남아 자극을 유발할 수 있다.
2. 이슬로는 피부에 남지 않는 생분해 계면활성제 컨셉이다.
3. 우리 아이 피부에는 이슬로 베이비가 더 안심된다는 인식을 남기는 것이 목표다.

## 현재 버전

**v0.10.9-beta** (버전은 `config.js`의 `meta.version` 및 `CHANGELOG.md`와 항상 일치시킬 것)
※ v0.10.9-beta(patch): **PAGE 6·11 영상 진단 빌드**(삼성 Flip Pro LH55WMBWBGCXKR/Tizen 간헐 미재생 원인 확인용). **재생 로직 무변경 — 관측 기능만 추가.** autoplay·play()·fallback·gate·preload·영상 파일 불변.
  - 영상 상태 스냅샷(`renderVideo` `snap()`): 이벤트마다 page·srcType(Primary/Lo)·file·currentSrc·readyState·networkState·duration·currentTime·paused·ended·muted·defaultMuted·playsInline·autoplay·videoWidth·videoHeight·buffered·MediaError 기록(읽기 전용).
  - 이벤트 확대: 기존 + `loadstart·loadeddata·canplaythrough·play·pause·seeking·seeked`, 스로틀(400ms) `progress·timeupdate`(로깅만).
  - play() 진단 래퍼: `v.play` 투명 프록시(실제 play 동일 인자·순서 호출·반환) → `play_call`/`play_resolve`/`play_reject_obs`(Primary/Lo·retry·dt). 기존 `.catch` 체인 불변.
  - 페이지 음성 진단(`sfx.js` `voiceDiag`): voice_start/play_ok/play_reject/end/error/stop + 재생 여부. 전역 훅 `window.__esloVideoDiag`로 라우팅(음성 재생 동작 무변경).
  - `?debug=1` 실시간 오버레이(우측 하단, pointer-events:none) + 좌측 히스토리 패널. `?debug=1` 아니면 미표시(일반 사용자 무영향), 진단은 `sessionStorage['eslo_video_diag']`(버퍼 400)에만 기록.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.9-beta`(구 SW 캐시가 진단 코드를 덮지 않도록 버전 상향).
※ v0.10.8-beta(patch): **PAGE 6·11 영상 자동재생 복원**(진입 즉시 autoplay, 실패 확정 시에만 터치 안내). 페이지 흐름·문구·음성·드래그·PAGE6→7·11→12 자동 전환·다중 소스 폴백·SW bypass·캐시버스트·진단 로그 전부 유지.
  - 원인: v0.10.7이 Tizen race 방지로 `video.autoplay=false`(autoplay attribute 미설정)+`canplay` 후 JS `play()`에만 의존한 상태에서, **워치독①(`VIDEO_START_TIMEOUT`=5s)이 단순 타임아웃만으로 `showFallback()`** 호출 → 사이니지에서 canplay 지연·버퍼링만 되어도 5초 뒤 ▶ 버튼·"화면을 터치하면…"이 떠서 클릭 재생처럼 동작.
  - 복원: `video.autoplay=true`+`setAttribute('autoplay','')`(muted/defaultMuted/playsInline·webkit-playsinline·preload=auto 유지) → **autoplay attribute + JS `play()` 병행**. `loadedmetadata`에서도 `attemptPlay()`(canplay·1.4s 타임아웃에 더해 더 이른 재생). `load()` 직후 조기 play는 여전히 미호출(race 방지).
  - 터치 안내 조건 강화: **워치독①(단순 타임아웃 showFallback) 삭제**. 터치 안내는 오직 `onSourceFail` 체인(Primary `play()` reject 1회 재시도/MediaError → Lo 교체 → Lo도 실패)에서만, 즉 **Primary·Lo 자동재생이 실제로 모두 실패**한 경우에만 표시. `stalled`/`waiting`/버퍼링/canplay 지연만으로는 미표시. 자동재생 성공 시 `playing`/`timeupdate`→`hideFallback()`로 ▶·안내문 미표시.
  - 워치독(최종 안전망)은 HARD_TIMEOUT(12s)에 gate만 해제(수동 next 허용, 자동 이동 X, 영구 갇힘 방지)·터치 안내 미표시로 축소. `VIDEO_START_TIMEOUT` 상수 제거.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.8-beta`.
※ v0.10.7-beta(minor): **PAGE 6·11 영상 삼성 LH55WMBWBGCXKR(Tizen 사이니지) 다단계 재생 폴백**. 페이지 흐름·문구·음성·드래그·PAGE6→7·11→12 자동 전환 유지.
  - 진단(ffprobe): 라이브 서버 Range 완전 지원(206), 영상 인코딩은 이미 최적(Constrained Baseline·B-frame 0·refs 1·CABAC 없음(Baseline=CAVLC)·yuv420p·~1s GOP·faststart) → **단순 재인코딩 반복 불필요**. 원인은 ①동일 파일명 HTTP 캐시(구 10Mbps 잔존) ②재생 시퀀스 race ③Tizen 자동재생 제한 ④SW의 영상/Range 개입 가능성.
  - 캐시버스트: `prof.mp4`→`prof-signage.mp4`, `prof_nongye.mp4`→`prof-nongye-signage.mp4`(git mv, config 경로 변경). 새 URL로 구 캐시 확실히 우회.
  - SW 영상 bypass: `sw.js` fetch 핸들러 최상단에서 `.mp4` 또는 `Range` 헤더 요청은 `respondWith` 미호출(`return`) → 브라우저 네이티브 Range/스트리밍 위임(SW가 206 대신 200 반환해 깨지는 문제 예방). 영상 precache 제외 유지.
  - 재생 시퀀스(renderVideo 재작성): HTML attribute+JS property 둘 다 명시(`muted/defaultMuted/playsInline=true`, `autoplay=false`, `preload=auto`) → `src` 설정 → DOM 삽입 → `load()` → `canplay`(또는 1.4s 타임아웃) → `play()`(조기 play 미호출, Tizen race 방지) → reject 시 1회 재시도.
  - 다중 소스 체인: `scene.videoFallback`(config `profVideoLo/bioVideoLo` = 640×480 Baseline L3.0·무B프레임·CABAC off·무음). 1차 error/실패 → 2차 소스로 `load()`+재생 교체. 모두 실패 → 터치 재생 폴백.
  - 강화 터치 폴백: `.video-fallback`(큰 ▶ + "화면을 터치하면 영상을 재생합니다"), **영상 영역 전체 클릭**으로 재생(re-mute+load+play). 재생 전엔 gate 유지(화면탭·다음 금지, 자동 이동 금지) — 사용자가 재생하기 전까지 페이지 유지. 워치독②(hard timeout)은 gate만 해제(수동 next 허용, 자동 이동 X, 영구 갇힘 방지).
  - 진단 로그: `pushVideoDiag`가 `sessionStorage['eslo_video_diag']`에 기록(userAgent·page·url·srcIdx·이벤트(loadedmetadata/canplay/playing/stalled/waiting/error)·readyState·networkState·MediaError code·play reject). `?debug=1`일 때만 화면 숨김 패널 표시(일반 사용자 미노출, 개인정보 없음).
  - 이미지 시퀀스 폴백(4차)은 이번엔 미구현(설계·용량만 검토) — 위 조치(캐시버스트+SW bypass+시퀀스+2차 소스+터치)로 대부분 해결 예상, 실기기에서 여전히 실패 시 후속.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.7-beta`.
※ v0.10.6-beta(minor): **페이지별 AI 안내 음성(PAGE 1~14) 적용**. 페이지 구성·흐름·문구·완료 판정·자동 전환·영상 must-watch·드래그·효과음(울음/웃음) 전부 유지.
  - 음원: 사용자 제공 ZIP의 `(PAGE 1)~(PAGE 14).mp4`(비디오+AAC)에서 **오디오만 무손실 추출**한 `.m4a`(AAC 44.1k stereo) → `assets/audio/voice/page01~14.m4a`(총 ~1.5MB). `배경음.mp4`(131초 배경음악)는 페이지가 아니고 v0.10.5에서 BGM 제거했으므로 **미적용**.
  - 매핑: `config.voice{1..14}`(PAGE 번호 = scenes index+1, 게이트는 음성 없음). 하드코딩 금지·config 단일 관리.
  - 재생: `renderScene`이 `playPageVoice(index+1)` 호출. 단일 HTMLAudioElement(`window.SFX.playVoiceForPage/stopVoice/pauseVoice/resumeVoice/hasVoiceForPage/stopAllAudio`). `clearScene`이 이동 시 이전 음성 즉시 정지(currentTime 0)+예약 효과음 취소 → 중복/겹침 없음. play() reject/error는 `console.warn`만(게임 무영향, 무한 재시도 없음).
  - PAGE5/10: 페이지 음성 종료(`ended`) 후 `VOICE_SFX_GAP`(250ms) 뒤 울음/웃음 순차(기존 즉시 재생 → 순차로 이동). 이탈 시 예약 취소.
  - PAGE6/11(영상): 영상은 muted라 페이지 음성과 충돌 없음 → 동시 재생. 영상 `ended`→자동 전환(6→7,11→12) 그대로. PAGE6 음성 6.8s≈영상 6.375s+전환지연, PAGE11 음성 5.85s<영상 7.375s → 정책 변경 없음.
  - pause/play: `applyPauseState`가 영상·CSS 애니메이션과 함께 페이지 음성도 pause/resume.
  - `sw.js`: 14개 m4a precache 편입(오프라인 음성), `CACHE_NAME`=`eslo-game-v0.10.6-beta`. 영상은 계속 precache 제외.
※ v0.10.5-beta(minor): **전체 BGM 제거 · PAGE 3·4·8·9 드래그 하단 그립 · PAGE 6·11 영상 사이니지 호환 재인코딩 + 재생실패 fallback**. 페이지 구성·흐름·문구·완료 판정·자동 전환은 불변.
  - BGM 제거: `js/sfx.js`의 Web Audio 합성 BGM 블록·export(startBGM/pauseBGM/resumeBGM 등) 삭제, `game.js` startGame/pause/play의 BGM 호출 삭제, `config.sfx.bgm` 삭제. **효과음(click·cry·laugh)·오디오 컨텍스트·제스처 활성화 구조는 유지.** 정지/플레이 버튼은 영상·CSS 애니메이션 제어(applyPauseState)라 BGM 제거 후에도 기능 유지. BGM은 파일이 아니라 코드였으므로 삭제할 음원 파일·preload·SW 캐시 없음.
  - 드래그 하단 그립: `interactions.js` `makeRubbable`에 `grabAnchorY` 옵션(기본 0.5). `game.js renderDrag`가 `grabAnchorY:0.9` 전달 → `moveToolTo`가 `translate(-50%,-90%)`로 도구를 손가락 위쪽에 표시(아기·화면중앙 가림 감소). 손가락 힌트(👆)는 도구 하단부(`tool` 자식, top 88%)로 이동. **판정(isOverBody/거리/완료/자동전환)은 손가락 좌표 기준 그대로.** `productIn` 등장 애니메이션이 인라인 transform을 덮으므로 `.stage.is-grabbed .drag-tool{animation:none}` 추가(기존 `:active` 보강).
  - 영상 사이니지 호환: `prof.mp4`(8.27MB, Main@4.1 ~10Mbps)→**1.22MB(Constrained Baseline@3.1, 1.53Mbps)**, `prof_nongye.mp4`(10.0MB, ~10.5Mbps)→**2.2MB(2.39Mbps)**. 동일 1024×768·24fps CFR·yuv420p·faststart, **오디오 제거**(게임서 muted). 삼성 LH55WMBWBGCXKR 등 사이니지 하드웨어 디코더 비트레이트/레벨 한계 대응. ffmpeg-static로 재인코딩(원본은 git 히스토리 보존).
  - 영상 재생실패 fallback: `renderVideo`에 재생 시작 추적(playing/timeupdate) + play() 1회 재시도 + 워치독(①미시작 시 "화면을 터치하면 영상을 재생합니다"+▶ 버튼, ②최종 안전망 잠금 해제로 갇힘 방지). 정상 종료(ended)→자동 전환은 그대로. 개발자용 오류문구 미노출(콘솔 warn만).
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.5-beta`. 영상은 계속 precache 제외(206 Range·런타임 캐시).
※ v0.10.4-beta(patch): **릴리스 전 기술 정리만** — 화면·문구·애니메이션·오디오 값 전부 불변.
  - PAGE 14 제품 이미지 최적화: `이슬로-바스앤샴푸-미니.png` 2754×5420 7.5MB → **610×1200 516KB(풀컬러 PNG, 92.9%↓)**. sharp `lanczos3` 리사이즈만(색상 변형 없음, 픽셀 MAD 0.2%), 알파 유지, 동일 파일명·경로(config/형식 불변). WebP(49.5KB)와 비교했으나 호환성·형식/경로 불변 우선으로 PNG 채택.
  - warning-light 404 제거: `config.assets.warningLight` = 존재하지 않는 png 참조 → **`''`(빈 값)**. `createAsset`이 빈 src면 이미지 요청 없이 `shape:'siren'` SVG placeholder만 렌더(기존과 시각 동일, PAGE5 디자인 불변). 신규/기존 404 0건.
  - `sw.js`: 최적화된 PAGE 14 이미지(516KB)를 **precache 편입**(오프라인 첫 로드 완료 화면). 영상(prof*.mp4)은 계속 precache 제외(런타임 캐시). `CACHE_NAME`=`eslo-game-v0.10.4-beta`.
※ v0.10.3-beta(patch): **PAGE 13/14 등장 애니메이션·자동전환·오디오 볼륨·효과음 미세 조정만**. 페이지 구성·흐름·문구·게임 로직·필수영상·드래그 전부 불변.
※ v0.10.3-beta(patch): **PAGE 13/14 등장 애니메이션·자동전환·오디오 볼륨·효과음 미세 조정만**. 페이지 구성·흐름·문구·게임 로직·필수영상·드래그 전부 불변.
  - PAGE 13 reveal 고급화: `revealPop` = 아래(16px)→위 + opacity + scale 0.9→1, 부드러운 ease-out(`cubic-bezier(.22,.61,.36,1)`, 오버슈트/바운스 없음), 520ms. `STEP`=300ms(game.js, css와 동기화). 제품명 그룹감: 이미지↔제품명 gap 축소·`line-height:1.2`·`margin-top` 미세.
  - PAGE 14 순차 등장: 문구 `rewardTitlePop`(약간 Pop) → 제품 `rewardFadeScale`(240ms 지연) → 안내문 `rewardFadeUp`(560ms 지연). CSS animation-delay 기반(자동 전환 없음, JS 변경 없음).
  - 자동 전환: `timings.rewardHold` 2000→**2200ms**(완성 화면 충분히). PAGE13 `REVEAL_DUR`=520 동기화로 안전망 타이머 정확.
  - 오디오 볼륨: `sfx.volume` 0.35→**0.32**, `sfx.bgm.volume` 0.15→**0.13**(권장 범위 내, 밸런스). 효과음: `cry`(더 높고 둥근 톤·부드러운 비브라토, ~0.82s), `laugh`(밝은 오르내림 리듬, ~0.62s).
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.3-beta`.
※ v0.10.2-beta(minor): **PAGE 13 제품명·순차 등장·자동 전환 + PAGE 14 미션 완료/증정 안내(신규) + 전체 BGM·PAGE5 울음·PAGE10 웃음**. 총 **14페이지**. 기존 페이지 로직·자동 전환·필수 영상·드래그·배경·데스크톱 불변.
  - PAGE 13(brandFinal): 다시하기 버튼 제거. 제품 3종 하단 제품명(`finalProductNames`=바스 앤 샴푸/엉덩이 클렌저/바디 로션), 이미지+제품명을 `.final-prod-card`로 묶음. 6요소 순차 등장(`revealPop`, 260ms 간격, 이미지→제품명). 카드 내부 중앙. 마지막 요소 `animationend`(+안전망 타이머) → `rewardHold`(2s) 후 PAGE 14 자동 전환(`scheduleAutoNext(idx, delay)` 확장, `autoNextScheduled` 1회 가드).
  - PAGE 14(rewardFinal, 신규 최종): `rewardTitle`(💙 생분해 미션 완료 💙, 키컬러 강조) + 중앙 제품 이미지(`assets.rewardProduct`=이슬로-바스앤샴푸-미니.png) + `rewardDesc`(2줄). 자동 전환 없음·버튼 없음. RENDERERS.rewardFinal=renderRewardFinal, SCENE_THEME.rewardFinal='success'.
  - 오디오(중앙 `window.SFX`): BGM=Web Audio 합성 오리지널 루프(startBGM/pauseBGM/resumeBGM, 별도 bgmGain·볼륨 0.15). 게임 시작 버튼(startGame)에서 시작, pause/play 연동, loop, 전환 지속. PAGE5=`cry`·PAGE10=`laugh`(진입 1회, `killOneShot` 중첩 방지, 정지 시 미재생). **외부 음원 없음 — 전부 코드 합성(라이선스 이슈 無).**
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.2-beta`. PAGE14 이미지(7.5MB)는 precache 제외(런타임 캐시). 합성 오디오는 sfx.js(precache)라 별도 음원 캐시 불필요.
※ v0.10.1-beta(patch): **PAGE 12·13 문구/디자인만 수정**. 게임 로직·장면 순서·자동 전환·영상·드래그·배경·레이아웃·데스크톱 전부 불변.
  - Page12 문구: `compareLead`='민감한 우리 아이 피부\n', `compareEmph`='생분해 케어는 선택이 아니라 필수!', `compareTail`=''(2줄). 우측 라벨 `compareGoodLabel`='착한 계면활성제\n이슬로 생분해 워시'.
  - Page12 강조: `.compare-title .key-emph`(PAGE 12 한정 스코프)를 키컬러(`--key`) 배지(pill·흰 텍스트·`white-space:nowrap`·soft shadow)로 → 가장 먼저 눈에 들어오게. ≤360px는 폰트/패딩 축소로 한 줄 유지. 다른 페이지 `.key-emph`(Page11 등) 불변.
  - Page13: `renderBrandFinal`에서 카드 중앙 엔딩 로고(`.ending-logo`) 제거(상단 브랜드 로고 `brandLogo`는 유지). 문구 `brandFinalTitle`='우리 아이 피부를 지키는\n착한 계면활성제\n안심 생분해 케어, 이슬로'(3줄).
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.1-beta`.
※ v0.10.0-beta(minor): **게이트 중앙 정렬 · 로고 카드 위 배치 · 컨트롤 SVG · Page1/5/7/11 문구·색상**. 게임 로직·장면 순서·자동 전환·영상·드래그·배경·데스크톱 불변.
  - 세로 중앙/로고: `.is-playing` 스코프 제거 → 공통 wrapper `.scene-wrap`(shell이 로고+카드 묶음)로 게이트 포함 전 카드뉴스 세로 중앙, 로고는 카드 바로 위 중앙 absolute(간격 12~20px 일정). 가로/데스크톱은 `.scene-wrap{display:contents}`로 무영향.
  - Page5 색: `.warning-scene .card-title.is-warn`=#D1000A, `.warning-sub`=#1A3446(색만).
  - 컨트롤: `CTRL_SVG` 인라인 SVG 5종(글리프→SVG, currentColor, `makeCtrlButton`이 innerHTML). `.ctrl-ico svg{width:1.25em}`.
  - 문구(config): Page1 '샤워'→'피부', Page7 esloKeywords '…착한 계면활성제', Page11 bioLead '물에 쉽게 씻겨 내려가'. Page7 `.kw-1` 소폭 확대·이동.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.10.0-beta`.
※ v0.9.9-beta(patch): **모바일 세로 카드뉴스 카드 상하 중앙 정렬 + 브랜드 로고 상단 중앙**(v0.10.0에서 wrapper 방식으로 대체). 게임 로직·장면 순서·자동 전환·영상·드래그·버튼 기능·힌트·배경·데스크톱/가로 레이아웃·게이트 전부 불변.
  - 원인: 세로에서 `.screen{justify-content:flex-start}`+`.scene-card{flex:none;min-height:60vh}`로 카드 상단 치우침.
  - 수정: `.is-playing`(게임 화면) 스코프로 `@media (orientation: portrait)`에서 `.scene-card{margin-block:auto}`(auto 마진 중앙, 넘치면 위부터 스크롤) + `.screen{padding-top:calc(56px+safe-area)}`(로고 영역), `.brand-logo` 하단→상단 중앙. 카드/로고 크기·구성 불변.
  - 게이트 제외: `toggleChrome(show)`가 게임일 때만 `app.classList.toggle('is-playing')` → 게이트는 미부여로 기존 배치 유지. game.css는 CSS만 추가(리팩터링 없음).
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.9-beta`.
※ v0.9.8-beta(patch): **UI 3건만 수정**. 게임 로직·진행 순서·Scene·영상·자동 전환·드래그·힌트·컨트롤 위치·레이아웃·배경 전부 불변.
  - 게이트: QR 삭제 + "채널 추가 하러가기" 버튼 신설(카카오 `https://pf.kakao.com/_nCzPn` 새 탭). "채널 추가 완료했어요!"(스타트)는 유지. `renderGate`만 수정. 신규 버튼 `.btn-kakao`(배경 `#FAE100`/텍스트 `#3C1E1E`, 캡슐 모양·폰트·크기 동일). config `gate.joinButton`/`joinUrl` 신설.
  - Page1: `childWonder` → `assets/images/baby-wonder_2.png`(경로만 교체, 위치·크기·애니메이션 동일). sw precache 추가.
  - 처음으로 아이콘: `🏠`→`↑`(컨트롤 글리프 `←`/`→`와 동일 스타일). 라벨·동작 불변.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.8-beta`.
※ v0.9.7-beta(patch): **가로 배경만 재확장**(좌우 연결 자연스럽게). 세로 배경·게임 흐름·페이지·문구·UI·로직·애니메이션·레이아웃 전부 불변.
  - v0.9.6 가로본의 "칸막이 알코브"(중앙 밝은 벽 + 좌우 어두운 모서리) 개선 → 측벽이 넓은 평면(세로와 동일한 매끈 스타일)으로 중앙↔좌우가 부드럽게 이어지는 outpaint 컷 선택 → `assets/images/background-wide-v3.jpg`(1920×1072) 교체. 파일명·경로·세로 배경 그대로, 코드 변경 없음.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.7-beta`(배포본 캐시 무효화, precache 파일명 동일).
※ v0.9.6-beta(patch): **배경 이미지만 교체**(게임 흐름·페이지·문구·UI·로직·애니메이션·레이아웃 전부 불변).
  - 세로: 신규 원본 일러스트 → `assets/images/background-v3.jpg`(720×1280, 재인코딩 없이 원본 그대로).
  - 가로: 위 원본을 **Higgsfield outpaint(16:9)**로 좌우만 자연 확장 → `assets/images/background-wide-v3.jpg`(1920×1072). 중앙 구도·오브젝트 위치·차가운 프로스트 창문·시안 색감·노이즈 질감 유지. 스트레치/타일/미러 없음.
  - **코드 변경 없음**: `config.assets.background`/`backgroundWide` 경로만 v3(jpg)로 교체. game.js는 `new URL()` 절대경로로 읽어 포맷 무관. 기존 v1/v2 배경 파일은 보존.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.6-beta`, precache 목록도 v3로 교체.
※ v0.9.5-beta(patch): Page6·11 영상 **종료 후 탭 안내 문구 제거**. 자동 전환·게이트·error 안전장치·디자인 불변.
  - `renderVideo`의 `unlock()`에서 `hint.textContent = tapNext` 제거 → 종료·오류 시 안내문 텍스트 미변경(재생 중 "영상을 끝까지 보면…" 유지). 깜빡임·레이아웃 흔들림 없음.
  - `hints.tapNext`는 config에 유지(다른 수동 이동 페이지 사용). 영상 흐름에서만 미표시.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.5-beta`.
※ v0.9.4-beta(patch): 완료 이벤트 기반 자동 전환(6개 장면) + Page6/12 문구.
※ v0.9.4-beta(patch): **완료 이벤트 기반 자동 전환(6개 장면)** + Page6/12 문구. 페이지 순서/이미지/영상/효과음/드래그·네비 구조 불변. **전역·단순 타이머 자동 전환 아님.**
  - `scene.autoNext:true` — Page3/4/8/9(드래그 onComplete), Page6/11(영상 ended). game.js `scheduleAutoNext(fromIndex)`가 완료 콜백에서만 호출.
  - 안전장치: `setTimer`(AUTO_NEXT_DELAY 450ms) → `clearScene`(모든 네비 진입점)에서 취소. `autoNextScheduled`로 장면당 1회. 발화 시 `index===fromIndex && !busy && !videoGateLocked` 재확인. 영상은 `ended`에만 자동 이동(오류 `error`는 잠금 해제만, 자동 이동 X). 재생 중 탭/다음/페이지점 차단 유지.
  - Page6 문구: '나쁜 계면활성제'만 `.bad-emph`(붉은 glow, reduced-motion 정적). config `residueVideoLead/Emph/Tail`, `.video-caption` 폰트/줄간격/폭 조정.
  - Page12 라벨: `compareBadLabel`='일반 계면활성제\n바디워시', `compareGoodLabel`='생분해 계면활성제\n이슬로 베이비 워시'(좌우 2줄 균형).
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.4-beta`.
※ v0.9.3-beta(patch): Page1 "?" 연출 · STEP 번호 정정 · 필수 시청 영상 · Page7 확대 · Page10 배지 삭제 · 모바일 로고 하단 이동.
※ v0.9.3-beta(patch): Page1 "?" 연출 · STEP 번호 정정 · 필수 시청 영상 · Page7 확대 · Page10 배지 삭제 · 모바일 로고 하단 이동. 흐름/순서/문구/드래그·네비 구조 불변.
  - **필수 시청 영상**: scene `requireEnd:true`(residue=Page6, biodegradeInfo=Page11). `renderVideo`가 loop 끄고 `videoGateLocked=true` → `goNext`/다음버튼 잠금, `ended`(또는 `error`) 시 해제·안내문 전환. `renderScene` 진입 시 잠금 초기화.
  - **STEP 배지**: scenes.js `step` = bodywashUse 2·bodywashRinse 3·esloUse 4·esloRinse 5 (bodywashIntro 1 유지) → 1→2→3→4→5.
  - **Page10 배지 삭제**: `badgeLabel`에서 missionSuccess 분기 제거(파란 배지 미표시, success-title/desc 유지).
  - **Page1 "?"**: `renderMissionIntro`가 stage에 `.q-mark.q-left/.q-right` 추가(CSS `qFloat`).
  - **모바일 로고**: `.brand-logo` portrait → 하단 컨트롤 위 중앙(bottom 72px). 데스크톱 우상단 불변. Page13 내부 `.ending-logo`와 별개.
  - **Page7 확대**: `.eslo-hero-single`·`.eslo-product-name`·`.kw-bubble` 폰트 확대(겹침 없음 유지). `.bottom-hint` 폰트 축소.
  - config: `assets.bioVideo`(prof_nongye.mp4), `texts.hints.videoWatch`. `sw.js` `CACHE_NAME`=`eslo-game-v0.9.3-beta`.
※ v0.9.2-beta(patch): 마지막 페이지 낮은 가로 화면 겹침 · 모바일 상단 로고 · 하단 컨트롤 정렬.
※ v0.9.2-beta(patch): **후속 UI 3건** — 게임 흐름/페이지 순서/문구/로직 불변.
  - 마지막 페이지 낮은 가로 화면 겹침/잘림: `renderBrandFinal`이 screen에 `is-brand-final` 클래스 부여 →
    `@media (orientation: landscape) and (max-height: 880px)`에서 제목·`.ending-logo`·`.product-hero`(높이 기준)·`.btn-primary`·여백을 vh로 균형 축소. 세로(portrait) 불변.
  - 모바일 상단 `.brand-logo`(전역 플로팅, Page 13 `.ending-logo`와 별개): `@media (orientation: portrait)`에서 폭 축소 + 카드 위 띠 중앙 배치(본문 가림 방지).
  - 하단 컨트롤 5버튼은 이미 정중앙(±0.5px). `.admin-gear`를 세로에서 `bottom:74px`로 올려 컨트롤과 겹침 제거(admin.css). 메인 5버튼은 별도 fixed 중앙 정렬 유지.
  - `sw.js` `CACHE_NAME`=`eslo-game-v0.9.2-beta`.
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
