// import * as webcola from 'webcola'
// import * as d3 from 'd3'
// import { action } from 'mobx'

import { Graph, ColaLayout, LayoutNode, NodeModel } from '@patternfly/react-topology'

class TreeLayout extends ColaLayout {
    protected initializeLayout(): void {
        super.initializeLayout()

        this.d3Cola.flowLayout('y', 60 * 1.2)
    }

    protected initializeNodePositions(nodes: LayoutNode[], graph: Graph): void {
        const { width, height } = graph.getBounds()
        const cx = width / 2
        const cy = height / 2

        nodes.forEach((node: LayoutNode, inx) => {
            const { dx = 0, dy = 0 } = node.element.getData()
            node.setPosition(cx + (inx === 0 ? dx : 0), cy + (inx === 0 ? dy : 0))
        })
    }

    // // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // protected getConstraints(nodes: ColaNode[], groups: ColaGroup[], edges: ColaLink[]): any[] {
    //     return []
    // }
    // protected createLayoutNode(node: Node, nodeDistance: number, index: number) {
    //     super.createLayoutNode()
    //     return new ColaNode(node, nodeDistance, index)
    // }
    // protected createLayoutLink(edge: Edge, source: LayoutNode, target: LayoutNode): LayoutLink {
    //     return new ColaLink(edge, source, target)
    // }
    // protected createLayoutGroup(node: Node, padding: number, index: number) {
    //     return new ColaGroup(node, padding, index)
    // }
    // protected getFauxEdges(): LayoutLink[] {
    //     return []
    // }
    // protected setupLayout(graph: Graph, nodes: LayoutNode[], edges: LayoutLink[], groups: LayoutGroup[]): void {
    //     const { width, height } = graph.getBounds()
    //     this.d3Cola.size([width, height])
    //     // Get any custom constraints
    //     this.d3Cola.constraints(this.getConstraints(nodes as ColaNode[], groups as ColaGroup[], edges))
    //     this.d3Cola.nodes(nodes)
    //     this.d3Cola.links(edges)
    //     this.d3Cola.groups(groups)
    // }
}

interface GroupType {
    nodeMap: { [key: string]: any[] }
    columns: number
    roots: any[]
    leaves: any[]
    rows: any[]
}

export function calculateNodeOffsets(elements: { nodes: any[]; links: any[] }) {
    const nodeOffsetMap = {}
    if (elements.nodes.length) {
        const metrics = groupNodesByConnections(elements)
        addRootsLeavesToConnectedGroups(metrics)
        sortConnectedGroupsIntoRows(metrics)
    }
    return { nodeOffsetMap }
}

function groupNodesByConnections(elements: { nodes: any[]; links: any[] }) {
    /////////////// Create some collections:
    const allNodeMap: { [key: string]: any } = {}
    const { nodes, links } = elements
    nodes.forEach((node) => {
        allNodeMap[node.id] = node
    })
    const sourceMap: { [key: string]: any[] } = {}
    const targetMap: { [key: string]: any[] } = {}
    const anyConnectedSet = new Set()
    links
        .filter((link) => {
            // filter out edges that don't connect to both a source and a target node
            return link.source && link.target && allNodeMap[link.source] && allNodeMap[link.target]
        })
        .forEach((link) => {
            // all sources of this target
            let sources = sourceMap[link.target]
            if (!sources) {
                sources = sourceMap[link.target] = []
            }
            sources.push({ source: link.source, link })
            // all targets of this source
            let targets = targetMap[link.source]
            if (!targets) {
                targets = targetMap[link.source] = []
            }
            targets.push({ target: link.target, link })
            // anything that's connected
            anyConnectedSet.add(link.source)
            anyConnectedSet.add(link.target)
        })
    const directions = [
        { map: sourceMap, next: 'source', other: 'target' },
        { map: targetMap, next: 'target', other: 'source' },
    ]
    const connectedSet = new Set()
    // connected will be filled with groups of connected nodes
    const connected: {
        nodeMap: {}
        roots: any[]
        leaves: any[]
        rows: any[]
    }[] = []
    // the remaining nodes
    const unconnected: any[] = []
    /////////////////////////// loop through the nodes adding to groups
    nodes.forEach((node) => {
        const { id } = node
        // if this node is connected to anything start a new group
        if (!connectedSet.has(id) && anyConnectedSet.has(id)) {
            const grp: GroupType = {
                nodeMap: {},
                columns: 0,
                roots: [],
                leaves: [],
                rows: [],
            }
            connected.push(grp)
            // then add everything connected to this node to this group
            gatherNodesByConnections(id, grp, directions, connectedSet, allNodeMap)
        } else if (!anyConnectedSet.has(id)) {
            // the rest are unconnected
            unconnected.push(node)
        }
    })
    return { connected, unconnected, sourceMap, targetMap, allNodeMap }
}

//////////////////////// reentrantly find all the nodes connected to that first node
function gatherNodesByConnections(
    id: string | number,
    grp: GroupType,
    directions: { map: any; next: any }[],
    connectedSet: Set<unknown>,
    allNodeMap: { [x: string]: any; [x: number]: any }
) {
    // already connected to another group??
    if (!connectedSet.has(id)) {
        connectedSet.add(id)

        // add this node to this group
        grp.nodeMap[id] = allNodeMap[id]

        // recurse up and down to get everything
        directions.forEach(({ map, next }) => {
            if (map[id]) {
                map[id].forEach((entry: { [x: string]: any; link?: any }) => {
                    const { link } = entry
                    const end = entry[next]
                    if (!connectedSet.has(end)) {
                        // reiterate until nothing else connected
                        gatherNodesByConnections(link[next], grp, directions, connectedSet, allNodeMap)
                    }
                })
            }
        })
    }
}

//////////////////////// Loop through connected groups adding roots and leaves
function addRootsLeavesToConnectedGroups(metrics: {
    connected: { [key: string]: any[] }[]
    sourceMap: any
    targetMap: any
    allNodeMap: { [key: string]: any }
}) {
    const { connected, sourceMap, targetMap, allNodeMap } = metrics
    connected.forEach(({ nodeMap, roots, leaves }) => {
        Object.entries(nodeMap).forEach(([id, node]) => {
            node.incoming = (sourceMap[id] || []).map((link: { source: string | number }) => {
                return allNodeMap[link.source]
            })
            node.outgoing = (targetMap[id] || []).map((link: { target: string | number }) => {
                return allNodeMap[link.target]
            })
            if (node.incoming.length === 0) {
                roots.push(node)
            } else if (node.outgoing.length === 0) {
                leaves.push(node)
            }
        })
    })
}
interface RowType {
    row: any[]
    incomingRow?: RowType
}

function sortConnectedGroupsIntoRows(metrics: {
    connected: GroupType[]
    sourceMap: any
    targetMap: any
    allNodeMap: { [key: string]: any }
}) {
    /////////////////   Loop through each group creating rows (breadth first)
    const { connected } = metrics
    connected.forEach((group) => {
        let depth = 0
        const { nodeMap, roots, rows } = group
        let groupIds = Object.keys(nodeMap)
        let lastRow: RowType = { row: [...roots] }
        do {
            const newRow: RowType = {
                row: [],
                incomingRow: lastRow,
            }
            // add all incoming nodes from last row to this one
            const set = new Set()
            lastRow.row.forEach(({ id, outgoing }) => {
                set.add(id)
                newRow.row = [...newRow.row, ...outgoing]
            })
            if (newRow.row.length > group.columns) {
                group.columns = newRow.row.length
            }
            rows.push(lastRow)
            lastRow = newRow
            groupIds = groupIds.filter((id) => !set.has(id))
            //   if (groupIds.length===0){
            //           // for every outgoing node in this row, set to be continued
            //   }
            //   if this is a row of 1 node and that node has >1 outgoing and each has >1 outgoing
            //           and depth >3
            //           make a clone as the root of a new group and start over
            depth++
        } while (groupIds.length)
    })
}

// ///////////////////// Loop through each group’s rows adding x,y
//       connected.forEach(group=>{
//               const {rows, columns}= group
//               //calc x,y based on #rows and #columns
//               rows.forEach(row, incomingRow=>{
//                       if incoming is one, sort this row by name
//                       else sort it by the position of its parent in the last row
//                       if > 10 nodes in this row, split into multiple rows on the half x
//                       position each node
//                       y+row height
//               })

//     })

export { TreeLayout }
