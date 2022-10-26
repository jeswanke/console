/* Copyright Contributors to the Open Cluster Management project */
import { Model, NodeModel, EdgeModel, NodeStatus } from '@patternfly/react-topology'
import HrefShape, { withHref } from '../components/HrefShape'
import { typeToShapesMap } from '../components/componentShapesMap'

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

const getNodeAppearance = (d: { type: string | number }) => {
    return {
        getCustomShape: () =>
            withHref(`#componentShape_${typeToShapesMap[d.type]?.shape || 'customresource'}`)(HrefShape),
    }
}

const getLayoutModel = (elements: { nodes: any[]; links: any[] }, layout: string): Model => {
    // create nodes from data
    const nodes: NodeModel[] = elements.nodes.map((d) => {
        const width = 50
        const height = 50
        d.appearance = getNodeAppearance(d)
        return {
            id: d.id,
            type: 'node',
            width,
            height,
            label: d.name,
            data: d,
            status: NodeStatus.success, //NodeStatus.danger //NodeStatus.warning//
        }
    })

    // create links from data
    const edges = elements.links.map(
        (d): EdgeModel => ({
            data: d,
            source: d.source,
            target: d.target,
            id: `${d.source}_${d.target}`,
            type: 'edge',
        })
    )

    // create topology model
    const model: Model = {
        graph: {
            id: 'graph',
            type: 'graph',
            layout,
        },
        nodes,
        edges,
    }

    return model
}

export default getLayoutModel
