/* Copyright Contributors to the Open Cluster Management project */
import { HTMLProps, ReactNode, useRef, useEffect, useState, useCallback, useMemo } from 'react'
import useResizeObserver from '@react-hook/resize-observer'
import { CodeEditor, Language } from '@patternfly/react-code-editor'
import { debounce, isEqual, cloneDeep } from 'lodash'
import { processForm, processUser, ProcessedType } from './process'
import { SyncEditorDiff, SyncEditorDiffHandle, normalizeBaseline } from './SyncEditorDiff'
import { SyncEditorToolbar, readShowChangesPreference } from './SyncEditorToolbar'
import { compileAjvSchemas } from './validation'
import { getFormChanges, getUserChanges } from './changes'
import { decorate, getResourceEditorDecorations } from './decorate'
import { setFormValues, updateReferences } from './synchronize'
import './SyncEditor.css'
import { useTranslation } from '../../lib/acm-i18next'
import { ChangeHandler } from 'react-monaco-editor'
import * as monacoEditor from 'monaco-editor'
import { editor as editorTypes } from 'monaco-editor'
import { loader, Monaco } from '@monaco-editor/react'
import { Schema } from 'ajv'
import { defineThemes, getTheme, mountTheme, dismountTheme } from '../theme'

// loader can be null in tests
loader?.config({ monaco: monacoEditor })

export enum ValidationStatus {
  success = 'success',
  pending = 'pending',
  failure = 'failure',
}

export interface SyncEditorProps extends HTMLProps<HTMLPreElement> {
  variant?: string
  editorTitle?: string
  code?: string
  resources: unknown
  schema?: Schema
  secrets?: (string | string[])[]
  filters?: (string | string[])[]
  immutables?: (string | string[])[]
  editableUidSiblings?: boolean
  syncs?: unknown
  readonly?: boolean
  mock?: boolean
  autoCreateNs?: boolean
  onClose?: () => void
  onStatusChange?: (status: ValidationStatus) => void
  /** Second argument is true when the user replaced the full document (paste-all); wizards should pass it to {@link IDataContext.update}. */
  onEditorChange?: (editorResources: any, resetDefaultSnapshot?: boolean) => void
  /** Wizard review / form dot path used to scroll and highlight the matching YAML region. */
  highlightEditorPath?: string
}

export function SyncEditor(props: SyncEditorProps): JSX.Element {
  const {
    variant,
    editorTitle,
    resources,
    schema,
    secrets,
    immutables,
    editableUidSiblings,
    code,
    syncs,
    filters,
    readonly,
    mock,
    autoCreateNs,
    onStatusChange,
    onEditorChange,
    onClose,
    highlightEditorPath,
  } = props
  const [editorHighlightPath, setEditorHighlightPath] = useState(() => highlightEditorPath ?? '')
  useEffect(() => {
    setEditorHighlightPath(highlightEditorPath ?? '')
  }, [highlightEditorPath])
  const pageRef = useRef<HTMLDivElement>(null)
  const syncEditorDiffRef = useRef<SyncEditorDiffHandle>(null)
  const lastBaseline = useRef<unknown>(undefined)
  const currentBaseline = useRef<unknown>(undefined)
  const [baselineSyncKey, setBaselineSyncKey] = useState(0)
  const [editor, setEditor] = useState<editorTypes.IStandaloneCodeEditor | null>(null)
  const [monaco, setMonaco] = useState<Monaco | null>(null)
  if (mock) {
    if (!monaco) {
      setMonaco({
        editor: {
          setTheme: () => {},
        },
        languages: {
          registerHoverProvider: () => {},
        },
      } as any as Monaco)
    }
    if (!editor) {
      setEditor({
        getModel: () => {},
        onMouseDown: () => {},
        onKeyDown: () => {},
        onDidBlurEditorWidget: () => {},
      } as any as editorTypes.IStandaloneCodeEditor)
    }
  }
  const { t } = useTranslation()
  const editorHadFocus = useRef(false)
  const diffHadFocus = useRef(false)
  const defaultCopy = useMemo<ReactNode>(() => <span style={{ wordBreak: 'keep-all' }}>{t('Copy')}</span>, [t])
  const copiedCopy = useMemo<ReactNode>(
    () => <span style={{ wordBreak: 'keep-all' }}>{t('Selection copied')}</span>,
    [t]
  )
  const allCopiedCopy = useMemo<ReactNode>(() => <span style={{ wordBreak: 'keep-all' }}>{t('All copied')}</span>, [t])
  const [copyHint, setCopyHint] = useState<ReactNode>(defaultCopy)
  const [prohibited, setProhibited] = useState<any>([])
  const [filteredRows, setFilteredRows] = useState<number[]>([])
  const [userEdits, setUserEdits] = useState<any>([])
  const [customValidationErrors, setCustomValidationErrors] = useState<any>([])
  const [lastUserEdits, setLastUserEdits] = useState<any>([])
  const [squigglyTooltips, setSquigglyTooltips] = useState<any>([])
  const [lastChange, setLastChange] = useState<ProcessedType>()
  const [lastUnredactedChange, setLastUnredactedChange] = useState<ProcessedType>()
  const [lastFormComparison, setLastFormComparison] = useState<{
    [name: string]: any[]
  }>()
  const [changeStack, setChangeStack] = useState<{
    baseResources: any[]
    customResources: any[]
  }>()
  const [xreferences, setXReferences] = useState<{ value: any; references: { [name: string]: any[] } }[]>([])
  const [showSecrets, setShowSecrets] = useState<boolean>(false)
  const [showFiltered, setShowFiltered] = useState<boolean>(false)
  const [clickedOnFilteredLine, setClickedOnFilteredLine] = useState<boolean>(false)
  const [editorHasFocus, setEditorHasFocus] = useState<boolean>(false)
  const [diffEditorHasFocus, setDiffEditorHasFocus] = useState<boolean>(false)
  const [editorHasErrors, setEditorHasErrors] = useState<boolean>(false)
  const [showCondensed, setShowCondensed] = useState<boolean>(false)
  const [hasUndo, setHasUndo] = useState<boolean>(false)
  const [hasRedo, setHasRedo] = useState<boolean>(false)
  const [showChanges, setShowChanges] = useState<boolean>(readShowChangesPreference)
  const [diffEditorInstanceEpoch, setDiffEditorInstanceEpoch] = useState(0)
  const onDiffEditorInstanceChange = useCallback(() => setDiffEditorInstanceEpoch((n) => n + 1), [])

  useEffect(() => {
    if (editorHighlightPath) {
      setShowChanges(false)
    }
  }, [editorHighlightPath])

  useEffect(() => {
    if (showChanges) {
      setEditorHighlightPath('')
    }
  }, [showChanges])

  useEffect(() => {
    if (!(showChanges && baselineSyncKey > 0 && !mock)) {
      setDiffEditorHasFocus(false)
    }
  }, [showChanges, baselineSyncKey, mock])

  useEffect(() => {
    void normalizeBaseline(currentBaseline.current, resources, lastBaseline, currentBaseline)
    setBaselineSyncKey((k) => k + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(resources)])

  // compile schema(s) just once
  const validationRef = useRef<unknown>()
  if (schema && !validationRef.current) {
    validationRef.current = compileAjvSchemas(schema)
  }
  // ensure cleanup when component unmounts
  useEffect(() => {
    // hide SyncEditor version of monaco-colors
    return () => dismountTheme('se')
  }, [])

  function onEditorDidMount(editor: editorTypes.IStandaloneCodeEditor, monaco: Monaco) {
    // make sure this instance of monaco editor has the ocp console themes
    defineThemes(monaco?.editor)

    // if we don't reset the themes to vs
    // and console-light or console-dark were set, monaco wouldn't
    // update the 'monoco-colors' style with the right colors
    monaco?.editor?.setTheme('vs')
    monaco?.editor?.setTheme(getTheme())

    // show SyncEditor version of monaco-colors
    mountTheme('se')

    // observe documentElement class changes (theme toggles)
    if (typeof MutationObserver !== 'undefined') {
      const classObserver = new MutationObserver(() => {
        monaco?.editor?.setTheme(getTheme())
        ;(window as any).monaco?.editor?.setTheme(getTheme())
      })
      classObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class'],
      })
    }

    // a little breathing space above top line
    editor.changeViewZones(
      (changeAccessor: {
        addZone: (arg0: { afterLineNumber: number; heightInPx: number; domNode: HTMLDivElement }) => void
      }) => {
        const domNode = document.createElement('div')
        changeAccessor.addZone({
          afterLineNumber: 0,
          heightInPx: 10,
          domNode: domNode,
        })
      }
    )

    window.getEditorValue = () => editor.getValue()
    setEditor(editor)
    setMonaco(monaco)
    layoutEditor(editor)
  }

  useEffect(() => {
    if (editor && monaco) {
      // if user is pasting a certificate, fix the indent
      const domNode = editor.getDomNode()
      domNode?.addEventListener(
        'paste',
        (event: ClipboardEvent) => {
          const selection = editor.getSelection()
          const pasteText = event.clipboardData?.getData('text/plain').trim()

          if (selection && pasteText) {
            const model = editor.getModel()
            const lines = pasteText?.split(/\r?\n/)
            if (selection.selectionStartLineNumber - 1 > 0 && pasteText?.startsWith('-----BEGIN')) {
              event.stopPropagation()
              event.preventDefault()
              const lines = pasteText.split(/\r?\n/)
              const spaces = (model?.getLineContent(selection.selectionStartLineNumber - 1)?.search(/\S/) ?? 0) + 2
              const leadSpaces = spaces - selection.selectionStartColumn + 1
              const lead = ' '.repeat(leadSpaces < 0 ? spaces : leadSpaces)
              const spacer = ' '.repeat(spaces)
              const joint = `\r\n${spacer}`
              const text = `${lead}${lines.map((line: string) => line.trim()).join(joint)}\r\n`
              editor.executeEdits('my-source', [{ range: selection, text: text, forceMoveMarkers: true }])
            }

            // when user is pasting in a complete yaml, do we need to make sure the resource has a namespace
            if (
              autoCreateNs && // make sure resource has namespace
              selection?.startColumn === 1 &&
              selection?.endLineNumber === model?.getLineCount()
            ) {
              let nameInx
              let hasMetadata = false
              let hasNamespace = false
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('metadata:')) {
                  hasMetadata = true
                }
                if (hasMetadata) {
                  if (lines[i].includes(' name:')) {
                    nameInx = i
                  }
                  if (lines[i].includes(' namespace:')) {
                    hasNamespace = true
                  }
                }
                if (hasNamespace || lines[i].startsWith('spec:')) {
                  break
                }
              }
              if (nameInx && !hasNamespace) {
                // add missing namespace
                event.stopPropagation()
                event.preventDefault()
                lines.splice(nameInx + 1, 0, '  namespace: ""')
                const text = lines.join('\r\n')
                editor.executeEdits('my-source', [{ range: selection, text: text, forceMoveMarkers: true }])
              }
            }
          }
        },
        true
      )
      // clear our the getEditorValue method
      return () => {
        window.getEditorValue = undefined
      }
    }
  }, [autoCreateNs, editor, monaco])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onMouseDown = useCallback(
    debounce((e) => {
      // if clicking on a filtered row, toggle the
      // show filter state to "expand" filtered content
      const editorHasFocus = !!document.querySelector('.monaco-editor.focused')
      const isClickOnFilteredLine = filteredRows.includes(e?.target?.position?.lineNumber)
      setClickedOnFilteredLine(isClickOnFilteredLine)
      if (isClickOnFilteredLine) {
        setShowFiltered(!showFiltered)
      }
      setEditorHasFocus(editorHasFocus && !isClickOnFilteredLine)
    }, 0),

    [filteredRows, showFiltered]
  )
  useEffect(() => {
    if (editor) {
      const handle = editor.onMouseDown(onMouseDown)
      return () => {
        handle?.dispose()
      }
    }
  }, [filteredRows, showFiltered, editor, onMouseDown])

  // show tooltips over errors
  useEffect(() => {
    if (monaco) {
      const handle = monaco.languages.registerHoverProvider('yaml', {
        provideHover: (_model: any, position: any) => {
          return new Promise((resolve) => {
            squigglyTooltips.forEach((tip: { range: { containsPosition: (arg0: any) => any }; message: string }) => {
              if (tip.range.containsPosition(position)) {
                return resolve({ contents: [{ value: '```html\n' + tip.message + ' \n```' }] })
              }
            })
            return resolve(null)
          })
        },
      })
      return () => {
        handle?.dispose()
      }
    }
  }, [squigglyTooltips, monaco])

  // prevent user from changing protected text
  useEffect(() => {
    if (editor) {
      const handle = editor.onKeyDown(
        (e: {
          code: string
          ctrlKey: boolean
          metaKey: boolean
          stopPropagation: () => void
          preventDefault: () => void
        }) => {
          const selections = editor.getSelections()
          const model = editor.getModel()
          const isAllSelected =
            selections?.length === 1 &&
            selections[0].startColumn === 1 &&
            selections[0].endLineNumber === model?.getLineCount()
          // if user presses enter, add new key: below this line
          let endOfLineEnter = false
          if (e.code === 'Enter') {
            const pos = editor.getPosition()
            if (model && pos) {
              const thisLine = model.getLineContent(pos.lineNumber)
              endOfLineEnter = thisLine.length < pos.column
            }
          }
          if (
            // if user clicks on readonly area, ignore
            !(e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) &&
            e.code !== 'ArrowDown' &&
            e.code !== 'ArrowUp' &&
            e.code !== 'ArrowLeft' &&
            e.code !== 'ArrowRight' &&
            !endOfLineEnter &&
            !isAllSelected &&
            !prohibited.every((prohibit: { intersectRanges: (arg: any) => any }) => {
              return selections?.findIndex((range: any) => prohibit.intersectRanges(range)) === -1
            })
          ) {
            e.stopPropagation()
            e.preventDefault()
          }
        }
      )
      return () => {
        handle?.dispose()
      }
    }
  }, [prohibited, editor])

  // if editor loses focus, do form changes immediately
  useEffect(() => {
    if (editor) {
      editor.onDidBlurEditorWidget(() => {
        const editorHasFocus = !!document.querySelector('.monaco-editor.focused')
        const activeId = document.activeElement?.id as string
        if (
          !editorHasFocus &&
          ['undo-button', 'redo-button', 'compare-changes-button', 'diff-prev-button', 'diff-next-button'].indexOf(
            activeId
          ) === -1
        ) {
          setClickedOnFilteredLine(false)
          setEditorHasFocus(false)
        }
      })
    }
  }, [editor, setClickedOnFilteredLine, setEditorHasFocus])

  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //
  // ██    ██ ██████  ██████   █████  ████████ ███████     ███████  ██████  ██████  ███    ███
  // ██    ██ ██   ██ ██   ██ ██   ██    ██    ██          ██      ██    ██ ██   ██ ████  ████
  // ██    ██ ██████  ██   ██ ███████    ██    █████       █████   ██    ██ ██████  ██ ████ ██
  // ██    ██ ██      ██   ██ ██   ██    ██    ██          ██      ██    ██ ██   ██ ██  ██  ██
  //  ██████  ██      ██████  ██   ██    ██    ███████     ██       ██████  ██   ██ ██      ██
  // //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  // react to changes from form
  useEffect(
    () => {
      let changeTimeoutId: NodeJS.Timeout

      // if editor loses focus, update form immediately
      // otherwise if form already had focus, no need to call formChange

      const diffViewActive = showChanges && baselineSyncKey > 0 && !mock
      const preferModifiedPane = diffEditorHasFocus || diffViewActive
      const modifiedEditor = preferModifiedPane ? syncEditorDiffRef.current?.getModifiedEditor() ?? null : null
      const activeEditor = preferModifiedPane ? modifiedEditor : editor
      const model = activeEditor?.getModel() ?? null

      // If focus just moved into the main editor or the diff, skip this run so we do not fight the caret.
      // When neither surface has focus, always allow the effect (e.g. form/resources changed after blur).
      const focusJustEnteredEditorOrDiff =
        (!editorHadFocus.current && editorHasFocus) || (!diffHadFocus.current && diffEditorHasFocus)
      if ((editorHasFocus || diffEditorHasFocus) && focusJustEnteredEditorOrDiff) {
        // ignore
      } else if (activeEditor && monaco && model) {
        // debounce changes from form
        const formChange = () => {
          const diffViewActiveNow = showChanges && baselineSyncKey > 0 && !mock
          const preferModified = diffEditorHasFocus || diffViewActiveNow
          const syncEditor = preferModified ? syncEditorDiffRef.current?.getModifiedEditor() ?? null : editor
          const syncModel = syncEditor?.getModel() ?? null
          if (editorHasErrors) {
            return
          }
          // Main editor: defer while typing. Diff compare: apply to the modified pane (not the hidden standalone editor).
          if (!diffEditorHasFocus && editorHasFocus) {
            return
          }
          if (!syncEditor || !syncModel) {
            return
          }
          // parse/validate/secrets
          const {
            yaml,
            protectedRanges,
            filteredRows,
            errors,
            comparison: formComparison,
            change,
            unredactedChange,
            xreferences,
          } = processForm(
            monaco,
            code,
            resources,
            changeStack,
            showSecrets ? undefined : secrets,
            showFiltered,
            filters,
            immutables,
            readonly === true,
            userEdits,
            validationRef.current,
            syncModel.getValue() ?? '',
            editableUidSiblings
          )
          setProhibited(protectedRanges)
          setFilteredRows(filteredRows)
          setLastUnredactedChange(unredactedChange)
          setXReferences(xreferences)

          const allErrors = [...errors.validation, ...errors.syntax]
          const { yamlChanges, remainingEdits } = getFormChanges(
            allErrors,
            change,
            userEdits,
            formComparison,
            lastChange,
            lastFormComparison
          )

          // update yaml in editor
          //model.resources = cloneDeep(change.resources)
          const saveDecorations = getResourceEditorDecorations(syncEditor, false)
          const viewState = syncEditor.saveViewState()
          const diffModifiedEditor = syncEditorDiffRef.current?.getModifiedEditor()
          const isDiffModifiedPane = Boolean(diffModifiedEditor && syncEditor === diffModifiedEditor)
          // Diff compare: never dispose/replace the modified model — SyncEditorDiff keeps refs and push-YAML effects use that model.
          // Standalone editor: recreate the model when createModel exists (tests may omit it).
          if (typeof monaco.editor.createModel === 'function' && !isDiffModifiedPane) {
            syncEditor.getModel()?.dispose?.()
            syncEditor.setModel(monaco.editor.createModel(yaml, 'yaml'))
          } else {
            syncModel.setValue(yaml)
          }
          if (viewState) {
            syncEditor.restoreViewState(viewState)
          }
          syncEditor.deltaDecorations([], saveDecorations)
          setHasRedo(false)
          setHasUndo(false)

          // report to form
          onStatusChange?.(allErrors.length === 0 ? ValidationStatus.success : ValidationStatus.failure)

          // user edits that haven't been incorporated into form
          setLastUserEdits(remainingEdits)

          // decorate errors, changes
          const squigglyTooltips = decorate(
            false,
            editorHasFocus || diffEditorHasFocus,
            syncEditor,
            monaco,
            [...allErrors, ...customValidationErrors],
            yamlChanges,
            change,
            remainingEdits,
            protectedRanges,
            filteredRows,
            editorHighlightPath
          )
          setSquigglyTooltips(squigglyTooltips)
          setLastFormComparison(formComparison)
          setLastChange(change)
          setUserEdits(remainingEdits)
        }
        // if form changed, and editor doesn't have focus (user isn't typing) process form change immediately
        // if form changed, and editor has focus (user is typing) process form with debounce of 1 s to allow user to type
        changeTimeoutId = setTimeout(
          formChange,
          !clickedOnFilteredLine && (editorHasFocus || diffEditorHasFocus) ? 1000 : 100
        )
      }
      editorHadFocus.current = editorHasFocus
      diffHadFocus.current = diffEditorHasFocus

      return () => {
        clearTimeout(changeTimeoutId)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(resources),
      code,
      showSecrets,
      showFiltered,
      editorHasFocus,
      diffEditorHasFocus,
      clickedOnFilteredLine,
      changeStack,
      editor,
      monaco,
      editorHighlightPath,
      showChanges,
      mock,
      diffEditorInstanceEpoch,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      JSON.stringify(immutables),
    ]
  )

  // report resource changes to form
  const reportResourceChanges = useCallback(
    (resourceChanges: ProcessedType, resetDefaultSnapshot?: boolean) => {
      if (resourceChanges) {
        const isArr = Array.isArray(resources)
        const _resources = isArr ? resources : [resources]
        if (onEditorChange && !isEqual(resourceChanges.resources, _resources)) {
          const editChanges = {
            resources: isArr ? resourceChanges.resources : resourceChanges.resources[0],
          }
          onEditorChange(editChanges, resetDefaultSnapshot)
        }
      }
    },
    [onEditorChange, resources]
  )
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //
  //  ███████ ██████  ██ ████████  ██████  ██████      ████████ ██    ██ ██████  ██ ███    ██  ██████
  //  ██      ██   ██ ██    ██    ██    ██ ██   ██        ██     ██  ██  ██   ██ ██ ████   ██ ██
  //  █████   ██   ██ ██    ██    ██    ██ ██████         ██      ████   ██████  ██ ██ ██  ██ ██   ███
  //  ██      ██   ██ ██    ██    ██    ██ ██   ██        ██       ██    ██      ██ ██  ██ ██ ██    ██
  //  ███████ ██████  ██    ██     ██████  ██   ██        ██       ██    ██      ██ ██   ████  ██████
  // //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  // react to changes from user editing yaml
  const editorChanged = useCallback(
    (value: string, e: editorTypes.IModelContentChangedEvent) => {
      const activeEditor = syncEditorDiffRef.current?.getModifiedEditor() ?? editor
      if (activeEditor && monaco) {
        if (!e.isFlush) {
          const modelForChange = activeEditor.getModel()
          // Large paste/replace: if this edit replaced most of the *previous* model (by UTF-16 length), tell the form to reset its default snapshot.
          let resetDefaultSnapshot = false
          if (modelForChange && e.changes.length > 0) {
            let oldValueLength = modelForChange.getValueLength()
            for (let i = e.changes.length - 1; i >= 0; i--) {
              const ch = e.changes[i]
              oldValueLength = oldValueLength - ch.text.length + ch.rangeLength
            }
            const replacedLengthInOldModel = e.changes.reduce((sum, ch) => sum + ch.rangeLength, 0)
            if (oldValueLength > 0) {
              resetDefaultSnapshot = Math.min(replacedLengthInOldModel, oldValueLength) / oldValueLength > 0.8
            }
          }
          // parse/validate/secrets
          const {
            protectedRanges,
            filteredRows,
            errors,
            comparison: userComparison,
            change,
            unredactedChange,
          } = processUser(
            monaco,
            value,
            showSecrets ? undefined : secrets,
            lastUnredactedChange?.hiddenSecretsValues,
            showFiltered,
            filters,
            lastUnredactedChange?.hiddenFilteredValues,
            immutables,
            readonly === true,
            validationRef.current,
            value,
            editableUidSiblings
          )
          setLastUnredactedChange(unredactedChange)
          setProhibited(protectedRanges)
          setFilteredRows(filteredRows)

          // determine what changes were made by user so we can decorate
          // and know what form changes to block
          const allErrors = [...errors.validation, ...errors.syntax]
          let changes = getUserChanges(allErrors, change, lastUserEdits, userComparison, lastChange, lastChange?.parsed)

          // using cross reference created in formchange, propagate any user change to
          // a path that has cross references to those other references
          changes = updateReferences(changes, xreferences, unredactedChange)

          // report new resources/errors/useredits to form
          // if there are validation errors still pass it to form
          const editorHasErrors =
            errors.syntax.length > 0 || errors.validation.filter(({ errorType }) => errorType === 'error').length > 0
          let customErrors = []
          if (!editorHasErrors) {
            const clonedUnredactedChange = cloneDeep(unredactedChange)
            reportResourceChanges(clonedUnredactedChange, resetDefaultSnapshot)
            customErrors = setFormValues(syncs, clonedUnredactedChange) || []
            setCustomValidationErrors(customErrors)
          }
          setEditorHasErrors(editorHasErrors)
          onStatusChange?.(allErrors.length === 0 ? ValidationStatus.success : ValidationStatus.failure)

          // decorate errors, changes
          const squigglyTooltips = decorate(
            true,
            editorHasFocus,
            activeEditor,
            monaco,
            [...allErrors, ...customErrors],
            [],
            change,
            lastUserEdits,
            protectedRanges,
            filteredRows,
            editorHighlightPath
          )
          setSquigglyTooltips(squigglyTooltips)
          setUserEdits(changes)
          // don't set last change here--always comparing against last form
          //setLastChange(change)

          // set up a change stack that can be used to reconcile user changes typed here and if/when form changes occur
          if (allErrors.length === 0) {
            setChangeStack({
              baseResources: changeStack?.baseResources ?? unredactedChange?.resources ?? [],
              customResources: unredactedChange.resources,
            })
          }

          // undo/redo enable
          const model = activeEditor.getModel()
          if (model) {
            setHasRedo((model as any).canRedo())
            setHasUndo((model as any).canUndo())
          }
        }
      }
    },
    [
      changeStack?.baseResources,
      editableUidSiblings,
      editor,
      editorHasFocus,
      filters,
      immutables,
      lastChange,
      lastUnredactedChange?.hiddenFilteredValues,
      lastUnredactedChange?.hiddenSecretsValues,
      lastUserEdits,
      monaco,
      readonly,
      reportResourceChanges,
      secrets,
      showFiltered,
      showSecrets,
      syncs,
      xreferences,
      editorHighlightPath,
      onStatusChange,
    ]
  )

  const editorChange = useCallback<ChangeHandler>(
    (value, e) => {
      onStatusChange?.(ValidationStatus.pending)
      editorChanged(value, e)
    },
    [editorChanged, onStatusChange]
  )

  /** Ignore diff `onDidChangeModelContent` when the modified pane is not focused (programmatic setValue / model churn). */
  const syncEditorDiffOnChange = useCallback<ChangeHandler>(
    (value, e) => {
      const modified = syncEditorDiffRef.current?.getModifiedEditor()
      if (modified != null && !modified.hasTextFocus()) {
        return
      }
      editorChange(value, e)
    },
    [editorChange]
  )

  const onDiffPrevious = useCallback(() => {
    syncEditorDiffRef.current?.previous()
  }, [])

  const onDiffNext = useCallback(() => {
    syncEditorDiffRef.current?.next()
  }, [])

  const toolbarControls = useMemo(() => {
    return (
      <SyncEditorToolbar
        editorTitle={editorTitle}
        readonly={readonly}
        hasUndo={hasUndo}
        hasRedo={hasRedo}
        secrets={secrets}
        showSecrets={showSecrets}
        setShowSecrets={setShowSecrets}
        showCompareButton={variant === 'toolbar'}
        showChanges={showChanges}
        setShowChanges={setShowChanges}
        onDiffPrevious={onDiffPrevious}
        onDiffNext={onDiffNext}
        copyHint={copyHint}
        setCopyHint={setCopyHint}
        onClose={onClose}
        editor={editor}
        syncEditorDiffRef={syncEditorDiffRef}
        lastUnredactedYaml={lastUnredactedChange?.yaml}
        allCopiedCopy={allCopiedCopy}
        copiedCopy={copiedCopy}
        defaultCopy={defaultCopy}
        t={t}
      />
    )
  }, [
    editorTitle,
    readonly,
    hasUndo,
    hasRedo,
    secrets,
    showSecrets,
    variant,
    showChanges,
    onDiffPrevious,
    onDiffNext,
    copyHint,
    onClose,
    editor,
    syncEditorDiffRef,
    lastUnredactedChange?.yaml,
    allCopiedCopy,
    copiedCopy,
    defaultCopy,
    t,
  ])

  useResizeObserver(pageRef, () => {
    layoutEditor(editor)
  })

  const layoutEditor = useCallback(
    (editor: any) => {
      if (pageRef.current && editor) {
        const rect = pageRef.current.getBoundingClientRect()
        const { width } = rect
        let { height } = rect

        if (pageRef.current) {
          height = window.innerHeight - pageRef.current?.getBoundingClientRect().top
        }

        if (variant === 'toolbar') {
          height -= 36
        }
        if (editorHasErrors) {
          height -= 75
        }
        editor.layout({ width, height })
        setShowCondensed(width < 500)
      }
    },
    [editorHasErrors, variant]
  )

  return (
    <div ref={pageRef} className="sync-editor__container">
      <div className="sync-editor__stack">
        <CodeEditor
          isLineNumbersVisible={true}
          isReadOnly={readonly}
          isMinimapVisible={true}
          onChange={editorChange}
          language={Language.yaml}
          customControls={variant === 'toolbar' ? toolbarControls : undefined}
          onEditorDidMount={onEditorDidMount}
          showEditor={!(showChanges && baselineSyncKey > 0 && !mock)}
          options={{
            theme: getTheme(),
            wordWrap: 'wordWrapColumn',
            wordWrapColumn: showCondensed ? 512 : 256,
            scrollBeyondLastLine: true,
            smoothScrolling: true,
            glyphMargin: true,
            tabSize: 2,
            scrollbar: {
              verticalScrollbarSize: 17,
              horizontalScrollbarSize: 17,
            },
            minimap: {
              enabled: false,
            },
          }}
        />
        <SyncEditorDiff
          ref={syncEditorDiffRef}
          showChanges={showChanges}
          baselineResources={currentBaseline}
          baselineSyncKey={baselineSyncKey}
          resources={resources}
          mock={mock}
          diffEditorHasFocus={diffEditorHasFocus}
          onDiffEditorFocusChange={setDiffEditorHasFocus}
          onDiffEditorInstanceChange={onDiffEditorInstanceChange}
          resizeRootRef={pageRef}
          onChange={syncEditorDiffOnChange}
        />
      </div>
    </div>
  )
}
