import { Page, Locator, expect } from '@playwright/test';
import { PLACEMENT_SYNC_EDITOR } from '@constants/placement-tolerations';

/**
 * Sync YAML editor toggle and **Copy** (clipboard hook) shared across ACM placement wizards.
 * Optional `scope` limits locators to a modal or nested panel (e.g. Add Argo server).
 */
export class SyncEditorYamlActions {
  constructor(
    private readonly page: Page,
    private readonly clipboardStorageKey = '__syncEditorYamlCopy',
    private readonly scope?: Locator
  ) {}

  private root(): Page | Locator {
    return this.scope ?? this.page;
  }

  getYamlSwitch() {
    return this.root().locator(`#${PLACEMENT_SYNC_EDITOR.yamlSwitchId}`);
  }

  getSyncEditorTextarea() {
    return this.root().locator(PLACEMENT_SYNC_EDITOR.syncEditorTextareaSelector).first();
  }

  getCopyButton() {
    return this.root().locator(`#${PLACEMENT_SYNC_EDITOR.syncEditorCopyButtonId}`);
  }

  /** Whether the sync YAML drawer / Monaco editor is already shown (idempotent guard for polls). */
  private async isYamlEditorOpen(): Promise<boolean> {
    const root = this.root();
    const monaco = root.locator('.monaco-editor').first();
    if (await monaco.isVisible().catch(() => false)) return true;

    const yaml = this.getYamlSwitch();
    if (await yaml.isVisible().catch(() => false)) {
      const ariaChecked = await yaml.getAttribute('aria-checked').catch(() => null);
      if (ariaChecked === 'true') return true;
      if (ariaChecked === 'false') return false;
      return yaml.isChecked().catch(() => false);
    }

    const roleSwitch = root.getByRole('switch', { name: /^YAML$/i });
    if (await roleSwitch.isVisible().catch(() => false)) {
      const ariaChecked = await roleSwitch.getAttribute('aria-checked').catch(() => null);
      if (ariaChecked === 'true') return true;
      if (ariaChecked === 'false') return false;
    }

    return false;
  }

  private async openYamlEditor(): Promise<void> {
    const root = this.root();
    const yaml = this.getYamlSwitch();
    if (await yaml.isVisible().catch(() => false)) {
      await root.locator(`label[for="${PLACEMENT_SYNC_EDITOR.yamlSwitchId}"]`).click({ force: true });
      return;
    }
    await root.getByRole('switch', { name: /^YAML$/i }).click({ force: true });
  }

  async enableYamlEditor(): Promise<void> {
    const root = this.root();
    if (!(await this.isYamlEditorOpen())) {
      await this.openYamlEditor();
    }
    await root.locator(PLACEMENT_SYNC_EDITOR.syncEditorContainerSelector).waitFor({
      state: 'visible',
      timeout: 60_000,
    });
    await root.locator('.monaco-editor textarea').first().waitFor({ state: 'attached', timeout: 30_000 });
  }

  /** Read YAML from the Monaco textarea (works when clipboard copy is blocked). */
  async readMonacoYaml(): Promise<string> {
    await this.enableYamlEditor();
    return this.root().locator('.monaco-editor textarea').first().inputValue();
  }

  private async installClipboardHook(): Promise<void> {
    const key = this.clipboardStorageKey;
    await this.page.evaluate((storageKey) => {
      const win = window as unknown as { [key: string]: string | undefined };
      if (win[`${storageKey}__hooked`]) return;
      win[storageKey] = '';
      const clipboard = navigator.clipboard;
      const original = clipboard.writeText.bind(clipboard);
      clipboard.writeText = async (text: string) => {
        win[storageKey] = text;
        try {
          return await original(text);
        } catch {
          return;
        }
      };
      win[`${storageKey}__hooked`] = '1';
    }, key);
  }

  async copyYaml(): Promise<string> {
    await this.enableYamlEditor();
    await this.installClipboardHook();
    const copy = this.getCopyButton();
    await copy.waitFor({ state: 'visible', timeout: 30_000 });
    await copy.click({ force: true });
    return this.page.evaluate((storageKey) => {
      const win = window as unknown as { [key: string]: string | undefined };
      return win[storageKey] ?? '';
    }, this.clipboardStorageKey);
  }

  async waitForYamlMatching(pattern: RegExp, timeoutMs = 60_000): Promise<string> {
    await this.enableYamlEditor();
    await this.installClipboardHook();
    let yamlText = '';
    await expect
      .poll(async () => {
        yamlText = await this.copyYaml();
        return yamlText;
      }, { timeout: timeoutMs })
      .toMatch(pattern);
    return yamlText;
  }

  async readYaml(options?: { waitPattern?: RegExp; timeoutMs?: number }): Promise<string> {
    const waitPattern = options?.waitPattern;
    const timeoutMs = options?.timeoutMs ?? 45_000;
    if (waitPattern) {
      return this.waitForYamlMatching(waitPattern, timeoutMs);
    }
    return this.copyYaml();
  }
}
