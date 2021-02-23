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
`,
  '--style',
  'error',
  '--context',
  'ctx-error',
];

spawnSync('buildkite-agent', args, {
  stdio: 'inherit',
});
