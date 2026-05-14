/* Copyright Contributors to the Open Cluster Management project */
import { forwardRef, useEffect, useImperativeHandle, useRef, useMemo, type RefObject } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import * as monacoEditor from 'monaco-editor'
import { editor as editorTypes } from 'monaco-editor'
import { cloneDeep, unset } from 'lodash'
import { stringify } from './process'
import { defineThemes, getTheme, mountTheme } from '../theme'
import { ChangeHandler } from 'react-monaco-editor'

export interface SyncEditorDiffHandle {
  previous: () => void
  next: () => void
  /** When the diff view is mounted, the `createDiffEditor` instance (e.g. Find). */
  getDiffEditor: () => editorTypes.IStandaloneDiffEditor | null
  /** When the diff view is mounted, the modified-side editor (for copy/selection). */
  getModifiedEditor: () => editorTypes.IStandaloneCodeEditor | null
}

export interface SyncEditorDiffProps {
  showChanges: boolean
  originalResources?: unknown
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
}

const TOOLBAR_IDS_SKIP_DIFF_BLUR = [
  'undo-button',
  'redo-button',
  'compare-changes-button',
  'diff-prev-button',
  'diff-next-button',
] as const

export const SyncEditorDiff = forwardRef<SyncEditorDiffHandle, SyncEditorDiffProps>(function SyncEditorDiff(
  {
    showChanges,
    originalResources,
    resources,
    mock,
    diffEditorHasFocus,
    onDiffEditorFocusChange,
    resizeRootRef,
    onChange,
  },
  ref
) {
  const diffContainerRef = useRef<HTMLDivElement>(null)
  const diffEditorRef = useRef<editorTypes.IStandaloneDiffEditor | null>(null)
  const originalModelRef = useRef<monacoEditor.editor.ITextModel | null>(null)
  const modifiedModelRef = useRef<monacoEditor.editor.ITextModel | null>(null)
  const diffNavigatorRef = useRef<editorTypes.IDiffNavigator | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onDiffEditorFocusChangeRef = useRef(onDiffEditorFocusChange)
  onDiffEditorFocusChangeRef.current = onDiffEditorFocusChange

  const showDiffView = showChanges && originalResources !== undefined && !mock

  const resourcesContentKey = useMemo(
    () => JSON.stringify(resources) + '\n---\n' + JSON.stringify(originalResources),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(resources), JSON.stringify(originalResources)]
  )

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
    }),
    []
  )

  // Create / destroy diff widget only when compare mode toggles — resource updates run in the sync effect below.
  useEffect(() => {
    if (!showDiffView) {
      return
    }
    const container = diffContainerRef.current
    if (!container || typeof monacoEditor.editor.createDiffEditor !== 'function') {
      return
    }

    const { original: filteredOriginal, current: filteredCurrent } = filterfy(
      Array.isArray(originalResources) ? originalResources : [originalResources],
      Array.isArray(resources) ? resources : [resources]
    )
    const originalYaml = stringify(filteredOriginal)
    const modifiedYaml = stringify(filteredCurrent)

    defineThemes(monacoEditor.editor)
    mountTheme('se')
    monacoEditor.editor.setTheme(getTheme())

    const originalModel = monacoEditor.editor.createModel(originalYaml, 'yaml')
    const modifiedModel = monacoEditor.editor.createModel(modifiedYaml, 'yaml')

    const diffEditor = monacoEditor.editor.createDiffEditor(container, {
      renderSideBySide: false,
      originalEditable: false,
      automaticLayout: false,
      scrollBeyondLastLine: true,
      cursorSmoothCaretAnimation: true,
      minimap: { enabled: false },
      quickSuggestions: false,
      lightbulb: { enabled: false },
      theme: getTheme(),
    })
    diffEditor.setModel({ original: originalModel, modified: modifiedModel })
    diffEditorRef.current = diffEditor
    originalModelRef.current = originalModel
    modifiedModelRef.current = modifiedModel

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

    const focusDisposables = [
      originalEditor.onDidFocusEditorWidget(() => onDiffEditorFocusChangeRef.current(true)),
      originalEditor.onDidBlurEditorWidget(notifyBlurIfReallyLeft),
      modifiedEditor.onDidFocusEditorWidget(() => onDiffEditorFocusChangeRef.current(true)),
      modifiedEditor.onDidBlurEditorWidget(notifyBlurIfReallyLeft),
    ]

    const onContainerMouseDown = () => {
      const focusedEl = document.querySelector('.monaco-editor.focused')
      if (focusedEl && diffContainerRef.current?.contains(focusedEl)) {
        onDiffEditorFocusChangeRef.current(true)
      }
    }
    container.addEventListener('mousedown', onContainerMouseDown)

    const onChangeDisposable = modifiedEditor.onDidChangeModelContent((event) => {
      onChangeRef.current?.(modifiedEditor.getValue(), event)
    })

    diffNavigatorRef.current?.dispose()
    diffNavigatorRef.current = monacoEditor.editor.createDiffNavigator(diffEditor, {
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
    requestAnimationFrame(() => {
      layoutDiff()
    })

    return () => {
      focusDisposables.forEach((d) => d.dispose())
      container.removeEventListener('mousedown', onContainerMouseDown)
      onChangeDisposable.dispose()
      diffNavigatorRef.current?.dispose()
      diffNavigatorRef.current = null
      diffEditorRef.current = null
      originalModelRef.current = null
      modifiedModelRef.current = null
      diffEditor.setModel(null)
      diffEditor.dispose()
      originalModel.dispose()
      modifiedModel.dispose()
      onDiffEditorFocusChangeRef.current(false)
    }
  }, [showDiffView]) // eslint-disable-line react-hooks/exhaustive-deps -- compare open/close only; YAML synced in next effect

  // Push resource changes into diff models when the user is not typing in the diff (re-runs as soon as focus is lost).
  useEffect(() => {
    if (!showDiffView) {
      return
    }
    if (!diffEditorRef.current || !originalModelRef.current || !modifiedModelRef.current) {
      return
    }
    if (diffEditorHasFocus) {
      return
    }

    const { original: filteredOriginal, current: filteredCurrent } = filterfy(
      Array.isArray(originalResources) ? originalResources : [originalResources],
      Array.isArray(resources) ? resources : [resources]
    )
    const originalYaml = stringify(filteredOriginal)
    const modifiedYaml = stringify(filteredCurrent)
    originalModelRef.current.setValue(originalYaml)
    modifiedModelRef.current.setValue(modifiedYaml)
  }, [showDiffView, diffEditorHasFocus, resourcesContentKey]) // eslint-disable-line react-hooks/exhaustive-deps -- resourcesContentKey tracks deep resource changes

  useResizeObserver(resizeRootRef, () => {
    if (!diffEditorRef.current || !diffContainerRef.current) return
    const { width, height } = diffContainerRef.current.getBoundingClientRect()
    if (width > 0 && height > 0) {
      diffEditorRef.current.layout({ width, height })
    }
  })

  if (!(showChanges && originalResources !== undefined && !mock)) {
    return null
  }

  return <div ref={diffContainerRef} className="sync-editor__diff-host" />
})

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

/** Deep-clone resource lists for diff: strip `managedFields`, then align empty placeholders on `original` with populated `current`. */
function filterfy(original: any[], current: any[]): { original: any[]; current: any[] } {
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

  const orig = (original ?? []).map(filterManagedFields)
  const curr = (current ?? []).map(filterManagedFields)
  const n = Math.min(orig.length, curr.length)
  for (let i = 0; i < n; i++) {
    stripEmptyOriginalVsCurrent(orig[i], curr[i])
  }
  return { original: orig, current: curr }
}
