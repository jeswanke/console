/* Copyright Contributors to the Open Cluster Management project */
import { ComponentType, useMemo } from 'react'
import {
  ModelKind,
  withPanZoom,
  GraphComponent,
  GraphElement,
  ComponentFactory,
  withDragNode,
  withSelection,
  ConnectDropTarget,
  ConnectDragSource,
  ElementModel,
} from '@patternfly/react-topology'
const { t } = useTranslation()

import StyledNode from './StyledNode'
import StyledEdge from './StyledEdge'
import { IAcmTableAction } from '../../../../../../ui-components/AcmTable'
import { Cluster } from '../../../../../../resources'

const hasAnyAutomationTemplates = false

function testing(): IAcmTableAction<Cluster>[] {
  return [
    {
      id: 'upgradeClusters',
      title: t('managed.upgrade.plural'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
    ...(hasAnyAutomationTemplates
      ? [
          {
            id: 'selectChannels',
            title: t('managed.selectChannel.plural'),
            click: (managedClusters: Array<Cluster>) => {
              if (!managedClusters) return
            },
            variant: 'bulk-action',
          },
        ]
      : []),
    {
      id: 'selectChannels',
      title: t('managed.selectChannel.plural'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
  ]
}

const sdrgsed: IAcmTableAction<Cluster>[] = [
  {
    id: 'upgradeClusters',
    title: t('managed.upgrade.plural'),
    click: (managedClusters: Array<Cluster>) => {
      if (!managedClusters) return
    },
    variant: 'bulk-action',
  },
  ...(hasAnyAutomationTemplates
    ? [
        {
          id: 'selectChannels',
          title: t('managed.selectChannel.plural'),
          click: (managedClusters: Array<Cluster>) => {
            if (!managedClusters) return
          },
          variant: 'bulk-action',
        },
      ]
    : []),
  {
    id: 'selectChannels',
    title: t('managed.selectChannel.plural'),
    click: (managedClusters: Array<Cluster>) => {
      if (!managedClusters) return
    },
    variant: 'bulk-action',
  },
]
console.log(sdrgsed)

const sd: IAcmTableAction<Cluster>[] = () =>
  [
    {
      id: 'upgradeClusters',
      title: t('managed.upgrade.plural'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
    ...(hasAnyAutomationTemplates
      ? [
          {
            id: 'selectChannels',
            title: t('managed.selectChannel.plural'),
            click: (managedClusters: Array<Cluster>) => {
              if (!managedClusters) return
            },
            variant: 'bulk-action',
          },
        ]
      : []),
    {
      id: 'selectChannels',
      title: t('managed.selectChannel.plural'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
  ].filter(({ title }) => !title)
console.log(sd)
// eslint-disable-next-line react-hooks/rules-of-hooks
const tableActions = useMemo<IAcmTableAction<Cluster>[]>(
  () => [
    {
      id: 'upgradeClusters',
      title: t('managed.upgrade.plural'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
    {
      id: 'selectChannels',
      title: t('managed.selectChannel.plural'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
    { id: 'seperator-0', variant: 'action-seperator' },
    {
      id: 'updateAutomationTemplates',
      title: t('Update automation template'),
      click: (managedClusters: Array<Cluster>) => {
        if (!managedClusters) return
      },
      variant: 'bulk-action',
    },
    ...(hasAnyAutomationTemplates
      ? [
          {
            id: 'removeAutomationTemplates',
            title: t('Remove automation templates'),
            click: (managedClusters: Array<Cluster>) => {
              if (!managedClusters) return
            },
            variant: 'bulk-action',
          },
        ]
      : []),
    { id: 'seperator-1', variant: 'action-seperator' },
  ],
  [t]
)
console.log(tableActions)

const tstFunc = (par: any) => {
  console.log(par)
}

const fds = fu5nc(tstFunc, 4, 3)

// const defaultComponentFactory: ComponentFactory = (
//   kind: ModelKind
// ): ComponentType<{
//   element: GraphElement // & ElementModel
//   // sourceDragRef?: ConnectDragSource
//   // targetDragRef?: ConnectDragSource
// }> => {
//   switch (kind) {
//     case ModelKind.graph:
//       return withPanZoom()(GraphComponent)
//     case ModelKind.node:
//       return withDragNode()(withSelection()(StyledNode))
//     case ModelKind.edge:
//       return StyledEdge
//     default:
//       return undefined
//   }
//   return 33
// }
const defaultComponentFactory: ComponentFactory = (kind: ModelKind) =>
  // : ComponentType<{
  //   element: GraphElement // & ElementModel
  //   // sourceDragRef?: ConnectDragSource
  //   // targetDragRef?: ConnectDragSource
  // }>

  {
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

const que = () => {
  let sdfsd: undefined
  sdfsd = 'rge'
}

export const fu5nc = (ddd: number, ff: string, gg: number) => {
  console.log(ddd, ff, gg)
}

const arr = []

let dsfa = true
const eee = 'what'
dsfa = eee

arr.push({
  name: 'arg',
  title: 'Arg',
  alignment: 'right',
})
interface Test {
  prop?: {
    ltr: string
    ese: number
  }
}
interface Ting {
  prop?: {
    ltr: number
    wht: number
  }
}

export const fu7nc = (ddd: number, ff: Ting, gg: number) => {
  console.log(ddd, ff, gg)
}

const sdf: Ting = {}
fu7nc(33, 33, sdf)

let fffw: Test
fu7nc(44, fffw, 33)

let fffg: Ting
const fff: Test[] = [fffg]

const fffd: Test = [fffg]
console.log(fff)

let sdfe: number = 4
sdfe = undefined
let fffb: Ting
fffb!.prop!.ltr = 'asdfd'
fffb!.prop!.ltr = true
const sgrdddxf = '4232'
fffb!.prop!.ltr = Number(sgrdddxf)
fffb!.prop!.ltr = '345'
fffb!.prop!.ltr = 9007199254740991
fffb!.prop!.ltr = new Date()
fu5nc(66, { sdf: 'dasd', rewre: 'sdgag' }, fffb)
let ggtg: never
ggtg = 4

const dffs = null
console.log(dffs)

let ff55 = 'ddsgdsd'
ff55 = 5

const test = () => {
  let fffg: Ting
  const fff: Test = fffg
  console.log(fff)
  const ddd: Test = 44
  console.log(ddd)
  const sdf: string = String(55).toString()
  console.log(sdf)
  fu5nc(66, 44, { news: 'fsas' })
  const sd: number = fu6nc()
  console.log(sd)
}

export const fu6nc = (): Ting => {
  return 'sdsad'
}

export default defaultComponentFactory
