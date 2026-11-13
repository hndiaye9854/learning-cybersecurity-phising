'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp } = require('../src/app');

const TOKEN = 'test-token-123456';
let server;
let base;
let tmpDir;
let dataFile;

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phishing-demo-'));
  dataFile = path.join(tmpDir, 'submissions.json');
  const app = createApp({ adminToken: TOKEN, dataFile });
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

const post = (pseudo) =>
  fetch(`${base}/acces`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ pseudo }),
    redirect: 'manual',
  });

const basic = (pwd) => `Basic ${Buffer.from(`admin:${pwd}`).toString('base64')}`;

test('la page d’accueil s’affiche sans demander de mot de passe ni d’e-mail', async () => {
  const res = await fetch(base);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /Entrez votre pseudo/);
  assert.doesNotMatch(html, /type="password"|type="email"/);
});

test('un pseudo valide est enregistré puis redirige vers la sensibilisation', async () => {
  const res = await post('lecteur42');
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('location'), '/sensibilisation');

  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(data.count, 1);
  assert.equal(data.entries[0].pseudo, 'lecteur42');
  assert.deepEqual(Object.keys(data.entries[0]).sort(), ['at', 'pseudo']);
});

test('un pseudo invalide ou ressemblant à un e-mail est refusé', async () => {
  for (const bad of ['', 'a', 'x'.repeat(31), 'nom@exemple.fr', '<script>']) {
    const res = await post(bad);
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), '/?erreur=pseudo');
  }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(data.count, 1);
});

test('la page de sensibilisation révèle le test', async () => {
  const res = await fetch(`${base}/sensibilisation`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /Ceci était un test de sensibilisation au phishing/);
});

test('/stats exige ADMIN_TOKEN', async () => {
  assert.equal((await fetch(`${base}/stats`)).status, 401);
  const wrong = await fetch(`${base}/stats`, { headers: { authorization: basic('nope') } });
  assert.equal(wrong.status, 401);

  const ok = await fetch(`${base}/stats`, { headers: { authorization: basic(TOKEN) } });
  assert.equal(ok.status, 200);
  const html = await ok.text();
  assert.match(html, /lecteur42/);
});

test('les écritures concurrentes ne perdent aucune soumission', async () => {
  await Promise.all(Array.from({ length: 20 }, (_, i) => post(`eleve_${i}`)));
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  assert.equal(data.count, 21);
  assert.equal(data.entries.length, 21);
});
