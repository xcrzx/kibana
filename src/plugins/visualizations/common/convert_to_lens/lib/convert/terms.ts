/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BUCKET_TYPES } from '@kbn/data-plugin/common';
import uuid from 'uuid';
import { DataType, TermsParams } from '../../types';
import { getFieldNameFromField, isColumnWithMeta } from '../utils';
import { convertToSchemaConfig } from '../../../vis_schemas';
import { convertMetricToColumns } from '../metrics';
import { CommonBucketConverterArgs, TermsColumn } from './types';

interface OrderByWithAgg {
  orderAgg?: TermsParams['orderAgg'];
  orderBy: TermsParams['orderBy'];
}

const getOrderByWithAgg = ({
  agg,
  dataView,
  aggs,
  metricColumns,
}: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>): OrderByWithAgg | null => {
  if (!agg.aggParams) {
    return null;
  }

  if (agg.aggParams.orderBy === '_key') {
    return { orderBy: { type: 'alphabetical' } };
  }

  if (agg.aggParams.orderBy === 'custom') {
    if (!agg.aggParams.orderAgg) {
      return null;
    }
    const orderMetricColumn = convertMetricToColumns(
      convertToSchemaConfig(agg.aggParams.orderAgg),
      dataView,
      aggs
    );
    if (!orderMetricColumn) {
      return null;
    }
    return {
      orderBy: { type: 'custom' },
      orderAgg: orderMetricColumn[0],
    };
  }

  const orderAgg = metricColumns.find((column) => {
    if (isColumnWithMeta(column)) {
      return column.meta.aggId === agg.aggParams?.orderBy;
    }
    return false;
  });

  if (!orderAgg) {
    return null;
  }

  return {
    orderBy: { type: 'column', columnId: orderAgg.columnId },
    orderAgg,
  };
};

export const convertToTermsParams = ({
  agg,
  dataView,
  aggs,
  metricColumns,
}: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>): TermsParams | null => {
  if (!agg.aggParams) {
    return null;
  }

  const orderByWithAgg = getOrderByWithAgg({ agg, dataView, aggs, metricColumns });
  if (orderByWithAgg === null) {
    return null;
  }

  return {
    size: agg.aggParams.size ?? 10,
    include: agg.aggParams.include
      ? Array.isArray(agg.aggParams.include)
        ? agg.aggParams.include
        : [agg.aggParams.include]
      : [],
    includeIsRegex: agg.aggParams.includeIsRegex,
    exclude: agg.aggParams.exclude
      ? Array.isArray(agg.aggParams.exclude)
        ? agg.aggParams.exclude
        : [agg.aggParams.exclude]
      : [],
    excludeIsRegex: agg.aggParams.excludeIsRegex,
    otherBucket: agg.aggParams.otherBucket,
    orderDirection: agg.aggParams.order?.value ?? 'desc',
    parentFormat: { id: 'terms' },
    missingBucket: agg.aggParams.missingBucket,
    ...orderByWithAgg,
  };
};

export const convertToTermsColumn = (
  aggId: string,
  { agg, dataView, aggs, metricColumns }: CommonBucketConverterArgs<BUCKET_TYPES.TERMS>,
  label: string,
  isSplit: boolean
): TermsColumn | null => {
  if (!agg.aggParams?.field) {
    return null;
  }
  const sourceField = getFieldNameFromField(agg.aggParams?.field) ?? 'document';
  const field = dataView.getFieldByName(sourceField);

  if (!field) {
    return null;
  }

  const params = convertToTermsParams({ agg, dataView, aggs, metricColumns });
  if (!params) {
    return null;
  }

  return {
    columnId: uuid(),
    operationType: 'terms',
    label,
    dataType: (field.type as DataType) ?? undefined,
    sourceField: field.name,
    isBucketed: true,
    isSplit,
    params: { ...params },
    timeShift: agg.aggParams?.timeShift,
    meta: { aggId },
  };
};
