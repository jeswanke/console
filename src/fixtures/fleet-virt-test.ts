import { test as base, expect } from '@playwright/test';
import { OcCliService } from '@services/OcCliService';
import { FleetVirtPage } from '@pages/fleet-virt/FleetVirtPage';
import { VmDetailsPage } from '@pages/fleet-virt/VmDetailsPage';
import { AdvancedSearchModal } from '@components/fleet-virt/AdvancedSearchModal';
import { SavedSearches } from '@components/fleet-virt/SavedSearches';
import { TreeView } from '@components/fleet-virt/TreeView';
import { StatusFilter } from '@components/fleet-virt/StatusFilter';
type FleetVirtFixtures = {
  oc: OcCliService;
  fleetVirtPage: FleetVirtPage;
  vmDetailsPage: VmDetailsPage;
  advancedSearchModal: AdvancedSearchModal;
  savedSearches: SavedSearches;
  treeView: TreeView;
  statusFilter: StatusFilter;
};

export const test = base.extend<FleetVirtFixtures>({
  oc: async ({}, use) => {
    await use(new OcCliService());
  },

  fleetVirtPage: async ({ page, oc }, use) => {
    await use(new FleetVirtPage(page, oc));
  },

  vmDetailsPage: async ({ page }, use) => {
    await use(new VmDetailsPage(page));
  },

  advancedSearchModal: async ({ page }, use) => {
    await use(new AdvancedSearchModal(page));
  },

  savedSearches: async ({ page }, use) => {
    await use(new SavedSearches(page));
  },

  treeView: async ({ page }, use) => {
    await use(new TreeView(page));
  },

  statusFilter: async ({ page }, use) => {
    await use(new StatusFilter(page));
  },
});

export { expect };
