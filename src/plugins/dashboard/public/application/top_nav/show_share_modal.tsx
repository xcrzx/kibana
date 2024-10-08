/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import React, { ReactElement, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiCheckboxGroup } from '@elastic/eui';
import type { Capabilities } from '@kbn/core/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { setStateToKbnUrl, unhashUrl } from '@kbn/kibana-utils-plugin/public';
import type { SerializableControlGroupInput } from '@kbn/controls-plugin/common';

import type { DashboardState } from '../../types';
import { dashboardUrlParams } from '../dashboard_router';
import { shareModalStrings } from '../../dashboard_strings';
import { convertPanelMapToSavedPanels } from '../../../common';
import { pluginServices } from '../../services/plugin_services';
import { stateToRawDashboardState } from '../lib/convert_dashboard_state';
import { DashboardAppLocatorParams, DASHBOARD_APP_LOCATOR } from '../../locator';

const showFilterBarId = 'showFilterBar';

export interface ShowShareModalProps {
  isDirty: boolean;
  anchorElement: HTMLElement;
  currentDashboardState: DashboardState;
}

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.dashboard) return false;

  const dashboard = anonymousUserCapabilities.dashboard;

  return !!dashboard.show;
};

export function ShowShareModal({
  isDirty,
  anchorElement,
  currentDashboardState,
}: ShowShareModalProps) {
  const {
    dashboardCapabilities: { createShortUrl: allowShortUrl },
    dashboardSessionStorage,
    data: {
      query: {
        timefilter: {
          timefilter: { getTime },
        },
      },
    },
    share: { toggleShareContextMenu },
    initializerContext: { kibanaVersion },
  } = pluginServices.getServices();

  if (!toggleShareContextMenu) return; // TODO: Make this logic cleaner once share is an optional service

  const EmbedUrlParamExtension = ({
    setParamValue,
  }: {
    setParamValue: (paramUpdate: { [key: string]: boolean }) => void;
  }): ReactElement => {
    const [urlParamsSelectedMap, seturlParamsSelectedMap] = useState<{ [key: string]: boolean }>({
      showFilterBar: true,
    });

    const checkboxes = [
      {
        id: dashboardUrlParams.showTopMenu,
        label: shareModalStrings.getTopMenuCheckbox(),
      },
      {
        id: dashboardUrlParams.showQueryInput,
        label: shareModalStrings.getQueryCheckbox(),
      },
      {
        id: dashboardUrlParams.showTimeFilter,
        label: shareModalStrings.getTimeFilterCheckbox(),
      },
      {
        id: showFilterBarId,
        label: shareModalStrings.getFilterBarCheckbox(),
      },
    ];

    const handleChange = (param: string): void => {
      const newSelectedMap = {
        ...urlParamsSelectedMap,
        [param]: !urlParamsSelectedMap[param],
      };

      const urlParamValues = {
        [dashboardUrlParams.showTopMenu]: newSelectedMap[dashboardUrlParams.showTopMenu],
        [dashboardUrlParams.showQueryInput]: newSelectedMap[dashboardUrlParams.showQueryInput],
        [dashboardUrlParams.showTimeFilter]: newSelectedMap[dashboardUrlParams.showTimeFilter],
        [dashboardUrlParams.hideFilterBar]: !newSelectedMap[showFilterBarId],
      };
      seturlParamsSelectedMap(newSelectedMap);
      setParamValue(urlParamValues);
    };

    return (
      <EuiCheckboxGroup
        options={checkboxes}
        idToSelectedMap={urlParamsSelectedMap}
        onChange={handleChange}
        legend={{
          children: shareModalStrings.getCheckboxLegend(),
        }}
        data-test-subj="embedUrlParamExtension"
      />
    );
  };

  let unsavedStateForLocator: Pick<
    DashboardAppLocatorParams,
    'options' | 'query' | 'savedQuery' | 'filters' | 'panels' | 'controlGroupInput'
  > = {};
  const { savedObjectId, title } = currentDashboardState;
  const unsavedDashboardState = dashboardSessionStorage.getState(savedObjectId);

  if (unsavedDashboardState) {
    unsavedStateForLocator = {
      query: unsavedDashboardState.query,
      filters: unsavedDashboardState.filters,
      options: unsavedDashboardState.options,
      savedQuery: unsavedDashboardState.savedQuery,
      controlGroupInput: unsavedDashboardState.controlGroupInput as SerializableControlGroupInput,
      panels: unsavedDashboardState.panels
        ? (convertPanelMapToSavedPanels(
            unsavedDashboardState.panels,
            kibanaVersion
          ) as DashboardAppLocatorParams['panels'])
        : undefined,
    };
  }

  const locatorParams: DashboardAppLocatorParams = {
    dashboardId: savedObjectId,
    preserveSavedFilters: true,
    refreshInterval: undefined, // We don't share refresh interval externally
    viewMode: ViewMode.VIEW, // For share locators we always load the dashboard in view mode
    useHash: false,
    timeRange: getTime(),
    ...unsavedStateForLocator,
  };

  toggleShareContextMenu({
    isDirty,
    anchorElement,
    allowEmbed: true,
    allowShortUrl,
    shareableUrl: setStateToKbnUrl(
      '_a',
      stateToRawDashboardState({
        state: currentDashboardState,
      }),
      { useHash: false, storeInHashQuery: true },
      unhashUrl(window.location.href)
    ),
    objectId: savedObjectId,
    objectType: 'dashboard',
    sharingData: {
      title:
        title ||
        i18n.translate('dashboard.share.defaultDashboardTitle', {
          defaultMessage: 'Dashboard [{date}]',
          values: { date: moment().toISOString(true) },
        }),
      locatorParams: {
        id: DASHBOARD_APP_LOCATOR,
        params: locatorParams,
      },
    },
    embedUrlParamExtensions: [
      {
        paramName: 'embed',
        component: EmbedUrlParamExtension,
      },
    ],
    showPublicUrlSwitch,
  });
}
