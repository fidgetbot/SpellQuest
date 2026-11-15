const WORDS = [
  {word:'strength', clue:'The power to do something difficult.', place:'Whispering Gate'},
  {word:'special', clue:'Different in a good or important way.', place:'Silver Meadow'},
  {word:'wrong', clue:'Not correct or true.', place:'Crooked Bridge'},
  {word:'guess', clue:'An answer you choose without being certain.', place:'Riddle Woods'},
  {word:'taken', clue:'Carried away or already claimed.', place:'Thorn Keep'},
  {word:'reveal', clue:'To show something that was hidden.', place:'Mirror Caves'},
  {word:'scene', clue:'A place where something happens in a story.', place:'Moonlit Stage'},
  {word:'scared', clue:'Feeling afraid.', place:'Shadow Fen'},
  {word:'meanwhile', clue:'At the same time.', place:'Twin Towers'},
  {word:'cancel', clue:'To decide something will not happen.', place:'Broken Bell'},
  {word:'supposed', clue:'Expected or believed to be true.', place:'Oracle Steps'},
  {word:'quiet', clue:'Making little or no sound.', place:'Silent Library'},
  {word:'floor', clue:'The surface you walk on inside.', place:'Hall of Words'}
];
const STORIES = [
  'The gate runes glow, opening the road.', 'Fireflies return to the meadow.',
  'The bridge straightens beneath your feet.', 'The trees whisper the safe path.',
  'A stolen page flies back to the book.', 'The cave mirrors reveal a hidden door.',
  'The moonlit stage fills with color.', 'The shadows shrink and the fen grows calm.',
  'Both towers ring their bells together.', 'The broken bell mends with a golden chime.',
  'The oracle points toward the final trail.', 'The library awakens without a sound.',
  'The last rune locks into place. The kingdom is restored!'
];
const TYPES = ['scramble','missing','choice'];
const state = { index:0, stars:0, streak:0, attempts:{}, answer:'', selected:null, hint:false, locked:false };
const $ = id => document.getElementById(id);
const shuffle = a => [...a].sort(() => Math.random() - .5);
const save = () => localStorage.setItem('wordQuestSave', JSON.stringify({index:state.index,stars:state.stars,attempts:state.attempts}));
const saved = JSON.parse(localStorage.getItem('wordQuestSave') || 'null');
if (saved && saved.index > 0 && saved.index < WORDS.length) $('continue-btn').classList.remove('hidden');

function begin(resume=false){
  if(resume && saved){ Object.assign(state, saved); }
  else { state.index=0; state.stars=0; state.streak=0; state.attempts={}; }
  $('intro').classList.add('hidden'); $('ending').classList.add('hidden'); $('game').classList.remove('hidden');
  renderMap(); loadChallenge(); updateStats();
}
function updateStats(){
  $('level').textContent = Math.floor(state.index/3)+1; $('stars').textContent=state.stars; $('streak').textContent=state.streak;
  $('map-count').textContent=`${state.index} / ${WORDS.length}`;
}
function renderMap(){
  $('map-path').innerHTML = WORDS.map((_,i)=>`<div class="map-node ${i<state.index?'done':i===state.index?'current':''}">${i<state.index?'✓':i+1}</div>`).join('');
  const item=WORDS[Math.min(state.index,WORDS.length-1)]; $('location-name').textContent=item.place;
  $('quest-note').textContent = state.index ? STORIES[state.index-1] : 'The first rune waits.';
}
function loadChallenge(){
  state.answer=''; state.selected=null; state.hint=false; state.locked=false;
  const item=WORDS[state.index], type=TYPES[state.index%3];
  $('feedback').textContent=''; $('feedback').className='feedback'; $('next-btn').classList.add('hidden'); $('check-btn').classList.remove('hidden'); $('hint-btn').disabled=false;
  $('round-count').textContent=`Challenge ${state.index+1} of ${WORDS.length}`;
  const names={scramble:'Rune Scramble',missing:'Missing Runes',choice:'Spot the Spell'}; $('challenge-type').textContent=names[type];
  $('prompt-area').innerHTML=`<h2>${type==='choice'?'Which spelling is correct?':'Rebuild the enchanted word'}</h2><p>${item.clue}</p>`;
  if(type==='scramble') renderScramble(item.word); else if(type==='missing') renderMissing(item.word); else renderChoice(item.word);
}
function renderScramble(word){
  let letters=shuffle(word.split('').map((l,i)=>({l,i}))); if(letters.map(x=>x.l).join('')===word) letters.reverse();
  $('answer-area').innerHTML=`<div class="slots" id="slots">${word.split('').map(()=>'<button class="slot" aria-label="Empty letter slot"></button>').join('')}</div><div class="letter-bank" id="bank"></div>`;
  letters.forEach(x=>{ const b=document.createElement('button'); b.className='letter'; b.textContent=x.l; b.dataset.id=x.i; b.onclick=()=>{ if(state.locked)return; const slot=[...document.querySelectorAll('.slot')].find(s=>!s.textContent); if(!slot)return; slot.textContent=x.l; slot.classList.add('filled'); slot.dataset.source=x.i; b.classList.add('used'); b.disabled=true; state.answer=[...document.querySelectorAll('.slot')].map(s=>s.textContent).join(''); }; $('bank').appendChild(b); });
  document.querySelectorAll('.slot').forEach(s=>s.onclick=()=>{ if(!s.textContent||state.locked)return; const b=[...document.querySelectorAll('.letter')].find(x=>x.dataset.id===s.dataset.source); b.classList.remove('used'); b.disabled=false; s.textContent=''; s.classList.remove('filled'); state.answer=[...document.querySelectorAll('.slot')].map(x=>x.textContent).join(''); });
}
function renderMissing(word){
  const count=word.length>7?3:2, indexes=shuffle([...word.keys()].slice(1,-1)).slice(0,count).sort((a,b)=>a-b);
  $('answer-area').innerHTML=`<div class="missing-word">${word.split('').map((l,i)=>indexes.includes(i)?`<input maxlength="1" inputmode="text" data-position="${i}" aria-label="Missing letter ${indexes.indexOf(i)+1}">`:l).join('')}</div>`;
  const inputs=[...document.querySelectorAll('.missing-word input')]; inputs.forEach((inp,i)=>inp.addEventListener('input',()=>{ inp.value=inp.value.replace(/[^a-z]/gi,'').slice(-1); if(inp.value&&inputs[i+1])inputs[i+1].focus(); state.answer=word.split('').map((l,j)=>indexes.includes(j)?inputs[indexes.indexOf(j)].value.toLowerCase():l).join(''); })); inputs[0].focus();
}
function misspell(word){
  const variants=new Set(); const pairs=[['ie','ei'],['ss','s'],['ll','l'],['ea','ee'],['oo','o'],['th','ht'],['c','s']];
  pairs.forEach(([a,b])=>{ if(word.includes(a))variants.add(word.replace(a,b)); });
  if(word.length>4){ variants.add(word.slice(0,2)+word[3]+word[2]+word.slice(4)); variants.add(word.slice(0,-1)); variants.add(word.slice(0,3)+word[2]+word.slice(3)); }
  return [...variants].filter(v=>v!==word).slice(0,3);
}
function renderChoice(word){
  let opts=shuffle([word,...misspell(word)]); while(opts.length<4)opts.push(word+'e'.repeat(opts.length-2));
  $('answer-area').innerHTML=`<div class="choices">${opts.map(o=>`<button class="choice">${o}</button>`).join('')}</div>`;
  document.querySelectorAll('.choice').forEach(b=>b.onclick=()=>{ if(state.locked)return; document.querySelectorAll('.choice').forEach(x=>x.classList.remove('selected')); b.classList.add('selected'); state.selected=b.textContent; state.answer=b.textContent; });
}
function hint(){
  const word=WORDS[state.index].word, type=TYPES[state.index%3]; state.hint=true; $('hint-btn').disabled=true;
  if(type==='scramble') $('feedback').textContent=`Hint: the word begins with “${word.slice(0,2)}”.`;
  else if(type==='missing'){ const inputs=[...document.querySelectorAll('input')]; const first=inputs.find(x=>!x.value); if(first){ first.value=word[Number(first.dataset.position)]; first.dispatchEvent(new Event('input')); } $('feedback').textContent='One missing rune has been restored.'; }
  else $('feedback').textContent=`Hint: it has ${word.length} letters and ends with “${word.slice(-2)}”.`;
  $('feedback').className='feedback try';
}
function check(){
  if(state.locked)return; const word=WORDS[state.index].word; state.attempts[word]=(state.attempts[word]||0)+1;
  if(state.answer.toLowerCase()===word){
    state.locked=true; state.streak++; const earned=state.hint?1:2; state.stars+=earned;
    $('feedback').textContent=`Correct! ${STORIES[state.index]} +${earned} star${earned>1?'s':''}`; $('feedback').className='feedback good';
    $('check-btn').classList.add('hidden'); $('next-btn').classList.remove('hidden'); $('hint-btn').disabled=true; save();
  } else {
    state.streak=0; $('feedback').textContent=state.answer?'Not quite. Look closely at the letter order and try again.':'Choose or build an answer first.'; $('feedback').className='feedback try';
  } updateStats();
}
function next(){ state.index++; save(); updateStats(); if(state.index>=WORDS.length){ finish(); return; } renderMap(); loadChallenge(); }
function finish(){
  $('game').classList.add('hidden'); $('ending').classList.remove('hidden'); localStorage.removeItem('wordQuestSave');
  const total=Object.values(state.attempts).reduce((a,b)=>a+b,0); $('ending-copy').textContent=`You restored all 13 words and earned ${state.stars} stars in ${total} attempts.`;
  $('word-report').innerHTML=WORDS.map(x=>`<span>${x.word}</span>`).join('');
}
$('start-btn').onclick=()=>begin(false); $('continue-btn').onclick=()=>begin(true); $('hint-btn').onclick=hint; $('check-btn').onclick=check; $('next-btn').onclick=next; $('replay-btn').onclick=()=>begin(false);
document.addEventListener('keydown',e=>{ if(e.key==='Enter'&&!$('game').classList.contains('hidden')){ if(!$('next-btn').classList.contains('hidden'))next(); else check(); } });
