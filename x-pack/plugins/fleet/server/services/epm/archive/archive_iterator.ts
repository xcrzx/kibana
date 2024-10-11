/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IArchiveIterator } from '../../../../common/types';

import { traverseArchiveEntries } from '.';

export class ArchiveIterator implements IArchiveIterator {
  constructor(private archiveBuffer: Buffer, private contentType: string) {}

  #paths: string[] = [];

  async traverseEntries(
    callback: (entry: { path: string; buffer?: Buffer }) => Promise<void>
  ): Promise<void> {
    await traverseArchiveEntries(this.archiveBuffer, this.contentType, async (entry) => {
      await callback(entry);
    });
  }

  async getPaths(): Promise<string[]> {
    if (this.#paths.length) {
      return this.#paths;
    }

    await this.traverseEntries(async (entry) => {
      this.#paths.push(entry.path);
    });

    return this.#paths;
  }
}
