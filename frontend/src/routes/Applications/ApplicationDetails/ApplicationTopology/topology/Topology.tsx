/* Copyright Contributors to the Open Cluster Management project */
import React from 'react'
import { action } from 'mobx'
import size from 'lodash/size'
import {
    TopologyView,
    TopologySideBar,
    TopologyControlBar,
    createTopologyControlButtons,
    defaultControlButtonsOptions,
    VisualizationSurface,
    SELECTION_EVENT,
    SelectionEventListener,
    useEventListener,
    Controller,
    Visualization,
    VisualizationProvider,
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
import layoutFactory from './layout/layoutFactory'
import getLayoutModel from './layout/layoutModel'
import '@patternfly/patternfly/patternfly.css'
import '@patternfly/patternfly/patternfly-addons.css'
import componentFactory from './components/componentFactory'
import { StyledNodeIcons } from './components/StyledNodeIcons'

interface TopologyProps {
    elements: {
        nodes: any[]
        links: any[]
    }
    //    title?: string
    // diagramViewer: any
    // options?: any
    // searchName?: string
    // fetchControl?: {
    //     isLoaded: boolean | undefined
    //     isFailed: boolean | undefined
    //     isReloading: boolean | undefined
    // }
    // channelControl: {
    //     allChannels: [string] | undefined
    //     activeChannel: string | undefined
    //     changeTheChannel: (fetchChannel: string) => void
    // }
    // argoAppDetailsContainerControl: {
    //     argoAppDetailsContainerData: ArgoAppDetailsContainerData
    //     handleArgoAppDetailsContainerUpdate: React.Dispatch<React.SetStateAction<ArgoAppDetailsContainerData>>
    //     handleErrorMsg: () => void
    // }
    // canUpdateStatuses?: boolean
    // processActionLink?: (resource: any, toggleLoading: boolean) => void
    // searchUrl?: string
    // setDrawerContent?: (
    //     title: string,
    //     isInline: boolean,
    //     isResizable: boolean,
    //     disableDrawerHead: boolean,
    //     drawerPanelBodyHasNoPadding: boolean,
    //     panelContent: React.ReactNode | React.ReactNode[],
    //     closeDrawer: boolean
    // ) => void
    // t: (key: any) => string
} //: JSX.Element

interface TopologyViewComponentsProps {
    controller: Controller
    useSidebar: boolean
}

export const TopologyViewComponents: React.FC<TopologyViewComponentsProps> = ({ controller, useSidebar }) => {
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
        controller.getGraph().reset()
        controller.getGraph().setLayout(newLayout)
        controller.getGraph().layout()
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
                            controller.getGraph().scaleBy(4 / 3)
                        }),
                        zoomOutCallback: action(() => {
                            controller.getGraph().scaleBy(0.75)
                        }),
                        fitToScreenCallback: action(() => {
                            controller.getGraph().fit(80)
                        }),
                        resetViewCallback: action(() => {
                            controller.getGraph().reset()
                            controller.getGraph().layout()
                        }),
                        legend: false,
                    })}
                />
            }
            viewToolbar={viewToolbar}
            sideBar={useSidebar && topologySideBar}
            sideBarOpen={useSidebar && size(selectedIds) > 0}
        >
            <VisualizationSurface state={{ selectedIds }} />
        </TopologyView>
    )
}

export const Topology = (props: TopologyProps) => {
    const controllerRef = React.useRef<Controller>()
    let controller = controllerRef.current
    if (!controller) {
        controller = controllerRef.current = new Visualization()
        controller.registerLayoutFactory(layoutFactory)
        controller.registerComponentFactory(componentFactory)
    }
    controller.fromModel(getLayoutModel(props.elements, 'Force'))

    return (
        <VisualizationProvider controller={controller}>
            <StyledNodeIcons />
            <TopologyViewComponents controller={controller} useSidebar={false} />
        </VisualizationProvider>
    )
}
