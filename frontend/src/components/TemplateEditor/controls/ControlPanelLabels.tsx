/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import React, { Component } from 'react'
import { TextInput, Label } from '@patternfly/react-core'
import ControlPanelFormGroup from './ControlPanelFormGroup'
import keyBy from 'lodash/keyBy'
import { ControlPanelBaseProps, TemplateControl } from '../utils/types'

export const DNS_LABEL = '[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?'
export const PREFIX = `${DNS_LABEL}(?:\\.${DNS_LABEL})*/`
export const NAME_OR_VALUE = '[a-z0-9A-Z](?:[a-z0-9A-Z_.-]{0,61}[a-z0-9A-Z])?'
export const regex = new RegExp(`^((?:${PREFIX})?${NAME_OR_VALUE})=(${NAME_OR_VALUE})?$`)
export const KEY_CAPTURE_GROUP_INDEX = 1
export const VALUE_CAPTURE_GROUP_INDEX = 2

type Props = ControlPanelBaseProps & {
  handleChange: (control: TemplateControl) => void
}

type State = {
  value: string
  invalid?: boolean
}

export default class ControlPanelLabels extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      value: '',
    }
  }

  override render() {
    const { controlId, i18n, control, controlData } = this.props
    const { active = [], exception } = control as { active?: { key: string; value: string }[]; exception?: string }
    const formatted = active.map(({ key, value: v }) => `${key}=${v}`)
    const { value } = this.state
    const validated = exception ? 'error' : undefined
    return (
      <React.Fragment>
        <div className="creation-view-controls-labels">
          <ControlPanelFormGroup i18n={i18n} controlId={controlId} control={control} controlData={controlData}>
            <div className="creation-view-controls-labels-container">
              {formatted.length !== 0 && (
                <div className="creation-view-controls-labels-tag-container">
                  {formatted.map((label, inx) => {
                    return (
                      <Label key={label} onClose={this.handleDelete.bind(this, inx)}>
                        {label}
                      </Label>
                    )
                  })}
                </div>
              )}
              <div className="creation-view-controls-labels-edit-container">
                <TextInput
                  id={controlId}
                  placeholder={i18n('enter.add.label')}
                  validated={validated}
                  value={value}
                  onBlur={this.handleBlur.bind(this)}
                  onKeyDown={this.handleKeyDown.bind(this)}
                  onChange={this.onTextChange.bind(this)}
                  data-testid={`label-${controlId}`}
                />
              </div>
            </div>
          </ControlPanelFormGroup>
        </div>
      </React.Fragment>
    )
  }

  handleDelete(inx: number) {
    const { control, handleChange } = this.props
    const { active = [] } = control as { active?: { key: string; value: string }[] }
    active.splice(inx, 1)
    handleChange(control)
  }

  onTextChange(_event: unknown, value = '') {
    const { control, i18n } = this.props
    const { active = [] } = control as { active?: { key: string; value: string }[] }
    if (value.endsWith(',')) {
      this.createLabel()
    } else {
      let invalid = !regex.test(value)
      let invalidText = ''
      if (invalid) {
        invalidText = i18n('enter.add.label')
      } else {
        const match = regex.exec(value)
        const map = keyBy(active, 'key')
        if (match && map[match[KEY_CAPTURE_GROUP_INDEX] as string]) {
          invalid = true
          invalidText = i18n('enter.duplicate.key', [match[KEY_CAPTURE_GROUP_INDEX]])
        }
      }
      control.exception = invalidText
      this.setState({ value, invalid })
    }
  }

  handleKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        this.createLabel()
        break

      case 'Backspace':
        this.deleteLastLabel()
        break

      case 'Escape':
        this.cancelLabel()
        break
    }
  }

  handleBlur() {
    this.createLabel()
  }

  deleteLastLabel() {
    const { value } = this.state
    if (!value) {
      const { control, handleChange } = this.props
      const { active = [] } = control as { active?: { key: string; value: string }[] }
      const inx = active.length - 1
      if (inx >= 0) {
        active.splice(inx, 1)
        handleChange(control)
      }
    }
  }

  createLabel() {
    const { control, handleChange } = this.props
    const { active = [] } = control as { active?: { key: string; value: string }[] }
    const { value, invalid } = this.state
    if (value && !invalid) {
      const match = regex.exec(value)
      if (match) {
        active.push({
          key: match[KEY_CAPTURE_GROUP_INDEX] as string,
          value: (match[VALUE_CAPTURE_GROUP_INDEX] as string) || '',
        })
        control.active = active
        handleChange(control)
      }
    }
    this.cancelLabel()
  }

  cancelLabel() {
    const { control } = this.props
    control.exception = ''
    this.setState({ value: '', invalid: false })
  }
}
