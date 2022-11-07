/* Copyright Contributors to the Open Cluster Management project */
import * as React from 'react'
import {
    Decorator,
    DEFAULT_DECORATOR_RADIUS,
    DEFAULT_LAYER,
    DefaultNode,
    getDefaultShapeDecoratorCenter,
    Layer,
    Node,
    observer,
    ScaleDetailsLevel,
    ShapeProps,
    TOP_LAYER,
    TopologyQuadrant,
    useHover,
    WithContextMenuProps,
    WithCreateConnectorProps,
    WithDragNodeProps,
    WithSelectionProps,
} from '@patternfly/react-topology'

import useDetailsLevel from '@patternfly/react-topology/dist/esm/hooks/useDetailsLevel'

import { SVGIconProps } from '@patternfly/react-icons/dist/esm/createIcon'

type StyledNodeProps = {
    element: Node
    getCustomShape?: (node: Node) => React.FunctionComponent<ShapeProps>
    getShapeDecoratorCenter?: (quadrant: TopologyQuadrant, node: Node) => { x: number; y: number }
    showLabel?: boolean // Defaults to true
    labelIcon?: React.ComponentClass<SVGIconProps>
    showStatusDecorator?: boolean // Defaults to false
    regrouping?: boolean
    dragging?: boolean
} & WithContextMenuProps &
    WithCreateConnectorProps &
    WithDragNodeProps &
    WithSelectionProps

const StyledNode: React.FunctionComponent<StyledNodeProps> = ({
    element,
    onContextMenu,
    contextMenuOpen,
    showLabel,
    dragging,
    regrouping,
    onShowCreateConnector,
    onHideCreateConnector,
    ...rest
}) => {
    const data = element.getData()
    const detailsLevel = useDetailsLevel()
    const [hover, hoverRef] = useHover()

    const passedData = React.useMemo(() => {
        const newData = { ...data }
        Object.keys(newData).forEach((key) => {
            if (newData[key] === undefined) {
                delete newData[key]
            }
        })
        return newData
    }, [data])

    React.useEffect(() => {
        if (detailsLevel === ScaleDetailsLevel.low) {
            onHideCreateConnector && onHideCreateConnector()
        }
    }, [detailsLevel, onHideCreateConnector])

    const LabelIcon = passedData.labelIcon
    const { width, height } = element.getDimensions()
    return (
        <Layer id={hover ? TOP_LAYER : DEFAULT_LAYER}>
            <g ref={hoverRef}>
                <DefaultNode
                    element={element}
                    scaleLabel={detailsLevel !== ScaleDetailsLevel.high}
                    scaleNode={hover && detailsLevel === ScaleDetailsLevel.low}
                    {...rest}
                    {...passedData}
                    dragging={dragging}
                    regrouping={regrouping}
                    showLabel={hover || (detailsLevel === ScaleDetailsLevel.high && showLabel)}
                    showStatusBackground={!hover && detailsLevel === ScaleDetailsLevel.low}
                    showStatusDecorator={detailsLevel === ScaleDetailsLevel.high && passedData.showStatusDecorator}
                    onContextMenu={data.showContextMenu ? onContextMenu : undefined}
                    contextMenuOpen={contextMenuOpen}
                    onShowCreateConnector={detailsLevel !== ScaleDetailsLevel.low ? onShowCreateConnector : undefined}
                    onHideCreateConnector={onHideCreateConnector}
                    labelIcon={LabelIcon && <LabelIcon noVerticalAlign />}
                    attachments={renderDecorators(element, passedData, rest.getShapeDecoratorCenter)}
                >
                    <use href={`#nodeIcon_${data.shape}`} width={width} height={height} />
                </DefaultNode>
            </g>
        </Layer>
    )
}

const renderDecorators = (
    element: Node,
    data: {
        statusIcon?: { icon: string; classType: string; width: number; height: number }
        multipleResources?: any[]
    },
    getShapeDecoratorCenter?: (
        quadrant: TopologyQuadrant,
        node: Node
    ) => {
        x: number
        y: number
    }
): React.ReactNode => {
    const { statusIcon, multipleResources } = data
    return (
        <>
            {statusIcon &&
                renderStatusDecorator(element, TopologyQuadrant.upperLeft, statusIcon, getShapeDecoratorCenter)}
            {multipleResources &&
                renderCountDecorator(element, TopologyQuadrant.lowerRight, multipleResources, getShapeDecoratorCenter)}
        </>
    )
}

const renderStatusDecorator = (
    element: Node,
    quadrant: TopologyQuadrant,
    statusIcon: { icon: string; classType: string; width: number; height: number },
    getShapeDecoratorCenter?: (
        quadrant: TopologyQuadrant,
        node: Node,
        radius?: number
    ) => {
        x: number
        y: number
    }
): React.ReactNode => {
    const { x, y } = getShapeDecoratorCenter
        ? getShapeDecoratorCenter(quadrant, element)
        : getDefaultShapeDecoratorCenter(quadrant, element)
    const { icon, classType, width, height } = statusIcon
    const use = <use href={`#nodeStatusIcon_${icon}`} width={width} height={height} className={classType} />
    return <Decorator x={x} y={y} radius={DEFAULT_DECORATOR_RADIUS} showBackground icon={use} />
}

const renderCountDecorator = (
    element: Node,
    quadrant: TopologyQuadrant,
    multipleResources: any[],
    getShapeDecoratorCenter?: (
        quadrant: TopologyQuadrant,
        node: Node,
        radius?: number
    ) => {
        x: number
        y: number
    }
): React.ReactNode => {
    const { x, y } = getShapeDecoratorCenter
        ? getShapeDecoratorCenter(quadrant, element)
        : getDefaultShapeDecoratorCenter(quadrant, element)
    //const { icon, classType, width, height } = statusIcon
    const use = (
        <g>
            <use href={'#nodeIcon_multiplier'} width={16} height={16} className={'fff'} />
            <text text-anchor="middle">{multipleResources.length}</text>
        </g>
    )
    return <Decorator x={x} y={y} radius={DEFAULT_DECORATOR_RADIUS} showBackground icon={use} />
}

export default observer(StyledNode)

// className?: string;
// scaleNode?: boolean; // Whether or not to scale the node, best on hover of node at lowest scale level

// label?: string; // Defaults to element.getLabel()
// secondaryLabel?: string;
// showLabel?: boolean; // Defaults to true
// labelClassName?: string;
// scaleLabel?: boolean; // Whether or not to scale the label, best at lower scale levels
// labelPosition?: LabelPosition; // Defaults to element.getLabelPosition() right, bottom
// truncateLength?: number; // Defaults to 13
// labelIconClass?: string; // Icon to show in label
// labelIcon?: React.ReactNode;
// labelIconPadding?: number;

// badge?: string;
// badgeColor?: string;
// badgeTextColor?: string;
// badgeBorderColor?: string;
// badgeClassName?: string;
// badgeLocation?: BadgeLocation; inner/below

// attachments?: React.ReactNode; // ie. decorators

// showStatusBackground?: boolean;
// showStatusDecorator?: boolean;
// statusDecoratorTooltip?: React.ReactNode;
// onStatusDecoratorClick?: (event: React.MouseEvent<SVGGElement, MouseEvent>, element: GraphElement) => void;
// getShapeDecoratorCenter?: (quadrant: TopologyQuadrant, node: Node) => { x: number; y: number };

// getCustomShape?: (node: Node) => React.FunctionComponent<ShapeProps>;
