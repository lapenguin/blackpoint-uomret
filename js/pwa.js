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

  if(!('serviceWorker' in navigator)){
    if(st){ st.hidden = false; st.textContent = '이 브라우저에서는 오프라인 저장을 쓸 수 없습니다.'; }
    return;
  }
  function ready(){
    if(!st) return;
    st.hidden = false;
    st.className = 'offline-status ready';
    st.textContent = '✓ 이 기기에 저장됨 — 인터넷 없이도 플레이할 수 있습니다';
  }
  navigator.serviceWorker.addEventListener('message', function(e){
    if(e.data && e.data.type === 'offline-ready') ready();
  });
  if(navigator.serviceWorker.controller) ready();
  else if(st){ st.hidden = false; st.textContent = '이 기기에 저장하는 중… (처음 한 번, 5MB 정도)'; }

  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./sw.js').catch(function(){
      if(st){ st.hidden = false; st.textContent = '오프라인 저장을 시작하지 못했습니다. 인터넷 연결을 확인하세요.'; }
    });
  });
})();
