/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiHealth,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiTablePagination,
  EuiToolTip,
} from '@elastic/eui';

import { FormattedCount } from '../../../../common/components/formatted_number';
import { HeaderSection } from '../../../../common/components/header_section';
import { HoverVisibilityContainer } from '../../../../common/components/hover_visibility_container';
import { BUTTON_CLASS as INPECT_BUTTON_CLASS } from '../../../../common/components/inspect';
import { LastUpdatedAt } from '../../../../common/components/last_updated_at';
import { UserDetailsLink } from '../../../../common/components/links';
import { useQueryToggle } from '../../../../common/containers/query_toggle';
import { useNavigateToTimeline } from '../hooks/use_navigate_to_timeline';
import * as i18n from '../translations';
import { ITEMS_PER_PAGE, SEVERITY_COLOR } from '../utils';
import type { UserAlertsItem } from './use_user_alerts_items';
import { useUserAlertsItems } from './use_user_alerts_items';

interface UserAlertsTableProps {
  signalIndexName: string | null;
}

type GetTableColumns = (
  handleClick: (params: { userName: string; severity?: string }) => void
) => Array<EuiBasicTableColumn<UserAlertsItem>>;

const DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID = 'vulnerableUsersBySeverityQuery';

export const UserAlertsTable = React.memo(({ signalIndexName }: UserAlertsTableProps) => {
  const { openUserInTimeline } = useNavigateToTimeline();
  const { toggleStatus, setToggleStatus } = useQueryToggle(
    DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID
  );
  const { items, isLoading, updatedAt, pagination } = useUserAlertsItems({
    skip: !toggleStatus,
    queryId: DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID,
    signalIndexName,
  });

  const columns = useMemo(() => getTableColumns(openUserInTimeline), [openUserInTimeline]);

  return (
    <HoverVisibilityContainer show={true} targetClassNames={[INPECT_BUTTON_CLASS]}>
      <EuiPanel hasBorder data-test-subj="severityUserAlertsPanel">
        <HeaderSection
          id={DETECTION_RESPONSE_USER_SEVERITY_QUERY_ID}
          title={i18n.USER_ALERTS_SECTION_TITLE}
          titleSize="s"
          toggleStatus={toggleStatus}
          toggleQuery={setToggleStatus}
          subtitle={<LastUpdatedAt updatedAt={updatedAt} isUpdating={isLoading} />}
          tooltip={i18n.USER_TOOLTIP}
        />
        {toggleStatus && (
          <>
            <EuiBasicTable
              data-test-subj="severityUserAlertsTable"
              columns={columns}
              items={items}
              loading={isLoading}
              noItemsMessage={
                <EuiEmptyPrompt title={<h3>{i18n.NO_ALERTS_FOUND}</h3>} titleSize="xs" />
              }
            />
            <EuiSpacer size="m" />
            {pagination.pageCount > 1 && (
              <EuiTablePagination
                data-test-subj="userTablePaginator"
                activePage={pagination.currentPage}
                itemsPerPage={ITEMS_PER_PAGE}
                pageCount={pagination.pageCount}
                onChangePage={pagination.setPage}
                showPerPageOptions={false}
              />
            )}
          </>
        )}
      </EuiPanel>
    </HoverVisibilityContainer>
  );
});

UserAlertsTable.displayName = 'UserAlertsTable';

const getTableColumns: GetTableColumns = (handleClick) => [
  {
    field: 'userName',
    name: i18n.USER_ALERTS_USERNAME_COLUMN,
    'data-test-subj': 'userSeverityAlertsTable-userName',
    render: (userName: string) => (
      <EuiToolTip
        title={i18n.OPEN_USER_DETAIL_TOOLTIP}
        content={userName}
        anchorClassName="eui-textTruncate"
      >
        <UserDetailsLink userName={userName} />
      </EuiToolTip>
    ),
  },
  {
    field: 'totalAlerts',
    name: i18n.ALERTS_TEXT,
    'data-test-subj': 'userSeverityAlertsTable-totalAlerts',
    render: (totalAlerts: number, { userName }) => (
      <EuiLink disabled={totalAlerts === 0} onClick={() => handleClick({ userName })}>
        <FormattedCount count={totalAlerts} />
      </EuiLink>
    ),
  },
  {
    field: 'critical',
    name: i18n.STATUS_CRITICAL_LABEL,
    render: (count: number, { userName }) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-critical" color={SEVERITY_COLOR.critical}>
        <EuiLink
          disabled={count === 0}
          onClick={() => handleClick({ userName, severity: 'critical' })}
        >
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
  {
    field: 'high',
    name: i18n.STATUS_HIGH_LABEL,
    render: (count: number, { userName }) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-high" color={SEVERITY_COLOR.high}>
        <EuiLink disabled={count === 0} onClick={() => handleClick({ userName, severity: 'high' })}>
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
  {
    field: 'medium',
    name: i18n.STATUS_MEDIUM_LABEL,
    render: (count: number, { userName }) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-medium" color={SEVERITY_COLOR.medium}>
        <EuiLink
          disabled={count === 0}
          onClick={() => handleClick({ userName, severity: 'medium' })}
        >
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
  {
    field: 'low',
    name: i18n.STATUS_LOW_LABEL,
    render: (count: number, { userName }) => (
      <EuiHealth data-test-subj="userSeverityAlertsTable-low" color={SEVERITY_COLOR.low}>
        <EuiLink disabled={count === 0} onClick={() => handleClick({ userName, severity: 'low' })}>
          <FormattedCount count={count} />
        </EuiLink>
      </EuiHealth>
    ),
  },
];
