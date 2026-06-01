import { test, expect } from '@playwright/test';
import { loadManagedClusterContext } from '@lib/cluster/managedClusterContext';
import path from 'path';
import os from 'os';

test.describe('managed cluster context', () => {
  test('loadManagedClusterContext returns undefined for a missing file', () => {
    const p = path.join(os.tmpdir(), `mc-missing-${Date.now()}.json`);
    expect(loadManagedClusterContext(p)).toBeUndefined();
  });
});
