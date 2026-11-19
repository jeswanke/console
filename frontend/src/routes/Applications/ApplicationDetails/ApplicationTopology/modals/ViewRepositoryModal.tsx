/* Copyright Contributors to the Open Cluster Management project */

import { Alert, Bullseye, Icon, Spinner } from '@patternfly/react-core'
import { ModalVariant } from '@patternfly/react-core/deprecated'
import { CodeEditor, Language } from '@patternfly/react-code-editor'
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SyncEditor } from '~/components/SyncEditor/SyncEditor'
import { useTranslation } from '~/lib/acm-i18next'
import { AcmModal } from '~/ui-components'
import { getGitBlobContents } from '~/resources'
import { useSharedAtoms, useSharedValue } from '~/shared-atoms'
import type { TopologyNode } from '../types'
import {
  findRepositorySecretAccess,
  getViewTitle,
  type RepositorySecretAccess,
} from '../helpers/repositoryNavigatorHelpers'
import { ModalNavigatorLayout } from './ModalNavigatorLayout'
import { RepositoryNavigator, type RepositoryNavigatorFileItem } from './RepositoryNavigator'
import './ResourceNavigator.css'
import { getTheme } from '~/components/theme'

export interface IViewRepositoryModalProps {
  close: () => void
  open: boolean
  node: TopologyNode
}

const EXTENSION_LANGUAGE_MAP: Record<string, Language> = {
  yaml: Language.yaml,
  yml: Language.yaml,
  json: Language.json,
  js: Language.javascript,
  jsx: Language.javascript,
  ts: Language.typescript,
  tsx: Language.typescript,
  md: Language.markdown,
  sh: Language.shell,
  xml: Language.xml,
  html: Language.html,
  htm: Language.html,
}

function getLanguageForPath(path: string): Language {
  const segments = path.split('.')
  const extension = segments.length > 1 ? segments.at(-1)!.toLowerCase() : ''
  return EXTENSION_LANGUAGE_MAP[extension] ?? Language.plaintext
}

type FileContentsState =
  | { file: RepositoryNavigatorFileItem; status: 'loaded'; contents: string }
  | { file: RepositoryNavigatorFileItem; status: 'error' }

export function ViewRepositoryModal(props: IViewRepositoryModalProps | { open: false }) {
  if (props.open === false) {
    return null
  }

  return <ViewRepositoryModalContent {...props} />
}

function ViewRepositoryModalContent({ close, node }: Readonly<Omit<IViewRepositoryModalProps, 'open'>>) {
  const { t } = useTranslation()
  const [selectedFile, setSelectedFile] = useState<RepositoryNavigatorFileItem | undefined>(undefined)
  const [noFilesFound, setNoFilesFound] = useState(false)
  const [isRepositoryLoading, setIsRepositoryLoading] = useState(true)
  const [hasRepositoryLoadError, setHasRepositoryLoadError] = useState(false)
  const [fileContents, setFileContents] = useState<FileContentsState>()
  const { secretsState } = useSharedAtoms()
  const secrets = useSharedValue(secretsState)
  const secretAccess = useMemo(
    () => (selectedFile ? findRepositorySecretAccess(selectedFile.repoURL, secrets) : undefined),
    [selectedFile, secrets]
  )
  const secretAccessKey = JSON.stringify(secretAccess)
  const stableSecretAccess = useMemo<RepositorySecretAccess | undefined>(
    () => (secretAccessKey ? (JSON.parse(secretAccessKey) as RepositorySecretAccess) : undefined),
    [secretAccessKey]
  )
  const isFileLoading = !!selectedFile && fileContents?.file !== selectedFile
  const modalTitle = (node.name as string) || t('Repository')
  const selectedFileLanguage = selectedFile ? getLanguageForPath(selectedFile.path) : undefined
  const hasRepositoryErrors =
    !!node.specs.repositoryErrors?.length || hasRepositoryLoadError || noFilesFound || fileContents?.status === 'error'
  const validationErrors = useMemo(
    () =>
      (node.specs.repositoryErrors ?? [])
        .filter((error) => error.fileId === selectedFile?.id && error.line !== undefined)
        .map((error) => ({
          message: error.message,
          linePos: { start: { line: error.line!, col: 1 }, end: { line: error.line!, col: 132 } },
        })),
    [node.specs.repositoryErrors, selectedFile?.id]
  )

  useEffect(() => {
    if (!selectedFile) return
    let cancelled = false
    setFileContents(undefined)
    getGitBlobContents(selectedFile.url, stableSecretAccess?.secretArgs, stableSecretAccess?.accessData).then(
      (contents) => {
        if (!cancelled) setFileContents({ file: selectedFile, status: 'loaded', contents })
      },
      () => {
        if (!cancelled) setFileContents({ file: selectedFile, status: 'error' })
      }
    )
    return () => {
      cancelled = true
    }
  }, [selectedFile, stableSecretAccess])

  const handleSelectItem = useCallback((item: RepositoryNavigatorFileItem) => {
    setSelectedFile(item)
  }, [])

  const handleNoFilesFound = useCallback(() => {
    setNoFilesFound(true)
  }, [])

  const handleRepositoryLoadingChange = useCallback((isLoading: boolean) => {
    setIsRepositoryLoading(isLoading)
  }, [])

  let content: ReactNode = null
  if (hasRepositoryLoadError && !selectedFile) {
    content = (
      <Alert variant="danger" isInline title={t('Failed to load repository. Check access, URL, and revision.')} />
    )
  } else if (isRepositoryLoading || isFileLoading || (!selectedFile && !noFilesFound)) {
    content = (
      <Bullseye>
        <Spinner size="xl" aria-label={t('Loading')} />
      </Bullseye>
    )
  } else if (fileContents?.status === 'error') {
    content = <Alert variant="danger" isInline title={t('Failed to load repository file.')} />
  } else if (selectedFile && fileContents?.status === 'loaded') {
    if (selectedFileLanguage === Language.yaml) {
      content = (
        <SyncEditor
          editorTitle={getViewTitle(selectedFile.id)}
          variant="toolbar"
          code={fileContents.contents}
          resources={null}
          readonly
          preserveSource
          wordWrap="off"
          initialShowChanges={false}
          validationErrors={validationErrors}
        />
      )
    } else {
      content = (
        <CodeEditor
          code={fileContents.contents}
          language={selectedFileLanguage}
          isCopyEnabled
          isFullHeight
          isLineNumbersVisible
          isReadOnly
          options={{
            // Keep the normal editor appearance while preventing edits.
            readOnly: true,
            theme: getTheme(),
            wordWrap: 'off',
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
      )
    }
  } else if (noFilesFound) {
    content = (
      <Alert variant="danger" isInline title={t('No files found')}>
        {t('This repository does not contain any files to display.')}
      </Alert>
    )
  }

  return (
    <AcmModal
      id="view-repository-modal"
      isOpen={true}
      title={
        <>
          <Icon status={hasRepositoryErrors ? 'danger' : 'success'}>
            {hasRepositoryErrors ? (
              <ExclamationCircleIcon aria-label={t('Repository error')} />
            ) : (
              <CheckCircleIcon aria-label={t('Success')} />
            )}
          </Icon>{' '}
          {modalTitle}
        </>
      }
      aria-label={t('View repository')}
      showClose={true}
      onClose={close}
      variant={ModalVariant.large}
      position="top"
      hasNoBodyWrapper
    >
      <div className="resource-modal-body resource-modal-body--padded-bottom">
        <ModalNavigatorLayout
          navigator={
            <RepositoryNavigator
              node={node}
              selectedItemId={selectedFile?.id}
              onSelectItem={handleSelectItem}
              onNoFilesFound={handleNoFilesFound}
              onLoadingChange={handleRepositoryLoadingChange}
              onErrorChange={setHasRepositoryLoadError}
            />
          }
        >
          <div style={{ flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{content}</div>
        </ModalNavigatorLayout>
      </div>
    </AcmModal>
  )
}
