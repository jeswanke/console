import { expect } from '@playwright/test';
import { parse, parseAllDocuments } from 'yaml';

import {
  ARGO_APPSET_GENERATORS,
  type GeneratorAssertion,
  type YamlTemplateFields,
} from '@constants/argo-appset-generators';

function expectObjectContains(
  actual: unknown,
  expected: unknown,
  path = ''
): void {
  if (expected == null || typeof expected !== 'object') {
    expect(actual, path || 'value').toBe(expected);
    return;
  }
  if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path || 'array').toBe(true);
    expect((actual as unknown[]).length, path).toBe(expected.length);
    expected.forEach((expectedVal, i) => {
      expectObjectContains((actual as unknown[])[i], expectedVal, `${path}[${i}]`);
    });
    return;
  }
  for (const [key, expectedVal] of Object.entries(expected as Record<string, unknown>)) {
    const subPath = path ? `${path}.${key}` : key;
    expect(
      actual != null && typeof actual === 'object' && Object.prototype.hasOwnProperty.call(actual, key),
      subPath
    ).toBe(true);
    expectObjectContains((actual as Record<string, unknown>)[key], expectedVal, subPath);
  }
}

export function parseArgoWizardApplicationSet(yamlString: string): Record<string, unknown> {
  const docs = parseAllDocuments(yamlString).map((doc) => doc.toJSON() as Record<string, unknown>);
  const appSet = docs.find((d) => d?.kind === 'ApplicationSet');
  return (appSet ?? docs[0] ?? parse(yamlString)) as Record<string, unknown>;
}

export function getArgoWizardYamlDocByKind(
  yamlString: string,
  kind: string
): Record<string, unknown> | undefined {
  const docs = parseAllDocuments(yamlString).map((doc) => doc.toJSON() as Record<string, unknown>);
  return docs.find((d) => d?.kind === kind);
}

function expectArgoYamlHasGeneratorsInOrder(
  parsedYaml: Record<string, unknown>,
  expectedYamlKeys: string[]
): void {
  const generators = (parsedYaml?.spec as { generators?: unknown[] } | undefined)?.generators;
  expect(Array.isArray(generators)).toBe(true);
  const actualKeys = (generators as Record<string, unknown>[]).map(
    (g) => Object.keys(g).find((k) => k !== 'template') ?? ''
  );
  expect(actualKeys).toEqual(expectedYamlKeys);
}

function expectArgoYamlHasFields(
  parsedYaml: Record<string, unknown>,
  expectedFields: YamlTemplateFields
): void {
  for (const [path, value] of Object.entries(expectedFields)) {
    const parts = path.split('.');
    let obj: unknown = parsedYaml;
    for (const part of parts) {
      expect(obj, path).toHaveProperty(part);
      obj = (obj as Record<string, unknown>)[part];
    }
    if (value !== undefined) {
      expect(obj).toBe(value);
    }
  }
}

function expectGeneratorShape(
  parsedAppSet: Record<string, unknown>,
  generatorIndex: number,
  generatorKey: string,
  expectedShape: Record<string, unknown>
): void {
  const generators = (parsedAppSet?.spec as { generators?: Record<string, unknown>[] }).generators;
  expect(Array.isArray(generators)).toBe(true);
  expect(generators?.[generatorIndex], `generator at index ${generatorIndex}`).toBeTruthy();
  const gen = generators![generatorIndex]!;
  expect(gen).toHaveProperty(generatorKey);
  expectObjectContains(gen[generatorKey], expectedShape, generatorKey);
}

function expectGeneratorShapeInArray(
  generatorsArray: Record<string, unknown>[],
  index: number,
  generatorKey: string,
  expectedShape: Record<string, unknown>
): void {
  expect(Array.isArray(generatorsArray)).toBe(true);
  expect(generatorsArray[index], `generator at index ${index}`).toBeTruthy();
  const gen = generatorsArray[index]!;
  expect(gen).toHaveProperty(generatorKey);
  expectObjectContains(gen[generatorKey], expectedShape, `${generatorKey}[${index}]`);
}

function expectMatrixGeneratorAndGetInner(
  parsedAppSet: Record<string, unknown>,
  matrixIndex = 0
): Record<string, unknown>[] {
  const generators = (parsedAppSet?.spec as { generators?: Record<string, unknown>[] }).generators;
  expect(Array.isArray(generators)).toBe(true);
  expect(generators?.[matrixIndex], `generator at index ${matrixIndex}`).toBeTruthy();
  const gen = generators![matrixIndex]!;
  expect(gen).toHaveProperty('matrix');
  const inner = (gen.matrix as { generators?: Record<string, unknown>[] }).generators;
  expect(Array.isArray(inner)).toBe(true);
  return inner!;
}

function expectInnerGeneratorsInOrder(
  innerGenerators: Record<string, unknown>[],
  expectedKeys: string[]
): void {
  const actualKeys = innerGenerators.map(
    (g) => Object.keys(g).find((k) => k !== 'template') ?? ''
  );
  expect(actualKeys).toEqual(expectedKeys);
}

function expectTolerationsInclude(
  tolerationsArray: unknown,
  requiredTolerations: Array<{ key: string; operator: string }>
): void {
  const tolerations = (tolerationsArray as Array<{ key?: string; operator?: string }>) ?? [];
  expect(Array.isArray(tolerations)).toBe(true);
  for (const required of requiredTolerations) {
    expect(
      tolerations.some((t) => t.key === required.key && t.operator === required.operator)
    ).toBe(true);
  }
}

function assertPlacementAndTolerationsInGeneratorTest(
  yamlString: string,
  placementName: string = ARGO_APPSET_GENERATORS.placementName,
  placementNamespace: string = ARGO_APPSET_GENERATORS.placementNamespace
): void {
  const placement = getArgoWizardYamlDocByKind(yamlString, 'Placement');
  expect(placement, 'Placement doc in YAML').toBeTruthy();
  expectArgoYamlHasFields(placement!, {
    'metadata.name': placementName,
    'metadata.namespace': placementNamespace,
  });
  const numberOfClusters = (placement!.spec as { numberOfClusters?: number }).numberOfClusters;
  if (numberOfClusters !== undefined) {
    expect(numberOfClusters).toBe(1);
  }
  expectTolerationsInclude((placement!.spec as { tolerations?: unknown }).tolerations, [
    { key: ARGO_APPSET_GENERATORS.tolerationUnreachable, operator: 'Exists' },
    { key: ARGO_APPSET_GENERATORS.tolerationUnavailable, operator: 'Exists' },
  ]);
}

function assertNoPlacementInYaml(yamlString: string): void {
  const placement = getArgoWizardYamlDocByKind(yamlString, 'Placement');
  expect(placement, 'Placement doc should be absent when no Cluster Decision generator').toBeUndefined();
}

function assertSingleGeneratorScenario(
  yamlString: string,
  generatorKey: string,
  shape: Record<string, unknown>,
  templateFields: YamlTemplateFields | null | undefined,
  hasClusterDecision: boolean,
  placementName?: string,
  placementNamespace?: string
): void {
  const appSet = parseArgoWizardApplicationSet(yamlString);
  expectArgoYamlHasGeneratorsInOrder(appSet, [generatorKey]);
  expectGeneratorShape(appSet, 0, generatorKey, shape);
  if (templateFields) {
    expectArgoYamlHasFields(appSet, templateFields);
  }
  if (hasClusterDecision) {
    assertPlacementAndTolerationsInGeneratorTest(yamlString, placementName, placementNamespace);
  } else {
    assertNoPlacementInYaml(yamlString);
  }
}

function assertMatrixGeneratorScenario(
  yamlString: string,
  innerKeys: string[],
  shapes: Record<string, unknown>[],
  templateFields: YamlTemplateFields | null | undefined,
  hasClusterDecision: boolean,
  placementName?: string,
  placementNamespace?: string
): void {
  const appSet = parseArgoWizardApplicationSet(yamlString);
  expectArgoYamlHasGeneratorsInOrder(appSet, ['matrix']);
  const inner = expectMatrixGeneratorAndGetInner(appSet, 0);
  expectInnerGeneratorsInOrder(inner, innerKeys);
  shapes.forEach((shape, i) => expectGeneratorShapeInArray(inner, i, innerKeys[i]!, shape));
  if (templateFields) {
    expectArgoYamlHasFields(appSet, templateFields);
  }
  if (hasClusterDecision) {
    assertPlacementAndTolerationsInGeneratorTest(yamlString, placementName, placementNamespace);
  } else {
    assertNoPlacementInYaml(yamlString);
  }
}

/** Assert wizard YAML for a declarative generator scenario (RHACM4K-61948–61957). */
export function assertGeneratorScenarioYaml(
  yamlString: string,
  assertion: GeneratorAssertion
): void {
  expect(yamlString).toContain('apiVersion');
  if (assertion.kind === 'single') {
    assertSingleGeneratorScenario(
      yamlString,
      assertion.generatorKey,
      assertion.shape as Record<string, unknown>,
      assertion.templateFields ?? null,
      assertion.hasClusterDecision,
      assertion.placementName,
      assertion.placementNamespace
    );
    return;
  }
  assertMatrixGeneratorScenario(
    yamlString,
    assertion.innerKeys,
    assertion.shapes as Record<string, unknown>[],
    assertion.templateFields ?? null,
    assertion.hasClusterDecision,
    assertion.placementName,
    assertion.placementNamespace
  );
}
