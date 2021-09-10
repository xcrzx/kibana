/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getRndMetric, TEST_INDEX } from '../utils';

export const benchRulesNoAggs = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bench_rules_no_aggs`,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const isCacheEnabled = !!request.query.cache;
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const metric = getRndMetric();

      const resultSort = await esClient.search({
        index: TEST_INDEX,
        request_cache: isCacheEnabled,
        body: {
          size: 20,
          track_total_hits: false,
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    'kibana.space_ids': ['default'],
                  },
                },
                {
                  terms: {
                    'event.kind': ['metric'],
                  },
                },
                {
                  terms: {
                    'event.action': [metric],
                  },
                },
              ],
            },
          },
        },
      });

      return response.ok({
        body: resultSort,
      });
    }
  );
};
