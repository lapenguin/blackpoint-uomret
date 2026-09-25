/* 심연의 일지 — 장면 — 대본(js/story.js)을 화면으로 옮긴다.
   장면의 글·조건·효과는 story/*.txt 에 있고, 여기는 그것을 해석만 한다.
   쓰는 법은 story/README.md. */
"use strict";

/* =========================================================
   대본 → 장소별 장면 목록, 지도 힌트
   ========================================================= */

var SCENE_BY_ID = {};
var SCENES = {};
var LEAD_HINTS = {};

STORY.forEach(function(sc){
  SCENE_BY_ID[sc.id] = sc;
  if(sc.hint) LEAD_HINTS[sc.id] = sc.hint;
  if(sc.sub) return;                       /* 하위장면은 다른 장면에서만 부른다 */
  (SCENES[sc.loc] = SCENES[sc.loc] || []).push({
    id:sc.id, repeat:!!sc.rep, quiet:!!sc.quiet,
    when:sc.when ? function(){ return storyTest(sc.when); } : null,
    run:function(){ return runStoryScene(sc); }
  });
});

/* =========================================================
   조건
   ========================================================= */

function storyTerm(t){
  switch(t.k){
    case 'clue':   return hasClue(t.a);
    case 'item':   return hasItem(t.a);
    case 'flag':   return !!state.flags[t.a];
    case 'seen':   return !!state.seen[t.a];
    case 'night':  return isNight();
    case 'day':    return !isNight();
    case 'ritual': return ritualReady();
    case 'ready':  return bearers().some(function(b){ return b.ready && b.id !== 'self'; });
    case 'char':   return state.charId === t.a;
    case 'chance': return Math.random() < t.n / 100;
    case 'else':   return true;
    case 'cmp':
      var v = t.v === 'day' ? state.day : (t.v === 'watch' ? state.watch : state.ammo);
      var n = t.n === 'LAST' ? LAST_DAY : t.n;
      if(t.op === '>=') return v >= n;
      if(t.op === '<=') return v <= n;
      if(t.op === '>')  return v > n;
      if(t.op === '<')  return v < n;
      return v === n;
  }
  return false;
}

function storyTest(terms){
  if(!terms) return true;
  for(var i=0;i<terms.length;i++){
    var r = storyTerm(terms[i]);
    if(terms[i].not) r = !r;
    if(!r) return false;
  }
  return true;
}

/* =========================================================
   수치와 효과 — 조건은 모두 "고른 순간"의 상태로 먼저 판단하고, 그다음에 적용한다
   ========================================================= */

function storyValue(v, vars){
  var sum = 0, rolled = false;
  v.t.forEach(function(x){
    if(typeof x === 'number') sum += x;
    else if(x === 'heal') sum += (state.char.heal || 0);
    else { sum += rollSmall(parseInt(x.slice(1), 10)); rolled = true; }
  });
  if(rolled && vars) vars.roll = sum;
  return v.s * sum;
}

function storyActive(fx){
  var out = [];
  (fx || []).forEach(function(line){ if(!line.c || storyTest(line.c)) out.push(line.e); });
  return out;
}

function storyCommit(active, vars){
  var d = { sanity:0, health:0, sanityMax:0, watch:0, ammo:0 };
  var items = [], drops = [], flags = [], clues = [];
  active.forEach(function(list){ list.forEach(function(x){
    if(x.k === 'clue') clues.push(x.a === '@비밀' ? state.char.secret : x.a);
    else if(x.k === 'item') items.push(x.a);
    else if(x.k === 'drop') drops.push(x.a);
    else if(x.k === 'flag') flags.push(x.a);
    else d[x.k] += storyValue(x.v, vars);
  }); });
  applyEffect({ sanity:d.sanity, health:d.health, sanityMax:d.sanityMax, watch:d.watch });
  items.forEach(addItem);
  drops.forEach(removeItem);
  flags.forEach(function(f){ state.flags[f] = true; });
  clues.forEach(gainClue);
  if(d.ammo) state.ammo = Math.max(0, state.ammo + d.ammo);
}

/* =========================================================
   글 — [조건] 문단, {만약 …}, {부름} 같은 자리 채우기
   ========================================================= */

function storyPrepare(paras){
  var out = [];
  (paras || []).forEach(function(p){
    if(p.c && !storyTest(p.c)) return;
    var parts = [];
    p.s.forEach(function(s){
      if(typeof s === 'string') parts.push(s);
      else if(s.c){ if(storyTest(s.c)) parts.push(s.t); else if(s.e != null) parts.push(s.e); }
      else parts.push(s);                  /* {부름}·{굴림} 등은 효과를 적용한 뒤에 채운다 */
    });
    out.push(parts);
  });
  return out;
}

function storyFill(prepared, vars){
  return prepared.map(function(parts){
    return parts.map(function(s){
      if(typeof s === 'string') return s;
      if(s.x) return String(storyValue(s.x));
      if(s.v === '부름')     return state.char.called;
      if(s.v === '재회')     return state.char.meetCarter;
      if(s.v === '비밀단서') return CLUES[state.char.secret].text;
      if(s.v === '꿈')       return pickDream();
      if(s.v === '굴림')     return (vars && vars.roll != null) ? String(vars.roll) : '';
      return '';
    }).join('');
  }).filter(function(p){ return p !== ''; }).join(BR);
}

function storyText(paras, vars){ return storyFill(storyPrepare(paras), vars); }

/* =========================================================
   결과 — 선택지·성공·실패·탈출 하나를 처리한다
   ========================================================= */

function storyNext(n){
  if(!n) return afterScene;
  if(n.t === 'chase') return function(){ startChase(afterScene, { foe:PURSUERS[n.foe], title:n.title }); };
  if(n.t === 'scene') return function(){ runStoryScene(SCENE_BY_ID[n.id]); };
  return afterScene;
}

function storyResolve(o){
  var picked = o, fx = o.fx || [], logs = o.log || [];
  if(o.br){
    for(var i=0;i<o.br.length;i++){
      if(storyTest(o.br[i].c)){ picked = o.br[i].o; break; }
    }
    fx = fx.concat(picked.fx || []);
    logs = logs.concat(picked.log || []);
  }
  var active = storyActive(fx);
  var prepared = storyPrepare(picked.text);
  var vars = {};
  var before = statSnapshot();
  storyCommit(active, vars);
  logs.forEach(logLine);
  var text = storyFill(prepared, vars);   /* {꿈} 도 수치를 바꿀 수 있어 채운 뒤에 비교한다 */
  return {
    hasText:!!picked.text,
    text:withStatDelta(text, before),
    next:storyNext(picked.next || o.next),
    doc:picked.doc || o.doc || null
  };
}

function statSnapshot(){
  return { sanity:state.sanity, health:state.health, watch:state.watch, ammo:state.ammo, sanityMax:state.sanityMax };
}
var STAT_NAMES = [['sanity','정신력'], ['health','체력'], ['sanityMax','정신력 최대치'], ['watch','주시'], ['ammo','탄약']];
function withStatDelta(text, before){
  if(!text) return text;
  if(/\((정신력|체력)/.test(text)) return text;   /* 대본이 이미 적어 둔 경우 */
  var parts = [];
  STAT_NAMES.forEach(function(p){
    var d = state[p[0]] - before[p[0]];
    if(d) parts.push(p[1] + ' ' + (d > 0 ? '+' : '−') + Math.abs(d));
  });
  return parts.length ? text + BR + '(' + parts.join(' · ') + ')' : text;
}

/* 이곳에 가면 지금 무엇이 나오는가 — 지도 안내가 실제와 어긋나지 않게 */
function pendingScene(loc){
  var list = SCENES[loc] || [];
  for(var i=0;i<list.length;i++){
    var sc = list[i];
    if(!sc.repeat && state.seen[sc.id]) continue;
    if(sc.when && !sc.when()) continue;
    return sc;
  }
  return null;
}
function canRestAt(loc){ var sc = pendingScene(loc); return !!(sc && sc.quiet); }

function storyOutcome(o){
  var r = storyResolve(o);
  if(!r.hasText){ r.next(); return null; }   /* 결과 글 없이 곧바로 다음 장면 */
  return r;
}

function storyPlace(sc){ return sc.place || LOC[sc.loc].place; }

function runStoryScene(sc){
  var text = storyText(sc.text);

  if(sc.kind === 'beat'){
    return showNarrativeBeat(sc.title, text, function(){
      storyCommit(storyActive(sc.fx), {});
      (sc.log || []).forEach(logLine);
      afterScene();
    }, { place:storyPlace(sc), art:sc.art, doc:sc.doc });
  }

  if(sc.kind === 'chase'){
    return startChase(afterScene, {
      foe:PURSUERS[sc.foe], title:sc.title, place:storyPlace(sc), art:sc.art,
      text:text || undefined,
      onEscape:sc.esc ? function(){
        if(sc.esc.when && !storyTest(sc.esc.when)) return null;
        return storyResolve(sc.esc).text || null;
      } : null
    });
  }

  if(sc.kind === 'dice'){
    var extra = [], retry = false;
    (sc.mods || []).forEach(function(m){
      if(m.retry){ retry = true; extra = extra.concat(retryMod(sc.id)); return; }
      if(!m.c || storyTest(m.c)) extra.push({ label:m.label, value:m.v });
    });
    return showDiceEncounter({
      title:sc.title, place:storyPlace(sc), art:sc.art, text:text,
      target:sc.target, mods:obsMods(), extra:extra,
      onSuccess:function(){ return storyResolve(sc.ok); },
      onFail:function(){ if(retry) noteFail(sc.id); return storyResolve(sc.ng); }
    });
  }

  showChoiceEncounter({
    title:sc.title, place:storyPlace(sc), art:sc.art, text:text, doc:sc.doc,
    choices:sc.choices.map(function(ch){
      return {
        label:ch.label, weighty:!!ch.weighty,
        note:ch.note ? storyText([{ s:ch.note }]) : undefined,
        when:ch.when ? function(){ return storyTest(ch.when); } : null,
        onPick:function(){ return storyOutcome(ch.out); }
      };
    })
  });
}

/* =========================================================
   장소 방문
   ========================================================= */

function visitLocation(id){
  if(!canReach(id)){
    if(id === 'altar' && ADJ[state.location].indexOf('altar') !== -1){
      return showNarrativeBeat('길을 찾을 수 없다',
        '안개가 너무 짙습니다. 숲 안쪽으로 몇 걸음 들어가 보지만, 어느 방향으로 가도 같은 자리로 돌아옵니다.' + BR +
        '길을 아는 사람들은 무언가를 보고 따라갑니다. 그 표식을 먼저 찾아야 합니다.',
        renderMap);
    }
    return showNarrativeBeat('그쪽으로는 갈 수 없다',
      LOC[id].name + '은(는) 여기서 바로 갈 수 없습니다. 길로 이어진 곳을 거쳐 가야 합니다.',
      renderMap);
  }

  state.travelLine = composeTravel(state.location, id);
  state.location = id;
  state.steps += 1;
  routeLocation(id);
}

function routeLocation(id){
  var list = SCENES[id] || [];
  for(var i=0;i<list.length;i++){
    var sc = list[i];
    if(!sc.repeat && state.seen[sc.id]) continue;
    if(sc.when && !sc.when()) continue;
    if(!sc.repeat) state.seen[sc.id] = true;
    return sc.run();
  }
  genericInvestigate(id);
}
