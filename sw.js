/* 심연의 일지 — 오프라인 저장
   처음 열 때 게임·그림·글꼴을 전부 기기에 저장해 두고, 그 뒤로는 저장본으로 실행한다.
   게임을 고치면 VERSION 만 바꾸면 된다. 다음 실행 때 새 버전으로 바뀐다. */
var VERSION  = '2026-09-24.121121';
var CACHE    = 'blackpoint-' + VERSION;
var FONT_CSS = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=Nanum+Myeongjo:wght@400;700&display=swap';
var CORE     = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/style.css",
  "./js/data.js",
  "./js/engine.js",
  "./js/finale.js",
  "./js/pwa.js",
  "./js/scenes.js",
  "./js/turn.js",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./art/loc-altar.jpg",
  "./art/loc-cave.jpg",
  "./art/loc-chapel.jpg",
  "./art/loc-forest.jpg",
  "./art/loc-harbor.jpg",
  "./art/loc-inn.jpg",
  "./art/loc-lighthouse.jpg",
  "./art/loc-manor.jpg",
  "./art/loc-school.jpg",
  "./art/loc-square.jpg",
  "./art/loc-well.jpg",
  "./art/loc-wharf.jpg",
  "./art/npc-carter.jpg",
  "./art/npc-gilman.jpg",
  "./art/npc-jabez.jpg",
  "./art/npc-martha.jpg",
  "./art/npc-mary.jpg",
  "./art/npc-silas.jpg",
  "./art/pc-doctor.jpg",
  "./art/pc-reporter.jpg",
  "./art/pc-sailor.jpg"
];

self.addEventListener('install', function(event){
  event.waitUntil((async function(){
    var cache = await caches.open(CACHE);
    await cache.addAll(CORE);

    /* 글꼴: 스타일시트를 받아 그 안에 적힌 글꼴 파일까지 전부 저장한다.
       실패해도 게임은 기본 글꼴로 돌아가므로 설치를 막지 않는다. */
    try{
      var res = await fetch(FONT_CSS, { mode:'cors' });
      if(res.ok){
        await cache.put(FONT_CSS, res.clone());
        var css  = await res.text();
        var urls = Array.from(new Set(css.match(/https:\/\/fonts\.gstatic\.com\/[^)'"\s]+/g) || []));
        await Promise.allSettled(urls.map(function(u){
          return fetch(u, { mode:'cors' }).then(function(r){ if(r.ok) return cache.put(u, r); });
        }));
      }
    }catch(err){}

    await self.skipWaiting();
    var clients = await self.clients.matchAll({ includeUncontrolled:true });
    clients.forEach(function(c){ c.postMessage({ type:'offline-ready', version:VERSION }); });
  })());
});

self.addEventListener('activate', function(event){
  event.waitUntil((async function(){
    var keys = await caches.keys();
    await Promise.all(keys.filter(function(k){
      return k.indexOf('blackpoint-') === 0 && k !== CACHE;
    }).map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(event){
  var req = event.request;
  if(req.method !== 'GET') return;
  event.respondWith((async function(){
    var cache = await caches.open(CACHE);
    var hit = await cache.match(req);
    if(!hit && new URL(req.url).origin === self.location.origin){
      hit = await cache.match(req, { ignoreSearch:true });
    }
    if(hit) return hit;
    try{
      var res = await fetch(req);
      var u = req.url;
      if(res && res.ok && (u.indexOf(self.location.origin) === 0 || u.indexOf('fonts.g') !== -1)){
        cache.put(req, res.clone());
      }
      return res;
    }catch(err){
      if(req.mode === 'navigate'){
        var page = await cache.match('./index.html');
        if(page) return page;
      }
      throw err;
    }
  })());
});
