/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import { noop } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import type { RulesQueryResponse } from '../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useFindRulesQuery } from '../../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useTourContext } from '../../../../common/components/guided_onboarding_tour';
import { SecurityStepId } from '../../../../common/components/guided_onboarding_tour/tour_config';
import { BulkAction } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { SINGLE_RULE_ACTIONS } from '../../../../common/lib/apm/user_actions';
import { useStartTransaction } from '../../../../common/lib/apm/use_start_transaction';
import { useExecuteBulkAction } from '../../../../detection_engine/rule_management/logic/bulk_actions/use_execute_bulk_action';
import { useRulesTableContextOptional } from '../../../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context';

const StaticSwitch = styled(EuiSwitch)`
  .euiSwitch__thumb,
  .euiSwitch__icon {
    transition: none;
  }
`;

StaticSwitch.displayName = 'StaticSwitch';

export interface RuleSwitchProps {
  id: string;
  enabled: boolean;
  isDisabled?: boolean;
  isLoading?: boolean;
  onChange?: (enabled: boolean) => void;
}

/**
 * Basic switch component for displaying loader when enabled/disabled
 */
export const RuleSwitchComponent = ({
  id,
  isDisabled,
  isLoading,
  enabled,
  onChange,
}: RuleSwitchProps) => {
  const [myIsLoading, setMyIsLoading] = useState(false);
  const rulesTableContext = useRulesTableContextOptional();
  const { startTransaction } = useStartTransaction();
  const { executeBulkAction } = useExecuteBulkAction();
  const { isTourShown, endTourStep, activeStep } = useTourContext();
  const GUIDED_ONBOARDING_RULES_FILTER = {
    filter: '',
    showCustomRules: false,
    showElasticRules: true,
    tags: ['Guided Onboarding'],
  };
  const { data: onboardingRules } = useFindRulesQuery(
    { filterOptions: GUIDED_ONBOARDING_RULES_FILTER },
    { retry: false, enabled: isTourShown(SecurityStepId.rules) }
  );

  const endRulesTour = useCallback(
    (rules: RulesQueryResponse) => {
      if (isTourShown(SecurityStepId.rules) && activeStep === 2) {
        endTourStep(SecurityStepId.rules);
      }
    },
    [activeStep, endTourStep, isTourShown]
  );

  useEffect(() => {
    if (onboardingRules && onboardingRules.rules.some((rule) => rule.enabled)) {
      endRulesTour(onboardingRules);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingRules]);

  const onRuleStateChange = useCallback(
    async (event: EuiSwitchEvent) => {
      setMyIsLoading(true);
      startTransaction({
        name: enabled ? SINGLE_RULE_ACTIONS.DISABLE : SINGLE_RULE_ACTIONS.ENABLE,
      });

      const bulkActionResponse = await executeBulkAction({
        setLoadingRules: rulesTableContext?.actions.setLoadingRules,
        onSuccess: rulesTableContext ? undefined : noop,
        action: event.target.checked ? BulkAction.enable : BulkAction.disable,
        search: { ids: [id] },
        visibleRuleIds: [],
      });
      if (bulkActionResponse?.attributes.results.updated.length) {
        // The rule was successfully updated
        onChange?.(bulkActionResponse.attributes.results.updated[0].enabled);
      }
      setMyIsLoading(false);
    },
    [enabled, executeBulkAction, id, onChange, rulesTableContext, startTransaction]
  );

  const showLoader = useMemo((): boolean => {
    if (myIsLoading !== isLoading) {
      return isLoading || myIsLoading;
    }

    return myIsLoading;
  }, [myIsLoading, isLoading]);

  return (
    <EuiFlexGroup alignItems="center" justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        {showLoader ? (
          <EuiLoadingSpinner size="m" data-test-subj="ruleSwitchLoader" />
        ) : (
          <StaticSwitch
            data-test-subj="ruleSwitch"
            label={undefined}
            disabled={isDisabled}
            checked={enabled}
            onChange={onRuleStateChange}
          />
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const RuleSwitch = React.memo(RuleSwitchComponent);

RuleSwitch.displayName = 'RuleSwitch';
