/* Copyright Contributors to the Open Cluster Management project */
'use strict'

import jsYaml from 'js-yaml'
import { generateTemplateData } from './refresh-source-from-templates'

import get from 'lodash/get'
import set from 'lodash/set'

type YamlExceptionEntry = { row: number; text: string; tabInx: number; controlId?: string }
type YamlTabException = { exceptions: YamlExceptionEntry[] }
type OtherYamlTab = { id: string; templateYAML: string }
type RowError = { text: string; controlId?: string }
/** Per-tab: sparse array keyed by 1-based row → error lines for that row */
type RowErrorsByRow = (RowError[] | undefined)[]

export const logSourceErrors = (
  logging: boolean,
  templateYAML: string,
  controlData: unknown,
  otherYAMLTabs: OtherYamlTab[],
  templateExceptionMap: Record<string, YamlTabException>
) => {
  if (logging) {
    //////////////////////////////// SOURCE ERRORS //////////////////////////////////////
    // Built with lodash get/set on a sparse nested structure (tab index → row index → messages)
    const errors: RowErrorsByRow[] = []
    const tabIds = ['Main YAML']
    Object.values(templateExceptionMap).forEach(({ exceptions }) => {
      exceptions.forEach(({ row, text, tabInx, controlId }) => {
        const tabErrors = get(errors, `${tabInx}`, []) as RowErrorsByRow
        const rowErrors = get(tabErrors, `${row}`, []) as RowError[]
        rowErrors.push({ text, controlId })
        set(tabErrors, `${row}`, rowErrors)
        set(errors, `${tabInx}`, tabErrors)
      })
    })
    const yamls = [templateYAML]
    otherYAMLTabs.forEach(({ id, templateYAML: yaml }) => {
      tabIds.push(id)
      yamls.push(yaml)
    })

    if (errors.length) {
      console.group('!!!!!!!!!!!!!!!!!! YAML ERRORS !!!!!!!!!!!!!!!!!!!!!!')

      // errors at top
      errors.forEach((tabErrors, tabInx) => {
        tabErrors?.forEach((rowErrors, rowInx) => {
          rowErrors?.forEach(({ text }) => {
            console.info(`${tabIds[tabInx]} ${rowInx + 1}: ${text}`)
          })
        })
      })
      console.groupEnd()
    }

    //////////////////////////////// YAML //////////////////////////////////////
    console.groupCollapsed('\n==================YAML OUTPUT=====================')
    // log YAML with errors
    yamls.forEach((yaml, tabInx) => {
      console.info(`\n//////////////////////// ${tabIds[tabInx]} ///////////////`)
      const output: string[] = []
      const tabErrors = errors[tabInx] || []
      const lines = yaml.split('\n')
      lines.forEach((line, row) => {
        output.push(`${row + 1} ${line}`)
        const rowErrors = tabErrors[row + 1] || []
        rowErrors.forEach(({ text }) => {
          output.push(`********* ${text}`)
        })
      })
      console.info(output.join('\n'))
    })
    console.groupEnd()

    //////////////////////////////// INPUT //////////////////////////////////////
    console.groupCollapsed('==================TEMPLATE INPUT======================')
    const replacements: unknown[] = []
    const controlMap: Record<string, unknown> = {}
    const templateData = generateTemplateData(controlData, replacements, controlMap)
    try {
      const input = jsYaml.dump(templateData, {
        noRefs: true,
        lineWidth: 200,
      })
      console.info(input)
    } catch {
      // nothing
    }
    console.groupEnd()
  }
}

type CreationMessage = { message: string }
type ResourceJsonLog = { createResources: unknown }

export const logCreateErrors = (logging: boolean, creationMsg: CreationMessage[], resourceJSON: ResourceJsonLog) => {
  if (logging) {
    console.group('!!!!!!!!!!!!!!!!!! CREATE ERRORS !!!!!!!!!!!!!!!!!!!!!!')

    creationMsg.forEach(({ message }) => {
      console.info(message)
    })
    console.groupEnd()

    //////////////////////////////// INPUT //////////////////////////////////////
    console.groupCollapsed('==================RESOURCE JSON======================')
    try {
      const input = jsYaml.dump(resourceJSON.createResources, {
        noRefs: true,
        lineWidth: 200,
      })
      console.info(input)
    } catch {
      // nothing
    }
    console.groupEnd()
  }
}
