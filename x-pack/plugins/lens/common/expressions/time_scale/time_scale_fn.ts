/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment, { Moment } from 'moment-timezone';
import { i18n } from '@kbn/i18n';
import { buildResultColumns, DatatableRow, ExecutionContext } from '@kbn/expressions-plugin/common';
import {
  calculateBounds,
  DatatableUtilitiesService,
  parseInterval,
  TimeRangeBounds,
  TimeRange,
} from '@kbn/data-plugin/common';
import type { TimeScaleExpressionFunction, TimeScaleUnit, TimeScaleArgs } from './types';

const unitInMs: Record<TimeScaleUnit, number> = {
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
};

export const timeScaleFn =
  (
    getDatatableUtilities: (
      context: ExecutionContext
    ) => DatatableUtilitiesService | Promise<DatatableUtilitiesService>,
    getTimezone: (context: ExecutionContext) => string | Promise<string>
  ): TimeScaleExpressionFunction['fn'] =>
  async (
    input,
    {
      dateColumnId,
      inputColumnId,
      outputColumnId,
      outputColumnName,
      targetUnit,
      reducedTimeRange,
    }: TimeScaleArgs,
    context
  ) => {
    let timeBounds: TimeRangeBounds | undefined;
    const contextTimeZone = await getTimezone(context);

    let getStartEndOfBucketMeta: (row: DatatableRow) => {
      startOfBucket: Moment;
      endOfBucket: Moment;
    };

    if (dateColumnId) {
      const dateColumnDefinition = input.columns.find((column) => column.id === dateColumnId);

      if (!dateColumnDefinition) {
        throw new Error(
          i18n.translate('xpack.lens.functions.timeScale.dateColumnMissingMessage', {
            defaultMessage: 'Specified dateColumnId {columnId} does not exist.',
            values: {
              columnId: dateColumnId,
            },
          })
        );
      }
      const datatableUtilities = await getDatatableUtilities(context);
      const timeInfo = datatableUtilities.getDateHistogramMeta(dateColumnDefinition, {
        timeZone: contextTimeZone,
      });
      const intervalDuration = timeInfo?.interval && parseInterval(timeInfo.interval);
      timeBounds = timeInfo?.timeRange && calculateBounds(timeInfo.timeRange);

      getStartEndOfBucketMeta = (row) => {
        const startOfBucket = moment.tz(row[dateColumnId], timeInfo?.timeZone ?? contextTimeZone);

        return {
          startOfBucket,
          endOfBucket: startOfBucket.clone().add(intervalDuration),
        };
      };

      if (!timeInfo || !intervalDuration) {
        throw new Error(
          i18n.translate('xpack.lens.functions.timeScale.timeInfoMissingMessage', {
            defaultMessage: 'Could not fetch date histogram information',
          })
        );
      }
    } else {
      const timeRange = context.getSearchContext().timeRange as TimeRange;
      const endOfBucket = moment.tz(timeRange.to, contextTimeZone);
      let startOfBucket = moment.tz(timeRange.from, contextTimeZone);

      if (reducedTimeRange) {
        const reducedStartOfBucket = endOfBucket.clone().subtract(parseInterval(reducedTimeRange));

        if (reducedStartOfBucket > startOfBucket) {
          startOfBucket = reducedStartOfBucket;
        }
      }

      timeBounds = calculateBounds(timeRange);

      getStartEndOfBucketMeta = () => ({
        startOfBucket,
        endOfBucket,
      });
    }

    const resultColumns = buildResultColumns(
      input,
      outputColumnId,
      inputColumnId,
      outputColumnName,
      {
        allowColumnOverwrite: true,
      }
    );

    if (!resultColumns) {
      return input;
    }

    return {
      ...input,
      columns: resultColumns,
      rows: input.rows.map((row) => {
        const newRow = { ...row };

        let { startOfBucket, endOfBucket } = getStartEndOfBucketMeta(row);

        if (timeBounds && timeBounds.min) {
          startOfBucket = moment.max(startOfBucket, timeBounds.min);
        }
        if (timeBounds && timeBounds.max) {
          endOfBucket = moment.min(endOfBucket, timeBounds.max);
        }

        const bucketSize = endOfBucket.diff(startOfBucket);
        const factor = bucketSize / unitInMs[targetUnit];
        const currentValue = newRow[inputColumnId];

        if (currentValue != null) {
          newRow[outputColumnId] = Number(currentValue) / factor;
        }

        return newRow;
      }),
    };
  };
