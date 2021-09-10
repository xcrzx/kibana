/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { getMetricField } from '../../rule_execution_log/rule_registry_adapter/rule_registry_log_client/utils';
import { getRndMetric, sortNewestFirst, TEST_INDEX } from '../utils';

export const benchRulesSplit = (router: SecuritySolutionPluginRouter) => {
  router.post(
    {
      path: `${DETECTION_ENGINE_RULES_URL}/_bench_rules_split`,
      validate: false,
      options: {
        tags: ['access:securitySolution'],
      },
    },
    async (context, request, response) => {
      const isCacheEnabled = !!request.query.cache;
      const esClient = context.core.elasticsearch.client.asInternalUser;

      const metric = getRndMetric();
      const metricField = getMetricField(metric);

      const resultSort = await esClient.search({
        index: TEST_INDEX,
        request_cache: isCacheEnabled,
        body: {
          size: 0,
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
          aggs: {
            rules: {
              terms: {
                field: 'kibana.alert.rule.uuid',
                size: 9999,
              },
              aggs: {
                last_value: {
                  top_metrics: {
                    metrics: [
                      {
                        field: metricField,
                      },
                    ],
                    sort: {
                      '@timestamp': 'desc',
                    },
                  },
                },
                events_sort: {
                  bucket_sort: {
                    sort: [
                      {
                        [`last_value[${metricField}]`]: {
                          order: 'desc',
                        },
                      },
                    ],
                    size: 20,
                  },
                },
              },
            },
          },
        },
      });

      const ruleIds = resultSort.body.aggregations!.rules.buckets.map((x) => x.key);

      const [lastStatusesResult, lastMetricsResult] = await Promise.all([
        esClient.search({
          index: TEST_INDEX,
          request_cache: isCacheEnabled,
          body: {
            size: 0,
            track_total_hits: false,
            query: {
              bool: {
                filter: [
                  { terms: { 'kibana.alert.rule.uuid': ruleIds } },
                  { term: { 'kibana.space_ids': 'default' } },
                  { term: { 'event.action': 'status-change' } },
                ],
              },
            },
            aggs: {
              rules: {
                terms: { field: 'kibana.alert.rule.uuid' },
                aggs: {
                  last_status: {
                    top_hits: {
                      sort: sortNewestFirst,
                      size: 1,
                    },
                  },
                  last_success: {
                    filter: {
                      term: { 'kibana.rac.detection_engine.rule_status': 'succeeded' },
                    },
                    aggs: {
                      event: {
                        top_hits: {
                          sort: sortNewestFirst,
                          size: 1,
                        },
                      },
                    },
                  },
                  last_failure: {
                    filter: {
                      term: { 'kibana.rac.detection_engine.rule_status': 'failed' },
                    },
                    aggs: {
                      event: {
                        top_hits: {
                          sort: sortNewestFirst,
                          size: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        esClient.search({
          index: TEST_INDEX,
          request_cache: isCacheEnabled,
          body: {
            size: 0,
            track_total_hits: false,
            query: {
              bool: {
                filter: [
                  { terms: { 'kibana.alert.rule.uuid': ruleIds } },
                  { term: { 'kibana.space_ids': 'default' } },
                  { term: { 'event.kind': 'metric' } },
                ],
              },
            },
            aggs: {
              rules: {
                terms: {
                  field: 'kibana.alert.rule.uuid',
                },
                aggs: {
                  execution_gap: {
                    filter: {
                      term: { 'event.action': 'executionGap' },
                    },
                    aggs: {
                      event: {
                        top_hits: {
                          size: 1,
                          sort: sortNewestFirst,
                          _source: ['@timestamp', 'event.duration'],
                        },
                      },
                    },
                  },
                  search_duration_max: {
                    filter: {
                      term: { 'event.action': 'searchDurationMax' },
                    },
                    aggs: {
                      event: {
                        top_hits: {
                          size: 1,
                          sort: sortNewestFirst,
                          _source: ['@timestamp', 'event.duration'],
                        },
                      },
                    },
                  },
                  indexing_duration_max: {
                    filter: {
                      term: { 'event.action': 'indexingDurationMax' },
                    },
                    aggs: {
                      event: {
                        top_hits: {
                          size: 1,
                          sort: sortNewestFirst,
                          _source: ['@timestamp', 'event.duration'],
                        },
                      },
                    },
                  },
                  indexing_lookback: {
                    filter: {
                      term: { 'event.action': 'indexingLookback' },
                    },
                    aggs: {
                      event: {
                        top_hits: {
                          size: 1,
                          sort: sortNewestFirst,
                          _source: ['@timestamp', 'event.end'],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return response.ok({
        body: {
          lastStatuses: lastStatusesResult.body,
          lastMetrics: lastMetricsResult.body,
        },
      });
    }
  );
};
