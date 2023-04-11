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

enum Solutions {
  StrictFunc = '(These errors were caught because the "strictFunctionTypes" option was set)',
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
    fullNote += `  ${typeof link === 'string' ? link : getLink(link)}`
  }
  if (conflict === true) {
    fullNote = chalk.red(fullNote)
  }
  notes.push(fullNote)
  return num
}

function min(notes, type) {
  type = type.replace(' | undefined', '').replace(/\\n/g, '')
  if (type.length > 90) {
    type = `${type.substr(0, 25)}..${type.substr(-45)}  ${addNote(notes, type)}`
  }
  return type
}

function getLink(node: ts.Node | undefined) {
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

const simpleTypes = ['string', 'number', 'boolean', 'any', 'unknown', 'never', 'undefined']
function isSimpleType(type) {
  return simpleTypes.includes(type)
}
function isSimpleConflict(targetTypeText, sourceTypeText) {
  return targetTypeText !== sourceTypeText && (isSimpleType(targetTypeText) || isSimpleType(sourceTypeText))
}

function typeToString(type) {
  if (type.value) {
    return typeof type.value
  }
  return checker.typeToString(type)
}

function getTypeMap(type: ts.Type) {
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
      info = {
        isOptional: prop.flags & ts.SymbolFlags.Optional,
        text,
        link: getLink(declaration),
        parentType: parentType.startsWith('{') ? '' : parentType,
      }
    }
    map[propName] = info
  })
  return map
}

// !!!!!!!!!!!!!THE PAYOFF!!!!!!!!!!
function theBigPayoff(stack, problem, context) {
  // error
  console.log(`TS${context.code}: ${context.message}`)
  // log the call stack
  const { sourceInfo, targetInfo } = stack[0]
  const p = new Table({
    columns: [
      { name: 'target', title: targetInfo.link, alignment: 'left' },
      { name: 'source', title: sourceInfo.link, alignment: 'left' },
    ],
  })

  let index = 0
  const notes = []
  const solutions: string[] = []
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
  if (!simpleConflict && problem) {
    const mismatch: string[] = []
    const missingS2T: string[] = []
    const missingT2S: string[] = []
    const targetMap = getTypeMap(context.reversed ? problem.targetType : problem.sourceType)
    const sourceMap = getTypeMap(context.reversed ? problem.sourceType : problem.targetType)
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
        missingS2T.push(propName)
      }
    })
    Object.keys(targetMap).forEach((propName) => {
      if (!targetMap[propName].isOptional && (!sourceMap[propName] || !sourceMap[propName].text)) {
        missingT2S.push(propName)
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
    })
    missingS2T.some((propName, inx) => {
      if (inx < MAX_SHOWN_PROP_MISMATCH) {
        p.addRow(
          {
            source: `${spacer}${min(notes, sourceMap[propName].text)}  ${addNote(
              notes,
              sourceMap[propName].parentType,
              sourceMap[propName].link,
              true
            )}`,
            target: '',
          },
          { color: 'red' }
        )
        return false
      } else {
        p.addRow(
          {
            source: `${spacer}...and ${missingS2T.length - 6} more ...`,
            target: '',
          },
          { color: 'red' }
        )
        return true
      }
    })
    missingT2S.some((propName, inx) => {
      if (inx < MAX_SHOWN_PROP_MISMATCH) {
        p.addRow(
          {
            target: `${spacer}${min(notes, targetMap[propName].text)}  ${addNote(
              notes,
              targetMap[propName].parentType,
              targetMap[propName].link,
              true
            )}`,
            source: '',
          },
          { color: 'red' }
        )
        return false
      } else {
        p.addRow(
          {
            target: `${spacer} ...and ${missingT2S.length - 6} more ...`,
            source: '',
          },
          { color: 'red' }
        )
        return true
      }
    })
  }

  p.printTable()
  solutions.forEach((solution) => console.log(chalk.whiteBright(solution)))
  if (solutions.length) console.log('')
  notes.forEach((solution) => console.log(solution))
  if (context.reversed) {
    console.log(chalk.red(Solutions.StrictFunc))
  }
}

function compareProperties(firstType, secondType) {
  let problem: any | undefined = undefined
  const recurses: any = []
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
            sourceType: firstType,
            targetType: secondType,
          }
          return false
        } else {
          // else recurse the complex types of these properties
          recurses.push({
            targetType: secondPropType,
            sourceType: firstPropType,
            branch: {
              sourceInfo: { text: typeToString(firstPropType) },
              targetInfo: { text: typeToString(secondPropType) },
              parentTargetInfo: { text: typeToString(secondType) },
              parentSourceInfo: { text: typeToString(firstType) },
            },
          })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      // missing
      problem = { sourceType: firstType, targetType: secondType }
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
          // if source or target don't have properties, just log the mismatch
          if (isSimpleType(sourceTypeText) || isSimpleType(targetTypeText)) {
            problem = {
              sourceType: source,
              targetType: target,
            }
          } else {
            // else recurse into the properties of these types
            ;({ problem, recurses } = compareProperties(source, target))
            if (!problem && bothWays) {
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
          return false
        }
        return true
      })
    })
  ) {
    theBigPayoff(stack, problem, context)
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
    const link = getLink(sourceNode)
    const context = {
      code,
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
      message: `Bad return type: ${targetTypeText} { ${chalk.whiteBright(node.getText())} }`,
      hadPayoff: false,
    }
    compareTypes(
      targetType,
      sourceType,
      [
        {
          targetInfo: { text: targetTypeText, link: getLink(container) },
          sourceInfo: { text: sourceTypeText.replace('return ', ''), link: getLink(node) },
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
    //if (inx === index) {
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
          sourceInfo: { text: sourceTypeText, link: getLink(param.valueDeclaration) },
          targetInfo: { text: targetTypeText, link: getLink(node) },
        },
      ],
      context
    )
    hadPayoff = context.hadPayoff
    return hadPayoff
    //}
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
      console.log(getLink(node))
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
          //   console.log(`TS${code}: ${messageText}\n  ${getLink(node)}\n  https://typescript.tv/errors/#TS${code}`)
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
