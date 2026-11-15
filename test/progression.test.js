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
  dom.window.eval(fs.readFileSync(path.join(root,'game.js'),'utf8'));
  dom.window.document.getElementById(saved?'continue-btn':'start-btn').click();
  return {dom,errors,spoken};
}
function baseSave(overrides={}){
  const words=['Machine','Accept','except','Father','Scary','Steal','Ate','Intensity','Level','Stopped'];
  return {active:words,queue:['Mother'],mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:10,stars:0,streak:0,focus:10,attempts:{},...overrides};
}
function type(dom,value){const input=dom.window.document.getElementById('spell-input');input.value=value;input.dispatchEvent(new dom.window.Event('input'));}
function wordBank(){const dom=new JSDOM('<!doctype html>',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(path.join(root,'words.js'),'utf8'));return dom.window.WORD_BANK;}
function fillFading(dom,word,wrong=false){for(const input of dom.window.document.querySelectorAll('.missing-word input')){const expected=word[Number(input.dataset.position)];input.value=wrong?(expected.toLocaleLowerCase()==='z'?'x':'z'):expected;input.dispatchEvent(new dom.window.Event('input'));}}
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

test('wrong checks and hints spend Focus while blank checks are free',()=>{
  const {dom,errors}=createGame();
  dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'))?.focus??10,10);
  const firstSlot=dom.window.document.querySelector('.slot');
  [...dom.window.document.querySelectorAll('.letter')].find(button=>button.textContent.toLocaleLowerCase()!=='m').click();
  dom.window.document.getElementById('check-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).focus,8);
  dom.window.document.getElementById('hint-btn').click();
  assert.equal(JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1')).focus,7);
  assert.equal(dom.window.document.getElementById('focus').textContent,'7 / 10');
  assert.ok(firstSlot.classList.contains('wrong'));
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a correct Rune Path advances the roster and fully renders the next challenge',()=>{
  const {dom,errors}=createGame();
  const firstSlot=dom.window.document.querySelector('.slot');
  const wrongButton=[...dom.window.document.querySelectorAll('.letter')].find(candidate=>candidate.textContent.toLocaleLowerCase()!=='m');
  wrongButton.click();
  assert.ok(firstSlot.classList.contains('wrong'));
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
  assert.ok(dom.window.document.querySelectorAll('.missing-word input').length>=2);
  assertTargetHidden(dom,'Machine');
  const input=dom.window.document.querySelector('.missing-word input'),expected='Machine'[Number(input.dataset.position)];
  input.value=expected.toLocaleLowerCase()==='z'?'x':'z';input.dispatchEvent(new dom.window.Event('input'));
  assert.ok(input.classList.contains('wrong'));
  input.value=expected;input.dispatchEvent(new dom.window.Event('input'));
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
  dom.window.document.getElementById('audio-btn').click();assert.match(spoken[0].text,/Machine/);
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
