/* Copyright Contributors to the Open Cluster Management project */
import { Graph, Layout, LayoutFactory, ColaLayout } from '@patternfly/react-topology'
import { TreeLayout } from './TreeLayout'

const defaultLayoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
    switch (type) {
        case 'ColaNoForce':
            return new ColaLayout(graph, { layoutOnDrag: false })
        case 'TreeLayout':
            return new TreeLayout(graph, { layoutOnDrag: false })
        default:
            return undefined
    }
}

export default defaultLayoutFactory
