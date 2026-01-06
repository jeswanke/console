import { Page } from '@playwright/test';
import { OcCliService } from './OcCliService';

/**
 * AuthService - Utility for authentication-related operations.
 * 
 * Note: Primary authentication is handled by the setup project (auth.setup.ts)
 * which performs UI login and saves storageState. This service can be used
 * for additional auth utilities like logout, role switching, etc.
 */
export class AuthService {
  constructor(private oc: OcCliService) {}

  /**
   * Verify that the user is currently logged in.
   */
  async verifyLoggedIn(page: Page): Promise<boolean> {
    const masthead = page.locator('#page-main-header, .pf-c-masthead, .co-masthead, .pf-v6-c-masthead').first();
    return await masthead.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /**
   * Get the current user from the UI (if visible).
   */
  async getCurrentUser(page: Page): Promise<string | null> {
    const userMenu = page.locator('[data-test="user-dropdown"], .co-username');
    if (await userMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
      return await userMenu.textContent();
    }
    return null;
  }
}
