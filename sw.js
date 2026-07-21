/* =============================================================================
 * sw.js — 서비스워커 (PWA 기본 오프라인 캐싱)
 * -----------------------------------------------------------------------------
 * 복잡한 전략 없이 "기본 캐싱" 수준만 구현합니다.
 *  - install: 핵심 파일 미리 캐싱 (precache)
 *  - fetch  : 캐시 우선(cache-first), 없으면 네트워크 → 성공 시 캐시에 추가
 *  - activate: 이전 버전 캐시 정리
 *
 * 경로는 모두 상대경로(./) 라 GitHub Pages 하위 경로(/eslobaby-game2/)에서도 동작.
 * 게임 내용이 바뀌면 CACHE_NAME 의 버전을 올리면 새로 캐싱됩니다.
 * ========================================================================== */
'use strict';

var CACHE_NAME = 'eslo-game-v0.10.13-beta';

// 미리 캐싱할 핵심 파일 (상대경로)
var PRECACHE = [
  './',
  './index.html',
  './share.html',
  './config.js',
  './manifest.webmanifest',
  './css/reset.css',
  './css/theme.css',
  './css/game.css',
  './css/share.css',
  './css/admin.css',
  './js/components.js',
  './js/scenes.js',
  './js/interactions.js',
  './js/analytics.js',
  './js/sfx.js',
  './js/game.js',
  './js/admin.js',
  './js/main.js',
  './js/qrcode.js',
  './js/share.js',
  './assets/icons/icon.svg',
  // v0.4.2: 실제 아기·계면이 에셋
  './assets/images/baby-basic.png',
  './assets/images/baby-happy.png',
  './assets/images/baby-sad.png',
  './assets/images/gyemeon1.png',
  './assets/images/gyemeon2.png',
  './assets/images/gyemeon3.png',
  './assets/images/gyemeon4.png',
  './assets/images/gyemeon5.png',
  './assets/images/gyemeon6-sad.png',
  // v0.4.4: 공식 로고 + 이슬로 베이비 제품 3종
  './assets/images/logo.png',
  './assets/images/eslo-bath.png',
  './assets/images/eslo-cleanser.png',
  './assets/images/eslo-lotion.png',
  // v0.9.6: 욕실 배경(세로/가로, 신규 원본 v3 — 가로는 Higgsfield outpaint 확장) — 오프라인 첫 로드에도 배경 표시
  './assets/images/background-v3.jpg',
  './assets/images/background-wide-v3.jpg',
  // v0.7.0: PAGE1 비교 이미지 · 일반 바디워시 · 샤워헤드 (소형, 오프라인 대비 precache)
  './assets/images/baby-wonder.png',
  './assets/images/baby-wonder_2.png',
  './assets/images/normal_wash.png',
  './assets/images/washhead.png',
  // v0.10.4: PAGE 14 제품 이미지 — 7.5MB→516KB(610×1200 최적화)로 precache 편입(오프라인 첫 로드에도 완료 화면 표시)
  './assets/images/이슬로-바스앤샴푸-미니.png',
  // v0.10.6: 페이지별 AI 안내 음성(page01~14.m4a, 오디오만 추출, 총 ~1.5MB) — 오프라인 재생 지원
  './assets/audio/voice/page01.m4a',
  './assets/audio/voice/page02.m4a',
  './assets/audio/voice/page03.m4a',
  './assets/audio/voice/page04.m4a',
  './assets/audio/voice/page05.m4a',
  './assets/audio/voice/page06.m4a',
  './assets/audio/voice/page07.m4a',
  './assets/audio/voice/page08.m4a',
  './assets/audio/voice/page09.m4a',
  './assets/audio/voice/page10.m4a',
  './assets/audio/voice/page11.m4a',
  './assets/audio/voice/page12.m4a',
  './assets/audio/voice/page13.m4a',
  './assets/audio/voice/page14.m4a',
  // v0.10.11: 배경음(BGM, 오디오 전용 m4a) — 오프라인 재생 지원
  './assets/audio/bgm.m4a',
  // ※ 영상(prof-signage.mp4·prof-nongye-signage.mp4 및 -lo 폴백)은 precache 제외 + fetch 핸들러에서 명시적 bypass(아래) — 브라우저 네이티브 Range/스트리밍 처리.
  // ※ 효과음(PAGE5 울음·PAGE10 웃음 등)은 Web Audio 합성(js/sfx.js, 이미 precache)이라 별도 음원 파일/캐시 불필요. (v0.10.5: 반복 BGM 제거)
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      // 일부 파일이 없어도 설치가 실패하지 않도록 개별 처리
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;               // GET 요청만 캐싱

  // v0.10.7: 영상(.mp4)·Range 요청은 서비스워커가 절대 개입하지 않고 네트워크로 그대로 통과.
  //   (삼성 Tizen 등에서 SW가 Range 요청에 200(전체) 응답을 반환해 재생이 깨지는 문제 예방.
  //    영상은 precache 제외 상태 유지 — 브라우저 네이티브 스트리밍/Range 처리에 위임.)
  if (req.headers.has('range') || /\.mp4($|\?)/i.test(req.url)) return;   // respondWith 미호출 → 브라우저 기본 처리

  e.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;                  // 캐시 우선
      return fetch(req).then(function (res) {
        // 정상 응답이면 캐시에 저장 (동일 출처만)
        if (res && res.status === 200 && req.url.indexOf(self.location.origin) === 0) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () {
        // 오프라인 & 미캐싱 문서 요청이면 index.html 로 폴백
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
