/* Copyright Contributors to the Open Cluster Management project */
import { ComponentType } from 'react'
import {
  ModelKind,
  withPanZoom,
  GraphComponent,
  GraphElement,
  ComponentFactory,
  withDragNode,
  withSelection,
  ConnectDropTarget,
} from '@patternfly/react-topology'

import StyledNode from './StyledNode'
import StyledEdge from './StyledEdge'

const defaultComponentFactory: ComponentFactory = (kind: ModelKind): ComponentType<{ element: GraphElement }> => {
  switch (kind) {
    case ModelKind.graph:
      return withPanZoom()(GraphComponent)
    case ModelKind.node:
      return withDragNode()(withSelection()(StyledNode))
    case ModelKind.edge:
      return StyledEdge
    default:
      return undefined
  }
  return 33
}

const dffs = null
console.log(dffs)
interface test {
  prop?: {
    ese: number
  }
}
interface ting {
  prop?: {}
}

const test = () => {
  let fffg: ting
  const fff: test = fffg
  console.log(fff)
  const ddd: test = 44
  console.log(ddd)
  const sdf: string = 55
  console.log(sdf)
  fu5nc(66, { news: 'fsas' })
  const sd: number = fu6nc()
  console.log(sd)
}

export const fu5nc = (ff: string, gg: number) => {
  console.log(ff, gg)
}

export const fu6nc = (): ting => {
  return 'sdsad'
}

export default defaultComponentFactory
