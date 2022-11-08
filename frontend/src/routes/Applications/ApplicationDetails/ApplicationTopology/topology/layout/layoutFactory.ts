/* Copyright Contributors to the Open Cluster Management project */
import { Graph, Layout, LayoutFactory, ColaLayout } from '@patternfly/react-topology'
import { NODE_WIDTH, NODE_HEIGHT, X_SPACER, Y_SPACER } from '../components/nodeStyle'
import { TreeLayout } from './TreeLayout'

const defaultLayoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
    switch (type) {
        case 'ColaNoForce':
            return new ColaLayout(graph, { layoutOnDrag: false })
        case 'TreeLayout':
            return new TreeLayout(graph, {
                xSpacer: X_SPACER,
                ySpacer: Y_SPACER,
                nodeWidth: NODE_WIDTH,
                nodeHeight: NODE_HEIGHT,
                layoutOnDrag: false,
            })
        default:
            return undefined
    }
}

export default defaultLayoutFactory
