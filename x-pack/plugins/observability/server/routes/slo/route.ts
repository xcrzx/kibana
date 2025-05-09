/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateSLO,
  DeleteSLO,
  DefaultResourceInstaller,
  DefaultTransformManager,
  KibanaSavedObjectsSLORepository,
  GetSLO,
} from '../../services/slo';

import {
  ApmTransactionDurationTransformGenerator,
  ApmTransactionErrorRateTransformGenerator,
  TransformGenerator,
} from '../../services/slo/transform_generators';
import { SLITypes } from '../../types/models';
import {
  createSLOParamsSchema,
  deleteSLOParamsSchema,
  getSLOParamsSchema,
} from '../../types/rest_specs';
import { createObservabilityServerRoute } from '../create_observability_server_route';

const transformGenerators: Record<SLITypes, TransformGenerator> = {
  'slo.apm.transaction_duration': new ApmTransactionDurationTransformGenerator(),
  'slo.apm.transaction_error_rate': new ApmTransactionErrorRateTransformGenerator(),
};

const createSLORoute = createObservabilityServerRoute({
  endpoint: 'POST /api/observability/slos',
  options: {
    tags: [],
  },
  params: createSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const resourceInstaller = new DefaultResourceInstaller(esClient, logger);
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);
    const createSLO = new CreateSLO(resourceInstaller, repository, transformManager);

    const response = await createSLO.execute(params.body);

    return response;
  },
});

const deleteSLORoute = createObservabilityServerRoute({
  endpoint: 'DELETE /api/observability/slos/{id}',
  options: {
    tags: [],
  },
  params: deleteSLOParamsSchema,
  handler: async ({ context, params, logger }) => {
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;

    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const transformManager = new DefaultTransformManager(transformGenerators, esClient, logger);

    const deleteSLO = new DeleteSLO(repository, transformManager, esClient);

    await deleteSLO.execute(params.path.id);
  },
});

const getSLORoute = createObservabilityServerRoute({
  endpoint: 'GET /api/observability/slos/{id}',
  options: {
    tags: [],
  },
  params: getSLOParamsSchema,
  handler: async ({ context, params }) => {
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient);
    const getSLO = new GetSLO(repository);

    const response = await getSLO.execute(params.path.id);

    return response;
  },
});

export const slosRouteRepository = { ...createSLORoute, ...getSLORoute, ...deleteSLORoute };
