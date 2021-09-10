/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';

export const benchRulesRulesClient = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bench_rules_rules_client`,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const rulesClient = context.alerting?.getRulesClient();

      const rules = await rulesClient.find({
        options: {
          perPage: 20,
          page: 1,
          sortField: 'enabled',
          sortOrder: 'desc',
          filter: 'alert.attributes.tags:"__internal_immutable:true"',
          fields: undefined,
        },
      });

      return response.ok({
        body: rules,
      });
    }
  );
};
