const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.join(__dirname, '..');

test('a correct first challenge advances and fully renders challenge two', async () => {
  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => browserErrors.push(error));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
    url: 'https://example.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
  });

  dom.window.eval(fs.readFileSync(path.join(root, 'game.js'), 'utf8'));
  dom.window.document.getElementById('start-btn').click();

  for (const character of 'strength') {
    const button = [...dom.window.document.querySelectorAll('.letter:not(.used)')]
      .find(candidate => candidate.textContent === character);
    assert.ok(button, `available letter ${character}`);
    button.click();
  }

  dom.window.document.getElementById('check-btn').click();
  dom.window.document.getElementById('next-btn').click();

  assert.equal(dom.window.document.getElementById('round-count').textContent, 'Challenge 2 of 13');
  assert.equal(dom.window.document.getElementById('level').textContent, '2');
  assert.equal(dom.window.document.querySelectorAll('.missing-word input').length, 2);
  assert.equal(JSON.parse(dom.window.localStorage.getItem('wordQuestSave')).index, 1);
  assert.deepEqual(browserErrors, []);
  dom.window.close();
});
