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

var CACHE_NAME = 'eslo-game-v0.10.4-beta';

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
  // ※ prof.mp4·prof_nongye.mp4(각 수 MB, 206 Range 영상)는 precache 제외 — 초기 설치 용량 과다 방지, 네트워크 스트리밍 + fetch 런타임 캐시(cache-first)로 재방문 시 캐시.
  // ※ 오디오(BGM·울음·웃음)는 Web Audio 합성(js/sfx.js에 코드로 포함, 이미 precache)이라 별도 음원 파일/캐시 불필요 — 오프라인 기본 동작.
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
