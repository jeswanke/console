/* Copyright Contributors to the Open Cluster Management project */
import React from 'react'
import { Tab, Tabs, TabTitleText } from '@patternfly/react-core'
import '@patternfly/react-styles/css/components/Topology/topology-components.css'
import { Topology } from './Topology'

import './TopologyDemo.css'

export const TopologyDemo: React.FC = () => {
    const [activeSecondaryKey, setActiveSecondaryKey] = React.useState<number>(0)

    const handleSecondaryTabClick = (_event: React.MouseEvent<HTMLElement, MouseEvent>, tabIndex: number) => {
        setActiveSecondaryKey(tabIndex)
    }

    return (
        <div className="pf-ri__topology-demo">
            <Tabs unmountOnExit activeKey={activeSecondaryKey} onSelect={handleSecondaryTabClick}>
                <Tab eventKey={0} title={<TabTitleText>Topology</TabTitleText>}>
                    <Topology />
                </Tab>
                <Tab eventKey={1} title={<TabTitleText>With Side Bar</TabTitleText>}>
                    <Topology />
                </Tab>
            </Tabs>
        </div>
    )
}
TopologyDemo.displayName = 'TopologyDemo'
