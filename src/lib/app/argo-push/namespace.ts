import type { CreateArgoPushApplicationOptions } from './types';

export function resolveApplicationSetNamespace(options: CreateArgoPushApplicationOptions): string {
  return options.applicationSetNamespace ?? options.argoServerLabel;
}
