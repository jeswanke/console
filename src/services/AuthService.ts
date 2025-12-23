import { Page, BrowserContext } from '@playwright/test';
import { OcCliService } from './OcCliService';

export class AuthService {
  constructor(private oc: OcCliService) {}

  /**
   * Log in to the ACM console using the current 'oc' token.
   * This follows the Hybrid Architecture by using the CLI to get credentials
   * and injecting them into the browser context.
   */
  async login(page: Page) {
    const token = await this.oc.getToken();
    const consoleUrl = await this.oc.getConsoleUrl();
    const oauthHost = await this.oc.getOAuthHost();

    if (!consoleUrl || consoleUrl === 'https://') {
      throw new Error('Retrieved Console URL is empty or invalid.');
    }

    const consoleHost = new URL(consoleUrl).hostname;

    // We inject the token into both the console and the oauth domains
    const domains = [consoleHost, oauthHost];
    const cookieNames = ['openshift-session-token', 'session', 'acm-access-token-cookie', '_oauth_proxy'];
    
    const cookies = domains.flatMap(domain => 
      cookieNames.map(name => ({
        name,
        value: token,
        url: `https://${domain}`,
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax' as const,
      }))
    );

    await page.context().addCookies(cookies);

    // Navigate to the console with the token in the URL as well
    // Some versions of the console/proxy support this bypass
    const loginUrl = `${consoleUrl}/?token=${token}`;
    await page.goto(loginUrl);
    await page.waitForLoadState('networkidle');

    // If we are still on a login page, try to see if we can "nudge" it
    if (page.url().includes('oauth-openshift') && page.url().includes('/login')) {
      console.log('Detected login selection page. Attempting to bypass...');
      // Try to navigate directly to the callback if we have the token
      await page.goto(`${consoleUrl}/auth/callback?code=${token}`); // Long shot, but works on some proxies
      await page.waitForLoadState('networkidle');
    }

    // Also inject into LocalStorage
    await page.evaluate((t) => {
      localStorage.setItem('token', t);
      localStorage.setItem('acm-token', t);
    }, token);

    // Verify login success
    const userMenu = page.locator('.pf-c-dropdown__toggle, .pf-v5-c-dropdown__toggle, #user-dropdown, .co-m-user-menu').first();
    try {
      await userMenu.waitFor({ state: 'visible', timeout: 15000 });
    } catch (e) {
      const currentUrl = page.url();
      const title = await page.title();
      throw new Error(`Failed to verify login. 
        Current URL: ${currentUrl}
        Page Title: ${title}
        User menu not visible after cookie injection.`);
    }
  }
}

