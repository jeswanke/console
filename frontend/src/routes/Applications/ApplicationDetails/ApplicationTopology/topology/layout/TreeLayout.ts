import { Graph, ColaLayout, LayoutNode, NodeModel } from '@patternfly/react-topology'
import chunk from 'lodash/chunk'
import uniqBy from 'lodash/uniqBy'

export interface TreeLayoutFilter {
    name?: string
    type?: string
}
export interface TreeLayoutOptions {
    xSpacer: number
    ySpacer: number
    nodeWidth: number
    nodeHeight: number
    maxColumns?: number
    filter?: TreeLayoutFilter
}
interface LayoutNodeModel extends NodeModel {
    cycles: boolean
    incoming: LayoutNodeModel[]
    outgoing: LayoutNodeModel[]
}
interface NodeMapType {
    [key: string]: LayoutNodeModel
}
interface LinkMapType {
    [key: string]: any[]
}
interface RowType {
    row: LayoutNodeModel[]
    incomingRow?: RowType
    split?: boolean
}
interface ConnectedType {
    nodeMap: NodeMapType
    columns: number
    rows: RowType[]
    roots: LayoutNodeModel[]
    leaves: LayoutNodeModel[]
    width?: number
    height?: number
}
interface MetricsType {
    connected: ConnectedType[]
    unconnected: LayoutNodeModel[]
    sourceMap: LinkMapType
    targetMap: LinkMapType
    allNodeMap: NodeMapType
}

type NodeOffsetMapType = {
    [key: string]: { dx: number; dy: number }
}

class TreeLayout extends ColaLayout {
    protected initializeNodePositions(nodes: LayoutNode[], graph: Graph): void {
        const { width, height } = graph.getBounds()
        const cx = width / 2
        const cy = height / 2
        //        this.d3Cola.flowLayout('y', 70 * 1.2)

        nodes.forEach((node: LayoutNode) => {
            const { dx = 0, dy = 0 } = node.element.getData()
            node.setPosition(cx + dx, cy + dy)
        })
    }

    protected startColaLayout(/*initialRun: boolean, addingNodes: boolean*/): void {}
}

export function calculateNodeOffsets(elements: { nodes: any[]; links: any[] }, options: TreeLayoutOptions) {
    const nodeOffsetMap: NodeOffsetMapType = {}
    if (elements.nodes.length) {
        const metrics: MetricsType = groupNodesByConnections(elements)
        addRootsLeavesToConnectedGroups(metrics)
        sortConnectedGroupsIntoRows(metrics, options)
        addOffsetsToNodeMap(metrics, nodeOffsetMap, options)
    }
    return { nodeOffsetMap }
}

function groupNodesByConnections(elements: { nodes: any[]; links: any[] }) {
    /////////////// Create some collections:
    const allNodeMap: NodeMapType = {}
    const { nodes, links } = elements
    nodes.forEach((node) => {
        allNodeMap[node.id] = node
    })
    const sourceMap: LinkMapType = {}
    const targetMap: LinkMapType = {}
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
    const connected: ConnectedType[] = []
    // the remaining nodes
    const unconnected: any[] = []
    /////////////////////////// loop through the nodes adding to groups
    nodes.forEach((node) => {
        const { id } = node
        // if this node is connected to anything start a new group
        if (!connectedSet.has(id) && anyConnectedSet.has(id)) {
            const grp: ConnectedType = {
                nodeMap: {},
                columns: 1,
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
    grp: ConnectedType,
    directions: { map: any; next: any }[],
    connectedSet: Set<unknown>,
    allNodeMap: { [x: string]: any }
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
function addRootsLeavesToConnectedGroups(metrics: MetricsType) {
    const { connected, sourceMap, targetMap, allNodeMap } = metrics
    connected.forEach(({ nodeMap, roots, leaves }) => {
        Object.entries(nodeMap).forEach(([id, node]) => {
            node.incoming = uniqBy(
                (sourceMap[id] || []).map((link: { source: string | number }) => {
                    return allNodeMap[link.source]
                }),
                'id'
            )
            node.outgoing = uniqBy(
                (targetMap[id] || []).map((link: { target: string | number }) => {
                    return allNodeMap[link.target]
                }),
                'id'
            )
            if (node.incoming.length === 0) {
                roots.push(node)
            } else if (node.outgoing.length === 0) {
                leaves.push(node)
            }
        })
    })
}

/////////////////   Loop through each group creating rows (breadth first)
function sortConnectedGroupsIntoRows(metrics: MetricsType, options: TreeLayoutOptions) {
    const { connected } = metrics
    const { maxColumns = 16 } = options
    connected.forEach((group) => {
        const { nodeMap, roots, rows } = group
        let groupIds = Object.keys(nodeMap)
        let lastRow: RowType = { row: [...roots] }
        let unchunkedLastRow
        do {
            const newRow: RowType = {
                row: [],
                incomingRow: lastRow,
            }
            // add all incoming nodes from last row to this one
            const set = new Set()
            ;(unchunkedLastRow || lastRow.row).forEach(({ id, outgoing }) => {
                set.add(id)
                newRow.row = [...newRow.row, ...outgoing]
            })
            rows.push(lastRow)

            // if this row has >1 columns
            if (newRow.row.length > 1) {
                // split into nodes w/ and w/o outgoings
                // put those nodes in the center of bottom row
                const endsHere: LayoutNodeModel[] = []
                const continuesOn: LayoutNodeModel[] = []
                newRow.row.forEach((node) => {
                    if (node.outgoing.length) {
                        continuesOn.push(node)
                    } else {
                        endsHere.push(node)
                    }
                })

                // sort nodes in this row by type then name
                ;[endsHere, continuesOn].forEach((arr) => {
                    arr.sort((a, b) => {
                        const r = a.type.localeCompare(b.type)
                        if (r !== 0) {
                            return r
                        } else {
                            return (a?.label || '').localeCompare(b?.label || '')
                        }
                    })
                })

                // reinsert continuesOn in the middle
                let inx = endsHere.length / 2
                if (newRow.row.length > maxColumns) {
                    // if we're chunking it, what's the index of the middle of the last row
                    const lr = chunk(newRow.row, (maxColumns * 5) / 6).pop()
                    inx = lr ? endsHere.length - (lr.length - continuesOn.length) / 2 : inx
                    if (inx < 0) inx = endsHere.length
                }
                newRow.row = endsHere
                endsHere.splice(inx, 0, ...continuesOn)

                // chunk it for real this time
                if (newRow.row.length > maxColumns) {
                    unchunkedLastRow = newRow.row
                    const chunks = chunk(newRow.row, (maxColumns * 5) / 6)
                    chunks.forEach((chunk) => {
                        const chunkRow: RowType = {
                            row: chunk,
                            incomingRow: lastRow,
                            split: true,
                        }
                        if (chunk.length > group.columns) {
                            group.columns = newRow.row.length
                        }
                        rows.push(chunkRow)
                    })
                    lastRow = rows.pop() as RowType
                } else {
                    if (newRow.row.length > group.columns) {
                        group.columns = newRow.row.length
                    }
                    lastRow = newRow
                    unchunkedLastRow = undefined
                }
            } else {
                lastRow = newRow
            }

            // TODO find bridges between big groupings
            //   if this is a row of 1 node and that node has >1 outgoing and each has >1 outgoing
            //           and rows.length >3
            //           make a clone as the root of a new group and start over
            //            add secondary line between them

            groupIds = groupIds.filter((id) => !set.has(id))

            // if all nodes used but outgoings aren't emtpy, mark them cycles
            if (!groupIds.length) {
                newRow.row.forEach(({ outgoing }) => {
                    outgoing.forEach((node) => {
                        node.cycles = true
                    })
                })
            }
        } while (groupIds.length)
    })
}

///// assume center of group is at 0,0 then offset nodes from the center
function addOffsetsToNodeMap(metrics: MetricsType, nodeOffsetMap: NodeOffsetMapType, options: TreeLayoutOptions) {
    const { connected } = metrics
    const { xSpacer = 60, ySpacer = 60, nodeWidth = 65, nodeHeight = 65 } = options
    connected.forEach((group) => {
        const { rows, columns } = group
        group.height = rows.length * nodeHeight + (rows.length - 1) * ySpacer
        group.width = columns * nodeWidth + (columns - 1) * xSpacer
        let dy = -group.height / 2
        rows.forEach(({ row }) => {
            const rowWidth = row.length * nodeWidth + (row.length - 1) * xSpacer
            const left = -rowWidth / 2
            row.forEach(({ id, incoming }, inx) => {
                let dx = left + (nodeWidth + xSpacer) * inx
                // if this node has only one incoming, and that incoming only has this one outgoing, line up nodes
                if (incoming.length === 1) {
                    if (incoming[0].outgoing.length === 1) {
                        ;({ dx } = nodeOffsetMap[incoming[0].id])
                    }
                }
                nodeOffsetMap[id] = { dx, dy }
            })
            dy += nodeHeight + ySpacer
        })
    })
}

export { TreeLayout }

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
