/**
 * Placement cluster preview UI (footer link + modal). Shared across policy, placement, and Argo wizards.
 * Modal title may omit "of Y" or use singular "cluster" when count is 1 (ACM-33680).
 */

export const PLACEMENT_CLUSTER_PREVIEW = {
  footer: {
    matchedByPlacementLabel: /Matched by Placement:/i,
    previewLinkPattern: /\d+ of \d+ clusters|\d+ clusters?/,
  },
  previewModal: {
    titlePattern: /(\d+)\s+(?:of\s+\d+\s+)?clusters?\s+matched/i,
    descriptionPattern:
      /Showing clusters that match your defined labels, tolerations, and limits/i,
    /** Modal section headings (may include trailing whitespace; not exact text nodes). */
    matchedSectionLabel: /^Matched/i,
    notMatchedSectionLabel: /^Not matched/i,
  },
  alerts: {
    /** Substring — full copy includes guidance after the first sentence (Argo/policy review). */
    noClustersMatchWarning:
      /No clusters match the current placement criteria/i,
    reviewInfoPlacementPreview: /Matched by Placement/i,
  },
  placement: {
    clusterSetsComboboxLabel: /^Cluster sets$/i,
    setLimitCheckboxLabel: /Set a limit on the number of clusters selected/i,
    /** Policy / standalone Placement wizards (sync editor field id). */
    numberOfClustersInputId: 'Placement.spec.numberOfClusters',
    limitClustersCheckboxIdSuffix: 'limit-clusters-checkbox',
    /** Argo ApplicationSet wizards — PF NumberInput beside the limit checkbox. */
    placementLimitSectionLabel: /^Limit the number of clusters selected$/i,
  },
} as const;

/** RHACM4K-64219 — Argo ApplicationSet wizard placement preview UI (data in e2e-spec `argo-push.yaml`). */
export const APP_ARGO_APPSET_PLACEMENT_PREVIEW_UI = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  placement: {
    ...PLACEMENT_CLUSTER_PREVIEW.placement,
    clusterSetsComboboxLabel: /^Select the cluster sets$/i,
    existingPlacementComboboxLabel: /^Select the existing placement$/i,
    newPlacementButtonLabel: 'New placement',
    existingPlacementButtonLabel: 'Existing placement',
    placementLimitSectionLabel: /^Limit the number of clusters selected$/i,
  },
  review: {
    placementSectionLabel: 'Placement',
  },
} as const;

/** RHACM4K-64220 — standalone Create placement wizard UI (data in e2e-spec-data). */
export const PLACEMENT_CREATE_PREVIEW = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  placement: {
    ...PLACEMENT_CLUSTER_PREVIEW.placement,
    /** Hub PF Select — aria-label is "Select the cluster sets", not "Cluster sets". */
    clusterSetsComboboxLabel: /^Select the cluster sets$/i,
  },
  stepsNavAriaLabel: 'steps',
  steps: {
    general: /^General$/i,
    placement: /^Placement$/i,
    review: /^Review$/i,
  },
  review: {
    placementSectionId: 'placement',
    expandableSectionClass: 'wizard-review-expandable-section',
  },
} as const;
