/* 심연의 일지 — 휴대폰 설치(오프라인 저장)와 그 상태 안내 */
"use strict";

(function(){
  var st   = document.getElementById('offline-status');
  var hint = document.getElementById('install-hint');

  var ua = navigator.userAgent || '';
  var isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var standalone = window.navigator.standalone === true ||
                   (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  if(!standalone && hint){
    hint.hidden = false;
    hint.innerHTML = isIOS
      ? '휴대폰에 설치하려면 사파리 아래쪽 <b>공유 버튼(□↑)</b> → <b>홈 화면에 추가</b>를 누르세요. 그다음부터는 홈 화면 아이콘으로 인터넷 없이 열립니다.'
      : '휴대폰에 설치하려면 브라우저 메뉴(⋮)에서 <b>홈 화면에 추가</b> 또는 <b>앱 설치</b>를 누르세요. 그다음부터는 인터넷 없이 열립니다.';
  }

  function say(text, cls){
    if(!st) return;
    st.hidden = false;
    st.className = 'offline-status' + (cls ? ' ' + cls : '');
    st.textContent = text;
  }

  var devHost = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if(devHost && !/[?&]sw\b/.test(location.search)){
    if(st){ st.hidden = false; st.textContent = '개발 모드 — 오프라인 저장 꺼짐 (주소에 ?sw 를 붙이면 켜짐)'; }
    return;
  }

  if(!('serviceWorker' in navigator)){
    say('이 브라우저에서는 오프라인 저장을 쓸 수 없습니다.');
    return;
  }

  /* "저장됨"은 저장본이 실제로 온전한지 확인이 끝난 뒤에만 말한다 */
  navigator.serviceWorker.addEventListener('message', function(e){
    if(!e.data) return;
    if(e.data.type === 'offline-ready')  say('✓ 이 기기에 저장됨 — 인터넷 없이도 플레이할 수 있습니다', 'ready');
    if(e.data.type === 'offline-failed') say('저장을 마치지 못했습니다. 인터넷이 될 때 한 번 더 열어 주세요.');
  });

  say(navigator.serviceWorker.controller
      ? '저장본을 확인하는 중…'
      : '이 기기에 저장하는 중… (처음 한 번, 5MB 정도)');

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./sw.js').catch(function(){
      say('오프라인 저장을 시작하지 못했습니다. 인터넷 연결을 확인하세요.');
    });
    navigator.serviceWorker.ready.then(function(reg){
      if(reg.active) reg.active.postMessage({ type:'ensure' });
    });
  });
})();
