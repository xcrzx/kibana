/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import { of, delay, merge, tap, mergeMap } from 'rxjs';
import { TestScheduler } from 'rxjs/testing';
import type { FileKind, FileJSON } from '../../../common';
import { createMockFilesClient } from '../../mocks';
import type { FilesClient } from '../../types';

import { UploadState } from './upload_state';

const getTestScheduler = () =>
  new TestScheduler((actual, expected) => expect(actual).toEqual(expected));

describe('UploadState', () => {
  let filesClient: DeeplyMockedKeys<FilesClient>;
  let uploadState: UploadState;
  let testScheduler: TestScheduler;

  beforeEach(() => {
    filesClient = createMockFilesClient();
    filesClient.create.mockReturnValue(of({ file: { id: 'test' } as FileJSON }) as any);
    filesClient.upload.mockReturnValue(of(undefined) as any);
    uploadState = new UploadState(
      { id: 'test', http: {}, maxSizeBytes: 1000 } as FileKind,
      filesClient
    );
    testScheduler = getTestScheduler();
  });

  it('calls file client with expected arguments', async () => {
    testScheduler.run(({ expectObservable, cold, flush }) => {
      const file1 = { name: 'test.png', size: 1, type: 'image/png' } as File;

      uploadState.setFiles([file1]);

      // Simulate upload being triggered async
      const upload$ = cold('--a|').pipe(tap(uploadState.upload));

      expectObservable(upload$).toBe('--a|');

      flush();

      expect(filesClient.create).toHaveBeenCalledTimes(1);
      expect(filesClient.create).toHaveBeenNthCalledWith(1, {
        kind: 'test',
        meta: 'a',
        mimeType: 'image/png',
        name: 'test',
      });
      expect(filesClient.upload).toHaveBeenCalledTimes(1);
      expect(filesClient.upload).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          selfDestructOnAbort: true,
        })
      );
    });
  });

  it('uploads all provided files and reports errors', async () => {
    testScheduler.run(({ expectObservable, cold, flush }) => {
      const file1 = { name: 'test', size: 1 } as File;
      const file2 = { name: 'test 2', size: 1 } as File;

      uploadState.setFiles([file1, file2]);

      // Simulate upload being triggered async
      const upload$ = cold('--a|').pipe(tap(uploadState.upload));

      expectObservable(upload$).toBe('--a|');

      expectObservable(uploadState.uploading$).toBe('a-(bc)', {
        a: false,
        b: true,
        c: false,
      });

      expectObservable(uploadState.files$).toBe('a-(bc)', {
        a: [
          { file: file1, status: 'idle' },
          { file: file2, status: 'idle' },
        ],
        b: [
          { file: file1, status: 'uploading' },
          { file: file2, status: 'uploading' },
        ],
        c: [
          { file: file1, status: 'uploaded', id: 'test' },
          { file: file2, status: 'uploaded', id: 'test' },
        ],
      });

      flush();

      expect(filesClient.create).toHaveBeenCalledTimes(2);
      expect(filesClient.upload).toHaveBeenCalledTimes(2);
      expect(filesClient.delete).not.toHaveBeenCalled();
    });
  });

  it('attempts to clean up all files when aborting', async () => {
    testScheduler.run(({ expectObservable, cold, flush }) => {
      filesClient.create.mockReturnValue(
        of({ file: { id: 'test' } as FileJSON }).pipe(delay(2)) as any
      );
      filesClient.upload.mockReturnValue(of(undefined).pipe(delay(10)) as any);
      filesClient.delete.mockReturnValue(of(undefined) as any);

      const file1 = { name: 'test' } as File;
      const file2 = { name: 'test 2.png', type: 'image/png' } as File;

      uploadState.setFiles([file1, file2]);

      // Simulate upload being triggered async
      const upload$ = cold('-0|').pipe(tap(() => uploadState.upload({ myMeta: true })));
      const abort$ = cold(' --1|').pipe(tap(uploadState.abort));

      expectObservable(merge(upload$, abort$)).toBe('-01|');

      expectObservable(uploadState.error$).toBe('0---', [undefined]);

      expectObservable(uploadState.uploading$).toBe('ab-c', {
        a: false,
        b: true,
        c: false,
      });

      expectObservable(uploadState.files$).toBe('ab-c', {
        a: [
          { file: file1, status: 'idle' },
          { file: file2, status: 'idle' },
        ],
        b: [
          { file: file1, status: 'uploading' },
          { file: file2, status: 'uploading' },
        ],
        c: [
          { file: file1, status: 'upload_failed' },
          { file: file2, status: 'upload_failed' },
        ],
      });

      flush();

      expect(filesClient.create).toHaveBeenCalledTimes(2);
      expect(filesClient.create).toHaveBeenNthCalledWith(1, {
        kind: 'test',
        meta: { myMeta: true },
        mimeType: undefined,
        name: 'test',
      });
      expect(filesClient.create).toHaveBeenNthCalledWith(2, {
        kind: 'test',
        meta: { myMeta: true },
        mimeType: 'image/png',
        name: 'test 2',
      });
      expect(filesClient.upload).toHaveBeenCalledTimes(2);
    });
  });

  it('throws for files that are too large', () => {
    testScheduler.run(({ expectObservable }) => {
      const file = {
        name: 'test',
        size: 1001,
      } as File;
      uploadState.setFiles([file]);
      expectObservable(uploadState.files$).toBe('a', {
        a: [
          {
            file,
            status: 'idle',
            error: new Error('File is too large. Maximum size is 1,000 bytes.'),
          },
        ],
      });
    });
  });

  it('option "allowRepeatedUploads" calls clear after upload is done', () => {
    testScheduler.run(({ expectObservable, cold }) => {
      uploadState = new UploadState(
        { id: 'test', http: {}, maxSizeBytes: 1000 } as FileKind,
        filesClient,
        { allowRepeatedUploads: true }
      );
      const file1 = { name: 'test' } as File;
      const file2 = { name: 'test 2.png' } as File;

      uploadState.setFiles([file1, file2]);

      const upload$ = cold('-0|').pipe(mergeMap(() => uploadState.upload({ myMeta: true })));
      expectObservable(upload$, '           --^').toBe('---0|', [undefined]);
      expectObservable(uploadState.clear$, '^').toBe('  ---0-', [undefined]);
    });
  });
});
