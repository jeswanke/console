/* Copyright Contributors to the Open Cluster Management project */

import useResizeObserver from '@react-hook/resize-observer'
import { Flex, FlexItem, PageSection, Switch, Title } from '@patternfly/react-core'
import { Children, cloneElement, isValidElement, ReactElement, ReactNode, useCallback, useRef, useState } from 'react'
import { Step, Wizard, WizardProps } from '@patternfly-labs/react-form-wizard'
import { AcmErrorBoundary, AcmPage, AcmPageContent, AcmPageHeader } from '../ui-components'
import './WizardPage.css'
import { LostChangesMonitor, LostChangesPrompt } from '../components/LostChanges'

export type WizardPageProps = {
  breadcrumb?: { text: string; to?: string }[]
  yaml?: boolean
  yamlEditor?: () => ReactNode
  isLoading?: boolean
  isModal?: boolean
} & WizardProps

function getWizardYamlEditor() {
  return <></>
}

function getWizardSteps(children: ReactNode): ReactElement[] {
  return (
    Children.toArray(children).filter((child) => isValidElement(child) && child.type === Step) as ReactElement[]
  ).map((child, index) => {
    return index === 0
      ? cloneElement(child, {
          ...child.props,
          children: [<LostChangesMonitor key="lost-changes-monitor" />, ...Children.toArray(child.props.children)],
        })
      : child
  })
}

export function WizardPage(props: { id: string } & WizardPageProps) {
  const {
    breadcrumb,
    children,
    id,
    title,
    description,
    yaml,
    yamlEditor = getWizardYamlEditor,
    isModal = false,
  } = props

  const [drawerExpanded, setDrawerExpanded] = useState(yaml !== false && localStorage.getItem('yaml') === 'true')
  const [modalYamlExpanded, setModalYamlExpanded] = useState(false)
  const yamlExpanded = isModal ? modalYamlExpanded : drawerExpanded
  const toggleDrawerExpanded = useCallback(() => {
    if (isModal) {
      setModalYamlExpanded((expanded) => !expanded)
      return
    }
    setDrawerExpanded((drawerExpanded) => {
      localStorage.setItem('yaml', (!drawerExpanded).toString())
      return !drawerExpanded
    })
  }, [isModal])

  const wizardContainerRef = useRef<HTMLDivElement>(null)
  const [wizardHeight, setWizardHeight] = useState(600)

  useResizeObserver(wizardContainerRef, (entry) => {
    if (entry.contentRect.height > 0) {
      setWizardHeight(entry.contentRect.height)
    }
  })

  const wizardSteps = getWizardSteps(children)
  const wizard = (
    <>
      <LostChangesPrompt initialData={props.defaultData} />
      <Wizard
        {...props}
        showHeader={false}
        showYaml={yamlExpanded}
        yamlEditor={yamlEditor}
        height={isModal ? wizardHeight : undefined}
      >
        {wizardSteps}
      </Wizard>
    </>
  )

  if (isModal) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
        }}
      >
        <Flex
          style={{ flexShrink: 0, paddingBottom: 'var(--pf-t--global--spacer--md)' }}
          justifyContent={{ default: 'justifyContentSpaceBetween' }}
          alignItems={{ default: 'alignItemsCenter' }}
        >
          <FlexItem>
            <Title headingLevel="h1">{title}</Title>
          </FlexItem>
          {yaml !== false && (
            <FlexItem>
              <Switch id="yaml-switch" label="YAML" isChecked={yamlExpanded} onChange={() => toggleDrawerExpanded()} />
            </FlexItem>
          )}
        </Flex>
        <div ref={wizardContainerRef} style={{ flex: 1, minHeight: 0 }}>
          {wizard}
        </div>
      </div>
    )
  }

  return (
    <AcmPage
      header={
        <AcmPageHeader
          title={title}
          description={description}
          breadcrumb={breadcrumb}
          switches={
            yaml !== false && (
              <Switch id="yaml-switch" label="YAML" isChecked={yamlExpanded} onChange={() => toggleDrawerExpanded()} />
            )
          }
        />
      }
    >
      <AcmErrorBoundary>
        <AcmPageContent id={id}>
          <PageSection hasBodyWrapper={false} type="wizard" className="no-drawer-transition">
            {wizard}
          </PageSection>
        </AcmPageContent>
      </AcmErrorBoundary>
    </AcmPage>
  )
}
