/** Application lifecycle (ALC) — resolve API for subscription, argoPush, and flux scenarios. */
import { loadE2eSpecData } from './io/loadSpec';
import { findScenarioIdsByTestId } from './lookup/findScenarioIds';
import { buildResolvedAppScenario } from './resolve/buildResolvedAppScenario';
import type {
  ResolvedAppScenario,
  ResolvedArgoPushAppScenario,
  ResolvedFluxAppScenario,
  ResolvedOpenshiftAppScenario,
  ResolvedSubscriptionAppScenario,
} from './types';

export type {
  ResolvedAppScenario,
  ResolvedArgoPushAppScenario,
  ResolvedFluxAppScenario,
  ResolvedOpenshiftAppScenario,
  ResolvedSubscriptionAppScenario,
} from './types';

function requireSubscriptionScenario(
  resolved: ResolvedAppScenario,
  context: string
): ResolvedSubscriptionAppScenario {
  if (resolved.domain !== 'subscription') {
    throw new Error(`e2e-spec-data: expected subscription scenario for ${context}, got "${resolved.domain}"`);
  }
  return resolved;
}

function requireArgoPushScenario(
  resolved: ResolvedAppScenario,
  context: string
): ResolvedArgoPushAppScenario {
  if (resolved.domain !== 'argoPush') {
    throw new Error(`e2e-spec-data: expected argoPush scenario for ${context}, got "${resolved.domain}"`);
  }
  return resolved;
}

function requireOpenshiftScenario(
  resolved: ResolvedAppScenario,
  context: string
): ResolvedOpenshiftAppScenario {
  if (resolved.domain !== 'openshift') {
    throw new Error(`e2e-spec-data: expected openshift scenario for ${context}, got "${resolved.domain}"`);
  }
  return resolved;
}

function requireFluxScenario(
  resolved: ResolvedAppScenario,
  context: string
): ResolvedFluxAppScenario {
  if (resolved.domain !== 'flux') {
    throw new Error(`e2e-spec-data: expected flux scenario for ${context}, got "${resolved.domain}"`);
  }
  return resolved;
}

function resolveScenarioByTestIdInternal(
  testId: string,
  configPath?: string
): ResolvedAppScenario {
  const spec = loadE2eSpecData(configPath);
  const scenarioIds = findScenarioIdsByTestId(spec, testId);
  if (scenarioIds.length === 0) {
    throw new Error(`e2e-spec-data: no enabled scenario for test id "${testId}"`);
  }
  if (scenarioIds.length > 1) {
    throw new Error(
      `e2e-spec-data: multiple scenarios for test id "${testId}": ${scenarioIds.join(', ')}`
    );
  }
  return buildResolvedAppScenario(spec, scenarioIds[0]!);
}

function resolveScenarioByIdInternal(
  scenarioId: string,
  configPath?: string
): ResolvedAppScenario {
  const spec = loadE2eSpecData(configPath);
  if (!spec.scenarios[scenarioId]) {
    throw new Error(`e2e-spec-data: scenario not found: "${scenarioId}"`);
  }
  return buildResolvedAppScenario(spec, scenarioId);
}

/**
 * Resolves a Polarion / matrix **test id** to a single application scenario.
 * @throws if zero or more than one enabled scenario matches.
 */
export function resolveScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedAppScenario {
  return resolveScenarioByTestIdInternal(testId, configPath);
}

/** Subscription-only variant of {@link resolveScenarioByTestId}. */
export function resolveSubscriptionScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedSubscriptionAppScenario {
  return requireSubscriptionScenario(
    resolveScenarioByTestIdInternal(testId, configPath),
    `test id "${testId}"`
  );
}

/** Resolves a YAML **scenario id** (e.g. `auto_git_add_subscription_base`). */
export function resolveScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedAppScenario {
  return resolveScenarioByIdInternal(scenarioId, configPath);
}

/** Subscription-only variant of {@link resolveScenarioById}. */
export function resolveSubscriptionScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedSubscriptionAppScenario {
  return requireSubscriptionScenario(
    resolveScenarioByIdInternal(scenarioId, configPath),
    `scenario id "${scenarioId}"`
  );
}

/** Push-model ApplicationSet variant of {@link resolveScenarioById}. */
export function resolveArgoPushScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedArgoPushAppScenario {
  return requireArgoPushScenario(
    resolveScenarioByIdInternal(scenarioId, configPath),
    `scenario id "${scenarioId}"`
  );
}

/** Push-model ApplicationSet variant of {@link resolveScenarioByTestId}. */
export function resolveArgoPushScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedArgoPushAppScenario {
  return requireArgoPushScenario(
    resolveScenarioByTestIdInternal(testId, configPath),
    `test id "${testId}"`
  );
}

/** Flux CD variant of {@link resolveScenarioById}. */
export function resolveFluxScenarioById(
  scenarioId: string,
  configPath?: string
): ResolvedFluxAppScenario {
  return requireFluxScenario(
    resolveScenarioByIdInternal(scenarioId, configPath),
    `scenario id "${scenarioId}"`
  );
}

/** Flux CD variant of {@link resolveScenarioByTestId}. */
export function resolveFluxScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedFluxAppScenario {
  return requireFluxScenario(
    resolveScenarioByTestIdInternal(testId, configPath),
    `test id "${testId}"`
  );
}

/** OpenShift native app variant of {@link resolveScenarioByTestId}. */
export function resolveOpenshiftScenarioByTestId(
  testId: string,
  configPath?: string
): ResolvedOpenshiftAppScenario {
  return requireOpenshiftScenario(
    resolveScenarioByTestIdInternal(testId, configPath),
    `test id "${testId}"`
  );
}

/** OpenShift edit flows: base helloworld scenario + mortgage edit scenario by Polarion test id. */
export function resolveOpenshiftScenarioPair(params: {
  baseTestId: string;
  editTestId: string;
  configPath?: string;
}): { base: ResolvedOpenshiftAppScenario; edit: ResolvedOpenshiftAppScenario } {
  const { baseTestId, editTestId, configPath } = params;
  return {
    base: resolveOpenshiftScenarioByTestId(baseTestId, configPath),
    edit: resolveOpenshiftScenarioByTestId(editTestId, configPath),
  };
}

/** Flux edit flows: base scenario by id + edited scenario by Polarion test id. */
export function resolveFluxScenarioPair(params: {
  baseScenarioId: string;
  testId: string;
  configPath?: string;
}): { base: ResolvedFluxAppScenario; delta: ResolvedFluxAppScenario } {
  const { baseScenarioId, testId, configPath } = params;
  return {
    base: resolveFluxScenarioById(baseScenarioId, configPath),
    delta: resolveFluxScenarioByTestId(testId, configPath),
  };
}

/** Base scenario by id + delta scenario by Polarion test id (add/edit flows). */
export function resolveScenarioPair(params: {
  baseScenarioId: string;
  testId: string;
  configPath?: string;
}): { base: ResolvedAppScenario; delta: ResolvedAppScenario } {
  const { baseScenarioId, testId, configPath } = params;
  return {
    base: resolveScenarioByIdInternal(baseScenarioId, configPath),
    delta: resolveScenarioByTestIdInternal(testId, configPath),
  };
}

/** Subscription-only variant of {@link resolveScenarioPair}. */
export function resolveSubscriptionScenarioPair(params: {
  baseScenarioId: string;
  testId: string;
  configPath?: string;
}): { base: ResolvedSubscriptionAppScenario; delta: ResolvedSubscriptionAppScenario } {
  const { baseScenarioId, testId, configPath } = params;
  return {
    base: resolveSubscriptionScenarioById(baseScenarioId, configPath),
    delta: resolveSubscriptionScenarioByTestId(testId, configPath),
  };
}
