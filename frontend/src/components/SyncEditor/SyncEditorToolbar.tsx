/* Copyright Contributors to the Open Cluster Management project */
import { ReactNode } from 'react'
import { CodeEditorControl } from '@patternfly/react-code-editor'
import {
  RedoIcon,
  UndoIcon,
  SearchIcon,
  EyeIcon,
  EyeSlashIcon,
  CloseIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@patternfly/react-icons'
import XRayIcon from '@patternfly/react-icons/dist/esm/icons/x-ray-icon'
import { ClipboardCopyButton } from '@patternfly/react-core'
import { noop } from 'lodash'
import type { editor as editorTypes } from 'monaco-editor'

export interface SyncEditorToolbarProps {
  editorTitle?: string
  readonly?: boolean
  hasUndo: boolean
  hasRedo: boolean
  secrets?: (string | string[])[]
  showSecrets: boolean
  setShowSecrets: (value: boolean | ((prev: boolean) => boolean)) => void
  showCompareButton: boolean
  showChanges: boolean
  setShowChanges: (value: boolean | ((prev: boolean) => boolean)) => void
  onDiffPrevious?: () => void
  onDiffNext?: () => void
  copyHint: ReactNode
  setCopyHint: (hint: ReactNode) => void
  onClose?: () => void
  editor: editorTypes.IStandaloneCodeEditor | null
  lastUnredactedYaml?: string
  allCopiedCopy: ReactNode
  copiedCopy: ReactNode
  defaultCopy: ReactNode
  t: (key: string) => string
}

export function SyncEditorToolbar(props: SyncEditorToolbarProps): JSX.Element {
  const {
    editorTitle,
    readonly,
    hasUndo,
    hasRedo,
    secrets,
    showSecrets,
    setShowSecrets,
    showCompareButton,
    showChanges,
    setShowChanges,
    onDiffPrevious,
    onDiffNext,
    copyHint,
    setCopyHint,
    onClose,
    editor,
    lastUnredactedYaml,
    allCopiedCopy,
    copiedCopy,
    defaultCopy,
    t,
  } = props

  return (
    <>
      <div className="sy-c-code-editor__title">{editorTitle || 'YAML'}</div>
      <div className="sy-toolbar-buttons" style={{ display: 'flex' }}>
        {showCompareButton && (
          <>
            {showChanges && <div className="sy-toolbar-separator" role="separator" aria-orientation="vertical" />}
            <CodeEditorControl
              id="compare-changes-button"
              icon={<XRayIcon />}
              aria-label={t('Show changes')}
              tooltipProps={{ content: t('Show changes') }}
              isClicked={showChanges}
              onClick={() => {
                setShowChanges((v) => !v)
              }}
            />
            {showChanges && (
              <>
                <CodeEditorControl
                  id="diff-next-button"
                  icon={<ArrowDownIcon />}
                  aria-label={t('Next change')}
                  tooltipProps={{ content: t('Next change') }}
                  onClick={() => {
                    onDiffNext?.()
                  }}
                />
                <CodeEditorControl
                  id="diff-prev-button"
                  icon={<ArrowUpIcon />}
                  aria-label={t('Previous change')}
                  tooltipProps={{ content: t('Previous change') }}
                  onClick={() => {
                    onDiffPrevious?.()
                  }}
                />
                <div className="sy-toolbar-separator" role="separator" aria-orientation="vertical" />
              </>
            )}
          </>
        )}
        {/* undo */}
        {!readonly && (
          <CodeEditorControl
            id="undo-button"
            icon={<UndoIcon />}
            aria-label={t('Undo')}
            tooltipProps={{ content: t('Undo') }}
            isDisabled={!hasUndo}
            onClick={() => {
              editor?.trigger('source', 'undo', undefined)
            }}
          />
        )}
        {/* redo */}
        {!readonly && (
          <CodeEditorControl
            id="redo-button"
            icon={<RedoIcon />}
            aria-label={t('Redo')}
            tooltipProps={{ content: t('Redo') }}
            isDisabled={!hasRedo}
            onClick={() => {
              editor?.trigger('source', 'redo', undefined)
            }}
          />
        )}
        {!readonly && <div className="sy-toolbar-separator" role="separator" aria-orientation="vertical" />}
        {/* search */}
        <CodeEditorControl
          id="search-button"
          icon={<SearchIcon />}
          aria-label={t('Find')}
          tooltipProps={{ content: t('Find') }}
          onClick={() => {
            editor?.trigger('source', 'actions.find', undefined)
          }}
        />
        {/* secrets */}
        {secrets && (
          <CodeEditorControl
            id="secret-button"
            icon={showSecrets ? <EyeIcon /> : <EyeSlashIcon />}
            aria-label={t('Show Secrets')}
            tooltipProps={{ content: t('Show Secrets') }}
            onClick={() => {
              setShowSecrets(!showSecrets)
            }}
          />
        )}
        {/* copy */}
        <ClipboardCopyButton
          id="copy-button"
          textId="code-content"
          aria-label={t('Copy to clipboard')}
          disabled={false}
          onClick={() => {
            if (editor && editor.getModel()) {
              const model = editor.getModel()
              const selection = editor.getSelection()
              if (model && selection) {
                const selectedText = model.getValueInRange(selection)
                navigator.clipboard.writeText(selectedText || lastUnredactedYaml || '')
                setCopyHint(selectedText.length === 0 ? allCopiedCopy : copiedCopy)
                setTimeout(() => {
                  setCopyHint(defaultCopy)
                }, 800)
              }
            }
          }}
          exitDelay={600}
          variant="plain"
        >
          {copyHint}
        </ClipboardCopyButton>
        {!!onClose && (
          <CodeEditorControl
            icon={<CloseIcon />}
            aria-label={t('Close')}
            tooltipProps={{ content: t('Close') }}
            onClick={onClose || noop}
          />
        )}
      </div>
    </>
  )
}
