const ACTIVE_LIMIT=10;
const STARTING_HEARTS=5;
const MAX_HEARTS=10;
const SAVE_KEY='spellQuestMasteryV1';
const TRIALS=[
  {name:'Rune Path',reward:1},
  {name:'Fading Script',reward:2},
  {name:'Voice Trial',reward:3}
];
const SPANISH=new Set(['empresa','abrigo','nevera','tal vez','volver']);
const PLACE_FIRST=['Whispering','Silver','Crooked','Riddle','Thorn','Mirror','Moonlit','Shadow','Twin','Golden','Crystal','Emerald'];
const PLACE_LAST=['Gate','Meadow','Bridge','Woods','Keep','Caves','Stage','Fen','Towers','Library','Hall','Sanctum'];
const state={active:[],queue:[],mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:ACTIVE_LIMIT,stars:0,streak:0,hearts:STARTING_HEARTS,storyVictories:0,storyJournal:[],narrativeVersion:NARRATIVE_VERSION,campaignWords:[...WORD_BANK],pendingVictory:null,interlude:false,migrationRecap:false,recapThrough:0,attempts:{},answer:'',locked:false,lastMastered:false,visitFailed:false,hintUsed:false};
const $=id=>document.getElementById(id);
const shuffle=array=>[...array].sort(()=>Math.random()-.5);
const isLetter=character=>/^[A-Za-zÀ-ÿ]$/.test(character);
const hashWord=word=>[...word].reduce((hash,character)=>((hash*31)+character.charCodeAt(0))>>>0,2166136261);
const placeFor=word=>{const hash=hashWord(word),target=word.toLocaleLowerCase();for(let offset=0;offset<PLACE_FIRST.length*PLACE_LAST.length;offset++){const place=`${PLACE_FIRST[(hash+offset)%PLACE_FIRST.length]} ${PLACE_LAST[(Math.floor(hash/13)+offset)%PLACE_LAST.length]}`;if(!place.toLocaleLowerCase().includes(target))return place;}return 'Hidden Sanctuary';};
const jewelHue=word=>hashWord(word)%360;

function freshState(){
  return {active:WORD_BANK.slice(0,ACTIVE_LIMIT),queue:WORD_BANK.slice(ACTIVE_LIMIT),mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:Math.min(ACTIVE_LIMIT,WORD_BANK.length),stars:0,streak:0,hearts:STARTING_HEARTS,storyVictories:0,storyJournal:[],narrativeVersion:NARRATIVE_VERSION,campaignWords:[...WORD_BANK],pendingVictory:null,interlude:false,migrationRecap:false,recapThrough:0,attempts:{}};
}
function reconcileSave(saved){
  const roster=Array.isArray(saved.campaignWords)&&saved.campaignWords.length?saved.campaignWords.filter(word=>typeof word==='string'&&word.length):WORD_BANK;
  const known=new Set(roster), seen=new Set();
  const clean=list=>(Array.isArray(list)?list:[]).filter(word=>known.has(word)&&!seen.has(word)&&seen.add(word));
  const mastered=clean(saved.mastered), active=clean(saved.active), queue=clean(saved.queue);
  queue.push(...roster.filter(word=>!seen.has(word)));
  while(active.length<ACTIVE_LIMIT&&queue.length)active.push(queue.shift());
  const chapterStart=Number.isInteger(saved.chapterStart)?saved.chapterStart:Math.floor(mastered.length/ACTIVE_LIMIT)*ACTIVE_LIMIT;
  const chapterTarget=Number.isInteger(saved.chapterTarget)?saved.chapterTarget:Math.min(ACTIVE_LIMIT,WORD_BANK.length-chapterStart);
  return {...freshState(),...saved,campaignWords:[...roster],narrativeVersion:NARRATIVE_VERSION,pendingVictory:saved.narrativeVersion===NARRATIVE_VERSION?saved.pendingVictory||null:null,interlude:saved.narrativeVersion===NARRATIVE_VERSION&&Boolean(saved.interlude),migrationRecap:saved.narrativeVersion!==NARRATIVE_VERSION||Boolean(saved.migrationRecap),hearts:Number.isInteger(saved.hearts)?Math.max(0,Math.min(MAX_HEARTS,saved.hearts)):STARTING_HEARTS,storyVictories:Number.isSafeInteger(saved.storyVictories)&&saved.storyVictories>=0?saved.storyVictories:0,storyJournal:Array.isArray(saved.storyJournal)?saved.storyJournal.filter(entry=>entry&&typeof entry.heading==='string'&&typeof entry.text==='string').slice(-60):[],mastered,active,queue,cursor:active.length?Math.min(saved.cursor||0,active.length-1):0,chapterStart,chapterTarget,progress:saved.progress||{},attempts:saved.attempts||{}};
}
function readSave(){
  if(window.QUEST_CLOUD)return null;
  try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(!saved||!Array.isArray(saved.active))return null;
    const result=reconcileSave(saved);result.storyVictories=storyPosition(result);
    result.recapThrough=saved.narrativeVersion!==NARRATIVE_VERSION?result.storyVictories:(saved.recapThrough||0);return result;
  }catch{return null;}
}
let loadedSave=readSave();
function save(){if(window.QUEST_CLOUD)return;localStorage.setItem(SAVE_KEY,JSON.stringify({active:state.active,queue:state.queue,mastered:state.mastered,progress:state.progress,cursor:state.cursor,chapterStart:state.chapterStart,chapterTarget:state.chapterTarget,stars:state.stars,streak:state.streak,hearts:state.hearts,campaignWords:state.campaignWords,narrativeVersion:state.narrativeVersion,pendingVictory:state.pendingVictory,interlude:state.interlude,migrationRecap:state.migrationRecap,recapThrough:state.recapThrough,storyVictories:state.storyVictories,storyJournal:state.storyJournal,attempts:state.attempts}));}
function currentWord(){return state.active[state.cursor];}
function currentTier(){return state.progress[currentWord()]||0;}
function normalize(value,caseSensitive=false){const cleaned=value.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();return caseSensitive?cleaned:cleaned.toLocaleLowerCase();}
function answerMatches(answer,word){return normalize(answer,word==='Mom'||word==='mom')===normalize(word,word==='Mom'||word==='mom');}

function begin(resume=false){
  if(window.Cloud)return Cloud.begin();
  Object.assign(state,resume&&loadedSave?loadedSave:freshState(),{answer:'',locked:false,lastMastered:false,visitFailed:false,hintUsed:false});
  $('intro').classList.add('hidden');$('ending').classList.add('hidden');$('game').classList.remove('hidden');
  renderCampaign();if(state.interlude){finishChapter();return;}if(state.pendingVictory){resumeVictory();return;}loadChallenge();
}
function renderCampaign(){
  $('mastered-count').textContent=`${state.mastered.length} / ${state.campaignWords.length}`;$('stars').textContent=state.stars;$('streak').textContent=state.streak;$('hearts').textContent=`${state.hearts} / ${MAX_HEARTS}`;
  $('hint-btn').disabled=state.locked||state.hearts===0||state.hintUsed;
  $('active-count').textContent=`${state.active.length} active`;$('queue-count').textContent=state.queue.length?`${state.queue.length} waiting`:'No words waiting';
  $('jewel-vault').innerHTML=state.mastered.length?state.mastered.map(word=>jewelMarkup(word,true)).join(''):'<p class="empty-vault">Rewards will appear here.</p>';
  const position=storyPosition(state),realmIndex=Math.min(11,Math.floor((state.pendingVictory?.boundary?Math.max(0,position-1):position)/93)),realm=STORY_REALMS[realmIndex];
  $('realm-name').textContent=currentWord()&&realm.name.toLocaleLowerCase().includes(currentWord().toLocaleLowerCase())?'Realm '+(realmIndex+1):realm.name;$('realm-progress').textContent='Realm '+(realmIndex+1)+' / 12 · '+Math.min(93,position-realmIndex*93)+' / 93';
  $('realm-objective').textContent=currentWord()&&realm.goal.toLocaleLowerCase().includes(currentWord().toLocaleLowerCase())?'Continue your journey':realm.goal;
  const art=document.querySelector('.quest-map-art'),map=REALM_MAPS[realmIndex];
  const challenge=document.querySelector('.challenge');
  challenge.dataset.realm=map.id;
  challenge.style.setProperty('--challenge-x',(realmIndex%4)*100/3+'%');
  challenge.style.setProperty('--challenge-y',Math.floor(realmIndex/4)*50+'%');
  art.dataset.map=map.id;
  art.style.setProperty('--realm-map','url("assets/'+map.id+'-map.webp")');
  const safeMapLabel=(label,fallback)=>currentWord()&&label.toLocaleLowerCase().includes(currentWord().toLocaleLowerCase())?fallback:label;
  const localPosition=Math.min(93,Math.max(0,position-realmIndex*93));
  const current=realm.beats[Math.min(92,localPosition)].sceneIndex;
  $('map-nodes').innerHTML=map.locations.map(([x,y,label],index)=>{
    const status=localPosition>=93||index<current?'visited':index===current?'current':'ahead';
    return '<button type="button" class="quest-node landmark '+status+'" data-index="'+index+'" style="--x:'+x+'%;--y:'+y+'%" aria-label="'+escapeHtml(safeMapLabel(label+', '+status,String(index+1)))+'"><span>'+(status==='visited'?'✓':index+1)+'</span></button>';
  }).join('');
  $('map-caption').textContent=safeMapLabel(map.locations[current][2]+' · '+(current+1)+' / 8',(current+1)+' / 8');
  document.querySelectorAll('.landmark').forEach(button=>button.onclick=()=>{
    const index=Number(button.dataset.index);
    $('map-caption').textContent=safeMapLabel(map.locations[index][2]+' · '+(index<current||localPosition>=93?'Visited':index===current?'You are here':'Ahead'),(index+1)+' / 8');
  });
  art.setAttribute('aria-label',safeMapLabel(realm.name+' story map with eight locations',String(realmIndex+1)));
  const rewards=unlockedRewards(position);$('party-rewards').textContent=rewards.length?rewards.map(label=>currentWord()&&label.toLocaleLowerCase().includes(currentWord().toLocaleLowerCase())?'◆':label).join(' · '):'Your journey begins';

  if(state.active.length){$('location-name').textContent=placeFor(currentWord());$('quest-note').textContent=`Trial ${currentTier()+1} of 3 · ${TRIALS[currentTier()].name}`;}
}
function escapeHtml(value){return value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
function jewelMarkup(word,labeled=false){return `<div class="jewel-win" style="--hue:${jewelHue(word)}" title="${escapeHtml(word)}"><div class="jewel"><span></span></div>${labeled?`<b>${escapeHtml(word)}</b>`:''}</div>`;}

function loadChallenge(){
  state.answer='';state.locked=false;state.lastMastered=false;state.visitFailed=false;state.hintUsed=false;
  const word=currentWord(),tier=currentTier(),trial=TRIALS[tier];
  document.querySelector('.challenge').dataset.trial=tier;
  $('audio-control').append($('audio-btn'));
  $('migration-note').classList.toggle('hidden',!state.migrationRecap);$('migration-note').textContent='Your earlier progress is safe. Open the journal for the new adventure’s recap.';
  $('feedback').textContent='';$('feedback').className='feedback';$('next-btn').classList.add('hidden');$('check-btn').classList.remove('hidden');
  $('hint-btn').classList.toggle('hidden',tier===2);$('hint-btn').disabled=state.hearts===0;$('audio-btn').classList.toggle('hidden',tier!==2);$('audio-btn').disabled=false;
  $('challenge-type').textContent=trial.name;$('round-count').textContent=`${state.mastered.length} victories won · ${state.queue.length} queued`;
  $('prompt-area').innerHTML=tier===2?'<p class="trial-kicker">Final mastery trial</p><h2>Listen and write</h2>':`<p class="trial-kicker">Trial ${tier+1} of 3</p><h2>${tier===0?'Rebuild the enchanted word':'Restore the faded word'}</h2>`;
  const definition=document.createElement('p');definition.className='word-definition';definition.textContent=WORD_DEFINITIONS[word]||'Listen carefully and recall this word from your earlier lessons.';$('prompt-area').querySelector('h2').after(definition);
  if(tier===0)renderRunePath(word);else if(tier===1)renderFadingScript(word);else renderVoiceTrial();
  if(window.Cloud)Cloud.restoreVisit();
}
function wordSlots(word,missingPositions){return [...word].map((character,position)=>missingPositions.has(position)?`<button class="slot" data-position="${position}" aria-label="Empty rune ${position+1}"></button>`:`<span class="fixed-slot">${character===' '?'&nbsp;':escapeHtml(character)}</span>`).join('');}
function assembledAnswer(word){const slots=new Map([...document.querySelectorAll('.slot')].map(slot=>[Number(slot.dataset.position),slot.textContent]));return [...word].map((character,position)=>slots.has(position)?slots.get(position):character).join('');}
function renderRunePath(word){
  const letterPositions=[...word].map((character,position)=>({character,position})).filter(item=>isLetter(item.character));
  $('answer-area').innerHTML=`<div class="slots">${wordSlots(word,new Set(letterPositions.map(item=>item.position)))}</div><div class="letter-bank" id="bank"></div>`;
  let runes=window.QUEST_CLOUD&&state.visit?state.visit.order.map(position=>({position,character:word[position]})):shuffle(letterPositions);const ordered=letterPositions.map(rune=>rune.character).join('');if(runes.length>1&&runes.map(rune=>rune.character).join('')===ordered)runes=[...runes.slice(1),runes[0]];
  runes.forEach(rune=>{const button=document.createElement('button');button.className='letter';button.textContent=rune.character;button.dataset.id=rune.position;button.onclick=()=>{if(state.locked)return;const slot=[...document.querySelectorAll('.slot')].find(candidate=>!candidate.textContent);if(!slot)return;slot.textContent=rune.character;slot.classList.add('filled');slot.classList.remove('wrong');slot.dataset.source=rune.position;button.classList.add('used');button.disabled=true;state.answer=assembledAnswer(word);};$('bank').appendChild(button);});
  document.querySelectorAll('.slot').forEach(slot=>slot.onclick=()=>{if(!slot.textContent||state.locked)return;const button=[...document.querySelectorAll('.letter')].find(candidate=>candidate.dataset.id===slot.dataset.source);button.classList.remove('used');button.disabled=false;slot.textContent='';slot.classList.remove('filled','wrong');state.answer=assembledAnswer(word);});
}
let fadingEntry=null;
function renderFadingScript(word){
  const eligible=[...word].map((character,position)=>({character,position})).filter(item=>isLetter(item.character));
  const missing=window.QUEST_CLOUD&&state.visit?state.visit.missing:shuffle(eligible).slice(0,Math.max(2,Math.ceil(eligible.length*.55))).map(item=>item.position).sort((a,b)=>a-b);
  $('answer-area').innerHTML='<div class="missing-word"></div><div id="voice-keyboard" class="voice-keyboard" role="group" aria-label="Answer keyboard"></div>';
  const line=document.querySelector('.missing-word'),slots=[];
  for(const [position,character] of [...word].entries()){
    const field=document.createElement(missing.includes(position)?'button':'span');
    if(missing.includes(position)){field.type='button';field.className='fading-slot';field.dataset.position=position;field.setAttribute('aria-label','Missing letter '+(slots.length+1));slots.push(field);}
    else field.textContent=character===' '?' ':character;
    line.append(field);
  }
  let selected=0;
  function select(index){selected=Math.max(0,Math.min(slots.length-1,index));slots.forEach((slot,i)=>{slot.classList.toggle('selected',i===selected);slot.setAttribute('aria-pressed',String(i===selected));});}
  function update(){const values=new Map(slots.map(slot=>[Number(slot.dataset.position),slot.textContent]));state.answer=slots.some(slot=>slot.textContent)?[...word].map((c,i)=>values.has(i)?values.get(i):c).join(''):'';}
  function put(character){if(state.locked||!isLetter(character))return;const slot=slots[selected];slot.textContent=character;slot.classList.remove('wrong');update();select(selected+1);}
  slots.forEach((slot,i)=>slot.onclick=()=>{if(!state.locked)select(i);});
  fadingEntry={hint(){const index=slots.findIndex(slot=>!slot.textContent);if(index>=0){select(index);put(word[Number(slots[index].dataset.position)]);}}};
  select(0);
  renderAnswerKeyboard({letter:put,backspace(){if(!slots[selected].textContent&&selected>0)select(selected-1);slots[selected].textContent='';slots[selected].classList.remove('wrong');update();},clear(){for(const slot of slots){slot.textContent='';slot.classList.remove('wrong');}select(0);update();}},false);
}
function renderVoiceTrial(){
  $('answer-area').innerHTML='<div class="voice-entry"><div id="spell-input" class="spell-input" role="status" aria-label="Your answer" aria-live="polite"></div><div id="voice-keyboard" class="voice-keyboard" role="group" aria-label="Answer keyboard"></div></div>';
  function update(){ $('spell-input').textContent=state.answer; }
  renderAnswerKeyboard({letter(c){state.answer+=c;update();},backspace(){state.answer=[...state.answer].slice(0,-1).join('');update();},clear(){state.answer='';update();}},true);
}
function renderAnswerKeyboard(actions,punctuation){
  let shifted=false;const keyboard=$('voice-keyboard'),letterButtons=[];
  function addKey(row,label,action){
    const button=document.createElement('button');button.type='button';button.className='voice-key';button.textContent=label;
    button.onclick=()=>{if(!state.locked)action();};row.append(button);return button;
  }
  for(const letters of ['qwertyuiop','asdfghjkl','zxcvbnm','áéíóúüñ']){
    const row=document.createElement('div');row.className='keyboard-row';keyboard.append(row);
    for(const letter of letters){const button=addKey(row,letter,()=>actions.letter(shifted?letter.toLocaleUpperCase():letter));button.dataset.character=letter;letterButtons.push(button);}
  }
  const row=document.createElement('div');row.className='keyboard-row keyboard-actions';keyboard.append(row);
  const shift=addKey(row,'Shift',()=>{shifted=!shifted;shift.setAttribute('aria-pressed',String(shifted));for(const button of letterButtons)button.textContent=shifted?button.dataset.character.toLocaleUpperCase():button.dataset.character;});shift.setAttribute('aria-pressed','false');
  if(punctuation){addKey(row,"'",()=>actions.letter("'")).setAttribute('aria-label','Apostrophe');addKey(row,'-',()=>actions.letter('-')).setAttribute('aria-label','Hyphen');addKey(row,'Space',()=>actions.letter(' '));}
  addKey(row,'⌫',actions.backspace).setAttribute('aria-label','Backspace');addKey(row,'Clear',actions.clear);
}
function speakWord(){
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){$('feedback').textContent='Audio is unavailable in this browser. Ask an adult to read the word aloud.';$('feedback').className='feedback try';return;}
  window.speechSynthesis.cancel();const utterance=new window.SpeechSynthesisUtterance(currentWord());utterance.rate=.78;utterance.pitch=1;utterance.lang=SPANISH.has(currentWord())?'es-US':'en-US';window.speechSynthesis.speak(utterance);$('audio-btn').classList.add('speaking');setTimeout(()=>$('audio-btn').classList.remove('speaking'),900);
}
function spendHeart(){const before=state.hearts;state.hearts=Math.max(0,state.hearts-1);save();renderCampaign();return before-state.hearts;}
function costText(spent){return spent?' −1 heart.':' No hearts left—keep trying to earn one back.';}
function hint(){
  if(window.Cloud)return Cloud.action('hint');
  if(state.locked||state.hintUsed||currentTier()===2||state.hearts===0)return;const word=currentWord();state.visitFailed=true;state.hintUsed=true;const spent=spendHeart();
  if(currentTier()===0){const first=[...document.querySelectorAll('.slot')].find(slot=>!slot.textContent);$('feedback').textContent=(first?`The next rune is “${word[Number(first.dataset.position)]}”.`:'All runes are placed.')+costText(spent);}
  else{fadingEntry.hint();$('feedback').textContent='One faded rune has returned.'+costText(spent);}
  $('feedback').className='feedback try';
}
function markSubmittedLetters(word){
  document.querySelectorAll('.slot, .fading-slot').forEach(field=>{const value=field.tagName==='INPUT'?field.value:field.textContent;field.classList.toggle('wrong',Boolean(value)&&!answerMatches(value,word[Number(field.dataset.position)]));});
}
function check(){
  if(window.Cloud)return Cloud.action('submit');
  if(state.locked)return;const before=storyPosition(state);const word=currentWord(),tier=currentTier();state.attempts[word]=(state.attempts[word]||0)+1;
  markSubmittedLetters(word);
  if(!answerMatches(state.answer,word)){state.streak=0;if(state.answer)state.visitFailed=true;const spent=state.answer?spendHeart():0;const retry=tier===2?'Not yet. Listen once more and try again.':'Not yet. Study the red letters and try once more.';$('feedback').textContent=state.answer?retry+costText(spent):'Build or type an answer first.';$('feedback').className='feedback try';renderCampaign();return;}
  state.locked=true;state.hearts=Math.min(MAX_HEARTS,state.hearts+1);
  if(state.visitFailed){state.streak=0;state.lastMastered=false;$('feedback').textContent=`Practice complete: “${word}” must return later for a clean first-try victory.`;}
  else if(tier<2){state.streak++;state.stars+=TRIALS[tier].reward;state.progress[word]=tier+1;$('feedback').textContent=tier===0?`“${word}” is ready for a harder trial.`:`One final Voice Trial remains for “${word}”.`;state.lastMastered=false;}
  else{state.streak++;state.stars+=TRIALS[tier].reward;state.mastered.push(word);state.active.splice(state.cursor,1);delete state.progress[word];if(state.queue.length)state.active.push(state.queue.shift());state.lastMastered=true;$('feedback').innerHTML=`<div class="victory-reveal">${jewelMarkup(word)}<div><strong>Victory at ${placeFor(word)}!</strong><small>“${escapeHtml(word)}” mastered · jewel earned</small></div></div>`;}
  const after=storyPosition(state),story=state.visitFailed?practicePassage():storyVictory(Math.max(before,after-1));
  state.storyVictories=after;
  state.pendingVictory={story,word,lastMastered:state.lastMastered,boundary:!state.visitFailed&&(Math.floor(before/93)!==Math.floor(after/93)||after===1116),practice:state.visitFailed};
  const passage=appendStory(story);

  $('feedback').append(document.createTextNode(state.hearts===MAX_HEARTS?' Hearts full!':' +1 heart.'));
  $('feedback').className='feedback good';$('check-btn').classList.add('hidden');$('next-btn').classList.remove('hidden');$('hint-btn').disabled=true;$('audio-btn').disabled=true;save();renderCampaign();passage.focus({preventScroll:true});passage.scrollIntoView?.({block:'center',behavior:'instant'});
}

function appendStory(story){
  const passage=document.createElement('section');passage.className='story-passage';passage.tabIndex=-1;passage.setAttribute('aria-label','Your adventure');
  const heading=document.createElement('h3');heading.textContent=story.heading;
  const sentence=document.createElement('p');sentence.textContent=story.text;
  passage.append(heading,sentence);$('feedback').prepend(passage);
  const journal=document.createElement('button');journal.type='button';journal.className='secondary story-journal';journal.textContent='Adventure journal';journal.onclick=()=>showJournal();
  $('feedback').append(journal);return passage;
}
function resumeVictory(){
  state.locked=true;state.lastMastered=state.pendingVictory.lastMastered;
  $('prompt-area').textContent='';$('answer-area').textContent='';$('feedback').textContent='';$('feedback').className='feedback good';
  $('hint-btn').classList.add('hidden');$('audio-btn').classList.add('hidden');$('check-btn').classList.add('hidden');$('next-btn').classList.remove('hidden');
  appendStory(state.pendingVictory.story);
}
function nextChallenge(){
  if(window.Cloud)return Cloud.action('continue');
  if(!state.locked)return;
  const boundary=state.pendingVictory?.boundary;state.lastMastered=state.pendingVictory?.lastMastered||false;state.locked=false;state.pendingVictory=null;
  if(state.active.length)state.cursor=state.lastMastered?state.cursor%state.active.length:(state.cursor+1)%state.active.length;
  if(boundary){state.interlude=true;save();finishChapter();return;}
  save();renderCampaign();loadChallenge();
}
function finishChapter(){
  window.speechSynthesis?.cancel?.();$('game').classList.add('hidden');$('ending').classList.remove('hidden');
  const position=storyPosition(state),complete=state.mastered.length===state.campaignWords.length,realm=STORY_REALMS[Math.max(0,Math.min(11,Math.floor((position-1)/93)))];
  $('ending-title').textContent=complete?'A kingdom free to change':realm.name+' restored';
  $('ending-copy').textContent=realm.summary+(complete?' Pip rests beside you as Tavi plans the journey home, and Cinder rises into a sky belonging to everyone.':' Your allies remain to protect what changed; the road ahead leads to '+STORY_REALMS[Math.min(11,realm.id+1)].name+'.');
  $('word-report').innerHTML=state.mastered.slice(-10).map(word=>jewelMarkup(word,true)).join('');
  $('replay-btn').textContent=complete?'Start a new campaign':'Enter next realm';if(window.QUEST_CLOUD&&complete){$('replay-btn').classList.add('hidden');}save();
}
function continueCampaign(){
  if(window.Cloud)return Cloud.action('enter');
  if(state.mastered.length===state.campaignWords.length){localStorage.removeItem(SAVE_KEY);loadedSave=null;begin(false);return;}
  state.interlude=false;save();$('ending').classList.add('hidden');$('game').classList.remove('hidden');renderCampaign();loadChallenge();
}
function showJournal(selectedRealm){
  const position=storyPosition(state),dialog=$('journal-dialog'),content=$('journal-content');content.textContent='';
  const add=(tag,text)=>{const el=document.createElement(tag);el.textContent=text;content.append(el);};
  add('p',state.migrationRecap?'Your spelling achievements are preserved. Earlier chapters below are a recap of the new narrative, not scenes you already played.':'Your discoveries and companions stay with you as the journey continues.');
  if(state.recapThrough)add('p','Passages 1–'+state.recapThrough+' were unlocked as a recap when your earlier spelling achievements moved into this story.');
  const rewards=unlockedRewards(position);add('p',rewards.length?'Journey rewards: '+rewards.join(' · '):'You carry an unlit blade into Briarwood.');
  for(const realm of STORY_REALMS){
    if(selectedRealm!==undefined&&selectedRealm!==realm.id)continue;
    const unlocked=Math.max(0,Math.min(93,position-realm.id*93));
    if(!unlocked){add('h3','Realm '+(realm.id+1)+' · Not yet reached');continue;}
    add('h3',realm.name+' · '+unlocked+' / 93');add('p',unlocked===93?realm.summary:realm.goal);
    const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Read unlocked passages';details.append(summary);
    for(const beat of realm.beats.slice(0,unlocked)){const p=document.createElement('p');p.textContent=beat.text;details.append(p);}content.append(details);
  }
  // Journal text is only in the DOM while this modal is open, not alongside active answer controls.
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute('open','');
}
$('journal-btn').onclick=()=>showJournal();
$('journal-close').onclick=()=>{const dialog=$('journal-dialog');if(dialog.close)dialog.close();else dialog.removeAttribute('open');$('journal-content').textContent='';state.migrationRecap=false;$('migration-note').classList.add('hidden');save();};
$('journal-dialog').addEventListener('close',()=>{$('journal-content').textContent='';});

if(loadedSave&&(loadedSave.mastered.length<loadedSave.campaignWords.length||loadedSave.pendingVictory||loadedSave.interlude))$('continue-btn').classList.remove('hidden');
$('start-btn').onclick=()=>begin(false);$('continue-btn').onclick=()=>begin(true);$('hint-btn').onclick=hint;$('audio-btn').onclick=speakWord;$('check-btn').onclick=check;$('next-btn').onclick=nextChallenge;$('replay-btn').onclick=continueCampaign;
document.addEventListener('keydown',event=>{if($('journal-dialog').hasAttribute('open'))return;if(event.target.closest?.('#voice-keyboard, .fading-slot'))return;if(event.key==='Enter'&&!$('game').classList.contains('hidden')){if(!$('next-btn').classList.contains('hidden'))nextChallenge();else check();}});

$('map-toggle').onclick=()=>{
  const map=document.querySelector('.map'),expanded=map.classList.toggle('expanded');
  $('map-toggle').setAttribute('aria-expanded',String(expanded));
  $('map-toggle').textContent=expanded?'Close map':'Explore map';
};
