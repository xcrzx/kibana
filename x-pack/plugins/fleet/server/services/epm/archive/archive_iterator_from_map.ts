/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetsMap, IArchiveIterator } from '../../../../common/types';

// TODO refactor to a builder and combine with ArchiveIterator
export class ArchiveIteratorFromMap implements IArchiveIterator {
  constructor(private assetsMap: AssetsMap) {}

  async traverseEntries(
    callback: (entry: { path: string; buffer?: Buffer }) => Promise<void>
  ): Promise<void> {
    for (const [path, buffer] of this.assetsMap) {
      await callback({ path, buffer });
    }
  }

  async getPaths(): Promise<string[]> {
    return [...this.assetsMap.keys()];
  }
}
