/* Copyright Contributors to the Open Cluster Management project */
import { css } from '@patternfly/react-styles'
import styles from '@patternfly/react-styles/css/components/Topology/topology-components'
import * as React from 'react'
import { useAnchor, EllipseAnchor, ShapeProps } from '@patternfly/react-topology'

type MultiEllipseProps = ShapeProps

const MultiEllipse: React.FunctionComponent<MultiEllipseProps> = ({
    className = css(styles.topologyNodeBackground),
    width,
    height,
    filter,
    dndDropRef,
}) => {
    useAnchor(EllipseAnchor)
    return (
        <g>
            <ellipse
                className={className}
                ref={dndDropRef}
                cx={width / 2 + 10}
                cy={height / 2}
                rx={Math.max(0, width / 2 - 1)}
                ry={Math.max(0, height / 2 - 1)}
                filter={filter}
            />
            <ellipse
                className={className}
                ref={dndDropRef}
                cx={width / 2 + 5}
                cy={height / 2}
                rx={Math.max(0, width / 2 - 1)}
                ry={Math.max(0, height / 2 - 1)}
                filter={filter}
            />
            <ellipse
                className={className}
                ref={dndDropRef}
                cx={width / 2}
                cy={height / 2}
                rx={Math.max(0, width / 2 - 1)}
                ry={Math.max(0, height / 2 - 1)}
                filter={filter}
            />
        </g>
    )
}

export default MultiEllipse
