/** ACM Search routes and UI strings (stolostron/console `NavigationPath.search`). */

export const SEARCH_ROUTES = {
  page: '/multicloud/search',
} as const;

export const SEARCH_PAGE = {
  title: 'Search',
  searchInputAriaLabel: 'Search input',
  searchPlaceholder:
    'Search by keywords or filters, for example "label:environment=production my-cluster"',
  runSearchButtonId: 'run-search-button',
  savedSearchesDropdown: 'Saved searches',
  openNewSearchTab: 'Open new search tab',
  suggestedCardSectionHeader: 'Suggested search templates',
  workloadSuggestedCardHeader: 'Workloads',
} as const;
