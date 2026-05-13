/* Copyright Contributors to the Open Cluster Management project */
import { forwardRef, useEffect, useImperativeHandle, useRef, type RefObject } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import * as monacoEditor from 'monaco-editor'
import { editor as editorTypes } from 'monaco-editor'
import { cloneDeep, unset } from 'lodash'
import { stringify } from './process'
import { defineThemes, getTheme, mountTheme } from '../theme'

export interface SyncEditorDiffHandle {
  previous: () => void
  next: () => void
}

export interface SyncEditorDiffProps {
  showChanges: boolean
  originalResources?: unknown
  resources: unknown
  mock?: boolean
  /** Observed for layout when the editor page resizes. */
  resizeRootRef: RefObject<HTMLDivElement | null>
}

export const SyncEditorDiff = forwardRef<SyncEditorDiffHandle, SyncEditorDiffProps>(function SyncEditorDiff(
  { showChanges, originalResources, resources, mock, resizeRootRef },
  ref
) {
  const diffContainerRef = useRef<HTMLDivElement>(null)
  const diffEditorRef = useRef<editorTypes.IStandaloneDiffEditor | null>(null)
  const diffNavigatorRef = useRef<editorTypes.IDiffNavigator | null>(null)

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
    }),
    []
  )

  useEffect(() => {
    const showDiffView = showChanges && originalResources !== undefined && !mock
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
      diffNavigatorRef.current?.dispose()
      diffNavigatorRef.current = null
      diffEditorRef.current = null
      diffEditor.setModel(null)
      diffEditor.dispose()
      originalModel.dispose()
      modifiedModel.dispose()
    }
  }, [showChanges, originalResources, resources, mock])

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
