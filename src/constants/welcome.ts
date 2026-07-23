export const WELCOME_ROUTES = {
  page: '/multicloud/home/welcome',
} as const;

export const WELCOME_PAGE = {
  title: 'Welcome!',
  searchRoute: '/multicloud/search',
  capabilityCards: {
    count: 5,
    overview: {
      title: 'Overview',
      route: '/multicloud/home/overview',
    },
    clusters: {
      title: 'Clusters',
      route: '/multicloud/infrastructure/clusters',
    },
    applications: {
      title: 'Applications',
      route: '/multicloud/applications',
    },
    governance: {
      title: 'Governance',
      route: '/multicloud/governance',
    },
    search: {
      title: 'Search',
      description:
        'Search all environment resources in all clusters using predefined search parameters, or savable custom search parameters. Searches return links to resource details including editable YAMLs and topologies when available.',
      route: '/multicloud/search',
    },
  },
  converseAndConnect: {
    heading: 'Converse and connect.',
    technicalCommunity: {
      title: 'Technical community',
      href: 'https://open-cluster-management.io',
    },
    supportCenter: {
      title: 'Support center',
      href: 'https://access.redhat.com/support',
    },
  },
} as const;
