const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');

function createGame(saved=null){
  const errors=[],spoken=[];const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://example.test/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
  dom.window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};
  dom.window.speechSynthesis={cancel(){},speak(utterance){spoken.push(utterance);}};
  if(saved)dom.window.localStorage.setItem('spellQuestMasteryV1',JSON.stringify(saved));
  dom.window.eval(fs.readFileSync(path.join(root,'words.js'),'utf8'));
  dom.window.eval(fs.readFileSync(path.join(root,'definitions.js'),'utf8'));
  dom.window.eval(fs.readFileSync(path.join(root,'story.js'),'utf8'));
  dom.window.eval(fs.readFileSync(path.join(root,'game.js'),'utf8'));
  dom.window.document.getElementById(saved?'continue-btn':'start-btn').click();
  return {dom,errors,spoken};
}
function baseSave(overrides={}){
  const words=['Machine','Accept','except','Father','Scary','Steal','Ate','Intensity','Level','Stopped'];
  return {active:words,queue:['Mother'],mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:10,stars:0,streak:0,hearts:5,attempts:{},...overrides};
}
function type(dom,value){
  const doc=dom.window.document,keys=[...doc.querySelectorAll('.voice-key')];
  keys.find(key=>key.textContent==='Clear').click();
  for(const character of value){
    let button=keys.find(key=>key.textContent===character);
    if(!button&&/[A-Za-zÀ-ÿ]/.test(character)){keys.find(key=>key.textContent==='Shift').click();button=keys.find(key=>key.textContent===character);}
    if(character===' ')button=keys.find(key=>key.textContent==='Space');
    assert.ok(button, 'Available key: '+character);button.click();
  }
}
function wordBank(){const dom=new JSDOM('<!doctype html>',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(path.join(root,'words.js'),'utf8'));return dom.window.WORD_BANK;}
function setFading(dom,slot,character){slot.click();const keys=[...dom.window.document.querySelectorAll('.voice-key')];let key=keys.find(k=>k.textContent===character);if(!key){keys.find(k=>k.textContent==='Shift').click();key=keys.find(k=>k.textContent===character);}assert.ok(key);key.click();}
function fillFading(dom,word,wrong=false){for(const slot of dom.window.document.querySelectorAll('.fading-slot')){const expected=word[Number(slot.dataset.position)];setFading(dom,slot,wrong?(expected.toLocaleLowerCase()==='z'?'x':'z'):expected);}}
function visibleChallengeContent(dom){const game=dom.window.document.getElementById('game').cloneNode(true);game.querySelectorAll('.hidden').forEach(node=>node.remove());const attributes=[...game.querySelectorAll('*')].flatMap(node=>['aria-label','title','placeholder'].map(name=>node.getAttribute(name)||''));return `${game.textContent} ${attributes.join(' ')}`.replace(/\s+/g,' ').toLocaleLowerCase();}
function assertTargetHidden(dom,word){assert.ok(!visibleChallengeContent(dom).includes(word.toLocaleLowerCase()),`${word} leaked into visible challenge UI`);}

test('the supplied bank expands alternatives, preserves phrases, and removes ordinary duplicates',()=>{
  const words=wordBank();
  for(const entry of ['Accept','except',"they're",'their','San Francisco','United States','empresa','volver','Mom','mom'])assert.ok(words.includes(entry),entry);
  assert.equal(words.filter(word=>word.toLocaleLowerCase()==='beautiful').length,1);
  assert.equal(words.filter(word=>word.toLocaleLowerCase()==='mom').length,2);
});

test('only ten words are active and new bank entries are queued',()=>{
  const {dom,errors}=createGame();
  assert.equal(dom.window.document.querySelectorAll('.quest-node').length,10);
  assert.match(dom.window.document.getElementById('queue-count').textContent,/waiting/);
  assert.ok(dom.window.document.querySelector('.quest-node.current'));
  assert.ok(dom.window.document.querySelector('.map-castle'));
  assert.ok(dom.window.document.querySelector('.map-trail path'));
  assertTargetHidden(dom,'Machine');
  assert.deepEqual(errors,[]);dom.window.close();
});

test('potentially leaky target words remain absent from visible map and challenge UI',()=>{
  const initial=baseSave();
  for(const [word,tier] of [['Library',0],['Jewel',0],['Spell',2]]){
    const active=[word,...initial.active.slice(1)];const {dom,errors}=createGame(baseSave({active,progress:tier?{[word]:tier}:{},cursor:0}));
    assertTargetHidden(dom,word);
    assert.deepEqual(errors,[]);dom.window.close();
  }
});

test('wrong checks and hints spend hearts while blank checks are free',()=>{
  const {dom,errors}=createGame();
  dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'))?.hearts??5,5);
  const firstSlot=dom.window.document.querySelector('.slot');
  [...dom.window.document.querySelectorAll('.letter')].find(button=>button.textContent.toLocaleLowerCase()!=='m').click();
  dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).hearts,4);
  dom.window.document.getElementById('hint-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).hearts,3);
  assert.equal(dom.window.document.getElementById('hearts').textContent,'3 / 10');
  assert.ok(firstSlot.classList.contains('wrong'));
  firstSlot.click();
  assert.ok(!firstSlot.classList.contains('wrong'));
  [...dom.window.document.querySelectorAll('.letter')].find(button=>button.textContent.toLocaleLowerCase()!=='m').click();
  assert.ok(!firstSlot.classList.contains('wrong'));
  dom.window.document.getElementById('check-btn').click();
  assert.ok(firstSlot.classList.contains('wrong'));
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a correct Rune Path advances the roster and fully renders the next challenge',()=>{
  const {dom,errors}=createGame();
  const firstSlot=dom.window.document.querySelector('.slot');
  const wrongButton=[...dom.window.document.querySelectorAll('.letter')].find(candidate=>candidate.textContent.toLocaleLowerCase()!=='m');
  wrongButton.click();
  assert.ok(!firstSlot.classList.contains('wrong'));
  firstSlot.click();
  assert.ok(!firstSlot.classList.contains('wrong'));
  for(const character of 'Machine'){
    const button=[...dom.window.document.querySelectorAll('.letter:not(.used)')].find(candidate=>candidate.textContent===character);
    assert.ok(button,`available rune ${character}`);button.click();
  }
  let scheduledAdvances=0;dom.window.setTimeout=()=>{scheduledAdvances++;};
  dom.window.document.getElementById('check-btn').click();
  assert.equal(scheduledAdvances,0);
  assert.equal(dom.window.document.querySelector('.quest-node.current').dataset.index,'0');
  assert.ok(!dom.window.document.getElementById('next-btn').classList.contains('hidden'));
  dom.window.document.getElementById('next-btn').click();
  const saved=JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.equal(saved.progress.Machine,1);
  assert.equal(dom.window.document.querySelectorAll('.quest-node').length,10);
  assert.equal(dom.window.document.querySelector('.quest-node.current').dataset.index,'1');
  assert.ok(dom.window.document.querySelectorAll('.letter').length>=2);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a word returning for its second trial renders the harder Fading Script',()=>{
  const {dom,errors}=createGame(baseSave({progress:{Machine:1}}));
  assert.equal(dom.window.document.getElementById('challenge-type').textContent,'Fading Script');
  assert.ok(dom.window.document.querySelectorAll('.fading-slot').length>=2);
  assertTargetHidden(dom,'Machine');
  const input=dom.window.document.querySelector('.fading-slot'),expected='Machine'[Number(input.dataset.position)];
  setFading(dom,input,expected.toLocaleLowerCase()==='z'?'x':'z');
  assert.ok(!input.classList.contains('wrong'));
  dom.window.document.getElementById('check-btn').click();
  assert.ok(input.classList.contains('wrong'));
  setFading(dom,input,expected.toLocaleLowerCase()==='x'?'z':'x');
  assert.ok(!input.classList.contains('wrong'));
  dom.window.document.getElementById('check-btn').click();
  assert.ok(input.classList.contains('wrong'));
  setFading(dom,input,expected);
  assert.ok(!input.classList.contains('wrong'));
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a wrong submission keeps the word at the same tier until a later clean visit',()=>{
  const first=createGame(baseSave({progress:{Machine:1}}));
  fillFading(first.dom,'Machine',true);first.dom.window.document.getElementById('check-btn').click();
  fillFading(first.dom,'Machine');first.dom.window.document.getElementById('check-btn').click();
  let saved=JSON.parse(first.dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.equal(saved.progress.Machine,1);
  assert.match(first.dom.window.document.getElementById('feedback').textContent,/return later/);
  first.dom.window.document.getElementById('next-btn').click();saved=JSON.parse(first.dom.window.localStorage.getItem('spellQuestMasteryV1'));saved.cursor=0;first.dom.window.close();
  const retry=createGame(saved);assert.equal(retry.dom.window.document.getElementById('challenge-type').textContent,'Fading Script');
  fillFading(retry.dom,'Machine');retry.dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(retry.dom.window.localStorage.getItem('spellQuestMasteryV1')).progress.Machine,2);
  assert.deepEqual(retry.errors,[]);retry.dom.window.close();
});

test('using a hint makes the visit practice-only',()=>{
  const {dom,errors}=createGame(baseSave({progress:{Machine:1}}));dom.window.document.getElementById('hint-btn').click();fillFading(dom,'Machine');dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).progress.Machine,1);
  assert.match(dom.window.document.getElementById('feedback').textContent,/return later/);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('Voice Trial has audio, no hints or pool, and mastery slots in the next word',()=>{
  const save=baseSave({progress:{Machine:2}});const {dom,errors,spoken}=createGame(save);
  assert.equal(dom.window.document.getElementById('challenge-type').textContent,'Voice Trial');
  assertTargetHidden(dom,'Machine');
  assert.ok(dom.window.document.getElementById('hint-btn').classList.contains('hidden'));
  assert.equal(dom.window.document.querySelectorAll('.letter').length,0);
  dom.window.document.getElementById('audio-btn').click();assert.equal(spoken.length,1);assert.equal(spoken[0].text,'Machine');
  type(dom,'Machine');dom.window.document.getElementById('check-btn').click();
  const persisted=JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.deepEqual(persisted.mastered,['Machine']);
  assert.equal(persisted.active.length,10);assert.ok(persisted.active.includes('Mother'));
  assert.ok(dom.window.document.querySelectorAll('.jewel-win').length>=2);
  dom.window.document.getElementById('next-btn').click();assert.ok(dom.window.document.querySelector('.quest-node.current'));
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a corrected Voice Trial mistake does not award a jewel until a clean revisit',()=>{
  const {dom,errors}=createGame(baseSave({progress:{Machine:2}}));
  type(dom,'Machin');dom.window.document.getElementById('check-btn').click();
  type(dom,'Machine');dom.window.document.getElementById('check-btn').click();
  const saved=JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.deepEqual(saved.mastered,[]);assert.equal(saved.progress.Machine,2);
  assert.equal(dom.window.document.querySelectorAll('.victory-reveal').length,0);
  assert.match(dom.window.document.getElementById('feedback').textContent,/return later/);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a chapter ending stays locked until its tenth word passes the Voice Trial',()=>{
  const all=wordBank(),chapter=all.slice(0,10),last=chapter.at(-1),save=baseSave({active:[last],queue:all.slice(10),mastered:chapter.slice(0,-1),progress:{[last]:2},cursor:0,chapterStart:0,chapterTarget:10});
  const {dom,errors}=createGame(save);type(dom,last);dom.window.document.getElementById('check-btn').click();
  assert.ok(dom.window.document.getElementById('ending').classList.contains('hidden'));
  dom.window.document.getElementById('next-btn').click();
  assert.ok(!dom.window.document.getElementById('ending').classList.contains('hidden'));
  assert.equal(dom.window.document.querySelectorAll('#word-report .jewel-win').length,10);
  dom.window.document.getElementById('replay-btn').click();
  assert.ok(dom.window.document.getElementById('ending').classList.contains('hidden'));
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).chapterStart,10);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('every word has a local definition and each trial restores it beneath the heading',()=>{
  for(const tier of [0,1,2]){
    const {dom}=createGame(baseSave({progress:{Machine:tier}}));
    for(const word of dom.window.WORD_BANK)assert.ok(dom.window.WORD_DEFINITIONS[word],`Missing definition: ${word}`);
    const heading=dom.window.document.querySelector('#prompt-area h2');
    assert.equal(heading.nextElementSibling.className,'word-definition');
    assert.equal(heading.nextElementSibling.textContent,'A device with parts that work together to do a job.');
    assertTargetHidden(dom,'Machine');dom.window.close();
  }
});

test('hearts start at five, survive reload, and legacy saves retain progress',()=>{
  const fresh=createGame();assert.equal(fresh.dom.window.document.getElementById('hearts').textContent,'5 / 10');fresh.dom.window.close();
  const legacy=baseSave({progress:{Machine:1},focus:9});delete legacy.hearts;
  const migrated=createGame(legacy);assert.equal(migrated.dom.window.document.getElementById('hearts').textContent,'5 / 10');
  fillFading(migrated.dom,'Machine');migrated.dom.window.document.getElementById('check-btn').click();
  const saved=JSON.parse(migrated.dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.equal(saved.hearts,6);assert.equal(saved.progress.Machine,2);assert.equal(saved.focus,undefined);migrated.dom.window.close();
  const resumed=createGame(saved);assert.equal(resumed.dom.window.document.getElementById('hearts').textContent,'6 / 10');resumed.dom.window.close();
});

test('zero hearts allows correction and recovery but blocks hints',()=>{
  const {dom,errors}=createGame(baseSave({hearts:1,progress:{Machine:1}}));const doc=dom.window.document;
  doc.getElementById('hint-btn').click();assert.equal(doc.getElementById('hearts').textContent,'0 / 10');assert.ok(doc.getElementById('hint-btn').disabled);
  fillFading(dom,'Machine',true);doc.getElementById('check-btn').click();assert.equal(doc.getElementById('hearts').textContent,'0 / 10');
  fillFading(dom,'Machine');doc.getElementById('check-btn').click();assert.equal(doc.getElementById('hearts').textContent,'1 / 10');
  doc.getElementById('check-btn').click();assert.equal(doc.getElementById('hearts').textContent,'1 / 10');
  doc.getElementById('next-btn').click();assert.ok(!doc.getElementById('hint-btn').disabled);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('completion rewards all trials, caps hearts at ten, and audio is free',()=>{
  for(const tier of [0,1,2])for(const hearts of [5,10]){
    const {dom,errors}=createGame(baseSave({hearts,progress:{Machine:tier}}));const doc=dom.window.document;
    if(tier===0)for(const character of 'Machine')[...doc.querySelectorAll('.letter:not(.used)')].find(button=>button.textContent===character).click();
    else if(tier===1)fillFading(dom,'Machine');
    else{doc.getElementById('audio-btn').click();assert.equal(doc.getElementById('hearts').textContent,`${hearts} / 10`);type(dom,'Machine');}
    doc.getElementById('check-btn').click();assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).hearts,Math.min(hearts+1,10));
    assert.deepEqual(errors,[]);dom.window.close();
  }
});

test('Hear word speaks only the target once per click, including homophones and Spanish',()=>{
  for(const word of ['Machine','their','Mom','empresa']){
    const {dom,spoken}=createGame(baseSave({active:[word],progress:{[word]:2}}));
    assert.equal(spoken.length,0);
    for(let count=1;count<=2;count++){
      dom.window.document.getElementById('audio-btn').click();
      assert.equal(spoken.length,count);assert.equal(spoken.at(-1).text,word);
    }
    assert.equal(spoken[0].lang,word==='empresa'?'es-US':'en-US');dom.window.close();
  }
});
test('Voice keyboard supports editing, case, phrases and accents without native input',()=>{
  const {dom,errors}=createGame(baseSave({progress:{Machine:2}})),doc=dom.window.document;
  assert.equal(doc.querySelectorAll('#answer-area input, #answer-area textarea, #answer-area [contenteditable]').length,0);
  type(dom,"Mom's café-au lait");
  assert.equal(doc.getElementById('spell-input').textContent,"Mom's café-au lait");
  doc.querySelector('[aria-label="Backspace"]').click();
  assert.equal(doc.getElementById('spell-input').textContent,"Mom's café-au lai");
  type(dom,'Machine');doc.getElementById('check-btn').click();
  const answer=doc.getElementById('spell-input').textContent;
  doc.querySelector('[data-character="x"]').click();
  assert.equal(doc.getElementById('spell-input').textContent,answer);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('map toggle is reversible and trial themes retain the same audio control',()=>{
  for(const tier of [0,1,2]){
    const {dom,errors}=createGame(baseSave({progress:{Machine:tier}})),doc=dom.window.document;
    assert.equal(doc.querySelector('.challenge').dataset.trial,String(tier));
    assert.equal(doc.querySelectorAll('#audio-btn').length,1);
    assert.equal(doc.getElementById('audio-btn').parentElement.id,'audio-control');
    const toggle=doc.getElementById('map-toggle');
    toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'true');
    toggle.click();assert.equal(toggle.getAttribute('aria-expanded'),'false');
    assert.deepEqual(errors,[]);dom.window.close();
  }
});

test('story advances once per completion, survives reload, and stays hidden during answers',()=>{
  const first=createGame(baseSave({progress:{Machine:2}})),doc=first.dom.window.document;
  type(first.dom,'wrong');doc.getElementById('check-btn').click();
  assert.equal(JSON.parse(first.dom.window.localStorage.getItem('spellQuestMasteryV1')).storyVictories,0);
  assert.equal(doc.querySelector('.story-passage'),null);
  type(first.dom,'Machine');doc.getElementById('check-btn').click();
  assert.match(doc.querySelector('.story-passage p').textContent,/You reach Briarwood Crossing/);
  const sentence=doc.querySelector('.story-passage p').textContent;
  doc.getElementById('check-btn').click();
  let saved=JSON.parse(first.dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.equal(saved.storyVictories,1);assert.equal(saved.storyJournal.length,1);
  assert.deepEqual(saved.mastered,[]); // A corrected visit advances narrative, not mastery.
  doc.getElementById('next-btn').click();
  assert.equal(doc.querySelector('.story-passage'),null);assert.equal(doc.querySelector('.story-journal'),null);
  saved=JSON.parse(first.dom.window.localStorage.getItem('spellQuestMasteryV1'));saved.cursor=0;first.dom.window.close();
  const resumed=createGame(saved);type(resumed.dom,'Machine');resumed.dom.window.document.getElementById('check-btn').click();
  const next=resumed.dom.window.document.querySelector('.story-passage p').textContent;
  assert.notEqual(next,sentence);assert.match(next,/freeing a scout/);
  assert.equal(JSON.parse(resumed.dom.window.localStorage.getItem('spellQuestMasteryV1')).storyVictories,2);
  assert.deepEqual(resumed.errors,[]);resumed.dom.window.close();
});

test('adventure text covers the full clean campaign without identical sentences or missing placeholders',()=>{
  const {dom}=createGame(),seen=new Set();
  for(let index=0;index<wordBank().length*3;index++){
    const entry=dom.window.storyVictory(index);
    assert.ok(entry.text.includes('you ')||entry.text.startsWith('You '));
    assert.ok(!/[{}]/.test(entry.text));assert.ok(!seen.has(entry.text),'Repeated sentence '+index);
    seen.add(entry.text);
  }
  dom.window.close();
});

test('new campaign clears story and completed chapters keep it',()=>{
  const saved=baseSave({storyVictories:24,storyJournal:[{heading:'Earlier',text:'A previous adventure.'}]});
  const {dom}=createGame(saved);
  dom.window.document.getElementById('start-btn').click();
  for(const c of 'Machine')[...dom.window.document.querySelectorAll('.letter:not(.used)')].find(b=>b.textContent===c).click();
  dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).storyVictories,1);
  dom.window.close();
  const all=wordBank(),chapter=all.slice(0,10),last=chapter.at(-1);
  const final=createGame(baseSave({active:[last],queue:all.slice(10),mastered:chapter.slice(0,-1),progress:{[last]:2},storyVictories:29,storyJournal:[]}));
  type(final.dom,last);final.dom.window.document.getElementById('check-btn').click();final.dom.window.document.getElementById('next-btn').click();
  assert.match(final.dom.window.document.getElementById('ending-copy').textContent,/Ink Regent/);
  assert.ok(!final.dom.window.document.getElementById('ending-title').textContent.includes('falls'));
  final.dom.window.document.getElementById('replay-btn').click();
  assert.equal(JSON.parse(final.dom.window.localStorage.getItem('spellQuestMasteryV1')).storyVictories,30);
  final.dom.window.close();
});
test('Fading Script has no native editable fields and supports selection, backspace and clear',()=>{
  const {dom}=createGame(baseSave({progress:{Machine:1}})),doc=dom.window.document;
  assert.equal(doc.querySelectorAll('#answer-area input,#answer-area textarea,#answer-area [contenteditable]').length,0);
  const slots=[...doc.querySelectorAll('.fading-slot')];
  setFading(dom,slots[0],'z');assert.equal(slots[0].textContent,'z');assert.ok(slots[1].classList.contains('selected'));
  doc.querySelector('[aria-label="Backspace"]').click();assert.equal(slots[0].textContent,'');
  setFading(dom,slots[0],'z');[...doc.querySelectorAll('.voice-key')].find(b=>b.textContent==='Clear').click();
  assert.ok(slots.every(s=>!s.textContent));doc.getElementById('check-btn').click();assert.equal(doc.getElementById('hearts').textContent,'5 / 10');
  dom.window.close();
});
