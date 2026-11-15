const ACTIVE_LIMIT=10;
const SAVE_KEY='spellQuestMasteryV1';
const TRIALS=[
  {name:'Rune Path',reward:1},
  {name:'Fading Script',reward:2},
  {name:'Voice Trial',reward:3}
];
const CONTEXTS={
  Accept:'I accept your invitation.',except:'Everyone came except the dragon.',
  "It's":'It is raining, so it’s time to go inside.',its:'The dragon spread its wings.',
  There:'Put the treasure over there.',"they're":'They are ready, so they’re opening the gate.',their:'The heroes packed their supplies.',"there's":'There is a jewel, so there’s light in the cave.',theirs:'That victory is theirs.',
  Your:'Your sword is beside the door.',"you're":'You are brave, so you’re ready for the quest.',
  Meet:'We will meet at the castle.',meat:'The wolf ate a piece of meat.',Death:'The story tells of the king’s death.',deaf:'The old wizard is deaf and cannot hear.',
  Seen:'I have seen that jewel before.',Scene:'The final scene takes place in a castle.',Which:'Which path should we follow?',Witch:'The witch carried a silver wand.',
  Ate:'The dragon ate its breakfast.',Heard:'I heard a strange sound.',Hole:'The rabbit escaped through a hole.',Flower:'A blue flower grew beside the path.',Throne:'The queen sat upon the throne.',
  Peace:'The kingdoms finally made peace.',Piece:'She found one piece of the map.',Desert:'The dry desert stretched for miles.',Dessert:'We ate cake for dessert.',
  Mom:'I asked Mom to help me.',mom:'My mom helped me.',calves:'The cows stayed close to their calves.',calf:'The young calf followed its mother.'
};
const SPANISH=new Set(['empresa','abrigo','nevera','tal vez','volver']);
const PLACE_FIRST=['Whispering','Silver','Crooked','Riddle','Thorn','Mirror','Moonlit','Shadow','Twin','Golden','Crystal','Emerald'];
const PLACE_LAST=['Gate','Meadow','Bridge','Woods','Keep','Caves','Stage','Fen','Towers','Library','Hall','Sanctum'];
const state={active:[],queue:[],mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:ACTIVE_LIMIT,stars:0,streak:0,attempts:{},answer:'',locked:false,lastMastered:false};
let advanceTimer=null;
const $=id=>document.getElementById(id);
const shuffle=array=>[...array].sort(()=>Math.random()-.5);
const isLetter=character=>/^[A-Za-zÀ-ÿ]$/.test(character);
const hashWord=word=>[...word].reduce((hash,character)=>((hash*31)+character.charCodeAt(0))>>>0,2166136261);
const placeFor=word=>{const hash=hashWord(word);return `${PLACE_FIRST[hash%PLACE_FIRST.length]} ${PLACE_LAST[Math.floor(hash/13)%PLACE_LAST.length]}`;};
const jewelHue=word=>hashWord(word)%360;

function freshState(){
  return {active:WORD_BANK.slice(0,ACTIVE_LIMIT),queue:WORD_BANK.slice(ACTIVE_LIMIT),mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:Math.min(ACTIVE_LIMIT,WORD_BANK.length),stars:0,streak:0,attempts:{}};
}
function reconcileSave(saved){
  const known=new Set(WORD_BANK), seen=new Set();
  const clean=list=>(Array.isArray(list)?list:[]).filter(word=>known.has(word)&&!seen.has(word)&&seen.add(word));
  const mastered=clean(saved.mastered), active=clean(saved.active), queue=clean(saved.queue);
  queue.push(...WORD_BANK.filter(word=>!seen.has(word)));
  while(active.length<ACTIVE_LIMIT&&queue.length)active.push(queue.shift());
  const chapterStart=Number.isInteger(saved.chapterStart)?saved.chapterStart:Math.floor(mastered.length/ACTIVE_LIMIT)*ACTIVE_LIMIT;
  const chapterTarget=Number.isInteger(saved.chapterTarget)?saved.chapterTarget:Math.min(ACTIVE_LIMIT,WORD_BANK.length-chapterStart);
  return {...freshState(),...saved,mastered,active,queue,cursor:active.length?Math.min(saved.cursor||0,active.length-1):0,chapterStart,chapterTarget,progress:saved.progress||{},attempts:saved.attempts||{}};
}
function readSave(){
  try{const saved=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');return saved&&Array.isArray(saved.active)?reconcileSave(saved):null;}catch{return null;}
}
let loadedSave=readSave();
function save(){localStorage.setItem(SAVE_KEY,JSON.stringify({active:state.active,queue:state.queue,mastered:state.mastered,progress:state.progress,cursor:state.cursor,chapterStart:state.chapterStart,chapterTarget:state.chapterTarget,stars:state.stars,streak:state.streak,attempts:state.attempts}));}
function currentWord(){return state.active[state.cursor];}
function currentTier(){return state.progress[currentWord()]||0;}
function normalize(value,caseSensitive=false){const cleaned=value.replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();return caseSensitive?cleaned:cleaned.toLocaleLowerCase();}
function answerMatches(answer,word){return normalize(answer,word==='Mom'||word==='mom')===normalize(word,word==='Mom'||word==='mom');}

function begin(resume=false){
  Object.assign(state,resume&&loadedSave?loadedSave:freshState(),{answer:'',locked:false,lastMastered:false});
  $('intro').classList.add('hidden');$('ending').classList.add('hidden');$('game').classList.remove('hidden');
  renderCampaign();loadChallenge();
}
function renderCampaign(){
  $('mastered-count').textContent=`${state.mastered.length} / ${WORD_BANK.length}`;$('stars').textContent=state.stars;$('streak').textContent=state.streak;
  $('active-count').textContent=`${state.active.length} active`;$('queue-count').textContent=state.queue.length?`${state.queue.length} waiting`:'No words waiting';
  $('active-words').innerHTML=state.active.map((word,index)=>{const tier=state.progress[word]||0;return `<div class="active-word ${index===state.cursor?'current':''}"><span class="active-name">${escapeHtml(word)}</span><span class="trial-dots" aria-label="${tier} of 3 trials passed">${[0,1,2].map(n=>`<i class="${n<tier?'passed':''}"></i>`).join('')}</span></div>`;}).join('');
  $('jewel-vault').innerHTML=state.mastered.length?state.mastered.slice(-12).map(word=>jewelMarkup(word,true)).join(''):'<p class="empty-vault">Victory jewels will appear here.</p>';
  if(state.active.length){$('location-name').textContent=placeFor(currentWord());$('quest-note').textContent=`Trial ${currentTier()+1} of 3 for “${currentWord()}”`;}
}
function escapeHtml(value){return value.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));}
function jewelMarkup(word,labeled=false){return `<div class="jewel-win" style="--hue:${jewelHue(word)}" title="${escapeHtml(word)}"><div class="jewel"><span></span></div>${labeled?`<b>${escapeHtml(word)}</b>`:''}</div>`;}

function loadChallenge(){
  state.answer='';state.locked=false;state.lastMastered=false;
  const word=currentWord(),tier=currentTier(),trial=TRIALS[tier];
  $('feedback').textContent='';$('feedback').className='feedback';$('next-btn').classList.add('hidden');$('check-btn').classList.remove('hidden');
  $('hint-btn').classList.toggle('hidden',tier===2);$('hint-btn').disabled=false;$('audio-btn').classList.toggle('hidden',tier!==2);$('audio-btn').disabled=false;
  $('challenge-type').textContent=trial.name;$('round-count').textContent=`${state.mastered.length} jewels won · ${state.queue.length} queued`;
  $('prompt-area').innerHTML=tier===2?'<p class="trial-kicker">Final mastery trial</p><h2>Listen and spell</h2><p>No hints. No letter pool. Replay the spoken prompt whenever you need.</p>':`<p class="trial-kicker">Trial ${tier+1} of 3</p><h2>${escapeHtml(word)}</h2><p>${tier===0?'Choose every rune in order.':'More of the spelling has faded. Restore it.'}</p>`;
  if(tier===0)renderRunePath(word);else if(tier===1)renderFadingScript(word);else renderVoiceTrial();
}
function wordSlots(word,missingPositions){return [...word].map((character,position)=>missingPositions.has(position)?`<button class="slot" data-position="${position}" aria-label="Empty rune ${position+1}"></button>`:`<span class="fixed-slot">${character===' '?'&nbsp;':escapeHtml(character)}</span>`).join('');}
function assembledAnswer(word){const slots=new Map([...document.querySelectorAll('.slot')].map(slot=>[Number(slot.dataset.position),slot.textContent]));return [...word].map((character,position)=>slots.has(position)?slots.get(position):character).join('');}
function renderRunePath(word){
  const letterPositions=[...word].map((character,position)=>({character,position})).filter(item=>isLetter(item.character));
  $('answer-area').innerHTML=`<div class="slots">${wordSlots(word,new Set(letterPositions.map(item=>item.position)))}</div><div class="letter-bank" id="bank"></div>`;
  shuffle(letterPositions).forEach(rune=>{const button=document.createElement('button');button.className='letter';button.textContent=rune.character;button.dataset.id=rune.position;button.onclick=()=>{if(state.locked)return;const slot=[...document.querySelectorAll('.slot')].find(candidate=>!candidate.textContent);if(!slot)return;slot.textContent=rune.character;slot.classList.add('filled');slot.dataset.source=rune.position;button.classList.add('used');button.disabled=true;state.answer=assembledAnswer(word);};$('bank').appendChild(button);});
  document.querySelectorAll('.slot').forEach(slot=>slot.onclick=()=>{if(!slot.textContent||state.locked)return;const button=[...document.querySelectorAll('.letter')].find(candidate=>candidate.dataset.id===slot.dataset.source);button.classList.remove('used');button.disabled=false;slot.textContent='';slot.classList.remove('filled');state.answer=assembledAnswer(word);});
}
function renderFadingScript(word){
  const eligible=[...word].map((character,position)=>({character,position})).filter(item=>isLetter(item.character));const count=Math.max(2,Math.ceil(eligible.length*.55));const missing=shuffle(eligible).slice(0,count).map(item=>item.position).sort((a,b)=>a-b);
  $('answer-area').innerHTML=`<div class="missing-word">${[...word].map((character,position)=>missing.includes(position)?`<input maxlength="1" autocomplete="off" data-position="${position}" aria-label="Missing letter ${missing.indexOf(position)+1}">`:`<span>${character===' '?'&nbsp;':escapeHtml(character)}</span>`).join('')}</div>`;
  const inputs=[...document.querySelectorAll('.missing-word input')];inputs.forEach((input,index)=>input.addEventListener('input',()=>{input.value=input.value.replace(/[^A-Za-zÀ-ÿ]/g,'').slice(-1);if(input.value&&inputs[index+1])inputs[index+1].focus();const values=new Map(inputs.map(field=>[Number(field.dataset.position),field.value]));state.answer=[...word].map((character,position)=>values.has(position)?values.get(position):character).join('');}));inputs[0]?.focus();
}
function renderVoiceTrial(){$('answer-area').innerHTML='<div class="voice-entry"><div class="sound-rings" aria-hidden="true"><i></i><i></i><i></i></div><label for="spell-input">Type exactly what you hear</label><input id="spell-input" class="spell-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false"></div>';const input=$('spell-input');input.addEventListener('input',()=>{input.value=input.value.replace(/[^A-Za-zÀ-ÿ\-'’ ]/g,'').replace(/\s{2,}/g,' ');state.answer=input.value;});input.focus();}
function spokenPrompt(word){return CONTEXTS[word]?`Listen to the word in this sentence. ${CONTEXTS[word]} Spell the word: ${word}.`: `Spell the word: ${word}. ${word}.`;}
function speakWord(){
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){$('feedback').textContent='Audio is unavailable in this browser. Ask an adult to read the word aloud.';$('feedback').className='feedback try';return;}
  window.speechSynthesis.cancel();const utterance=new window.SpeechSynthesisUtterance(spokenPrompt(currentWord()));utterance.rate=.78;utterance.pitch=1;utterance.lang=SPANISH.has(currentWord())?'es-US':'en-US';window.speechSynthesis.speak(utterance);$('audio-btn').classList.add('speaking');setTimeout(()=>$('audio-btn').classList.remove('speaking'),900);
}
function hint(){
  if(currentTier()===2)return;const word=currentWord();$('hint-btn').disabled=true;
  if(currentTier()===0){const first=[...document.querySelectorAll('.slot')].find(slot=>!slot.textContent);$('feedback').textContent=first?`The next rune is “${word[Number(first.dataset.position)]}”.`:'All runes are placed.';}
  else{const first=[...document.querySelectorAll('.missing-word input')].find(input=>!input.value);if(first){first.value=word[Number(first.dataset.position)];first.dispatchEvent(new Event('input'));}$('feedback').textContent='One faded rune has returned.';}
  $('feedback').className='feedback try';
}
function check(){
  if(state.locked)return;const word=currentWord(),tier=currentTier();state.attempts[word]=(state.attempts[word]||0)+1;
  if(!answerMatches(state.answer,word)){state.streak=0;$('feedback').textContent=state.answer?'Not yet. Study the spelling and try once more.':'Build or type an answer first.';$('feedback').className='feedback try';renderCampaign();return;}
  state.locked=true;state.streak++;state.stars+=TRIALS[tier].reward;
  if(tier<2){state.progress[word]=tier+1;$('feedback').textContent=`Trial passed. “${word}” is ready for a harder challenge.`;state.lastMastered=false;}
  else{state.mastered.push(word);state.active.splice(state.cursor,1);delete state.progress[word];if(state.queue.length)state.active.push(state.queue.shift());state.lastMastered=true;$('feedback').innerHTML=`<div class="victory-reveal">${jewelMarkup(word)}<div><strong>Victory at ${placeFor(word)}!</strong><small>“${escapeHtml(word)}” mastered · jewel earned</small></div></div>`;}
  $('feedback').className='feedback good';$('check-btn').classList.add('hidden');$('next-btn').classList.remove('hidden');$('hint-btn').disabled=true;$('audio-btn').disabled=true;save();renderCampaign();advanceTimer=setTimeout(nextChallenge,3000);
}
function nextChallenge(){
  if(!state.locked)return;if(advanceTimer){clearTimeout(advanceTimer);advanceTimer=null;}state.locked=false;
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
document.addEventListener('keydown',event=>{if(event.key==='Enter'&&!$('game').classList.contains('hidden')){if(!$('next-btn').classList.contains('hidden'))nextChallenge();else check();}});
