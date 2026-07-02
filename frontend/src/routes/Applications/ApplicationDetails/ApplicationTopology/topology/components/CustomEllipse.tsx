/* Copyright Contributors to the Open Cluster Management project */
import { css } from '@patternfly/react-styles'
import styles from '@patternfly/react-topology/dist/esm/css/topology-components'
import * as React from 'react'
import { useAnchor, ShapeProps, EllipseAnchor } from '@patternfly/react-topology'
import CustomEllipseAnchor from './CustomEllipseAnchor'

const PULSE_DURATION = '3s'

type CustomEllipseProps = ShapeProps & {
  isMulti?: boolean
  shouldPulse?: boolean
}

const CustomEllipse: React.FunctionComponent<CustomEllipseProps> = ({
  className = css(styles.topologyNodeBackground),
  element,
  width,
  height,
  filter,
  dndDropRef,
  isMulti = false,
  shouldPulse = false,
}) => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore: Unreachable code error
  useAnchor(shouldPulse || !isMulti ? EllipseAnchor : CustomEllipseAnchor)

  const rx = Math.max(0, width / 2 - 1)
  const ry = Math.max(0, height / 2 - 1)
  const cx = width / 2
  const cy = height / 2

  if (shouldPulse) {
    const pulseStartRadius = Math.max(rx, ry)
    const pulseMaxRadius = Math.round((pulseStartRadius + Math.max(8, Math.round(pulseStartRadius * 0.5))) * 0.85)
    const glowId = `custom-ellipse-glow-${element.getId()}`
    return (
      <g>
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="yellow" />
            <stop offset="100%" stopColor="red" />
          </radialGradient>
        </defs>
        <circle cx={cx} cy={cy} r={pulseStartRadius} fill={`url(#${glowId})`} opacity={0.8}>
          <animate
            attributeName="r"
            values={`${pulseStartRadius};${pulseMaxRadius}`}
            dur={PULSE_DURATION}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            attributeType="CSS"
            values="0.8;0"
            dur={PULSE_DURATION}
            repeatCount="indefinite"
          />
        </circle>
        <ellipse className={className} ref={dndDropRef} cx={cx} cy={cy} rx={rx} ry={ry} filter={filter} />
      </g>
    )
  }

  if (!isMulti) {
    return <ellipse className={className} ref={dndDropRef} cx={cx} cy={cy} rx={rx} ry={ry} filter={filter} />
  }

  return (
    <g>
      <ellipse className={className} ref={dndDropRef} cx={width / 2 + 14} cy={cy} rx={rx} ry={ry} filter={filter} />
      <ellipse className={className} ref={dndDropRef} cx={width / 2 + 7} cy={cy} rx={rx} ry={ry} filter={filter} />
      <ellipse className={className} ref={dndDropRef} cx={cx} cy={cy} rx={rx} ry={ry} filter={filter} />
    </g>
  )
}

export default CustomEllipse
