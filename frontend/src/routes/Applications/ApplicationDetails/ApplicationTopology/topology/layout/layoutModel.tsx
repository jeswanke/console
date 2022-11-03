/* Copyright Contributors to the Open Cluster Management project */
import { Model, NodeModel, EdgeModel } from '@patternfly/react-topology'
import { getNodeStyle } from '../components/nodeStyle'
import { calculateNodeOffsets } from './TreeLayout'

const getLayoutModel = (elements: { nodes: any[]; links: any[] }): Model => {
    // create nodes from data
    const { nodeOffsetMap } = calculateNodeOffsets(elements)
    const nodes: NodeModel[] = elements.nodes.map((d) => {
        const data = getNodeStyle(d, nodeOffsetMap[d.id])
        return {
            id: d.id,
            type: 'node',
            data,
            width: data.width,
            height: data.height,
            label: data.label,
            status: data.status,
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
            layout: 'TreeLayout',
        },
        nodes,
        edges,
    }

    return model
}

export default getLayoutModel
