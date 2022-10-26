/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect } from 'react';
import { useTourContext } from './tour';
import type { RulesQueryResponse } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { useFindRulesQuery } from '../../../detection_engine/rule_management/api/hooks/use_find_rules_query';
import { SecurityStepId } from './tour_config';
const GUIDED_ONBOARDING_RULES_FILTER = {
  filter: '',
  showCustomRules: false,
  showElasticRules: true,
  tags: ['Guided Onboarding'],
};
export const useRulesTour = () => {
  const { isTourShown, endTourStep, incrementStep, activeStep } = useTourContext();
  const { data: onboardingRules } = useFindRulesQuery(
    { filterOptions: GUIDED_ONBOARDING_RULES_FILTER },
    { retry: false, enabled: isTourShown(SecurityStepId.rules) }
  );

  const endRulesTour = useCallback(() => {
    if (isTourShown(SecurityStepId.rules) && activeStep === 2) {
      endTourStep(SecurityStepId.rules);
    }
  }, [activeStep, endTourStep, isTourShown]);

  const incrementGuide = useCallback(
    (rules: RulesQueryResponse) => {
      if (isTourShown(SecurityStepId.rules) && activeStep === 1 && rules.total > 0) {
        incrementStep(SecurityStepId.rules);
      }
    },
    [activeStep, incrementStep, isTourShown]
  );

  useEffect(() => {
    if (onboardingRules) {
      if (onboardingRules.rules && !onboardingRules.rules.some((rule) => rule.enabled)) {
        return incrementGuide(onboardingRules);
      }
      return endRulesTour();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingRules]);

  const incrementRulesStep = useCallback(() => {
    if (isTourShown(SecurityStepId.rules) && activeStep === 1) {
      incrementStep(SecurityStepId.rules);
    }
  }, [activeStep, incrementStep, isTourShown]);

  return { incrementRulesStep };
};
