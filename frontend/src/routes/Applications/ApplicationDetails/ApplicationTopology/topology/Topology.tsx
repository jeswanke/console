/* Copyright Contributors to the Open Cluster Management project */
import React from 'react'
import { action } from 'mobx'
import size from 'lodash/size'
import head from 'lodash/head'
import { useTranslation } from '../../../../../lib/acm-i18next'
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
import { NodeIcons } from './components/nodeIcons'
import { NodeStatusIcons } from './components/nodeStatusIcons'
import { isAnythingWaiting } from './components/nodeStyle'

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
    const { t } = useTranslation()
    const [selectedIds, setSelectedIds] = React.useState<string[]>()

    useEventListener<SelectionEventListener>(SELECTION_EVENT, (ids) => {
        setSelectedIds(ids)
    })

    const topologySideBar = (
        <TopologySideBar show={size(selectedIds) > 0} onClose={() => setSelectedIds([])}>
            <div style={{ marginTop: 27, marginLeft: 20 }}>{head(selectedIds)}</div>
        </TopologySideBar>
    )

    const viewToolbar = (
        <>
            <ToolbarItem>
                <Tooltip content="Layout info saved" trigger="manual">
                    <Button variant="secondary" onClick={() => {}}>
                        Button
                    </Button>
                </Tooltip>
            </ToolbarItem>
            <ToolbarItem>
                <div className="diagram-title">
                    <span
                        className="how-to-read-text"
                        tabIndex={0}
                        onClick={
                            () => {}
                            // setDrawerContent(
                            //     t('How to read topology'),
                            //     false,
                            //     false,
                            //     false,
                            //     false,
                            //     <LegendView t={t} />,
                            //     false
                            // )
                        }
                        onKeyPress={() => {
                            // noop function
                        }}
                        role="button"
                    >
                        {t('How to read topology')}
                        <svg className="how-to-read-icon">
                            <use href={'#diagramIcons_sidecar'} />
                        </svg>
                    </span>
                </div>
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
            sideBarResizable
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
    controller.fromModel(getLayoutModel(props.elements))
    return (
        <VisualizationProvider controller={controller}>
            <NodeIcons />
            <NodeStatusIcons />
            {isAnythingWaiting(props.elements) && (
                <svg width="0" height="0">
                    <symbol className="spinner" viewBox="0 0 40 40" id="nodeStatusIcon_spinner">
                        <circle cx="20" cy="20" r="18" fill="white"></circle>
                        <circle className="swirly" cx="20" cy="20" r="18"></circle>
                    </symbol>
                </svg>
            )}
            <TopologyViewComponents controller={controller} useSidebar={true} />
        </VisualizationProvider>
    )
}
