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
const MAP_POSITIONS=[[8,78],[24,65],[43,76],[62,64],[82,73],[88,48],[69,39],[49,50],[29,35],[47,17]];
const state={active:[],queue:[],mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:ACTIVE_LIMIT,stars:0,streak:0,hearts:STARTING_HEARTS,attempts:{},answer:'',locked:false,lastMastered:false,visitFailed:false,hintUsed:false};
const $=id=>document.getElementById(id);
const shuffle=array=>[...array].sort(()=>Math.random()-.5);
const isLetter=character=>/^[A-Za-zÀ-ÿ]$/.test(character);
const hashWord=word=>[...word].reduce((hash,character)=>((hash*31)+character.charCodeAt(0))>>>0,2166136261);
const placeFor=word=>{const hash=hashWord(word),target=word.toLocaleLowerCase();for(let offset=0;offset<PLACE_FIRST.length*PLACE_LAST.length;offset++){const place=`${PLACE_FIRST[(hash+offset)%PLACE_FIRST.length]} ${PLACE_LAST[(Math.floor(hash/13)+offset)%PLACE_LAST.length]}`;if(!place.toLocaleLowerCase().includes(target))return place;}return 'Hidden Sanctuary';};
const jewelHue=word=>hashWord(word)%360;

function freshState(){
  return {active:WORD_BANK.slice(0,ACTIVE_LIMIT),queue:WORD_BANK.slice(ACTIVE_LIMIT),mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:Math.min(ACTIVE_LIMIT,WORD_BANK.length),stars:0,streak:0,hearts:STARTING_HEARTS,attempts:{}};
}
function reconcileSave(saved){
  const known=new Set(WORD_BANK), seen=new Set();
  const clean=list=>(Array.isArray(list)?list:[]).filter(word=>known.has(word)&&!seen.has(word)&&seen.add(word));
  const mastered=clean(saved.mastered), active=clean(saved.active), queue=clean(saved.queue);
  queue.push(...WORD_BANK.filter(word=>!seen.has(word)));
  while(active.length<ACTIVE_LIMIT&&queue.length)active.push(queue.shift());
  const chapterStart=Number.isInteger(saved.chapterStart)?saved.chapterStart:Math.floor(mastered.length/ACTIVE_LIMIT)*ACTIVE_LIMIT;
  const chapterTarget=Number.isInteger(saved.chapterTarget)?saved.chapterTarget:Math.min(ACTIVE_LIMIT,WORD_BANK.length-chapterStart);
  return {...freshState(),...saved,hearts:Number.isInteger(saved.hearts)?Math.max(0,Math.min(MAX_HEARTS,saved.hearts)):STARTING_HEARTS,mastered,active,queue,cursor:active.length?Math.min(saved.cursor||0,active.length-1):0,chapterStart,chapterTarget,progress:saved.progress||{},attempts:saved.attempts||{}};
}
function readSave(){
  try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return saved&&Array.isArray(saved.active)?reconcileSave(saved):null;}catch{return null;}
}
let loadedSave=readSave();
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify({active:state.active,queue:state.queue,mastered:state.mastered,progress:state.progress,cursor:state.cursor,chapterStart:state.chapterStart,chapterTarget:state.chapterTarget,stars:state.stars,streak:state.streak,hearts:state.hearts,attempts:state.attempts}));}
function currentWord(){return state.active[state.cursor];}
function currentTier(){return state.progress[currentWord()]||0;}
function normalize(value,caseSensitive=false){const cleaned=value.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();return caseSensitive?cleaned:cleaned.toLocaleLowerCase();}
function answerMatches(answer,word){return normalize(answer,word==='Mom'||word==='mom')===normalize(word,word==='Mom'||word==='mom');}

function begin(resume=false){
  Object.assign(state,resume&&loadedSave?loadedSave:freshState(),{answer:'',locked:false,lastMastered:false,visitFailed:false,hintUsed:false});
  $('intro').classList.add('hidden');$('ending').classList.add('hidden');$('game').classList.remove('hidden');
  renderCampaign();loadChallenge();
}
function renderCampaign(){
  $('mastered-count').textContent=`${state.mastered.length} / ${WORD_BANK.length}`;$('stars').textContent=state.stars;$('streak').textContent=state.streak;$('hearts').textContent=`${state.hearts} / ${MAX_HEARTS}`;
  $('hint-btn').disabled=state.locked||state.hearts===0||state.hintUsed;
  $('active-count').textContent=`${state.active.length} active`;$('queue-count').textContent=state.queue.length?`${state.queue.length} waiting`:'No words waiting';
  $('map-nodes').innerHTML=state.active.map((word,index)=>{const [x,y]=MAP_POSITIONS[index],tier=state.progress[word]||0,current=index===state.cursor;return `<div class="quest-node tier-${tier} ${current?'current':''}" data-index="${index}" style="--x:${x}%;--y:${y}%" aria-label="Quest ${index+1}, trial ${tier+1}"><span>${current?'♞':index+1}</span></div>`;}).join('');
  $('jewel-vault').innerHTML=state.mastered.length?state.mastered.slice(-12).map(word=>jewelMarkup(word,true)).join(''):'<p class="empty-vault">Rewards will appear here.</p>';
  if(state.active.length){$('location-name').textContent=placeFor(currentWord());$('quest-note').textContent=`Trial ${currentTier()+1} of 3 · ${TRIALS[currentTier()].name}`;}
}
function escapeHtml(value){return value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
function jewelMarkup(word,labeled=false){return `<div class="jewel-win" style="--hue:${jewelHue(word)}" title="${escapeHtml(word)}"><div class="jewel"><span></span></div>${labeled?`<b>${escapeHtml(word)}</b>`:''}</div>`;}

function loadChallenge(){
  state.answer='';state.locked=false;state.lastMastered=false;state.visitFailed=false;state.hintUsed=false;
  const word=currentWord(),tier=currentTier(),trial=TRIALS[tier];
  $('feedback').textContent='';$('feedback').className='feedback';$('next-btn').classList.add('hidden');$('check-btn').classList.remove('hidden');
  $('hint-btn').classList.toggle('hidden',tier===2);$('hint-btn').disabled=state.hearts===0;$('audio-btn').classList.toggle('hidden',tier!==2);$('audio-btn').disabled=false;
  $('challenge-type').textContent=trial.name;$('round-count').textContent=`${state.mastered.length} victories won · ${state.queue.length} queued`;
  $('prompt-area').innerHTML=tier===2?'<p class="trial-kicker">Final mastery trial</p><h2>Listen and write</h2><p>No hints. No letter pool. Replay the spoken prompt whenever you need.</p>':`<p class="trial-kicker">Trial ${tier+1} of 3</p><h2>${tier===0?'Rebuild the enchanted word':'Restore the faded word'}</h2><p>${tier===0?'Choose every rune in order.':'More of the spelling has faded. Restore it.'}</p>`;
  const definition=document.createElement('p');definition.className='word-definition';definition.textContent=WORD_DEFINITIONS[word];$('prompt-area').querySelector('h2').after(definition);
  if(tier===0)renderRunePath(word);else if(tier===1)renderFadingScript(word);else renderVoiceTrial();
}
function wordSlots(word,missingPositions){return [...word].map((character,position)=>missingPositions.has(position)?`<button class="slot" data-position="${position}" aria-label="Empty rune ${position+1}"></button>`:`<span class="fixed-slot">${character===' '?'&nbsp;':escapeHtml(character)}</span>`).join('');}
function assembledAnswer(word){const slots=new Map([...document.querySelectorAll('.slot')].map(slot=>[Number(slot.dataset.position),slot.textContent]));return [...word].map((character,position)=>slots.has(position)?slots.get(position):character).join('');}
function renderRunePath(word){
  const letterPositions=[...word].map((character,position)=>({character,position})).filter(item=>isLetter(item.character));
  $('answer-area').innerHTML=`<div class="slots">${wordSlots(word,new Set(letterPositions.map(item=>item.position)))}</div><div class="letter-bank" id="bank"></div>`;
  let runes=shuffle(letterPositions);const ordered=letterPositions.map(rune=>rune.character).join('');if(runes.length>1&&runes.map(rune=>rune.character).join('')===ordered)runes=[...runes.slice(1),runes[0]];
  runes.forEach(rune=>{const button=document.createElement('button');button.className='letter';button.textContent=rune.character;button.dataset.id=rune.position;button.onclick=()=>{if(state.locked)return;const slot=[...document.querySelectorAll('.slot')].find(candidate=>!candidate.textContent);if(!slot)return;slot.textContent=rune.character;slot.classList.add('filled');slot.classList.remove('wrong');slot.dataset.source=rune.position;button.classList.add('used');button.disabled=true;state.answer=assembledAnswer(word);};$('bank').appendChild(button);});
  document.querySelectorAll('.slot').forEach(slot=>slot.onclick=()=>{if(!slot.textContent||state.locked)return;const button=[...document.querySelectorAll('.letter')].find(candidate=>candidate.dataset.id===slot.dataset.source);button.classList.remove('used');button.disabled=false;slot.textContent='';slot.classList.remove('filled','wrong');state.answer=assembledAnswer(word);});
}
function renderFadingScript(word){
  const eligible=[...word].map((character,position)=>({character,position})).filter(item=>isLetter(item.character));const count=Math.max(2,Math.ceil(eligible.length*.55));const missing=shuffle(eligible).slice(0,count).map(item=>item.position).sort((a,b)=>a-b);
  $('answer-area').innerHTML=`<div class="missing-word">${[...word].map((character,position)=>missing.includes(position)?`<input maxlength="1" autocomplete="off" data-position="${position}" aria-label="Missing letter ${missing.indexOf(position)+1}">`:`<span>${character===' '?'&nbsp;':escapeHtml(character)}</span>`).join('')}</div>`;
  const inputs=[...document.querySelectorAll('.missing-word input')];inputs.forEach((input,index)=>input.addEventListener('input',()=>{input.value=input.value.replace(/[^A-Za-zÀ-ÿ]/g,'').slice(-1);input.classList.remove('wrong');if(input.value&&inputs[index+1])inputs[index+1].focus();const values=new Map(inputs.map(field=>[Number(field.dataset.position),field.value]));state.answer=[...word].map((character,position)=>values.has(position)?values.get(position):character).join('');}));inputs[0]?.focus();
}
function renderVoiceTrial(){
  $('answer-area').innerHTML='<div class="voice-entry"><div class="sound-rings" aria-hidden="true"><i></i><i></i><i></i></div><p id="answer-label">Use the keyboard below to write what you hear</p><div id="spell-input" class="spell-input" role="status" aria-labelledby="answer-label" aria-live="polite"></div><div id="voice-keyboard" class="voice-keyboard" role="group" aria-label="Answer keyboard"></div></div>';
  let shifted=false;
  const keyboard=$('voice-keyboard'),letterButtons=[];
  function update(){ $('spell-input').textContent=state.answer; }
  function addKey(row,label,action){
    const button=document.createElement('button');button.type='button';button.className='voice-key';button.textContent=label;
    button.onclick=()=>{if(!state.locked)action();};row.append(button);return button;
  }
  for(const letters of ['qwertyuiop','asdfghjkl','zxcvbnm','áéíóúüñ']){
    const row=document.createElement('div');row.className='keyboard-row';keyboard.append(row);
    for(const letter of letters){
      const button=addKey(row,letter,()=>{state.answer+=shifted?letter.toLocaleUpperCase():letter;update();});
      button.dataset.character=letter;letterButtons.push(button);
    }
  }
  const row=document.createElement('div');row.className='keyboard-row keyboard-actions';keyboard.append(row);
  const shift=addKey(row,'Shift',()=>{shifted=!shifted;shift.setAttribute('aria-pressed',String(shifted));for(const button of letterButtons)button.textContent=shifted?button.dataset.character.toLocaleUpperCase():button.dataset.character;});
  shift.setAttribute('aria-pressed','false');
  addKey(row,"'",()=>{state.answer+="'";update();}).setAttribute('aria-label','Apostrophe');
  addKey(row,'-',()=>{state.answer+='-';update();}).setAttribute('aria-label','Hyphen');
  addKey(row,'Space',()=>{state.answer+=' ';update();});
  addKey(row,'⌫',()=>{state.answer=[...state.answer].slice(0,-1).join('');update();}).setAttribute('aria-label','Backspace');
  addKey(row,'Clear',()=>{state.answer='';update();});
}
function speakWord(){
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){$('feedback').textContent='Audio is unavailable in this browser. Ask an adult to read the word aloud.';$('feedback').className='feedback try';return;}
  window.speechSynthesis.cancel();const utterance=new window.SpeechSynthesisUtterance(currentWord());utterance.rate=.78;utterance.pitch=1;utterance.lang=SPANISH.has(currentWord())?'es-US':'en-US';window.speechSynthesis.speak(utterance);$('audio-btn').classList.add('speaking');setTimeout(()=>$('audio-btn').classList.remove('speaking'),900);
}
function spendHeart(){const before=state.hearts;state.hearts=Math.max(0,state.hearts-1);save();renderCampaign();return before-state.hearts;}
function costText(spent){return spent?' −1 heart.':' No hearts left—keep trying to earn one back.';}
function hint(){
  if(state.locked||state.hintUsed||currentTier()===2||state.hearts===0)return;const word=currentWord();state.visitFailed=true;state.hintUsed=true;const spent=spendHeart();
  if(currentTier()===0){const first=[...document.querySelectorAll('.slot')].find(slot=>!slot.textContent);$('feedback').textContent=(first?`The next rune is “${word[Number(first.dataset.position)]}”.`:'All runes are placed.')+costText(spent);}
  else{const first=[...document.querySelectorAll('.missing-word input')].find(input=>!input.value);if(first){first.value=word[Number(first.dataset.position)];first.dispatchEvent(new Event('input'));}$('feedback').textContent='One faded rune has returned.'+costText(spent);}
  $('feedback').className='feedback try';
}
function markSubmittedLetters(word){
  document.querySelectorAll('.slot, .missing-word input').forEach(field=>{const value=field.tagName==='INPUT'?field.value:field.textContent;field.classList.toggle('wrong',Boolean(value)&&!answerMatches(value,word[Number(field.dataset.position)]));});
}
function check(){
  if(state.locked)return;const word=currentWord(),tier=currentTier();state.attempts[word]=(state.attempts[word]||0)+1;
  markSubmittedLetters(word);
  if(!answerMatches(state.answer,word)){state.streak=0;if(state.answer)state.visitFailed=true;const spent=state.answer?spendHeart():0;const retry=tier===2?'Not yet. Listen once more and try again.':'Not yet. Study the red letters and try once more.';$('feedback').textContent=state.answer?retry+costText(spent):'Build or type an answer first.';$('feedback').className='feedback try';renderCampaign();return;}
  state.locked=true;state.hearts=Math.min(MAX_HEARTS,state.hearts+1);
  if(state.visitFailed){state.streak=0;state.lastMastered=false;$('feedback').textContent=`Practice complete. The magic around “${word}” is steadier, but it must return later for a clean first-try victory.`;}
  else if(tier<2){state.streak++;state.stars+=TRIALS[tier].reward;state.progress[word]=tier+1;$('feedback').textContent=tier===0?`The runes of ${placeFor(word)} begin to glow. “${word}” is ready for a harder trial.`:`A hidden path opens at ${placeFor(word)}. One final Voice Trial remains for “${word}”.`;state.lastMastered=false;}
  else{state.streak++;state.stars+=TRIALS[tier].reward;state.mastered.push(word);state.active.splice(state.cursor,1);delete state.progress[word];if(state.queue.length)state.active.push(state.queue.shift());state.lastMastered=true;$('feedback').innerHTML=`<div class="victory-reveal">${jewelMarkup(word)}<div><strong>Victory at ${placeFor(word)}!</strong><small>“${escapeHtml(word)}” mastered · jewel earned</small></div></div>`;}
  $('feedback').append(document.createTextNode(state.hearts===MAX_HEARTS?' Hearts full!':' +1 heart.'));
  $('feedback').className='feedback good';$('check-btn').classList.add('hidden');$('next-btn').classList.remove('hidden');$('hint-btn').disabled=true;$('audio-btn').disabled=true;save();renderCampaign();
}
function nextChallenge(){
  if(!state.locked)return;state.locked=false;
  if(state.mastered.length-state.chapterStart>=state.chapterTarget){finishChapter();return;}
  if(state.active.length){state.cursor=state.lastMastered?state.cursor%state.active.length:(state.cursor+1)%state.active.length;}
  save();renderCampaign();loadChallenge();
}
function finishChapter(){
  window.speechSynthesis?.cancel?.();$('game').classList.add('hidden');$('ending').classList.remove('hidden');
  const chapterWords=state.mastered.slice(state.chapterStart,state.chapterStart+state.chapterTarget);const complete=state.mastered.length===WORD_BANK.length;
  $('ending-title').textContent=complete?'The Lexicon is complete!':'Chapter complete!';
  $('ending-copy').textContent=complete?`Every word in the bank has been spelled from memory. The Crown of Lexicon shines with all ${state.mastered.length} jewels.`:`All ${state.chapterTarget} chapter words were spelled from memory. Their jewels have restored another realm of Lexicon.`;
  $('word-report').innerHTML=chapterWords.map(word=>jewelMarkup(word,true)).join('');$('replay-btn').textContent=complete?'Start a new campaign':'Begin next chapter';save();
}
function continueCampaign(){
  if(state.mastered.length===WORD_BANK.length){localStorage.removeItem(SAVE_KEY);loadedSave=null;begin(false);return;}
  state.chapterStart=state.mastered.length;state.chapterTarget=Math.min(ACTIVE_LIMIT,WORD_BANK.length-state.chapterStart);state.cursor=0;save();
  $('ending').classList.add('hidden');$('game').classList.remove('hidden');renderCampaign();loadChallenge();
}

if(loadedSave&&loadedSave.mastered.length<WORD_BANK.length)$('continue-btn').classList.remove('hidden');
$('start-btn').onclick=()=>begin(false);$('continue-btn').onclick=()=>begin(true);$('hint-btn').onclick=hint;$('audio-btn').onclick=speakWord;$('check-btn').onclick=check;$('next-btn').onclick=nextChallenge;$('replay-btn').onclick=continueCampaign;
document.addEventListener('keydown',event=>{if(event.target.closest?.('#voice-keyboard'))return;if(event.key==='Enter'&&!$('game').classList.contains('hidden')){if(!$('next-btn').classList.contains('hidden'))nextChallenge();else check();}});
