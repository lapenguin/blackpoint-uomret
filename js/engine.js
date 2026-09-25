/* 심연의 일지 — 엔진 — 상태, 화면 그리기, 주사위, 추격 */
"use strict";

/* =========================================================
   상태
   ========================================================= */

var state = null;
var beatQueue = [];
var BR = String.fromCharCode(10) + String.fromCharCode(10);
var NL = String.fromCharCode(10);

/* ---------------------------------------------------------
   자동 저장 — 지도 화면에 돌아올 때마다 한 번. 휴대폰이 앱을 닫아도 이어서 할 수 있게.
   --------------------------------------------------------- */
var SAVE_KEY = 'bp_save_v1';

function saveProgress(){
  if(!state) return;
  try{
    var copy = {};
    Object.keys(state).forEach(function(k){ if(k !== 'char') copy[k] = state[k]; });
    copy.travelLine = null;
    localStorage.setItem(SAVE_KEY, JSON.stringify({ v:1, savedAt:Date.now(), state:copy }));
  }catch(err){ /* 저장소를 쓸 수 없으면 조용히 넘어간다 */ }
}
function clearProgress(){
  try{ localStorage.removeItem(SAVE_KEY); }catch(err){}
}
function loadProgress(){
  try{
    var raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return null;
    var data = JSON.parse(raw);
    var s = data && data.state;
    if(!s || !CHARACTERS[s.charId] || typeof s.day !== 'number') return null;   /* 모양이 다른 옛 저장은 버린다 */
    s.char = CHARACTERS[s.charId];
    return { savedAt:data.savedAt, state:s };
  }catch(err){ return null; }
}

function newState(charId){
  var c = CHARACTERS[charId];
  return {
    charId:charId, char:c,
    day:1, phase:0,                 /* 0 = 낮, 1 = 밤 */
    sanity:c.sanityMax, sanityMax:c.sanityMax,
    health:c.healthMax, healthMax:c.healthMax,
    watch:0, watchMax:6,
    location:'harbor',
    clues:{}, clueOrder:[],
    inventory:[], flags:{}, seen:{},
    ammo:0, steps:0, leadAt:{}, log:[], tries:{}
  };
}

/* =========================================================
   유틸
   ========================================================= */

function clampStat(v,max){ return Math.max(0, Math.min(max, v)); }
function rollSmall(sides){ return 1 + Math.floor(Math.random()*sides); }
function d6(){ return 1 + Math.floor(Math.random()*6); }
function pickOne(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function shuffleArr(arr){
  for(var i=arr.length-1;i>0;i--){
    var j = Math.floor(Math.random()*(i+1));
    var t=arr[i]; arr[i]=arr[j]; arr[j]=t;
  }
  return arr;
}
function isNight(){ return state.phase === 1; }
function daysLeft(){ return LAST_DAY - state.day; }
function dateLabel(){ return '10월 ' + (START_DATE + state.day) + '일 · ' + (isNight() ? '밤' : '낮'); }

function hasClue(id){ return !!state.clues[id]; }
function hasItem(id){ return state.inventory.indexOf(id) !== -1; }
function addItem(id){ if(!hasItem(id)) state.inventory.push(id); }
function removeItem(id){ var i=state.inventory.indexOf(id); if(i!==-1) state.inventory.splice(i,1); }
function clueCount(){ return state.clueOrder.length; }
function logLine(s){ if(state.log.indexOf(s) === -1) state.log.push(s); }

function gainClue(id){
  if(!CLUES[id] || state.clues[id]) return false;
  state.clues[id] = true;
  state.clueOrder.push(id);
  return true;
}

function healthStatus(){
  if(state.health <= state.healthMax * 0.25) return 'critical';
  if(state.health <= state.healthMax * 0.5) return 'wounded';
  return 'ok';
}
function sanityStatus(){
  if(state.sanity <= state.sanityMax * 0.25) return 'critical';
  if(state.sanity <= state.sanityMax * 0.5) return 'wounded';
  return 'ok';
}
function watchStatus(){
  if(state.watch >= 5) return 'critical';
  if(state.watch >= 3) return 'wounded';
  return 'ok';
}

/* 보정은 합계가 아니라 내역으로 — 굴리기 전에 무엇이 얹혔는지 보여야 한다 */
function sumMods(mods){
  var t = 0;
  (mods||[]).forEach(function(m){ t += m.value; });
  return t;
}
function obsMods(){
  var m = [];
  if(state.char.obs) m.push({ label:'관찰', value:state.char.obs });
  if(hasItem('match')) m.push({ label:'성냥불', value:1 });
  if(hasItem('notebook')) m.push({ label:'해나의 공책', value:1 });
  var ss = sanityStatus();
  if(ss === 'wounded') m.push({ label:'동요', value:-1 });
  if(ss === 'critical') m.push({ label:'광기 직전', value:-2 });
  if(isNight()) m.push({ label:'어둠', value:-1 });
  return m;
}
function nerveMods(){
  var m = [];
  if(state.char.nerve) m.push({ label:'담력', value:state.char.nerve });
  if(hasItem('gun')) m.push({ label:'권총', value:2 });
  var hs = healthStatus();
  if(hs === 'wounded') m.push({ label:'부상', value:-1 });
  if(hs === 'critical') m.push({ label:'빈사', value:-2 });
  return m;
}
/* 같은 곳을 다시 살피면 지난번에 봐둔 것이 도움이 된다.
   핵심 단서가 주사위 한 번에 영영 막히지 않도록 하는 장치. */
function retryMod(sceneId){
  var n = (state.tries && state.tries[sceneId]) || 0;
  return n ? [{ label:'지난번에 봐둔 것', value:Math.min(3, n) }] : [];
}
function noteFail(sceneId){
  state.tries = state.tries || {};
  state.tries[sceneId] = (state.tries[sceneId] || 0) + 1;
}

function obsBonus(){ return sumMods(obsMods()); }
function nerveBonus(){ return sumMods(nerveMods()); }

function applyEffect(e){
  if(!e) return;
  if(e.sanity) state.sanity = clampStat(state.sanity + e.sanity, state.sanityMax);
  if(e.health) state.health = clampStat(state.health + e.health, state.healthMax);
  if(e.sanityMax){ state.sanityMax = Math.max(3, state.sanityMax + e.sanityMax); state.sanity = Math.min(state.sanity, state.sanityMax); }
  if(e.item) addItem(e.item);
  if(e.drop) removeItem(e.drop);
  if(e.flag) state.flags[e.flag] = true;
  if(e.watch) state.watch = clampStat(state.watch + e.watch, state.watchMax);
  if(e.clue){
    if(typeof e.clue === 'string') gainClue(e.clue);
    else e.clue.forEach(gainClue);
  }
}

/* =========================================================
   값을 치를 수 있는 사람 — 이 게임의 목표
   ========================================================= */

function footprintStage(){ return state.flags.mary3 ? 3 : (state.flags.mary2 ? 2 : (state.flags.mary1 ? 1 : 0)); }

function marthaReady(){
  /* 연민 둘 + 진실을 보여주었을 것 */
  return !!state.flags.marthaMercyMary && !!state.flags.marthaMercyLine && !!state.flags.marthaToldTruth;
}
function maryReady(){ return footprintStage() >= 3 && hasClue('blood'); }
function carterReady(){
  return !!state.flags.carterPersuaded && !state.flags.carterGunTaken && maryReady();
}
function selfBacked(){ return !!state.flags.marthaToldTruth && !state.flags.marthaFled; }

function bearers(){
  return [
    { id:'martha', name:'마사 휘트필드', ready:marthaReady(), note:marthaNote() },
    { id:'mary', name:'메리 휘트필드', ready:maryReady(),
      note: maryReady()
        ? '팔십 년 만에 처음으로, 물어볼 수 있는 자리에 와 있습니다.'
        : (footprintStage() > 0
            ? '젖은 발자국 ' + footprintStage() + '/3 — 조금씩 가까워지고 있습니다.'
            : '아직 아무것도 모릅니다. 이 마을에 남은 것이 산 사람뿐인지도.') },
    { id:'carter', name:'엘든 카터', ready:carterReady(),
      note: state.flags.carterGunTaken
        ? '그의 총을 당신이 가지고 있습니다. 그는 이제 아무것도 내놓을 것이 없습니다.'
        : (carterReady()
            ? '자격은 없습니다. 다만 자격 있는 사람이 옆에 선다면.'
            : (state.flags.carterPersuaded
                ? '그날 밤 부르면 듣겠다고 했습니다. 다만 그에게는 자격이 없습니다. 옆에 설 사람이 필요합니다.'
                : (state.flags.carterMet ? '예배당 뒷마당에 아직 있습니다. 함께 나가자고 말해 본 적은 없습니다.' : '아직 찾지 못했습니다.'))) },
    { id:'self', name:'당신', ready:true,
      note: hasClue('blood')
        ? (selfBacked() ? '자격은 없습니다. 시간은 살 수 있습니다. 뒤에서 구절을 이어줄 사람이 있다면.'
                        : '자격도, 뒤를 이어줄 사람도 없습니다. 그저 스물네 번째 이름이 될 뿐입니다.')
        : '언제든 걸어 들어갈 수는 있습니다. 그것이 무슨 뜻인지는 아직 모릅니다.' }
  ];
}

/* 마사가 지금 어디쯤 와 있는지 — 할 일이 남았으면 어디로 가야 하는지까지 */
function marthaNote(){
  var f = state.flags;
  if(marthaReady()) return '진실을 알았고, 자기 차례라는 것도 받아들였습니다.';
  if(f.marthaFled) return '떠났습니다. 백 년 만에 처음으로 관리자가 도망친 것입니다.';
  if(!state.seen['i_confront']){
    if(f.suspectMartha) return '편지를 쓴 사람이 누구인지 압니다. 여관에서 마주 앉을 수 있습니다.';
    if(f.metMartha) return hasClue('blood') ? '관리자의 핏줄입니다. 다만 당신을 이 마을로 부른 까닭을 아직 모릅니다.'
                                            : '관리자의 핏줄입니다. 다만 무엇이 값인지 당신이 아직 모릅니다.';
    return '여관 주인. 아직 제대로 이야기해 본 적이 없습니다.';
  }
  if(!f.marthaMercyMary) return '메리가 누구였는지 아직 묻지 않았습니다. 여관에서 물어볼 수 있습니다.';
  if(!hasClue('blood')) return '그녀의 사정은 들었습니다. 다만 무엇이 값인지 당신이 아직 모릅니다. 제단 아래에 답이 있습니다.';
  if(!f.marthaToldTruth) return '진실을 전할 수 있습니다. 여관으로 가십시오.';
  if(!f.marthaMercyLine){
    return state.seen['i_last']
      ? '진실은 전했습니다. 다만 그녀에게 선택을 남겨 주지는 않았습니다.'
      : '진실은 전했습니다. 그믐이 가까워지면 그녀가 명단의 마지막 줄을 꺼낼 것입니다.';
  }
  return '';
}

function ritualReady(){ return hasClue('phrase') && hasClue('timing') && hasClue('blood'); }

/* =========================================================
   화면
   ========================================================= */

function showScreen(name){
  ['title','select','game','end'].forEach(function(n){
    document.getElementById('screen-'+n).hidden = (n !== name);
  });
  document.body.classList.remove('in-scene', 'peek');
}

/* 장면 모드의 한 줄 상태 — 누르면 전체 상태창이 펼쳐진다 */
function renderStrip(){
  var el = document.getElementById('scene-strip');
  if(!el || !state) return;
  el.innerHTML = '';
  function part(cls, label, value){
    var s = document.createElement('span');
    s.className = cls;
    if(label) s.appendChild(document.createTextNode(label + ' '));
    var b = document.createElement('b'); b.textContent = value;
    s.appendChild(b);
    el.appendChild(s);
  }
  var d = document.createElement('span');
  d.className = 'ss-date';
  d.textContent = dateLabel();
  el.appendChild(d);
  part(state.sanity <= state.sanityMax * 0.5 ? 'low' : '', '정신력', state.sanity + '/' + state.sanityMax);
  part(state.health <= state.healthMax * 0.5 ? 'low' : '', '체력', state.health + '/' + state.healthMax);
  part(state.watch >= 3 ? 'low' : '', '주시', String(state.watch));
  var m = document.createElement('span');
  m.className = 'ss-more';
  m.textContent = document.body.classList.contains('peek') ? '▴' : '▾';
  el.appendChild(m);
  el.setAttribute('aria-expanded', document.body.classList.contains('peek') ? 'true' : 'false');
}

/* 이동 서사 — 같은 문장이 연달아 나오지 않게 */
function pickFresh(key, arr){
  if(!arr || !arr.length) return '';
  state.lastTravel = state.lastTravel || {};
  var opts = arr.filter(function(s){ return s !== state.lastTravel[key]; });
  var s = pickOne(opts.length ? opts : arr);
  state.lastTravel[key] = s;
  return s;
}
function composeTravel(from, to){
  var when = isNight() ? 'night' : 'day';
  var base = (from === to)
    ? pickFresh('stay-' + when, TRAVEL.stay[when])
    : pickFresh(to + '-' + when, (TRAVEL.arrive[to] || {})[when]);
  var extra = '';
  if(state.sanity <= state.sanityMax * 0.5 && Math.random() < 0.6) extra = pickFresh('san', TRAVEL.sanLow);
  else if(state.watch >= 3 && Math.random() < 0.6)                 extra = pickFresh('watch', TRAVEL.watched);
  else if(state.day >= 9 && Math.random() < 0.5)                    extra = pickFresh('late', TRAVEL.late);
  else if(Math.random() < 0.3)                                      extra = pickFresh('char', TRAVEL.char[state.charId]);
  return base + (extra ? ' ' + extra : '');
}

function renderPips(containerId, current, max, cls){
  var el = document.getElementById(containerId);
  el.innerHTML = '';
  for(var i=0;i<max;i++){
    var pip = document.createElement('span');
    pip.className = 'pip' + (i < current ? ' filled '+cls : '');
    el.appendChild(pip);
  }
}

function updateStatsUI(){
  renderPips('sanity-pips', state.sanity, state.sanityMax, 'sanity');
  renderPips('health-pips', state.health, state.healthMax, 'health');
  renderPips('watch-pips', state.watch, state.watchMax, 'watch');
  renderPips('doom-pips', state.day, LAST_DAY, 'doom');

  var ss = sanityStatus(), hs = healthStatus(), ws = watchStatus();
  var sEl = document.getElementById('sanity-status');
  var hEl = document.getElementById('health-status');
  var wEl = document.getElementById('watch-status');
  sEl.textContent = ss === 'critical' ? '광기 직전' : (ss === 'wounded' ? '동요' : '');
  sEl.className = 'status-tag' + (ss !== 'ok' ? ' '+ss : '');
  hEl.textContent = hs === 'critical' ? '빈사 상태' : (hs === 'wounded' ? '부상' : '');
  hEl.className = 'status-tag' + (hs !== 'ok' ? ' '+hs : '');
  wEl.textContent = ws === 'critical' ? '드러남' : (ws === 'wounded' ? '눈총' : '');
  wEl.className = 'status-tag' + (ws !== 'ok' ? ' '+ws : '');

  document.getElementById('clue-count').textContent = clueCount();
  document.getElementById('char-banner').textContent = state.char.name + ' · ' + state.char.role;
  document.getElementById('date-label').textContent =
    dateLabel() + (daysLeft() > 0 ? ' — 그믐까지 ' + daysLeft() + '일' : ' — 오늘이 그믐');
  document.body.classList.toggle('is-night', isNight());
  renderJournal();
  renderStrip();
}

function renderJournal(){
  /* 값을 치를 사람 */
  var hint = document.getElementById('bearer-hint');
  hint.textContent = hasClue('blood')
    ? '참된 봉인은 계약을 맺은 피를 받습니다. 남은 것은 그 사람을 움직이는 일뿐입니다.'
    : '아직 무엇이 값인지조차 모릅니다. 제단 아래를 열어야 합니다.';

  var bl = document.getElementById('bearer-list');
  bl.innerHTML = '';
  bearers().forEach(function(b){
    var box = document.createElement('div');
    box.className = 'bearer' + (b.ready ? ' ready' : '') + (b.id === 'carter' && state.flags.carterGunTaken ? ' barred' : '');
    var head = document.createElement('div');
    head.className = 'bearer-name';
    var nm = document.createElement('span'); nm.textContent = b.name;
    var st = document.createElement('span');
    st.className = 'bearer-state';
    st.textContent = b.ready ? '준비됨' : '아직';
    head.appendChild(nm); head.appendChild(st);
    var note = document.createElement('div');
    note.className = 'bearer-note';
    note.textContent = b.note;
    box.appendChild(head); box.appendChild(note);
    bl.appendChild(box);
  });

  /* 의식 요건 */
  var req = document.getElementById('req-list');
  req.innerHTML = '';
  [['구절','phrase','그들이 읊는 말이 어딘가 적혀 있을 것이다 — 동굴, 혹은 예배당'],
   ['시기','timing','사람이 사라지는 날에는 규칙이 있다 — 광장·학교, 혹은 등대'],
   ['자격','blood','백 년 전 첫 관리자가 무언가를 남겼다 — 제단 아래']].forEach(function(r){
    var li = document.createElement('li');
    var got = hasClue(r[1]);
    li.className = got ? 'met' : '';
    var mark = document.createElement('span');
    mark.className = 'req-mark';
    mark.textContent = got ? '✓' : '·';
    var txt = document.createElement('span');
    txt.textContent = r[0] + ' — ' + (got ? CLUES[r[1]].title : r[2]);
    li.appendChild(mark); li.appendChild(txt);
    req.appendChild(li);
  });

  /* 단서 */
  var box = document.getElementById('clue-list');
  box.innerHTML = '';
  if(state.clueOrder.length === 0){
    box.innerHTML = '<p class="journal-empty">아직 적을 것이 없습니다.</p>';
    return;
  }
  state.clueOrder.forEach(function(id){
    var c = CLUES[id];
    var wrap = document.createElement('div');
    wrap.className = 'clue-entry' + (c.key ? ' derived' : '') + (c.secret ? ' secret' : '');
    var head = document.createElement('div');
    head.className = 'clue-head';
    head.textContent = c.title;
    var tag = document.createElement('span');
    tag.className = 'clue-tag';
    tag.textContent = c.key ? ('핵심 · ' + c.key) : c.tag;
    head.appendChild(tag);
    var body = document.createElement('div');
    body.className = 'clue-body';
    body.textContent = c.text;
    wrap.appendChild(head); wrap.appendChild(body);
    box.appendChild(wrap);
  });
}

function useWhiskey(){
  if(!hasItem('whiskey')) return;
  removeItem('whiskey');
  applyEffect({ sanity:3, health:-1 });
  updateStatsUI(); updateInventoryUI();
}
function useBandage(){
  if(!hasItem('bandage')) return;
  removeItem('bandage');
  applyEffect({ health:4 });
  updateStatsUI(); updateInventoryUI();
}

function updateInventoryUI(){
  var box = document.getElementById('inventory-items');
  box.innerHTML = '';
  if(state.inventory.length === 0){
    box.innerHTML = '<span class="inventory-empty">없음</span>';
    return;
  }
  state.inventory.forEach(function(id){
    var meta = ITEM_META[id];
    if(!meta) return;
    var usable = (id === 'whiskey') || (id === 'bandage');
    if(usable){
      var btn = document.createElement('button');
      btn.className = 'item-chip usable';
      btn.title = meta.note;
      btn.textContent = meta.icon + ' ' + meta.label + (id === 'whiskey' ? ' (마시기)' : ' (쓰기)');
      btn.addEventListener('click', id === 'whiskey' ? useWhiskey : useBandage);
      box.appendChild(btn);
    } else {
      var chip = document.createElement('span');
      chip.className = 'item-chip';
      chip.title = meta.note;
      chip.textContent = meta.icon + ' ' + meta.label + (id === 'gun' ? ' (탄 '+state.ammo+')' : '');
      box.appendChild(chip);
    }
  });
}

function canReach(id){
  if(id === state.location) return true;
  if(ADJ[state.location].indexOf(id) === -1) return false;
  if(id === 'altar' && !hasClue('marks')) return false;
  return true;
}

function renderMap(){
  saveProgress();
  document.body.classList.remove('in-scene', 'peek');
  window.scrollTo(0, 0);
  document.getElementById('encounter-section').hidden = true;
  document.getElementById('map-section').hidden = false;
  updateStatsUI();
  updateInventoryUI();

  document.getElementById('map-prompt').textContent =
    isNight() ? '밤입니다. 어디로 향하시겠습니까?' : '어디로 향하시겠습니까?';

  var pathLine = document.getElementById('altar-path');
  if(pathLine) pathLine.setAttribute('class', hasClue('marks') ? 'known' : 'dashed');

  document.querySelectorAll('.map-node').forEach(function(btn){
    var id = btn.dataset.loc;
    var here = (id === state.location);
    var ok = canReach(id) && !here;
    btn.classList.toggle('current', here);
    btn.classList.toggle('reachable', ok);
    btn.classList.toggle('blocked', !ok && !here);
    var old = btn.querySelector('.dot');
    if(old) old.remove();
    btn.classList.remove('route-next', 'route-dest');
    var lead = state.leadAt[id];
    btn.title = LOC[id].name + (lead ? ' — ' + lead.text : '');
    if(lead){
      var dot = document.createElement('span');
      dot.className = 'dot ' + lead.tag;
      btn.appendChild(dot);
    }
  });
  renderLeads();
  renderNextStep();
}

/* ---------------------------------------------------------
   알아볼 곳 — 어디에 무엇이 걸려 있고, 몇 수 거리인가
   --------------------------------------------------------- */
var TAG_ORDER = { core:0, person:1, lore:2, danger:3 };
var TAG_LABEL = { core:'핵심', person:'사람', lore:'기록', danger:'위험' };

/* 지금 자리에서 각 장소까지의 수와 첫걸음 */
function routesFrom(start){
  var dist = {}, first = {};
  dist[start] = 0;
  var q = [start];
  while(q.length){
    var u = q.shift();
    ADJ[u].forEach(function(v){
      if(v === 'altar' && !hasClue('marks')) return;   /* 표식을 모르면 제단에 못 간다 */
      if(dist[v] !== undefined) return;
      dist[v] = dist[u] + 1;
      first[v] = (u === start) ? v : first[u];
      q.push(v);
    });
  }
  return { dist:dist, first:first };
}

function clearRoute(){
  document.querySelectorAll('.map-node').forEach(function(b){ b.classList.remove('route-next', 'route-dest'); });
}

function showRoute(loc){
  var r = routesFrom(state.location);
  clearRoute();
  var dest = document.querySelector('.map-node[data-loc="' + loc + '"]');
  if(dest && loc !== state.location) dest.classList.add('route-dest');
  var step = r.first[loc];
  if(step && step !== loc){
    var n = document.querySelector('.map-node[data-loc="' + step + '"]');
    if(n) n.classList.add('route-next');
  }
}

/* 가장 가까운 곳 */
function nearestOf(locs){
  var r = routesFrom(state.location), best = null;
  locs.forEach(function(l){
    var d = r.dist[l];
    if(d === undefined) return;
    if(!best || d < best.d) best = { loc:l, d:d };
  });
  return best;
}

/* 다음 할 일 — 위험하면 쉬라고, 밤이 걱정되면 숨으라고, 아니면 가장 중요한 곳을 */
function renderNextStep(){
  var el = document.getElementById('next-step');
  if(!el) return;
  var sanLow = state.sanity <= state.sanityMax * 0.5;
  var hpLow  = state.health <= state.healthMax * 0.5;
  var pick = null, cls = '', head = '', text = '';

  if(sanLow || hpLow){
    pick = nearestOf(['inn', 'harbor']);
    if(pick){
      cls = 'warn';
      head = (sanLow ? '정신력' : '체력') + '이 절반 아래입니다';
      text = LOC[pick.loc].name + '에서 쉬세요';
    }
  }
  if(!pick && state.watch >= 3 && !isNight()){
    pick = nearestOf(['inn', 'harbor']);
    if(pick){
      cls = 'safe';
      head = '해가 지면 쫓길 수 있습니다';
      text = '주시가 높습니다. ' + LOC[pick.loc].name + '에서 밤을 보내면 안전합니다';
    }
  }
  if(!pick){
    var r = routesFrom(state.location);
    var items = Object.keys(state.leadAt).map(function(loc){
      return { loc:loc, l:state.leadAt[loc], d:r.dist[loc] };
    }).filter(function(x){ return x.d !== undefined && x.l.tag !== 'danger'; });
    items.sort(function(a, b){ return (TAG_ORDER[a.l.tag] - TAG_ORDER[b.l.tag]) || (a.d - b.d); });
    if(items.length){
      pick = { loc:items[0].loc, d:items[0].d };
      head = '다음';
      text = LOC[pick.loc].name + ' — ' + items[0].l.text;
    }
  }

  if(!pick){
    el.hidden = false;
    el.className = 'next-step';
    el.innerHTML = '';
    var h0 = document.createElement('span'); h0.className = 'ns-head'; h0.textContent = '다음';
    el.appendChild(h0);
    el.appendChild(document.createTextNode('일지를 펼쳐 무엇이 모자란지 확인해 보세요.'));
    el.onclick = function(){ document.getElementById('journal-toggle').click(); };
    return;
  }

  el.hidden = false;
  el.className = 'next-step' + (cls ? ' ' + cls : '');
  el.innerHTML = '';
  var h = document.createElement('span'); h.className = 'ns-head'; h.textContent = head;
  el.appendChild(h);
  el.appendChild(document.createTextNode(text + (pick.d === 0 ? ' · 지금 여기 — 이곳을 한 번 더 누르세요' : ' · ' + pick.d + '수')));
  el.onclick = function(){
    if(pick.d === 0){
      clearRoute();
      var here = document.querySelector('.map-node.current');
      if(here) here.classList.add('route-next');
    } else {
      showRoute(pick.loc);
    }
  };
}

function renderLeads(){
  var box = document.getElementById('lead-list');
  if(!box) return;
  box.innerHTML = '';
  var r = routesFrom(state.location);

  var items = Object.keys(state.leadAt).map(function(loc){
    return { loc:loc, l:state.leadAt[loc], d:r.dist[loc] };
  });
  items.sort(function(a, b){
    var t = TAG_ORDER[a.l.tag] - TAG_ORDER[b.l.tag];
    if(t) return t;
    var da = (a.d === undefined) ? 99 : a.d, db = (b.d === undefined) ? 99 : b.d;
    return da - db;
  });

  if(!items.length){
    var empty = document.createElement('p');
    empty.className = 'lead-empty';
    empty.textContent = '당장 알아볼 곳이 떠오르지 않습니다. 일지를 다시 읽어 보십시오.';
    box.appendChild(empty);
    return;
  }

  items.slice(0, 6).forEach(function(x){
    var row = document.createElement('button');
    row.className = 'lead-row ' + x.l.tag + (x.d === undefined ? ' unreachable' : '');

    var tag = document.createElement('span');
    tag.className = 'lead-tag';
    tag.textContent = TAG_LABEL[x.l.tag] || '';

    var body = document.createElement('span');
    body.className = 'lead-text';
    var place = document.createElement('b');
    place.textContent = LOC[x.loc].name;
    body.appendChild(place);
    body.appendChild(document.createTextNode(' · ' + x.l.text));

    var dist = document.createElement('span');
    dist.className = 'lead-dist';
    var parts = [];
    if(x.d === undefined) parts.push('길을 모름');
    else if(x.d === 0) parts.push('지금 여기');
    else parts.push(x.d + '수');
    if(x.l.until){
      var rem = x.l.until - state.day;
      parts.push(rem <= 0 ? '오늘까지' : rem + '일 남음');
      if(rem <= 2) dist.classList.add('urgent');
    }
    dist.textContent = parts.join(' · ');

    row.appendChild(tag); row.appendChild(body); row.appendChild(dist);
    row.addEventListener('click', function(){
      var on = row.classList.contains('active');
      box.querySelectorAll('.lead-row').forEach(function(rw){ rw.classList.remove('active'); });
      if(on){ clearRoute(); return; }
      row.classList.add('active');
      showRoute(x.loc);
    });
    box.appendChild(row);
  });
}

/* =========================================================
   인카운터 표시
   ========================================================= */

/* 삽화 — art/ 폴더에 파일이 있으면 뜨고, 없으면 조용히 사라진다.
   그래서 그림을 한 장도 넣지 않아도 게임은 그대로 돌아간다. */
var ART_DIR = 'art/';
var ART_EXTS = ['.jpg', '.png', '.webp'];   /* 넣어준 확장자가 무엇이든 찾아낸다 */

/* 삽화 폴더의 위치는 호스팅 방식에 따라 달라진다.
   아티팩트처럼 페이지 주소 끝에 슬래시가 없으면 'art/'가 한 단계 위로 해석되므로,
   시작할 때 후보를 하나씩 찔러 보고 실제로 열리는 것을 쓴다. */
function artBaseCandidates(){
  var path = location.pathname || '/';
  var dir  = path.replace(/\/[^\/]*$/, '/');      /* .../index.html -> .../ */
  var self = path.replace(/\/$/, '') + '/';       /* .../ID         -> .../ID/ */
  var list = ['art/', dir + 'art/', self + 'art/', './art/'];
  var seen = {}, out = [];
  list.forEach(function(b){ if(!seen[b]){ seen[b] = 1; out.push(b); } });
  return out;
}

var ART_READY = false;
var ART_WAITING = [];
function whenArtReady(fn){ if(ART_READY) fn(); else ART_WAITING.push(fn); }
function markArtReady(){
  ART_READY = true;
  var q = ART_WAITING; ART_WAITING = [];
  q.forEach(function(f){ f(); });
}

/* 아무 그림이나 하나로 경로를 확인한다. 하나도 없으면 그냥 기본값으로 두고 넘어간다. */
function detectArtBase(){
  var bases = artBaseCandidates();
  var probes = ['loc-harbor', 'npc-martha', 'pc-reporter'];
  var bi = 0, pi = 0;
  (function step(){
    if(bi >= bases.length) return markArtReady();
    var im = new Image();
    im.onload  = function(){ ART_DIR = bases[bi]; markArtReady(); };
    im.onerror = function(){
      pi += 1;
      if(pi >= probes.length){ pi = 0; bi += 1; }
      step();
    };
    im.src = bases[bi] + probes[pi] + ART_EXTS[0];
  })();
}

/* 확장자를 차례로 시도하고, 다 없으면 onFail */
function loadArtInto(img, id, onOk, onFail){
  whenArtReady(function(){
    var i = 0;
    function attempt(){
      if(i >= ART_EXTS.length){ img.onerror = null; img.onload = null; return onFail(); }
      img.src = ART_DIR + id + ART_EXTS[i++];
    }
    img.onerror = attempt;
    img.onload  = function(){ onOk(); };
    img.alt = '';
    attempt();
  });
}

function setArt(figId, imgId, ids){
  var fig = document.getElementById(figId);
  var img = document.getElementById(imgId);
  if(!fig || !img) return;
  fig.hidden = true;                        /* 뜰 때까지는 숨겨둔다 */
  if(!ids || !ids.length) return;
  var idx = 0;
  (function tryNextId(){
    if(idx >= ids.length){ fig.hidden = true; return; }
    var id = ids[idx++];
    loadArtInto(img, id,
      function(){
        fig.className = 'art' + (id.indexOf('npc-') === 0 ? ' portrait' : '');
        fig.hidden = false;
      },
      tryNextId);
  })();
}

function sceneArt(explicit){
  if(explicit === null) return [];                   /* 명시적으로 끄기 */
  var here = state ? ('loc-' + state.location) : null;
  if(explicit) return here ? [explicit, here] : [explicit];
  return here ? [here] : [];
}

function openEncounter(title, text, place, art){
  document.body.classList.add('in-scene');
  document.body.classList.remove('peek');
  var tr = document.getElementById('event-travel');
  if(tr){
    if(state && state.travelLine){ tr.hidden = false; tr.textContent = state.travelLine; state.travelLine = null; }
    else tr.hidden = true;
  }
  window.scrollTo(0, 0);
  setArt('event-art', 'event-art-img', sceneArt(art));
  document.getElementById('map-section').hidden = true;
  document.getElementById('encounter-section').hidden = false;
  document.getElementById('event-title').textContent = title;
  var pl = document.getElementById('event-place');
  if(place){ pl.hidden = false; pl.textContent = place; }
  else pl.hidden = true;
  document.getElementById('event-text').textContent = text;
  document.getElementById('doc-area').hidden = true;
  document.getElementById('track-area').hidden = true;
}

function showDoc(head, body){
  var area = document.getElementById('doc-area');
  area.hidden = false;
  document.getElementById('doc-head').textContent = head;
  document.getElementById('doc-body').textContent = body;
}

function showTrack(total, current){
  var area = document.getElementById('track-area');
  area.hidden = false;
  var t = document.getElementById('track');
  t.innerHTML = '';
  for(var i=1;i<=total;i++){
    var s = document.createElement('div');
    s.className = 'track-step' + (i < current ? ' done' : (i === current ? ' now' : ''));
    t.appendChild(s);
  }
}

function makeChoiceButton(c){
  var btn = document.createElement('button');
  btn.className = 'choice-btn' + (c.weighty ? ' weighty' : '');
  btn.textContent = c.label;
  if(c.note){
    var n = document.createElement('span');
    n.className = 'choice-note';
    n.textContent = c.note;
    btn.appendChild(n);
  }
  btn.addEventListener('click', function(){
    var outcome = c.onPick();
    if(outcome) showContinueWithText(outcome.text, outcome.next, outcome.doc);
  });
  return btn;
}

function showNarrativeBeat(title, text, nextFn, opts){
  opts = opts || {};
  openEncounter(title, text, opts.place, opts.art);
  document.getElementById('dice-area').hidden = true;
  if(opts.doc) showDoc(opts.doc[0], opts.doc[1]);
  updateStatsUI(); updateInventoryUI();
  var box = document.getElementById('choices');
  box.innerHTML = '';
  var btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.textContent = opts.label || '계속';
  btn.addEventListener('click', function(){ nextFn(); });
  box.appendChild(btn);
}

function showContinueWithText(text, nextFn, doc){
  var tr = document.getElementById('event-travel');
  if(tr) tr.hidden = true;
  window.scrollTo(0, 0);
  updateStatsUI(); updateInventoryUI();
  document.getElementById('event-text').textContent = text;
  if(doc) showDoc(doc[0], doc[1]);
  var box = document.getElementById('choices');
  box.innerHTML = '';
  var btn = document.createElement('button');
  btn.className = 'choice-btn';
  btn.textContent = '계속';
  btn.addEventListener('click', function(){ nextFn(); });
  box.appendChild(btn);
}

function showChoiceEncounter(cfg){
  openEncounter(cfg.title, cfg.text, cfg.place, cfg.art);
  document.getElementById('dice-area').hidden = true;
  if(cfg.doc) showDoc(cfg.doc[0], cfg.doc[1]);
  if(cfg.track) showTrack(cfg.track[0], cfg.track[1]);
  updateStatsUI(); updateInventoryUI();
  var box = document.getElementById('choices');
  box.innerHTML = '';
  cfg.choices.forEach(function(c){
    if(c.when && !c.when()) return;
    box.appendChild(makeChoiceButton(c));
  });
}

function animateDiceRoll(finalD1, finalD2, onComplete){
  var d1el = document.getElementById('die1');
  var d2el = document.getElementById('die2');
  d1el.classList.add('rolling');
  d2el.classList.add('rolling');
  var ticks = 0, maxTicks = 14, landAt = maxTicks - 4, d1Landed = false;
  var timer = setInterval(function(){
    ticks++;
    /* 먼저 멈춘 주사위는 다시 굴리지 않는다 — 안 그러면 눈과 결과가 어긋난다 */
    if(!d1Landed) d1el.textContent = DICE_FACES[Math.floor(Math.random()*6)];
    d2el.textContent = DICE_FACES[Math.floor(Math.random()*6)];
    if(ticks === landAt){ d1Landed = true; d1el.classList.remove('rolling'); d1el.textContent = DICE_FACES[finalD1-1]; d1el.classList.add('landed'); }
    if(ticks >= maxTicks){
      clearInterval(timer);
      d2el.classList.remove('rolling');
      d2el.textContent = DICE_FACES[finalD2-1];
      d2el.classList.add('landed');
      setTimeout(function(){
        d1el.classList.remove('landed');
        d2el.classList.remove('landed');
        onComplete();
      }, 180);
    }
  }, 55);
}

function renderMods(mods, target){
  var box = document.getElementById('dice-mods');
  box.innerHTML = '';
  (mods||[]).forEach(function(m){
    if(!m.value) return;
    var chip = document.createElement('span');
    chip.className = 'mod ' + (m.value > 0 ? 'plus' : 'minus');
    chip.textContent = m.label + ' ' + (m.value > 0 ? '+' : '') + m.value;
    box.appendChild(chip);
  });
  if(!box.children.length){
    var none = document.createElement('span');
    none.className = 'mod';
    none.textContent = '보정 없음';
    box.appendChild(none);
  }
  var total = sumMods(mods);
  document.getElementById('dice-info').textContent =
    '주사위 2개 + 보정 ' + (total >= 0 ? '+' : '') + total + '  →  목표 ' + target + ' 이상';
}

function shakePanel(){
  var panel = document.querySelector('.event-panel');
  if(!panel) return;
  panel.classList.remove('hit');
  void panel.offsetWidth;
  panel.classList.add('hit');
}

/* 모든 판정이 지나가는 한 곳 */
function showRollStep(cfg){
  openEncounter(cfg.title, cfg.text, cfg.place, cfg.art);
  if(cfg.track) showTrack(cfg.track[0], cfg.track[1]);
  updateStatsUI(); updateInventoryUI();

  var mods = (cfg.mods || []).concat(cfg.extra || []);
  var bonus = sumMods(mods);

  var diceArea = document.getElementById('dice-area');
  diceArea.hidden = false;
  document.getElementById('die1').textContent = DICE_FACES[0];
  document.getElementById('die2').textContent = DICE_FACES[0];
  renderMods(mods, cfg.target);

  var resultLine = document.getElementById('dice-result-line');
  resultLine.hidden = true;
  resultLine.textContent = '';

  var box = document.getElementById('choices');
  box.innerHTML = '';

  (cfg.altChoices || []).forEach(function(c){
    if(c.when && !c.when()) return;
    box.appendChild(makeChoiceButton(c));
  });

  var rollBtn = document.createElement('button');
  rollBtn.className = 'choice-btn roll-btn';
  rollBtn.textContent = cfg.rollLabel || '주사위를 굴린다';
  rollBtn.addEventListener('click', function(){
    box.innerHTML = '';
    var a = d6(), b = d6();
    animateDiceRoll(a, b, function(){
      var total = a + b + bonus;
      var success = total >= cfg.target;
      resultLine.hidden = false;
      resultLine.textContent = a + ' + ' + b +
        (bonus ? (bonus > 0 ? ' + ' + bonus : ' − ' + Math.abs(bonus)) : '') +
        ' = ' + total + '  /  목표 ' + cfg.target + '  —  ' + (success ? '성공' : '실패');
      resultLine.className = 'dice-result ' + (success ? 'success' : 'fail');
      if(!success) shakePanel();
      cfg.onResolve(success, total);
    });
  });
  box.appendChild(rollBtn);
}

function showDiceEncounter(cfg){
  var mods = cfg.mods;
  if(!mods){
    mods = [];
    if(cfg.bonus) mods.push({ label:'보정', value:cfg.bonus });
  }
  showRollStep({
    title:cfg.title, text:cfg.text, place:cfg.place, art:cfg.art, target:cfg.target,
    mods:mods, extra:cfg.extra, rollLabel:cfg.rollLabel, altChoices:cfg.altChoices,
    onResolve:function(success, total){
      var outcome = success ? cfg.onSuccess(total) : cfg.onFail(total);
      updateStatsUI(); updateInventoryUI();
      showContinueWithText(outcome.text, outcome.next, outcome.doc);
    }
  });
}

/* =========================================================
   추격 — 싸우는 것이 아니라 벗어나는 것
   ========================================================= */

var CAUGHT_LINES = [
  '따라잡혔습니다. 팔이 붙잡히고, 뿌리치는 데 대가를 치릅니다.',
  '발이 걸려 넘어집니다. 일어서는 사이에 거리가 사라집니다.',
  '막다른 벽입니다. 되돌아 나오는 길밖에 없고, 그 길에는 그들이 있습니다.'
];
var ESCAPE_LINES = [
  '숨을 죽인 채 지나갑니다. 등불이 옆을 스치고, 멀어집니다.',
  '담을 넘어 골목으로 빠집니다. 발소리가 엉뚱한 방향으로 흩어집니다.',
  '한참을 웅크리고 있다가, 아무 소리도 나지 않게 되었을 때 일어섭니다.'
];

function startChase(nextFn, opts){
  opts = opts || {};
  var foe = opts.foe || PURSUERS.cult;
  var c = {
    foe:foe, stage:1, stages:opts.stages || 2,
    nextFn:nextFn, skillUsed:false,
    title:opts.title || LOC[state.location].name,
    place:opts.place || LOC[state.location].place,
    art:opts.art,
    onEscape:opts.onEscape || null,
    caught:0
  };
  chaseStage(c, opts.text || foe.desc);
}

function chaseLine(c){
  return c.foe.name + '   ·   남은 거리 ' + (c.stages - c.stage + 1);
}

function chaseStage(c, lead){
  var choices = [];

  choices.push({ label:'몸을 숨긴다', note:'관찰 판정 · 목표 6', onPick:function(){
      chaseRoll(c, { target:6, mods:obsMods(), flavor:'그늘을 찾아 몸을 접어 넣습니다.', rollLabel:'숨을 죽인다' });
      return null;
  } });

  choices.push({ label:'달린다', note:'담력 판정 · 목표 7', onPick:function(){
      chaseRoll(c, { target:7, mods:nerveMods(), flavor:'뒤돌아보지 않고 내달립니다.', rollLabel:'달린다' });
      return null;
  } });

  if(!c.skillUsed){
    choices.push({ label:state.char.skillLabel, note:state.char.skillNote, onPick:function(){
        c.skillUsed = true;
        if(state.charId === 'reporter'){
          c.stage += 1;
          if(c.stage > c.stages) return finishChase(c, '섬광이 터지고, 그 틈에 모퉁이를 돕니다. 뒤에서 아무 소리도 따라오지 않습니다.');
          chaseStage(c, '섬광이 터집니다. 눈이 먼 사이 한 구간을 통째로 벌었습니다.');
          return null;
        }
        if(state.charId === 'doctor'){
          applyEffect({ health:3 });
          chaseStage(c, '벽에 등을 붙이고 숨을 고릅니다. 손이 기억하는 대로 상처를 싸맵니다. (체력 +3)');
          return null;
        }
        c.sailorBoost = true;
        chaseRoll(c, { target:7, mods:nerveMods(), extra:[{ label:'험한 길', value:3 }],
                       flavor:'배에서 익힌 걸음으로, 아무도 안 쓰는 길을 골라 넘어갑니다.', rollLabel:'넘어간다' });
        return null;
    } });
  }

  if(hasItem('gun') && state.ammo > 0){
    choices.push({ label:'허공에 한 발 쏜다', note:'남은 탄 ' + state.ammo + ' · 추격 즉시 중단 · 주시 +2', onPick:function(){
        state.ammo -= 1;
        applyEffect({ watch:2 });
        return { text:'총성이 골목을 때립니다. 따라오던 발들이 일제히 멈춥니다.' + BR +
                      '그들은 물러났습니다. 다만 이제 이 마을에서 총을 가진 사람이 누구인지 모두가 압니다.', next:c.nextFn };
    } });
  }

  showChoiceEncounter({
    title:c.title, place:c.place, art:c.art,
    text:lead + BR + chaseLine(c),
    track:[c.stages, c.stage],
    choices:choices
  });
}

function chaseRoll(c, cfg){
  showRollStep({
    title:c.title, place:c.place, art:c.art,
    text:cfg.flavor + BR + chaseLine(c),
    target:cfg.target, mods:cfg.mods, extra:cfg.extra,
    rollLabel:cfg.rollLabel,
    track:[c.stages, c.stage],
    onResolve:function(success){
      if(success){
        c.stage += 1;
        if(c.stage > c.stages) return finishChase(c, pickOne(ESCAPE_LINES));
        return chaseStage(c, '한 구간을 벌었습니다. 아직 끝난 것은 아닙니다.');
      }
      caught(c);
    }
  });
}

function caught(c){
  var dmg = rollSmall(c.foe.dmg);
  if(c.caught === 0) dmg = Math.max(1, dmg - 1);   /* 첫 번째는 경고에 가깝다 */
  if(hasItem('cross')) dmg = Math.max(1, dmg - 1);
  var sanLoss = (c.foe.dread && Math.random() < 0.6) ? 1 : 0;
  applyEffect({ health:-dmg, sanity:-sanLoss });
  shakePanel();
  c.caught += 1;

  var msg = pickOne(CAUGHT_LINES) + BR + '체력 −' + dmg +
    (hasItem('cross') ? ' (십자가가 한 점 덜어냈다)' : '') +
    (sanLoss ? ' · 정신력 −' + sanLoss : '');

  if(state.health <= 0) return showContinueWithText(msg, function(){ endGame('death'); });
  if(state.sanity <= 0) return showContinueWithText(msg, function(){ handleZeroSanity(c.nextFn); });

  if(c.caught >= 2){
    return showContinueWithText(msg + BR + '더는 버틸 수 없습니다. 그들이 당신을 마을 밖 길가에 내려놓고 돌아갑니다. 경고였습니다.',
      function(){ state.location = 'harbor'; c.nextFn(); });
  }
  showContinueWithText(msg, function(){ chaseStage(c, '간신히 몸을 빼냈습니다. 아직 따라옵니다.'); });
}

function finishChase(c, text){
  if(state.watch > 0){
    applyEffect({ watch:-1 });
    text += BR + '완전히 따돌렸습니다. 당신이 어디로 갔는지 아는 사람이 줄었습니다. (주시 −1)';
  }
  if(c.onEscape){
    var extra = c.onEscape();
    if(extra) text += BR + extra;
  }
  showContinueWithText(text, c.nextFn);
}
