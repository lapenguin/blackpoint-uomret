/* 심연의 일지 — 시간 — 턴 진행, 추론, 젖은 발자국, 재방문 */
"use strict";

/* =========================================================
   비트 큐 · 추론 · 젖은 발자국 · 턴 진행
   ========================================================= */

function queueBeat(title, text, opts){ beatQueue.push({ title:title, text:text, opts:opts||{} }); }

function runBeats(done){
  if(beatQueue.length === 0) return done();
  var b = beatQueue.shift();
  showNarrativeBeat(b.title, b.text, function(){ runBeats(done); }, b.opts);
}

function checkDeductions(){
  DEDUCTIONS.forEach(function(d){
    if(state.seen[d.id]) return;
    if(d.gives && hasClue(d.gives)) return;   /* 이미 아는 것을 또 깨닫지는 않는다 */
    if(!d.need.every(hasClue)) return;
    state.seen[d.id] = true;
    if(d.gives) gainClue(d.gives);
    if(d.flag) state.flags[d.flag] = true;
    var suffix = d.gives ? (BR + '— 핵심 단서 확보: ' + CLUES[d.gives].title + ' (' + CLUES[d.gives].key + ')') : '';
    queueBeat('연결 — ' + d.title, d.text + suffix);
    logLine('연결: ' + d.title);
  });
}

/* --- 젖은 발자국: 세 번에 걸쳐, 조금씩 가까이 --- */
var INDOORS = ['inn','manor','school','chapel','office'];

function checkFootprints(){
  var inside = INDOORS.indexOf(state.location) !== -1;

  if(!state.flags.mary1 && state.day >= 3 && inside && hasClue('flyer')){
    state.flags.mary1 = true;
    logLine('젖은 발자국을 처음 보았다.');
    return queueBeat('젖은 발자국 · 첫 번째',
      '바닥에 젖은 발자국이 있습니다. 작습니다. 아이의 것입니다.' + BR +
      '밖에서 안으로 들어온 방향인데, 다시 나간 자국이 없습니다.' + BR +
      '비는 사흘째 오지 않았습니다.');
  }

  if(state.flags.mary1 && !state.flags.mary2 && isNight() && hasClue('ledger')){
    state.flags.mary2 = true;
    logLine('두 번째로, 더 가까이.');
    return queueBeat('젖은 발자국 · 두 번째',
      '등 뒤에서 물이 떨어지는 소리가 납니다. 규칙적입니다.' + BR +
      '돌아보았을 때 아무도 없었고, 다만 방금까지 누군가 서 있었던 것처럼 바닥 한 자리가 젖어 있었습니다.' + BR +
      '그 자리는 당신이 조금 전까지 등을 대고 있던 벽 바로 앞이었습니다.');
  }

  if(state.flags.mary2 && !state.flags.mary3 && hasItem('flower') &&
     (state.location === 'well' || state.location === 'manor' || state.location === 'forest')){
    state.flags.mary3 = true;
    logLine('메리 휘트필드와 마주 섰다.');
    var t = '마침내 마주쳤습니다.' + BR +
      '열한 살쯤 된 소녀였습니다. 머리끝부터 발끝까지 물에 젖어 있었고, 옷은 팔십 년 전 것이었습니다. 물이 계속 떨어지는데 바닥에 고이지는 않았습니다.' + BR +
      '주머니의 마른 꽃을 알아본 듯, 그 아이가 한 걸음 다가섭니다.' + BR +
      '메리 휘트필드는 말을 하지 못했습니다. 턱이 움직이지 않았습니다. 대신 팔을 들어 한 방향을 가리켰습니다.' + BR +
      '숲 너머, 절벽 위. 제단이었습니다.';
    if(state.charId === 'sailor'){
      t += BR + '그녀가 당신을 보았을 때, 가리키던 팔이 잠깐 흔들렸습니다. 그녀는 당신을 알아보았습니다. 정확히는, 당신이 한 일을 알아보았습니다.';
    }
    applyEffect({ sanity:-2, clue:'marydrown' });
    return queueBeat('젖은 발자국 · 세 번째', t, { art:'npc-mary' });
  }
}

function timedBeats(){
  if(!state.seen['act2'] && state.day >= 5){
    state.seen['act2'] = true;
    queueBeat('창문마다 널빤지',
      '사람들이 마을을 떠나기 시작했습니다. 짐수레가 새벽에 빠져나갔고, 남은 집들은 창문에 널빤지를 댔습니다.' + BR +
      '밤이 되면 거리에 아무도 없습니다. 개조차 짖지 않습니다.');
  }
  if(!state.seen['act3'] && state.day >= 9){
    state.seen['act3'] = true;
    var t = '하늘이 낮에도 붉게 물듭니다. 남은 사람은 몇 되지 않습니다.' + BR +
      '바닷물이 평소보다 한참 뒤로 물러나 있고, 드러난 갯벌에서 본 적 없는 것들이 말라가고 있습니다.';
    if(state.flags.carterMet) t += BR + '골목 끝에서 낯익은 실루엣이 스쳐 지나간 듯해 돌아보지만, 아무도 없습니다.';
    queueBeat('사흘 남은 마을', t);
  }
  if(!state.seen['eve'] && state.day === LAST_DAY){
    state.seen['eve'] = true;
    var e = '오늘이 그믐입니다. 정오가 지나자 바닷물이 눈에 띄게 물러갑니다.';
    if(ritualReady()){
      var ready = bearers().filter(function(b){ return b.ready && b.id !== 'self'; });
      e += ready.length
        ? BR + '구절도, 때도, 자격도 압니다. 그리고 갈 수 있는 사람이 있습니다. 해가 지기 전에 제단에 닿아야 합니다.'
        : BR + '구절도, 때도, 자격도 압니다. 다만 갈 수 있는 사람을 아직 만들지 못했습니다.';
    } else {
      e += BR + '아직 모르는 것이 있습니다. 그래도 밤은 옵니다.';
    }
    queueBeat('그믐날', e);
  }
}

function placeLead(){
  state.leadAt = {};
  Object.keys(SCENES).forEach(function(loc){
    var list = SCENES[loc];
    for(var i=0;i<list.length;i++){
      var sc = list[i];
      if(sc.quiet) continue;
      if(!sc.repeat && state.seen[sc.id]) continue;
      if(sc.when && !sc.when()) continue;
      var h = LEAD_HINTS[sc.id] || { tag:'lore', text:LOC[loc].name };
      state.leadAt[loc] = { id:sc.id, tag:h.tag, text:h.text, until:h.until };
      return;
    }
  });
}

/* 정신력이 바닥나도 한 번은 돌아올 기회가 있다. 두 번은 없다. */
function handleZeroSanity(after){
  if(state.flags.breakdownUsed) return endGame('madness');
  state.flags.breakdownUsed = true;
  state.sanity = Math.max(2, Math.ceil(state.sanityMax/3));
  state.health = Math.max(1, state.health - 1);
  state.location = 'harbor';
  state.watch = Math.max(0, state.watch - 1);
  logLine('한 번은 정신이 끊겼다가 돌아왔다.');
  showNarrativeBeat('끊긴 자리',
    '어느 순간부터의 기억이 없습니다.' + BR +
    '정신을 차려 보니 부두의 밧줄 더미 위입니다. 옷은 젖었고, 손바닥이 까져 있습니다. 누가 여기까지 데려다 놓았는지, 스스로 걸어왔는지 알 수 없습니다.' + BR +
    '다음에 이런 일이 또 생긴다면, 그때는 돌아오지 못할 것입니다.',
    after);
}

function endTurn(){
  if(state.health <= 0) return endGame('death');
  if(state.sanity <= 0) return handleZeroSanity(advanceTime);
  advanceTime();
}

function advanceTime(){
  state.phase += 1;
  if(state.phase > 1){ state.phase = 0; state.day += 1; }

  /* 그믐밤 — 마지막 낮에 얻은 것도 맞춰 본 뒤에 제단으로 간다 */
  if(state.day > LAST_DAY || (state.day === LAST_DAY && state.phase === 1)){
    checkDeductions();
    checkFootprints();
    return runBeats(finale);
  }

  /* 밤샘의 대가 — 지붕 아래라면 덜하다 */
  if(isNight() && !state.flags.restedTonight && state.location !== 'inn' && state.location !== 'harbor'){
    if(Math.random() < 0.2) applyEffect({ sanity:-1 });
  }
  state.flags.restedTonight = false;

  /* 주시는 하루에 하나씩 확실히 가라앉는다 */
  if(state.phase === 0 && state.watch > 0) state.watch -= 1;

  checkDeductions();
  checkFootprints();
  timedBeats();
  placeLead();

  var chased = nightPressure();
  runBeats(function(){
    if(chased){
      return startChase(function(){ renderMap(); }, {
        foe:chased,
        title:LOC[state.location].name + ' · 밤',
        text:'등 뒤에서 발소리가 따라붙습니다. 돌아보자, 이미 거리를 좁힌 뒤입니다.'
      });
    }
    renderMap();
  });
}

function nightPressure(){
  if(!isNight()) return null;
  /* 여관과 부두는 밤에도 안전하다 */
  if(state.location === 'inn' || state.location === 'harbor') return null;
  /* 이틀 연속으로는 쫓기지 않는다 */
  if(state.lastChaseDay && state.day - state.lastChaseDay < 2) return null;
  var chance = 0.05 + state.watch * 0.06;
  if(Math.random() > chance) return null;
  state.lastChaseDay = state.day;
  if(state.watch >= 4) return PURSUERS.towns;
  if(state.location === 'wharf' || state.location === 'cave' || state.location === 'harbor') return PURSUERS.gilman;
  return PURSUERS.cult;
}

function afterScene(){ endTurn(); }

/* =========================================================
   재방문 — 성과는 작지만 헛되지는 않게
   ========================================================= */

var INVESTIGATE_SETUP = [
  '을(를) 다시 살피며 놓친 것이 없는지 확인합니다.',
  ' 구석구석을 되짚어 봅니다.',
  '에서 사람들의 눈치를 살피며 조용히 캐묻습니다.',
  '에서 처음 지나쳤던 것들을 다시 봅니다.',
  '을(를) 한 번 더 훑어봅니다.'
];
var INVESTIGATE_FAIL = [
  '별다른 소득 없이 불안한 마음만 커집니다.',
  '건질 것은 없고 시간만 흘려보냅니다.',
  '무언가 있다는 느낌만 강해질 뿐, 손에 잡히는 것은 없습니다.',
  '이상한 낌새만 느낄 뿐, 확실한 것은 없습니다.'
];

function genericInvestigate(locId){
  var name = LOC[locId].name;
  showDiceEncounter({
    title:name, place:LOC[locId].place,
    text:name + pickOne(INVESTIGATE_SETUP),
    target:6, mods:obsMods(),
    onSuccess:function(){
      var pool = [];
      if(!hasItem('bandage')) pool.push(function(){
        addItem('bandage');
        return '약통에서 쓸 만한 붕대를 챙깁니다.';
      });
      if(!hasItem('whiskey')) pool.push(function(){
        addItem('whiskey');
        return '반쯤 남은 위스키 병을 주머니에 넣습니다.';
      });
      if(hasItem('gun') && state.ammo < 5) pool.push(function(){
        state.ammo += 2;
        return '서랍 안쪽에서 탄약 두 발을 찾아냅니다.';
      });
      pool.push(function(){
        applyEffect({ sanity:1, watch:-1 });
        return '별것 아닌 것을 확인했을 뿐인데, 마음이 조금 가라앉습니다. 한동안 당신을 보던 시선도 흥미를 잃은 듯합니다.';
      });
      return { text:pickOne(pool)(), next:afterScene };
    },
    onFail:function(){
      applyEffect({ sanity:-1 });
      return { text:pickOne(INVESTIGATE_FAIL) + ' (정신력 −1)', next:afterScene };
    }
  });
}

var DREAMS = [
  '꿈에서 당신은 물속을 걷고 있습니다. 숨이 막히지 않는 것이 이상하지 않습니다. 저 아래, 도시만 한 것이 천천히 돌아눕습니다.',
  '꿈에서 마을 사람들이 광장에 모여 있습니다. 모두 당신을 보고 웃으며 고개를 끄덕입니다. 그중에 엘든도 있습니다.',
  '꿈에서 누군가 당신의 이름을 부릅니다. 대답하려다 노래 가사가 떠올라 입을 다뭅니다. 부르는 소리는 밤새 그치지 않습니다.',
  '꿈에서 당신은 명단을 읽고 있습니다. 맨 아래 줄에 적힌 이름을 보려 할 때마다 글씨가 흐려집니다.',
  '꿈에서 우물 바닥에 서 있습니다. 위를 올려다보면 둥근 하늘이 아주 작고, 그 가장자리에 사람들이 둘러서서 내려다보고 있습니다. 아무도 손을 내밀지 않습니다.'
];
function pickDream(){
  var d = pickOne(DREAMS);
  if(Math.random() < 0.45) applyEffect({ sanity:-1 });
  return d;
}
