import { expect, test, type Page } from '@playwright/test';

import { assertGeneratorScenarioYaml } from '@lib/app/argo/generator-yaml-verify';
import {
  assertPlacementTabAbsent,
  assertPlacementTabPresent,
  ensureFirstArgoGeneratorThenSelectAndFill,
  exitArgoPullWizardToApplicationsPage,
  openArgoPullWizardToGeneratorsStep,
  readArgoPullWizardYaml,
} from '@lib/app/argo/generator-wizard-actions';
import { GENERATOR_SCENARIOS_BY_TEST_ID } from '@lib/app/argo/generator-scenario-data';
import type { ApplicationListPage } from '@pages/app/ApplicationListPage';
import type { ArgoPullApplicationCreateWizardPage } from '@pages/app/ArgoPullApplicationCreateWizardPage';

export const GENERATOR_SCENARIO_TIMEOUT_MS = 1_800_000;

/** Run all generator matrix scenarios for one Polarion test id (RHACM4K-61948–61957). */
export async function runArgoGeneratorScenariosForTestId(
  testId: string,
  applicationListPage: ApplicationListPage,
  page: Page,
  pullWizard: ArgoPullApplicationCreateWizardPage
): Promise<void> {
  const scenarios = GENERATOR_SCENARIOS_BY_TEST_ID[testId];
  if (!scenarios?.length) {
    throw new Error(`No generator scenarios defined for test id ${testId}`);
  }

  for (const scenario of scenarios) {
    await test.step(scenario.name, async () => {
      await applicationListPage.goto();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openArgoPullWizardToGeneratorsStep(applicationListPage, page, pullWizard);
      await ensureFirstArgoGeneratorThenSelectAndFill(
        page,
        scenario.generatorNames,
        scenario.config
      );

      if (scenario.hasClusterDecision) {
        await assertPlacementTabPresent(page);
      } else {
        await assertPlacementTabAbsent(page);
      }

      const yamlString = await readArgoPullWizardYaml(pullWizard, {
        expectMatrix: scenario.generatorNames.length > 1,
      });
      assertGeneratorScenarioYaml(yamlString, scenario.assertion);

      await exitArgoPullWizardToApplicationsPage(pullWizard, page);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(applicationListPage.getPageTitle()).toContainText('Applications', {
        timeout: 30_000,
      });
    });
  }
}
