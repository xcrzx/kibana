/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { Column, ColumnWithMeta, SchemaConfig } from '@kbn/visualizations-plugin/common';
import {
  convertToLensModule,
  getVisSchemas,
  getDataViewByIndexPatternId,
} from '@kbn/visualizations-plugin/public';
import uuid from 'uuid';
import { getDataViewsStart } from '../services';
import { getConfiguration } from './configurations';
import { ConvertTableToLensVisualization } from './types';

export const isColumnWithMeta = (column: Column): column is ColumnWithMeta => {
  if ((column as ColumnWithMeta).meta) {
    return true;
  }
  return false;
};

export const excludeMetaFromColumn = (column: Column) => {
  if (isColumnWithMeta(column)) {
    const { meta, ...rest } = column;
    return rest;
  }
  return column;
};

export const convertToLens: ConvertTableToLensVisualization = async (vis, timefilter) => {
  if (!timefilter) {
    return null;
  }

  const dataViews = getDataViewsStart();
  const dataView = await getDataViewByIndexPatternId(vis.data.indexPattern?.id, dataViews);

  if (!dataView) {
    return null;
  }

  const { getColumnsFromVis, getPercentageColumnFormulaColumn } = await convertToLensModule;
  const result = getColumnsFromVis(
    vis,
    timefilter,
    dataView,
    {
      buckets: ['bucket'],
      splits: ['split_row', 'split_column'],
    },
    { dropEmptyRowsInDateHistogram: true }
  );

  if (result === null) {
    return null;
  }

  if (vis.params.percentageCol) {
    const visSchemas = getVisSchemas(vis, {
      timefilter,
      timeRange: timefilter.getAbsoluteTime(),
    });
    const metricAgg = visSchemas.metric.find((m) => m.label === vis.params.percentageCol);
    if (!metricAgg) {
      return null;
    }
    const percentageColumn = getPercentageColumnFormulaColumn({
      agg: metricAgg as SchemaConfig<METRIC_TYPES>,
      dataView,
      aggs: visSchemas.metric as Array<SchemaConfig<METRIC_TYPES>>,
    });
    if (!percentageColumn) {
      return null;
    }
    result.columns.splice(
      result.columnsWithoutReferenced.findIndex((c) => c.meta.aggId === metricAgg.aggId) + 1,
      0,
      percentageColumn
    );
    result.columnsWithoutReferenced.push(percentageColumn);
  }

  const layerId = uuid();
  const indexPatternId = dataView.id!;
  return {
    type: 'lnsDatatable',
    layers: [
      {
        indexPatternId,
        layerId,
        columns: result.columns.map(excludeMetaFromColumn),
        columnOrder: [],
      },
    ],
    configuration: getConfiguration(layerId, vis.params, result),
    indexPatternIds: [indexPatternId],
  };
};
