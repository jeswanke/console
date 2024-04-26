/* Copyright Contributors to the Open Cluster Management project */
import queryString from 'query-string'
import { TFunction } from 'react-i18next'
import { generatePath, useNavigate } from 'react-router-dom-v5-compat'
import { NavigationPath } from '../../../../NavigationPath'
import { ClosedDeleteModalProps, IDeleteModalProps } from '../components/Modals/DeleteResourceModal'
import { GetUrlSearchParam } from '../searchDefinitions'

export interface ISearchResult {
  kind: string
  apiversion: string
  apigroup?: string
  __type: string
}

export function GetRowActions(
  resourceKind: string,
  currentQuery: string,
  relatedResource: boolean,
  setDeleteResource: React.Dispatch<React.SetStateAction<IDeleteModalProps>>,
  t: TFunction
) {
  const navigate = useNavigate()

  const viewApplication = {
    id: 'view-application',
    title: t('View Application'),
    click: (item: any) => {
      const { apigroup, applicationSet, cluster, name, namespace, kind } = item
      if (apigroup === 'app.k8s.io' || apigroup === 'argoproj.io') {
        const params = queryString.stringify({
          apiVersion: `${kind}.${apigroup}`.toLowerCase(),
          cluster: cluster === 'local-cluster' ? undefined : cluster,
          applicationset: applicationSet ?? undefined,
        })
        return navigate(
          generatePath(NavigationPath.applicationOverview, {
            namespace,
            name,
          }) + `?${params}`,
          {
            state: {
              from: NavigationPath.search,
              fromSearch: window.location.search,
            },
          }
        )
      }
      const searchParams = GetUrlSearchParam(item)
      return navigate(NavigationPath.resourceRelated + searchParams, {
        state: {
          from: NavigationPath.search,
          fromSearch: window.location.search,
        },
      })
    },
  }
  const viewAppTopology = {
    id: 'view-application-topology',
    title: t('View Application topology'),
    click: (item: any) => {
      const apiversion = encodeURIComponent(`${item?.kind}.${item?.apigroup}`.toLowerCase())
      return navigate(
        generatePath(NavigationPath.applicationTopology, { name: item?.name, namespace: item?.namespace }) +
          `?apiVersion=${apiversion}`,
        {
          state: {
            from: NavigationPath.search,
            fromSearch: window.location.search,
          },
        }
      )
    },
  }
  const editButton = {
    id: 'edit',
    title: t('Edit {{resourceKind}}', { resourceKind }),
    click: (item: any) => {
      const searchParams = GetUrlSearchParam(item)
      return navigate(NavigationPath.resourceYAML + searchParams, {
        state: {
          from: NavigationPath.search,
          fromSearch: window.location.search,
        },
      })
    },
  }
  const viewRelatedButton = {
    id: 'view-related',
    title: t('View related resources'),
    click: (item: any) => {
      const searchParams = GetUrlSearchParam(item)
      return navigate(NavigationPath.resourceRelated + searchParams, {
        state: {
          from: NavigationPath.search,
          fromSearch: window.location.search,
        },
      })
    },
  }
  const deleteButton = {
    id: 'delete',
    title: t('Delete {{resourceKind}}', { resourceKind }),
    click: (item: any) => {
      setDeleteResource({
        open: true,
        close: () => setDeleteResource(ClosedDeleteModalProps),
        resource: item,
        currentQuery,
        relatedResource,
      })
    },
  }

  if (
    resourceKind.toLowerCase() === 'cluster' ||
    resourceKind.toLowerCase() === 'release' ||
    resourceKind.toLowerCase() === 'policyreport'
  ) {
    return []
  } else if (resourceKind.toLowerCase() === 'application') {
    return [viewApplication, viewAppTopology, editButton, viewRelatedButton, deleteButton]
  }
  return [editButton, viewRelatedButton, deleteButton]
}
