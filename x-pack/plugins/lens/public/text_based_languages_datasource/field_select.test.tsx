/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DatatableColumn } from '@kbn/expressions-plugin/public';

import { FieldPicker, FieldOptionValue } from '../shared_components/field_picker';

import { FieldSelect, FieldSelectProps } from './field_select';
import { shallowWithIntl as shallow } from '@kbn/test-jest-helpers';

const fields = [
  {
    name: 'timestamp',
    id: 'timestamp',
    meta: {
      type: 'date',
    },
  },
  {
    name: 'bytes',
    id: 'bytes',
    meta: {
      type: 'number',
    },
  },
  {
    name: 'memory',
    id: 'memory',
    meta: {
      type: 'number',
    },
  },
] as DatatableColumn[];

describe('Layer Data Panel', () => {
  let defaultProps: FieldSelectProps;

  beforeEach(() => {
    defaultProps = {
      selectedField: {
        fieldName: 'bytes',
        columnId: 'bytes',
        meta: {
          type: 'number',
        },
      },
      existingFields: fields,
      onChoose: jest.fn(),
    };
  });

  it('should display the selected field if given', () => {
    const instance = shallow(<FieldSelect {...defaultProps} />);
    expect(instance.find(FieldPicker).prop('selectedOptions')).toStrictEqual([
      {
        label: 'bytes',
        value: {
          type: 'field',
          field: 'bytes',
          dataType: 'number',
        },
      },
    ]);
  });

  it('should pass the fields with the correct format', () => {
    const instance = shallow(<FieldSelect {...defaultProps} />);
    expect(instance.find(FieldPicker).prop('options')).toStrictEqual([
      {
        label: 'Available fields',
        options: [
          {
            compatible: true,
            exists: true,
            label: 'timestamp',
            value: {
              type: 'field' as FieldOptionValue['type'],
              field: 'timestamp',
              dataType: 'date',
            },
          },
          {
            compatible: true,
            exists: true,
            label: 'bytes',
            value: {
              type: 'field' as FieldOptionValue['type'],
              field: 'bytes',
              dataType: 'number',
            },
          },
          {
            compatible: true,
            exists: true,
            label: 'memory',
            value: {
              type: 'field' as FieldOptionValue['type'],
              field: 'memory',
              dataType: 'number',
            },
          },
        ],
      },
    ]);
  });
});
