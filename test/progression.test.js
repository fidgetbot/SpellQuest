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
  return {active:words,queue:['Mother'],mastered:[],progress:{},cursor:0,chapterStart:0,chapterTarget:10,stars:0,streak:0,attempts:{},...overrides};
}
function type(dom,value){const input=dom.window.document.getElementById('spell-input');input.value=value;input.dispatchEvent(new dom.window.Event('input'));}
function wordBank(){const dom=new JSDOM('<!doctype html>',{runScripts:'outside-only'});dom.window.eval(fs.readFileSync(path.join(root,'words.js'),'utf8'));return dom.window.WORD_BANK;}

test('the supplied bank expands alternatives, preserves phrases, and removes ordinary duplicates',()=>{
  const words=wordBank();
  for(const entry of ['Accept','except',"they're",'their','San Francisco','United States','empresa','volver','Mom','mom'])assert.ok(words.includes(entry),entry);
  assert.equal(words.filter(word=>word.toLocaleLowerCase()==='beautiful').length,1);
  assert.equal(words.filter(word=>word.toLocaleLowerCase()==='mom').length,2);
});

test('only ten words are active and new bank entries are queued',()=>{
  const {dom,errors}=createGame();
  assert.equal(dom.window.document.querySelectorAll('.active-word').length,10);
  assert.match(dom.window.document.getElementById('queue-count').textContent,/waiting/);
  assert.equal(dom.window.document.querySelector('.active-name').textContent,'Machine');
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a correct Rune Path advances the roster and fully renders the next challenge',()=>{
  const {dom,errors}=createGame();
  for(const character of 'Machine'){
    const button=[...dom.window.document.querySelectorAll('.letter:not(.used)')].find(candidate=>candidate.textContent===character);
    assert.ok(button,`available rune ${character}`);button.click();
  }
  dom.window.document.getElementById('check-btn').click();dom.window.document.getElementById('next-btn').click();
  const saved=JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.equal(saved.progress.Machine,1);
  assert.equal(dom.window.document.querySelectorAll('.active-word').length,10);
  assert.equal(dom.window.document.querySelector('.active-word.current .active-name').textContent,'Accept');
  assert.ok(dom.window.document.querySelectorAll('.letter').length>=2);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('a word returning for its second trial renders the harder Fading Script',()=>{
  const {dom,errors}=createGame(baseSave({progress:{Machine:1}}));
  assert.equal(dom.window.document.getElementById('challenge-type').textContent,'Fading Script');
  assert.ok(dom.window.document.querySelectorAll('.missing-word input').length>=2);
  assert.deepEqual(errors,[]);dom.window.close();
});

test('Voice Trial has audio, no hints or pool, and mastery slots in the next word',()=>{
  const save=baseSave({progress:{Machine:2}});const {dom,errors,spoken}=createGame(save);
  assert.equal(dom.window.document.getElementById('challenge-type').textContent,'Voice Trial');
  assert.ok(dom.window.document.getElementById('hint-btn').classList.contains('hidden'));
  assert.equal(dom.window.document.querySelectorAll('.letter').length,0);
  dom.window.document.getElementById('audio-btn').click();assert.match(spoken[0].text,/Machine/);
  type(dom,'Machine');dom.window.document.getElementById('check-btn').click();
  const persisted=JSON.parse(dom.window.localStorage.getItem('spellQuestMasteryV1'));
  assert.deepEqual(persisted.mastered,['Machine']);
  assert.equal(persisted.active.length,10);assert.ok(persisted.active.includes('Mother'));
  assert.ok(dom.window.document.querySelectorAll('.jewel-win').length>=2);
  dom.window.document.getElementById('next-btn').click();assert.ok(dom.window.document.querySelector('.active-word.current'));
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
