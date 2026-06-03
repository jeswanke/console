/**
 * Placement cluster preview UI (wizard footer link + modal). Shared by policy and standalone Placement wizards.
 * Hub-aligned; modal title may omit "of Y" when unlimited (ACM-33680).
 */

export const PLACEMENT_CLUSTER_PREVIEW = {
  footer: {
    matchedByPlacementLabel: /Matched by Placement:/i,
    previewLinkPattern: /\d+ of \d+ clusters|\d+ clusters/,
  },
  previewModal: {
    titlePattern: /(\d+ of \d+|\d+) clusters matched/i,
    descriptionPattern:
      /Showing clusters that match your defined labels, tolerations, and limits/i,
    matchedSectionLabel: /^Matched$/i,
    notMatchedSectionLabel: /^Not matched$/i,
  },
  alerts: {
    noClustersMatchWarning:
      /No clusters match the current placement criteria/i,
    reviewInfoPlacementPreview: /Matched by Placement/i,
  },
  placement: {
    clusterSetsComboboxLabel: /^Cluster sets$/i,
    setLimitCheckboxLabel: /Set a limit on the number of clusters selected/i,
    numberOfClustersInputId: 'Placement.spec.numberOfClusters',
    limitClustersCheckboxIdSuffix: 'limit-clusters-checkbox',
  },
} as const;

/** RHACM4K-64220 — standalone Create placement wizard. */
export const PLACEMENT_CREATE_PREVIEW = {
  ...PLACEMENT_CLUSTER_PREVIEW,
  setupYamlRelativePath: 'src/templates/cluster/placement-preview-test-setup.yaml',
  namespace: 'preview-test-ns',
  clusterSet: 'preview-test-cluster-set',
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
  testData: {
    namePrefix: 'placement-preview',
  },
} as const;
