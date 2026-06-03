/**
 * Configuration types for hub auth and area-specific runtime options.
 *
 * Values are loaded by per-area getters in index.ts.
 * Tests receive config via fixtures, never via process.env directly.
 */

export interface HubAuthConfig {
  readonly hubUser: string;
  readonly hubPassword: string;
  readonly hubIdp: string;
}

export interface RbacUser {
  readonly role: string;
  readonly username: string;
  readonly password: string;
  readonly idp: string;
  readonly domains: readonly string[];
}

export interface RbacConfig {
  readonly testUser: string;
  readonly testPassword: string;
  readonly idpName: string;
  readonly managedAdminUser: string;
  readonly managedAdminPassword: string;
  readonly spokeCluster: string;
}

export interface VirtConfig {
  readonly spokeCluster: string;
}

export interface TestConfig {
  readonly hub: HubAuthConfig;
}
