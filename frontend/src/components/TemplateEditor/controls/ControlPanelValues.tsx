/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import React, { Component } from 'react'
import { TextInput, Label } from '@patternfly/react-core'
import ControlPanelFormGroup from './ControlPanelFormGroup'
import { ControlPanelBaseProps, TemplateControl } from '../utils/types'

type Props = ControlPanelBaseProps & {
  handleChange: (control: TemplateControl) => void
}

type State = {
  value: string
  invalid?: boolean
}

export default class ControlPanelValues extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      value: '',
    }
  }

  override render() {
    const { controlId, control, controlData, i18n } = this.props
    const {
      active = [],
      exception,
      placeholder,
      disabled,
    } = control as {
      active?: string[]
      exception?: string
      placeholder?: string
      disabled?: boolean
    }
    const formatted = active.filter((v) => v.length > 0)
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
                  placeholder={placeholder || i18n('Enter value')}
                  validated={validated}
                  value={value}
                  isDisabled={disabled}
                  onBlur={this.handleBlur.bind(this)}
                  onKeyDown={this.handleKeyDown.bind(this)}
                  onChange={this.onTextChange.bind(this)}
                  data-testid={`value-${controlId}`}
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
    const { active = [] } = control as { active?: string[] }
    active.splice(inx, 1)
    handleChange(control)
  }

  onTextChange(_event: unknown, value = '') {
    const { control } = this.props
    const { validation } = control as { validation?: { tester: RegExp; notification: string } }
    if (value.endsWith(',')) {
      this.createValue()
    } else {
      let invalid = false
      if (validation) {
        invalid = !validation.tester.test(value)
        let invalidText = ''
        if (invalid) {
          invalidText = validation.notification
        }
        control.exception = invalidText
      }
      this.setState({ value, invalid })
    }
  }

  handleKeyDown(event: React.KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        this.createValue()
        break

      case 'Backspace':
        this.deleteLastValue()
        break

      case 'Escape':
        this.cancelValue()
        break
    }
  }

  handleBlur() {
    this.createValue()
  }

  deleteLastValue() {
    const { value } = this.state
    if (!value) {
      const { control, handleChange } = this.props
      const { active = [] } = control as { active?: string[] }
      const inx = active.length - 1
      if (inx >= 0) {
        active.splice(inx, 1)
        handleChange(control)
      }
    }
  }

  createValue() {
    const { control, handleChange } = this.props
    const { value, invalid } = this.state
    if (value && !invalid) {
      if (!Array.isArray(control.active)) {
        control.active = []
      }
      ;(control.active as string[]).push(value)
      handleChange(control)
    }
    this.cancelValue()
  }

  cancelValue() {
    const { control } = this.props
    control.exception = ''
    this.setState({ value: '', invalid: false })
  }
}
