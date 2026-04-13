/* Copyright Contributors to the Open Cluster Management project */

import React from 'react'
import classNames from 'classnames'
import { SearchInput } from '@patternfly/react-core'
import '../css/editor-bar.css'
import { AngleLeftIcon, AngleRightIcon, CloseIcon, RedoIcon, UndoIcon } from '@patternfly/react-icons'

type EditorBarCommand = 'next' | 'previous' | 'copyAll' | 'undo' | 'redo' | 'restore' | 'close'

interface EditorBarButtonSpec {
  command: EditorBarCommand | string
  tooltip: string
  icon?: string
  disabled?: boolean
  spacer?: boolean
}

interface EditorButtonProps {
  command: EditorBarCommand | string
  button: EditorBarButtonSpec
  handleClick: (command: EditorBarCommand | string) => void
}

class EditorButton extends React.Component<EditorButtonProps> {
  handleClick = () => {
    const {
      command,
      button: { disabled },
    } = this.props
    if (!disabled) {
      const active = document.activeElement
      if (active && 'blur' in active && typeof (active as HTMLElement).blur === 'function') {
        ;(active as HTMLElement).blur()
      }
      this.props.handleClick(command)
    }
  }

  handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      this.props.handleClick(this.props.command)
    }
  }

  renderIcon(icon: string | undefined) {
    switch (icon) {
      case 'close':
        return <CloseIcon />
      case 'undo':
        return <UndoIcon />
      case 'redo':
        return <RedoIcon />
      case 'next':
        return <AngleRightIcon />
      case 'previous':
        return <AngleLeftIcon />
      default:
        return undefined
    }
  }

  render() {
    const {
      button: { disabled, tooltip, icon, spacer, command },
    } = this.props
    if (spacer) {
      return <div className="editor-bar-spacer" />
    }
    const classes = classNames({
      'editor-bar-button': true,
      [`${command}`]: true,
      disabled,
    })
    return (
      <div
        className={classes}
        tabIndex={0}
        role={'button'}
        aria-label={tooltip}
        title={tooltip}
        id={`${icon}-button`}
        onClick={this.handleClick}
        onKeyPress={this.handleKeyPress}
      >
        {icon ? this.renderIcon(icon) : <div>{tooltip}</div>}
      </div>
    )
  }
}

export interface EditorBarProps {
  handleEditorCommand: (command: EditorBarCommand | string) => void
  handleSearchChange: (searchName: string) => void
  hasRedo: boolean
  hasUndo: boolean
  i18n?: (key: string) => string
  title: string
  type: string
}

interface EditorBarState {
  searchName: string
}

class EditorBar extends React.Component<EditorBarProps, EditorBarState> {
  constructor(props: EditorBarProps) {
    super(props)
    this.state = {
      searchName: '',
    }
  }

  handleClick = (command: EditorBarCommand | string) => {
    this.props.handleEditorCommand(command)
  }

  handleSearch = (_event: React.FormEvent<HTMLInputElement>, value: string) => {
    this.props.handleSearchChange(value)
    this.setState({ searchName: value })
  }

  handleClear = () => {
    this.props.handleSearchChange('')
    this.setState({ searchName: '' })
  }

  render() {
    const { hasUndo, hasRedo, type, title, i18n } = this.props
    const { searchName } = this.state

    const undoButtons: EditorBarButtonSpec[] = [
      {
        command: 'undo',
        tooltip: i18n ? i18n('editor.bar.undo') : 'Undo',
        icon: 'undo',
        disabled: !hasUndo,
      },
      {
        command: 'redo',
        tooltip: i18n ? i18n('editor.bar.redo') : 'Redo',
        icon: 'redo',
        disabled: !hasRedo,
      },
    ]

    const nextButtons: EditorBarButtonSpec[] = [
      {
        command: 'previous',
        tooltip: i18n ? i18n('editor.bar.previous') : 'Previous',
        icon: 'previous',
        disabled: !searchName,
      },
      {
        command: 'next',
        tooltip: i18n ? i18n('editor.bar.next') : 'Next',
        icon: 'next',
        disabled: !searchName,
      },
    ]

    const resetButtons: EditorBarButtonSpec[] = [
      {
        command: 'restore',
        tooltip: i18n ? i18n('editor.bar.reset') : 'Reset',
        disabled: !hasUndo && !hasRedo,
      },
    ]

    const closeButtons: EditorBarButtonSpec[] = [
      {
        command: 'close',
        tooltip: i18n ? i18n('editor.bar.close') : 'Close',
        icon: 'close',
      },
    ]

    const searchTitle = i18n ? i18n('find.label') : 'Find'
    return (
      <div className="editor-bar">
        <div className="editor-bar-group">
          <div className="editor-bar-title">{title}</div>
        </div>
        <div className="editor-bar-group">
          <div className="editor-bar-toolbar">
            <div className="editor-bar-section">
              {resetButtons.map((button) => {
                const { command } = button
                return <EditorButton key={command} command={command} button={button} handleClick={this.handleClick} />
              })}
            </div>
            <div className="editor-bar-section">
              {undoButtons.map((button) => {
                const { command } = button
                return <EditorButton key={command} command={command} button={button} handleClick={this.handleClick} />
              })}
            </div>
            <div className="editor-bar-section">
              <div className="editor-bar-search" role="region" aria-label={searchTitle} id={searchTitle}>
                <SearchInput
                  id={`template-editor-search-${type}`}
                  value={searchName}
                  aria-label={searchTitle}
                  placeholder={searchTitle}
                  onChange={this.handleSearch}
                  onClear={this.handleClear}
                />
                {nextButtons.map((button) => {
                  const { command } = button
                  return <EditorButton key={command} command={command} button={button} handleClick={this.handleClick} />
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="editor-bar-close">
          <div className="editor-bar-section">
            {closeButtons.map((button) => {
              const { command } = button
              return <EditorButton key={command} command={command} button={button} handleClick={this.handleClick} />
            })}
          </div>
        </div>
      </div>
    )
  }
}

export default EditorBar
