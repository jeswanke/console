/* Copyright Contributors to the Open Cluster Management project */
import * as React from 'react'
import { css } from '@patternfly/react-styles'
import styles from '@patternfly/react-styles/css/components/Topology/topology-components'
import { useAnchor, EllipseAnchor, ShapeProps } from '@patternfly/react-topology'

type HrefShapeProps = ShapeProps & {
    href?: string
}

const HrefShape: React.FunctionComponent<HrefShapeProps> = ({
    className = css(styles.topologyNodeBackground),
    width,
    height,
    filter,
    dndDropRef,
    href,
}) => {
    useAnchor(EllipseAnchor)
    return (
        <>
            <ellipse
                className={className}
                ref={dndDropRef}
                cx={width / 2}
                cy={height / 2}
                rx={Math.max(0, width / 2 - 1)}
                ry={Math.max(0, height / 2 - 1)}
                filter={filter}
            />
            <use href={href} className={className} width={width} height={height} ref={dndDropRef} />
        </>
    )
}

export const withHref = (href: string) => (WrappedComponent: React.ComponentType) => {
    const Component: React.FunctionComponent = (props) => {
        return <WrappedComponent {...(props as any)} href={href} />
    }
    Component.displayName = `withHref(${WrappedComponent.displayName || WrappedComponent.name})`
    return Component
}

export default HrefShape
