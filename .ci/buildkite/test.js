/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { spawnSync } = require('child_process');

const args = [
  'annotate',
  `
Hello

---

<details>
  <summary>

## Image

  </summary>
  <img class="ml4" src="artifact://src/plugins/index_pattern_management/public/assets/icons/go.png" />
</details>

<table>
  <tr>
    <td>world</td>
    <td>I</td>
    <td>am</td>
  </tr>
  <tr>
    <td>a</td>
    <td>table</td>
    <td>.</td>
  </tr>
</table>

<svg fill="none" viewBox="0 0 120 120" width="120" height="120" xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml">
      <style>
@keyframes bounce {
  0%   { transform: scale(1,    1)   translateY(0)     skew(0deg,  0deg); }
  3%   { transform: scale(1,    1)   translateY(0)     skew(0deg,  0deg); }
  5%   { transform: scale(1.1,  .9)  translateY(5px)   skew(0deg,  0deg); }
  12%  { transform: scale(.9,   1.1) translateY(-70px) skew(25deg, 5deg); }
  13%  { transform: scale(.9,   1.1) translateY(-70px) skew(25deg, 5deg); }
  20%  { transform: scale(1.05, .95) translateY(0)     skew(0deg,  0deg); }
  22%  { transform: scale(1,    1)   translateY(-7px)  skew(0deg,  0deg); }
  27%  { transform: scale(1,    1)   translateY(0)     skew(0deg,  0deg); }
  100% { transform: scale(1,    1)   translateY(0)     skew(0deg,  0deg); }
}
h1 {
  width: 120px;
  line-height: 20px;
  padding-top: 70px;
  text-align: center;
  font: 400 16px/1.5 Helvetica ,Arial ,sans-serif;
  color: rgb(52, 73, 94);
  transform-origin: bottom;
  animation: 4s cubic-bezier(.5, 0, .5, 1.2) 1s infinite bounce;
}
      </style>
      <h1>Hello, world</h1>
    </div>
  </foreignObject>
</svg>
`,
  '--style',
  'error',
  '--context',
  'ctx-error',
];

spawnSync('buildkite-agent', args, {
  stdio: 'inherit',
});
