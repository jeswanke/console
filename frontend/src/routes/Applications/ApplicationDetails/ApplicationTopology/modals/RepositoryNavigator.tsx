/* Copyright Contributors to the Open Cluster Management project */

import type { FC } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bullseye, Icon, SearchInput, Spinner, TreeView, type TreeViewDataItem } from '@patternfly/react-core'
import { ExclamationCircleIcon, FileIcon, FolderIcon, FolderOpenIcon } from '@patternfly/react-icons'
import isEqual from 'lodash/isEqual'
import { useTranslation } from '~/lib/acm-i18next'
import { useSharedAtoms, useSharedValue } from '~/shared-atoms'
import type { GitBranchPathNode } from '~/resources'
import { useRepositoryFiles, type RepositorySourceState } from '~/resources/repositoryUtils'
import type { TopologyNode } from '../types'
import {
  buildRepositorySources,
  countGitBranchPathFiles,
  filterGitBranchPathNode,
  findRepositorySecretAccess,
  getGitPathBaseName,
  getRepositorySourceGroupId,
  getRepositorySourceGroupTitle,
  sortGitBranchPathNodes,
  type RepositoryNavigatorFileItem,
  type RepositorySource,
} from '../helpers/repositoryNavigatorHelpers'
import './ResourceNavigator.css'

export type { RepositoryNavigatorFileItem }

/** When the repository tree has fewer files than this, every folder is expanded by default. */
const AUTO_EXPAND_FILE_COUNT_THRESHOLD = 30

export type RepositoryNavigatorProps = {
  /** The repo (`git`/`chart`) topology node whose sources should be browsed */
  node: TopologyNode
  selectedItemId?: string
  onSelectItem: (item: RepositoryNavigatorFileItem) => void
  /** Called once, after every source has finished loading, if no file was found under any branch. */
  onNoFilesFound?: () => void
  /** Called whenever the aggregate loading state of every repository source changes. */
  onLoadingChange?: (isLoading: boolean) => void
  onErrorChange?: (hasError: boolean) => void
}

const errorIcon = (
  <Icon status="danger">
    <ExclamationCircleIcon aria-hidden />
  </Icon>
)

function buildFileTreeItem(
  repoURL: string,
  groupId: string,
  node: GitBranchPathNode,
  lookup: Map<string, RepositoryNavigatorFileItem>,
  expandAll: boolean,
  errorFileIds: Set<string>
): TreeViewDataItem {
  const id = `${groupId}::${node.path}`
  const name = getGitPathBaseName(node.path)
  if (node.type === 'file') {
    lookup.set(id, { id, path: node.path, url: node.url, repoURL })
    return { id, name, icon: errorFileIds.has(id) ? errorIcon : <FileIcon aria-hidden /> }
  }
  return {
    id,
    name,
    icon: <FolderIcon aria-hidden />,
    expandedIcon: <FolderOpenIcon aria-hidden />,
    defaultExpanded: expandAll,
    children: sortGitBranchPathNodes(node.children).map((child) =>
      buildFileTreeItem(repoURL, groupId, child, lookup, expandAll, errorFileIds)
    ),
  }
}

function buildSourceTreeItem(
  source: RepositorySource,
  state: RepositorySourceState | undefined,
  filterQuery: string,
  lookup: Map<string, RepositoryNavigatorFileItem>,
  expandAll: boolean,
  errorFileIds: Set<string>
): TreeViewDataItem | undefined {
  const groupId = getRepositorySourceGroupId(source)
  const groupTitle = getRepositorySourceGroupTitle(source)
  const groupName = <strong>{groupTitle}</strong>
  const matchesGroupTitle = !filterQuery || groupTitle.toLowerCase().includes(filterQuery)

  if (!state || state.status === 'loading') {
    if (filterQuery && !matchesGroupTitle) {
      return undefined
    }
    return { id: groupId, name: groupName, icon: <Spinner size="sm" aria-hidden /> }
  }
  if (state.status === 'error') {
    return { id: groupId, name: groupName, icon: errorIcon }
  }

  const rootNode = matchesGroupTitle ? state.node : filterGitBranchPathNode(state.node, filterQuery)
  if (filterQuery && !matchesGroupTitle && !rootNode) {
    return undefined
  }

  if (rootNode?.type !== 'tree') {
    if (rootNode?.type === 'file') {
      lookup.set(groupId, { id: groupId, path: rootNode.path, url: rootNode.url, repoURL: source.repoURL })
      return { id: groupId, name: groupName, icon: errorFileIds.has(groupId) ? errorIcon : <FileIcon aria-hidden /> }
    }
    return { id: groupId, name: groupName, icon: <FolderIcon aria-hidden />, children: [] }
  }

  return {
    id: groupId,
    name: groupName,
    icon: <FolderIcon aria-hidden />,
    expandedIcon: <FolderOpenIcon aria-hidden />,
    defaultExpanded: true,
    children: sortGitBranchPathNodes(rootNode.children).map((child) =>
      buildFileTreeItem(source.repoURL, groupId, child, lookup, expandAll, errorFileIds)
    ),
  }
}

function findTreeItemById(items: TreeViewDataItem[], id: string): TreeViewDataItem | undefined {
  for (const item of items) {
    if (item.id === id) {
      return item
    }
    if (item.children) {
      const found = findTreeItemById(item.children, id)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

/** Depth-first search for the first file (as opposed to folder) item in tree order. */
function findFirstFileItem(
  items: TreeViewDataItem[],
  lookup: Map<string, RepositoryNavigatorFileItem>
): RepositoryNavigatorFileItem | undefined {
  for (const item of items) {
    if (item.id && lookup.has(item.id)) {
      return lookup.get(item.id)
    }
    if (item.children) {
      const found = findFirstFileItem(item.children, lookup)
      if (found) {
        return found
      }
    }
  }
  return undefined
}

export const RepositoryNavigator: FC<RepositoryNavigatorProps> = ({
  node,
  selectedItemId,
  onSelectItem,
  onNoFilesFound,
  onLoadingChange,
  onErrorChange,
}) => {
  const { t } = useTranslation()
  const { secretsState } = useSharedAtoms()
  const secrets = useSharedValue(secretsState)
  const [searchValue, setSearchValue] = useState('')
  const sources = useMemo(() => buildRepositorySources(node), [node])
  const requests = useMemo(
    () => sources.map((source) => ({ ...source, ...findRepositorySecretAccess(source.repoURL, secrets) })),
    [sources, secrets]
  )
  const requestsRef = useRef(requests)
  if (!isEqual(requestsRef.current, requests)) requestsRef.current = requests
  const treeBySource = useRepositoryFiles(requestsRef.current)
  const errorFileIds = useMemo(
    () => new Set(node.specs.repositoryErrors?.flatMap((error) => (error.fileId ? [error.fileId] : []))),
    [node.specs.repositoryErrors]
  )

  // Decide whether to auto-expand every folder only once all sources have finished loading, so the
  // file count used for the threshold check reflects the complete repository tree.
  const allSourcesLoaded = sources.every((source) => {
    const state = treeBySource[getRepositorySourceGroupId(source)]
    return state && state.status !== 'loading'
  })
  const hasLoadError = Object.values(treeBySource).some((state) => state.status === 'error')
  const totalFileCount = useMemo(
    () =>
      sources.reduce((sum, source) => {
        const state = treeBySource[getRepositorySourceGroupId(source)]
        return state?.status === 'loaded' ? sum + countGitBranchPathFiles(state.node) : sum
      }, 0),
    [sources, treeBySource]
  )
  const expandAllFolders = allSourcesLoaded && totalFileCount > 0 && totalFileCount < AUTO_EXPAND_FILE_COUNT_THRESHOLD

  useEffect(() => {
    onLoadingChange?.(!allSourcesLoaded)
  }, [allSourcesLoaded, onLoadingChange])
  useEffect(() => {
    onErrorChange?.(hasLoadError)
  }, [hasLoadError, onErrorChange])

  const { treeData, itemLookup } = useMemo(() => {
    const lookup = new Map<string, RepositoryNavigatorFileItem>()
    const query = searchValue.trim().toLowerCase()
    const items = sources
      .map((source) =>
        buildSourceTreeItem(
          source,
          treeBySource[getRepositorySourceGroupId(source)],
          query,
          lookup,
          expandAllFolders,
          errorFileIds
        )
      )
      .filter((item): item is TreeViewDataItem => item !== undefined)
    return { treeData: items, itemLookup: lookup }
  }, [sources, treeBySource, searchValue, expandAllFolders, errorFileIds])

  const hasAutoSelectedRef = useRef(false)

  // Select the first file by default once every source has finished loading.
  useEffect(() => {
    if (hasAutoSelectedRef.current || selectedItemId) {
      return
    }
    const stillLoading = sources.some((source) => {
      const state = treeBySource[getRepositorySourceGroupId(source)]
      return !state || state.status === 'loading'
    })
    if (stillLoading) {
      return
    }
    const firstFile = findFirstFileItem(treeData, itemLookup)
    if (firstFile) {
      hasAutoSelectedRef.current = true
      onSelectItem(firstFile)
    } else if (!hasLoadError && totalFileCount === 0) {
      onNoFilesFound?.()
    }
  }, [
    sources,
    treeBySource,
    treeData,
    itemLookup,
    selectedItemId,
    onSelectItem,
    onNoFilesFound,
    hasLoadError,
    totalFileCount,
  ])

  const activeItems = useMemo<TreeViewDataItem[]>(() => {
    if (!selectedItemId) {
      return []
    }
    const found = findTreeItemById(treeData, selectedItemId)
    return found ? [found] : []
  }, [treeData, selectedItemId])

  const handleSelect = useCallback(
    (_event: React.MouseEvent, item: TreeViewDataItem) => {
      if (item.id && itemLookup.has(item.id)) {
        onSelectItem(itemLookup.get(item.id)!)
      }
    },
    [itemLookup, onSelectItem]
  )

  return (
    <div className="resource-navigator__container">
      <SearchInput
        placeholder={t('Search')}
        value={searchValue}
        onChange={(_event, value) => setSearchValue(value)}
        onClear={() => setSearchValue('')}
        style={{ marginBottom: 'var(--pf-t--global--spacer--sm)' }}
        aria-label={t('Search')}
      />
      <div className="resource-navigator__scroll">
        {allSourcesLoaded ? (
          <TreeView
            aria-label={t('Repository files')}
            className="resource-navigator"
            data={treeData}
            activeItems={activeItems}
            onSelect={handleSelect}
            hasGuides
            hasSelectableNodes
          />
        ) : (
          <Bullseye>
            <Spinner size="lg" aria-label={t('Loading')} />
          </Bullseye>
        )}
      </div>
    </div>
  )
}
