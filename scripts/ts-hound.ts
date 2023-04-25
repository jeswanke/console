/* Copyright Contributors to the Open Cluster Management project */

import path from 'path'
import ts from 'typescript'
import cloneDeep from 'lodash/cloneDeep'
import { Table } from 'console-table-printer'
import chalk from 'chalk'

const showOptionals = false
let options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
}

const MAX_SHOWN_PROP_MISMATCH = 6
const simpleTypes = ['string', 'number', 'boolean', 'bigint', 'Date', 'any', 'unknown', 'never']

// ===============================================================================
// ===============================================================================
// ===============================================================================

function whenSimpleTypesDontMatch(suggestions, _problem, context, stack) {
  // at this point:
  //  problem-- contains the conflicting types
  //  stack-- contains all of the parent "var: type" that led us here
  //
  const layer = stack[stack.length - 1]
  const { sourceInfo, targetInfo } = layer
  const { sourceName, targetName } = context
  switch (targetInfo.typeText) {
    case 'number':
      if (!Number.isNaN(Number(sourceInfo.typeValue))) {
        suggestions.push(`\nBEST: Convert ${sourceName} to number here: ${chalk.blueBright(sourceInfo.nodeLink)}`)
        suggestions.push(`\n          ${chalk.greenBright(`${targetInfo.nodeText} = Number(${sourceInfo.nodeText})`)}`)
      }
      break
    case 'string':
      suggestions.push(
        `\nBEST: Convert ${sourceName} to string with ${chalk.green(
          `String(${sourceInfo.nodeText}).toString()`
        )} here: ${chalk.blueBright(sourceInfo.nodeLink)}`
      )
      break
    case 'boolean':
      suggestions.push(`\nBEST: Convert ${sourceName} to boolean here: ${chalk.blueBright(sourceInfo.nodeLink)}`)
      suggestions.push(`\n          ${chalk.greenBright(`${targetInfo.nodeText} = !!${sourceInfo.nodeText}`)}`)
      break
  }
  suggestions.push(
    `\nGOOD: Union ${targetName} with ${chalk.green(`| ${sourceInfo.typeText}`)} here: ${chalk.blueBright(
      context.targetDeclared ? getNodeLink(context.targetDeclared) : targetInfo.nodeLink
    )}`
  )
  suggestions.push(`\n          ${chalk.greenBright(`${targetInfo.fullText} | ${sourceInfo.typeText}`)}`)
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function whenArraysDontMatch(suggestions, problem, _context, stack) {
  // at this point:
  //  problem-- contains the conflicting types
  //  stack-- contains all of the parent "var: type" that led us here
  //
  const layer = stack[stack.length - 1]
  const { sourceInfo, targetInfo } = layer
  if (isArrayType(problem.sourceInfo.type)) {
    suggestions.push(
      `\n Did you mean to assign just one element of the ${chalk.greenBright(
        sourceInfo.nodeText
      )} array here?: ${chalk.blueBright(sourceInfo.nodeLink)}`
    )
    suggestions.push(`\n          ${chalk.greenBright(`${targetInfo.fullText} = ${sourceInfo.nodeText}[0]`)}`)
  } else {
    suggestions.push('ruh roh')
  }
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
// at this point:
//  problem-- contains the conflicting types
//  stack-- contains all of the parent "var: type" that led us here
//
function whenUndefinedTypeDoesntMatch(suggestions, problem, context, stack) {
  const layer = stack[stack.length - 1]
  const { sourceInfo, targetInfo } = layer
  const { targetName } = context
  if (problem.targetInfo.typeText === 'undefined') {
    suggestions.push(
      `\nBEST: Change the ${targetName} ${chalk.green(targetInfo.nodeText)} type to ${chalk.green(
        sourceInfo.typeText
      )} here: ${chalk.blueBright(targetInfo.nodeLink)}`
    )
  } else {
    suggestions.push(
      `\nBEST: Union ${targetName} type with ${chalk.green('| undefined')} here: ${chalk.blueBright(
        context.targetDeclared ? getNodeLink(context.targetDeclared) : targetInfo.nodeLink
      )}`
    )
    suggestions.push(`\n          ${chalk.greenBright(`${targetInfo.typeText} | undefined`)}`)
  }
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
// at this point:
//  problem-- contains the conflicting types
//  stack-- contains all of the parent "var: type" that led us here
//
function whenNeverTypeDoesntMatch(suggestions, problem, context, stack) {
  const layer = stack[stack.length - 1]
  const { sourceInfo, targetInfo } = layer
  const { targetName } = context
  if (problem.sourceInfo.typeText === 'never[]' && context.targetDeclared) {
    suggestions.push(
      `\nBEST: Declare the following type for ${chalk.green(context.targetDeclared.name.text)} here: ${chalk.blueBright(
        getNodeLink(context.targetDeclared)
      )}`
    )
    suggestions.push(
      `\n          ${chalk.greenBright(`${context.targetDeclared.name.text}: ${targetInfo.typeText}[]`)}`
    )
  } else if (problem.targetInfo.typeText.startsWith('never')) {
    suggestions.push(`NOTE: ${targetName}s use the 'never' type to catch code paths that shouldn't be executing`)
    suggestions.push(`BEST: Determine what code path led to this point and fix it`)
    suggestions.push(
      `GOOD: If appropriate, change the ${targetName} ${chalk.green(targetInfo.nodeText)} type to ${chalk.green(
        sourceInfo.typeText
      )} here: ${chalk.blueBright(context.targetDeclared ? getNodeLink(context.targetDeclared) : targetInfo.nodeLink)}`
    )
  } else {
    suggestions.push('ruh roh')
  }
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
// at this point:
//  problem-- contains the conflicting types
//  stack-- contains all of the parent "var: type" that led us here
//

function whenUnknownTypeDoesntMatch(suggestions, problem, context, stack) {
  suggestions.push('whenUnknownTypeDoesntMatch')
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
// at this point:
//  problem-- contains the conflicting types
//  stack-- contains all of the parent "var: type" that led us here
//

function whenPrototypesDontMatch(suggestions, problem, context, stack) {
  const layer = stack[stack.length - 1]
  const { sourceInfo, targetInfo } = layer
  const { sourceName, targetName } = context
  if (isFunctionType(problem.targetInfo.type) && isFunctionType(problem.sourceInfo.type)) {
    suggestions.push(
      `\nThe ${targetName} ${chalk.greenBright('function prototype')} here: ${chalk.blueBright(sourceInfo.nodeLink)}`
    )
    suggestions.push(
      `\nDoes not match the ${sourceName} ${chalk.greenBright('function prototype')} here: ${chalk.blueBright(
        sourceInfo.nodeLink
      )}`
    )
  } else if (isFunctionType(problem.targetInfo.type)) {
    suggestions.push(
      `\n The ${targetName} is a ${chalk.greenBright(
        'function prototype'
      )} but the ${sourceName} is expecting a ${chalk.greenBright(sourceInfo.typeText)} here: ${chalk.blueBright(
        sourceInfo.nodeLink
      )}`
    )
  } else {
    suggestions.push(
      `\n The ${sourceName} is a ${chalk.greenBright(
        'function prototype'
      )} but the ${targetName} is expecting a ${chalk.greenBright(targetInfo.typeText)} here: ${chalk.blueBright(
        targetInfo.nodeLink
      )}`
    )
  }
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
// at this point:
//  problem-- contains the conflicting types
//  stack-- contains all of the parent "var: type" that led us here
//

function whenCallArgumentsDontMatch(suggestions, problem, context, stack) {
  const { callPrototypeMatchUps } = context
  if (callPrototypeMatchUps.length > 1) {
    // see if arg types are mismatched
    const indexes: number[] = []
    if (
      callPrototypeMatchUps.every(({ targetTypeText }) => {
        return (
          callPrototypeMatchUps.findIndex(({ sourceTypeText }, inx) => {
            if (targetTypeText === sourceTypeText && !indexes.includes(inx + 1)) {
              indexes.push(inx + 1)
              return true
            }
            return false
          }) !== -1
        )
      })
    ) {
      suggestions.push(
        `\nDid you mean to call the arguments in this order ${chalk.greenBright(
          indexes.join(', ')
        )} here?: ${chalk.blueBright(context.targetLink)}`
      )
      return
    }
  }

  otherPossibleSuggestions(suggestions, problem, context, stack)
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
// at this point:
//  problem-- contains the conflicting types
//  stack-- contains all of the parent "var: type" that led us here
//

function whenTypeShapesDontMatch(suggestions, problem, context, stack) {
  didYouMeanChildProperty(suggestions, problem, context, stack)
  suggestPartialInterfaces(suggestions, problem, context, stack)
  // if type is an inferred structure
  //    recommend converting it into this interface:
  //    and replace here LINK
  //    and replace here LINK
}

function didYouMeanChildProperty(suggestions, problem, context, stack) {
  // see if the source type we are trying to match with the target type
  // has an inner property type that matches the target type
  // ex: target is this: resource: {resource: IResource} and source is this: resource: IResource
  //      solution is to use resource.resource
  if (context.targetMap) {
    const layer = stack[stack.length - 1]
    const { targetInfo } = layer
    Object.values(context.targetMap).forEach((target: any) => {
      if (
        Object.values(context.sourceMap).every((source: any) => {
          return source?.parentInfo?.typeText === target.typeText
        })
      ) {
        suggestions.push(
          `\n Did you mean to use ${chalk.greenBright(
            `${targetInfo.nodeText}.${target.nodeText}`
          )} instead of ${chalk.greenBright(targetInfo.nodeText)} here?: ${chalk.blueBright(targetInfo.nodeLink)}`
        )
      }
    })
  }
}

function suggestPartialInterfaces(suggestions, _problem, context, _stack) {
  const partialInterfaces: any[] = []
  if (Object.keys(context?.missingInterfaceMaps?.sourceInterfaceMap || {}).length > 0) {
    Object.values(context.missingInterfaceMaps.sourceInterfaceMap).forEach((inter: any) => {
      const parentInfo = inter[0].parentInfo
      if (parentInfo) {
        partialInterfaces.push(parentInfo)
      }
    })
  }
  if (partialInterfaces.length) {
    suggestions.push(`\nBEST: Make the missing properties optional using the ${chalk.green('Partial<type>')} utility:`)
    partialInterfaces.forEach((parentInfo) => {
      suggestions.push(
        `   ${chalk.greenBright(`\u2022 interface Partial<${parentInfo.typeText}>`)} here: ${chalk.blueBright(
          parentInfo.nodeLink
        )}`
      )
    })
  }
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function otherPossibleSuggestions(suggestions, problem, context, stack) {
  // then log the possible suggestions
  const { targetInfo, sourceInfo } = problem
  switch (true) {
    case targetInfo.typeText === 'never' ||
      sourceInfo.typeText === 'never' ||
      targetInfo.typeText === 'never[]' ||
      sourceInfo.typeText === 'never[]':
      return whenNeverTypeDoesntMatch(suggestions, problem, context, stack)

    case targetInfo.typeText === 'undefined' || sourceInfo.typeText === 'undefined':
      return whenUndefinedTypeDoesntMatch(suggestions, problem, context, stack)

    case targetInfo.typeText === 'unknown' || sourceInfo.typeText === 'unknown':
      return whenUnknownTypeDoesntMatch(suggestions, problem, context, stack)

    case isArrayType(targetInfo.type) || isArrayType(sourceInfo.type):
      return whenArraysDontMatch(suggestions, problem, context, stack)

    case isFunctionType(targetInfo.type) || isFunctionType(sourceInfo.type):
      return whenPrototypesDontMatch(suggestions, problem, context, stack)

    case isSimpleType(targetInfo.typeText) && isSimpleType(sourceInfo.typeText):
      return whenSimpleTypesDontMatch(suggestions, problem, context, stack)

    default:
      return whenTypeShapesDontMatch(suggestions, problem, context, stack)
  }
}

function showSuggestions(problem, context, stack) {
  // at this point:
  //  problem-- contains the conflicting types
  //  stack-- contains all of the parent "var: type" that led us here
  //

  const suggestions: string[] = []
  if (context?.externalLinks?.length) {
    const libs = new Set()
    context.externalLinks.forEach((link) => {
      const linkArr = link.split('node_modules/')[1].split('/')
      link = linkArr[0]
      if (link.startsWith('@')) {
        link += `/${linkArr[1]}`
      }
      libs.add(link)
    })
    const externalLibs = `'${Array.from(libs).join(', ')}'`
    suggestions.push(`NOTE: Because the problem is in external libraries: ${chalk.green(externalLibs)}`)
    suggestions.push(
      `BEST: You will neefd to disable the error with these comments here: ${chalk.blueBright(
        getNodeLink(context.errorNode)
      )}`
    )
    suggestions.push(`${chalk.greenBright('        // eslint-disable-next-line @typescript-eslint/ban-ts-comment')} `)
    suggestions.push(`${chalk.greenBright(`        // @ts-ignore: Fixed required in ${externalLibs}`)} `)
  }
  context.targetName = context.callMismatch ? 'Caller Argument' : 'Target'
  context.sourceName = context.callMismatch ? 'Callee Parameter' : 'Source'

  context.callMismatch
    ? whenCallArgumentsDontMatch(suggestions, problem, context, stack)
    : otherPossibleSuggestions(suggestions, problem, context, stack)
  suggestions.forEach((solution) => console.log(chalk.whiteBright(solution)))
  if (suggestions.length) console.log('')
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function showTypeDifferences(p, problem, context, stack, links, maxs, interfaces, arg?) {
  // display the path we took to get here
  let spacer = ''
  let simpleConflict = false
  let lastTargetType
  let lastSourceType
  stack.forEach((layer, inx) => {
    const { sourceInfo, targetInfo } = layer
    simpleConflict =
      isSimpleConflict(targetInfo?.typeText, sourceInfo?.typeText) ||
      isArrayType(problem.sourceInfo.type) ||
      isArrayType(problem.targetInfo.type)
    const color = simpleConflict ? 'red' : 'green'
    if (inx === 0) {
      const row: any = {
        target: `${min(maxs, targetInfo?.fullText)}`,
        source: `${min(maxs, sourceInfo?.fullText)}`,
      }
      if (arg) {
        row.arg = `\u25B6 ${arg}`
        row.parm = `\u25B6 ${arg}`
      }
      p.addRow(row, { color })
      spacer += '  '
    } else {
      if (targetInfo.typeText !== lastTargetType && sourceInfo.typeText !== lastSourceType) {
        p.addRow(
          {
            target: `${spacer}${simpleConflict ? '  ' : '└'}${min(maxs, targetInfo.fullText)} ${addLink(
              links,
              spacer,
              targetInfo.fullText,
              targetInfo.nodeLink
            )}`,
            source: `${spacer}${simpleConflict ? '  ' : '└'}${min(maxs, sourceInfo.fullText)}  ${addLink(
              links,
              spacer,
              sourceInfo.fullText,
              sourceInfo.nodeLink
            )}`,
          },
          { color }
        )
        spacer += '  '
      }
    }
    lastTargetType = targetInfo.typeText
    lastSourceType = sourceInfo.typeText
  })

  // if the conflict involves a type shape, show the properties that conflict
  if (!simpleConflict && problem) {
    const mismatch: { source?: string; target?: string }[] = []
    const missing: { source?: string; target?: string }[] = []
    const targetMap = getTypeMap(problem.targetInfo.type)
    const sourceMap = getTypeMap(problem.sourceInfo.type)
    const sourcePropProblems: { missing: any[]; mismatch: any[] } | undefined = { missing: [], mismatch: [] }
    const targetPropProblems: { missing: any[]; mismatch: any[] } | undefined = { missing: [], mismatch: [] }
    context.sourcePropProblems = sourcePropProblems
    context.targetPropProblems = targetPropProblems
    context.targetMap = targetMap
    context.sourceMap = sourceMap

    // properties that are in source but not target
    Object.keys(sourceMap).forEach((propName) => {
      if (targetMap[propName] && targetMap[propName].fullText) {
        // at this point object types can't be mismatched, only missing properties
        if (
          sourceMap[propName].typeText === targetMap[propName].typeText ||
          (!isSimpleType(sourceMap[propName].typeText) && !isSimpleType(targetMap[propName].typeText))
        ) {
          p.addRow(
            {
              target: `${spacer}${min(maxs, targetMap[propName].fullText)}`,
              source: `${spacer}${min(maxs, sourceMap[propName].fullText)}`,
            },
            { color: 'green' }
          )
        } else {
          mismatch.push({ source: propName, target: propName })
        }
      } else if (sourceMap[propName].isOpt) {
        if (showOptionals) {
          p.addRow(
            {
              target: '',
              source: `${spacer}${min(maxs, sourceMap[propName].fullText)}`,
            },
            { color: 'green' }
          )
        }
      } else {
        missing.push({ source: propName })
      }
    })

    // properties in target but not source
    let inx = 0
    Object.keys(targetMap).forEach((propName) => {
      if (!targetMap[propName].isOpt && (!sourceMap[propName] || !sourceMap[propName].fullText)) {
        if (inx < missing.length) {
          missing[inx].target = propName
        } else {
          missing.push({ target: propName })
        }
        inx++
      }
    })

    // sort conflicting properties by their direct parent types
    context.externalLinks = []
    context.mismatchInterfaceMaps = asTypeInterfaces(mismatch, targetMap, sourceMap)
    context.missingInterfaceMaps = asTypeInterfaces(missing, targetMap, sourceMap)
    displayDifferences(
      mismatch,
      'yellow',
      targetPropProblems.mismatch,
      sourcePropProblems.mismatch,
      context.mismatchInterfaceMaps
    )
    displayDifferences(
      missing,
      'red',
      targetPropProblems.missing,
      sourcePropProblems.missing,
      context.missingInterfaceMaps
    )
    function displayDifferences(conflicts, color, targetPropProblems, sourcePropProblems, interfaceMaps) {
      let lastSourceParent
      let lastTargetParent
      conflicts.some(({ target, source }, inx) => {
        let sourceParent
        let targetParent
        if (inx < MAX_SHOWN_PROP_MISMATCH) {
          if (target) {
            targetPropProblems.push(targetMap[target])
            if (targetMap[target].nodeLink.indexOf('node_modules/') !== -1) {
              context.externalLinks.push(targetMap[target].nodeLink)
            }

            if (targetMap[target].parentInfo && targetMap[target].parentInfo.fullText !== lastTargetParent) {
              lastSourceParent = targetMap[target].parentInfo.fullText
              targetParent = `${spacer}└─${min(maxs, targetMap[target].parentInfo.fullText)}  ${addLink(
                links,
                spacer,
                targetMap[target].parentInfo.fullText,
                targetMap[target].parentInfo.nodeLink
              )}`
            }
            const bump = lastTargetParent ? '   ' : ''
            target = `${spacer + bump}${min(maxs, targetMap[target].fullText)}  ${addLink(
              links,
              spacer + bump,
              targetMap[target].fullText,
              targetMap[target].nodeLink,
              color
            )}`
          } else {
            target = ''
          }
          if (source) {
            sourcePropProblems.push(sourceMap[source])
            if (sourceMap[source].nodeLink.indexOf('node_modules/') !== -1) {
              context.externalLinks.push(sourceMap[source].nodeLink)
            }
            if (sourceMap[source].parentInfo && sourceMap[source].parentInfo.fullText !== lastSourceParent) {
              lastSourceParent = sourceMap[source].parentInfo.fullText
              sourceParent = `${spacer}└─${min(maxs, sourceMap[source].parentInfo.fullText)}  ${addLink(
                links,
                spacer,
                sourceMap[source].parentInfo.fullText,
                sourceMap[source].parentInfo.nodeLink
              )}`
            }
            const bump = lastSourceParent ? '   ' : ''
            source = `${spacer + bump}${min(maxs, sourceMap[source].fullText)}  ${addLink(
              links,
              spacer + bump,
              sourceMap[source].fullText,
              sourceMap[source].nodeLink,
              color
            )}`
          } else {
            source = ''
          }
          if (sourceParent || targetParent) {
            p.addRow(
              {
                source: sourceParent,
                target: targetParent,
              },
              { color: 'green' }
            )
            sourceParent = targetParent = undefined
          }
          p.addRow(
            {
              source,
              target,
            },
            { color }
          )
          return false
        } else {
          p.addRow(
            {
              source: andMore(interfaces, conflicts, interfaceMaps),
              target: '',
            },
            { color }
          )
          return true
        }
      })
    }
  }
}

function showCallDifferences(p, problem, context, stack, links, maxs, interfaces) {
  context.callPrototypeMatchUps.forEach(({ argName, paramName, sourceTypeText, targetTypeText }, inx) => {
    if (inx !== context.errorIndex) {
      const conflict = sourceTypeText !== targetTypeText
      p.addRow(
        {
          arg: inx + 1,
          parm: inx + 1,
          target: `${min(maxs, `${argName}: ${targetTypeText}`)}`,
          source: `${min(maxs, `${paramName}: ${sourceTypeText}`)}`,
        },
        { color: conflict ? 'red' : 'green' }
      )
    } else {
      showTypeDifferences(p, problem, context, stack, links, maxs, interfaces, inx + 1)
    }
  })
}

// we get here unless there's a conflict
function showDifferences(problem, context, stack) {
  //show the error
  console.log(`TS${context.code}: ${context.message}`)

  // create the table
  const columns: {
    name: string
    minLen?: number
    title: string
    alignment: string
  }[] = []
  if (context.callMismatch) {
    columns.push({
      name: 'arg',
      title: 'Arg',
      alignment: 'right',
    })
  }
  columns.push({
    name: 'target',
    minLen: 60,
    title: `${context.callMismatch ? 'Caller' : 'Target'}: ${context.targetLink}`,
    alignment: 'left',
  })
  if (context.callMismatch) {
    columns.push({
      name: 'parm',
      title: 'Prm',
      alignment: 'right',
    })
  }
  columns.push({
    name: 'source',
    minLen: 60,
    title: `${context.callMismatch ? 'Callee' : 'Source'}: ${context.sourceLink} ${
      context.sourceLink === context.targetLink ? '(same)' : ''
    }`,
    alignment: 'left',
  })

  const p = new Table({
    columns,
  })

  const links = []
  const maxs = []
  const interfaces = []
  if (context.callMismatch) {
    showCallDifferences(p, problem, context, stack, links, maxs, interfaces)
  } else {
    showTypeDifferences(p, problem, context, stack, links, maxs, interfaces)
  }

  // print the table and table notes
  p.printTable()
  maxs.forEach((max) => console.log(max))
  links.forEach((link) => console.log(link))
  interfaces.forEach((inter) => console.log(inter))
  if (links.length) console.log('')
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function getPropertyInfo(prop: ts.Symbol, type?: ts.Type) {
  const declarations = prop?.declarations
  if (Array.isArray(declarations)) {
    const declaration = declarations[0]
    type = type || checker.getTypeAtLocation(declaration)
    const typeText = typeToString(type)
    const isOpt = prop.flags & ts.SymbolFlags.Optional
    let preface = `${prop.getName()}${isOpt ? '?' : ''}:`
    switch (true) {
      case !!(prop.flags & ts.SymbolFlags.Interface):
        preface = 'interface'
        break
      case !!(prop.flags & ts.SymbolFlags.Class):
        preface = 'class'
        break
      case !!(prop.flags & ts.SymbolFlags.TypeAlias):
        preface = 'type'
        break
    }
    const fullText = `${preface} ${isOpt ? typeText.replace(' | undefined', '') : typeText}`
    const nodeLink = getNodeLink(declaration)
    return { nodeText: prop.getName(), typeText, fullText, typeValue: type.value, nodeLink, declaration }
  }
  return { typeText: '', fullText: '', nodeLink: '' }
}

function getTypeMap(type: ts.Type) {
  const map = {}
  type.getProperties().forEach((prop) => {
    let info = {}
    prop = prop?.syntheticOrigin || prop
    const propName = prop.escapedName as string
    const { nodeText, fullText, nodeLink, typeText, typeValue, declaration } = getPropertyInfo(prop)

    // see if type symbol was added thru an InterfaceDeclaration
    let parentInfo: { fullText: string; nodeLink?: string } | undefined = undefined
    if (
      declaration?.parent?.kind === ts.SyntaxKind.InterfaceDeclaration ||
      declaration?.parent?.kind === ts.SyntaxKind.TypeAliasDeclaration
    ) {
      const parentType = checker.getTypeAtLocation(declaration?.parent)
      if (type !== parentType) {
        //} && !(parentType.symbol.flags & ts.SymbolFlags.TypeLiteral)) {
        // ignore '__type'
        parentInfo = getPropertyInfo(parentType.symbol)
      }
    }
    info = {
      isOpt: prop.flags & ts.SymbolFlags.Optional,
      nodeText,
      fullText,
      typeValue,
      typeText,
      nodeLink,
      parentInfo,
    }
    map[propName] = info
  })
  return map
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function min(maxs, type) {
  type = type.replace(' | undefined', '').replace(/\\n/g, '')
  if (type.length > 90) {
    type = `${type.substr(0, 25)}..${type.substr(-45)}  ${addNote(maxs, type)}`
  }
  return type
}

function typeInterfaces(key, map, moreMap) {
  if (key) {
    const prop = map[key]
    const interfaceKey = prop?.parentInfo?.fullText || '-none-'
    let props = moreMap[interfaceKey]
    if (!props) {
      props = moreMap[interfaceKey] = []
    }
    props.push(prop)
  }
}

function asTypeInterfaces(conflicts, targetMap, sourceMap) {
  const targetInterfaceMap = {}
  const sourceInterfaceMap = {}
  conflicts.forEach(({ target, source }) => {
    typeInterfaces(target, targetMap, targetInterfaceMap)
    typeInterfaces(source, sourceMap, sourceInterfaceMap)
  })
  return { targetInterfaceMap, sourceInterfaceMap }
}

function andMore(interfaces, conflicts, { sourceInterfaceMap, targetInterfaceMap }) {
  let base = `                ...and ${conflicts.length - 6} more ...`
  ;[sourceInterfaceMap, targetInterfaceMap].forEach((map) => {
    Object.keys(map).forEach((key, inx) => {
      const props = map[key]
      if (props[0].parentInfo) {
        const num = String.fromCharCode('\u2474'.charCodeAt(0) + inx)
        interfaces.push(`\n${num}  ${key}: ${props[0].parentInfo.nodeLink}}`)
        interfaces.push(chalk.red(`${props.map(({ nodeText }) => nodeText).join(', ')}`))
        base += `${num}  `
      }
    })
  })
  return base
}

function addNote(maxs: string[], note?: string) {
  const num = String.fromCharCode('\u24B6'.charCodeAt(0) + maxs.length)
  maxs.push(`${chalk.bold(num)} ${note}`)
  return num
}

function addLink(links: string[], spacer, property, link?: string, color?: 'red' | 'yellow' | 'green') {
  const num = String.fromCharCode('\u2460'.charCodeAt(0) + links.length)
  let fullNote = `${chalk.bold(num)}${spacer}${property.split(':')[0] + ': '}${link}`
  switch (color) {
    case 'red':
      fullNote = chalk.red(fullNote)
      break
    case 'yellow':
      fullNote = chalk.yellow(fullNote)
      break
  }
  links.push(fullNote)
  return num
}

function isSimpleType(type) {
  return simpleTypes.includes(type)
}

function isArrayType(type) {
  return ['Array', 'ReadonlyArray'].includes(type?.symbol?.escapedName)
}

function isFunctionType(type) {
  return type?.symbol?.escapedName === '__function'
}

function typeToString(type) {
  if (type.intrinsicName === 'true' || type.intrinsicName === 'false') {
    return 'boolean'
  } else if (type.value) {
    return typeof type.value
  }
  return checker.typeToString(type)
}

function getText(node) {
  return node
    .getText()
    .split('\n')
    .map((seg) => seg.trimStart())
    .join(' ')
}
function getNodeLink(node: ts.Node | undefined) {
  if (node) {
    const file = node.getSourceFile()
    let relative: string = path.relative(process.argv[1], file.fileName)
    if (!relative.includes('node_modules/')) {
      relative = relative.split('/').slice(-4).join('/')
    }
    return `${relative}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
  }
  return ''
}

function getNodeBlockId(node: ts.Node) {
  const block = ts.findAncestor(node.parent, (node) => {
    return !!node && node.kind === ts.SyntaxKind.Block
  })
  return block ? block.getStart() : 0
}

function getNodeDeclartion(node: ts.Node | ts.Identifier, nodeMaps) {
  const declarationMap = nodeMaps.blocksToDeclarations[getNodeBlockId(node)]
  const varName = node.getText()
  return declarationMap && varName ? declarationMap[varName] : node
}

function isSimpleConflict(targetTypeText, sourceTypeText) {
  return targetTypeText !== sourceTypeText && (isSimpleType(targetTypeText) || isSimpleType(sourceTypeText))
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function compareProperties(firstType, secondType) {
  let problem: any | undefined = undefined
  const recurses: any = []
  const sourceTypeText = typeToString(firstType)
  const targetTypeText = typeToString(secondType)
  firstType.getProperties().every((firstProp) => {
    firstProp = firstProp?.syntheticOrigin || firstProp
    const propName = firstProp.escapedName as string
    const secondProp = checker.getPropertyOfType(secondType, propName)
    if (secondProp) {
      const firstPropType = checker.getTypeOfSymbol(firstProp)
      const secondPropType = checker.getTypeOfSymbol(secondProp)
      if (firstPropType !== secondPropType) {
        // if both are simple types, just show the error
        if ((secondPropType.intrinsicName || 'not') !== (firstPropType.intrinsicName || 'not')) {
          // mismatch
          // at this point we just know there's one or more problems in this type shape
          // we fully analyze the properties in showDifferences
          problem = {
            sourceInfo: {
              type: firstType,
              typeText: sourceTypeText,
            },
            targetInfo: {
              type: secondType,
              typeText: targetTypeText,
            },
          }
          return false
        } else {
          // else recurse the complex types of these properties
          recurses.push({
            targetType: secondPropType,
            sourceType: firstPropType,
            branch: {
              sourceInfo: getPropertyInfo(firstProp, firstPropType),
              targetInfo: getPropertyInfo(secondProp, secondPropType),
            },
          })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      // missing
      // at this point we just know there's one or more problems in this type shape
      // we fully analyze the properties in showDifferences
      problem = {
        sourceInfo: { type: firstType, typeText: sourceTypeText },
        targetInfo: { type: secondType, typeText: targetTypeText },
      }
      return false
    }
    return true
  })
  return { problem, recurses }
}

// we know TS found a mismatch here -- we just have to find it again
function compareTypes(targetType, sourceType, stack, context, bothWays?: boolean) {
  let problem: any | undefined = undefined
  let recurses: any[] = []
  const propertyTypes: any = []

  // types can be unions (string | number)
  const sources = sourceType.types || [sourceType]
  const targets = targetType.types || [targetType]
  if (
    !sources.every((source) => {
      // every source type must have a matching target type
      return targets.some((target) => {
        // but it's got to be just one target type that matches
        const sourceTypeText = typeToString(source)
        const targetTypeText = typeToString(target)

        // types can be in arrays ([string])
        if (isArrayType(source) === isArrayType(target)) {
          const sourceArr = isArrayType(source) ? source.typeArguments : [source]
          const targetArr = isArrayType(target) ? target.typeArguments : [target]
          if (sourceArr.length === targetArr.length) {
            // because we maybe looking at types in an array, every type must match
            return sourceArr.every((source, inx) => {
              const target = targetArr[inx]
              const sourceTypeText = typeToString(source)
              const targetTypeText = typeToString(target)
              if (sourceTypeText === targetTypeText) {
                // if types match great, return true
                return true
              } else if (
                // else if source and target are shapes, recurse into their properties
                sourceTypeText !== 'undefined' && // undefined is not a simple type
                targetTypeText !== 'undefined' && // but neither does it have properties
                !isSimpleType(sourceTypeText) &&
                !isSimpleType(targetTypeText)
              ) {
                ;({ problem, recurses } = compareProperties(source, target))
                // try reverse-- unless user specifically set strictFunctions to no
                if (!problem && bothWays !== false) {
                  ;({ problem } = compareProperties(target, source))
                }
                if (!problem) {
                  if (recurses.length) {
                    propertyTypes.push(recurses)
                  }
                  return true // return true to allow recursion into type properties
                }
              } else {
                // else we found a type mismatch
                problem = {
                  sourceInfo: { type: source, typeText: sourceTypeText },
                  targetInfo: { type: target, typeText: targetTypeText },
                }
              }
              return false
            })
          } else {
            // this target doesn't match because array lengths are different
            problem = {
              sourceInfo: { type: source, typeText: sourceTypeText },
              targetInfo: { type: target, typeText: targetTypeText },
            }
          }
        } else {
          // this target doesn't match cause source or target is an array but the other isn't
          problem = {
            sourceInfo: { type: source, typeText: sourceTypeText },
            targetInfo: { type: target, typeText: targetTypeText },
          }
        }
        return false
      })
    })
  ) {
    showDifferences(problem, context, stack)
    showSuggestions(problem, context, stack)
    context.hadPayoff = true
    return false
  }
  if (propertyTypes.length) {
    // when properties types are made up of other properties
    // (ex: a structure and not an intrinsicName like 'string')
    return propertyTypes.every((recurses) => {
      return recurses.every(({ targetType, sourceType, branch }) => {
        const clonedStack = cloneDeep(stack)
        clonedStack.push({
          ...branch,
        })
        return compareTypes(targetType, sourceType, clonedStack, context, bothWays)
      })
    })
  }
  return true
}

//======================================================================
//======================================================================
//======================================================================

function isFunctionLikeKind(kind: ts.SyntaxKind) {
  switch (kind) {
    case ts.SyntaxKind.ClassDeclaration:
    case ts.SyntaxKind.ClassStaticBlockDeclaration:
    case ts.SyntaxKind.GetAccessor:
    case ts.SyntaxKind.SetAccessor:
    case ts.SyntaxKind.CallSignature:
    case ts.SyntaxKind.ConstructSignature:
    case ts.SyntaxKind.ArrowFunction:
    case ts.SyntaxKind.DeleteExpression:
    case ts.SyntaxKind.MethodDeclaration:
    case ts.SyntaxKind.IndexSignature:
    case ts.SyntaxKind.TypePredicate:
    case ts.SyntaxKind.ConstructorType:
    case ts.SyntaxKind.TypeQuery:
    case ts.SyntaxKind.FunctionDeclaration:
      return true
    default:
      return false
  }
}

// B = A
function elaborateOnAssignmentMismatch(errorNode, targetNode: ts.Node, sourceNode: ts.Node, context) {
  const targetType: ts.Type = checker.getTypeAtLocation(targetNode)
  const targetTypeText = typeToString(targetType)

  // B = function()
  if (isFunctionLikeKind(sourceNode.kind)) {
    // if function, need to make sure each type returned can be assigned to target
    const returns = context.nodeMaps.containerToReturns[sourceNode.getStart()]
    if (returns) {
      let hadPayoff = false
      returns.forEach((rn) => {
        if (hadPayoff) {
          console.log('\n\n')
        }
        hadPayoff = elaborateOnReturnMismatch(rn, targetType, context)
      })
      return hadPayoff
    }
    return false
  } else {
    const sourceType: ts.Type = checker.getTypeAtLocation(sourceNode)
    const sourceTypeText = typeToString(sourceType)
    const pathContext = {
      ...context,
      message: `Bad assignment: ${getText(errorNode)}`,
      sourceLink: getNodeLink(sourceNode),
      targetLink: getNodeLink(targetNode),
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          sourceInfo: {
            nodeText: getText(sourceNode),
            typeText: sourceTypeText,
            typeValue: sourceType?.value,
            fullText: `${getText(sourceNode)}: ${sourceTypeText}`,
            nodeLink: getNodeLink(sourceNode),
          },
          targetInfo: {
            nodeText: getText(targetNode),
            typeText: targetTypeText,
            typeValue: targetType?.value,
            fullText: `${getText(targetNode)}: ${targetTypeText}`,
            nodeLink: getNodeLink(targetNode),
          },
        },
      ],
      pathContext
    )
    return pathContext.hadPayoff
  }
}

// B => {return A}
function elaborateOnReturnMismatch(node: ts.Node, containerType: ts.Type | undefined, context) {
  const children = node.getChildren()
  // source is return type
  const sourceType: ts.Type = checker.getTypeAtLocation(children[1])
  // target is container type
  const container = context.nodeMaps.returnToContainer[node.getStart()]
  if (container) {
    containerType = containerType || checker.getTypeAtLocation(container)
    const targetType: ts.Type = checker.getSignaturesOfType(containerType, 0)[0].getReturnType()
    const targetTypeText = typeToString(targetType)
    const sourceTypeText = sourceType.value ? typeof sourceType.value : getText(node)
    const pathContext = {
      ...context,
      message: `Bad return type: ${container.parent.symbol.getName()}(): ${targetTypeText} => { ${chalk.red(
        getText(node)
      )} }`,
      sourceLink: getNodeLink(node),
      targetLink: getNodeLink(container),
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          targetInfo: {
            nodeText: container.parent.symbol.getName(),
            typeText: targetTypeText,
            typeValue: targetType?.value,
            fullText: `${container.parent.symbol.getName()}: ${targetTypeText}`,
            nodeLink: getNodeLink(container),
          },
          sourceInfo: {
            nodeText: getText(node),
            typeText: sourceTypeText.replace('return ', ''),
            typeValue: sourceType?.value,
            fullText: `${getText(node)}${sourceType.value ? ': ' + typeof sourceType.value : ''}`,
            nodeLink: getNodeLink(node),
          },
        },
      ],
      pathContext,
      options.strictFunctionTypes
    )
    return pathContext.hadPayoff
  }
  return false
}

// call func(..A...) => (...B...)
function elaborateOnCallMismatches(node: ts.Node, errorNode, context) {
  const children = node.getChildren()
  // signature of function being called
  const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0]
  const parameters = signature.getParameters()
  // args that are being passed
  const args = children[2].getChildren().filter((node) => node.kind !== ts.SyntaxKind.CommaToken)
  const callPrototypeMatchUps = args.map((arg, inx) => {
    const targetType = checker.getTypeAtLocation(arg)
    const matchUp: {
      argName: string
      targetType: ts.Type
      targetTypeText: string
      sourceType?: ts.Type
      sourceTypeText?: string
      paramName?: string
      paramLink?: string
    } = {
      argName: getText(arg),
      targetType,
      targetTypeText: typeToString(targetType),
    }
    if (inx < parameters.length) {
      const param = parameters[inx]
      matchUp.paramLink = getNodeLink(param.valueDeclaration)
      matchUp.sourceType = checker.getTypeOfSymbolAtLocation(param, node)
      matchUp.sourceTypeText = typeToString(matchUp.sourceType)
      matchUp.paramName = param.escapedName as string
    }
    return matchUp
  })
  const errorIndex = args.findIndex((node) => node === errorNode)
  // for each arg, compare its type to call parameter type
  let hadPayoff = false
  const functionName = getText(children[0])
  callPrototypeMatchUps.some(
    ({ targetType, targetTypeText, sourceType, sourceTypeText, argName, paramName, paramLink }, inx) => {
      const comma = args.length > 1 && inx > args.length - 1 ? ',' : ''
      const message = `Bad call argument #${inx + 1} type: ${functionName}( ${chalk.red(
        argName
      )}${comma} ) => ${functionName}( ${chalk.red(`${paramName}: ${sourceTypeText}`)}${comma} )`

      const pathContext = {
        ...context,
        callPrototypeMatchUps,
        errorIndex,
        callMismatch: true,
        message,
        sourceLink: paramLink,
        targetLink: getNodeLink(node),
        hadPayoff: false,
      }
      if (hadPayoff) {
        console.log('\n\n')
      }
      compareTypes(
        targetType,
        sourceType,
        [
          {
            sourceInfo: {
              nodeText: paramName,
              typeText: sourceTypeText,
              typeValue: sourceType?.value,
              fullText: `${paramName}: ${sourceTypeText}`,
              nodeLink: paramLink,
            },
            targetInfo: {
              nodeText: argName,
              typeText: targetTypeText,
              typeValue: targetType?.value,
              fullText: `${argName}: ${targetTypeText}`,
              nodeLink: getNodeLink(node),
            },
          },
        ],
        pathContext
      )
      hadPayoff = pathContext.hadPayoff
      return hadPayoff // stops on first conflict just like typescript
    }
  )
  return hadPayoff
}

function isElaboratableKind(kind: ts.SyntaxKind) {
  switch (kind) {
    case ts.SyntaxKind.ReturnStatement:
    case ts.SyntaxKind.VariableDeclaration:
    case ts.SyntaxKind.CallExpression:
      return true
    default:
      return false
  }
}

function elaborateOnMismatch(code, errorNode: ts.Node, nodeMaps) {
  const node =
    ts.findAncestor(errorNode, (node) => {
      return !!node && isElaboratableKind(node.kind)
    }) || errorNode
  if (!nodeMaps.processedNodes.has(node.getStart())) {
    nodeMaps.processedNodes.add(node.getStart())
    const context: {
      code: any
      node: ts.Node
      errorNode: ts.Node
      nodeMaps: any
      sourceDeclared?: ts.Node
      targetDeclared?: ts.Node
    } = {
      code,
      node,
      errorNode,
      nodeMaps,
    }
    const children = node.getChildren()
    switch (node.kind) {
      // func type !== return type
      case ts.SyntaxKind.ReturnStatement:
        return elaborateOnReturnMismatch(node, undefined, context)

      // can't call this func with this argument type
      case ts.SyntaxKind.CallExpression:
        // if the function is a property of an object, where is that object defined
        if (children[0].kind === ts.SyntaxKind.PropertyAccessExpression) {
          const objectName = children[0].getFirstToken()
          if (objectName) {
            context.targetDeclared = getNodeDeclartion(objectName, nodeMaps)
          }
        }
        return elaborateOnCallMismatches(node, errorNode, context)

      // can't declare variable with this value, ex:  const A = B, or let A = func()
      case ts.SyntaxKind.VariableDeclaration:
        const sourceNode = children[children.length - 1]
        const targetNode = children[0]
        return elaborateOnAssignmentMismatch(node, targetNode, sourceNode, context)

      // can't set B to value A: a = b or b.d.e = 3
      case ts.SyntaxKind.Identifier:
        // get the whole expression (left = right)
        const statement =
          (ts.findAncestor(errorNode, (node) => {
            return (
              !!node &&
              (function (kind: ts.SyntaxKind) {
                switch (kind) {
                  case ts.SyntaxKind.ExpressionStatement:
                    return true
                  default:
                    return false
                }
              })(node.kind)
            )
          }) as ts.ExpressionStatement) || errorNode

        const target = statement.expression.left
        const source = statement.expression.right
        if (source && target) {
          context.sourceDeclared = getNodeDeclartion(source, nodeMaps)
          context.targetDeclared = getNodeDeclartion(target, nodeMaps)

          // if the target is a path into an object, need to find the property in type
          const path = target.getText().split(/\W+/)
          if (path.length > 1) {
            path.shift()
            let node: ts.Node | undefined = errorNode
            do {
              const propName = path.shift()
              const type = checker.getTypeAtLocation(node)
              const types = type.types || [type]
              types.some((type) => {
                const declarations = type.getProperty(propName)?.declarations
                if (Array.isArray(declarations)) {
                  node = declarations[0]
                  return true
                }
                return false
              })
            } while (path.length)
            context.targetDeclared = node
          }
          return elaborateOnAssignmentMismatch(statement, target, source, context)
        }

      default:
        console.log(`Missing support for kind === ${node.kind}`)
        console.log(getNodeLink(node))
        return false
    }
  }
}

/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////

function getNodeMaps(sourceFile: ts.SourceFile) {
  const nodeMaps = {
    startToNode: {},
    kindToNodes: {},
    returnToContainer: {},
    containerToReturns: {},
    blocksToDeclarations: {},
    processedNodes: new Set(),
  }
  function mapNodes(node: ts.Node) {
    nodeMaps.startToNode[node.getStart()] = node
    let nodes = nodeMaps.kindToNodes[node.kind]
    if (!nodes) {
      nodes = nodeMaps.kindToNodes[node.kind] = []
    }

    // remember where variables are declared
    if (node.kind === ts.SyntaxKind.VariableDeclaration) {
      const blockId = getNodeBlockId(node)
      let declareMap = nodeMaps.blocksToDeclarations[blockId]
      if (!declareMap) {
        declareMap = nodeMaps.blocksToDeclarations[blockId] = {}
      }
      declareMap[node.getFirstToken()?.getText()] = node
    }

    nodes.push(node)
    ts.forEachChild(node, mapNodes)
  }
  mapNodes(sourceFile)

  // for each return node map it to its container
  nodeMaps.kindToNodes[ts.SyntaxKind.ReturnStatement].forEach((returnNode) => {
    const container = ts.findAncestor(returnNode.parent, (node) => {
      return !!node && (isFunctionLikeKind(node.kind) || ts.isClassStaticBlockDeclaration(node))
    })
    if (container) {
      nodeMaps.returnToContainer[returnNode.getStart()] = container
      let returnNodes = nodeMaps.containerToReturns[container.getStart()]
      if (!returnNodes) {
        returnNodes = nodeMaps.containerToReturns[container.getStart()] = []
      }
      returnNodes.push(returnNode)
    }
  })
  return nodeMaps
}

function elaborate(semanticDiagnostics: readonly ts.Diagnostic[], fileNames: string[]) {
  let hadPayoff = true // the first one is always free
  let anyPayoff = false
  const fileMap = {}
  semanticDiagnostics.forEach(({ code, file, start, messageText }) => {
    if (file && fileNames.includes(file.fileName)) {
      let nodeMaps = fileMap[file.fileName]
      if (!nodeMaps) {
        nodeMaps = fileMap[file.fileName] = getNodeMaps(file)
      }
      if (start) {
        const node = nodeMaps.startToNode[start]
        if (node) {
          switch (code) {
            case 2322:
            case 2559:
            case 2345:
              if (hadPayoff) {
                console.log('\n\n')
              }
              hadPayoff = elaborateOnMismatch(code, node, nodeMaps)
              anyPayoff = anyPayoff || hadPayoff
              break
            // default:
            //   console.log(`TS${code}: ${messageText}\n  ${getNodeLink(node)}\n  https://typescript.tv/errors/#TS${code}`)
          }
        }
      }
    }
  })
  if (!anyPayoff) {
    console.log('\nno squirrels')
  }
  console.log('\n\n--------------------------------------------------------------------------')
}

/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
const fileNames = process.argv.slice(2)
// Read tsconfig.json file
const tsconfigPath = ts.findConfigFile(fileNames[0], ts.sys.fileExists, 'tsconfig.json')
if (tsconfigPath) {
  const tsconfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  options = ts.parseJsonConfigFileContent(tsconfigFile.config, ts.sys, path.dirname(tsconfigPath)).options
}
options.isolatedModules = false
console.log('starting...')
const program = ts.createProgram(fileNames, options)
const checker = program.getTypeChecker()
const syntactic = program.getSyntacticDiagnostics()
console.log('looking...')
elaborate(program.getSemanticDiagnostics(), fileNames)
if (!!syntactic.length) {
  console.log('Warning: there were syntax errors.', syntactic)
}
