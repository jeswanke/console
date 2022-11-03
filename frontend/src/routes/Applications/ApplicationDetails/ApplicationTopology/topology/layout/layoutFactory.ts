/* Copyright Contributors to the Open Cluster Management project */
import { Graph, Layout, LayoutFactory, ColaLayout, BreadthFirstLayout } from '@patternfly/react-topology'
import { TreeLayout } from './TreeLayout'

const defaultLayoutFactory: LayoutFactory = (type: string, graph: Graph): Layout | undefined => {
    switch (type) {
        case 'ColaNoForce':
            return new ColaLayout(graph, { layoutOnDrag: false })
        case 'TreeLayout':
            return new TreeLayout(graph, { layoutOnDrag: false })
        //   return new BreadthFirstLayout(graph)
        // const ff = new ColaLayout(graph, { layoutOnDrag: false })
        // ff.d3Cola.flowLayout('y', 60 * 1.2)
        // return ff
        // return new ColaLayout(graph, {
        //     //                animate: false,
        //     // boundingBox: {
        //     //     x1: 0,
        //     //     y1: 0,
        //     //     w: 1000,
        //     //     h: 1000,
        //     // },

        //     // do directed graph, top to bottom
        //     flow: { axis: 'y', minSeparation: 60 * 1.2 },

        //     // running in headless mode, we need to provide node size here
        //     nodeSpacing: () => {
        //         return 60 * 1.3
        //     },

        //     // unconstrIter: 10, // works on positioning nodes to making edge lengths ideal
        //     // userConstIter: 20, // works on flow constraints (lr(x axis)or tb(y axis))
        //     // allConstIter: 20, // works on overlap
        // })

        default:
            return undefined
    }
}

export default defaultLayoutFactory
