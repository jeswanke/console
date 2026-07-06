/* Copyright Contributors to the Open Cluster Management project */

import { KeyboardEvent } from 'react'
import { ModalVariant } from '@patternfly/react-core/deprecated'
import { useTranslation } from '~/lib/acm-i18next'
import type { TopologyNode } from '~/routes/Applications/ApplicationDetails/ApplicationTopology/types'
import { AcmModal } from '~/ui-components'
import { LogsContainer } from './LogsContainer'
import type { ResourceAction } from '../types'

export interface ILogsModalProps {
  close: () => void
  open: boolean
  node: TopologyNode
  processActionLink?: (resource: ResourceAction, toggleLoading: () => void, hubClusterName: string) => void
  hubClusterName: string
}

export function LogsModal(props: ILogsModalProps | { open: false }) {
  if (props.open === false) {
    return null
  }

  return <LogsModalContent {...props} />
}

function LogsModalContent({ close, node, processActionLink, hubClusterName }: ILogsModalProps) {
  const { t } = useTranslation()

  const renderResourceURLLink = (resource: { data: ResourceAction }, isLogURL = false) => {
    const processLink = () => {
      if (processActionLink) {
        processActionLink(resource.data, () => {}, hubClusterName)
      }
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        processLink()
      }
    }

    return (
      <div>
        <div className="spacer" />
        <span
          className="link sectionLabel"
          id="linkForNodeAction"
          tabIndex={0}
          role="button"
          onClick={processLink}
          onKeyDown={handleKeyPress}
          style={{ padding: '10px' }}
        >
          {isLogURL && t('View logs in Search details')}
          {!isLogURL && t('View YAML in Search details')}
          <svg width="12px" height="12px" style={{ marginLeft: '8px', stroke: '#0066CC' }}>
            <use href="#drawerShapes_carbonLaunch" className="label-icon" />
          </svg>
        </span>
        <div className="spacer" />
      </div>
    )
  }

  return (
    <AcmModal
      id="view-logs-modal"
      isOpen={true}
      title={t('Logs')}
      aria-label={t('Logs')}
      showClose={true}
      onClose={close}
      variant={ModalVariant.large}
      position="top"
      hasNoBodyWrapper
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '70vh',
          overflow: 'auto',
          paddingTop: 'var(--pf-t--global--spacer--sm)',
          paddingLeft: 'var(--pf-t--global--spacer--lg)',
          paddingRight: 'var(--pf-t--global--spacer--lg)',
          paddingBottom: 'var(--pf-t--global--spacer--lg)',
        }}
      >
        <LogsContainer
          node={node}
          t={t}
          renderResourceURLLink={(data, _translate, isPod) => renderResourceURLLink(data, isPod)}
        />
      </div>
    </AcmModal>
  )
}
