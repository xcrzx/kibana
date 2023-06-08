/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useState } from 'react';
import type { RuleInstallationInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';
import { invariant } from '../../../../../../common/utils/invariant';
import {
  usePerformInstallAllRules,
  usePerformInstallSpecificRules,
} from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_install';
import { usePrebuiltRulesInstallReview } from '../../../../rule_management/logic/prebuilt_rules/use_prebuilt_rules_install_review';

export interface AddPrebuiltRulesTableState {
  /**
   * Rules available to be installed
   */
  rules: RuleInstallationInfoForReview[];
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
   * Is true whenever mutation to install all available rules is in-flight
   */
  isInstallAllRulesLoading: boolean;
  /**
   * Is true whenever mutation to install specific rules is in-flight
   */
  isInstallSpecificRulesLoading: boolean;
  /**
   * The timestamp for when the rules were successfully fetched
   */
  lastUpdated: number;
  /**
   * Rule rows selected in EUI InMemory Table
   */
  selectedRules: RuleInstallationInfoForReview[];
}

export interface AddPrebuiltRulesTableActions {
  reFetchRules: ReturnType<typeof usePrebuiltRulesInstallReview>['refetch'];
  installAllRules: ReturnType<typeof usePerformInstallAllRules>['mutateAsync'];
  installSpecificRules: ReturnType<typeof usePerformInstallSpecificRules>['mutateAsync'];
  selectRules: (rules: RuleInstallationInfoForReview[]) => void;
}

export interface AddPrebuiltRulesContextType {
  state: AddPrebuiltRulesTableState;
  actions: AddPrebuiltRulesTableActions;
}

const AddPrebuiltRulesTableContext = createContext<AddPrebuiltRulesContextType | null>(null);

interface AddPrebuiltRulesTableContextProviderProps {
  children: React.ReactNode;
}

export const AddPrebuiltRulesTableContextProvider = ({
  children,
}: AddPrebuiltRulesTableContextProviderProps) => {
  const [selectedRules, setSelectedRules] = useState<RuleInstallationInfoForReview[]>([]);

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
  } = usePrebuiltRulesInstallReview({
    refetchInterval: 60000, // Refetch available rules for installation every minute
    keepPreviousData: true, // Use this option so that the state doesn't jump between "success" and "loading" on page change
  });

  const { mutateAsync: installAllRules, isLoading: isInstallAllRulesLoading } =
    usePerformInstallAllRules();
  const { mutateAsync: installSpecificRules, isLoading: isInstallSpecificRulesLoading } =
    usePerformInstallSpecificRules();

  const actions = useMemo(
    () => ({
      reFetchRules: refetch,
      installAllRules,
      installSpecificRules,
      selectRules: setSelectedRules,
    }),
    [installAllRules, installSpecificRules, refetch]
  );

  const providerValue = useMemo<AddPrebuiltRulesContextType>(() => {
    return {
      state: {
        rules,
        tags,
        isFetched,
        isLoading,
        isInstallAllRulesLoading,
        isInstallSpecificRulesLoading,
        isRefetching,
        selectedRules,
        lastUpdated: dataUpdatedAt,
      },
      actions,
    };
  }, [
    rules,
    tags,
    isFetched,
    isLoading,
    isInstallAllRulesLoading,
    isInstallSpecificRulesLoading,
    isRefetching,
    selectedRules,
    dataUpdatedAt,
    actions,
  ]);

  return (
    <AddPrebuiltRulesTableContext.Provider value={providerValue}>
      {children}
    </AddPrebuiltRulesTableContext.Provider>
  );
};

export const useAddPrebuiltRulesTableContext = (): AddPrebuiltRulesContextType => {
  const rulesTableContext = useContext(AddPrebuiltRulesTableContext);
  invariant(
    rulesTableContext,
    'useAddPrebuiltRulesTableContext should be used inside AddPrebuiltRulesTableContextProvider'
  );

  return rulesTableContext;
};
