import { expect, test } from '@playwright/test';

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
  pullWizard: ArgoPullApplicationCreateWizardPage
): Promise<void> {
  const scenarios = GENERATOR_SCENARIOS_BY_TEST_ID[testId];
  if (!scenarios?.length) {
    throw new Error(`No generator scenarios defined for test id ${testId}`);
  }

  for (const scenario of scenarios) {
    await test.step(scenario.name, async () => {
      const page = applicationListPage.getPage();
      await applicationListPage.goto();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await openArgoPullWizardToGeneratorsStep(applicationListPage, pullWizard);
      await ensureFirstArgoGeneratorThenSelectAndFill(
        pullWizard.getPage(),
        scenario.generatorNames,
        scenario.config
      );

      if (scenario.hasClusterDecision) {
        await assertPlacementTabPresent(pullWizard.getPage());
      } else {
        await assertPlacementTabAbsent(pullWizard.getPage());
      }

      const yamlString = await readArgoPullWizardYaml(pullWizard, {
        expectMatrix: scenario.generatorNames.length > 1,
      });
      assertGeneratorScenarioYaml(yamlString, scenario.assertion);

      await exitArgoPullWizardToApplicationsPage(pullWizard);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await expect(applicationListPage.getPageTitle()).toContainText('Applications', {
        timeout: 30_000,
      });
    });
  }
}
