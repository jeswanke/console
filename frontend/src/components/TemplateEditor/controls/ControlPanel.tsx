/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import { Alert, Button } from '@patternfly/react-core'
import { PlusCircleIcon, TrashIcon } from '@patternfly/react-icons'
import classNames from 'classnames'
import React, { Component } from 'react'
import { ControlPanelProps, TemplateControl, WizardStepStructure } from '../utils/types'
import '../css/control-panel.css'
import ControlPanelAccordion from './ControlPanelAccordion'
import ControlPanelBoolean from './ControlPanelBoolean'
import ControlPanelCards from './ControlPanelCards'
import ControlPanelCheckbox from './ControlPanelCheckbox'
import ControlPanelComboBox from './ControlPanelComboBox'
import ControlPanelLabels from './ControlPanelLabels'
import ControlPanelMultiSelect from './ControlPanelMultiSelect'
import ControlPanelNumber from './ControlPanelNumber'
import ControlPanelPrompt from './ControlPanelPrompt'
import ControlPanelSingleSelect from './ControlPanelSingleSelect'
import ControlPanelSkeleton from './ControlPanelSkeleton'
import ControlPanelTextArea from './ControlPanelTextArea'
import ControlPanelTextInput from './ControlPanelTextInput'
import ControlPanelMultiTextInput from './ControlPanelMultiTextInput'
import ControlPanelTreeSelect from './ControlPanelTreeSelect'
import ControlPanelValues from './ControlPanelValues'
import ControlPanelWizard from './ControlPanelWizard'

type SectionTitle = TemplateControl | { id: string; type: string; subgroup?: boolean; content?: TemplateControl[] }

type PanelSection = {
  title: SectionTitle
  content: TemplateControl[]
}

type PanelStep = { title: SectionTitle; sections: PanelSection[] }

export default class ControlPanel extends Component<ControlPanelProps> {
  creationView?: HTMLDivElement | null
  creationViewBottomBlurrRef?: HTMLDivElement | null
  wizardRef?: unknown

  constructor(props: ControlPanelProps) {
    super(props)
  }

  componentDidMount() {
    this.refreshFading()
  }

  setCreationViewRef = (ref: HTMLDivElement | null) => {
    this.creationView = ref
  }

  setCreationViewBottomBlurrRef = (ref: HTMLDivElement | null) => {
    this.creationViewBottomBlurrRef = ref
  }

  refreshFading = () => {
    if (this.creationViewBottomBlurrRef && this.creationView) {
      const hasScrollbar = this.creationView.scrollHeight > this.creationView.clientHeight
      const towardsBottom =
        this.creationView.scrollTop + this.creationView.clientHeight > this.creationView.scrollHeight - 20
      this.creationViewBottomBlurrRef.style.display = hasScrollbar && !towardsBottom ? 'block' : 'none'
    }
  }

  setWizardRef = (ref: unknown) => {
    this.wizardRef = ref
  }

  setControlSectionRef = (title: TemplateControl, ref: HTMLDivElement | null) => {
    title.sectionRef = ref
  }

  render() {
    const { controlData, showEditor } = this.props
    const controlClasses = classNames({
      'creation-view-controls': true,
      'pf-v6-c-form': true,
      showEditor,
    })
    return (
      <div className="creation-view-controls-container">
        {this.renderControlFormOrWizard(controlData, controlClasses)}
      </div>
    )
  }

  renderControlFormOrWizard(controlData: TemplateControl[], controlClasses: string): React.ReactNode {
    let step: PanelStep | undefined
    let section: PanelSection | undefined
    let content: TemplateControl[] = []
    const steps: PanelStep[] = []
    let sections: PanelSection[] = []
    let activeStep: PanelStep | undefined
    let activeSection: PanelSection | undefined
    let stopRendering = false
    let stopRenderingOnNextControl = false
    controlData.forEach((control, inx) => {
      const { type, pauseControlCreationHereUntilSelected } = control
      stopRendering = stopRenderingOnNextControl
      if (pauseControlCreationHereUntilSelected) {
        stopRenderingOnNextControl = !control.active
      }
      const isHidden = this.isHidden(control, controlData)
      if (!stopRendering) {
        switch (type) {
          case 'step':
          case 'review':
            if (!activeStep) {
              if (content.length && !activeSection) {
                section = {
                  title: { id: `section${inx}`, type: 'section' },
                  content,
                }
                sections.push(section)
              }
              if (activeSection) {
                step = { title: { id: `step${inx}`, type: 'step' }, sections }
                steps.push(step)
              }
            }
            sections = []
            content = []
            activeSection = undefined
            activeStep = { title: control, sections }
            if (!isHidden) {
              steps.push(activeStep)
            }
            break
          case 'section':
            if (content.length && !activeSection) {
              section = {
                title: { id: `section${inx}`, type: 'section' },
                content,
              }
              sections.push(section)
            }
            content = []
            activeSection = { title: control, content }
            if (!isHidden) {
              sections.push(activeSection)
            }
            break
          default:
            if (!activeSection) {
              activeSection = {
                title: { id: `section${inx}`, type: 'section' },
                content,
              }
              sections.push(activeSection)
            }
            content.push(control)
            break
        }
      }
    })
    // if no steps, just do a form test
    if (steps.length === 0) {
      return this.renderControlForm(sections, controlClasses)
    } else {
      // else do a wizard
      return this.renderControlWizard(steps, controlClasses, controlData)
    }
  }

  renderControlForm(sections: PanelSection[], controlClasses: string): React.ReactNode {
    return (
      <React.Fragment>
        <div className={controlClasses} ref={this.setCreationViewRef} onScroll={this.refreshFading.bind(this)}>
          {this.renderPortals()}
          <div id="notifications" />
          {this.renderNotifications(true)}
          <div className="content">{this.renderControlSections(sections)}</div>
        </div>
      </React.Fragment>
    )
  }

  renderControlWizard(steps: PanelStep[], controlClasses: string, controlData: TemplateControl[]): React.ReactNode {
    const {
      handleCreateResource,
      handleCancelCreate,
      setEditorReadOnly,
      resetStatus,
      isEditing,
      creationStatus,
      backButtonOverride,
      i18n,
    } = this.props
    return (
      <ControlPanelWizard
        i18n={i18n}
        steps={steps as WizardStepStructure[]}
        controlData={controlData}
        controlClasses={controlClasses}
        setWizardRef={this.setWizardRef.bind(this)}
        handleCreateResource={handleCreateResource}
        handleCancelCreate={handleCancelCreate}
        renderControlSections={this.renderControlSections.bind(this)}
        renderNotifications={this.renderNotifications.bind(this)}
        setEditorReadOnly={setEditorReadOnly}
        resetStatus={resetStatus}
        isEditing={isEditing}
        creationStatus={creationStatus}
        backButtonOverride={backButtonOverride}
      />
    )
  }

  renderControlSections(controlSections: PanelSection[], grpId = ''): React.ReactNode {
    return controlSections.map(({ title, content: _content }) => {
      const {
        id: sectionId,
        collapsed = false,
        shadowed,
      } = title as SectionTitle & {
        collapsed?: boolean
        shadowed?: boolean
      }
      const id = sectionId ?? 'section'
      const sectionClasses = classNames({
        'creation-view-controls-section': true,
        shadowed,
        collapsed,
      })
      const sectionContainerClasses = classNames({
        'creation-view-group-subcontainer': title.subgroup,
      })
      ;(title as SectionTitle & { content?: TemplateControl[] }).content = _content
      return (
        <React.Fragment key={id}>
          <div className={sectionContainerClasses}>
            {this.renderControl(id, 'section', title as TemplateControl, grpId)}
            <div className={sectionClasses} ref={this.setControlSectionRef.bind(this, title as TemplateControl)}>
              {this.renderControls(_content, grpId)}
            </div>
          </div>
        </React.Fragment>
      )
    })
  }

  renderControls(controlData: TemplateControl[], grpId?: string): React.ReactNode {
    return (
      <React.Fragment>
        {controlData.map((control, i) => {
          const { type } = control
          const id = control.id ?? `${String(type)}-${i}`
          switch (type) {
            case 'group':
              return this.renderGroup(control, grpId)
            default:
              return this.renderControlWithFetch(id, String(type), control, grpId)
          }
        })}
      </React.Fragment>
    )
  }

  renderGroup(control: TemplateControl, grpId = ''): React.ReactNode {
    const {
      id,
      active = [],
      hidden,
      prompts,
      startWithNone,
    } = control as TemplateControl & {
      active?: TemplateControl[][]
      prompts?: TemplateControl['prompts']
      startWithNone?: boolean
    }
    active.forEach((controlData: TemplateControl[]) => {
      controlData.forEach((ctrl: TemplateControl) => {
        ctrl.group = control
      })
    })
    const isHidden = typeof hidden === 'function' ? (hidden as () => boolean)() : hidden
    // shows add button only when no mappings and startWithNone is true
    if (startWithNone && active.length === 0) {
      return (
        prompts?.addPrompt && (
          <div className="storage-mapping-buttons" key={id}>
            {this.renderAddGroupButton(control)}
          </div>
        )
      )
    }
    return (
      !isHidden && (
        <React.Fragment key={id}>
          {active.map((controlData, inx) => {
            const groupId = inx > 0 ? `${grpId}grp${inx}` : ''

            const card = controlData.find(({ type }) => type === 'cards')
            const groupType = card && Array.isArray(card.active) ? card.active.join() : 'general'

            return (
              <React.Fragment key={`${controlData[0].id}Group${inx}`}>
                <div className="creation-view-group-container" key={groupType}>
                  {prompts &&
                    (startWithNone ||
                      (prompts.disableDeleteForFirst && inx > 0) ||
                      (!prompts.disableDeleteForFirst && active.length > 1)) &&
                    this.renderDeleteGroupButton(control, inx)}
                  {this.renderGroupControlSections(controlData, inx, groupId)}
                </div>
                {prompts && prompts.addPrompt && active.length - 1 === inx && this.renderAddGroupButton(control)}
              </React.Fragment>
            )
          })}
        </React.Fragment>
      )
    )
  }

  renderGroupControlSections(controlData: TemplateControl[], grpNum: number, grpId = ''): React.ReactNode {
    // create collapsable control sections
    let section: PanelSection | undefined
    let content: TemplateControl[] = []
    let stopRendering = false
    let stopRenderingOnNextControl = false
    const controlSections: PanelSection[] = []
    controlData.forEach((control) => {
      const { type, pauseControlCreationHereUntilSelected } = control
      stopRendering = stopRenderingOnNextControl
      if (pauseControlCreationHereUntilSelected) {
        stopRenderingOnNextControl = !control.active
      }
      if (!stopRendering) {
        control.grpNum = grpNum
        if (type === 'section') {
          content = []
          section = { title: control, content }
          controlSections.push(section)
        } else {
          content.push(control)
        }
      }
    })
    return this.renderControlSections(controlSections, grpId)
  }

  // if data for 'available' is fetched from server, use apollo component
  renderControlWithFetch(id: string, type: string, control: TemplateControl, grpId?: string): React.ReactNode {
    const { fetchAvailable } = control
    if (fetchAvailable) {
      const { query, setAvailable } = fetchAvailable
      let { variables } = fetchAvailable
      if (typeof variables === 'function') {
        variables = variables(control, this.props.controlData)
      }
      const refetch = (func: () => Promise<unknown>) => {
        delete control.isLoaded
        control.isRefetching = true
        control.forceUpdate?.()
        func()
          .then((data: unknown) => {
            control.isRefetching = false
            setAvailable(control, { data })
            control.forceUpdate?.()
          })
          .catch((err: unknown) => {
            control.isRefetching = false
            setAvailable(control, { error: err })
            control.forceUpdate?.()
          })
      }

      if (!control.isLoaded) {
        if (!control.isLoading) {
          setAvailable(control, { loading: true })
          query()
            .then((data: unknown) => {
              setAvailable(control, { loading: false, data, i18n: this.props.i18n })
              control.forceUpdate?.()
            })
            .catch((err: unknown) => {
              setAvailable(control, { loading: false, error: err })
              control.forceUpdate?.()
            })
        }
      }
      fetchAvailable.refetch = refetch.bind(this, query)
    }
    return this.renderControlWithPrompt(id, type, control, grpId)
  }

  // if data for 'available' is fetched from server, use apollo component
  renderControlWithPrompt(id: string, type: string, control: TemplateControl, grpId?: string): React.ReactNode {
    const { prompts } = control
    if (prompts) {
      const { positionAboveControl } = prompts
      if (positionAboveControl) {
        return (
          <React.Fragment key={id}>
            {this.renderControlPrompt(control)}
            {this.renderControl(id, type, control, grpId)}
          </React.Fragment>
        )
      } else {
        return (
          <React.Fragment key={id}>
            {this.renderControl(id, type, control, grpId)}
            {this.renderControlPrompt(control)}
          </React.Fragment>
        )
      }
    }
    return this.renderControl(id, type, control, grpId)
  }

  renderControlPrompt(control: TemplateControl): React.ReactNode {
    const { i18n } = this.props
    return (
      <ControlPanelPrompt
        control={control}
        handleAddActive={(items) => this.handleAddActive(control, items)}
        i18n={i18n}
      />
    )
  }

  handleAddActive = (control: TemplateControl, items: unknown) => {
    control.active = items
    this.props.handleControlChange(control, this.props.controlData, this.creationView, this.props.isCustomName)
  }

  renderControl(id: string, type: string, control: TemplateControl, grpId?: string): React.ReactNode {
    const { controlData, showEditor, isLoaded, i18n, templateYAML, handleCreateResource, controlProps } = this.props
    if (this.isHidden(control, controlData)) {
      return null
    }
    const controlId = `${id}${grpId}`.replace('name', 'eman').replace('address', 'sserdda')
    control.controlId = controlId
    if (!isLoaded && !['title', 'section', 'hidden'].includes(type)) {
      return <ControlPanelSkeleton key={controlId} controlId={controlId} control={control} i18n={i18n} />
    }
    switch (type) {
      case 'title':
      case 'section':
        return (
          <ControlPanelAccordion
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            i18n={i18n}
          />
        )
      case 'text':
      case 'password':
        return (
          <ControlPanelTextInput
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'multitext':
        return (
          <ControlPanelMultiTextInput
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleControlChange.bind(this, control)}
            i18n={i18n}
            addButtonText={control.addButtonText as string}
          />
        )
      case 'textarea':
        return (
          <ControlPanelTextArea
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'singleselect':
        return (
          <ControlPanelSingleSelect
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'number':
        return (
          <ControlPanelNumber
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'combobox':
        return (
          <ControlPanelComboBox
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleControlChange={this.handleControlChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'multiselect':
        return (
          <ControlPanelMultiSelect
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'treeselect':
        return (
          <ControlPanelTreeSelect
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'cards':
        return (
          <ControlPanelCards
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            showEditor={showEditor}
            handleChange={this.handleCardChange.bind(this, control)}
            i18n={i18n}
            fetchData={this.props.fetchData}
          />
        )
      case 'labels':
        return (
          <ControlPanelLabels
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleControlChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'values':
        return (
          <ControlPanelValues
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleControlChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'boolean':
        return (
          <ControlPanelBoolean
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleControlChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'checkbox':
      case 'radio':
        return (
          <ControlPanelCheckbox
            key={controlId}
            controlId={controlId}
            control={control}
            controlData={controlData}
            handleChange={this.handleChange.bind(this, control)}
            i18n={i18n}
          />
        )
      case 'custom':
        return (
          <React.Fragment key={controlId}>
            {this.renderCustom(control, controlId, templateYAML, handleCreateResource, controlProps)}
          </React.Fragment>
        )
    }
    return null
  }

  setControlRef = (control: TemplateControl, ref: HTMLDivElement | null) => {
    control.ref = ref
  }

  renderCustom(
    control: TemplateControl,
    controlId: string,
    templateYAML: unknown,
    handleCreateResource: () => void,
    controlProps: Record<string, unknown> | undefined
  ): React.ReactNode {
    const { i18n } = this.props
    const { component } = control as TemplateControl & { component: React.ReactElement }
    const custom = React.cloneElement(component, {
      control,
      i18n,
      controlId,
      handleChange: this.handleChange.bind(this, control),
      templateYAML,
      handleCreateResource,
      controlProps,
    })
    return (
      <React.Fragment>
        <div className="creation-view-controls-custom" ref={this.setControlRef.bind(this, control)}>
          {custom}
        </div>
      </React.Fragment>
    )
  }

  handleChange(control: TemplateControl, _evt?: unknown) {
    let updateName = false
    let { isCustomName } = this.props
    const { controlData, originalControlData, onChange } = this.props
    const { id: field, type, syncWith, syncedWith } = control

    if (onChange) {
      control.refresh = () => this.props.handleControlChange(control, controlData)
      onChange(control)
    }

    switch (type) {
      case 'text':
        isCustomName = field === 'name'
        break
      case 'multiselect':
        // if user was able to select something that automatically
        // generates the name, blow away the user name
        updateName = Boolean(!isCustomName && control.updateNamePrefix)
        break
    }

    // update name if spec changed
    if (updateName) {
      let cname: string
      const nname = controlData.find(({ id }) => id === 'name')
      const activeArr = control.active as string[]
      const map = control.availableMap as Record<string, { name: string }> | undefined
      if (nname) {
        if (activeArr?.length > 0 && map && control.updateNamePrefix) {
          cname = control.updateNamePrefix + map[activeArr[0]].name.replaceAll(/\W/g, '-')
        } else {
          cname = String(originalControlData.find(({ id }) => id === 'name')?.active ?? '')
        }
        nname.active = cname.toLowerCase()
      }
    }

    // syncing values
    if (syncWith && control.groupControlData) {
      // whatever is typed into this control, also put in other control
      const syncControl = control.groupControlData.find(({ id }) => id === syncWith)
      if (syncControl) {
        syncControl.active = `${control.active as string}${(syncControl.syncedSuffix as string) || ''}`
      }
    }
    if (syncedWith && control.groupControlData) {
      // if another control is synced with this control and
      // user is typing a value here directly, remove sync
      const syncedControl = control.groupControlData.find(({ id }) => id === syncedWith)
      delete control.syncedWith
      if (syncedControl) {
        delete syncedControl.syncWith
      }
    }
    this.props.handleControlChange(control, controlData, isCustomName)
    return field
  }

  handleCardChange(control: TemplateControl, selection: string | null) {
    const { controlData, isCustomName } = this.props
    const { multiselect, newEditorMode } = control
    if (!newEditorMode) {
      if (!multiselect) {
        control.active = selection
      } else {
        const ac = control.active as string[] | undefined
        if (!ac) {
          control.active = [selection as string]
        } else {
          const inx = ac.indexOf(selection as string)
          if (inx === -1) {
            ac.push(selection as string)
          } else {
            ac.splice(inx, 1)
          }
        }
      }
      this.props.handleControlChange(control, controlData, this.creationView, isCustomName)
    } else {
      control.active = []
      if (selection) {
        ;(control.active as string[]).push(selection)
      }
      this.props.handleNewEditorMode(control, controlData, this.creationView, this.wizardRef)
    }
  }

  handleControlChange(control: TemplateControl) {
    const { controlData, onChange } = this.props
    if (onChange) {
      control.refresh = () => this.props.handleControlChange(control, controlData)
      onChange(control)
    }
    this.props.handleControlChange(control, controlData)
  }

  renderPortals(): React.ReactNode {
    const { showPortals } = this.props
    if (showPortals) {
      return (
        <div className="creation-view-portals">
          {Object.values(showPortals).map((id) => {
            return <div id={id} key={id} />
          })}
        </div>
      )
    }
    return null
  }

  renderNotifications(isForm?: boolean): React.ReactNode {
    const { notifications = [] } = this.props
    const margin = isForm ? '20px' : '20px 0'
    if (notifications.length > 0) {
      return (
        <React.Fragment>
          <div className="creation-view-controls-notifications" style={{ margin }}>
            {notifications.map(({ exception, variant = 'danger' }) => {
              return <Alert key={exception} variant={variant} title={exception} isInline></Alert>
            })}
          </div>
          <div className="creation-view-controls-notifications-footer" />
        </React.Fragment>
      )
    }
    return null
  }

  renderDeleteGroupButton(control: TemplateControl, inx: number): React.ReactNode {
    const { controlData } = this.props
    const {
      prompts: { deletePrompt },
    } = control as TemplateControl & { prompts: { deletePrompt: string } }
    const handleGroupChange = () => {
      this.props.handleGroupChange(control, controlData, this.creationView, inx)
    }
    return (
      <Button
        icon={<TrashIcon />}
        variant="plain"
        className="creation-view-controls-delete-button"
        tabIndex={0}
        title={deletePrompt}
        aria-label={deletePrompt}
        onClick={handleGroupChange}
        size="sm"
      />
    )
  }

  renderAddGroupButton(control: TemplateControl): React.ReactNode {
    const { controlData } = this.props
    const {
      prompts: { addPrompt },
    } = control as TemplateControl & { prompts: { addPrompt: string } }
    const handleGroupChange = () => {
      this.props.handleGroupChange(control, controlData, this.creationView)
    }

    return (
      <Button id={`add-${control.id}`} variant="link" onClick={handleGroupChange} icon={<PlusCircleIcon />} size="sm">
        {addPrompt}
      </Button>
    )
  }

  isHidden(control: TemplateControl, controlData: TemplateControl[]) {
    const { hidden } = control
    return hidden === true || hidden === 'true' || (typeof hidden === 'function' && hidden(control, controlData))
  }
}
