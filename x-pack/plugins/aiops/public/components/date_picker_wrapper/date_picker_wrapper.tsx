/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO Consolidate with duplicate component `DatePickerWrapper` in
// `x-pack/plugins/data_visualizer/public/application/common/components/date_picker_wrapper/date_picker_wrapper.tsx`

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Subscription } from 'rxjs';
import { debounce } from 'lodash';

import { EuiSuperDatePicker, OnRefreshProps } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import { TimeHistoryContract, UI_SETTINGS } from '@kbn/data-plugin/public';

import { useUrlState } from '../../hooks/use_url_state';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { aiopsRefresh$ } from '../../application/services/timefilter_refresh_service';

interface TimePickerQuickRange {
  from: string;
  to: string;
  display: string;
}

interface Duration {
  start: string;
  end: string;
}

interface RefreshInterval {
  pause: boolean;
  value: number;
}

function getRecentlyUsedRangesFactory(timeHistory: TimeHistoryContract) {
  return function (): Duration[] {
    return (
      timeHistory.get()?.map(({ from, to }: TimeRange) => {
        return {
          start: from,
          end: to,
        };
      }) ?? []
    );
  };
}

function updateLastRefresh(timeRange: OnRefreshProps) {
  aiopsRefresh$.next({ lastRefresh: Date.now(), timeRange });
}

export const DatePickerWrapper: FC = () => {
  const { uiSettings, data } = useAiopsAppContext();
  const { timefilter, history } = data.query.timefilter;

  const [globalState, setGlobalState] = useUrlState('_g');
  const getRecentlyUsedRanges = getRecentlyUsedRangesFactory(history);

  const refreshInterval: RefreshInterval =
    globalState?.refreshInterval ?? timefilter.getRefreshInterval();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const setRefreshInterval = useCallback(
    debounce((refreshIntervalUpdate: RefreshInterval) => {
      setGlobalState('refreshInterval', refreshIntervalUpdate, true);
    }, 200),
    [setGlobalState]
  );

  const [time, setTime] = useState(timefilter.getTime());
  const [recentlyUsedRanges, setRecentlyUsedRanges] = useState(getRecentlyUsedRanges());
  const [isAutoRefreshSelectorEnabled, setIsAutoRefreshSelectorEnabled] = useState(
    timefilter.isAutoRefreshSelectorEnabled()
  );
  const [isTimeRangeSelectorEnabled, setIsTimeRangeSelectorEnabled] = useState(
    timefilter.isTimeRangeSelectorEnabled()
  );

  const dateFormat = uiSettings.get('dateFormat');
  const timePickerQuickRanges = uiSettings.get<TimePickerQuickRange[]>(
    UI_SETTINGS.TIMEPICKER_QUICK_RANGES
  );

  const commonlyUsedRanges = useMemo(
    () =>
      timePickerQuickRanges.map(({ from, to, display }) => ({
        start: from,
        end: to,
        label: display,
      })),
    [timePickerQuickRanges]
  );

  useEffect(() => {
    const subscriptions = new Subscription();
    const refreshIntervalUpdate$ = timefilter.getRefreshIntervalUpdate$();
    if (refreshIntervalUpdate$ !== undefined) {
      subscriptions.add(
        refreshIntervalUpdate$.subscribe((r) => {
          setRefreshInterval(timefilter.getRefreshInterval());
        })
      );
    }
    const timeUpdate$ = timefilter.getTimeUpdate$();
    if (timeUpdate$ !== undefined) {
      subscriptions.add(
        timeUpdate$.subscribe((v) => {
          setTime(timefilter.getTime());
        })
      );
    }
    const enabledUpdated$ = timefilter.getEnabledUpdated$();
    if (enabledUpdated$ !== undefined) {
      subscriptions.add(
        enabledUpdated$.subscribe((w) => {
          setIsAutoRefreshSelectorEnabled(timefilter.isAutoRefreshSelectorEnabled());
          setIsTimeRangeSelectorEnabled(timefilter.isTimeRangeSelectorEnabled());
        })
      );
    }

    return function cleanup() {
      subscriptions.unsubscribe();
    };
  }, [setRefreshInterval, timefilter]);

  function updateFilter({ start, end }: Duration) {
    const newTime = { from: start, to: end };
    // Update timefilter for controllers listening for changes
    timefilter.setTime(newTime);
    setTime(newTime);
    setRecentlyUsedRanges(getRecentlyUsedRanges());
  }

  function updateInterval({
    isPaused: pause,
    refreshInterval: value,
  }: {
    isPaused: boolean;
    refreshInterval: number;
  }) {
    setRefreshInterval({ pause, value });
  }

  /**
   * Enforce pause when it's set to false with 0 refresh interval.
   */
  const isPaused = refreshInterval.pause || (!refreshInterval.pause && !refreshInterval.value);

  return isAutoRefreshSelectorEnabled || isTimeRangeSelectorEnabled ? (
    <div className="mlNavigationMenu__datePickerWrapper">
      <EuiSuperDatePicker
        start={time.from}
        end={time.to}
        isPaused={isPaused}
        isAutoRefreshOnly={!isTimeRangeSelectorEnabled}
        refreshInterval={refreshInterval.value}
        onTimeChange={updateFilter}
        onRefresh={updateLastRefresh}
        onRefreshChange={updateInterval}
        recentlyUsedRanges={recentlyUsedRanges}
        dateFormat={dateFormat}
        commonlyUsedRanges={commonlyUsedRanges}
      />
    </div>
  ) : null;
};
