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
function showTheSolutions({ targetInfo, sourceInfo }, context, stack) {
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

  // then bang out the solutions
  const solutions: string[] = []
  const addEliminateMsg = (link) => {
    solutions.push(`\u25C9 Eliminate any code path that can lead to executing the line here: ${link}`)
  }
  const addUnionMsg = () => {
    const sourceType = chalk.blueBright(`"| ${sourceInfo.text}"`)
    solutions.push(`\u25C9 Append ${sourceType} to this type: ${targetText} here: ${targetLink}`)
  }
  switch (true) {
    case targetInfo.text === 'never':
      addEliminateMsg(targetLink)
      break
    case sourceInfo.text === 'never':
      addEliminateMsg(sourceLink)
      break
    case targetInfo.text === 'undefined':
      solutions.push('Ruh Roh')
      break
    case targetInfo.text === 'unknown':
      solutions.push('Ruh Roh')
      break
    case sourceInfo.text === 'undefined':
      if (isSimpleType(targetInfo.text)) {
        solutions.push('Ruh Roh')
      } else {
        addUnionMsg()
      }
      break
    case sourceInfo.text === 'unknown':
      solutions.push('Ruh Roh')
      break
    case isSimpleType(targetInfo.text) && isSimpleType(sourceInfo.text):
      addUnionMsg()
      break
    case isSimpleType(targetInfo.text):
      solutions.push('Ruh Roh')
      break
    case isSimpleType(sourceInfo.text):
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
        const externalLibs = `"${Array.from(libs).join(',')}"`
        solutions.push(
          `\u25C9 Ask the owners of ${chalk.blueBright(externalLibs)} to make the listed properties optional.`
        )
        solutions.push(`\u25C9 Until there's a fix, disable this error by inserting these comments here: ${sourceLink}`)
        solutions.push(`    ${chalk.greenBright('// eslint-disable-next-line @typescript-eslint/ban-ts-comment')} `)
        solutions.push(`    ${chalk.greenBright(`// @ts-ignore: Fixed required in ${externalLibs}`)} `)

        //     ask 'library' to make these properties optional
        //     add this above here: LINK
        //        eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //
      } else {
        solutions.push('Ruh Roh')
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
  return solutions
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function showTheMath(problem, stack, context) {
  // error
  console.log(`TS${context.code}: ${context.message}`)
  // log the call stack
  const { sourceInfo, targetInfo } = stack[0]
  const p = new Table({
    columns: [
      { name: 'target', minLen: 60, title: targetInfo.link, alignment: 'left' },
      {
        name: 'source',
        minLen: 60,
        title: sourceInfo.link === targetInfo.link ? 'on the same line' : sourceInfo.link,
        alignment: 'left',
      },
    ],
  })

  const notes = []
  let simpleConflict = false
  let lastTargetType
  let lastSourceType

  let spacer = ''
  stack.forEach((layer, inx) => {
    const { sourceInfo, targetInfo, parentSourceInfo, parentTargetInfo } = layer
    simpleConflict = isSimpleConflict(targetInfo?.text, sourceInfo?.text)
    const color = simpleConflict ? 'red' : 'green'
    if (inx === 0) {
      p.addRow(
        {
          target: `${min(notes, targetInfo?.text)}`,
          source: `${min(notes, sourceInfo?.text)}`,
        },
        { color }
      )
      spacer += '  '
    } else {
      if (parentSourceInfo && parentTargetInfo.text !== lastTargetType && parentSourceInfo.text !== lastSourceType) {
        p.addRow(
          {
            source: `${spacer}└${min(notes, parentSourceInfo.text)}`,
            target: `${spacer}└${min(notes, parentTargetInfo.text)}`,
          },
          { color }
        )
        spacer += '  '
      }
      if (targetInfo.text !== lastTargetType && sourceInfo.text !== lastSourceType) {
        p.addRow(
          {
            target: `${spacer}${simpleConflict ? '  ' : '└'}${min(notes, targetInfo.text)}`,
            source: `${spacer}${simpleConflict ? '  ' : '└'}${min(notes, sourceInfo.text)}`,
          },
          { color }
        )
        spacer += '  '
      }
    }
    lastTargetType = targetInfo.text
    lastSourceType = sourceInfo.text
  })

  // there were missing/mismatched properties
  let sourceProps: { missing: any[]; mismatch: any[] } | undefined = undefined
  let targetProps: { missing: any[]; mismatch: any[] } | undefined = undefined
  if (!simpleConflict && problem) {
    const mismatch: string[] = []
    const missing: { source?: string; target?: string }[] = []
    context.externalLinks = []
    const targetMap = getTypeMap(
      context.reversed ? problem.targetInfo.type : problem.sourceInfo.type,
      context.externalLinks
    )
    const sourceMap = getTypeMap(
      context.reversed ? problem.sourceInfo.type : problem.targetInfo.type,
      context.externalLinks
    )
    sourceProps = { missing: [], mismatch: [] }
    targetProps = { missing: [], mismatch: [] }
    Object.keys(sourceMap).forEach((propName) => {
      if (targetMap[propName] && targetMap[propName].text) {
        if (sourceMap[propName].text === targetMap[propName].text || context.reversed) {
          p.addRow(
            {
              target: `${spacer}${min(notes, targetMap[propName].text)}`,
              source: `${spacer}${min(notes, sourceMap[propName].text)}`,
            },
            { color: 'green' }
          )
        } else {
          mismatch.push(propName)
        }
      } else if (sourceMap[propName].isOptional) {
        if (showOptionals) {
          p.addRow(
            {
              target: '',
              source: `${spacer}${min(notes, sourceMap[propName].text)}`,
            },
            { color: 'green' }
          )
        }
      } else {
        missing.push({ source: propName })
      }
    })
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
    mismatch.forEach((propName) => {
      p.addRow(
        {
          target: `${spacer}${min(notes, targetMap[propName].text)}`,
          source: `${spacer}${min(notes, sourceMap[propName].text)}  ${addNote(
            notes,
            sourceMap[propName].parentType,
            sourceMap[propName].link,
            true
          )}`,
        },
        { color: 'yellow' }
      )
      sourceProps?.mismatch.push(sourceMap[propName])
      targetProps?.mismatch.push(targetMap[propName])
    })
    missing.some(({ target, source }, inx) => {
      if (inx < MAX_SHOWN_PROP_MISMATCH) {
        if (source) {
          sourceProps?.missing.push(sourceMap[source])
        }
        if (target) {
          targetProps?.missing.push(targetMap[target])
        }
        target = target
          ? `${spacer}${min(notes, targetMap[target].text)}  ${addNote(
              notes,
              targetMap[target].parentType,
              targetMap[target].link,
              true
            )}`
          : ''
        source = source
          ? `${spacer}${min(notes, sourceMap[source].text)}  ${addNote(
              notes,
              sourceMap[source].parentType,
              sourceMap[source].link,
              true
            )}`
          : ''
        p.addRow(
          {
            source,
            target,
          },
          { color: 'red' }
        )
        return false
      } else {
        p.addRow(
          {
            source: `${spacer}...and ${missing.length - 6} more ...`,
            target: '',
          },
          { color: 'red' }
        )
        return true
      }
    })
  }

  p.printTable()
  notes.forEach((note) => console.log(note))
  if (notes.length) console.log('')

  problem.sourceInfo.props = sourceProps
  problem.targetInfo.props = targetProps
  const solutions: string[] = showTheSolutions(problem, context, stack)
  solutions.forEach((solution) => console.log(chalk.whiteBright(solution)))
  if (solutions.length) console.log('')
}

function isSimpleConflict(targetTypeText, sourceTypeText) {
  return targetTypeText !== sourceTypeText && (isSimpleType(targetTypeText) || isSimpleType(sourceTypeText))
}

function getTypeMap(type: ts.Type, externalLinks) {
  const map = {}
  type.getProperties().forEach((prop) => {
    prop = prop?.syntheticOrigin || prop
    const propName = prop.escapedName as string
    const declarations = prop?.declarations
    let info = {}
    if (Array.isArray(declarations)) {
      const declaration = declarations[0]
      const text = declaration
        .getText()
        .split('\n')
        .map((seg) => seg.trimStart())
        .join('')
      const parentType = checker.typeToString(checker.getTypeAtLocation(declaration.parent))
      const link = getNodeLink(declaration)
      if (link.indexOf('node_modules/') !== -1) {
        externalLinks.push(link)
      }
      info = {
        isOptional: prop.flags & ts.SymbolFlags.Optional,
        text,
        link,
        parentType: parentType.startsWith('{') ? '' : parentType,
      }
    }
    map[propName] = info
  })
  return map
}

// ===============================================================================
// ===============================================================================
// ===============================================================================

function addNote(notes: string[], note: string, link?: ts.Node | string, conflict?: boolean) {
  const num = String.fromCharCode('\u2460'.charCodeAt(0) + notes.length)
  let fullNote = `${chalk.bold(num)}`
  if (note) {
    fullNote += `  ${note}`
  }
  if (link) {
    fullNote += `  ${typeof link === 'string' ? link : getNodeLink(link)}`
  }
  if (conflict === true) {
    fullNote = chalk.red(fullNote)
  }
  notes.push(fullNote)
  return num
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
function isSimpleType(type) {
  return simpleTypes.includes(type)
}

function min(notes, type) {
  type = type.replace(' | undefined', '').replace(/\\n/g, '')
  if (type.length > 90) {
    type = `${type.substr(0, 25)}..${type.substr(-45)}  ${addNote(notes, type)}`
  }
  return type
}

function typeToString(type) {
  if (type.value) {
    return typeof type.value
  }
  return checker.typeToString(type)
}

function getTypeLink(type: ts.Type) {
  if (type) {
    //const declarations = type.symbol.declarations
    // if (Array.isArray(declarations)) {
    //   return getNodeLink(declarations[0])
    // }
  }
  return ''
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
        // if both are simple types, just log the error
        if ((secondPropType.intrinsicName || 'not') !== (firstPropType.intrinsicName || 'not')) {
          // mismatch
          problem = {
            sourceInfo: { type: firstType, text: sourceTypeText },
            targetInfo: { type: secondType, text: targetTypeText },
          }
          return false
        } else {
          // else recurse the complex types of these properties
          recurses.push({
            targetType: secondPropType,
            sourceType: firstPropType,
            branch: {
              sourceInfo: {
                text: typeToString(firstPropType),
                link: firstPropType.types ? '' : getTypeLink(firstPropType),
              },
              targetInfo: {
                text: typeToString(secondPropType),
                link: firstPropType.types ? '' : getTypeLink(secondPropType),
              },
              parentTargetInfo: { text: targetTypeText },
              parentSourceInfo: { text: sourceTypeText },
            },
          })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      // missing
      problem = {
        sourceInfo: { type: firstType, text: sourceTypeText },
        targetInfo: { type: secondType, text: targetTypeText },
      }
      return false
    }
    return true
  })
  return { problem, recurses }
}

// we know TS found a mismatch here -- we just have to find it again
function compareTypes(targetType, sourceType, stack, context, bothWays = false) {
  let problem: any | undefined = undefined
  let recurses: any[] = []
  const propertyTypes: any = []
  const sources = sourceType.types || [sourceType]
  const targets = targetType.types || [targetType]
  if (
    !sources.every((source) => {
      return targets.some((target) => {
        const sourceTypeText = typeToString(source)
        const targetTypeText = typeToString(target)
        if (sourceTypeText !== targetTypeText) {
          if (sourceTypeText !== 'undefined') {
            // if source or target don't have properties, just log the mismatch
            if (isSimpleType(sourceTypeText) || isSimpleType(targetTypeText)) {
              problem = {
                sourceInfo: { type: source, text: sourceTypeText },
                targetInfo: { type: target, text: targetTypeText },
              }
            } else if (targetTypeText !== 'undefined') {
              // else recurse into the properties of these types
              ;({ problem, recurses } = compareProperties(source, target))
              if (!problem) {
                context.reversed = true
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
              sourceInfo: { type: source, text: sourceTypeText },
              targetInfo: { type: target, text: targetTypeText },
            }
          }
          return false
        }
        return true
      })
    })
  ) {
    showTheMath(problem, stack, context)
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

// B = A
function elaborateAssignmentMismatch(code, node: ts.Node, nodeMaps) {
  let children = node.getChildren()
  const sourceNode = children[children.length - 1]
  const targetNode = children[0]
  const targetType: ts.Type = checker.getTypeAtLocation(targetNode)
  const targetTypeText = typeToString(targetType)

  // B = function()
  if (isFunctionLikeKind(sourceNode.kind)) {
    // if function, need to make sure each type returned can be assigned to target
    const returns = nodeMaps.containerToReturns[sourceNode.getStart()]
    if (returns) {
      let hadPayoff = false
      returns.forEach((rn) => {
        if (hadPayoff) {
          console.log('\n\n')
        }
        hadPayoff = elaborateReturnMismatch(code, rn, targetType, nodeMaps)
      })
      return hadPayoff
    }
    return false
  } else {
    const sourceType: ts.Type = checker.getTypeAtLocation(sourceNode)
    const sourceTypeText = typeToString(sourceType)
    const link = getNodeLink(sourceNode)
    const context = {
      code,
      node,
      message: `Bad assignment: ${node.getText()}`,
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          sourceInfo: { text: sourceTypeText, link },
          targetInfo: { text: targetTypeText, link },
        },
      ],
      context
    )
    return context.hadPayoff
  }
}

// B => {return A}
function elaborateReturnMismatch(code, node: ts.Node, containerType: ts.Type | undefined, nodeMaps) {
  const children = node.getChildren()
  // source is return type
  const sourceType: ts.Type = checker.getTypeAtLocation(children[1])
  // target is container type
  const container = nodeMaps.returnToContainer[node.getStart()]
  if (container) {
    containerType = containerType || checker.getTypeAtLocation(container)
    const targetType: ts.Type = checker.getSignaturesOfType(containerType, 0)[0].getReturnType()
    const targetTypeText = typeToString(targetType)
    const sourceTypeText = sourceType.value ? typeof sourceType.value : node.getText()
    const context = {
      code,
      node,
      message: `Bad return type: ${targetTypeText} { ${chalk.whiteBright(node.getText())} }`,
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          targetInfo: { text: targetTypeText, link: getNodeLink(container) },
          sourceInfo: { text: sourceTypeText.replace('return ', ''), link: getNodeLink(node) },
        },
      ],
      context,
      options.strictFunctionTypes
    )
    return context.hadPayoff
  }
  return false
}

// call func(..A...) => (...B...)
function elaborateCallMismatches(code, node: ts.Node, errorNode: ts.Node) {
  const children = node.getChildren()
  // signature of function being called
  const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0]
  // args that are being passed
  const args = children[2].getChildren().filter((node) => node.kind !== ts.SyntaxKind.CommaToken)
  const index = args.findIndex((node) => node === errorNode)
  // for each arg, compare its type to call parameter type
  let hadPayoff = false
  const functionName = children[0].getText()
  args.some((arg, inx) => {
    const param = signature.getParameters()[inx]
    const sourceType = checker.getTypeOfSymbolAtLocation(param, node)
    const sourceTypeText = typeToString(sourceType)
    const targetType = checker.getTypeAtLocation(arg)
    const targetTypeText = typeToString(targetType)
    const paramName = chalk.whiteBright(`${param.escapedName}: ${sourceTypeText}`)
    const message = `Bad call argument #${inx + 1} type: ${functionName}( ${chalk.whiteBright(
      arg.getText()
    )}, ) => ${functionName}( ${paramName}, )`

    const context = {
      code,
      node,
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
          sourceInfo: { text: sourceTypeText, link: getNodeLink(param.valueDeclaration) },
          targetInfo: { text: targetTypeText, link: getNodeLink(node) },
        },
      ],
      context
    )
    hadPayoff = context.hadPayoff
    return hadPayoff
  })
  return hadPayoff
}

function elaborateMismatch(code, errorNode: ts.Node, nodeMaps) {
  const node =
    ts.findAncestor(errorNode, (node) => {
      return !!node && isElaboratableKind(node.kind)
    }) || errorNode
  switch (node.kind) {
    // func type !== return type
    case ts.SyntaxKind.ReturnStatement:
      return elaborateReturnMismatch(code, node, undefined, nodeMaps)

    // can't call this func with this argument type
    case ts.SyntaxKind.CallExpression:
      return elaborateCallMismatches(code, node, errorNode)

    // can't set A = B, or A = func()
    case ts.SyntaxKind.VariableDeclaration:
      return elaborateAssignmentMismatch(code, node, nodeMaps)

    // can't set A = B
    case ts.SyntaxKind.Identifier:
      return elaborateAssignmentMismatch(code, node.parent, nodeMaps)

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
      const node = nodeMaps.startToNode[start]
      if (node) {
        switch (code) {
          case 2322:
          case 2559:
          case 2345:
            if (hadPayoff) {
              console.log('\n\n')
            }
            hadPayoff = elaborateMismatch(code, node, nodeMaps)
            anyPayoff = anyPayoff || hadPayoff
            break
          // default:
          //   console.log(`TS${code}: ${messageText}\n  ${getNodeLink(node)}\n  https://typescript.tv/errors/#TS${code}`)
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
