/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import React, { Component } from 'react'
import { Spinner, SelectOption } from '@patternfly/react-core'
import { AcmSelectBase, SelectVariant } from '../../AcmSelectBase'
import type { ComponentType } from 'react'
import ControlPanelFormGroup from './ControlPanelFormGroup'
import get from 'lodash/get'
import { ControlPanelBaseProps, TemplateControl } from '../utils/types'

const AcmSelectBaseAny = AcmSelectBase as ComponentType<Record<string, unknown>>

type Props = ControlPanelBaseProps & {
  handleChange: () => void
}

type State = {
  open: boolean
}

export default class ControlPanelMultiSelect extends Component<Props, State> {
  options: React.ReactElement[] = []

  constructor(props: Props) {
    super(props)
    this.state = {
      open: false,
    }
  }

  setControlRef = (control: TemplateControl, ref: HTMLDivElement | null) => {
    this.multiSelect = control.ref = ref
  }

  multiSelect: HTMLDivElement | null = null

  override render() {
    const { controlId, i18n, control, controlData, handleChange } = this.props
    const {
      available = [],
      availableMap,
      exception,
      disabled,
      isLoading,
      isFailed,
    } = control as {
      available?: string[]
      availableMap?: Record<string, { name?: string }>
      exception?: string
      disabled?: boolean
      isLoading?: boolean
      isFailed?: boolean
    }
    let { active, placeholder = '' } = control as { active?: string[] | string; placeholder?: string }
    if (!active) {
      if (isLoading) {
        active = get(control, 'fetchAvailable.loadingDesc', i18n('resource.loading')) as string
      } else if (isFailed) {
        active = i18n('resource.error')
      } else if (available.length === 0) {
        active = get(control, 'fetchAvailable.emptyDesc', i18n('resource.none')) as string
      } else {
        active = []
      }
    } else if (Array.isArray(active) && active.length > 0) {
      const activeKeys: string[] = []
      active.forEach((k) => {
        if (typeof availableMap === 'object' && availableMap[k]) {
          const { name: n } = availableMap[k]
          activeKeys.push(n || k)
        } else {
          activeKeys.push(k)
        }
      })
      placeholder = activeKeys.join(', ')
    }

    let selectionList: string[]
    let placeholderText = placeholder
    if (Array.isArray(active)) {
      selectionList = active
    } else if (typeof active === 'string') {
      placeholderText = placeholder || active
      selectionList = []
    } else {
      selectionList = []
    }

    const onChange = (value: string | undefined) => {
      let next: string[]
      if (Array.isArray(control.active)) {
        next = [...(control.active as string[])]
      } else {
        next = []
      }
      if (value) {
        if (next.includes(value)) {
          next = next.filter((item) => item !== value)
        } else {
          next = [...next, value]
        }
      } else {
        next = []
      }
      control.active = next
      handleChange()
    }

    this.options = (available || []).map((item, inx) => {
      return <SelectOption key={inx} value={item} />
    })

    const validated = exception ? 'error' : undefined
    const selections = selectionList
    return (
      <React.Fragment>
        <div className="creation-view-controls-singleselect" ref={this.setControlRef.bind(this, control)}>
          <ControlPanelFormGroup i18n={i18n} controlId={controlId} control={control} controlData={controlData}>
            {isLoading ? (
              <div className="creation-view-controls-singleselect-loading">
                <Spinner size="md" />
                <div>{active as React.ReactNode}</div>
              </div>
            ) : (
              <AcmSelectBaseAny
                ariaLabelledBy={`${controlId}-label`}
                variant={SelectVariant.typeaheadCheckbox}
                onSelect={(value: string | string[]) => {
                  const v = Array.isArray(value) ? value[0] : value
                  onChange(v as string | undefined)
                }}
                selections={selections}
                onClear={() => {
                  onChange(undefined)
                }}
                placeholderText={placeholderText}
                isDisabled={disabled}
                data-testid={`multi-${controlId}`}
              >
                {this.options}
              </AcmSelectBaseAny>
            )}
            {validated === 'error' ? (
              <div
                style={{
                  borderTop: '1.75px solid red',
                  paddingBottom: '6px',
                  maxWidth: '600px',
                }}
              ></div>
            ) : (
              <React.Fragment />
            )}
          </ControlPanelFormGroup>
        </div>
      </React.Fragment>
    )
  }
}
