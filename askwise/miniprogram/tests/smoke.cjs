'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  assert.ok(fs.existsSync(absolutePath), 'missing ' + relativePath);
  return fs.readFileSync(absolutePath, 'utf8');
}

const app = JSON.parse(read('app.json'));
assert.deepStrictEqual(app.pages, [
  'pages/login/index',
  'pages/today/index',
  'pages/task/index',
  'pages/evidence/index',
  'pages/reflection/index',
  'pages/dashboard/index'
]);

const project = JSON.parse(read('project.config.json'));
assert.strictEqual(project.appid, 'touristappid');
assert.strictEqual(project.miniprogramRoot, './');
assert.strictEqual(project.packOptions.ignore.length, 6);
assert.ok(project.packOptions.ignore.every((entry) => entry.value !== 'assets/aoyu/poses/idle.png'));

const config = require(path.join(root, 'config.js'));
assert.strictEqual(config.API_BASE_URL, '');
assert.throws(() => config.getApiRoot(), /not configured/i);

const api = read('api.js');
[
  '/wechat-login',
  '/login',
  '/today',
  '/tasks/',
  '/evidence',
  '/dashboard',
  '/reflection',
  '/logout',
  'Bearer ',
  'request_id',
  'wx.uploadFile',
  "name: 'photo'",
  'wx.downloadFile'
].forEach((needle) => assert.ok(api.includes(needle), 'api missing ' + needle));

const ui = read('ui.js');
assert.ok(ui.includes("if (state === 'error')"));
assert.ok(ui.includes("return POSES.idle;"));

const readme = read('README.md');
assert.ok(readme.includes('CODE EXISTS'));
assert.ok(readme.includes('BUILD BLOCKED'));
assert.ok(readme.includes('touristappid'));
assert.ok(readme.includes('不创建假二维码'));

[
  'idle.png',
  'guiding.png',
  'celebrating.png',
  'reflecting.png',
  'listening.png',
  'thinking.png',
  'encouraging.png'
].forEach((asset) => {
  const assetPath = path.join(root, 'assets', 'aoyu', 'poses', asset);
  assert.ok(fs.existsSync(assetPath), 'missing approved asset ' + asset);
  assert.ok(fs.statSync(assetPath).size > 0, 'empty approved asset ' + asset);
});

console.log('askwise native miniprogram smoke: PASS');
