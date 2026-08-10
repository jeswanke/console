import { expect } from '@playwright/test';

import type { OcCliService } from '@services/OcCliService';

const DEFAULT_POLL_INTERVALS = [10_000, 10_000, 15_000];
const DEFAULT_POLL_TIMEOUT = 300_000;

export type PollAnsibleJobNamesParams = {
  oc: OcCliService;
  namespace: string;
  /** Predicate on current job names (trimmed, non-empty lines from `oc get ansiblejob`). */
  until: (names: string[]) => boolean;
  timeout?: number;
  errorMessage: string;
};

/** Poll `oc get ansiblejob` until `until(names)` is true (Cypress `cy.waitUntil` equivalent). */
export async function pollAnsibleJobNamesUntil(
  params: PollAnsibleJobNamesParams
): Promise<string[]> {
  const timeout = params.timeout ?? DEFAULT_POLL_TIMEOUT;
  let lastNames: string[] = [];
  await expect
    .poll(
      async () => {
        lastNames = await params.oc.listAnsibleJobNames(params.namespace);
        return params.until(lastNames);
      },
      {
        timeout,
        intervals: DEFAULT_POLL_INTERVALS,
        message: params.errorMessage,
      }
    )
    .toBe(true);
  return lastNames;
}

export type PollAnsibleJobsIncludeParams = {
  oc: OcCliService;
  namespace: string;
  substring: string;
  timeout?: number;
  errorMessage: string;
};

/** Poll until at least one AnsibleJob name contains `substring`. */
export async function pollAnsibleJobsInclude(
  params: PollAnsibleJobsIncludeParams
): Promise<string[]> {
  return pollAnsibleJobNamesUntil({
    oc: params.oc,
    namespace: params.namespace,
    timeout: params.timeout,
    errorMessage: params.errorMessage,
    until: (names) => names.some((n) => n.includes(params.substring)),
  });
}

export type PollAnsibleJobsAllIncludeParams = {
  oc: OcCliService;
  namespace: string;
  substrings: readonly string[];
  timeout?: number;
  errorMessage: string;
};

/** Poll until every `substring` appears in at least one AnsibleJob name. */
export async function pollAnsibleJobsAllInclude(
  params: PollAnsibleJobsAllIncludeParams
): Promise<string[]> {
  return pollAnsibleJobNamesUntil({
    oc: params.oc,
    namespace: params.namespace,
    timeout: params.timeout,
    errorMessage: params.errorMessage,
    until: (names) =>
      params.substrings.every((substring) => names.some((n) => n.includes(substring))),
  });
}

export type PollAnsibleJobCountParams = {
  oc: OcCliService;
  namespace: string;
  count: number;
  timeout?: number;
  errorMessage: string;
};

/** Poll until the namespace has exactly `count` AnsibleJobs. */
export async function pollAnsibleJobCount(params: PollAnsibleJobCountParams): Promise<string[]> {
  return pollAnsibleJobNamesUntil({
    oc: params.oc,
    namespace: params.namespace,
    timeout: params.timeout,
    errorMessage: params.errorMessage,
    until: (names) => names.length === params.count,
  });
}

/** Assert no AnsibleJob name contains `substring` (e.g. posthooks not triggered yet). */
export async function expectAnsibleJobsNoneMatch(
  oc: OcCliService,
  namespace: string,
  substring: string
): Promise<void> {
  const names = await oc.listAnsibleJobNames(namespace);
  expect(
    names.filter((n) => n.includes(substring)),
    `expected no AnsibleJob matching "${substring}"`
  ).toHaveLength(0);
}

/** Patch every AnsibleJob in the namespace to successful (fake AAP completion). */
export async function patchAllAnsibleJobsSuccessful(
  oc: OcCliService,
  namespace: string
): Promise<string[]> {
  const names = await oc.listAnsibleJobNames(namespace);
  for (const jobName of names) {
    await oc.patchAnsibleJobStatusSuccessful(namespace, jobName);
  }
  return names;
}

/** Assert expected job count, then patch all to successful. */
export async function expectAnsibleJobCountAndPatchAll(
  oc: OcCliService,
  namespace: string,
  expectedCount: number
): Promise<string[]> {
  const names = await oc.listAnsibleJobNames(namespace);
  expect(names, `expected ${expectedCount} AnsibleJob(s) before patching status`).toHaveLength(
    expectedCount
  );
  for (const jobName of names) {
    await oc.patchAnsibleJobStatusSuccessful(namespace, jobName);
  }
  return names;
}
