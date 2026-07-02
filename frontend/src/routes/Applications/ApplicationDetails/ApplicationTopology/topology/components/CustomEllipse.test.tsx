/* Copyright Contributors to the Open Cluster Management project */

const mockUseAnchor = jest.fn()

jest.mock('@patternfly/react-topology', () => ({
  useAnchor: mockUseAnchor,
  EllipseAnchor: class MockEllipseAnchor {},
  AbstractAnchor: class MockAbstractAnchor {
    owner: unknown
    offset: number
    constructor(owner: unknown, offset = 0) {
      this.owner = owner
      this.offset = offset
    }
  },
  getEllipseAnchorPoint: jest.fn(),
  Point: class MockPoint {
    x: number
    y: number
    constructor(x: number, y: number) {
      this.x = x
      this.y = y
    }
  },
}))

jest.mock('@patternfly/react-styles', () => ({
  css: jest.fn((...args) => args.join(' ')),
}))

jest.mock('@patternfly/react-topology/dist/esm/css/topology-components', () => ({
  topologyNodeBackground: 'topology-node-background',
}))

import { render } from '@testing-library/react'
import { EllipseAnchor } from '@patternfly/react-topology'
import CustomEllipse from './CustomEllipse'
import CustomEllipseAnchor from './CustomEllipseAnchor'

const mockElement = { getId: () => 'mock-element' } as never

describe('CustomEllipse tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('calls useAnchor with EllipseAnchor when isMulti is false', () => {
    render(<CustomEllipse element={mockElement} width={100} height={80} />)
    expect(mockUseAnchor).toHaveBeenCalledWith(EllipseAnchor)
  })

  test('calls useAnchor with CustomEllipseAnchor when isMulti is true', () => {
    render(<CustomEllipse element={mockElement} width={100} height={80} isMulti />)
    expect(mockUseAnchor).toHaveBeenCalledWith(CustomEllipseAnchor)
  })

  test('renders a single ellipse when isMulti is false', () => {
    const { container } = render(<CustomEllipse element={mockElement} width={100} height={80} />)

    expect(container.querySelector('g')).not.toBeInTheDocument()
    expect(container.querySelectorAll('ellipse')).toHaveLength(1)
  })

  test('renders three ellipses in a group when isMulti is true', () => {
    const { container } = render(<CustomEllipse element={mockElement} width={100} height={80} isMulti />)

    const group = container.querySelector('g')
    expect(group).toBeInTheDocument()

    const ellipses = container.querySelectorAll('ellipse')
    expect(ellipses).toHaveLength(3)
  })

  test('calculates correct single ellipse position and dimensions', () => {
    const width = 100
    const height = 80

    const { container } = render(<CustomEllipse element={mockElement} width={width} height={height} />)
    const ellipse = container.querySelector('ellipse')

    expect(ellipse).toHaveAttribute('cx', String(width / 2))
    expect(ellipse).toHaveAttribute('cy', String(height / 2))
    expect(ellipse).toHaveAttribute('rx', String(Math.max(0, width / 2 - 1)))
    expect(ellipse).toHaveAttribute('ry', String(Math.max(0, height / 2 - 1)))
  })

  test('calculates correct multi ellipse positions and dimensions', () => {
    const width = 100
    const height = 80

    const { container } = render(<CustomEllipse element={mockElement} width={width} height={height} isMulti />)
    const ellipses = container.querySelectorAll('ellipse')

    expect(ellipses[0]).toHaveAttribute('cx', String(width / 2 + 14))
    expect(ellipses[0]).toHaveAttribute('cy', String(height / 2))
    expect(ellipses[0]).toHaveAttribute('rx', String(Math.max(0, width / 2 - 1)))
    expect(ellipses[0]).toHaveAttribute('ry', String(Math.max(0, height / 2 - 1)))

    expect(ellipses[1]).toHaveAttribute('cx', String(width / 2 + 7))
    expect(ellipses[1]).toHaveAttribute('cy', String(height / 2))
    expect(ellipses[1]).toHaveAttribute('rx', String(Math.max(0, width / 2 - 1)))
    expect(ellipses[1]).toHaveAttribute('ry', String(Math.max(0, height / 2 - 1)))

    expect(ellipses[2]).toHaveAttribute('cx', String(width / 2))
    expect(ellipses[2]).toHaveAttribute('cy', String(height / 2))
    expect(ellipses[2]).toHaveAttribute('rx', String(Math.max(0, width / 2 - 1)))
    expect(ellipses[2]).toHaveAttribute('ry', String(Math.max(0, height / 2 - 1)))
  })

  test('applies default className from PatternFly styles', () => {
    const { container } = render(<CustomEllipse element={mockElement} width={100} height={80} isMulti />)
    const ellipses = container.querySelectorAll('ellipse')

    ellipses.forEach((ellipse) => {
      expect(ellipse).toHaveAttribute('class', 'topology-node-background')
    })
  })

  test('applies custom className when provided', () => {
    const customClassName = 'custom-ellipse-class'
    const { container } = render(
      <CustomEllipse element={mockElement} width={100} height={80} className={customClassName} isMulti />
    )
    const ellipses = container.querySelectorAll('ellipse')

    ellipses.forEach((ellipse) => {
      expect(ellipse).toHaveAttribute('class', customClassName)
    })
  })

  test('applies filter when provided', () => {
    const filter = 'url(#shadow-filter)'
    const { container } = render(<CustomEllipse element={mockElement} width={100} height={80} filter={filter} isMulti />)
    const ellipses = container.querySelectorAll('ellipse')

    ellipses.forEach((ellipse) => {
      expect(ellipse).toHaveAttribute('filter', filter)
    })
  })

  test('handles small dimensions correctly with Math.max protection', () => {
    const { container } = render(<CustomEllipse element={mockElement} width={1} height={1} isMulti />)
    const ellipses = container.querySelectorAll('ellipse')

    ellipses.forEach((ellipse) => {
      expect(ellipse).toHaveAttribute('rx', '0')
      expect(ellipse).toHaveAttribute('ry', '0')
    })
  })

  test('handles zero dimensions', () => {
    const { container } = render(<CustomEllipse element={mockElement} width={0} height={0} isMulti />)
    const ellipses = container.querySelectorAll('ellipse')

    ellipses.forEach((ellipse) => {
      expect(ellipse).toHaveAttribute('cx')
      expect(ellipse).toHaveAttribute('cy', '0')
      expect(ellipse).toHaveAttribute('rx', '0')
      expect(ellipse).toHaveAttribute('ry', '0')
    })
  })

  test('applies dndDropRef to all ellipses when isMulti is true', () => {
    const mockRef = jest.fn()
    render(<CustomEllipse element={mockElement} width={100} height={80} dndDropRef={mockRef} isMulti />)

    expect(mockRef).toHaveBeenCalledTimes(3)
  })

  test('applies dndDropRef to single ellipse when isMulti is false', () => {
    const mockRef = jest.fn()
    render(<CustomEllipse element={mockElement} width={100} height={80} dndDropRef={mockRef} />)

    expect(mockRef).toHaveBeenCalledTimes(1)
  })

  test('calls useAnchor with EllipseAnchor when shouldPulse is true', () => {
    render(<CustomEllipse element={mockElement} width={100} height={80} isMulti shouldPulse />)
    expect(mockUseAnchor).toHaveBeenCalledWith(EllipseAnchor)
  })

  test('renders a single ellipse with pulsating gradient circle when shouldPulse is true', () => {
    const { container } = render(<CustomEllipse element={mockElement} width={100} height={80} isMulti shouldPulse />)

    expect(container.querySelectorAll('ellipse')).toHaveLength(1)
    expect(container.querySelectorAll('circle')).toHaveLength(1)
    expect(container.querySelector('radialGradient')).toBeInTheDocument()
    expect(container.querySelectorAll('animate')).toHaveLength(1)
  })

  test('renders pulsating gradient circle centered on the ellipse', () => {
    const width = 100
    const height = 80
    const pulseBaseRadius = Math.max(Math.max(0, width / 2 - 1), Math.max(0, height / 2 - 1))
    const pulseMaxRadius = pulseBaseRadius + Math.max(8, Math.round(pulseBaseRadius * 0.5))
    const { container } = render(
      <CustomEllipse element={{ getId: () => 'test-node' } as never} width={width} height={height} shouldPulse />
    )
    const circle = container.querySelector('circle')
    const animate = container.querySelector('animate')
    const gradientStops = container.querySelectorAll('stop')

    expect(circle).toHaveAttribute('cx', String(width / 2))
    expect(circle).toHaveAttribute('cy', String(height / 2))
    expect(circle).toHaveAttribute('r', String(pulseBaseRadius))
    expect(circle).toHaveAttribute('fill', 'url(#custom-ellipse-glow-test-node)')
    expect(animate).toHaveAttribute('attributeName', 'r')
    expect(animate).toHaveAttribute('values', `${pulseBaseRadius};${pulseMaxRadius};${pulseBaseRadius}`)
    expect(animate).toHaveAttribute('dur', '2s')
    expect(animate).toHaveAttribute('repeatCount', 'indefinite')
    expect(gradientStops[0]).toHaveAttribute('stop-color', 'yellow')
    expect(gradientStops[1]).toHaveAttribute('stop-color', 'orange')
  })
})
