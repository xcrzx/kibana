/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge } from 'lodash';
import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common/schemas';
import { RuleRegistryLogClient } from './rule_registry_log_client/rule_registry_log_client';
import {
  CreateExecutionLogArgs,
  ExecutionMetric,
  ExecutionMetricArgs,
  FindBulkExecutionLogArgs,
  FindExecutionLogArgs,
  IRuleDataPluginService,
  IRuleExecutionLogClient,
  LogStatusChangeArgs,
  UpdateExecutionLogArgs,
} from '../types';

/**
 * @deprecated RuleRegistryAdapter is kept here only as a reference. It will be superseded with EventLog implementation
 */
export class RuleRegistryAdapter implements IRuleExecutionLogClient {
  private ruleRegistryClient: RuleRegistryLogClient;

  constructor(ruleDataService: IRuleDataPluginService) {
    this.ruleRegistryClient = new RuleRegistryLogClient(ruleDataService);
  }

  public async find({ ruleId, logsCount = 1, spaceId }: FindExecutionLogArgs) {
    const logs = await this.ruleRegistryClient.find({
      ruleIds: [ruleId],
      logsCount,
      spaceId,
    });

    return logs[ruleId].map((log) => ({
      id: '',
      type: '',
      score: 0,
      attributes: log,
      references: [],
    }));
  }

  public async findBulk({ ruleIds, logsCount = 1, spaceId }: FindBulkExecutionLogArgs) {
    const [statusesById, lastErrorsById] = await Promise.all([
      this.ruleRegistryClient.find({ ruleIds, spaceId }),
      this.ruleRegistryClient.find({
        ruleIds,
        statuses: [RuleExecutionStatus.failed],
        logsCount,
        spaceId,
      }),
    ]);
    return merge(statusesById, lastErrorsById);
  }

  private async create({ attributes, spaceId }: CreateExecutionLogArgs) {
    if (attributes.status) {
      await this.ruleRegistryClient.logStatusChange({
        ruleId: attributes.alertId,
        newStatus: attributes.status,
        spaceId,
      });
    }

    if (attributes.bulkCreateTimeDurations) {
      await this.ruleRegistryClient.logExecutionMetric({
        ruleId: attributes.alertId,
        metric: ExecutionMetric.indexingDurationMax,
        value: Math.max(...attributes.bulkCreateTimeDurations.map(Number)),
        spaceId,
      });
    }

    if (attributes.gap) {
      await this.ruleRegistryClient.logExecutionMetric({
        ruleId: attributes.alertId,
        metric: ExecutionMetric.executionGap,
        value: Number(attributes.gap),
        spaceId,
      });
    }
  }

  public async update({ attributes, spaceId }: UpdateExecutionLogArgs) {
    // execution events are immutable, so we just use 'create' here instead of 'update'
    await this.create({ attributes, spaceId });
  }

  public async delete(id: string) {
    // execution events are immutable, nothing to do here
  }

  public async logExecutionMetric<T extends ExecutionMetric>(args: ExecutionMetricArgs<T>) {
    return this.ruleRegistryClient.logExecutionMetric(args);
  }

  public async logStatusChange(args: LogStatusChangeArgs) {
    function randomDate(start: Date, end: Date) {
      return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    await this.ruleRegistryClient.logExecutionMetric({
      ruleId: args.ruleId,
      metric: ExecutionMetric.searchDurationMax,
      value: Math.random() * 1000,
      spaceId: args.spaceId,
    });
    await this.ruleRegistryClient.logExecutionMetric({
      ruleId: args.ruleId,
      metric: ExecutionMetric.indexingDurationMax,
      value: Math.random() * 1000,
      spaceId: args.spaceId,
    });
    await this.ruleRegistryClient.logExecutionMetric({
      ruleId: args.ruleId,
      metric: ExecutionMetric.indexingLookback,
      value: randomDate(new Date(2012, 0, 1), new Date()),
      spaceId: args.spaceId,
    });
    await this.ruleRegistryClient.logExecutionMetric({
      ruleId: args.ruleId,
      metric: ExecutionMetric.executionGap,
      value: Math.random() * 1000,
      spaceId: args.spaceId,
    });
    return this.ruleRegistryClient.logStatusChange(args);
  }
}
