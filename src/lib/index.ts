/**
 * Shared test logic: assertions, factories, and other non-page, non-service code.
 * Add modules under `assertions/`, `factories/`, etc. as the suite grows.
 *
 * @see docs/architecture-overview.md — §5 `/src/lib`
 */

export {
  createSubscription,
  DEFAULT_FULL_WIZARD_PER_BLOCK,
  type AutomationSpec,
  type ClusterDeploymentSpec,
  type ClusterLabelSelectorRowSpec,
  type CreateSubscriptionOptions,
  type GitSubscriptionRepositoryFields,
  type HelmSubscriptionRepositoryFields,
  type ObjectStorageSubscriptionRepositoryFields,
  type PerBlockSubscriptionSpec,
  type SubscriptionRepositorySpec,
  type TimeWindowSpec,
} from './subscription-create';
