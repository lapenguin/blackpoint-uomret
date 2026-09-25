/* 심연의 일지 — 그믐밤과 결말, 그리고 시작 (마지막에 불러야 한다) */
"use strict";

/* =========================================================
   그믐밤 — 남은 질문은 하나뿐이다
   ========================================================= */

function finaleIntro(){
  var t = '해가 지자 바다가 눈에 띄게 물러갑니다. 드러난 갯바닥을 따라 등불이 줄지어 숲 쪽으로 올라갑니다.' + BR;
  t += state.flags.silasPromise
    ? '등대는 어둡습니다. 사일러스는 약속을 지켰습니다. 그런데도 행렬은 멈추지 않습니다. 불빛 없이도 그들은 길을 압니다.'
    : '등대에 불이 켜집니다. 바다가 아니라 육지를 향한 불입니다.';
  t += BR + '절벽 위에 두건을 쓴 이들이 늘어서 있습니다. 처음 동굴에서 본 것보다 훨씬 많습니다. 그들이 한목소리로 같은 구절을 반복합니다.' + BR +
       '"잠든 것은 죽은 것이 아니며, 깨어남은 끝이 아니라 시작이니."' + BR +
       '저 물살 아래, 오랫동안 웅크리고 있던 것이 천천히 눈을 떴습니다. 파도가 거꾸로 밀려나가고, 별들이 잘못된 자리에서 빛나기 시작합니다.';
  if(state.flags.carterMet){
    t += BR + '행렬 맨 앞에 엘든이 서 있습니다. 당신을 알아본 그가 한 걸음 옆으로 비켜섭니다.';
  }
  return t;
}

function finale(){
  document.body.classList.add('is-final');
  state.flags.finaleReached = true;
  state.location = 'altar';   /* 어디 있었든 그믐밤은 제단에서 — 장면 그림도 제단으로 */

  var intro = finaleIntro();
  if(ritualReady()){
    intro += BR + '손에는 찢겨나간 페이지가 있습니다. 구절도 외웠습니다. 의식을 시작할 수는 있습니다.' + BR +
      '다만 그것은 값을 요구합니다. 그리고 이제 당신은 그 값이 무엇인지 압니다.' + BR +
      '남은 질문은 하나입니다. 누가 치를 것인가.';
  } else if(hasItem('page')){
    intro += BR + '손에는 찢겨나간 페이지가 있습니다. 구절은 압니다. 다만 그것으로 충분한지는 모릅니다.';
  } else {
    intro += BR + '손에 든 것이 없습니다. 무엇을 해야 하는지 끝내 알아내지 못했습니다.';
  }

  showNarrativeBeat('그믐밤', intro, finaleChoices, { place:'제단 · 마지막 밤', label:'제단으로' });
}

function finaleChoices(){
  var choices = [];

  if(ritualReady()){
    if(marthaReady()){
      choices.push({ label:'마사를 부른다', note:'관리자의 피 · 그녀는 이미 알고 있다', onPick:function(){
          runBearer('martha');
          return null;
      } });
    }
    if(maryReady() && !state.flags.sparedMary){
      choices.push({ label:'메리에게 묻는다', note:'열한 살에는 아무도 묻지 않았다', weighty:true, onPick:function(){
          askMary();
          return null;
      } });
    }
    if(carterReady() && !state.flags.sparedMary){
      choices.push({ label:'엘든의 이름을 부른다', note:'자격은 없다 · 메리가 옆에 서야 한다', onPick:function(){
          askMaryForCarter();
          return null;
      } });
    }
    choices.push({ label:'내가 걸어 들어간다', note:selfBacked() ? '자격은 없다 · 뒤를 이어줄 사람이 있다' : '자격도, 뒤를 이어줄 사람도 없다', weighty:true, onPick:function(){
        runBearer('self');
        return null;
    } });
  } else if(hasItem('page')){
    choices.push({ label:'아는 만큼이라도 구절을 외친다', note:'무엇이 값인지 모르는 채로', onPick:function(){
        blindRitual();
        return null;
    } });
  }

  if(state.flags.boatOffer){
    choices.push({ label:'부두로 내려가 자베즈의 배를 탄다', note:'마을을 등진다', onPick:function(){
        showDiceEncounter({
          title:'마지막 배', place:'블랙포인트 선착장', art:'loc-harbor',
          text:'부두로 내려갑니다. 노인이 벌써 밧줄을 반쯤 풀어 놓고 기다리고 있습니다. "말했잖소. 기다려주지 않는다고."',
          target:6, mods:nerveMods().concat(state.flags.knowTribute ? [{ label:'배가 뜨는 때를 안다', value:1 }] : []),
          onSuccess:function(){ return { text:'뛰어올라 배에 오릅니다.', next:function(){ endGame('boat'); } }; },
          onFail:function(){
            applyEffect({ health:-3 });
            if(state.health <= 0) return { text:'발이 미끄러집니다. 물에 빠진 순간, 아래에서 무언가가 발목을 잡습니다.', next:function(){ endGame('death'); } };
            return { text:'겨우 뱃전에 매달려 끌려 올라갑니다. 노인이 당신을 끌어올리며 한 번도 뒤를 돌아보지 않습니다.', next:function(){ endGame('boat'); } };
          }
        });
        return null;
    } });
  }

  if(state.flags.cultOffer){
    choices.push({ label:'두건을 쓰고 원 안에 선다', note:'맞이하는 쪽은 잡아먹히지 않는다', weighty:true, onPick:function(){
        return { text:'주머니의 천을 꺼내 머리에 씁니다. 소금기에 절어 뻣뻣합니다. 원이 조용히 벌어져 자리를 내줍니다.', next:function(){ endGame('joined'); } };
    } });
  }

  choices.push({ label:'물러나 도망친다', onPick:function(){
      showChoiceEncounter({
        title:'돌아보지 말 것', place:'숲길', art:'loc-forest',
        text:'등 뒤에서 무언가 당신의 이름을 부릅니다. 낯익은 목소리 같기도 합니다.',
        choices:[
          { label:'돌아보지 않는다', onPick:function(){
              return { text:'이를 악물고 뒤돌아보지 않은 채 달립니다.', next:function(){ endGame('flee'); } };
          } },
          { label:'참지 못하고 돌아본다', onPick:function(){
              applyEffect({ sanity:-3 });
              return { text:'그 순간, 보아서는 안 될 것을 보고 맙니다.', next:function(){ endGame('flee_looked'); } };
          } }
        ]
      });
      return null;
  } });

  if(state.sanity <= 2 && !state.flags.cultOffer){
    choices.push({ label:'원 안으로 걸어 들어간다', note:'더는 무섭지 않다', weighty:true, onPick:function(){
        return { text:'두건 하나가 건네집니다. 받아 쓰는 손이 떨리지 않습니다.', next:function(){ endGame('joined'); } };
    } });
  }

  showChoiceEncounter({
    title:'누가 값을 치를 것인가', place:'제단 · 마지막 밤',
    text: ritualReady()
      ? '제단 앞에 섭니다. 물이 가장 많이 빠지는 한 시간이 시작되었습니다.'
      : '제단 앞에 섭니다. 무엇이 부족한지조차 모르는 채로.',
    choices:choices
  });
}

/* --- 메리에게 묻는 일은 그 자체가 선택이다 --- */
function askMary(){
  showChoiceEncounter({
    title:'열한 살에게 묻다', place:'제단 · 마지막 밤',
    text:'젖은 소녀가 공터 가장자리에 서 있습니다. 팔십 년 동안 가리키기만 했던 팔이 지금은 내려가 있습니다.' + BR +
         '그녀도 휘트필드입니다. 계약을 맺은 피입니다. 자격이 있습니다.' + BR +
         '일라이어스는 이렇게 적었습니다. "나는 그것을 알고도 하지 못했다. 대신 남의 아이를 보냈다."' + BR +
         '지금 당신이 하려는 일이 정확히 그것입니다. 다만 이번에는 묻기라도 합니다.',
    choices:[
      { label:'그래도 묻는다', note:'팔십 년 전과 같은 선택 · 이번에는 동의를 받는다', weighty:true, onPick:function(){
          state.flags.askedMary = true;
          logLine('열한 살짜리에게 물었고, 그 아이가 고개를 끄덕였다.');
          runBearer('mary');
          return null;
      } },
      { label:'묻지 않는다', note:'다른 값을 찾는다', onPick:function(){
          state.flags.sparedMary = true;
          logLine('메리에게는 묻지 않았다.');
          return { text:'입을 열려다 그만둡니다.' + BR +
                        '그 아이가 고개를 살짝 기울입니다. 왜 묻지 않느냐고 묻는 것 같기도 하고, 고맙다는 것 같기도 합니다.' + BR +
                        '어느 쪽인지는 끝내 알 수 없을 것입니다.', next:finaleChoices };
      } }
    ]
  });
}

/* 엘든에게는 자격이 없다. 옆에 설 자격은 메리에게 있고, 그 아이에게는 물어야 한다 */
function askMaryForCarter(){
  showChoiceEncounter({
    title:'두 사람', place:'제단 · 마지막 밤',
    text:'엘든의 이름을 부르자, 그가 무리를 등지고 걸어 나옵니다.' + BR +
         '그러나 그 혼자로는 의식이 성립하지 않는다는 것을 당신도, 그도 압니다. 계약을 맺은 피가 곁에 서야 합니다.' + BR +
         '젖은 소녀가 공터 가장자리에서 두 사람을 보고 있습니다. 그녀도 휘트필드입니다.' + BR +
         '엘든과 함께 가 달라고 하려면, 먼저 그 아이에게 물어야 합니다.',
    choices:[
      { label:'메리에게 묻는다', note:'엘든 곁에 서 주겠느냐고', weighty:true, onPick:function(){
          state.flags.askedMary = true;
          logLine('열한 살짜리에게 엘든의 곁에 서 달라고 물었고, 그 아이가 고개를 끄덕였다.');
          runBearer('carter');
          return null;
      } },
      { label:'묻지 않는다', note:'다른 값을 찾는다', onPick:function(){
          state.flags.sparedMary = true;
          logLine('메리에게는 묻지 않았다.');
          return { text:'입을 열려다 그만둡니다.' + BR +
                        '엘든이 당신을 보고, 소녀를 보고, 천천히 무리 쪽으로 되돌아갑니다. "그래, 그게 맞네." 그가 말합니다.', next:finaleChoices };
      } }
    ]
  });
}

function bearerConfig(who){
  if(who === 'martha') return {
    lead:'마사의 이름을 부릅니다. 그녀는 행렬 뒤쪽에서 이미 걸어 나오고 있었습니다. 부르기를 기다린 사람의 걸음이었습니다.',
    bonus:[{ label:'관리자의 피', value:2 }], ending:'seal_martha' };
  if(who === 'mary') return {
    lead:'젖은 소녀가 당신과 제단 사이로 걸어 나옵니다. 팔십 년 만에 처음으로, 가리키는 대신 스스로 움직입니다.',
    bonus:[{ label:'관리자의 피', value:2 }, { label:'본인의 동의', value:1 }], ending:'seal_mary' };
  if(who === 'carter') return {
    lead:'젖은 소녀가 엘든의 옆에 섭니다. 마지막으로 그의 눈이 제자리로 돌아와 있습니다.' + BR +
         '"내가 하려던 게 이거였네. 그런데 자격이 없더군. 우습지."',
    bonus:[{ label:'관리자의 피', value:2 }, { label:'두 사람', value:1 }], ending:'seal_carter' };
  return {
    lead:'자격이 없다는 것은 압니다. 그래도 걸어 들어갑니다.' + (selfBacked()
          ? BR + '뒤에서 마사가 구절을 받아 외우기 시작합니다. 처음에는 떨리고, 곧 또렷해집니다.'
          : BR + '아무도 뒤에서 구절을 이어주지 않습니다.'),
    bonus: (selfBacked() ? [{ label:'마사가 뒤를 잇는다', value:2 }] : [{ label:'자격 없음', value:-1 }])
             .concat(state.flags.selfOffered ? [{ label:'명단에 스스로 이름을 올렸다', value:1 }] : []),
    ending: selfBacked() ? 'seal_self' : 'seal_self_alone' };
}

function runBearer(who){
  var cfg = bearerConfig(who);
  var options = shuffleArr(['느가 프타른 이아 크나아', '느가 프타른 이아 즈오스', '브라나 프타른 이아 크나아']);
  showChoiceEncounter({
    title:'구절을 떠올리다', place:'제단 · 마지막 밤',
    text:cfg.lead + BR + '이제 구절입니다. 목소리를 내기 직전, 한 번 더 확인합니다. 어느 쪽이었습니까?',
    choices:options.map(function(opt){
      return { label:opt, onPick:function(){
        sealRoll(who, cfg, opt === '느가 프타른 이아 크나아');
        return null;
      } };
    })
  });
}

function sealRoll(who, cfg, correct){
  var extra = Math.min(2, Math.floor(Math.max(0, clueCount() - 8) / 3));
  var mods = obsMods().concat(cfg.bonus);
  mods.push({ label: correct ? '구절이 맞다' : '구절이 틀렸다', value: correct ? 1 : -3 });
  if(extra) mods.push({ label:'모아둔 단서', value:extra });
  if(hasClue('carterfate')) mods.push({ label:'순서를 안다', value:1 });
  if(state.flags.silasPromise) mods.push({ label:'등대가 어둡다', value:1 });
  if(state.flags.knowSchism) mods.push({ label:'누가 누구인지 안다', value:1 });
  if(who === 'mary' && state.flags.knowMary) mods.push({ label:'그 아이의 이름을 안다', value:1 });

  showRollStep({
    title:'봉인 의식', place:'제단 · 마지막 밤',
    text:'물이 가장 많이 빠지는 한 시간입니다. ' + (hasClue('carterfate') ? '엘든이 말한 대로, 아래 것을 먼저 꺼내고 그다음에 구절입니다.' : '이제 구절입니다.') + BR +
         '단서 ' + clueCount() + '건이 이 순간을 받치고 있습니다.',
    target:9, mods:mods, rollLabel:'구절을 끝까지 외운다',
    onResolve:function(success){
      if(success) return showContinueWithText('마지막 음절이 하늘을 가르며 울려 퍼집니다.', function(){ endGame(cfg.ending); });
      applyEffect({ sanity:-4 });
      if(state.sanity <= 0) return showContinueWithText('구절이 목에 걸려 엉킵니다. 무언가가 그 틈으로 들어옵니다.', function(){ endGame('madness'); });
      showContinueWithText('구절이 엉키고, 아무 일도 일어나지 않습니다. 원 안의 얼굴들이 일제히 이쪽을 향합니다.', function(){
        showChoiceEncounter({
          title:'실패한 자리', place:'제단 · 마지막 밤',
          text:'의식은 성립하지 않았습니다. 값을 치르려던 사람이 아직 물가에 서 있습니다.',
          choices:[
            { label:'다시 한 번 외운다', weighty:true,
              note: state.sanity <= 2 ? '정신력 −2 · 지금 정신력으로는 끝까지 가지 못한다' : '정신력 −2 · 한 번 더 굴린다',
              onPick:function(){
                applyEffect({ sanity:-2 });
                if(state.sanity <= 0) return { text:'두 번째 시도는 끝까지 가지 못했습니다.', next:function(){ endGame('madness'); } };
                sealRoll(who, cfg, correct);
                return null;
            } },
            { label:'도망친다', onPick:function(){
                return { text:'뒤돌아 달립니다. 등 뒤에서 물소리가 크게 한 번 났습니다.', next:function(){ endGame('flee'); } };
            } }
          ]
        });
      });
    }
  });
}

function blindRitual(){
  var options = shuffleArr(['느가 프타른 이아 크나아', '느가 프타른 이아 즈오스', '브라나 프타른 이아 크나아']);
  showChoiceEncounter({
    title:'아는 만큼', place:'제단 · 마지막 밤',
    text:'무엇이 값인지 모르는 채로 구절을 외칩니다. 어느 쪽이었습니까?',
    choices:options.map(function(opt){
      return { label:opt, onPick:function(){
        var correct = (opt === '느가 프타른 이아 크나아');
        var mods = obsMods().concat([{ label: correct ? '구절이 맞다' : '구절이 틀렸다', value: correct ? 1 : -3 },
                                     { label:'값을 모른다', value:-2 }]);
        showRollStep({
          title:'값 없는 의식', place:'제단 · 마지막 밤',
          text:'구절만으로 될 일이었다면, 백 년 동안 아무도 죽지 않았을 것입니다.',
          target:9, mods:mods, rollLabel:'끝까지 외운다',
          onResolve:function(success){
            if(success) return showContinueWithText('놀랍게도, 물살이 한 박자 멈칫합니다. 오래 가지는 않을 것입니다.', function(){ endGame('seal_blind'); });
            applyEffect({ sanity:-4 });
            if(state.sanity <= 0) return showContinueWithText('아무 일도 일어나지 않았습니다. 당신 안에서만 무언가 무너졌습니다.', function(){ endGame('madness'); });
            showContinueWithText('아무 일도 일어나지 않습니다. 구절은 그저 소리였습니다.', function(){ endGame('flee'); });
          }
        });
        return null;
      } };
    })
  });
}

/* =========================================================
   결말
   ========================================================= */

function endingCoda(key){
  if(key === 'seal_self' || key === 'seal_self_alone') return state.char.selfCoda;
  if(key === 'flee' || key === 'flee_looked') return state.char.fleeLetter + '\n그 사람이 이것이 무슨 뜻이냐고 물으며, 당신에게 보내온 것이었습니다.';
  if(key === 'seal_mary' && state.flags.askedMary)
    return '일라이어스는 남의 아이를 보냈습니다. 당신은 물어보고 보냈습니다.\n그 차이가 무엇인지는, 아마 평생 생각하게 될 것입니다.';
  return '';
}

function endLog(key){
  /* '연결:' 은 진행 중의 알림이다. 끝에 남길 기록은 아니다 */
  var lines = state.log.filter(function(s){ return s.indexOf('연결: ') !== 0; });
  if(state.flags.marthaHelped) lines.push('마사는 열쇠를 내주었습니다. 그 집안이 백 년 동안 자기 손으로는 열지 못한 것이었습니다.');
  else if(state.flags.marthaFled) lines.push('마사는 마을을 떠났습니다. 관리자가 도망친 것은 백 년 만에 처음입니다.');
  else if(state.flags.marthaDefied && !state.flags.marthaMercyMary && !state.flags.marthaMercyLine)
    lines.push('마사는 끝내 당신과 눈을 마주치지 않았습니다.');
  if(state.flags.sparedMary) lines.push('그 아이에게는 묻지 않았습니다. 열한 살에게 물어서 될 일이 아니라고 생각했습니다.');
  if(state.flags.silasPromise) lines.push('그믐밤, 등대는 백 년 만에 처음으로 어두웠습니다. 사일러스는 다음 날 발견되지 않았습니다.');
  if(state.flags.carterGunTaken) lines.push('그의 총은 아직 당신에게 있습니다. 돌려줄 사람은 이제 없습니다.');
  else if(state.flags.carterMet && key !== 'seal_carter') lines.push('엘든을 그곳에 두고 온 그 밤을, 당신은 평생 잊지 못할 것입니다.');
  if(state.flags.knowCentury && key !== 'joined' && key !== 'madness') lines.push('간격이 어떻게 줄어들었는지 적어 두었습니다. 다음에 누군가 그믐을 세기 시작할 때를 위해.');
  if(state.flags.selfOffered && key !== 'seal_self' && key !== 'seal_self_alone')
    lines.push('명단의 마지막 줄에는 당신의 이름이 적혀 있었습니다. 그 줄은 끝내 쓰이지 않았습니다.');
  if(state.flags.marthaPushed && key !== 'seal_martha')
    lines.push('마사에게 그녀의 이름을 적으라 했습니다. 그녀는 펜을 내려놓았고, 다시 들지 않았습니다.');
  if(state.flags.cultOffer && !state.flags.joined) lines.push('길먼이 준 두건은 끝내 쓰지 않았습니다. 버리지도 못했습니다.');
  return lines;
}

/* 결말 전용 그림이 없을 때 대신 쓸 장소 — 결말마다 다르게 해서 반복돼 보이지 않게 */
var END_FALLBACK = {
  seal_martha:'loc-altar', seal_mary:'loc-well', seal_carter:'loc-altar',
  seal_self:'loc-altar',   seal_self_alone:'loc-cave', seal_blind:'loc-altar',
  boat:'loc-harbor',
  flee:'loc-forest',       flee_looked:'loc-forest',
  joined:'loc-cave',
  madness:'loc-well',      death:'loc-manor'
};

function endGame(key){
  clearProgress();
  if(key === 'joined') state.flags.joined = true;   /* 결말 기록이 '두건을 안 썼다'고 말하지 않게 */
  var e = ENDINGS[key] || ENDINGS.death;
  document.body.classList.remove('is-final');
  showScreen('end');
  document.getElementById('end-title').textContent = e.title;
  document.getElementById('end-char').textContent = state.char.name + ' · ' + state.char.role;
  document.getElementById('end-text').textContent = voice(e.text);
  setArt('end-art', 'end-art-img', ['end-' + key, END_FALLBACK[key] || 'loc-altar']);

  var coda = endingCoda(key);
  var codaEl = document.getElementById('end-coda');
  if(coda){ codaEl.hidden = false; codaEl.textContent = voice(coda); }
  else codaEl.hidden = true;

  document.getElementById('end-sanity').textContent = state.sanity;
  document.getElementById('end-health').textContent = state.health;
  document.getElementById('end-clues').textContent = clueCount() + '건 / 핵심 ' +
    (['phrase','timing','blood'].filter(hasClue).length) + '/3';

  var log = document.getElementById('end-log');
  log.innerHTML = '';
  var all = endLog(key);
  if(all.length === 0){
    var p0 = document.createElement('p');
    p0.textContent = '일지에 적힌 것이 거의 없습니다. 이 마을에 대해 당신이 알아낸 것은 많지 않았습니다.';
    log.appendChild(p0);
  } else {
    all.forEach(function(s){
      var p = document.createElement('p');
      p.textContent = voice(s);
      log.appendChild(p);
    });
  }
  saveBest(e.rank, e.title);
}

function saveBest(rank, title){
  try{
    var raw = localStorage.getItem('cthulhu_journal_best_v5');
    var best = raw ? JSON.parse(raw) : null;
    if(!best || rank > best.rank){
      localStorage.setItem('cthulhu_journal_best_v5', JSON.stringify({ rank:rank, title:title }));
    }
  } catch(err){ /* 저장소를 쓸 수 없으면 무시 */ }
}
function loadBest(){
  try{
    var raw = localStorage.getItem('cthulhu_journal_best_v5');
    return raw ? JSON.parse(raw) : null;
  } catch(err){ return null; }
}

/* =========================================================
   시작
   ========================================================= */

function renderCharSelect(){
  document.body.classList.remove('is-final','is-night');
  showScreen('select');
  var box = document.getElementById('char-list');
  box.innerHTML = '';
  Object.keys(CHARACTERS).forEach(function(id){
    var c = CHARACTERS[id];
    var btn = document.createElement('button');
    btn.className = 'char-card';
    var por = document.createElement('img');
    por.className = 'char-portrait';
    por.style.display = 'none';
    loadArtInto(por, 'pc-' + id,
      function(){ por.style.display = 'block'; },
      function(){ por.remove(); });
    btn.appendChild(por);
    var n = document.createElement('div'); n.className = 'char-name'; n.textContent = c.name + ' — ' + c.role;
    var d = document.createElement('div'); d.className = 'char-desc'; d.textContent = c.desc;
    var st = document.createElement('div'); st.className = 'char-stats';
    var parts = ['정신력 '+c.sanityMax, '체력 '+c.healthMax];
    if(c.obs) parts.push('조사 '+(c.obs>0?'+':'')+c.obs);
    if(c.nerve) parts.push('담력 '+(c.nerve>0?'+':'')+c.nerve);
    if(c.heal) parts.push('치료 +'+c.heal);
    st.textContent = parts.join('  ·  ');
    btn.appendChild(n); btn.appendChild(d); btn.appendChild(st);
    btn.addEventListener('click', function(){ startGame(id); });
    box.appendChild(btn);
  });
}

/* 처음 한 판에만 보여 주는 안내 (일지 맨 아래 '도움말'에서 다시 볼 수 있다) */
function afterIntro(){
  var seen = false;
  try{ seen = localStorage.getItem('bp_guide_v1') === '1'; }catch(e){}
  if(seen) return renderMap();
  try{ localStorage.setItem('bp_guide_v1', '1'); }catch(e){}
  showNarrativeBeat('처음이라면',
    '목표 — 그믐밤까지 구절·시기·자격 세 가지를 알아내고, 누가 값을 치를지 정합니다.' + BR +
    '다음 할 일 — 지도 위 한 줄이 지금 가 볼 만한 곳을 알려줍니다. 누르면 가는 길이 깜빡입니다. 한 번 움직일 때마다 반나절이 지납니다.' + BR +
    '정신력 — 절반 아래로 떨어지면 여관이나 부두에서 쉬세요. 바닥나면 이야기가 끝납니다.' + BR +
    '주시 — 마을이 당신을 지켜보는 정도입니다. 높으면 밤에 쫓깁니다. 여관과 부두는 밤에도 안전하고, 주시는 하루에 하나씩 가라앉습니다.' + BR +
    '이 안내는 일지 맨 아래 도움말에서 다시 볼 수 있습니다.',
    renderMap, { label:'알겠습니다' });
}

function startGame(charId){
  clearProgress();
  state = newState(charId);
  beatQueue = [];
  showScreen('game');
  placeLead();
  showNarrativeBeat(
    state.char.name + ' · ' + state.char.role,
    state.char.tie + BR +
    '종착역에서 내려 다시 두 시간을 걸었습니다. 도로 표지판에 블랙포인트라는 이름이 나온 것은 단 한 번이었고, 그마저 페인트가 벗겨져 반쯤 읽히지 않았습니다.' + BR +
    '안개가 육지 쪽으로 밀려오고 있습니다. 바다에서 오는 안개는 보통 짠내가 나는데, 이 안개에서는 다른 냄새가 납니다. 오래 닫아둔 지하실 같은, 젖은 돌 냄새입니다.' + BR +
    '열이틀 남았습니다.',
    afterIntro,
    { place:'블랙포인트 · 10월 2일' }
  );
}

document.getElementById('scene-strip').addEventListener('click', function(){
  document.body.classList.toggle('peek');
  renderStrip();
});

document.getElementById('btn-start').addEventListener('click', renderCharSelect);
document.getElementById('btn-continue').addEventListener('click', resumeGame);

/* 이어하기 */
function resumeGame(){
  var saved = loadProgress();
  if(!saved){ renderCharSelect(); return; }
  state = saved.state;
  beatQueue = [];
  showScreen('game');
  placeLead();
  renderMap();
}

(function showContinue(){
  var saved = loadProgress();
  if(!saved) return;
  var s = saved.state;
  document.getElementById('continue-box').hidden = false;
  document.getElementById('continue-info').textContent =
    s.char.name + ' · 10월 ' + (START_DATE + s.day) + '일 ' + (s.phase ? '밤' : '낮') +
    ' · 그믐까지 ' + (LAST_DAY - s.day) + '일 · 단서 ' + s.clueOrder.length + '건';
  var start = document.getElementById('btn-start');
  start.textContent = '처음부터 (저장된 진행은 지워집니다)';
  start.classList.add('secondary');
})();
document.getElementById('btn-restart').addEventListener('click', renderCharSelect);
document.querySelectorAll('.map-node').forEach(function(btn){
  btn.addEventListener('click', function(){ visitLocation(btn.dataset.loc); });
});

var jt = document.getElementById('journal-toggle');
jt.addEventListener('click', function(){
  var j = document.getElementById('journal');
  var open = j.hidden;
  j.hidden = !open;
  jt.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.getElementById('journal-arrow').textContent = open ? '접기 ▴' : '펼치기 ▾';
});

detectArtBase();      /* 삽화 폴더 위치를 먼저 확인해 둔다 */

var best = loadBest();
if(best){
  var el = document.getElementById('best-record');
  el.hidden = false;
  el.textContent = '지금까지 최고 기록: ' + best.title;
}
