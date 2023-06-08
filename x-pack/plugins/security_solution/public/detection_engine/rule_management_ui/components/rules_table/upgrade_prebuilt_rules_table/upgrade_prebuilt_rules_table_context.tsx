/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { isEqual } from 'lodash';
import React, { createContext, useContext, useMemo, useState } from 'react';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_upgrade/response_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import {
  usePerformUpgradeAllRules,
  usePerformUpgradeSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import { usePrebuiltRulesUpgradeReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_upgrade_review';

export interface UpgradePrebuiltRulesTableState {
  /**
   * Rules available to be updated
   */
  rules: RuleUpgradeInfoForReview[];
  /**
   * All unique tags for all rules
   */
  tags: string[];
  /**
   * Is true then there is no cached data and the query is currently fetching.
   */
  isLoading: boolean;
  /**
   * Will be true if the query has been fetched.
   */
  isFetched: boolean;
  /**
   * Is true whenever a background refetch is in-flight, which does not include initial loading
   */
  isRefetching: boolean;
  /**
   * Is true whenever mutation to upgrade all available rules is in-flight
   */
  isUpgradeAllRulesLoading: boolean;
  /**
   * Is true whenever mutation to upgrade specific rules is in-flight
   */
  isUpgradeSpecificRulesLoading: boolean;
  /**
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Rule rows selected in EUI InMemory Table
   */
  selectedRules: RuleUpgradeInfoForReview[];
}

export interface UpgradePrebuiltRulesTableActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesUpgradeReview>['refetch'];
  upgradeAllRules: ReturnType<typeof usePerformUpgradeAllRules>['mutateAsync'];
  upgradeSpecificRules: ReturnType<typeof usePerformUpgradeSpecificRules>['mutateAsync'];
  selectRules: (rules: RuleUpgradeInfoForReview[]) => void;
}

export interface UpgradePrebuiltRulesContextType {
  state: UpgradePrebuiltRulesTableState;
  actions: UpgradePrebuiltRulesTableActions;
}

const UpgradePrebuiltRulesTableContext = createContext<UpgradePrebuiltRulesContextType | null>(
  null
);

interface UpgradePrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

export const UpgradePrebuiltRulesTableContextProvider = ({
  children,
}: UpgradePrebuiltRulesTableContextProviderProps) => {
  const [selectedRules, setSelectedRules] = useState<RuleUpgradeInfoForReview[]>([]);

  const {
    data: { rules, stats: { tags } } = {
      rules: [],
      stats: { tags: [] },
    },
    refetch,
    dataUpdatedAt,
    isFetched,
    isLoading,
    isRefetching,
  } = usePrebuiltRulesUpgradeReview({
    refetchInterval: false, // Disable automatic refetching since request is expensive
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

  const { mutateAsync: upgradeAllRules, isLoading: isUpgradeAllRulesLoading } =
    usePerformUpgradeAllRules();
  const { mutateAsync: upgradeSpecificRules, isLoading: isUpgradeSpecificRulesLoading } =
    usePerformUpgradeSpecificRules();

  const actions = useMemo<UpgradePrebuiltRulesTableActions>(
    () => ({
      reFetchRules: refetch,
      upgradeAllRules,
      upgradeSpecificRules,
      selectRules: setSelectedRules,
    }),
    [refetch, upgradeAllRules, upgradeSpecificRules]
  );

  const providerValue = useMemo<UpgradePrebuiltRulesContextType>(() => {
    return {
      state: {
        rules,
        tags,
        isFetched,
        isLoading,
        isRefetching,
        selectedRules,
        isUpgradeAllRulesLoading,
        isUpgradeSpecificRulesLoading,
        lastUpdated: dataUpdatedAt,
      },
      actions,
    };
  }, [
    rules,
    tags,
    isFetched,
    isLoading,
    isRefetching,
    isUpgradeAllRulesLoading,
    isUpgradeSpecificRulesLoading,
    selectedRules,
    dataUpdatedAt,
    actions,
  ]);

  return (
    <UpgradePrebuiltRulesTableContext.Provider value={providerValue}>
      {children}
    </UpgradePrebuiltRulesTableContext.Provider>
  );
};

export const useUpgradePrebuiltRulesTableContext = (): UpgradePrebuiltRulesContextType => {
  const rulesTableContext = useContext(UpgradePrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useUpgradePrebuiltRulesTableContext should be used inside UpgradePrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};
