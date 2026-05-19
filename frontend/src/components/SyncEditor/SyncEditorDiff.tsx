/* Copyright Contributors to the Open Cluster Management project */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type RefObject,
} from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import { editor as editorTypes } from 'monaco-editor'
import { cloneDeep, unset } from 'lodash'
import { DiffEditor, Monaco } from '@monaco-editor/react'
import { stringify } from './process'
import { defineThemes, getTheme, mountTheme } from '../theme'
import { ChangeHandler } from 'react-monaco-editor'

export interface SyncEditorDiffHandle {
  previous: () => void
  next: () => void
  /** When the diff view is mounted, the diff editor instance (e.g. Find). */
  getDiffEditor: () => editorTypes.IStandaloneDiffEditor | null
  /** When the diff view is mounted, the modified-side editor (for copy/selection). */
  getModifiedEditor: () => editorTypes.IStandaloneCodeEditor | null
  /** When the diff view is mounted, the Monaco API instance used by the diff editor. */
  getDiffEditorMonaco: () => Monaco | null
}

export interface SyncEditorDiffProps {
  showChanges: boolean
  /** Ref holding compare baseline resources (left diff pane); updated by parent. */
  baselineResources: MutableRefObject<unknown>
  /** Bumps when `baselineResources` content changes so diff effects re-run. */
  baselineSyncKey: number
  resources: unknown
  mock?: boolean
  /** When true, external resource updates must not reset diff models (see blur to flush). */
  diffEditorHasFocus: boolean
  /** Notifies parent when either diff pane gains or loses text focus. */
  onDiffEditorFocusChange: (focused: boolean) => void
  /** Observed for layout when the editor page resizes. */
  resizeRootRef: RefObject<HTMLDivElement>
  /** Called when the modified (editable) side of the diff changes. */
  onChange?: ChangeHandler
  /** Invoked after a diff editor is created and again right before it is disposed (parent can re-run form sync). */
  onDiffEditorInstanceChange?: () => void
  /** Invoked when diff editor/monaco refs are set or cleared so the parent can update active editor instances. */
  onActiveInstancesChange?: () => void
}

const TOOLBAR_IDS_SKIP_DIFF_BLUR = [
  'undo-button',
  'redo-button',
  'compare-changes-button',
  'diff-prev-button',
  'diff-next-button',
] as const

const DIFF_EDITOR_OPTIONS: editorTypes.IDiffEditorConstructionOptions = {
  renderSideBySide: false,
  originalEditable: false,
  automaticLayout: false,
  scrollBeyondLastLine: true,
  cursorSmoothCaretAnimation: true,
  minimap: { enabled: false },
  quickSuggestions: false,
  lightbulb: { enabled: false },
}

function getDiffYamlContent(baseline: unknown, resources: unknown): { originalYaml: string; modifiedYaml: string } {
  const baselineArr = Array.isArray(baseline) ? baseline : [baseline]
  const resourcesArr = Array.isArray(resources) ? resources : [resources]
  const filteredOriginal = filterfy(baselineArr)
  const filteredCurrent = filterfy(resourcesArr)
  return {
    originalYaml: stringify(filteredOriginal),
    modifiedYaml: stringify(filteredCurrent),
  }
}

export const SyncEditorDiff = forwardRef<SyncEditorDiffHandle, SyncEditorDiffProps>(function SyncEditorDiff(
  {
    showChanges,
    baselineResources,
    baselineSyncKey,
    resources,
    mock,
    diffEditorHasFocus,
    onDiffEditorFocusChange,
    resizeRootRef,
    onChange,
    onDiffEditorInstanceChange,
    onActiveInstancesChange,
  },
  ref
) {
  const diffContainerRef = useRef<HTMLDivElement>(null)
  const diffEditorRef = useRef<editorTypes.IStandaloneDiffEditor | null>(null)
  const diffMonacoRef = useRef<Monaco | null>(null)
  const diffNavigatorRef = useRef<editorTypes.IDiffNavigator | null>(null)
  const mountDisposablesRef = useRef<{ dispose: () => void }[]>([])
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onDiffEditorFocusChangeRef = useRef(onDiffEditorFocusChange)
  onDiffEditorFocusChangeRef.current = onDiffEditorFocusChange
  const onDiffEditorInstanceChangeRef = useRef(onDiffEditorInstanceChange)
  onDiffEditorInstanceChangeRef.current = onDiffEditorInstanceChange
  const onActiveInstancesChangeRef = useRef(onActiveInstancesChange)
  onActiveInstancesChangeRef.current = onActiveInstancesChange

  const hasBaseline = baselineSyncKey > 0 && baselineResources.current !== undefined
  const showDiffView = showChanges && hasBaseline && !mock

  const resourcesContentKey = useMemo(
    () => JSON.stringify(resources) + '\n---\n' + baselineSyncKey,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(resources), baselineSyncKey]
  )

  const [displayedOriginal, setDisplayedOriginal] = useState('')
  const [displayedModified, setDisplayedModified] = useState('')

  useImperativeHandle(
    ref,
    () => ({
      previous: () => {
        diffNavigatorRef.current?.previous()
        requestAnimationFrame(() => {
          diffEditorRef.current?.focus()
        })
      },
      next: () => {
        diffNavigatorRef.current?.next()
        requestAnimationFrame(() => {
          diffEditorRef.current?.focus()
        })
      },
      getDiffEditor: () => diffEditorRef.current,
      getModifiedEditor: () => diffEditorRef.current?.getModifiedEditor() ?? null,
      getDiffEditorMonaco: () => diffMonacoRef.current,
    }),
    []
  )

  // Push resource changes into diff props when the user is not typing in the diff.
  useEffect(() => {
    if (!showDiffView) {
      setDisplayedOriginal('')
      setDisplayedModified('')
      return
    }
    if (diffEditorHasFocus) {
      return
    }
    const { originalYaml, modifiedYaml } = getDiffYamlContent(baselineResources.current, resources)
    setDisplayedOriginal(originalYaml)
    setDisplayedModified(modifiedYaml)
  }, [showDiffView, diffEditorHasFocus, resourcesContentKey]) // eslint-disable-line react-hooks/exhaustive-deps -- resourcesContentKey tracks deep resource changes

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    defineThemes(monaco.editor)
    mountTheme('se')
  }, [])

  const handleDiffMount = useCallback((diffEditor: editorTypes.IStandaloneDiffEditor, monaco: Monaco) => {
    mountDisposablesRef.current.forEach((d) => d.dispose())
    mountDisposablesRef.current = []

    diffEditorRef.current = diffEditor
    diffMonacoRef.current = monaco
    onActiveInstancesChangeRef.current?.()
    monaco.editor.setTheme(getTheme())

    const originalEditor = diffEditor.getOriginalEditor()
    const modifiedEditor = diffEditor.getModifiedEditor()

    const notifyBlurIfReallyLeft = () => {
      requestAnimationFrame(() => {
        const de = diffEditorRef.current
        if (!de) return
        if (de.getOriginalEditor().hasTextFocus() || de.getModifiedEditor().hasTextFocus()) {
          return
        }
        const activeId = document.activeElement?.id as string
        if (TOOLBAR_IDS_SKIP_DIFF_BLUR.indexOf(activeId as (typeof TOOLBAR_IDS_SKIP_DIFF_BLUR)[number]) !== -1) {
          return
        }
        onDiffEditorFocusChangeRef.current(false)
      })
    }

    mountDisposablesRef.current = [
      originalEditor.onDidFocusEditorWidget(() => onDiffEditorFocusChangeRef.current(true)),
      originalEditor.onDidBlurEditorWidget(notifyBlurIfReallyLeft),
      modifiedEditor.onDidFocusEditorWidget(() => onDiffEditorFocusChangeRef.current(true)),
      modifiedEditor.onDidBlurEditorWidget(notifyBlurIfReallyLeft),
      modifiedEditor.onDidChangeModelContent((event) => {
        onChangeRef.current?.(modifiedEditor.getValue(), event)
      }),
    ]

    const container = diffContainerRef.current
    const onContainerMouseDown = () => {
      const focusedEl = document.querySelector('.monaco-editor.focused')
      if (focusedEl && diffContainerRef.current?.contains(focusedEl)) {
        onDiffEditorFocusChangeRef.current(true)
      }
    }
    if (container) {
      container.addEventListener('mousedown', onContainerMouseDown)
      mountDisposablesRef.current.push({
        dispose: () => container.removeEventListener('mousedown', onContainerMouseDown),
      })
    }

    diffNavigatorRef.current?.dispose()
    diffNavigatorRef.current = monaco.editor.createDiffNavigator(diffEditor, {
      followsCaret: true,
      ignoreCharChanges: true,
    })

    const layoutDiff = () => {
      if (!diffContainerRef.current || !diffEditorRef.current) return
      const { width, height } = diffContainerRef.current.getBoundingClientRect()
      if (width > 0 && height > 0) {
        diffEditorRef.current.layout({ width, height })
      }
    }
    requestAnimationFrame(layoutDiff)

    onDiffEditorInstanceChangeRef.current?.()
  }, [])

  useEffect(() => {
    return () => {
      mountDisposablesRef.current.forEach((d) => d.dispose())
      mountDisposablesRef.current = []
      diffNavigatorRef.current?.dispose()
      diffNavigatorRef.current = null
      const hadEditor = diffEditorRef.current != null
      diffEditorRef.current = null
      diffMonacoRef.current = null
      onActiveInstancesChangeRef.current?.()
      if (hadEditor) {
        onDiffEditorInstanceChangeRef.current?.()
      }
      onDiffEditorFocusChangeRef.current(false)
    }
  }, [showDiffView])

  useResizeObserver(resizeRootRef, () => {
    if (!diffEditorRef.current || !diffContainerRef.current) return
    const { width, height } = diffContainerRef.current.getBoundingClientRect()
    if (width > 0 && height > 0) {
      diffEditorRef.current.layout({ width, height })
    }
  })

  if (!showDiffView) {
    return null
  }

  return (
    <div ref={diffContainerRef} className="sync-editor__diff-host">
      <DiffEditor
        height="100%"
        width="100%"
        original={displayedOriginal}
        modified={displayedModified}
        language="yaml"
        theme={getTheme()}
        options={DIFF_EDITOR_OPTIONS}
        beforeMount={handleBeforeMount}
        onMount={handleDiffMount}
      />
    </div>
  )
})

/**
 * Align `currentBaseline` with `current` resources: deep-clone, strip empty placeholders on the baseline side
 * (same lockstep logic as the former `filterfy`), then store the baseline branch in `currentBaseline`.
 */
export function normalizeBaseline(
  original: unknown,
  current: unknown,
  lastBaseline: MutableRefObject<unknown>,
  currentBaseline: MutableRefObject<unknown>
): void {
  lastBaseline.current = cloneDeep(currentBaseline.current)
  let origSeed = original
  if (origSeed === undefined || origSeed === null) {
    origSeed = cloneDeep(current)
  }
  const origArr = Array.isArray(origSeed) ? origSeed : [origSeed]
  const currentIsArray = Array.isArray(current)
  const currArr = currentIsArray ? current : current != null ? [current] : []

  const orig = origArr.map((r) => cloneDeep(r))
  const curr = currArr.map((r) => cloneDeep(r))
  const n = Math.min(orig.length, curr.length)
  for (let i = 0; i < n; i++) {
    stripEmptyOriginalVsCurrent(orig[i], curr[i])
  }
  currentBaseline.current = currentIsArray ? orig : orig[0]
}

/** Strip `metadata.managedFields` from each resource (for diff display). */
function filterfy(resources: any[]): any[] {
  const filterManagedFields = (resource: any): any => {
    if (resource == null || typeof resource !== 'object') {
      return resource
    }
    const copy = cloneDeep(resource)
    const walk = (node: any) => {
      if (node == null || typeof node !== 'object') return
      if (node.metadata && typeof node.metadata === 'object' && 'managedFields' in node.metadata) {
        unset(node.metadata, 'managedFields')
      }
      if (Array.isArray(node)) {
        node.forEach(walk)
      } else {
        Object.values(node).forEach((v) => {
          if (v != null && typeof v === 'object') walk(v)
        })
      }
    }
    walk(copy)
    return copy
  }

  return (resources ?? []).map(filterManagedFields)
}

const isEmptyComparisonValue = (v: unknown): boolean => {
  if (v === '') return true
  if (typeof v === 'string' && v.startsWith('-')) return true
  if (v == null) return false
  if (Array.isArray(v)) return v.length === 0
  if (typeof v === 'object') return Object.keys(v as object).length === 0
  return false
}

/** When `original` has an empty string, a `-`-prefixed string, an empty object / array, and `current` does not, drop that slot from `original` only; recurse in lockstep. After stripping children, remove parents that became empty the same way. */
function stripEmptyOriginalVsCurrent(original: any, current: any): void {
  if (original == null || current == null) return
  if (Array.isArray(original) && Array.isArray(current)) {
    for (let i = original.length - 1; i >= 0; i--) {
      const o = original[i]
      const c = current[i]
      if (isEmptyComparisonValue(o) && !isEmptyComparisonValue(c)) {
        original.splice(i, 1)
      } else if (typeof o === 'object' && typeof c === 'object' && o !== null && c !== null) {
        stripEmptyOriginalVsCurrent(o, c)
        if (isEmptyComparisonValue(o) && !isEmptyComparisonValue(c)) {
          original.splice(i, 1)
        }
      }
    }
    return
  }
  if (Array.isArray(original) || Array.isArray(current)) return
  if (typeof original !== 'object' || typeof current !== 'object') return
  for (const key of Object.keys(original)) {
    const o = original[key]
    const c = current[key]
    if (isEmptyComparisonValue(o) && !isEmptyComparisonValue(c)) {
      delete original[key]
    } else if (typeof o === 'object' && typeof c === 'object' && o !== null && c !== null) {
      stripEmptyOriginalVsCurrent(o, c)
      if (isEmptyComparisonValue(o) && !isEmptyComparisonValue(c)) {
        delete original[key]
      }
    }
  }
}
