/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleResponse, RuleSource } from '../../../../../../common/api/detection_engine';
import type { PrebuiltRulesCustomizationStatus } from '../../../../../../common/detection_engine/prebuilt_rules/prebuilt_rule_customization_status';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';
import { calculateIsCustomized } from '../detection_rules_client/mergers/rule_source/calculate_is_customized';

/**
 * Calculates rule_source for a rule based on two pieces of information:
 * 1. The prebuilt rule asset that matches the specified rule_id and version
 * 2. Whether a prebuilt rule with the specified rule_id is currently installed
 *
 * @param nextRule The rule for which rule_source is being calculated
 * @param baseRule The prebuilt rule asset that matches the specified rule_id and version
 * @param isKnownPrebuiltRule Whether a prebuilt rule with the specified rule_id is currently installed
 *
 * @returns The calculated rule_source
 */
export const calculateRuleSourceFromAsset = ({
  nextRule,
  baseRule,
  currentRule,
  isKnownPrebuiltRule,
  ruleCustomizationStatus,
}: {
  nextRule: RuleResponse;
  baseRule: PrebuiltRuleAsset | undefined;
  currentRule: RuleResponse | undefined;
  isKnownPrebuiltRule: boolean;
  ruleCustomizationStatus: PrebuiltRulesCustomizationStatus;
}): RuleSource => {
  if (!isKnownPrebuiltRule) {
    return {
      type: 'internal',
    };
  }

  const isCustomized = calculateIsCustomized({
    baseRule,
    nextRule,
    currentRule,
    ruleCustomizationStatus,
  });

  return {
    type: 'external',
    is_customized: isCustomized,
  };
};
