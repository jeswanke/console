/* Copyright Contributors to the Open Cluster Management project */
import * as React from 'react'
import { action } from 'mobx'
import _ from 'lodash'
import {
    TopologyView,
    TopologySideBar,
    TopologyControlBar,
    createTopologyControlButtons,
    defaultControlButtonsOptions,
    EdgeModel,
    Model,
    ModelKind,
    NodeModel,
    Controller,
    Visualization,
    withPanZoom,
    GraphComponent,
    withDragNode,
    withContextMenu,
    ContextMenuItem,
    ContextSubMenuItem,
    ContextMenuSeparator,
    VisualizationSurface,
    SELECTION_EVENT,
    SelectionEventListener,
    withSelection,
    VisualizationProvider,
    useEventListener,
} from '@patternfly/react-topology'
import {
    ToolbarItem,
    Split,
    SplitItem,
    Dropdown,
    DropdownItem,
    DropdownToggle,
    DropdownPosition,
    Button,
    Tooltip,
} from '@patternfly/react-core'
import defaultLayoutFactory from './layouts/defaultLayoutFactory'
import data from './reasonable'
import GroupHull from './components/GroupHull'
import Group from './components/DefaultGroup'
import Node from './components/DefaultNode'
import Edge from './components/DefaultEdge'

import '@patternfly/patternfly/patternfly.css'
import '@patternfly/patternfly/patternfly-addons.css'

const contextMenuItem = (label: string, i: number): React.ReactElement => {
    if (label === '-') {
        return <ContextMenuSeparator key={`separator:${i.toString()}`} />
    }
    if (label.includes('->')) {
        const parent = label.slice(0, label.indexOf('->'))
        const children = label.slice(label.indexOf('->') + 2).split(',')

        return (
            <ContextSubMenuItem label={parent} key={parent}>
                {children.map((child, j) => contextMenuItem(child.trim(), j))}
            </ContextSubMenuItem>
        )
    }
    return (
        // eslint-disable-next-line no-alert
        <ContextMenuItem key={label} onClick={() => alert(`Selected: ${label}`)}>
            {label}
        </ContextMenuItem>
    )
}

const createContextMenuItems = (...labels: string[]): React.ReactElement[] => labels.map(contextMenuItem)

const defaultMenu = createContextMenuItems(
    'First',
    'Second',
    'Third',
    '-',
    'Fourth',
    'Sub Menu-> Child1, Child2, Child3, -, Child4'
)

const getModel = (layout: string): Model => {
    // create nodes from data
    const nodes: NodeModel[] = data.nodes.map((d) => {
        // randomize size somewhat
        const width = 50 + d.id.length + 40
        const height = 50 + d.id.length
        return {
            id: d.id,
            type: 'node',
            width,
            height,
            data: d,
        }
    })

    // create groups from data
    const groupNodes: NodeModel[] = _.map(
        _.groupBy(nodes, (n) => n.data.group),
        (v, k) => ({
            type: 'group-hull',
            id: k,
            group: true,
            children: v.map((n: NodeModel) => n.id),
            label: `group-${k}`,
            style: {
                padding: 10,
            },
        })
    )

    // create links from data
    const edges = data.links.map(
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
            id: 'g1',
            type: 'graph',
            layout,
        },
        nodes: [...nodes, ...groupNodes],
        edges,
    }

    return model
}

const getVisualization = (model: Model): Visualization => {
    const vis = new Visualization()

    vis.registerLayoutFactory(defaultLayoutFactory)
    vis.registerComponentFactory((kind, type) => {
        if (kind === ModelKind.graph) {
            return withPanZoom()(GraphComponent)
        }
        if (type === 'group-hull') {
            return withDragNode({ canCancel: false })(GroupHull)
        }
        if (type === 'group') {
            return withDragNode({ canCancel: false })(Group)
        }
        if (kind === ModelKind.node) {
            return withDragNode({ canCancel: false })(withSelection()(withContextMenu(() => defaultMenu)(Node)))
        }
        if (kind === ModelKind.edge) {
            return Edge
        }
    })
    vis.fromModel(model)

    return vis
}

interface TopologyViewComponentProps {
    vis: Controller
    useSidebar: boolean
}

const TopologyViewComponent: React.FC<TopologyViewComponentProps> = ({ vis, useSidebar }) => {
    const [selectedIds, setSelectedIds] = React.useState<string[]>()
    const [layoutDropdownOpen, setLayoutDropdownOpen] = React.useState(false)
    const [layout, setLayout] = React.useState('Force')

    useEventListener<SelectionEventListener>(SELECTION_EVENT, (ids) => {
        setSelectedIds(ids)
    })

    const topologySideBar = (
        <TopologySideBar show={_.size(selectedIds) > 0} onClose={() => setSelectedIds([])}>
            <div style={{ marginTop: 27, marginLeft: 20 }}>{_.head(selectedIds)}</div>
        </TopologySideBar>
    )

    const updateLayout = (newLayout: string) => {
        // FIXME reset followed by layout causes a flash of the reset prior to the layout
        vis.getGraph().reset()
        vis.getGraph().setLayout(newLayout)
        vis.getGraph().layout()
        setLayout(newLayout)
        setLayoutDropdownOpen(false)
    }

    const layoutDropdown = (
        <Split>
            <SplitItem>
                <label className="pf-u-display-inline-block pf-u-mr-md pf-u-mt-sm">Layout</label>
            </SplitItem>
            <SplitItem>
                <Dropdown
                    position={DropdownPosition.right}
                    toggle={
                        <DropdownToggle onToggle={() => setLayoutDropdownOpen(!layoutDropdownOpen)}>
                            {layout}
                        </DropdownToggle>
                    }
                    isOpen={layoutDropdownOpen}
                    dropdownItems={[
                        <DropdownItem key={1} onClick={() => updateLayout('Force')}>
                            Force
                        </DropdownItem>,
                        <DropdownItem key={2} onClick={() => updateLayout('Dagre')}>
                            Dagre
                        </DropdownItem>,
                        <DropdownItem key={3} onClick={() => updateLayout('Cola')}>
                            Cola
                        </DropdownItem>,
                        <DropdownItem key={3} onClick={() => updateLayout('ColaNoForce')}>
                            ColaNoForce
                        </DropdownItem>,
                    ]}
                />
            </SplitItem>
        </Split>
    )

    const viewToolbar = (
        <>
            <ToolbarItem>{layoutDropdown}</ToolbarItem>
            <ToolbarItem>
                <Tooltip content="Layout info saved" trigger="manual">
                    <Button variant="secondary" onClick={() => {}}>
                        Button
                    </Button>
                </Tooltip>
            </ToolbarItem>
        </>
    )

    return (
        <TopologyView
            controlBar={
                <TopologyControlBar
                    controlButtons={createTopologyControlButtons({
                        ...defaultControlButtonsOptions,
                        zoomInCallback: action(() => {
                            vis.getGraph().scaleBy(4 / 3)
                        }),
                        zoomOutCallback: action(() => {
                            vis.getGraph().scaleBy(0.75)
                        }),
                        fitToScreenCallback: action(() => {
                            vis.getGraph().fit(80)
                        }),
                        resetViewCallback: action(() => {
                            vis.getGraph().reset()
                            vis.getGraph().layout()
                        }),
                        legend: false,
                    })}
                />
            }
            viewToolbar={viewToolbar}
            sideBar={useSidebar && topologySideBar}
            sideBarOpen={useSidebar && _.size(selectedIds) > 0}
        >
            <VisualizationSurface state={{ selectedIds }} />
        </TopologyView>
    )
}

export const Topology = () => {
    const vis: Visualization = getVisualization(getModel('Force'))

    return (
        <VisualizationProvider controller={vis}>
            <TopologyViewComponent useSidebar={false} vis={vis} />
        </VisualizationProvider>
    )
}
