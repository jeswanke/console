/* Copyright Contributors to the Open Cluster Management project */
import {
    EdgeModel,
    Model,
    NodeModel,
    NodeStatus,
} from '@patternfly/react-topology'

// id/type/visible/data/label/style
// width/height/x/y/labelPosition/shape/status/collapsed
// source/target (the actual BaseNodes)/edgeStyle/animationSpeed/bendpoints

const getLayoutModel = (elements: { nodes: any[]; links: any[] }, layout: string): Model => {
        // create nodes from data
        const nodes: NodeModel[] = elements.nodes.map((d) => {
            const width = 50 
            const height = 50
            return {
                id: d.id,
                type: 'node',
                width,
                height,
                label: d.name,
                data: d,
                status: NodeStatus.success//NodeStatus.danger //NodeStatus.warning//
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


export default getLayoutModel;

