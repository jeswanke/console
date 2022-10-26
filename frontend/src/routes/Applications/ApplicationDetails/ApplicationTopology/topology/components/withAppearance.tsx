/* Copyright Contributors to the Open Cluster Management project */
import * as React from 'react'
import { observer } from 'mobx-react'

import { ElementContext } from '@patternfly/react-topology'

export const useAppearance = (): any => {
    const element = React.useContext(ElementContext)
    return element.getData()?.appearance
}

export const withAppearance = () => (WrappedComponent: React.ComponentType) => {
    const Component: React.FunctionComponent = (props) => {
        const appearance = useAppearance()
        return <WrappedComponent {...(props as any)} {...appearance} />
    }
    Component.displayName = `withAppearance(${WrappedComponent.displayName || WrappedComponent.name})`
    return observer(Component)
}
