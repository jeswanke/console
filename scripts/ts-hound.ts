import { ElementType } from 'react'
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

// ===============================================================================
// ===============================================================================
// ===============================================================================

const simpleTypes = ['string', 'number', 'boolean', 'any', 'unknown', 'never']
function showTheOptions({ targetInfo, sourceInfo }, context, stack) {
  // find first real parent links
  let sourceLink
  let targetLink
  let sourceText
  let targetText
  stack.reverse().forEach(({ sourceInfo, targetInfo }) => {
    if (!sourceLink && sourceInfo.link) {
      sourceLink = sourceInfo.link
      sourceText = sourceInfo.text
    }
    if (!targetLink && targetInfo.link) {
      targetLink = targetInfo.link
      targetText = targetInfo.text
    }
  })
  sourceLink = chalk.blueBright(sourceLink)
  targetLink = chalk.blueBright(targetLink)
  targetText = chalk.blueBright(targetText)
  sourceText = chalk.blueBright(sourceText)
  //const errorVar = chalk.blueBright(context.errorNode.getText())
  const errorLink = chalk.blueBright(getNodeLink(context.errorNode))

  // then bang out the options
  const options: string[] = []
  const addEliminateMsg = (link) => {
    options.push(`Option 1: Eliminate any code path that can lead to executing the line here: ${link}`)
  }
  const addUnionMsg = () => {
    const sourceType = chalk.blueBright(`"| ${sourceInfo.text}"`)
    options.push(`Option 1: Append ${sourceType} to this type: ${targetText} here: ${errorLink}`)
  }
  switch (true) {
    case targetInfo.typeText === 'never':
      addEliminateMsg(targetLink)
      break
    case sourceInfo.typeText === 'never':
      addEliminateMsg(sourceLink)
      break
    case targetInfo.typeText === 'undefined':
      options.push('ruh roh')
      break
    case targetInfo.typeText === 'unknown':
      options.push('ruh roh')
      break
    case sourceInfo.typeText === 'undefined':
      if (isSimpleType(targetInfo.typeText)) {
        options.push('ruh roh')
      } else {
        addUnionMsg()
      }
      break
    case sourceInfo.typeText === 'unknown':
      options.push('ruh roh')
      break
    case isSimpleType(targetInfo.typeText) && isSimpleType(sourceInfo.typeText):
      addUnionMsg()
      break
    case isSimpleType(targetInfo.typeText):
      options.push('ruh roh')
      break
    case isSimpleType(sourceInfo.typeText):
      addUnionMsg()
      break
    default:
      if (context.externalLinks.length) {
        const libs = new Set()
        context.externalLinks.forEach((link) => {
          const linkArr = link.split('node_modules/')[1].split('/')
          link = linkArr[0]
          if (link.startsWith('@')) {
            link += `/${linkArr[1]}`
          }
          libs.add(link)
        })
        const externalLibs = `"${Array.from(libs).join(', ')}"`
        options.push(
          `Option 1: Ask the owners of ${chalk.blueBright(externalLibs)} to make the listed properties optional.`
        )
        options.push(`Note: Until there's a fix, disable this error by inserting these comments here: ${errorLink}`)
        options.push(`    ${chalk.greenBright('// eslint-disable-next-line @typescript-eslint/ban-ts-comment')} `)
        options.push(`    ${chalk.greenBright(`// @ts-ignore: Fixed required in ${externalLibs}`)} `)
      } else {
        options.push('ruh roh')
        //    add missing properties to 'type1' here:ff or make them optional here:ee
        //    add missing properties to 'type2' here:ff or make them optional here:ee
      }

      // if type is an inferred structure
      //    recommend converting it into this interface:
      //    and replace here LINK
      //    and replace here LINK
      break
  }
  // switch (context.node.kind) {
  //   case ts.SyntaxKind.ReturnStatement:
  //     break

  //   // can't call this func with this argument type
  //   case ts.SyntaxKind.CallExpression:
  //     break

  //   // can't set A = B, or A = func()
  //   case ts.SyntaxKind.VariableDeclaration:
  //     break

  //   // can't set A = B
  //   case ts.SyntaxKind.Identifier:
  //     break
  // }
  return options
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function doTheMath(problem, stack, context) {
  // dont' get here unless there' a conflict

  // show error and start the table
  console.log(`TS${context.code}: ${context.message}`)
  // log the call stack
  const { sourceInfo, targetInfo } = stack[0]
  const p = new Table({
    columns: [
      { name: 'target', minLen: 60, title: `Target: ${targetInfo.link}`, alignment: 'left' },
      {
        name: 'source',
        minLen: 60,
        title: `Source: ${sourceInfo.link} ${sourceInfo.link === targetInfo.link ? '(same)' : ''}`,
        alignment: 'left',
      },
    ],
  })

  // display the path we took to get here
  let spacer = ''
  const links = []
  const maxs = []
  let simpleConflict = false
  let lastTargetType
  let lastSourceType
  stack.forEach((layer, inx) => {
    const { sourceInfo, targetInfo } = layer
    simpleConflict = isSimpleConflict(targetInfo?.typeText, sourceInfo?.typeText)
    const color = simpleConflict ? 'red' : 'green'
    if (inx === 0) {
      p.addRow(
        {
          target: `${min(maxs, targetInfo?.text)}`,
          source: `${min(maxs, sourceInfo?.text)}`,
        },
        { color }
      )
      spacer += '  '
    } else {
      if (targetInfo.typeText !== lastTargetType && sourceInfo.typeText !== lastSourceType) {
        p.addRow(
          {
            target: `${spacer}${simpleConflict ? '  ' : '└'}${min(maxs, targetInfo.text)} ${addLink(
              links,
              spacer,
              targetInfo.text,
              targetInfo.link
            )}`,
            source: `${spacer}${simpleConflict ? '  ' : '└'}${min(maxs, sourceInfo.text)}  ${addLink(
              links,
              spacer,
              sourceInfo.text,
              sourceInfo.link
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

  // if the conflict involves an object, show the properties that conflict
  if (!simpleConflict && problem) {
    // if the conflict involves an object, show the properties that conflict
    // show properties that match
    const mismatch: { source?: string; target?: string }[] = []
    const missing: { source?: string; target?: string }[] = []
    const targetMap = getTypeMap(problem.targetInfo.type)
    const sourceMap = getTypeMap(problem.sourceInfo.type)
    const sourceProps: { missing: any[]; mismatch: any[] } | undefined = { missing: [], mismatch: [] }
    const targetProps: { missing: any[]; mismatch: any[] } | undefined = { missing: [], mismatch: [] }

    // properties that are in source but not target
    Object.keys(sourceMap).forEach((propName) => {
      if (targetMap[propName] && targetMap[propName].text) {
        // at this point object types can't be mismatched, only missing properties
        if (
          sourceMap[propName].typeText === targetMap[propName].typeText ||
          (!isSimpleType(sourceMap[propName].typeText) && !isSimpleType(targetMap[propName].typeText))
        ) {
          p.addRow(
            {
              target: `${spacer}${min(maxs, targetMap[propName].text)}`,
              source: `${spacer}${min(maxs, sourceMap[propName].text)}`,
            },
            { color: 'green' }
          )
        } else {
          mismatch.push({ source: propName, target: propName })
        }
      } else if (sourceMap[propName].isOptional) {
        if (showOptionals) {
          p.addRow(
            {
              target: '',
              source: `${spacer}${min(maxs, sourceMap[propName].text)}`,
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
      if (!targetMap[propName].isOptional && (!sourceMap[propName] || !sourceMap[propName].text)) {
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
    displayDifferences(mismatch, 'yellow', targetProps.mismatch, sourceProps.mismatch)
    displayDifferences(missing, 'red', targetProps.missing, sourceProps.missing)
    function displayDifferences(conflicts, color, targetProps, sourceProps) {
      let lastSourceParent
      let lastTargetParent
      conflicts.some(({ target, source }, inx) => {
        let sourceParent
        let targetParent
        if (inx < MAX_SHOWN_PROP_MISMATCH) {
          if (target) {
            targetProps.push(targetMap[target])
            if (targetMap[target].link.indexOf('node_modules/') !== -1) {
              context.externalLinks.push(targetMap[target].link)
            }

            if (targetMap[target].parentInfo && targetMap[target].parentInfo.text !== lastTargetParent) {
              lastSourceParent = targetMap[target].parentInfo.text
              targetParent = `${spacer}└─${min(maxs, targetMap[target].parentInfo.text)}  ${addLink(
                links,
                spacer,
                targetMap[target].parentInfo.text,
                targetMap[target].parentInfo.link
              )}`
            }
            const bump = lastTargetParent ? '   ' : ''
            target = `${spacer + bump}${min(maxs, targetMap[target].text)}  ${addLink(
              links,
              spacer + bump,
              targetMap[target].text,
              targetMap[target].link,
              color
            )}`
          } else {
            target = ''
          }
          if (source) {
            sourceProps.push(sourceMap[source])
            if (sourceMap[source].link.indexOf('node_modules/') !== -1) {
              context.externalLinks.push(sourceMap[source].link)
            }
            if (sourceMap[source].parentInfo && sourceMap[source].parentInfo.text !== lastSourceParent) {
              lastSourceParent = sourceMap[source].parentInfo.text
              sourceParent = `${spacer}└─${min(maxs, sourceMap[source].parentInfo.text)}  ${addLink(
                links,
                spacer,
                sourceMap[source].parentInfo.text,
                sourceMap[source].parentInfo.link
              )}`
            }
            const bump = lastSourceParent ? '   ' : ''
            source = `${spacer + bump}${min(maxs, sourceMap[source].text)}  ${addLink(
              links,
              spacer + bump,
              sourceMap[source].text,
              sourceMap[source].link,
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
              source: `                ...and ${conflicts.length - 6} more ...`,
              target: '',
            },
            { color }
          )
          return true
        }
      })
    }
  }

  // print the table. notes and options
  p.printTable()
  maxs.forEach((max) => console.log(max))
  links.forEach((link) => console.log(link))
  if (links.length) console.log('')
  const options: string[] = showTheOptions(problem, context, stack)
  options.forEach((solution) => console.log(chalk.whiteBright(solution)))
  if (options.length) console.log('')
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

// ===============================================================================
// ===============================================================================
// ===============================================================================
function isSimpleType(type) {
  return simpleTypes.includes(type)
}

function typeToString(type) {
  if (type.value) {
    return typeof type.value
  }
  return checker.typeToString(type)
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

function isSimpleConflict(targetTypeText, sourceTypeText) {
  return targetTypeText !== sourceTypeText && (isSimpleType(targetTypeText) || isSimpleType(sourceTypeText))
}

function getPropertyInfo(prop: ts.Symbol, type: ts.Type) {
  const declarations = prop?.declarations
  if (Array.isArray(declarations)) {
    const declaration = declarations[0]
    const typeText = typeToString(type)
    const isOpt = prop.flags & ts.SymbolFlags.Optional
    const text = `${prop.getName()}${isOpt ? '?' : ''}: ${isOpt ? typeText.replace(' | undefined', '') : typeText}`
    const link = getNodeLink(declaration)
    return { typeText, text, link, declaration }
  }
  return { typeText: '', text: '', link: '' }
}

function getDeclaratioInfo(prop: ts.Symbol) {
  const declarations = prop?.declarations
  if (Array.isArray(declarations)) {
    const declaration = declarations[0]
    const text = declaration
      .getText()
      .split('\n')
      .map((seg) => seg.trimStart())
      .join(', ')
      .replace(/\{\,/g, '{')
    const typeText = typeToString(checker.getTypeAtLocation(declaration))
    const link = getNodeLink(declaration)
    return { text, typeText, link, declaration }
  }
  return { text: '', link: '' }
}

function getTypeMap(type: ts.Type) {
  const map = {}
  type.getProperties().forEach((prop) => {
    let info = {}
    prop = prop?.syntheticOrigin || prop
    const propName = prop.escapedName as string
    const { text, link, typeText, declaration } = getDeclaratioInfo(prop)

    // if this property belongs to a type other then the passed in 'type'
    let parentInfo: { text: string; link: string } | undefined = undefined
    if (declaration?.parent) {
      const parentType = checker.getTypeAtLocation(declaration?.parent)
      if (type !== parentType && !(parentType.symbol.flags & ts.SymbolFlags.TypeLiteral)) {
        parentInfo = {
          text: parentType.symbol.getName(),
          link: getDeclaratioInfo(parentType.symbol).link,
        }
      }
    }
    info = {
      isOptional: prop.flags & ts.SymbolFlags.Optional,
      text,
      typeText,
      link,
      parentInfo,
    }
    map[propName] = info
  })
  return map
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
          problem = {
            sourceInfo: { type: firstType, typeText: sourceTypeText, text: sourceTypeText },
            targetInfo: { type: secondType, typeText: targetTypeText, text: targetTypeText },
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
      problem = {
        sourceInfo: { type: firstType, typeText: sourceTypeText, text: sourceTypeText },
        targetInfo: { type: secondType, typeText: targetTypeText, text: targetTypeText },
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
  const sources = sourceType.types || [sourceType]
  const targets = targetType.types || [targetType]
  if (
    !sources.every((source) => {
      return targets.some((target) => {
        const sourceTypeText = typeToString(source)
        const dgf = checker.typeToTypeNode(source, undefined, 0)
        const dsr = checker.getTypeAtLocation(dgf.elementType)
        const targetTypeText = typeToString(target)
        if (sourceTypeText !== targetTypeText) {
          if (sourceTypeText !== 'undefined') {
            // if source or target don't have properties, just log the mismatch
            if (isSimpleType(sourceTypeText) || isSimpleType(targetTypeText)) {
              problem = {
                sourceInfo: { type: source, typeText: sourceTypeText, text: sourceTypeText },
                targetInfo: { type: target, typeText: targetTypeText, text: targetTypeText },
              }
            } else if (targetTypeText !== 'undefined') {
              // else recurse into the properties of these types
              ;({ problem, recurses } = compareProperties(source, target))
              // try reverse-- unless user specifically set strictFunctions to no
              if (!problem && bothWays !== false) {
                ;({ problem } = compareProperties(target, source))
              }
              if (!problem) {
                if (recurses.length) {
                  propertyTypes.push(recurses)
                }
                return true
              }
            }
          } else {
            problem = {
              sourceInfo: { type: source, typeText: sourceTypeText, text: sourceTypeText },
              targetInfo: { type: target, typeText: targetTypeText, text: targetTypeText },
            }
          }
          return false
        }
        return true
      })
    })
  ) {
    doTheMath(problem, stack, context)
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
      message: `Bad assignment: ${errorNode.getText()}`,
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          sourceInfo: {
            typeText: sourceTypeText,
            text: `${sourceNode.getText()}: ${sourceTypeText}`,
            link: getNodeLink(sourceNode),
          },
          targetInfo: {
            typeText: targetTypeText,
            text: `${targetNode.getText()}: ${targetTypeText}`,
            link: getNodeLink(targetNode),
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
    const sourceTypeText = sourceType.value ? typeof sourceType.value : node.getText()
    const pathContext = {
      ...context,
      message: `Bad return type: ${targetTypeText} { ${chalk.whiteBright(node.getText())} }`,
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          targetInfo: {
            typeText: targetTypeText,
            text: `${container.parent.symbol.getName()}: ${targetTypeText}`,
            link: getNodeLink(container),
          },
          sourceInfo: {
            typeText: sourceTypeText.replace('return ', ''),
            text: `${node.getText()}${sourceType.value ? ' // (' + typeof sourceType.value + ')' : ''}`,
            link: getNodeLink(node),
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
function elaborateOnCallMismatches(node: ts.Node, context) {
  const children = node.getChildren()
  // signature of function being called
  const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0]
  // args that are being passed
  const args = children[2].getChildren().filter((node) => node.kind !== ts.SyntaxKind.CommaToken)
  //const index = args.findIndex((node) => node === errorNode)
  // for each arg, compare its type to call parameter type
  let hadPayoff = false
  const functionName = children[0].getText()
  args.some((arg, inx) => {
    const param = signature.getParameters()[inx]
    const sourceType = checker.getTypeOfSymbolAtLocation(param, node)
    const sourceTypeText = typeToString(sourceType)
    const targetType = checker.getTypeAtLocation(arg)
    const targetTypeText = typeToString(targetType)
    const paramName = `${param.escapedName}: ${sourceTypeText}`
    const message = `Bad call argument #${inx + 1} type: ${functionName}( ${chalk.whiteBright(
      arg.getText()
    )}, ) => ${functionName}( ${chalk.whiteBright(paramName)}, )`

    const pathContext = {
      ...context,
      message,
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
          sourceInfo: { typeText: sourceTypeText, text: paramName, link: getNodeLink(param.valueDeclaration) },
          targetInfo: { typeText: targetTypeText, text: arg.getText(), link: getNodeLink(node) },
        },
      ],
      pathContext
    )
    hadPayoff = pathContext.hadPayoff
    return hadPayoff // stops on first conflict just like ts
  })
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
  const context = { code, node, errorNode, nodeMaps }
  switch (node.kind) {
    // func type !== return type
    case ts.SyntaxKind.ReturnStatement:
      return elaborateOnReturnMismatch(node, undefined, context)

    // can't call this func with this argument type
    case ts.SyntaxKind.CallExpression:
      return elaborateOnCallMismatches(node, context)

    // can't declare variable with this value, ex:  const A = B, or let A = func()
    case ts.SyntaxKind.VariableDeclaration:
      const children = node.getChildren()
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

      // if the target is a path into an object, need to find the property in type
      const path = statement.expression.left.getText().split(/\W+/)
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
        context.errorNode = node
      }
      return elaborateOnAssignmentMismatch(statement, statement.expression.left, statement.expression.right, context)

    default:
      console.log(`Missing support for kind === ${node.kind}`)
      console.log(getNodeLink(node))
      return false
  }
}

function getNodeMaps(sourceFile: ts.SourceFile) {
  const nodeMaps = {
    startToNode: {},
    kindToNodes: {},
    returnToContainer: {},
    containerToReturns: {},
  }
  function mapNodes(node: ts.Node) {
    nodeMaps.startToNode[node.getStart()] = node
    let nodes = nodeMaps.kindToNodes[node.kind]
    if (!nodes) {
      nodes = nodeMaps.kindToNodes[node.kind] = []
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
const program = ts.createProgram(fileNames, options)
const checker = program.getTypeChecker()
const syntactic = program.getSyntacticDiagnostics()
elaborate(program.getSemanticDiagnostics(), fileNames)
if (!!syntactic.length) {
  console.log('Warning: there were syntax errors.', syntactic)
}
