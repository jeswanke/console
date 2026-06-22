/**
 * RHACM4K-61948–61957 — Argo ApplicationSet pull-model **Generators** wizard matrix scenarios.
 *
 * Cypress: `Argo_Appset_Generators_Test_Suite.cy.js`.
 */
import {
  GENERATOR_SCENARIO_TIMEOUT_MS,
  runArgoGeneratorScenariosForTestId,
} from '@lib/app/argo/run-generator-scenarios';
import { test } from '@fixtures/app-test';

test.describe(
  'Application Lifecycle UI: Argo ApplicationSet (Pull Model) - Generators',
  { tag: ['@ALC', '@gitops', '@e2e-argo', '@applicationset', '@generators', '@argo-appset-generators'] },
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'RHACM4K-61948 - As an application admin, I want to create a matrix ApplicationSet with Cluster Decision Resource Generator',
      { tag: ['@RHACM4K-61948', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61948',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );

    test(
      'RHACM4K-61951 - As an application admin, I want to create a matrix ApplicationSet with Clusters Generator',
      { tag: ['@RHACM4K-61951', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61951',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );

    test(
      'RHACM4K-61952 - As an application admin, I want to create a matrix ApplicationSet with Git Generator',
      { tag: ['@RHACM4K-61952', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61952',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );

    test(
      'RHACM4K-61953 - As an application admin, I want to create a matrix ApplicationSet with List Generator',
      { tag: ['@RHACM4K-61953', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61953',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );

    test(
      'RHACM4K-61954 - As an application admin, I want to create a matrix ApplicationSet with Pull Request Generator',
      { tag: ['@RHACM4K-61954', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61954',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );

    test(
      'RHACM4K-61956 - As an application admin, I want to create a matrix ApplicationSet with Plugin Generator',
      { tag: ['@RHACM4K-61956', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61956',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );

    test(
      'RHACM4K-61957 - As an application admin, I want to create a matrix ApplicationSet with SCM Provider Generator',
      { tag: ['@RHACM4K-61957', '@generators'] },
      async ({ applicationListPage, argoPullApplicationCreateWizardPage }) => {
        test.setTimeout(GENERATOR_SCENARIO_TIMEOUT_MS);
        await runArgoGeneratorScenariosForTestId(
          '61957',
          applicationListPage,
          argoPullApplicationCreateWizardPage
        );
      }
    );
  }
);
