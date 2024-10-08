/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  FileMetadataClient,
  FileDescriptor,
  DeleteArg as DeleteMetedataArg,
  FindArg as FindMetadataArg,
  GetArg as GetMetadataArg,
  GetUsageMetricsArgs,
  ListArg as ListMetadataArg,
  UpdateArgs as UpdateMetadataArg,
} from './file_metadata_client';
export { SavedObjectsFileMetadataClient, EsIndexFilesMetadataClient } from './adapters';
