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

import { Ting, fu7nc } from './fu7nc'

const sdf: Ting = {}
fu7nc('33', 33, sdf)

let ddd = ['dd']
const decorations: any[] = []
ddd = decorations.filter(({ options }) => {
  return (
    options.className.startsWith('squiggly-') ||
    (!!options?.glyphMarginClassName && (options?.inlineClassName !== 'protectedDecoration' || !hasErrors))
  )
})
console.log(ddd)
fu5nc(4, 5, 6, 7)

fu5nc(4, 'sdgfd', 6, 7)

fu5nc(4)

interface IResource {
  ww: number
  xx: string
}

const data: {
  ww: number
  datum: IResource
} = {
  ww: 0,
  datum: { ww: 0, xx: 'sdfa' },
}
const fkff: IResource = data
console.log(data, fkff)

interface Test {
  prop?: {
    ltr: string
    ese: number
  }
}

fffb!.prop!.ltr = '345'

interface ISomeObject {
  firstKey: string
  secondKey: string
  thirdKey: string
  key: string
  //numbertf: number
  //[key: number]: ISomeObject
}

//[key: string]: string;
const someObject: ISomeObject = {
  firstKey: 'firstValue',
  secondKey: 'secondValue',
  thirdKey: 'thirdValue',
  key: 'the-key',
  fourthKey: 2453,
}

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const key: string = 'secondKey'

const secondValue: string = someObject[9]

const qqq = {
  rr: 0,
  ff: 34,
}
qqq.ff.ww = 5
qqq.ff.tt.dd = 5

console.log(qqq)

const hasAnyAutomationTemplates = false
let sdrgsed: IAcmTableAction<Cluster>[]

sdrgsed = [
  {
    id: 'dsrgd',
    title: t('managed.upgrade.plural'),
    click: (managedClusters: Array<Cluster>) => {
      if (!managedClusters) return
    },
    variant: 'bulk-action',
  },

  ...(hasAnyAutomationTemplates
    ? [
        {
          id: 'sdfg',
          title: t('managed.selectChannel.plural'),
          click: (managedClusters: Array<Cluster>) => {
            if (!managedClusters) return
          },
          variant: 'bulk-action',
        },
      ]
    : [
        {
          id: 'jo',
          variant: 'bulk-action',
          title: 'sa',
          click: (managedClusters: Array<Cluster>) => {
            if (!managedClusters) return
          },
        },
      ]),
  {
    id: 'selectChannels',
    title: t('managed.selectChannel.plural'),
    click: (managedClusters: Array<Cluster>) => {
      if (!managedClusters) return
    },
    variant: 'bulk-action',
  },
]

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

const fffff = '3453'
let asfsa = true
asfsa = fffff
console.log(asfsa)

sdrgsed = []
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
const fdjs = fu5nc('sdfgs', 4, 3)

const defaultComponentFactory: ComponentFactory = (
  kind: ModelKind
): ComponentType<{
  element: GraphElement // & ElementModel
  // sourceDragRef?: ConnectDragSource
  // targetDragRef?: ConnectDragSource
}> => {
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
  const sd = 0
  sdfsd = 'rge'
}

export const fu5nc = (ff: string, ddd: (par: any) => void, gg?: number) => {
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

let fdfg = 'ffdd'
let fs = 4
const rrr = '44'
fs = 8
fdfg = fs
console.log(fdfg)
fs = rrr

let fffw: Test
fu7nc(44, fffw, 33)

let fffg: Ting
let fff: Test[] = [fffg]

const fffd: Test = [fffg]
fff = 34
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
