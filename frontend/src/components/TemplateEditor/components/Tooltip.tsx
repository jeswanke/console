/* Copyright Contributors to the Open Cluster Management project */

import React from 'react'
import { Popover } from '@patternfly/react-core'
import HelpIcon from '@patternfly/react-icons/dist/js/icons/help-icon'
import type { TemplateControl } from '../utils/types'

export interface TooltipProps {
  control: TemplateControl
  className?: string
  /** Accepted for API compatibility; i18n is resolved by parent controls */
  locale?: string
}

class Tooltip extends React.PureComponent<TooltipProps> {
  render() {
    const { control, className } = this.props
    const { controlId, tooltip } = control
    return tooltip ? (
      <Popover id={`${controlId}-label-help-popover`} bodyContent={tooltip}>
        <button
          id={`${controlId}-label-help-button`}
          aria-label="More info"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          className={`pf-v6-c-form__group-label-help ${className || ''}`}
        >
          <HelpIcon />
        </button>
      </Popover>
    ) : null
  }
}

export default Tooltip
