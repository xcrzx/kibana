/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { ScopedFilesClient, FilesClient } from '../types';
import {
  API_BASE_PATH,
  FILES_API_BASE_PATH,
  FILES_PUBLIC_API_BASE_PATH,
  FILES_SHARE_API_BASE_PATH,
} from '../../common/api_routes';

/**
 * @internal
 */
export const apiRoutes = {
  /**
   * Scoped to file kind
   */
  getCreateFileRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}`,
  getUploadRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob`,
  getDownloadRoute: (fileKind: string, id: string, fileName?: string) =>
    `${FILES_API_BASE_PATH}/${fileKind}/${id}/blob${fileName ? '/' + fileName : ''}`,
  getUpdateRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getDeleteRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,
  getListRoute: (fileKind: string) => `${FILES_API_BASE_PATH}/${fileKind}/list`,
  getByIdRoute: (fileKind: string, id: string) => `${FILES_API_BASE_PATH}/${fileKind}/${id}`,

  /**
   * Scope to file shares and file kind
   */
  getShareRoute: (fileKind: string, id: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}/${id}`,
  getListSharesRoute: (fileKind: string) => `${FILES_SHARE_API_BASE_PATH}/${fileKind}`,

  /**
   * Public routes
   */
  getPublicDownloadRoute: (fileName?: string) =>
    `${FILES_PUBLIC_API_BASE_PATH}/blob${fileName ? '/' + fileName : ''}`,

  /**
   * Top-level routes
   */
  getFindRoute: () => `${API_BASE_PATH}/find`,
  getMetricsRoute: () => `${API_BASE_PATH}/metrics`,
};

/**
 * Arguments to create a new {@link FileClient}.
 */
export interface Args {
  /**
   * The http start service from core.
   */
  http: HttpStart;
}

/**
 * Arguments to create a new {@link ScopedFilesClient}.
 */
export interface ScopedArgs extends Args {
  /**
   * The file kind to scope all requests to where file kinds are needed.
   */
  fileKind: string;
}

const commonBodyHeaders = {
  headers: {
    'content-type': 'application/json',
  },
};

export function createFilesClient(args: Args): FilesClient;
export function createFilesClient(scopedArgs: ScopedArgs): ScopedFilesClient;
export function createFilesClient({
  http,
  fileKind: scopedFileKind,
}: {
  http: HttpStart;
  fileKind?: string;
}): FilesClient | ScopedFilesClient {
  const api: FilesClient = {
    create: ({ kind, ...args }) => {
      return http.post(apiRoutes.getCreateFileRoute(scopedFileKind ?? kind), {
        headers: commonBodyHeaders,
        body: JSON.stringify(args),
      });
    },
    delete: ({ kind, ...args }) => {
      return http.delete(apiRoutes.getDeleteRoute(scopedFileKind ?? kind, args.id));
    },
    download: ({ kind, ...args }) => {
      return http.get(apiRoutes.getDownloadRoute(scopedFileKind ?? kind, args.id, args.fileName), {
        headers: { Accept: '*/*' },
      });
    },
    getById: ({ kind, ...args }) => {
      return http.get(apiRoutes.getByIdRoute(scopedFileKind ?? kind, args.id));
    },
    list({ kind, page, perPage } = { kind: '' }) {
      return http.get(apiRoutes.getListRoute(scopedFileKind ?? kind), {
        query: { page, perPage },
      });
    },
    update: ({ kind, id, ...body }) => {
      return http.patch(apiRoutes.getUpdateRoute(scopedFileKind ?? kind, id), {
        headers: commonBodyHeaders,
        body: JSON.stringify(body),
      });
    },
    upload: ({ kind, abortSignal, contentType, selfDestructOnAbort, ...args }) => {
      return http.put(apiRoutes.getUploadRoute(scopedFileKind ?? kind, args.id), {
        query: { selfDestructOnAbort },
        headers: {
          'Content-Type': contentType ?? 'application/octet-stream',
        },
        signal: abortSignal,
        body: args.body as BodyInit,
      });
    },
    getDownloadHref: ({ fileKind: kind, id }) => {
      return `${http.basePath.prepend(apiRoutes.getDownloadRoute(scopedFileKind ?? kind, id))}`;
    },
    share: ({ kind, fileId, name, validUntil }) => {
      return http.post(apiRoutes.getShareRoute(scopedFileKind ?? kind, fileId), {
        headers: commonBodyHeaders,
        body: JSON.stringify({ name, validUntil }),
      });
    },
    unshare: ({ kind, id }) => {
      return http.delete(apiRoutes.getShareRoute(scopedFileKind ?? kind, id));
    },
    getShare: ({ kind, id }) => {
      return http.get(apiRoutes.getShareRoute(scopedFileKind ?? kind, id));
    },
    listShares: ({ kind, forFileId, page, perPage }) => {
      return http.get(apiRoutes.getListSharesRoute(scopedFileKind ?? kind), {
        query: { page, perPage, forFileId },
      });
    },
    find: ({ page, perPage, ...filterArgs }) => {
      return http.post(apiRoutes.getFindRoute(), {
        query: {
          page,
          perPage,
        },
        headers: commonBodyHeaders,
        body: JSON.stringify(filterArgs),
      });
    },
    getMetrics: () => {
      return http.get(apiRoutes.getMetricsRoute());
    },
    publicDownload: ({ token, fileName }) => {
      return http.get(apiRoutes.getPublicDownloadRoute(fileName), { query: { token } });
    },
  };
  return api;
}
