/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useIsWithinMaxBreakpoint,
  useIsWithinMinBreakpoint,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import type { ShapeTreeNode } from '@elastic/charts';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import styled from 'styled-components';
import type { FillColor } from '../../../../common/components/charts/donutchart';
import { DonutChart } from '../../../../common/components/charts/donutchart';
import { SecurityPageName } from '../../../../../common/constants';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import type { LegendItem } from '../../../../common/components/charts/legend_item';
import type { EntityFilter } from './use_alerts_by_status';
import { useAlertsByStatus } from './use_alerts_by_status';
import {
  ALERTS,
  ALERTS_TEXT,
  ALERTS_BY_STATUS_TEXT,
  STATUS_ACKNOWLEDGED,
  STATUS_CLOSED,
  STATUS_CRITICAL_LABEL,
  STATUS_HIGH_LABEL,
  STATUS_LOW_LABEL,
  STATUS_MEDIUM_LABEL,
  STATUS_OPEN,
} from '../translations';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { VIEW_ALERTS } from '../../../pages/translations';
import { SEVERITY_COLOR } from '../utils';
import { FormattedCount } from '../../../../common/components/formatted_number';
import { ChartLabel } from './chart_label';
import { Legend } from '../../../../common/components/charts/legend';
import { emptyDonutColor } from '../../../../common/components/charts/donutchart_empty';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { LinkButton, useGetSecuritySolutionLinkProps } from '../../../../common/components/links';
import { useNavigateToTimeline } from '../hooks/use_navigate_to_timeline';

const StyledFlexItem = styled(EuiFlexItem)`
  padding: 0 4px;
`;

const StyledLegendFlexItem = styled(EuiFlexItem)`
  padding-left: 32px;
  padding-top: 45px;
`;

interface AlertsByStatusProps {
  signalIndexName: string | null;
  entityFilter?: EntityFilter;
}

const legendField = 'kibana.alert.severity';
const chartConfigs: Array<{ key: Severity; label: string; color: string }> = [
  { key: 'critical', label: STATUS_CRITICAL_LABEL, color: SEVERITY_COLOR.critical },
  { key: 'high', label: STATUS_HIGH_LABEL, color: SEVERITY_COLOR.high },
  { key: 'medium', label: STATUS_MEDIUM_LABEL, color: SEVERITY_COLOR.medium },
  { key: 'low', label: STATUS_LOW_LABEL, color: SEVERITY_COLOR.low },
];
const DETECTION_RESPONSE_ALERTS_BY_STATUS_ID = 'detection-response-alerts-by-status';

const eventKindSignalFilter: EntityFilter = {
  field: 'event.kind',
  value: 'signal',
};

export const AlertsByStatus = ({ signalIndexName, entityFilter }: AlertsByStatusProps) => {
  const { toggleStatus, setToggleStatus } = useQueryToggle(DETECTION_RESPONSE_ALERTS_BY_STATUS_ID);
  const { openEntityInTimeline } = useNavigateToTimeline();
  const { onClick: goToAlerts, href } = useGetSecuritySolutionLinkProps()({
    deepLinkId: SecurityPageName.alerts,
  });

  const isLargerBreakpoint = useIsWithinMinBreakpoint('xl');
  const isSmallBreakpoint = useIsWithinMaxBreakpoint('s');
  const donutHeight = isSmallBreakpoint || isLargerBreakpoint ? 120 : 90;

  const detailsButtonOptions = useMemo(
    () => ({
      name: VIEW_ALERTS,
      href: entityFilter ? undefined : href,
      onClick: entityFilter
        ? () => openEntityInTimeline([entityFilter, eventKindSignalFilter])
        : goToAlerts,
    }),
    [entityFilter, href, goToAlerts, openEntityInTimeline]
  );

  const {
    items: donutData,
    isLoading: loading,
    updatedAt,
  } = useAlertsByStatus({
    entityFilter,
    signalIndexName,
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_ALERTS_BY_STATUS_ID,
  });
  const legendItems: LegendItem[] = useMemo(
    () =>
      chartConfigs.map((d) => ({
        color: d.color,
        field: legendField,
        value: d.label,
      })),
    []
  );

  const openCount = donutData?.open?.total ?? 0;
  const acknowledgedCount = donutData?.acknowledged?.total ?? 0;
  const closedCount = donutData?.closed?.total ?? 0;

  const totalAlerts =
    loading || donutData == null ? 0 : openCount + acknowledgedCount + closedCount;

  const fillColor: FillColor = useCallback((d: ShapeTreeNode) => {
    return chartConfigs.find((cfg) => cfg.label === d.dataName)?.color ?? emptyDonutColor;
  }, []);

  return (
    <>
      <HoverVisibilityContainer show={true} targetClassNames={[INPECT_BUTTON_CLASS]}>
        <EuiPanel hasBorder data-test-subj={`${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-panel`}>
          {loading && (
            <EuiProgress
              data-test-subj="initialLoadingPanelMatrixOverTime"
              size="xs"
              position="absolute"
              color="accent"
            />
          )}
          <HeaderSection
            id={DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}
            title={entityFilter ? ALERTS_BY_STATUS_TEXT : ALERTS_TEXT}
            titleSize="s"
            subtitle={<LastUpdatedAt isUpdating={loading} updatedAt={updatedAt} />}
            inspectMultiple
            toggleStatus={toggleStatus}
            toggleQuery={setToggleStatus}
          >
            <EuiFlexGroup alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false}>
                <LinkButton
                  data-test-subj="view-details-button"
                  onClick={detailsButtonOptions.onClick}
                  href={detailsButtonOptions.href}
                >
                  {detailsButtonOptions.name}
                </LinkButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </HeaderSection>
          {toggleStatus && (
            <>
              <EuiFlexGroup justifyContent="center" gutterSize="none">
                <EuiFlexItem grow={false}>
                  {totalAlerts !== 0 && (
                    <EuiText className="eui-textCenter" size="s">
                      <>
                        <b>
                          <FormattedCount count={totalAlerts} />
                        </b>
                        <> </>
                        <small>{ALERTS(totalAlerts)}</small>
                      </>
                    </EuiText>
                  )}
                  <EuiSpacer size="l" />
                  <EuiFlexGroup justifyContent="center">
                    <StyledFlexItem key="alerts-status-open" grow={false}>
                      <DonutChart
                        data={donutData?.open?.severities}
                        fillColor={fillColor}
                        height={donutHeight}
                        label={STATUS_OPEN}
                        title={<ChartLabel count={openCount} />}
                        totalCount={openCount}
                      />
                    </StyledFlexItem>
                    <StyledFlexItem key="alerts-status-acknowledged" grow={false}>
                      <DonutChart
                        data={donutData?.acknowledged?.severities}
                        fillColor={fillColor}
                        height={donutHeight}
                        label={STATUS_ACKNOWLEDGED}
                        title={<ChartLabel count={acknowledgedCount} />}
                        totalCount={acknowledgedCount}
                      />
                    </StyledFlexItem>
                    <StyledFlexItem key="alerts-status-closed" grow={false}>
                      <DonutChart
                        data={donutData?.closed?.severities}
                        fillColor={fillColor}
                        height={donutHeight}
                        label={STATUS_CLOSED}
                        title={<ChartLabel count={closedCount} />}
                        totalCount={closedCount}
                      />
                    </StyledFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <StyledLegendFlexItem grow={false}>
                  {legendItems.length > 0 && <Legend legendItems={legendItems} />}
                </StyledLegendFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
            </>
          )}
        </EuiPanel>
      </HoverVisibilityContainer>
    </>
  );
};
