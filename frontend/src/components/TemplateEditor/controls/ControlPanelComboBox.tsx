/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import React, { Component } from 'react'
import classNames from 'classnames'
import { Spinner } from '@patternfly/react-core'
import ControlPanelFormGroup from './ControlPanelFormGroup'
import TimesCircleIcon from '@patternfly/react-icons/dist/js/icons/times-circle-icon'
import CheckIcon from '@patternfly/react-icons/dist/js/icons/check-icon'
import set from 'lodash/set'
import get from 'lodash/get'
import uniq from 'lodash/uniq'
import invert from 'lodash/invert'
import noop from 'lodash/noop'
import { ControlPanelComboBoxProps, TemplateControl } from '../utils/types'

type ComboBoxState = {
  isOpen: boolean
  isBlurred: boolean
  searchText: string | null
  sortToTop: string | null
  currentSelection?: string
  preselect?: boolean
  typedText?: string
  active?: unknown
  currentAvailable?: unknown[]
}

export default class ControlPanelComboBox extends Component<ControlPanelComboBoxProps, ComboBoxState> {
  controlRef: HTMLDivElement | null = null
  inputRef: HTMLInputElement | null = null
  menuRef: HTMLDivElement | null = null
  clearRef: HTMLDivElement | null = null
  toggleRef: HTMLDivElement | null = null
  menuClick = false

  static getDerivedStateFromProps(props: ControlPanelComboBoxProps, state: ComboBoxState) {
    const { control, handleControlChange } = props
    const handleComboChange = (selectedItem: string) => {
      if (!control.disabled) {
        const next = (selectedItem || '').trim()
        control.active = next
        if (control.lastActive !== next) {
          control.lastActive = next
          handleControlChange()
        }
      }
    }
    const { active, available } = control as { active?: string; available?: string[] }
    const { currentSelection } = state
    let { isOpen, preselect, searchText } = state
    const { isBlurred, typedText } = state
    const setAvailableMap =
      (get(control, 'fetchAvailable.setAvailableMap') as ((c: TemplateControl) => void) | undefined) || noop

    /////////////////////////////////////////////////////////////
    // search mode
    if (searchText && searchText.length && !preselect) {
      // nothing selected, filter list
      if (currentSelection === undefined) {
        if (isBlurred) {
          const { userData = [] } = control as TemplateControl & { userData?: string[] }
          if (!userData.includes(searchText) && available && !(available as string[]).includes(searchText)) {
            control.active = searchText
            userData.push(searchText)
            set(control, 'userData', userData)

            // make sure whatever user types in has an availableMap entry
            setAvailableMap(control)
          }
          handleComboChange(searchText)
          searchText = null
          isOpen = false
        } else {
          isOpen = true
        }
      } else {
        // handle change
        handleComboChange(currentSelection)
        isOpen = false
        searchText = null
      }
    } else if (currentSelection !== undefined) {
      // handle change
      handleComboChange(currentSelection)
      searchText = null
      isOpen = false
      preselect = false
    } else if (isBlurred && !preselect) {
      handleComboChange(String((typedText as string | undefined) ?? active ?? ''))
      isOpen = false
    }
    return {
      active,
      currentSelection: undefined,
      isOpen,
      isBlurred: false,
      preselect,
      searchText,
    }
  }

  constructor(props: ControlPanelComboBoxProps) {
    super(props)
    this.state = {
      isOpen: false,
      isBlurred: false,
      searchText: null,
      sortToTop: null,
    }
  }

  setControlRef = (ref: HTMLDivElement | null) => {
    this.controlRef = ref
  }

  setInputRef = (ref: HTMLInputElement | null) => {
    this.inputRef = ref
  }

  setMenuRef = (ref: HTMLDivElement | null) => {
    this.menuRef = ref
  }

  setClearRef = (ref: HTMLDivElement | null) => {
    this.clearRef = ref
  }

  setToggleRef = (ref: HTMLDivElement | null) => {
    this.toggleRef = ref
  }

  render() {
    const { isOpen, searchText, sortToTop } = this.state
    const { controlId, i18n, control, controlData } = this.props
    const {
      name,
      userData = [],
      availableMap,
      exception,
      hasReplacements,
      isRefetching,
      disabled,
      simplified,
      describe,
    } = control as TemplateControl & {
      name: string
      userData?: string[]
      availableMap?: Record<string, string>
      hasReplacements?: boolean
      isRefetching?: boolean
      describe?: boolean
    }
    const { isLoading } = control
    let {
      active,
      available = [],
      placeholder = '',
    } = control as {
      active?: string
      available?: string[]
      placeholder?: string
    }
    if (!placeholder) {
      placeholder = i18n('creation.enter.value', [name.toLowerCase()])
    }
    available = uniq([...userData, ...available])

    // when available map has descriptions of choices
    // ex: instance types have # cpu's etc
    const commented = availableMap && !hasReplacements
    if (commented && availableMap) {
      const map = invert(availableMap) as Record<string, string>
      active = map[active as string] || active
    }

    let currentAvailable = available
    if (!isLoading && searchText && searchText.length) {
      const findText = searchText.toLowerCase()
      currentAvailable = available.filter((item) => {
        return item.toLowerCase().includes(findText)
      })
    } else if (sortToTop) {
      currentAvailable.sort((a, b) => {
        if (a.includes(sortToTop) && !b.includes(sortToTop)) {
          return -1
        } else if (!a.includes(sortToTop) && b.includes(sortToTop)) {
          return 1
        }
        return 0
      })
    }
    const items = currentAvailable.map((label, inx) => {
      return { label, id: inx }
    })
    const key = `${controlId}-${name}-${active}`
    const toggleClasses = classNames({
      'tf--list-box__menu-icon': true,
      'tf--list-box__menu-icon--open': isOpen,
    })
    const toggleStyles = { height: isOpen ? '10%' : '100%' }
    const inputClasses = classNames({
      'pf-v6-c-form-control': true,
      input: true,
      disabled: disabled,
    })
    const aria = isOpen ? i18n('Close menu') : i18n('Open menu')
    const validated = exception ? 'error' : undefined
    let value = typeof searchText === 'string' ? searchText : active || ''
    const isCustom = userData.includes(value)
    value = (!isOpen && !searchText && !isCustom && simplified && simplified(value, control)) || value
    const cancelToggle = simplified && !(!isOpen && !searchText && !isCustom)

    return (
      <React.Fragment>
        <div className="creation-view-controls-combobox">
          <ControlPanelFormGroup i18n={i18n} controlId={controlId} control={control} controlData={controlData}>
            {isLoading || isRefetching ? (
              <div className="creation-view-controls-singleselect-loading  pf-v6-c-form-control">
                <Spinner size="md" />
                <div>{active}</div>
              </div>
            ) : (
              <div id={`${controlId}-group`} ref={this.setControlRef}>
                <div role="listbox" aria-label={i18n('Choose an item')} tabIndex={0} className="tf--list-box">
                  <div
                    role="button"
                    className=""
                    tabIndex={0}
                    aria-label={aria}
                    aria-expanded={isOpen}
                    aria-haspopup="true"
                    data-toggle="true"
                    onClick={cancelToggle ? noop : this.clickToggle.bind(this)}
                    onKeyPress={cancelToggle ? noop : this.pressToggle.bind(this)}
                  >
                    <div className={inputClasses}>
                      <input
                        className="pf-v6-c-form-control"
                        aria-label={name || i18n('Options menu')}
                        spellCheck="false"
                        role="combobox"
                        disabled={disabled}
                        aria-controls={key}
                        aria-expanded="true"
                        autoComplete="off"
                        id={controlId}
                        placeholder={placeholder}
                        ref={this.setInputRef}
                        style={validated === 'error' ? { borderBottomColor: 'red' } : undefined}
                        value={value}
                        onBlur={this.blur.bind(this)}
                        onKeyUp={this.pressUp.bind(this)}
                        onKeyDown={this.pressDown.bind(this)}
                        onFocus={(e) => {
                          if (!simplified) {
                            e.target.select()
                          }
                        }}
                        // if user is editing value, strip comment
                        onClick={(evt) => {
                          if (commented && !searchText) {
                            setTimeout(() => {
                              const target = evt.target as HTMLInputElement
                              const { selectionStart: inx } = target
                              if (inx !== null && inx !== 0 && inx === target.selectionEnd) {
                                this.setState({
                                  searchText: (availableMap && (availableMap[active as string] || active)) as string,
                                })
                                target.setSelectionRange(inx, inx)
                              }
                            }, 0)
                          }
                        }}
                        onChange={(evt) => {
                          this.setState({
                            searchText: evt.currentTarget.value,
                            typedText: evt.currentTarget.value,
                          })
                        }}
                        data-testid={`combo-${controlId}`}
                      />
                    </div>

                    {!disabled && (searchText || active) && (
                      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                      <div
                        role="button"
                        className="tf--list-box__selection"
                        tabIndex={0}
                        style={{ color: '#6a6e73' }}
                        title={i18n('Clear selected item')}
                        ref={this.setClearRef}
                        onClick={this.clickClear.bind(this)}
                      >
                        <TimesCircleIcon aria-hidden />
                      </div>
                    )}
                    {!disabled && (
                      <div
                        role="button"
                        tabIndex={0}
                        className={toggleClasses}
                        ref={this.setToggleRef}
                        onClick={this.clickToggle.bind(this)}
                        onKeyPress={this.pressToggle.bind(this)}
                        style={toggleStyles}
                      >
                        <svg fillRule="evenodd" height="5" role="img" viewBox="0 0 10 5" width="10" aria-label={aria}>
                          <title>{i18n('Close menu')}</title>
                          <path d="M0 0l5 4.998L10 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {!disabled && isOpen && (
                    <div
                      className="pf-v6-c-menu pf-m-scrollable"
                      key={key}
                      id={key}
                      ref={this.setMenuRef}
                      role="presentation"
                      onMouseDown={() => {
                        this.menuClick = true
                      }}
                      onMouseUp={() => {
                        this.menuClick = false
                      }}
                    >
                      <div className="pf-v6-c-menu__content">
                        <ul role="listbox" aria-multiselectable="false" className="pf-v6-c-menu__list">
                          {items.map(({ label, id }) => (
                            <li key={label} className="pf-v6-c-menu__list-item" role="none">
                              <button
                                id={`${controlId}-item-${id}`}
                                type="button"
                                tabIndex={id === 0 ? 0 : -1}
                                className="pf-v6-c-menu__item"
                                role="option"
                                aria-selected={label === active}
                                onMouseDown={() => this.setState({ preselect: true })}
                                onClick={this.clickSelect.bind(this, label)}
                                onKeyPress={this.pressSelect.bind(this, label)}
                              >
                                <span className="pf-v6-c-menu__item-main">
                                  <span className="pf-v6-c-menu__item-text">
                                    {this.renderLabel(
                                      label,
                                      searchText,
                                      String(active ?? ''),
                                      control,
                                      simplified,
                                      describe
                                    )}
                                  </span>
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ControlPanelFormGroup>
        </div>
      </React.Fragment>
    )
  }

  renderLabel(
    label: string,
    searchText: string | null,
    active: string,
    control: TemplateControl,
    simplified?: (value: string, c: TemplateControl) => string | undefined,
    _describe?: boolean
  ) {
    const isCustom = control.userData && control.userData.includes(label)
    if (isCustom || searchText) {
      if (!searchText) {
        return <React.Fragment>{label}</React.Fragment>
      } else {
        const inx = label.toLowerCase().indexOf(searchText.toLowerCase())
        const parts = [
          label.substring(0, inx),
          label.substring(inx, inx + searchText.length),
          label.substring(inx + searchText.length),
        ]
        return (
          <React.Fragment>
            {parts[0]}
            <b>{parts[1]}</b>
            {parts[2]}
          </React.Fragment>
        )
      }
    } else {
      let title = simplified && simplified(label, control)
      let rowLabel = label
      if (control.availableInfo) {
        title = label
        rowLabel = control.availableInfo[label] as string
      }
      return (
        <div className="tf--list-box__menu-item-container">
          {title ? (
            <div>
              <div style={{ lineHeight: '14px', fontSize: '16px' }}>{title}</div>
              <div style={{ fontSize: '12px' }}>{rowLabel}</div>
            </div>
          ) : (
            <div style={{ lineHeight: '14px', fontSize: '16px' }}>{rowLabel}</div>
          )}
          {rowLabel === active && (
            <span className="tf-select__menu-item-icon">
              <CheckIcon aria-hidden />
            </span>
          )}
        </div>
      )
    }
  }

  blur() {
    if (!this.menuClick) {
      this.setState({ isBlurred: true })
    }
  }

  pressUp(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && this.state.searchText) {
      this.inputRef?.blur()
    }
  }

  pressDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      this.clickClear()
    } else if (e.key === 'Tab') {
      this.setState({ isBlurred: true })
    }
  }

  pressToggle(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      this.clickToggle(e as unknown as React.MouseEvent)
    } else if (e.key === 'Escape') {
      this.clickClear()
    }
  }

  clickToggle(e?: React.MouseEvent | null) {
    if (e) {
      e.stopPropagation()
    }
    const clickedWithinClear = e && this.clearRef && this.clearRef.contains && this.clearRef.contains(e.target as Node)
    const clickedWithinToggle =
      e && this.toggleRef && this.toggleRef.contains && this.toggleRef.contains(e.target as Node)
    if (!(this.state.searchText || clickedWithinClear) || clickedWithinToggle) {
      const { control } = this.props
      const { simplified } = control as { simplified?: (v: string, c: TemplateControl) => string | undefined }
      this.setState((preState) => {
        let { currentAvailable, currentSelection, sortToTop, searchText, isOpen } = preState
        isOpen = !isOpen
        if (!isOpen) {
          currentAvailable = []
          currentSelection = undefined
          searchText = null
        } else if (this.inputRef?.value && !simplified) {
          sortToTop = this.inputRef.value
        }
        return {
          currentAvailable,
          currentSelection,
          sortToTop,
          searchText,
          isOpen,
        }
      })
    }
  }

  pressSelect(label: string, e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      this.clickSelect(label)
    }
  }

  clickSelect(label: string) {
    this.setState({ currentSelection: label, isOpen: false })
  }

  clickClear() {
    this.setState({ searchText: null })
    const { control, handleControlChange } = this.props
    control.active = ''
    control.lastActive = ''
    handleControlChange()
  }
}
