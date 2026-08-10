import { Page, Locator } from '@playwright/test';
import { FLEET_VIRT_TREE_VIEW } from '@constants/fleet-virt';

export class TreeView {
  private readonly showVmProjectsSwitch: Locator;

  constructor(private readonly page: Page) {
    this.showVmProjectsSwitch = page.getByRole('switch');
  }

  getShowVmProjectsSwitch(): Locator {
    return this.showVmProjectsSwitch;
  }

  async toggleShowVmProjects(): Promise<void> {
    await this.showVmProjectsSwitch.click();
  }

  async expandCluster(clusterName: string): Promise<void> {
    const node = this.page.locator(`li[id="${FLEET_VIRT_TREE_VIEW.clusterPrefix}/${clusterName}"]`);
    await node.scrollIntoViewIfNeeded();
    const toggle = node.locator(FLEET_VIRT_TREE_VIEW.nodeToggle);
    if (await toggle.isVisible()) {
      await toggle.click();
    }
  }

  async clickProject(clusterName: string, namespace: string): Promise<void> {
    const node = this.page.locator(`li[id="${FLEET_VIRT_TREE_VIEW.projectPrefix}/${clusterName}/${namespace}"]`);
    await node.locator(FLEET_VIRT_TREE_VIEW.nodeText).click();
  }

  getAllTreeItems(): Locator {
    return this.page.locator('[role="treeitem"]');
  }

  getClusterNode(clusterName: string): Locator {
    return this.page.locator(`li[id="${FLEET_VIRT_TREE_VIEW.clusterPrefix}/${clusterName}"]`);
  }
}
