import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { AdvancedSearchModal } from '@components/fleet-virt/AdvancedSearchModal';
import { SavedSearches } from '@components/fleet-virt/SavedSearches';
import { getVirtConfig } from '@config';
import type { VirtConfig } from '@config';

type FleetVirtFixtures = {
  oc: OcCliService;
  virtConfig: VirtConfig;
  fleetVirtPage: FleetVirtPage;
  advancedSearchModal: AdvancedSearchModal;
  savedSearches: SavedSearches;
};

export const test = base.extend<FleetVirtFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  virtConfig: async ({}, use) => {
    await use(getVirtConfig());
  },

  fleetVirtPage: async ({ page, oc }, use) => {
    await use(new FleetVirtPage(page, oc));
  },

  advancedSearchModal: async ({ page }, use) => {
    await use(new AdvancedSearchModal(page));
  },

  savedSearches: async ({ page }, use) => {
    await use(new SavedSearches(page));
  },
});

export { expect };
