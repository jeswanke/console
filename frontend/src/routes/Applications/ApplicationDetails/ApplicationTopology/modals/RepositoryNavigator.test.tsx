/* Copyright Contributors to the Open Cluster Management project */

import { render, screen, waitFor } from '@testing-library/react'
import { axe } from 'jest-axe'
import { Octokit } from '@octokit/rest'
import type { GitBranchPathNode } from '~/resources'
import type { TopologyNode } from '../types'
import { RepositoryNavigator } from './RepositoryNavigator'

const mockGetGitBranchPathDetails = jest.fn()
const mockSecrets: never[] = []

jest.mock('@octokit/rest')

jest.mock('~/shared-atoms', () => ({
  useSharedAtoms: () => ({ secretsState: {} }),
  useSharedValue: () => mockSecrets,
}))

const repositoryNode = {
  id: 'repository-node',
  name: 'repository',
  namespace: 'default',
  type: 'git',
  specs: {
    resources: [{ repoURL: 'https://github.com/example/repository', path: 'apps', targetRevision: 'main' }],
  },
} as unknown as TopologyNode

const loadedTree: GitBranchPathNode = {
  type: 'tree',
  path: 'apps',
  children: [
    { type: 'file', path: 'apps/README.md', url: 'https://api.github.com/repos/example/repository/git/blobs/readme' },
  ],
}

describe('RepositoryNavigator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(Octokit).mockImplementation(
      () =>
        ({
          repos: { getBranch: jest.fn().mockResolvedValue({ data: { commit: { sha: 'commit-sha' } } }) },
          git: {
            getTree: async ({ owner, repo }: { owner: string; repo: string }) => {
              const root: GitBranchPathNode = await mockGetGitBranchPathDetails(`https://github.com/${owner}/${repo}`)
              const flatten = (node: GitBranchPathNode): { path: string; type: string; url?: string }[] =>
                node.type === 'file'
                  ? [{ path: node.path, type: 'blob', url: node.url }]
                  : [{ path: node.path, type: 'tree' }, ...node.children.flatMap(flatten)]
              return { data: { tree: flatten(root) } }
            },
          },
        }) as unknown as Octokit
    )
  })

  it('shows a spinner instead of the tree until all sources are loaded', () => {
    const onLoadingChange = jest.fn()
    mockGetGitBranchPathDetails.mockReturnValue(new Promise<GitBranchPathNode>(() => {}))

    render(<RepositoryNavigator node={repositoryNode} onSelectItem={jest.fn()} onLoadingChange={onLoadingChange} />)

    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.queryByLabelText('Repository files')).not.toBeInTheDocument()
    expect(onLoadingChange).toHaveBeenCalledWith(true)
  })

  it('shows the tree and reports loading complete after all sources resolve', async () => {
    const onSelectItem = jest.fn()
    const onLoadingChange = jest.fn()
    mockGetGitBranchPathDetails.mockResolvedValue(loadedTree)

    const { container } = render(
      <RepositoryNavigator node={repositoryNode} onSelectItem={onSelectItem} onLoadingChange={onLoadingChange} />
    )

    expect(await screen.findByLabelText('Repository files')).toBeInTheDocument()
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    await waitFor(() => expect(onLoadingChange).toHaveBeenLastCalledWith(false))
    await waitFor(() =>
      expect(onSelectItem).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'apps/README.md',
          url: 'https://api.github.com/repos/example/repository/git/blobs/readme',
          repoURL: 'https://github.com/example/repository',
        })
      )
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
