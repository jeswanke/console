import { test, expect } from '@playwright/test';

import {
  labelFilterToPopoverToken,
  parseLabelFilterMenuItemText,
} from '@lib/app/verify/applications-label-filter-verify';

test.describe('applications label filter helpers', () => {
  test('labelFilterToPopoverToken normalizes key=value for popover', () => {
    expect(labelFilterToPopoverToken('apiserver = true')).toBe('apiserver=true');
  });

  test('parseLabelFilterMenuItemText parses PF menuitem text', () => {
    expect(
      parseLabelFilterMenuItemText('apiserver\n=\ntrue\n4')
    ).toEqual({ label: 'apiserver = true', expectedCount: 4 });
    expect(
      parseLabelFilterMenuItemText('app = openshift-apiserver 2')
    ).toEqual({ label: 'app = openshift-apiserver', expectedCount: 2 });
  });
});
