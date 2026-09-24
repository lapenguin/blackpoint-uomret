/* 심연의 일지 — 장면 — 장소 12곳의 모든 사건 */
"use strict";

/* =========================================================
   장면
   ========================================================= */

var SCENES = {

  /* ---------------- 부두 ---------------- */
  harbor: [
    { id:'h_jabez', run:function(){
      showChoiceEncounter({
        title:'뱃사람 자베즈', place:LOC.harbor.place, art:'npc-jabez',
        text:'그물을 손질하던 노인이 당신을 훑어봅니다. "육지 사람이 이맘때 여기 올 일이 없을 텐데."' + BR +
             '손질하던 그물에는 잡힌 것이 하나도 없습니다.',
        choices:[
          { label:'카터 교수에 대해 묻는다', onPick:function(){
              applyEffect({ clue:'register', watch:1 });
              return { text:'"그 학자 양반? 여관에 들었다가, 그러고는 못 봤소." 노인이 목소리를 낮춥니다. "마사한테 숙박부나 보여달라 하쇼. 퇴실란이 비었을 거요."' + BR +
                            '말해놓고 그는 주위를 한 번 둘러봅니다. 누군가 들었을까 봐입니다.', next:afterScene };
          } },
          { label:'요즘 바다 사정을 묻는다', onPick:function(){
              applyEffect({ clue:'boats', item:'whiskey' });
              return { text:'"고기가 안 잡히는 게 아니오. 안 오는 거지." 그가 바다 쪽으로 턱짓합니다. "밤에 배 몇 척이 나갔다 오는데, 빈 채로 돌아와. 나간 건 안 빈 채였고."' + BR +
                            '무엇을 싣고 나갔느냐고 묻자, 그는 대답 대신 주머니에서 위스키 병을 꺼내 건넵니다. "이 얘긴 맨정신으로 하는 게 아니오."', next:afterScene };
          } }
        ]
      });
    } },
    { id:'h_deal', when:function(){ return state.day >= 5 && state.seen['h_jabez']; }, run:function(){
      showChoiceEncounter({
        title:'자베즈의 제안', place:LOC.harbor.place, art:'npc-jabez',
        text:'노인이 배의 밧줄을 점검하고 있습니다. "나는 그믐 전에 뜰 거요."' + BR +
             '그가 당신을 봅니다. "자리 하나는 비워두리다. 그믐밤에 여기 오면 태워주겠소. 대신 그때는 기다려주지 않아."',
        choices:[
          { label:'"자리를 남겨 주시오."', onPick:function(){
              applyEffect({ flag:'boatOffer', sanity:1 });
              logLine('자베즈가 그믐밤의 배에 자리를 남겼다.');
              return { text:'노인이 고개를 한 번 끄덕입니다. 돌아갈 길이 하나 생겼다는 사실만으로도 숨이 조금 쉬어집니다.', next:afterScene };
          } },
          { label:'"나는 남을 겁니다."', onPick:function(){
              applyEffect({ sanity:-1, flag:'refusedBoat' });
              return { text:'노인은 한참 당신을 보다가 그물로 눈을 돌립니다. "그 학자 양반도 그렇게 말했소."', next:afterScene };
          } }
        ]
      });
    } },
    { id:'h_night', when:function(){ return isNight() && state.day >= 4; }, run:function(){
      showDiceEncounter({
        title:'물 밖으로 나온 것', place:LOC.harbor.place,
        text:'밤의 부두는 비어 있습니다. 다만 물에 잠긴 계단 쪽에서, 젖은 발이 나무를 밟는 소리가 규칙적으로 들립니다.',
        target:7, mods:obsMods(),
        onSuccess:function(){
          applyEffect({ sanity:-1, clue:'signal' });
          return { text:'숨을 죽이고 지켜봅니다. 그것들은 물 밖으로 나와 등대 쪽을 한참 바라보다가, 불빛이 한 번 흔들리자 다시 물로 돌아갑니다.' + BR +
                        '불빛은 수평선이 아니라 육지를 향해 있었습니다. 저들이 올라올 길을 밝히는 것이었습니다.', next:afterScene };
        },
        onFail:function(){
          applyEffect({ sanity:-2, watch:1 });
          return { text:'발밑의 판자가 삐걱입니다. 소리가 멎고, 젖은 얼굴들이 일제히 이쪽을 향합니다.', next:function(){
            startChase(afterScene, { foe:PURSUERS.gilman, title:'젖은 계단' });
          } };
        }
      });
    } },
    { id:'h_rest', repeat:true, quiet:true, run:function(){
      showChoiceEncounter({
        title:'부두에서 숨을 고르다', place:LOC.harbor.place,
        text:'밧줄 더미에 앉아 잠시 숨을 고릅니다. 파도 소리만은 아직 평범합니다.',
        choices:[
          { label:'몸을 추스른다', note:'체력 +' + (3 + (state.char.heal||0)), onPick:function(){
              applyEffect({ health: 3 + (state.char.heal||0) });
              return { text: state.char.heal ? '왕진 가방을 열어 능숙하게 상처를 처치합니다.' : '상처를 돌보고 나니 한결 낫습니다.', next:afterScene };
          } },
          { label:'마음을 가다듬는다', note:'정신력 +5 · 주시 -1', onPick:function(){
              applyEffect({ sanity:5, watch:-1 });
              return { text:'파도 소리를 들으며 머릿속을 정리합니다. 한동안 당신을 보던 시선들도 흥미를 잃은 듯합니다.', next:afterScene };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 광장 ---------------- */
  square: [
    { id:'s_flyer', run:function(){
      showChoiceEncounter({
        title:'광장의 전단', place:LOC.square.place,
        text:'낮의 블랙포인트는 밤보다 나을 것이 없습니다. 상점 절반이 닫혀 있고, 열린 곳도 손님이 없습니다. 사람들은 당신을 보면 눈을 내리깝니다. 적의는 아닙니다. 차라리 미안함에 가깝습니다.' + BR +
             '게시판에 전단 한 장이 남아 있습니다. 비에 젖었다 마르기를 반복해 종이가 물결칩니다.',
        choices:[
          { label:'전단을 떼어 뒷면까지 살핀다', onPick:function(){
              applyEffect({ clue:'flyer', watch:1 });
              return { text:'앞면에는 이름 둘. 뒷면에는 연필로 적힌 날짜 몇 개가 희미하게 남아 있습니다.' + BR +
                            '적어두려는데, 광장 건너편 창문의 커튼이 조용히 닫힙니다.', next:afterScene,
                       doc:['실종자 수배', '메리 휘트필드 · 당시 11세\n토머스 "늙은 톰" 개럿 · 당시 63세\n소식을 아시는 분은 마을 사무소로'] };
          } },
          { label:'지나가는 사람에게 말을 건다', onPick:function(){
              applyEffect({ sanity:-1 });
              return { text:'중년 여자가 걸음을 멈추지 않은 채 말합니다. "묻지 말고, 그믐 전에 가세요." 그게 전부입니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'s_rhyme', when:function(){ return !isNight(); }, run:function(){
      showChoiceEncounter({
        title:'아이들의 노래', place:LOC.square.place,
        text:'광장 한구석에서 아이 셋이 줄넘기를 하며 노래를 부릅니다. 곡조는 흔한 동요인데, 가사가 이상합니다.',
        choices:[
          { label:'가사를 끝까지 듣는다', onPick:function(){
              applyEffect({ clue:'rhyme' });
              return { text:'아이들은 뜻도 모르고 부릅니다. 지켜보던 어른 누구도 말리지 않습니다.', next:afterScene,
                       doc:['아이들의 줄넘기 노래', '달이 없는 밤에는 문을 잠그고\n이름을 부르거든 대답하지 마라\n하나를 보내면 백 밤이 오고\n백 밤이 지나면 다시 하나를'] };
          } },
          { label:'누가 가르쳐줬는지 묻는다', onPick:function(){
              applyEffect({ clue:'rhyme', watch:1, sanity:-1 });
              return { text:'"학교 선생님이요." 가장 작은 아이가 대답합니다. "근데 선생님은 이제 없어요."' + BR +
                            '그 순간 다른 아이가 그 아이의 손을 잡아끌고, 셋 다 뒤도 안 돌아보고 달아납니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'s_warn', when:function(){ return state.day >= 5 && state.watch >= 2; }, run:function(){
      showChoiceEncounter({
        title:'광장의 눈들', place:LOC.square.place,
        text:'광장에 들어서자 대화가 멎습니다. 남자 둘이 길을 막지는 않은 채, 딱 지나가기 불편할 만큼만 서 있습니다.' + BR +
             '"그만 물어보고 다니쇼. 우리도 당신이 무사히 가길 바라는 거요."',
        choices:[
          { label:'사과하고 물러난다', note:'주시 -2', onPick:function(){
              applyEffect({ watch:-2 });
              return { text:'고개를 숙이고 돌아섭니다. 등 뒤에서 다시 대화가 이어집니다. 낮은 목소리로.', next:afterScene };
          } },
          { label:'"무사히 가지 못한 사람이 몇입니까?"', onPick:function(){
              applyEffect({ watch:1, clue:'flyer' });
              return { text:'한 사람의 얼굴이 굳습니다. "…그건 우리가 정한 게 아니오." 그가 내뱉고는 자리를 뜹니다.' + BR +
                            '남은 사람은 아무 말도 하지 않았지만, 부정도 하지 않았습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'s_empty', when:function(){ return state.day >= 9; }, run:function(){
      showChoiceEncounter({
        title:'문마다 그어진 표식', place:LOC.square.place,
        text:'광장을 둘러싼 집들의 문마다 흰 칠로 표식이 그어져 있습니다. 어떤 집은 하나, 어떤 집은 둘. 표식이 없는 집은 문이 열린 채 비어 있습니다.',
        choices:[
          { label:'표식을 세어 본다', onPick:function(){
              applyEffect({ sanity:-1 });
              var extra = '';
              if(hasClue('schism')){ applyEffect({ clue:'procession' }); extra = ' 하나는 맞이하는 쪽, 둘은 아직 값을 치르는 쪽입니다. 길먼의 표식이 훨씬 많습니다.'; }
              return { text:'표식이 있는 집은 남고, 없는 집은 비었습니다. 남은 자와 바쳐진 자를 나눈 표식입니다.' + extra, next:afterScene };
          } },
          { label:'빈 집에 들어가 본다', onPick:function(){
              applyEffect({ health:-1 });
              if(!hasItem('match')){ addItem('match'); return { text:'식탁에 식사가 차려진 채로 식어 있습니다. 부엌 선반에서 성냥갑을 챙겨 나옵니다. 가져가도 뭐랄 사람이 없습니다.', next:afterScene }; }
              addItem('bandage');
              return { text:'식탁에 식사가 차려진 채로 식어 있습니다. 서랍에서 붕대를 챙깁니다. 가져가도 뭐랄 사람이 없습니다.', next:afterScene };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 폐선 창고 ---------------- */
  wharf: [
    { id:'w_gilman', run:function(){
      showChoiceEncounter({
        title:'어시장의 길먼', place:LOC.wharf.place, art:'npc-gilman',
        text:'어시장은 아직 문을 엽니다. 팔 것이 거의 없는데도 그렇습니다.' + BR +
             '주인 오벳 길먼이 당신을 맞습니다. 눈을 거의 깜빡이지 않습니다. 목덜미에 접힌 자국이 세 줄 나 있는데, 흉터라고 하기엔 너무 가지런합니다.',
        choices:[
          { label:'그의 얼굴을 똑바로 본다', onPick:function(){
              applyEffect({ clue:'fishmen', sanity:-1 });
              return { text:'그가 먼저 웃습니다. "다들 우리 집안 얼굴을 보면 그럽디다." 손님을 쫓는 말투가 아니라, 자랑에 가까웠습니다.' + BR +
                            '"우리는 여기 오래 살았소. 아주 오래."', next:afterScene };
          } },
          { label:'마사에 대해 묻는다', onPick:function(){
              applyEffect({ clue:'schism', watch:1 });
              return { text:'"늙은 여자는 아직도 값을 치르면 잠든다고 믿지." 길먼이 생선 손질하던 칼을 내려놓습니다. "우리는 안 믿어. 우리는 맞이할 거요."' + BR +
                            '"맞이하는 쪽은 안 잡아먹히거든."', next:afterScene };
          } }
        ]
      });
    } },
    { id:'w_hold', when:function(){ return state.seen['w_gilman']; }, run:function(){
      showDiceEncounter({
        title:'폐선 창고 안쪽', place:LOC.wharf.place,
        text:'어시장 뒤편에 물 위로 반쯤 기울어진 폐선이 묶여 있습니다. 선창에서 사람 소리가 납니다. 생선 냄새로 덮으려 했지만 덮이지 않는 다른 냄새도 납니다.',
        target:7, mods:obsMods(), extra:[{ label:'밤', value:isNight() ? 2 : 0 }],
        onSuccess:function(){
          applyEffect({ clue:['schism','procession'], sanity:-1, watch:1 });
          return { text:'선창 바닥에 두건이 개어져 쌓여 있습니다. 스무 벌이 넘습니다. 그 옆에 마을 명부 사본이 펼쳐져 있고, 이름 절반에 동그라미가 쳐져 있습니다.' + BR +
                        '동그라미 없는 이름 옆에는 다른 표시가 있습니다. 광장의 빈 집들과 수가 맞습니다.', next:afterScene };
        },
        onFail:function(){
          applyEffect({ watch:2 });
          return { text:'판자가 크게 울립니다. 선창 안의 소리가 뚝 끊기고, 발소리 여럿이 동시에 일어섭니다.', next:function(){
            startChase(afterScene, { foe:PURSUERS.gilman, title:'폐선 창고' });
          } };
        }
      });
    } },
    { id:'w_invite', when:function(){ return state.day >= 8 && hasClue('schism'); }, run:function(){
      showChoiceEncounter({
        title:'길먼의 제안', place:LOC.wharf.place, art:'npc-gilman',
        text:'길먼이 당신을 기다리고 있었던 것처럼 문 앞에 서 있습니다. 손에 두건 하나가 들려 있습니다.' + BR +
             '"당신도 알잖소. 저 늙은 여자 방식으론 안 된다는 걸. 백 년을 해봤는데 안 됐으니까."' + BR +
             '"그믐밤에 원 안에 서면 되오. 그게 전부요."',
        choices:[
          { label:'두건을 받는다', note:'그믐밤에 다른 길이 열린다', weighty:true, onPick:function(){
              applyEffect({ flag:'cultOffer', sanity:-1 });
              logLine('길먼에게서 두건을 받았다.');
              return { text:'받아 든 천이 생각보다 무겁습니다. 소금기에 절어 뻣뻣합니다.' + BR +
                            '"버려도 상관없소." 길먼이 말합니다. "그날 밤이 되면 어차피 알게 될 테니."', next:afterScene };
          } },
          { label:'거절한다', onPick:function(){
              applyEffect({ watch:2, sanity:1 });
              return { text:'그가 어깨를 으쓱합니다. "그럼 그쪽은 값을 치르는 쪽이군." 문이 닫힙니다.' + BR +
                            '그날 이후로 어시장 사람들이 당신을 보는 눈이 달라졌습니다.', next:afterScene };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 학교 ---------------- */
  school: [
    { id:'sc_first', run:function(){
      showChoiceEncounter({
        title:'문 닫은 학교', place:LOC.school.place,
        text:'교실 하나짜리 학교입니다. 문은 잠겨 있지 않습니다. 칠판에 쓰다 만 글씨가 아직 남아 있고, 날짜는 9월 22일에서 멈춰 있습니다.' + BR +
             '아이들 책상에 물건이 그대로입니다. 누구도 짐을 챙겨 나가지 않았습니다.',
        choices:[
          { label:'교탁을 살핀다', onPick:function(){
              applyEffect({ item:'notebook', clue:'hannah' });
              return { text:'서랍에서 두꺼운 공책이 나옵니다. 표지에 "해나 프라이스"라고 적혀 있습니다.' + BR +
                            '마을 아이들의 노래와 말버릇을 몇 해에 걸쳐 채집한 기록입니다. 학자의 것처럼 꼼꼼합니다.', next:afterScene,
                       doc:['해나의 공책 · 마지막 장', '아이들이 부르는 노래는 만들어진 것이 아니라 전해진 것이다. 가사가 지역마다 다른데, 이 마을 것만 유독 구체적이다.\n\n이걸 적는 것도 위험하다는 걸 이제 안다.'] };
          } },
          { label:'출석부를 넘겨 본다', onPick:function(){
              applyEffect({ clue:'census', sanity:-1 });
              return { text:'해마다 가을이면 한 명씩 이름이 지워져 있습니다. 전학도, 이사도 아닙니다. 그냥 다음 장부터 없습니다.' + BR +
                            '지워진 자리마다 선생의 글씨로 작게 "가을"이라고만 적혀 있습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'sc_hannah', when:function(){ return state.seen['sc_first'] && hasClue('hannah'); }, run:function(){
      showDiceEncounter({
        title:'해나 프라이스는 어디로 갔나', place:LOC.school.place,
        text:'선생의 방은 교실 뒤에 붙어 있습니다. 옷장에 옷이 그대로 걸려 있고, 여행 가방도 그대로입니다. 떠난 사람의 방이 아닙니다.',
        target:7, mods:obsMods(),
        onSuccess:function(){
          applyEffect({ clue:'census', sanity:-1 });
          var got = '';
          if(!hasItem('bandage')){ addItem('bandage'); got = ' 서랍에서 붕대도 챙깁니다.'; }
          return { text:'침대 밑에서 찢어진 종이 뭉치가 나옵니다. 공책에서 뜯어낸 장들입니다. 본인이 뜯은 것 같지는 않습니다.' + BR +
                        '남은 조각 하나에 이렇게 적혀 있습니다. "그들은 내가 무엇을 적는지 안다. 오늘 밤 창밖에 사람이 서 있었다. 아이 키만 했고, 젖어 있었다."' + got, next:afterScene };
        },
        onFail:function(){
          applyEffect({ sanity:-2 });
          return { text:'옷장 문을 여는 순간 바닥이 젖어 있는 것을 봅니다. 물 자국이 옷장 안쪽에서 시작해 방 한가운데에서 끊깁니다.' + BR +
                        '더 보고 싶지 않아 문을 닫습니다.', next:afterScene };
        }
      });
    } },
    { id:'sc_desk', when:function(){ return state.day >= 6 && state.seen['sc_first']; }, run:function(){
      showChoiceEncounter({
        title:'맨 뒷자리', place:LOC.school.place,
        text:'교실 맨 뒷자리 책상 하나만 유난히 낡았습니다. 나무가 다른 것보다 훨씬 오래되었고, 상판에 이름이 새겨져 있습니다.' + BR +
             '메리 W. 팔십 년 전 책상이 왜 아직 이 교실에 있는지, 아무도 설명해 준 적이 없습니다.',
        choices:[
          { label:'책상 안을 들여다본다', onPick:function(){
              applyEffect({ sanity:-1, clue:'flyer' });
              return { text:'서랍 안에 마른 꽃이 한 송이 들어 있습니다. 바스라질 만큼 오래된 것인데, 놓인 자리가 흐트러지지 않았습니다.' + BR +
                            '누군가 계속 갈아 놓고 있거나, 아무도 건드린 적이 없거나 둘 중 하나입니다.', next:afterScene };
          } },
          { label:'그 자리에 앉아 본다', onPick:function(){
              applyEffect({ sanity:-2, flag:'satAtDesk' });
              return { text:'앉는 순간 옷이 젖습니다. 일어나 보면 의자는 말라 있습니다.' + BR +
                            '창밖을 보면 우물이 보입니다. 이 자리에서만 보입니다.', next:afterScene };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 여관 ---------------- */
  inn: [
    { id:'i_martha', run:function(){
      showChoiceEncounter({
        title:'마사의 여관', place:LOC.inn.place, art:'npc-martha',
        text:'여관은 마을에서 유일하게 불이 켜진 건물입니다. 문을 열자 종이 울리고, 카운터 뒤의 여자가 고개를 듭니다. 예순쯤 되어 보이고, 손등에 오래된 화상 자국이 있습니다.' + BR +
             '"방을 찾으시나요."' + BR +
             '질문이 아니라 확인이었습니다. 마치 당신이 올 것을 알고 있었던 사람처럼.',
        choices:[
          { label:'숙박부를 보여 달라고 한다', onPick:function(){
              applyEffect({ clue:'register', flag:'metMartha' });
              return { text:'그녀는 망설임 없이 숙박부를 돌려줍니다. 엘든 카터, 9월 19일 투숙. 퇴실란은 비어 있습니다.' + BR +
                            '"짐도 아직 위에 있어요." 마사가 말합니다. "치우지 않았어요. 돌아올 수도 있으니까."' + BR +
                            '그 말투에는 기대가 없었습니다.', next:afterScene };
          } },
          { label:'마을 이야기를 청한다', onPick:function(){
              applyEffect({ sanity:1, clue:'signal', flag:'metMartha' });
              return { text:'"달빛 없는 밤마다 등대에 불이 켜져요." 그녀가 목소리를 낮춥니다. "사일러스한테 물어보면 아니라고 하겠지만."' + BR +
                            '계단을 오르다 돌아보았을 때, 그녀는 여전히 그 자리에 서서 당신을 보고 있었습니다. 눈이 마주쳤는데도 시선을 거두지 않았습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'i_room', when:function(){ return state.seen['i_martha']; }, run:function(){
      showDiceEncounter({
        title:'카터의 방', place:LOC.inn.place,
        text:'마사가 내준 열쇠로 그의 방문을 엽니다. 짐은 풀린 채 그대로입니다. 침대는 쓴 흔적이 없습니다.',
        target:7, mods:obsMods(),
        onSuccess:function(){
          applyEffect({ clue:'journal', item:'match' });
          return { text:'여행 가방 안감이 한쪽만 부풀어 있습니다. 뜯어 보니 수첩 한 권이 나옵니다. 머리맡에서 성냥갑도 챙깁니다.', next:afterScene,
                   doc:['엘든 카터의 수첩', '9월 3일 — 그저 오래된 미신이라 생각했다.\n9월 11일 — 그들의 말이 자꾸 맞아떨어진다.\n9월 19일 — 더는 예전으로 돌아갈 수 없을 것 같다. 그래도 상관없다.'] };
        },
        onFail:function(){
          applyEffect({ sanity:-1 });
          return { text:'짐을 뒤져도 옷가지와 필기구뿐입니다. 문가에 서 있던 마사가 조용히 말합니다. "그이는 가져갈 건 다 가져갔어요."', next:afterScene };
        }
      });
    } },
    { id:'i_confront', when:function(){ return !!state.flags.suspectMartha; }, run:function(){
      showChoiceEncounter({
        title:'마사와 마주 앉다', place:LOC.inn.place, art:'npc-martha',
        text:'그을린 편지를 탁자 위에 올려놓자, 그녀는 놀라지 않습니다. 오래 기다려온 사람처럼 천천히 앉을 뿐입니다.' + BR +
             '"백 년이 넘었어요. 그것은 잠들어 있는 대신 값을 받습니다. 한 사람씩. 제때 바치지 않으면 마을 전체를 가져가죠."' + BR +
             '"메리도, 톰도 내가 불렀어요. 그 아이들이 아니었다면 여기 사람 하나 안 남았을 겁니다."',
        choices:[
          { label:'"메리는 누구였습니까?"', note:'묻는다', onPick:function(){
              applyEffect({ clue:'pact', flag:'marthaMercyMary' });
              logLine('마사에게 메리를 먼저 물었다.');
              return { text:'그녀의 손이 탁자 위에서 멈춥니다.' + BR +
                            '"고모예요." 마사가 말합니다. "내가 태어나기도 전에. 그 애 이름을 내내 들으며 자랐습니다. 열한 살이었어요."' + BR +
                            '"우리 집안이 시작한 일인데, 우리 집안 아이가 첫 번째였습니다. 그게 무슨 뜻인지 나는 평생 생각했어요."', next:afterScene };
          } },
          { label:'"그럼 나도 명단에 올린 거군."', note:'몰아세운다', onPick:function(){
              applyEffect({ sanity:-2, clue:'pact', flag:'marthaDefied' });
              logLine('마사를 몰아세웠다.');
              return { text:'"미안해요." 그녀는 부정하지 않습니다. ' + state.char.called + BR +
                            '그러고는 입을 다뭅니다. 그날 이후 그녀는 당신과 눈을 마주치지 않습니다.', next:afterScene };
          } },
          { label:'"이걸 끝낼 방법을 아시오?"', onPick:function(){
              applyEffect({ clue:'pact', item:'key', flag:'marthaHelped' });
              logLine('마사가 관리자의 열쇠를 건넸다.');
              return { text:'"바치는 걸로는 끝나지 않아요. 다시 재우는 수밖에." 그녀가 낡은 열쇠 하나를 밀어놓습니다.' + BR +
                            '"제단 아래, 첫 번째 관리자가 남긴 것이 있어요. 나는 겁이 나서 백 년 동안 못 했던 일입니다."', next:afterScene };
          } }
        ]
      });
    } },
    { id:'i_truth', when:function(){ return hasClue('blood') && state.seen['i_confront'] && !state.flags.marthaFled; }, run:function(){
      showChoiceEncounter({
        title:'일라이어스의 기록을 내려놓다', place:LOC.inn.place, art:'npc-martha',
        text:'방수포에 싸여 있던 기록을 탁자에 펼칩니다. 그녀는 첫 줄을 읽고 나서 더 읽지 않았습니다. 이미 아는 사람의 반응이었습니다.' + BR +
             '"…짐작은 했어요." 마사가 말합니다. "제물이 소용없다는 건. 길먼 쪽이 먼저 알아냈고, 그래서 갈라섰으니까."' + BR +
             '"하지만 그다음 줄은 몰랐습니다. 계약을 맺은 피라는 것은."' + BR +
             '그녀가 자기 손등의 화상 자국을 내려다봅니다.',
        choices:[
          { label:'"당신 차례라는 뜻입니다."', note:'사실을 말한다', onPick:function(){
              applyEffect({ flag:'marthaToldTruth', sanity:-1 });
              logLine('마사에게 자격의 진실을 전했다.');
              return { text:'"알아요." 그녀는 아주 오래 아무 말도 하지 않습니다.' + BR +
                            '"백 년 동안 관리자들이 다 알았을 거예요. 알고도 남의 아이를 보냈겠죠. 나처럼."', next:afterScene };
          } },
          { label:'"그래도 당신이 정할 일입니다."', note:'사실을 말하되 몰아세우지 않는다', onPick:function(){
              applyEffect({ flag:'marthaToldTruth', flag2:true, sanity:1 });
              state.flags.marthaMercyLine = true;
              logLine('마사에게 선택을 남겨 주었다.');
              return { text:'그녀가 처음으로 당신을 똑바로 봅니다.' + BR +
                            '"…아무도 그렇게 말해준 적이 없어요." 마사가 말합니다. "다들 내가 해야 한다고만 했지."' + BR +
                            '그녀는 명단을 덮습니다. 덮는 손이 떨리지 않았습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'i_last', when:function(){ return state.day >= 10 && state.seen['i_confront'] && !state.flags.marthaFled; }, run:function(){
      showChoiceEncounter({
        title:'마지막 손님', place:LOC.inn.place, art:'npc-martha',
        text:'여관에는 이제 불이 하나만 켜져 있습니다. 마사가 명단을 꺼내 마지막 빈 줄을 손끝으로 짚고 있습니다.' + BR +
             '"그믐밤엔 누구든 한 사람 이름이 들어가야 해요. 비어 있으면 마을을 통째로 가져갑니다."',
        choices:[
          { label:'"그 줄은 비워 두시오."', note:'연민', onPick:function(){
              applyEffect({ flag:'marthaMercyLine', sanity:1 });
              logLine('마지막 줄을 비워 두라고 했다.');
              return { text:'그녀가 펜을 내려놓습니다. "…백 년 만에 처음이네요, 그런 말을 하는 사람은."' + BR +
                            '그러고는 아주 오래 웃지 않던 사람처럼 웃습니다.', next:afterScene };
          } },
          { label:'"당신 이름을 적으시오."', note:'요구', weighty:true, onPick:function(){
              applyEffect({ flag:'marthaPushed', sanity:-1 });
              logLine('마사에게 그녀의 이름을 적으라 했다.');
              return { text:'그녀는 한참 말이 없다가 펜을 듭니다. 그러다 내려놓습니다.' + BR +
                            '"당신도 결국 남을 보내는군요." 마사가 조용히 말합니다. "다들 그래요. 읽고도 못 하니까, 남한테 시키는 거예요."', next:afterScene };
          } },
          { label:'"내 이름을 적으시오."', note:'스스로', weighty:true, onPick:function(){
              applyEffect({ flag:'selfOffered', sanity:-2 });
              logLine('명단에 스스로의 이름을 올렸다.');
              return { text:'마사의 손이 멈춥니다. "…정말요?"' + BR +
                            '그녀가 당신의 이름을 적습니다. 글씨가 흔들립니다. 백 년 동안 한 번도 흔들린 적 없던 글씨입니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'i_flight', when:function(){ return state.day >= 11 && state.flags.marthaDefied && !state.flags.marthaToldTruth; }, run:function(){
      showNarrativeBeat('빈 카운터',
        '여관 문이 열려 있습니다. 카운터에 열쇠가 줄줄이 걸린 채로, 사람만 없습니다.' + BR +
        '장부도, 명단도 없습니다. 난로에 종이 탄 재만 수북합니다.' + BR +
        '마사 휘트필드는 떠났습니다. 백 년 만에 처음으로, 관리자가 도망친 것입니다.',
        function(){ state.flags.marthaFled = true; logLine('마사가 마을을 떠났다.'); afterScene(); });
    } },
    { id:'i_sleep', repeat:true, quiet:true, when:function(){
        if(state.flags.suspectMartha && !state.seen['i_confront']) return false;
        if(hasClue('blood') && state.seen['i_confront'] && !state.seen['i_truth'] && !state.flags.marthaFled) return false;
        if(state.day >= 10 && state.seen['i_confront'] && !state.seen['i_last'] && !state.flags.marthaFled) return false;
        return true;
      }, run:function(){
      if(!isNight()){
        return showChoiceEncounter({
          title:'여관에서 한숨 돌리다', place:LOC.inn.place,
          text:'한낮의 여관은 조용합니다. 난로 옆 의자가 비어 있습니다.',
          choices:[
            { label:'방에 올라가 쉰다', note:'체력 +2 · 정신력 +3 · 주시 -1', onPick:function(){
                applyEffect({ health:2, sanity:3, watch:-1 });
                return { text:'커튼을 치고 잠깐 눈을 붙입니다. 깨고 나니 창밖의 안개가 조금 옅어져 있습니다.', next:afterScene };
            } },
            { label:'난로 옆에서 마사와 차를 마신다', note:'정신력 +2 · 주시 -2', when:function(){ return !state.flags.marthaFled; }, onPick:function(){
                applyEffect({ sanity:2, watch:-2 });
                return { text:'마사는 아무것도 묻지 않고 찻잔을 채워 줍니다. 창밖을 지나던 사람들이 여관 안의 당신을 보고, 흥미를 잃은 얼굴로 지나갑니다.' + BR +
                              '여관 손님이 여관에 있는 것은 이상한 일이 아니니까요.', next:afterScene };
            } }
          ]
        });
      }
      showChoiceEncounter({
        title:'여관에서 묵다', place:LOC.inn.place,
        text:'복도의 등이 하나씩 꺼집니다. 오늘 밤은 지붕 아래에서 보낼 수 있습니다.',
        choices:[
          { label:'푹 잔다', note:'체력 +4 · 정신력 +4 · 주시 -1', onPick:function(){
              applyEffect({ health:4, sanity:4, watch:-1, flag:'restedTonight' });
              return { text:'오랜만에 침대에서 눈을 감습니다.' + BR + pickDream(), next:afterScene };
          } },
          { label:'자는 척하고 마사를 지켜본다', note:'정신력 -1', when:function(){ return !state.flags.marthaFled; }, onPick:function(){
              applyEffect({ sanity:-1, flag:'restedTonight' });
              if(!hasClue('letter') && hasClue('ledger')){
                applyEffect({ clue:'letter' });
                return { text:'새벽 두 시, 마사가 카운터에 앉아 무언가를 씁니다. 다 쓴 종이를 난로에 넣으려다, 마음을 바꿔 장부 사이에 끼워 넣습니다.' + BR +
                              '그녀가 잠든 뒤 확인한 그 종이에는, 당신을 이 마을로 부른 문장이 적혀 있었습니다.', next:afterScene };
              }
              applyEffect({ clue:'register' });
              return { text:'새벽 두 시, 마사가 카운터의 등을 켜고 한참을 앉아 있습니다. 아무것도 하지 않고, 그저 창밖 등대 쪽을 봅니다. 불이 한 번 깜빡이자 그제야 등을 끕니다.', next:afterScene };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 저택 ---------------- */
  manor: [
    { id:'m_ledger', run:function(){
      showChoiceEncounter({
        title:'휘트필드 저택', place:LOC.manor.place,
        text:'폭풍에 반쯤 무너진 저택. 깨진 창 안으로 희미한 촛불이 보입니다. 아무도 살지 않는다고 했는데, 초는 최근에 갈아 끼운 것입니다.',
        choices:[
          { label:'다락까지 올라간다', onPick:function(){
              applyEffect({ health:-1, clue:'ledger' });
              return { text:'다락 궤짝에서 가죽 표지의 장부를 발견합니다. 표지에 휘트필드라는 성이 눌러 찍혀 있습니다.', next:afterScene,
                       doc:['휘트필드 가 장부 · 마지막 장',
                            '메리 휘트필드 · 1847   (붉은 줄)\n토머스 개럿 · 1889   (붉은 줄)\n… 스물세 개의 이름 …\n엘든 카터 · 1927   (잉크가 아직 마르지 않음)\n\n다음 줄은 비어 있습니다.'] };
          } },
          { label:'촛불을 켠 사람을 먼저 찾는다', onPick:function(){
              applyEffect({ watch:1 });
              return { text:'발소리를 죽이고 방을 하나씩 확인합니다. 아무도 없습니다. 다만 부엌 쪽 문이 안에서 잠겨 있고, 문 아래로 바닷물 냄새가 새어 나옵니다.' + BR +
                            '돌아 나오는 길, 촛불은 꺼져 있습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'m_secret', when:function(){ return state.seen['m_ledger']; }, run:function(){
      var sid = state.char.secret;
      showChoiceEncounter({
        title:'당신만 알아볼 수 있는 것', place:LOC.manor.place,
        text:'장부를 덮으려다 멈춥니다. 스물세 개의 이름 중 하나에서, 손이 저절로 멎었습니다.' + BR +
             '당신 말고는 아무도 알아보지 못할 것입니다.',
        choices:[
          { label:'끝까지 읽는다', weighty:true, onPick:function(){
              applyEffect({ clue:sid, sanity:-2, sanityMax:-1 });
              logLine('장부에서 자기 몫의 이름을 찾았다.');
              return { text:CLUES[sid].text + BR +
                            '이 마을에 온 이유를 이제 다시 적어야 합니다. (정신력 최대치 −1)', next:afterScene };
          } },
          { label:'덮는다', onPick:function(){
              applyEffect({ sanity:-1 });
              return { text:'장부를 덮습니다. 덮어도 이미 본 것은 본 것입니다. 다만 아직 소리 내어 읽지는 않았습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'m_letter', when:function(){ return state.seen['m_ledger'] && hasClue('register'); }, run:function(){
      showChoiceEncounter({
        title:'그을린 종이', place:LOC.manor.place,
        text:'장부 아래, 반쯤 타다 만 종이 한 장이 끼워져 있습니다. 그을린 가장자리 너머로 낯익은 문장이 보입니다.' + BR +
             '"그들이 다시 눈을 뜨려 한다."' + BR +
             '당신을 이곳으로 부른 편지의 바로 그 문장입니다. 그런데 이 필체는 엘든의 것이 아닙니다.',
        choices:[
          { label:'조용히 챙긴다', onPick:function(){
              applyEffect({ clue:'letter', sanity:-2 });
              return { text:'어디서 본 글씨인지 곧 떠오릅니다. 여관 장부의 둥근 글씨체입니다.' + BR +
                            '처음부터 초대받았던 것입니다. 엘든이 아니라, 마사가 당신을 이곳으로 불러들였습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'m_portrait', when:function(){ return state.seen['m_ledger'] && state.day >= 4; }, run:function(){
      showDiceEncounter({
        title:'초상화의 뒷면', place:LOC.manor.place,
        text:'계단참에 걸린 초상화. 1827년, 일라이어스 휘트필드. 액자가 벽에서 조금 떠 있습니다.',
        target:7, mods:obsMods(),
        onSuccess:function(){
          applyEffect({ sanity:-1, flag:'knowElias' });
          return { text:'액자 뒷면에 접힌 종이가 붙어 있습니다. 서약서의 앞부분입니다. 뒷장은 찢겨 나갔습니다.', next:afterScene,
                   doc:['일라이어스 휘트필드의 서약 · 앞장',
                        '…값을 치르는 동안 그것은 잠들어 있을 것이다.\n값을 치르지 못하는 날이 오거든, 제단 아래 내가 묻어 둔 것을 꺼내라.\n\n그 아래에 적힌 것을 읽고도 네가 할 수 있을지는, 나는 모르겠다.'] };
        },
        onFail:function(){
          applyEffect({ health:-2 });
          return { text:'액자를 당기는 순간 썩은 계단참이 무너집니다. 먼지 속에서 기어 나오며, 다음엔 밝을 때 오자고 생각합니다.', next:afterScene };
        }
      });
    } },
    { id:'m_cellar', when:function(){ return state.day >= 6 && state.seen['m_ledger']; }, run:function(){
      startChase(afterScene, {
        foe:PURSUERS.thing, title:'저택 지하', place:LOC.manor.place,
        text:'부엌 아래로 이어진 계단에서 바닷물 냄새가 올라옵니다. 저택은 바다와 붙어 있지 않은데도 그렇습니다.' + BR +
             '계단 중간에서, 무언가가 이미 올라오고 있습니다.',
        onEscape:function(){ if(gainClue('bones')) return '도망치며 스친 벽감마다 관이 놓여 있었습니다. 절반이 비어 있었고, 비어 있는 것들이 더 깨끗했습니다.'; }
      });
    } }
  ],

  /* ---------------- 마른 우물 ---------------- */
  well: [
    { id:'we_first', run:function(){
      showDiceEncounter({
        title:'마른 우물', place:LOC.well.place,
        text:'저택 뒤 풀밭에 돌 우물이 있습니다. 두레박줄은 끊어진 지 오래고, 들여다보면 바닥이 보입니다. 물은 없습니다.' + BR +
             '없는데, 바닥이 젖어 있습니다.',
        target:6, mods:obsMods(), extra:[{ label:'불빛', value:hasItem('match') ? 1 : 0 }],
        onSuccess:function(){
          applyEffect({ clue:'wellcolor', sanity:-2 });
          return { text:'성냥을 그어 아래로 비춥니다. 젖은 자리가 어떤 각도에서 빛깔을 띱니다.' + BR +
                        '초록도 보라도 아닙니다. 본 적 없는 빛깔이고, 이름을 붙일 수가 없습니다. 오래 보고 있으면 눈이 아픕니다.' + BR +
                        '성냥이 꺼지자 그 빛깔이 한 박자 늦게 사라졌습니다.', next:afterScene };
        },
        onFail:function(){
          applyEffect({ sanity:-1 });
          return { text:'너무 어둡습니다. 아무것도 보이지 않는데, 들여다본 시간만큼 뒤통수가 서늘합니다.' + BR +
                        '밝을 때, 아니면 불을 가지고 다시 와야겠습니다.', next:afterScene };
        }
      });
    } },
    { id:'we_flower', when:function(){ return hasClue('wellcolor'); }, run:function(){
      showChoiceEncounter({
        title:'우물 바닥', place:LOC.well.place,
        text:'끊어진 두레박줄 대신 담쟁이를 붙잡고 내려갑니다. 생각보다 얕습니다. 어른 키의 두 배쯤.' + BR +
             '바닥에 마른 꽃이 깔려 있습니다. 한 겹이 아닙니다. 아래로 파 보면 계속 나옵니다. 몇 십 년 치입니다.' + BR +
             '누군가 아주 오래, 빠짐없이 갈아 왔습니다.',
        choices:[
          { label:'꽃을 한 송이 챙긴다', onPick:function(){
              applyEffect({ item:'flower', clue:'marydrown', sanity:-1 });
              logLine('우물에서 마른 꽃을 가져왔다.');
              return { text:'가장 위의 것을 한 송이 집어 주머니에 넣습니다. 바스라질 줄 알았는데, 생각보다 단단합니다.' + BR +
                            '올라오는 내내, 누가 위에서 내려다보고 있는 것 같았습니다. 올라와 보니 아무도 없었습니다.', next:afterScene };
          } },
          { label:'세어 보고 그냥 올라온다', onPick:function(){
              applyEffect({ clue:'marydrown', sanity:-2 });
              return { text:'겹을 세다가 그만둡니다. 세는 일 자체가 견디기 어려워졌습니다.' + BR +
                            '1847년, 열한 살짜리를 여기서 내려보냈습니다. 그리고 그 뒤로 누군가 꽃을 갈아 왔습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'we_night', when:function(){ return isNight() && hasClue('marydrown'); }, run:function(){
      showNarrativeBeat('우물가의 밤',
        '밤의 우물가는 고요합니다. 풀벌레 소리도 없습니다.' + BR +
        '우물 안쪽에서 아주 희미하게, 아이가 숨을 참았다 쉬는 것 같은 소리가 규칙적으로 올라옵니다.' + BR +
        '들여다볼 수도 있습니다. 그러지 않을 수도 있습니다. 어느 쪽이든 그 소리는 내일도 거기 있을 것입니다.',
        function(){ applyEffect({ sanity:-1 }); afterScene(); }, { place:LOC.well.place });
    } }
  ],

  /* ---------------- 등대 ---------------- */
  lighthouse: [
    { id:'l_silas', run:function(){
      showChoiceEncounter({
        title:'등대지기 사일러스', place:LOC.lighthouse.place, art:'npc-silas',
        text:'사일러스가 문 앞에서 당신을 막습니다. 목에 건 목걸이가 옷깃 밖으로 삐져나와 있는데, 돌에 새겨진 문양이 낯섭니다. 물고기 같기도 하고, 눈 같기도 합니다.',
        choices:[
          { label:'카터 교수에 대해 캐묻는다', onPick:function(){
              showDiceEncounter({
                title:'등대지기 사일러스', place:LOC.lighthouse.place,
                text:'그의 눈을 똑바로 보며 다그칩니다.',
                target:7, mods:obsMods(),
                onSuccess:function(){
                  applyEffect({ clue:'signal', watch:1 });
                  return { text:'그의 얼굴에서 핏기가 가십니다.' + BR +
                                '"교단이… 그를 데려갔소."' + BR +
                                '그 말만 남기고 문을 닫습니다. 안에서 빗장 거는 소리가 세 번 났습니다.', next:afterScene };
                },
                onFail:function(){
                  var loss = rollSmall(3);
                  applyEffect({ sanity:-loss, watch:1 });
                  return { text:'그는 완강히 입을 다물고 문을 닫아버립니다. (정신력 −'+loss+')', next:afterScene };
                }
              });
              return null;
          } },
          { label:'시선을 피해 등대 안으로 숨어든다', onPick:function(){
              applyEffect({ health:-1, item:'match', flag:'foundPassage' });
              return { text:'가파른 계단에서 발을 헛디딜 뻔합니다. 창고에서 낡은 성냥갑을 챙기다가, 바닥에 난 철문을 발견합니다. 해안 동굴 쪽으로 내려가는 통로입니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'l_lens', when:function(){ return state.seen['l_silas']; }, run:function(){
      showDiceEncounter({
        title:'등명기 앞에서', place:LOC.lighthouse.place,
        text:'등대 꼭대기. 거대한 렌즈가 천천히 돕니다. 렌즈를 받치는 틀에 누군가 손댄 흔적이 있습니다.',
        target:7, mods:obsMods(),
        onSuccess:function(){
          applyEffect({ clue:'signal', sanity:-1 });
          if(hasItem('gun')) state.ammo += 2;
          return { text:'각도 조절 나사가 아래로 꺾여 고정되어 있습니다. 이 각도로는 바다가 아니라 육지를 비춥니다.' + BR +
                        '누군가 일부러, 그리고 꽤 오래전에 이렇게 만들어 놓았습니다.' + (hasItem('gun') ? ' 공구함에서 탄약 두 발도 나옵니다.' : ''), next:afterScene };
        },
        onFail:function(){
          applyEffect({ health:-1, watch:1 });
          return { text:'렌즈 틀을 만지다 손을 벱니다. 아래층에서 사일러스가 올라오는 소리가 들려 서둘러 내려옵니다.', next:afterScene };
        }
      });
    } },
    { id:'l_confess', when:function(){ return state.day <= 8 && hasClue('signal') && state.seen['l_lens']; }, run:function(){
      showChoiceEncounter({
        title:'사일러스의 고백', place:LOC.lighthouse.place, art:'npc-silas',
        text:'문을 두드리자, 이번에는 그가 순순히 엽니다. 술 냄새가 납니다. 목걸이는 탁자 위에 놓여 있습니다.' + BR +
             '"알고 온 거 아니오." 그가 말합니다. "불을 켜는 건 나요."',
        choices:[
          { label:'"왜 켭니까?"', onPick:function(){
              applyEffect({ clue:'silas', sanity:-1 });
              logLine('사일러스가 등대의 불에 대해 털어놓았다.');
              return { text:'"안 켜면 등대를 무너뜨린다고 했으니까." 그가 잔을 비웁니다. "그것들도 아무 때나 오는 게 아니오. 그믐밤, 물이 가장 많이 빠지는 그 한 시간. 그때뿐이오."' + BR +
                            '"백 년에 한 번은 더 크게 오지만. 올해가 그 해요."', next:afterScene };
          } },
          { label:'"그믐밤에는 켜지 마시오."', onPick:function(){
              applyEffect({ clue:'silas', flag:'silasPromise', sanity:1 });
              logLine('사일러스가 그믐밤에 불을 켜지 않기로 했다.');
              return { text:'그가 오래 당신을 봅니다. "…그러면 나는 죽소."' + BR +
                            '잠시 후, 그가 고개를 끄덕입니다. "그래도 켜지 않으리다. 대신 그 밤엔 여기 오지 마쇼. 무너질 테니까."' + BR +
                            '그의 말투에는 두려움보다 후련함이 있었습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'l_dead', when:function(){ return state.day >= 9 && !state.seen['l_confess']; }, run:function(){
      showChoiceEncounter({
        title:'꺼지지 않는 불', place:LOC.lighthouse.place, art:'npc-silas',
        text:'등대 문이 열려 있습니다. 사일러스는 등명기 앞에 앉은 채로, 렌즈를 마주 보고 있습니다. 며칠 되었습니다.' + BR +
             '그의 손에는 아직 성냥이 쥐여 있습니다.',
        choices:[
          { label:'그의 물건을 살핀다', onPick:function(){
              applyEffect({ sanity:-2, clue:'silas' });
              logLine('사일러스는 이미 늦었다.');
              return { text:'탁자에 적다 만 쪽지가 있습니다.', next:afterScene,
                       doc:['사일러스의 쪽지', '그믐밤, 물이 가장 많이 빠지는 한 시간. 그때뿐이다.\n나는 그때까지 못 버티겠다.\n\n불은 켜두고 간다. 안 켜면 저들이 등대를 무너뜨릴 테니.'] };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 해안 동굴 ---------------- */
  cave: [
    { id:'v_ritual', when:function(){ return !hasItem('page'); }, run:function(){
      showChoiceEncounter({
        title:'해안 동굴', place:LOC.cave.place,
        text:(state.flags.foundPassage
          ? '등대 지하 통로를 통해 은밀히 접근합니다. 흔들리는 횃불 사이로 두건을 쓴 사람들이 보입니다.'
          : '파도 소리에 사람의 목소리가 섞여 있습니다. 절벽을 따라 내려가자 동굴 입구가 나오고, 안쪽에서 횃불 빛이 흔들립니다.') + BR +
          '두건을 쓴 사람들이 원을 그리고 서 있습니다. 스무 명 남짓. 그중 몇은 낮에 광장에서 본 얼굴입니다.' + BR +
          '바닥에 종이 한 장이 떨어져 있습니다. 급히 넘기다 찢어진 듯, 가장자리가 불규칙합니다.',
        choices:[
          { label:'끝까지 지켜본 뒤 종이를 줍는다', note:'정신력 -2 · 저들이 무엇을 외는지 알게 된다', onPick:function(){
              applyEffect({ sanity:-2, clue:['ritual','phrase'], item:'page' });
              return { text:'그들이 낮은 목소리로 같은 구절을 반복합니다. "잠든 것은 죽은 것이 아니며, 깨어남은 끝이 아니라 시작이니."' + BR +
                            '외우고 나서야 물러나 종이를 집습니다. 손에 닿은 종이가 축축합니다.' + BR +
                            '거기 적힌 글자는 어느 언어도 아니었지만, 이상하게도 읽을 수 있었습니다. 읽는 순간 입 안에서 쇠 맛이 났습니다.', next:afterScene,
                       doc:['찢겨나간 페이지', '느가 프타른 이아 크나아'] };
          } },
          { label:'종이만 집고 곧바로 물러난다', note:'주시 +1 · 성가는 못 듣는다', onPick:function(){
              applyEffect({ sanity:-1, clue:'phrase', item:'page', watch:1 });
              return { text:'손을 뻗어 종이를 끌어당깁니다. 자갈이 작게 무너지고, 횃불 하나가 이쪽으로 돌아섭니다.' + BR +
                            '뒤도 안 돌아보고 절벽을 기어오릅니다. 종이는 손에 있습니다. 저들이 무엇을 외고 있었는지는 끝내 듣지 못했습니다.', next:afterScene,
                       doc:['찢겨나간 페이지', '느가 프타른 이아 크나아'] };
          } }
        ]
      });
    } },
    { id:'v_deep', repeat:true, when:function(){ return hasClue('ritual') && !hasClue('marks') && state.day >= 5; }, run:function(){
      showDiceEncounter({
        title:'물이 빠진 굴', place:LOC.cave.place,
        text:'물때가 맞아 동굴 안쪽이 드러났습니다. 사람 손으로 다듬은 통로가 숲 쪽으로 이어집니다.',
        target:6, mods:obsMods(),
        extra:[{ label:'불빛', value:hasItem('match') ? 1 : 0 }].concat(retryMod('v_deep')),
        onSuccess:function(){
          applyEffect({ clue:'marks', sanity:-1 });
          return { text:'통로 끝은 숲 한가운데로 이어집니다. 나오는 길목의 나무마다 같은 표식이 새겨져 있습니다.' + BR +
                        '표식을 따라가면 안개 속에서도 제단까지 갈 수 있습니다.' + BR + '— 제단으로 가는 길이 열렸습니다.', next:afterScene };
        },
        onFail:function(){
          applyEffect({ health:-1, sanity:-1 });
          noteFail('v_deep');
          return { text:'물이 다시 차오르기 시작합니다. 허리까지 잠긴 채 되돌아 나오는 동안, 발목을 스치는 것이 몇 번이나 있었습니다.', next:afterScene };
        }
      });
    } },
    { id:'v_gilman', when:function(){ return state.day >= 8 && hasClue('ritual'); }, run:function(){
      showNarrativeBeat('리허설',
        '오늘 밤의 동굴은 사람이 훨씬 많습니다. 두건을 쓰지 않은 사람도 섞여 있습니다. 구경하러 온 것이 아니라, 배우러 온 얼굴들입니다.' + BR +
        '맨 앞에서 길먼이 구절을 선창합니다. 틀리는 사람이 있으면 다시 시킵니다.' + BR +
        '그믐밤을 위한 연습입니다. 그들은 준비가 끝나가고 있습니다.',
        function(){ applyEffect({ sanity:-1, clue:'procession' }); afterScene(); }, { place:LOC.cave.place });
    } }
  ],

  /* ---------------- 예배당 ---------------- */
  chapel: [
    { id:'c_journal', run:function(){
      showChoiceEncounter({
        title:'낡은 예배당', place:LOC.chapel.place,
        text:'마을 외곽, 오래전 버려졌다던 예배당에 불빛이 새어 나옵니다. 안에서 낮은 대화 소리와 종이 넘기는 소리가 들립니다.',
        choices:[
          { label:'뒤쪽으로 숨어든다', onPick:function(){
              applyEffect({ health:-1, item:'cross', clue:'journal' });
              return { text:'제단 뒤에서 낯익은 수첩을 발견합니다. 카터의 것입니다. 갈피에서 은제 십자가 하나가 떨어집니다.', next:afterScene,
                       doc:['엘든 카터의 수첩', '9월 3일 — 그저 오래된 미신이라 생각했다.\n9월 11일 — 그들의 말이 자꾸 맞아떨어진다.\n9월 19일 — 더는 예전으로 돌아갈 수 없을 것 같다. 그래도 상관없다.'] };
          } },
          { label:'정면으로 걸어 들어가 신도인 척한다', onPick:function(){
              if(Math.random() < 0.5){
                applyEffect({ clue:'ritual' });
                return { text:'한 신도가 아무 의심 없이 자리를 내줍니다. 낮게 반복되는 구절을 외울 때까지 듣고 나옵니다.', next:afterScene };
              }
              var loss = rollSmall(4) + 1;
              applyEffect({ sanity:-loss, watch:2 });
              return { text:'말투에서 위화감을 느낀 신도들이 일어섭니다. (정신력 −'+loss+')', next:function(){
                startChase(afterScene, { foe:PURSUERS.cult, title:'예배당', place:LOC.chapel.place });
              } };
          } }
        ]
      });
    } },
    { id:'c_pulpit', when:function(){ return state.seen['c_journal'] && !hasItem('page'); }, run:function(){
      showChoiceEncounter({
        title:'설교단의 잠긴 서랍', place:LOC.chapel.place,
        text:'설교단 아래 서랍이 잠겨 있습니다. 나무가 낡아 어떻게든 열 수는 있을 것 같습니다.' + BR +
             '안에서 종이 냄새가 납니다. 오래되고 축축한, 동굴에서 맡았던 것과 같은 냄새입니다.',
        choices:[
          { label:'경첩째 부순다', note:'소리가 크다 · 주시 +2', onPick:function(){
              applyEffect({ item:'page', clue:'phrase', watch:2, sanity:-1 });
              return { text:'나무가 갈라지는 소리가 예배당 전체에 울립니다. 서랍 안에 의식서에서 찢겨나간 페이지 한 장이 들어 있습니다.' + BR +
                            '집어 드는 순간 종이가 축축합니다. 읽는 순간 입 안에서 쇠 맛이 납니다.', next:afterScene,
                       doc:['찢겨나간 페이지', '느가 프타른 이아 크나아'] };
          } },
          { label:'철사를 구부려 조용히 따낸다', note:'시간이 걸린다 · 체력 -1', onPick:function(){
              applyEffect({ item:'page', clue:'phrase', health:-1, sanity:-1 });
              return { text:'손끝이 까질 때까지 매달린 끝에 걸쇠가 물러납니다. 아무도 오지 않았습니다.' + BR +
                            '서랍 안에 의식서에서 찢겨나간 페이지 한 장. 읽는 순간 입 안에서 쇠 맛이 납니다.', next:afterScene,
                       doc:['찢겨나간 페이지', '느가 프타른 이아 크나아'] };
          } }
        ]
      });
    } },
    { id:'c_ossuary', when:function(){ return state.seen['c_journal'] && state.day >= 4; }, run:function(){
      showDiceEncounter({
        title:'예배당 납골당', place:LOC.chapel.place,
        text:'제단 옆 좁은 계단이 지하로 이어집니다. 벽을 따라 관이 층층이 놓여 있고, 각 관에는 연도가 적혀 있습니다.',
        target:6, mods:obsMods(), extra:[{ label:'불빛', value:hasItem('match') ? 1 : 0 }],
        onSuccess:function(){
          applyEffect({ clue:'bones', sanity:-1 });
          return { text:'연도를 따라가며 관을 세어 봅니다. 1827년, 1927년. 그 두 해 근처에서만 관이 비어 있습니다.' + BR +
                        '비어 있는 관의 수가, 두 번 다 정확히 같습니다. 누군가 백 년째 셈을 맞춰 오고 있습니다.', next:afterScene };
        },
        onFail:function(){
          applyEffect({ sanity:-2 });
          return { text:'불도 없이 내려간 것이 잘못이었습니다. 어둠 속에서 무언가에 손이 닿았고, 그것은 관 속에 있어야 할 것이 아니었습니다.', next:afterScene };
        }
      });
    } },
    { id:'c_carter', when:function(){ return !!state.flags.carterFindable; }, run:function(){
      showChoiceEncounter({
        title:'재회', place:'예배당 뒷마당 · 다섯째 날 이후', art:'npc-carter',
        text:'그는 담에 기대 서 있었습니다. 코트는 그대로인데 단추가 하나도 채워져 있지 않고, 안경이 없습니다. 엘든 카터는 안경 없이는 걸음도 못 떼는 사람이었습니다.' + BR +
             '"드디어… 왔군."' + BR +
             '목소리는 그대로였습니다. 눈은 아니었습니다.' + BR + state.char.meetCarter,
        choices:[
          { label:'함께 나가자고 설득한다', note:'그에게 아직 남은 것이 있다면', onPick:function(){
              applyEffect({ sanity:-2, flag:'carterMet' });
              state.flags.carterPersuaded = true;
              logLine('카터를 설득하려 했다.');
              return { text:'그가 고개를 젓습니다. "나는 못 가네. 자격이 없어서 못 가는 게 아니라, 이젠 갈 데가 없어서 그래."' + BR +
                            '"그래도 자네가 그날 밤 부른다면, 나는 들을 걸세."' + BR +
                            '돌아서는 당신의 등 뒤로 그가 한마디를 덧붙입니다. "내가 부른 게 아니야. 나도… 불려온 거였어."', next:afterScene };
          } },
          { label:'무엇을 알아냈는지 묻는다', onPick:function(){
              applyEffect({ sanity:-1, clue:'carterfate', flag:'carterMet' });
              logLine('카터에게서 의식의 순서를 들었다.');
              return { text:'"순서가 중요하네." 그가 말라붙은 목소리로 읊습니다. "물이 가장 많이 빠질 때, 아래 것을 먼저 꺼내고, 그다음에 구절이야."' + BR +
                            '"그리고 값이 맞아야 하네. 나는 그걸 몰랐어."' + BR + '그러고는 웃습니다. "그래서 이 꼴일세."', next:afterScene };
          } },
          { label:'그가 지닌 낡은 권총을 빼앗는다', note:'그의 마지막 소지품', weighty:true, onPick:function(){
              applyEffect({ item:'gun', sanity:-1, flag:'carterMet' });
              state.ammo += 3;
              state.flags.carterGunTaken = true;
              logLine('카터의 권총을 가져왔다.');
              return { text:'코트 주머니에서 삐져나온 총을 빼냅니다. 그는 저항하지 않습니다.' + BR +
                            '"…그건 나한테 필요한 거였는데." 그가 말합니다. 원망은 아니었습니다. 확인에 가까웠습니다.' + BR +
                            '"뭐, 가져가게. 자네가 가진 게 그거라도 있어야 하니."', next:afterScene };
          } }
        ]
      });
    } }
  ],

  /* ---------------- 숲길 ---------------- */
  forest: [
    { id:'f_first', run:function(){
      showChoiceEncounter({
        title:'안개 낀 숲길', place:LOC.forest.place,
        text:'안개가 유난히 짙은 숲길. 저 멀리서 낮은 울음소리가 들려옵니다. 짐승의 것은 아닙니다.' + BR +
             '소리 쪽으로 등불 몇 개가 줄지어 움직입니다. 두건을 쓴 이들입니다.',
        choices:[
          { label:'바짝 붙어 뒤쫓는다', note:'정신력 -2 · 길까지 알아낸다', onPick:function(){
              applyEffect({ sanity:-2, clue:['procession','marks'] });
              return { text:'숨을 죽이고 행렬 꼬리에 붙습니다. 걸음에 망설임이 없습니다. 저들은 길을 외우고 있습니다.' + BR +
                            '뒤쫓는 동안 알아챘습니다. 저들은 나무 밑동의 표식을 보고 걷습니다. 같은 모양이 일정한 간격으로 이어집니다.' + BR +
                            '맨 끝의 한 사람이 뒤를 돌아보았을 때, 당신은 나무 뒤에 있었습니다. 아슬아슬했습니다.' + BR +
                            '— 제단으로 가는 길이 열렸습니다.', next:afterScene };
          } },
          { label:'멀찍이서 지켜보기만 한다', note:'안전하다 · 길은 다음에', onPick:function(){
              applyEffect({ sanity:-1, clue:'procession' });
              return { text:'등불이 안개 속으로 사라질 때까지 지켜봅니다. 저들은 같은 방향으로, 망설임 없이 걸어갔습니다.' + BR +
                            '어떻게 길을 찾는지는 보지 못했습니다. 다음에 저들이 지나간 자리를 되짚어 보면 알 수 있을 것입니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'f_marks', when:function(){ return hasClue('procession') && !hasClue('marks'); }, run:function(){
      showChoiceEncounter({
        title:'나무의 표식', place:LOC.forest.place,
        text:'행렬이 지나간 자리를 되짚어 봅니다. 나무 밑동마다 같은 모양이 새겨져 있습니다.' +
             (state.flags.knowElias ? BR + '서약서 끝에 서명 대신 그려져 있던 표식과 같은 것입니다. 길을 낸 사람과 약속을 맺은 사람이 같습니다.' : ''),
        choices:[
          { label:'하나씩 세며 끝까지 따라간다', note:'반나절이 더 든다 · 체력 -1', onPick:function(){
              applyEffect({ clue:'marks', health:-1 });
              return { text:'표식은 일정한 간격으로 이어집니다. 끝까지 따라가 보고서야 확신이 섭니다. 이제 안개 속에서도 제단에 닿을 수 있습니다.' + BR +
                            '— 제단으로 가는 길이 열렸습니다.', next:afterScene };
          } },
          { label:'행렬이 밟은 자국을 따라간다', note:'빠르다 · 주시 +1', onPick:function(){
              applyEffect({ clue:'marks', watch:1, sanity:-1 });
              return { text:'젖은 땅에 눌린 자국을 따라가니 훨씬 빠릅니다. 표식과 자국이 같은 길로 이어집니다.' + BR +
                            '다만 그들도 같은 자국을 봅니다. 돌아 나오는 길에 새 발자국이 당신 것 위에 겹쳐 있었습니다.' + BR +
                            '— 제단으로 가는 길이 열렸습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'f_cabin', when:function(){ return state.day >= 5; }, run:function(){
      showChoiceEncounter({
        title:'사냥꾼의 오두막', place:LOC.forest.place,
        text:'숲 안쪽에 버려진 오두막이 있습니다. 문은 안쪽에서 잠겨 있었고, 창으로 들여다보니 오래 비어 있던 것 같습니다.',
        choices:[
          { label:'문을 부수고 들어간다', note:'체력 -1', onPick:function(){
              applyEffect({ health:-1 });
              if(!hasItem('gun')){
                addItem('gun'); state.ammo += 4;
                return { text:'벽에 걸린 엽총은 녹슬어 못 쓰지만, 침상 아래 상자에 낡은 권총과 탄약 네 발이 있습니다.' + BR +
                              '주인은 문을 잠근 채 나가지 않았고, 그 뒤로 돌아오지 않았습니다.', next:afterScene };
              }
              state.ammo += 3; addItem('bandage');
              return { text:'침상 아래 상자에서 탄약 세 발과 붕대를 챙깁니다. 주인은 문을 잠근 채 나가지 않았고, 그 뒤로 돌아오지 않았습니다.', next:afterScene };
          } },
          { label:'벽에 적힌 것을 읽는다', onPick:function(){
              applyEffect({ sanity:-1, clue:'procession' });
              return { text:'안쪽 벽에 못으로 긁어 쓴 글씨가 빼곡합니다. 날짜와 숫자의 반복입니다. 그믐마다 숲을 지나간 사람의 수를 센 것입니다.' + BR +
                            '마지막 줄의 숫자가 가장 큽니다. 그리고 그 아래에는 "올해는 세지 않겠다"고 적혀 있습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'f_hunt', when:function(){ return state.day >= 8 && state.watch >= 3; }, run:function(){
      startChase(afterScene, {
        foe:PURSUERS.towns, title:'숲길의 사람들', place:LOC.forest.place,
        text:'안개 속에서 등불 몇 개가 다가옵니다. 마을에서 본 얼굴들입니다. 그들은 당신의 이름을 부릅니다.' + BR +
             '대답하지 않는 편이 나을 것 같습니다.'
      });
    } }
  ],

  /* ---------------- 제단 ---------------- */
  altar: [
    { id:'a_scout', when:function(){ return !state.flags.foundStone; }, run:function(){
      showChoiceEncounter({
        title:'숲속의 오래된 제단', place:LOC.altar.place,
        text:'표식을 따라가자 나무가 끊기고 공터가 나옵니다. 가운데에 낮은 돌 제단이 있습니다. 아직은 아무도 없습니다.' + BR +
             '가까이 서자 숨이 막힙니다. 돌에 손을 대면 손바닥으로 무언가의 박동 같은 것이 전해집니다.' + BR +
             '그래도 바닥을 살펴야 합니다. 백 년 전 사람이 남긴 것이 있다면 여기입니다.',
        choices:[
          { label:'무릎을 꿇고 손으로 바닥을 훑는다', note:'오래 걸린다 · 주시 +1', onPick:function(){
              applyEffect({ flag:'foundStone', watch:1, sanity:-1 });
              return { text:'한참을 더듬은 끝에 결이 다른 돌 하나를 찾아냅니다. 나중에 끼워 넣은 것이 아니라, 처음부터 꺼낼 수 있게 만들어 둔 것입니다.' + BR +
                            '공터를 나설 때, 숲 가장자리에서 누군가 지켜보다 돌아서는 기척이 있었습니다.', next:afterScene };
          } },
          { label:'성냥을 켜서 결을 비춰 본다', note:'불빛이 멀리 보인다 · 주시 +2', when:function(){ return hasItem('match'); }, onPick:function(){
              applyEffect({ flag:'foundStone', watch:2 });
              return { text:'성냥 하나로 충분했습니다. 돌 하나만 결이 가로로 누워 있습니다. 밀면 움직일 것 같습니다.' + BR +
                            '불빛은 숲 어디까지 갔을지 모릅니다.', next:afterScene };
          } },
          { label:'오늘은 물러난다', onPick:function(){
              applyEffect({ sanity:-1 });
              return { text:'서늘한 기운에 등을 돌립니다. 제단은 어디 가지 않습니다.', next:afterScene };
          } }
        ]
      });
    } },
    { id:'a_chamber', when:function(){ return !!state.flags.foundStone; }, run:function(){
      showChoiceEncounter({
        title:'제단 아래 석실', place:LOC.altar.place,
        text:'돌을 밀어내자 좁은 석실이 나옵니다. 그 안에 방수포로 싼 기록이 있습니다. 백 년 전, 첫 번째 관리자가 남긴 것입니다.' + (hasItem('key') ? BR + '마사가 준 열쇠는 석실 안쪽 쇠고리를 여는 데 쓰였습니다. 그녀가 백 년 동안 열지 못한 고리입니다.' : ''),
        doc:['일라이어스 휘트필드의 기록 · 1827',
             '내가 틀렸다는 것을 이제야 적는다. 늦었으나 적어야 한다.\n\n우리는 그것을 재우고 있다고 믿었다. 해마다 한 사람씩 바치면 그것이 다시 잠든다고. 그래서 나는 스물세 해 동안 그렇게 했다.\n\n그러나 그것은 잠든 적이 없다. 우리는 재운 것이 아니라 먹여온 것이다. 해마다 그것은 조금씩 더 커졌다.\n\n참된 봉인은 다르다. 그것은 아무나의 목숨을 받지 않는다. 계약을 맺은 피, 관리자 자신의 것이라야 한다.\n\n나는 그것을 알고도 하지 못했다. 대신 남의 아이를 보냈다.\n\n내 뒤에 오는 자가 이것을 읽는다면, 나보다 낫기를 바란다. 그러나 나는 안다. 읽고도 하지 못할 것이다. 나도 그랬으니까.'],
        choices:[
          { label:'끝까지 읽는다', weighty:true, onPick:function(){
              applyEffect({ clue:'blood', sanity:-3 });
              logLine('일라이어스의 기록을 읽었다.');
              return { text:'백 년간의 제물은 아무것도 막지 못했습니다. 시간을 샀을 뿐이고, 그 이자가 지금 청구되고 있는 것입니다.' + BR +
                            '그리고 엘든이 왜 제 발로 걸어 들어갔는지도 이제 알 수 있습니다. 그는 이 기록을 먼저 읽었던 것입니다.' + BR +
                            '다만 그는 휘트필드가 아니었습니다. 의식은 성립하지 않았고, 그래서 그는 봉인되지도 죽지도 못한 채 그냥 잡아먹히는 중입니다.' + BR +
                            '— 핵심 단서 확보: 계약을 맺은 피 (자격)', next:afterScene };
          } }
        ]
      });
    } },
    { id:'a_early', repeat:true, quiet:true, when:function(){ return state.day < LAST_DAY; }, run:function(){
      var lines = ['제단은 비어 있습니다. 낮에는 그저 이끼 낀 돌무더기처럼 보입니다.'];
      if(ritualReady()){
        var ready = bearers().filter(function(b){ return b.ready && b.id !== 'self'; });
        lines.push(ready.length
          ? '준비는 끝났습니다. 그믐밤에 여기로 오면 됩니다. 그리고 그날 밤, 누가 걸어 들어갈지를 당신이 말해야 합니다.'
          : '구절도 때도 자격도 압니다. 다만 그 자격을 가진 사람 중 누구도 아직 걸어 들어갈 준비가 되어 있지 않습니다.');
      }
      else if(hasClue('blood')) lines.push('무엇이 값인지는 압니다. 아직 언제인지, 혹은 무슨 말을 해야 하는지 모릅니다.');
      else lines.push('아래에 무언가 있다는 것은 알겠는데, 무엇을 해야 하는지는 아직 모릅니다.');
      showChoiceEncounter({
        title:'숲속의 오래된 제단', place:LOC.altar.place,
        text:lines.join(BR),
        choices:[
          { label:'주변을 더 살핀다', onPick:function(){
              applyEffect({ sanity:-1 });
              if(hasItem('gun') && state.ammo < 6) state.ammo += 1;
              return { text:'공터 가장자리를 한 바퀴 돕니다. 나무마다 오래된 흠집이 있습니다. 사람 손이 닿는 높이입니다.', next:afterScene };
          } },
          { label:'지금 구절을 외워 본다', when:function(){ return hasItem('page'); }, note:hasClue('timing') ? '때가 아니라는 것을 안다' : '해 봐야 알 것 같다', onPick:function(){
              if(hasClue('timing')){
                applyEffect({ sanity:-1 });
                return { text:'첫 음절을 내뱉다 멈춥니다. 오늘은 그믐이 아닙니다. 지금 이 말을 끝까지 하면, 그저 저쪽에 이쪽을 알리는 일이 될 뿐입니다.', next:afterScene };
              }
              applyEffect({ sanity:-3, watch:2 });
              return { text:'구절을 끝까지 외웁니다. 아무 일도 일어나지 않습니다.' + BR +
                            '아니, 한 가지는 일어났습니다. 숲 저쪽에서 무언가가 이쪽을 향해 방향을 틀었습니다.', next:function(){
                startChase(afterScene, { foe:PURSUERS.thing, title:'제단', place:LOC.altar.place });
              } };
          } },
          { label:'물러난다', onPick:function(){ return { text:'등을 돌려 숲길로 내려갑니다.', next:afterScene }; } }
        ]
      });
    } }
  ]
};

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
