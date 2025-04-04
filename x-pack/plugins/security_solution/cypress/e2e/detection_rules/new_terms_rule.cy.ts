/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatMitreAttackDescription } from '../../helpers/rules';
import { getNewTermsRule, getIndexPatterns } from '../../objects/rule';

import { ALERT_DATA_GRID } from '../../screens/alerts';
import {
  CUSTOM_RULES_BTN,
  RISK_SCORE,
  RULE_NAME,
  RULES_ROW,
  RULES_TABLE,
  RULE_SWITCH,
  SEVERITY,
} from '../../screens/alerts_detection_rules';
import {
  ABOUT_DETAILS,
  ABOUT_INVESTIGATION_NOTES,
  ABOUT_RULE_DESCRIPTION,
  ADDITIONAL_LOOK_BACK_DETAILS,
  CUSTOM_QUERY_DETAILS,
  DEFINITION_DETAILS,
  FALSE_POSITIVES_DETAILS,
  removeExternalLinkText,
  INDEX_PATTERNS_DETAILS,
  INVESTIGATION_NOTES_MARKDOWN,
  INVESTIGATION_NOTES_TOGGLE,
  MITRE_ATTACK_DETAILS,
  REFERENCE_URLS_DETAILS,
  RISK_SCORE_DETAILS,
  RULE_NAME_HEADER,
  RULE_TYPE_DETAILS,
  RUNS_EVERY_DETAILS,
  SCHEDULE_DETAILS,
  SEVERITY_DETAILS,
  TAGS_DETAILS,
  TIMELINE_TEMPLATE_DETAILS,
  NEW_TERMS_HISTORY_WINDOW_DETAILS,
  NEW_TERMS_FIELDS_DETAILS,
} from '../../screens/rule_details';

import { getDetails } from '../../tasks/rule_details';
import { goToRuleDetails } from '../../tasks/alerts_detection_rules';
import { createTimeline } from '../../tasks/api_calls/timelines';
import { cleanKibana, deleteAlertsAndRules } from '../../tasks/common';
import {
  createAndEnableRule,
  fillAboutRuleAndContinue,
  fillDefineNewTermsRuleAndContinue,
  fillScheduleRuleAndContinue,
  selectNewTermsRuleType,
  waitForAlertsToPopulate,
  waitForTheRuleToBeExecuted,
} from '../../tasks/create_new_rule';
import { login, visit } from '../../tasks/login';

import { RULE_CREATION } from '../../urls/navigation';

describe('New Terms rules', () => {
  before(() => {
    cleanKibana();
    login();
  });
  describe('Detection rules, New Terms', () => {
    const expectedUrls = getNewTermsRule().referenceUrls.join('');
    const expectedFalsePositives = getNewTermsRule().falsePositivesExamples.join('');
    const expectedTags = getNewTermsRule().tags.join('');
    const expectedMitre = formatMitreAttackDescription(getNewTermsRule().mitre);
    const expectedNumberOfRules = 1;

    beforeEach(() => {
      deleteAlertsAndRules();
      createTimeline(getNewTermsRule().timeline).then((response) => {
        cy.wrap({
          ...getNewTermsRule(),
          timeline: {
            ...getNewTermsRule().timeline,
            id: response.body.data.persistTimeline.timeline.savedObjectId,
          },
        }).as('rule');
      });
    });

    it('Creates and enables a new terms rule', function () {
      visit(RULE_CREATION);
      selectNewTermsRuleType();
      fillDefineNewTermsRuleAndContinue(this.rule);
      fillAboutRuleAndContinue(this.rule);
      fillScheduleRuleAndContinue(this.rule);
      createAndEnableRule();

      cy.get(CUSTOM_RULES_BTN).should('have.text', 'Custom rules (1)');

      cy.get(RULES_TABLE).then(($table) => {
        cy.wrap($table.find(RULES_ROW).length).should('eql', expectedNumberOfRules);
      });

      cy.get(RULE_NAME).should('have.text', this.rule.name);
      cy.get(RISK_SCORE).should('have.text', this.rule.riskScore);
      cy.get(SEVERITY).should('have.text', this.rule.severity);
      cy.get(RULE_SWITCH).should('have.attr', 'aria-checked', 'true');

      goToRuleDetails();

      cy.get(RULE_NAME_HEADER).should('contain', `${this.rule.name}`);
      cy.get(ABOUT_RULE_DESCRIPTION).should('have.text', this.rule.description);
      cy.get(ABOUT_DETAILS).within(() => {
        getDetails(SEVERITY_DETAILS).should('have.text', this.rule.severity);
        getDetails(RISK_SCORE_DETAILS).should('have.text', this.rule.riskScore);
        getDetails(REFERENCE_URLS_DETAILS).should((details) => {
          expect(removeExternalLinkText(details.text())).equal(expectedUrls);
        });
        getDetails(FALSE_POSITIVES_DETAILS).should('have.text', expectedFalsePositives);
        getDetails(MITRE_ATTACK_DETAILS).should((mitre) => {
          expect(removeExternalLinkText(mitre.text())).equal(expectedMitre);
        });
        getDetails(TAGS_DETAILS).should('have.text', expectedTags);
      });
      cy.get(INVESTIGATION_NOTES_TOGGLE).click({ force: true });
      cy.get(ABOUT_INVESTIGATION_NOTES).should('have.text', INVESTIGATION_NOTES_MARKDOWN);
      cy.get(DEFINITION_DETAILS).within(() => {
        getDetails(INDEX_PATTERNS_DETAILS).should('have.text', getIndexPatterns().join(''));
        getDetails(CUSTOM_QUERY_DETAILS).should('have.text', this.rule.customQuery);
        getDetails(RULE_TYPE_DETAILS).should('have.text', 'New Terms');
        getDetails(TIMELINE_TEMPLATE_DETAILS).should('have.text', 'None');
        getDetails(NEW_TERMS_FIELDS_DETAILS).should('have.text', 'host.name');
        getDetails(NEW_TERMS_HISTORY_WINDOW_DETAILS).should('have.text', '51000h');
      });
      cy.get(SCHEDULE_DETAILS).within(() => {
        getDetails(RUNS_EVERY_DETAILS).should(
          'have.text',
          `${this.rule.runsEvery.interval}${this.rule.runsEvery.type}`
        );
        getDetails(ADDITIONAL_LOOK_BACK_DETAILS).should(
          'have.text',
          `${this.rule.lookBack.interval}${this.rule.lookBack.type}`
        );
      });

      waitForTheRuleToBeExecuted();
      waitForAlertsToPopulate();

      cy.get(ALERT_DATA_GRID)
        .invoke('text')
        .then((text) => {
          expect(text).contains(this.rule.name);
          expect(text).contains(this.rule.severity.toLowerCase());
          expect(text).contains(this.rule.riskScore);
        });
    });
  });
});
