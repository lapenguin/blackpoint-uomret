/* 심연의 일지 — 움직이는 그림
   타이틀 화면의 바다: 수평선, 다섯 겹 파도, 해무, 그리고 수면 아래에서 뜨는 눈.
   글자 연출(연도 → 제목 → 타자기)도 같은 시계로 맞춘다.

   본문을 읽는 화면에서는 아무것도 돌지 않는다. 움직임은 타이틀과, 나중에 붙일 날짜 전환·사건에만.
   - 탭이 안 보이거나 바다가 화면 밖으로 스크롤되면 멈추고, 연출 시계도 함께 멈춘다
   - prefers-reduced-motion 이면 루프를 돌리지 않고 정지 프레임 한 장만 그린다

   바깥에서 쓰는 것은 전역 Motion 하나뿐이다.
     Motion.init(canvas, { root })   root 안의 [data-at] 글자와 #title-omen 을 연출한다
     Motion.start() / Motion.stop()
     Motion.setIntensity(0에서 1)    해무 밀도와 눈이 떠지는 최대치
     Motion.skip()                   연출을 끝 상태로 건너뛴다 */
"use strict";

var Motion = (function(){

  /* ---------- 색과 시간표 ---------- */

  var BG       = '#0e1513';            /* theme-color 와 같다 */
  var LINE_RGB = '127,154,146';        /* 옅은 회청록 */
  var FOG_RGB  = '150,172,164';

  var HORIZON  = 0.58;                 /* 화면 높이에 대한 수평선 위치 */
  var EYE_FROM = 4, EYE_FOR = 4;       /* 4초 뒤부터 4초 동안 뜬다 */
  var OMEN_AT  = 8.5, OMEN_STEP = 0.085;
  var DONE_AT  = 14;                   /* 이 시각이면 모든 연출이 끝나 있다 */

  var WAVES = [                        /* 뒤(수평선 쪽)에서 앞으로 */
    { at:0.05, amp:2.2, len:0.95, speed:0.22, phase:0.0, fill:0.30, line:0.10 },
    { at:0.22, amp:3.4, len:0.80, speed:0.30, phase:1.7, fill:0.34, line:0.15 },
    { at:0.40, amp:4.8, len:0.66, speed:0.38, phase:3.1, fill:0.40, line:0.20 },
    { at:0.59, amp:6.4, len:0.55, speed:0.47, phase:4.6, fill:0.48, line:0.25 },
    { at:0.78, amp:8.2, len:0.46, speed:0.58, phase:5.9, fill:0.58, line:0.30 }
  ];
  var FOG_COUNT = 22;

  /* ---------- 상태 ---------- */

  var canvas = null, ctx = null, root = null;
  var W = 0, H = 0, dpr = 1;
  var fog = [], fogSprite = null;
  var clock = 0;                       /* 연출 시계 — 멈춰 있는 동안은 흐르지 않는다 */
  var lastFrame = 0, raf = 0;
  var wanted = false, pageVisible = true, inView = true;
  var intensity = 1;
  var reduced = false, reducedQuery = null;
  var steps = [], omen = null, omenText = '', omenShown = -1;
  var title = null, nextGlitch = 0;

  /* ---------- 준비 ---------- */

  function seedFog(){
    fog = [];
    for(var i = 0; i < FOG_COUNT; i++){
      fog.push({
        x:Math.random(),                          /* 화면 폭에 대한 비율 */
        dy:(Math.random() * 2 - 1),               /* 수평선에서 위아래로 */
        r:0.06 + Math.random() * 0.10,            /* 기준 폭(휴대폰 폭 정도)에 대한 반지름 */
        a:0.10 + Math.random() * 0.12,
        speed:0.006 + Math.random() * 0.014,      /* 초당 화면 폭의 비율 */
        bob:2 + Math.random() * 5,
        bobRate:0.12 + Math.random() * 0.22,
        bobPhase:Math.random() * 6.28
      });
    }
  }

  /* 가장자리가 부드러운 원 하나를 미리 그려 두고 찍는다 — 매 프레임 그라디언트를 만들지 않게 */
  function makeFogSprite(){
    var s = document.createElement('canvas');
    s.width = s.height = 64;
    var g = s.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0,   'rgba(' + FOG_RGB + ',1)');
    grad.addColorStop(0.55,'rgba(' + FOG_RGB + ',0.55)');
    grad.addColorStop(1,   'rgba(' + FOG_RGB + ',0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    fogSprite = s;
  }

  function resize(){
    if(!canvas) return;
    var rect = canvas.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(reduced ? DONE_AT : clock);
  }

  var resizeTimer = 0;
  function onResize(){
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  }

  /* ---------- 그리기 ---------- */

  function ease(x){
    x = Math.max(0, Math.min(1, x));
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  function waveY(w, x, t, horizon){
    var base = horizon + (H - horizon) * w.at;
    var k = (Math.PI * 2) / (W * w.len);
    var s = w.speed * Math.PI * 2 * 0.25;
    return base + w.amp * Math.sin(k * x + s * t + w.phase)
                + w.amp * 0.35 * Math.sin(k * 2.3 * x - s * 0.7 * t + w.phase * 2);
  }

  function drawEye(t, horizon){
    var open = ease((t - EYE_FROM) / EYE_FOR) * (0.35 + 0.65 * intensity);
    if(open < 0.01) return;
    var breath = 1 + 0.02 * Math.sin(t * 0.9);
    var ew = Math.min(W * 0.46, 230) * breath;
    var eh = ew * 0.40;
    var cx = W * 0.5;
    var cy = horizon + (H - horizon) * 0.36;
    var lx = cx - ew / 2, rx = cx + ew / 2;

    ctx.save();
    ctx.beginPath();                               /* 눈꺼풀 사이 — 위는 높게, 아래는 조금 낮게 */
    ctx.moveTo(lx, cy);
    ctx.quadraticCurveTo(cx, cy - eh * open, rx, cy);
    ctx.quadraticCurveTo(cx, cy + eh * open * 0.8, lx, cy);
    ctx.closePath();
    ctx.fillStyle = '#1c2a23';                     /* 흰자: 어두운 녹색 */
    ctx.fill();
    ctx.clip();

    var ir = eh * 0.47;
    var gaze = Math.sin(t * 0.33) * ew * 0.11;     /* 천천히 좌우로 */
    var ix = cx + gaze, iy = cy + eh * 0.04;
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2);
    ctx.fillStyle = '#6a6832';                     /* 홍채: 탁한 황록색 */
    ctx.fill();
    ctx.beginPath(); ctx.arc(ix, iy, ir, 0, Math.PI * 2);
    ctx.lineWidth = ir * 0.18;
    ctx.strokeStyle = 'rgba(40,44,22,0.55)';
    ctx.stroke();
    ctx.beginPath();                               /* 동공: 세로로 긴 슬릿 */
    ctx.ellipse(ix, iy, ir * 0.13 * (0.9 + 0.1 * breath), ir * 0.86, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#040706';
    ctx.fill();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(lx, cy);
    ctx.quadraticCurveTo(cx, cy - eh * open, rx, cy);
    ctx.quadraticCurveTo(cx, cy + eh * open * 0.8, lx, cy);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + LINE_RGB + ',0.16)';
    ctx.stroke();
  }

  function drawWaves(t, horizon){
    var step = W > 700 ? 6 : 4;
    WAVES.forEach(function(w){
      ctx.beginPath();
      ctx.moveTo(0, H);
      for(var x = 0; x <= W + step; x += step) ctx.lineTo(x, waveY(w, x, t, horizon));
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = 'rgba(14,21,19,' + w.fill + ')';   /* 배경색을 겹쳐 눈이 물에 잠겨 보이게 */
      ctx.fill();

      ctx.beginPath();
      for(var x2 = 0; x2 <= W + step; x2 += step){
        var y = waveY(w, x2, t, horizon);
        if(x2 === 0) ctx.moveTo(x2, y); else ctx.lineTo(x2, y);
      }
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(' + LINE_RGB + ',' + w.line + ')';
      ctx.stroke();
    });
  }

  function drawFog(t, horizon){
    var shown = Math.round(FOG_COUNT * (0.5 + 0.5 * intensity));
    var alpha = 0.4 + 0.6 * intensity;
    for(var i = 0; i < shown; i++){
      var f = fog[i];
      var r = f.r * Math.min(W, 560);             /* 넓은 화면에서도 휴대폰에서와 같은 크기의 안개 */
      var span = W + r * 2;
      var x = ((f.x * W + f.speed * W * t) % span + span) % span - r;
      var y = horizon + f.dy * H * 0.035 + Math.sin(t * f.bobRate + f.bobPhase) * f.bob;
      ctx.globalAlpha = f.a * alpha;
      ctx.drawImage(fogSprite, x - r, y - r * 0.5, r * 2, r);   /* 수평선에 붙어 눕도록 납작하게 */
    }
    ctx.globalAlpha = 1;
  }

  function draw(t){
    if(!ctx) return;
    var horizon = Math.round(H * HORIZON) + 0.5;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    ctx.beginPath();
    ctx.moveTo(0, horizon); ctx.lineTo(W, horizon);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(' + LINE_RGB + ',0.22)';
    ctx.stroke();

    drawEye(t, horizon);        /* 파도 뒤 */
    drawWaves(t, horizon);
    drawFog(t, horizon);
  }

  /* ---------- 글자 연출 ---------- */

  function showAllWords(){
    steps.forEach(function(el){ el.classList.add('on'); });
    if(omen){ omen.textContent = omenText; omen.classList.remove('typing'); omenShown = omenText.length; }
  }

  function words(t){
    steps.forEach(function(el){
      if(!el.classList.contains('on') && t >= el._at) el.classList.add('on');
    });

    if(omen && t >= OMEN_AT){
      var n = Math.min(omenText.length, Math.floor((t - OMEN_AT) / OMEN_STEP) + 1);
      if(n !== omenShown){ omen.textContent = omenText.slice(0, n); omenShown = n; }
      omen.classList.toggle('typing', t < OMEN_AT + omenText.length * OMEN_STEP + 1.6);
    }

    /* 제목은 떠오른 뒤에도 가끔 한 번씩 깜빡인다. 몇 초에 한 번, 짧게 */
    if(title && title.classList.contains('on')){
      if(!nextGlitch) nextGlitch = t + 6 + Math.random() * 5;
      if(t >= nextGlitch){
        title.classList.remove('glitch'); void title.offsetWidth;
        title.classList.add('glitch');
        nextGlitch = t + 7 + Math.random() * 6;
      }
    }
  }

  /* ---------- 루프 ---------- */

  function frame(now){
    raf = 0;
    if(!shouldRun()) return;
    var dt = lastFrame ? (now - lastFrame) / 1000 : 0;
    lastFrame = now;
    clock += Math.min(dt, 0.1);         /* 오래 멈췄다 돌아와도 한 번에 건너뛰지 않는다 */
    draw(clock);
    words(clock);
    raf = requestAnimationFrame(frame);
  }

  function shouldRun(){ return wanted && pageVisible && inView && !reduced && !!ctx; }

  function update(){
    if(shouldRun()){
      if(!raf){ lastFrame = 0; raf = requestAnimationFrame(frame); }
    } else if(raf){
      cancelAnimationFrame(raf); raf = 0;
    }
  }

  function applyReduced(){
    reduced = !!(reducedQuery && reducedQuery.matches);
    if(root) root.classList.toggle('m-seq', !reduced);
    if(reduced){ showAllWords(); draw(DONE_AT); }
    update();
  }

  /* ---------- 바깥에 보이는 것 ---------- */

  function init(el, opts){
    if(!el || !el.getContext) return;
    opts = opts || {};
    canvas = el;
    ctx = el.getContext('2d');
    root = opts.root || el.parentNode;
    seedFog();
    makeFogSprite();

    steps = Array.prototype.slice.call(root.querySelectorAll('[data-at]'));
    steps.forEach(function(s){ s._at = parseFloat(s.getAttribute('data-at')) || 0; });
    title = root.querySelector('.m-flicker');
    omen = root.querySelector('#title-omen');
    if(omen){ omenText = omen.getAttribute('data-text') || ''; omen.textContent = ''; }

    reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    if(reducedQuery){
      if(reducedQuery.addEventListener) reducedQuery.addEventListener('change', applyReduced);
      else if(reducedQuery.addListener) reducedQuery.addListener(applyReduced);
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('visibilitychange', function(){
      pageVisible = document.visibilityState !== 'hidden';
      update();
    });
    if('IntersectionObserver' in window){
      new IntersectionObserver(function(entries){
        inView = entries[entries.length - 1].isIntersecting;
        update();
      }).observe(canvas);
    }
    root.addEventListener('click', skip);

    resize();
    applyReduced();
  }

  function start(){ wanted = true; update(); }
  function stop(){ wanted = false; update(); }

  function setIntensity(v){
    intensity = Math.max(0, Math.min(1, +v || 0));
    if(!raf) draw(reduced ? DONE_AT : clock);
  }

  function skip(){
    if(clock >= DONE_AT) return;
    clock = DONE_AT;
    if(root) root.classList.add('m-skip');   /* 페이드 없이 바로 */
    showAllWords();
    draw(clock);
  }

  return { init:init, start:start, stop:stop, setIntensity:setIntensity, skip:skip };
})();
