/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import React, { Component } from 'react'
import groupBy from 'lodash/groupBy'
import { Title, TitleSizes, Gallery, Stack } from '@patternfly/react-core'
import { Tile } from '@patternfly/react-core/deprecated'
import Tooltip from '../components/Tooltip'
import isEmpty from 'lodash/isEmpty'
import { ControlPanelCardsProps, TemplateControl } from '../utils/types'

type CardChoice = {
  id: string
  hidden?: boolean
  title: string
  tooltip?: React.ReactNode
  text?: React.ReactNode
  logo?: React.ReactNode
  section?: string
}

type State = {
  collapsed: boolean
  initialized?: boolean
}

export default class ControlPanelCards extends Component<ControlPanelCardsProps, State> {
  static getDerivedStateFromProps(props: ControlPanelCardsProps, state: State): Partial<State> | null {
    const { initialized } = state
    if (!initialized) {
      const { control } = props
      const { active, collapseCardsControlOnSelect } = control as {
        active?: unknown
        collapseCardsControlOnSelect?: boolean
      }
      return {
        collapsed: !!(collapseCardsControlOnSelect && !isEmpty(active)),
        initialized: true,
      }
    }
    return null
  }

  multiSelect: HTMLDivElement | null = null

  constructor(props: ControlPanelCardsProps) {
    super(props)
    const { control } = props
    const { active, collapsed, collapseCardsControlOnSelect } = control as {
      active?: unknown
      collapsed?: boolean
      collapseCardsControlOnSelect?: boolean
    }

    this.state = {
      collapsed: !!(collapsed || (collapseCardsControlOnSelect && !!active)),
    }
  }

  setControlRef = (control: TemplateControl, ref: HTMLDivElement | null) => {
    this.multiSelect = control.ref = ref
  }

  override componentDidMount() {
    const { control, fetchData, handleChange } = this.props
    const { active } = control as { active?: string | ((c: TemplateControl, fd?: Record<string, unknown>) => string) }
    if (typeof active === 'function') {
      const activeID = active(control, fetchData)
      if (activeID) {
        handleChange(activeID)
      }
    }
  }

  override render() {
    const { i18n, control } = this.props
    const { available = [], availableMap } = control as {
      available?: string[]
      availableMap?: Record<string, CardChoice>
    }
    const { collapsed } = this.state
    let { active } = control as { active?: string[] }
    active = active || []

    const availableCards = Object.keys(availableMap || {}).reduce<CardChoice[]>((acc, curr) => {
      if (available.includes(curr)) {
        acc.push(availableMap![curr])
      }
      return acc
    }, [])
    const cardGroups = groupBy(availableCards, (c) => c.section)
    const sectionTooltips = (control as { sectionTooltips?: Record<string, React.ReactNode> }).sectionTooltips
    return (
      <React.Fragment>
        <div className="creation-view-controls-card-container" ref={this.setControlRef.bind(this, control)}>
          <div>
            <div className={'tf--grid'}>
              <Stack hasGutter>
                {Object.keys(cardGroups).map((group) => {
                  const groupTooltip = group && sectionTooltips?.[group]
                  return (
                    <React.Fragment key={group}>
                      <Stack hasGutter>
                        {group !== 'undefined' && (
                          <Title headingLevel="h1" size={TitleSizes.xl}>
                            {group}
                            {groupTooltip && (
                              <Tooltip
                                control={{
                                  controlId: `group-${group}`,
                                  tooltip: groupTooltip,
                                }}
                                i18n={i18n}
                                className="control-panel-cards__group-tooltip"
                              />
                            )}
                          </Title>
                        )}
                        <Gallery hasGutter>
                          {cardGroups[group]
                            .filter((choice) => {
                              return active.length === 0 || !collapsed || active.includes(choice.id)
                            })
                            .map((choice) => {
                              const { id, hidden, title, tooltip, text, logo } = choice
                              return (
                                !hidden && (
                                  <Tile
                                    id={title.replaceAll(/\s+/g, '-').toLowerCase()}
                                    key={id}
                                    title={title}
                                    icon={logo}
                                    isSelected={active.includes && active.includes(id)}
                                    isStacked
                                    isDisplayLarge
                                    data-testid={`card-${id}`}
                                    onClick={this.handleChange.bind(this, id)}
                                  >
                                    {tooltip && (
                                      <div className="card-tooltip-container">
                                        <Tooltip control={{ tooltip }} />
                                      </div>
                                    )}
                                    {text && <div className="control-panel-cards__extra-text">{text}</div>}
                                  </Tile>
                                )
                              )
                            })}
                        </Gallery>
                      </Stack>
                    </React.Fragment>
                  )
                })}
              </Stack>
            </div>
          </div>
        </div>
      </React.Fragment>
    )
  }

  handleChange(id: string) {
    const { collapsed } = this.state
    const { control } = this.props
    const { collapseCardsControlOnSelect } = control as { collapseCardsControlOnSelect?: boolean }
    if (collapseCardsControlOnSelect) {
      this.setState((prevState) => {
        return { collapsed: !prevState.collapsed }
      })
    }
    this.props.handleChange(collapsed ? null : id)
  }
}
