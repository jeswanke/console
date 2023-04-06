import { join } from 'path'
/* Copyright Contributors to the Open Cluster Management project */

import path from 'path'
import ts from 'typescript'
import set from 'lodash/set'
import cloneDeep from 'lodash/cloneDeep'
import { Table } from 'console-table-printer'

let options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
}

interface PropMap {
  [key: string]: TypeInfo
}
interface TypeInfo {
  parent: TypeInfo
  type: string
  maps?: PropMap[]
  property: any
}

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

function link(node: ts.Node) {
  const file = node.getSourceFile()
  const relative = path.relative(process.argv[1], file.fileName).replace(/\.\.\//g, '')
  return `${relative}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
}

function getTypeMap(type: ts.Type) {
  const map = {}
  type.getProperties().forEach((prop) => {
    const propName = prop.escapedName as string
    const declarations = prop?.declarations
    let info = {}
    if (Array.isArray(declarations)) {
      info = {
        parentType: checker.typeToString(checker.getTypeAtLocation(declarations[0].parent)),
        text: declarations[0].getText(),
        link: link(declarations[0]),
      }
    }
    map[propName] = info
  })
  return map
}

// !!!!!!!!!!!!!THE PAYOFF!!!!!!!!!!
function theBigPayoff(stack, problem, context) {
  // Create a table
  const p = new Table({
    columns: [
      { name: 'target', title: 'Target', alignment: 'left' },
      { name: 'source', title: 'Source', alignment: 'left' },
    ],
  })

  // log the call stack
  let index = 0
  stack.forEach(({ sourceInfo, targetInfo, parentSourceInfo, parentTargetInfo }, inx) => {
    if (inx === 0) {
      p.addRow({ target: targetInfo?.text, source: sourceInfo?.text }, { color: 'green' })
    } else {
      if (parentSourceInfo) {
        p.addRow(
          {
            target: ` └${parentTargetInfo.text}`,
            source: ` └${parentSourceInfo.text}`,
          },
          { color: 'green' }
        )
      }
      p.addRow(
        {
          target: `   └${targetInfo.text}`,
          source: `   └${sourceInfo.text}`,
        },
        { color: 'green' }
      )
    }
  })

  if (problem) {
    const mismatch: string[] = []
    const missing: string[] = []
    const targetMap = getTypeMap(context.reversed ? problem.sourceType : problem.targetType)
    const sourceMap = getTypeMap(context.reversed ? problem.targetType : problem.sourceType)
    Object.keys(sourceMap).forEach((propName) => {
      if (targetMap[propName] || OPTIONAL) {
        if (sourceMap[propName].text === targetMap[propName].text) {
          p.addRow(
            {
              target: `     └${targetMap[propName].text}`,
              source: `     └${sourceMap[propName].text}`,
            },
            { color: 'green' }
          )
        } else {
          mismatch.push(propName)
        }
      } else {
        missing.push(propName)
      }
    })
    mismatch.forEach((propName) => {
      p.addRow(
        {
          target: `     ${targetMap[propName].text}`,
          source: `     ${sourceMap[propName].text}`,
        },
        { color: 'yellow' }
      )
    })
    missing.forEach((propName) => {
      p.addRow(
        {
          target: '',
          source: `     ${sourceMap[propName].text}`,
        },
        { color: 'red' }
      )
    })
  } else {
    console.log('Unidentified assignment error')
  }

  p.printTable()
  // return
  // // log the error
  // // if (context.noUndefined) {
  // //   console.log(`\nADD "| undefined" here: ${context.targetTypeText} "| undefined"`)
  // // } else
  // if (missings.length) {
  //   missings.forEach(({ theProp, sourcePropNames, targetPropNames }) => {
  //     const declaration = theProp.declarations[0]
  //     const sdf = checker.getTypeAtLocation((theProp?.parent || theProp?.syntheticOrigin).parent.declarations[0])
  //     const parent = checker.typeToString(sdf)
  //     // target: (secondProp?.parent || secondProp?.syntheticOrigin).declarations,

  //     //      links.push(link(declaration))
  //     p.addRow({ target: targetPropNames.join(), source: sourcePropNames.join() }, { color: 'green' })
  //     p.addRow({ target: '', source: declaration.getText() }, { color: 'red' })
  //   })
  // } else if (mismatches.length) {
  //   mismatches.forEach(({ source, sourceType, target, targetType, sourcePropNames = [], targetPropNames = [] }) => {
  //     p.addRow({ target: targetPropNames.join(), source: sourcePropNames.join() }, { color: 'green' })
  //     p.addRow({ target: targetType, source: sourceType }, { color: 'red' })
  //     const sdf = 0
  //     //      console.log(links)

  //     // if (target.node) {
  //     //   const sd = link(target.node)
  //     //   const sdr = 0
  //     // }

  //     // let declaration = source.declarations[0]
  //     // console.log('\u2022 ' + declaration.getText())
  //     // links.push(link(declaration))
  //     // console.log('\nMISMATCH')
  //     // declaration = target.declarations[0]
  //     // console.log('\u2022 ' + declaration.getText())
  //     // links.push(link(declaration))
  //     // console.log(links)
  //   })
  // }

  // p.printTable()

  // // source: (firstProp?.parent || firstProp?.syntheticOrigin).declarations,
  // // target: (secondProp?.parent || secondProp?.syntheticOrigin).declarations,

  // if (!missings.length && !mismatches.length) {
  // }
  // // if (stack.length) return
  // // const links: any = []
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
      if (firstType !== secondType) {
        // if both are simple types, just log the error
        if ((firstType.intrinsicName || 'not') !== (secondType.intrinsicName || 'not')) {
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
              sourceInfo: { text: checker.typeToString(firstPropType) },
              targetInfo: { text: checker.typeToString(secondPropType) },
              parentTargetInfo: { text: checker.typeToString(secondType) },
              parentSourceInfo: { text: checker.typeToString(firstType) },
            },
          })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      problem = { sourceType: firstType, targetType: secondType }
      return false
    }
    return true
  })
  return { problem, recurses }
}

// we know TS found a mismatch here -- we just have to find it again
function compareTypes(targetType, sourceType, stack, context, bothWays = false) {
  let reversed = false
  let problem: any | undefined = undefined
  let recurses: any[] = []
  let noUndefined = false
  const propertyTypes: any = []
  const sources = sourceType.types || [sourceType]
  const targets = targetType.types || [targetType]
  if (
    !sources.every((source) => {
      return targets.some((target) => {
        if (source !== target) {
          if (source.intrinsicName !== 'undefined') {
            if (source.value) {
              problem = {
                sourceType: source,
                targetType: target,
              }
            } else if (!target.intrinsicName) {
              ;({ problem, recurses } = compareProperties(source, target))
              if (!problem && bothWays) {
                reversed = true
                ;({ problem } = compareProperties(target, source))
              }
              if (!problem) {
                if (!recurses.length) {
                  problem = {
                    sourceType: source,
                    targetType: target,
                  }
                } else {
                  propertyTypes.push(recurses)
                  return true
                }
              }
            } else if (target.intrinsicName !== 'undefined') {
              problem = {
                sourceType: source,
                targetType: target,
              }
            }
          } else {
            noUndefined = true
          }
          return false
        }
        return true
      })
    })
  ) {
    context.reversed = reversed
    context.noUndefined = noUndefined
    theBigPayoff(stack, problem, context)
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

function elaborateOnTheMismatch(code, node: ts.Node) {
  node =
    ts.findAncestor(node, (node) => {
      return !!node && isElaboratableKind(node.kind)
    }) || node
  const children = node.getChildren()
  console.log(`TS${code}: Target !== Source`)
  switch (node.kind) {
    // can't return this type
    case ts.SyntaxKind.ReturnStatement: {
      // source is return type
      const sourceType: ts.Type = checker.getTypeAtLocation(children[1])
      // target is container type
      const container = ts.findAncestor(node.parent, (node) => {
        return !!node && (isFunctionLikeKind(node.kind) || ts.isClassStaticBlockDeclaration(node))
      })
      if (container) {
        let targetLink
        let targetTypeText

        const targetType: ts.Type = checker
          .getSignaturesOfType(checker.getTypeAtLocation(container), 0)[0]
          .getReturnType()

        targetTypeText = checker.typeToString(targetType)
        targetLink = link(container)
        const sourceTypeText = node.getText()
        const stack = [
          {
            targetInfo: { text: targetTypeText, link: targetLink },
            sourceInfo: { text: sourceTypeText, link: link(node) },
          },
        ]
        compareTypes(
          targetType,
          sourceType,
          stack,
          {
            code,
            node,
            targetTypeText,
            targetLink,
            sourceTypeText,
          },
          options.strictFunctionTypes
        )
      }

      break
    }
    // can't set A = B, or A = func()
    case ts.SyntaxKind.VariableDeclaration: {
      const targetType: ts.Type = checker.getTypeAtLocation(children[0])
      const sourceType: ts.Type = checker.getTypeAtLocation(children[children.length - 1])
      const sourceTypeText = checker.typeToString(sourceType)
      const targetTypeText = checker.typeToString(targetType)
      compareTypes(
        targetType,
        sourceType,
        [
          {
            sourceInfo: { text: sourceTypeText }, //sourceType.symbol,
            targetInfo: { text: targetTypeText }, //targetType.symbol,
          },
        ],
        {
          code,
          node,
          targetTypeText,
          sourceTypeText,
        }
      )
      break
    }

    // can't pass these values to this call
    case ts.SyntaxKind.CallExpression: {
      console.log('call')
      const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0]
      const args = children[2].getChildren()
      signature.getParameters().forEach((param) => {
        const targetType = checker.getTypeOfSymbolAtLocation(param, node)
        const sourceType = checker.getTypeAtLocation(args[0])
      })
      break
    }
    default:
      console.log(`Missing support for kind === ${node.kind}`)
  }
}

function getNodeMap(sourceFile: ts.SourceFile) {
  let nodeMap = {}
  mapNodes(sourceFile)
  function mapNodes(node: ts.Node) {
    nodeMap[node.getStart()] = node
    ts.forEachChild(node, mapNodes)
  }
  return nodeMap
}

function elaborate(semanticDiagnostics: readonly ts.Diagnostic[]) {
  const fileMap = {}
  semanticDiagnostics.forEach(({ code, file, start, messageText }) => {
    if (file) {
      let nodeMap = fileMap[file.fileName]
      if (!nodeMap) {
        nodeMap = fileMap[file.fileName] = getNodeMap(file)
      }
      const node = nodeMap[start]
      if (node) {
        switch (code) {
          case 2322:
          case 2559:
          case 2345:
            console.log('\n\n')
            elaborateOnTheMismatch(code, node)
            break
          // default:
          //   console.log(`TS${code}: ${messageText}\n  ${link(node)}\n  https://typescript.tv/errors/#TS${code}`)
        }
      }
    }
  })
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
elaborate(program.getSemanticDiagnostics())
if (!!syntactic.length) {
  console.log('Warning: there were syntax errors.', syntactic)
}
