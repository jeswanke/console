/* Copyright Contributors to the Open Cluster Management project */

import path from 'path'
import ts from 'typescript'
import cloneDeep from 'lodash/cloneDeep'
const { Table } = require('console-table-printer')

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

// !!!!!!!!!!!!!THE PAYOFF!!!!!!!!!!
function thePayoff(missings, mismatches, stack, context) {
  // const gg = [
  //   ['help', 'me'],
  //   ['frick', 'frck'],
  // ]
  //Create a table
  const p = new Table({
    columns: [
      { name: 'target', title: 'Target', alignment: 'left' },
      { name: 'source', title: 'Source', alignment: 'left' },
    ],
    // colorMap: {
    //   custom_green: '\x1b[32m', // define customized color
    // },
  })
  //  p.addRow({ target: 'rosa hemd wie immer', source: 'adsdgfs' }, { color: 'cyan' })

  stack.forEach(({ source, target, targetType, sourceType }, inx) => {
    if (inx === 0) {
      p.addRow({ target: target?.text, source: source?.text }, { color: 'green' })
    } else {
      //const dsf =
      const sdf = checker.typeToString(checker.getTypeOfSymbol(source.declarations[0].parent.symbol))
      const f = source.declarations[0].getText()
      const x = source.declarations[0].parent.symbol.declarations[0].getText()
      const g = target.declarations[0].getText()
      const y = target.declarations[0].parent.getText()
      p.addRow(
        {
          target: ` └─${targetType}`,
          source: ` └-${sourceType}`,
        },
        { color: 'green' }
      )
      p.addRow(
        { target: `   └─${target.declarations[0].getText()}`, source: `   └─${source.declarations[0].getText()}` },
        { color: 'green' }
      )
      //console.log(`    ${target.declarations[0].getText()}     ${source.declarations[0].getText()}`)
      //      console.log(`  ${target.escapedName}: ${targetType} !==  ${source.escapedName}: ${sourceType}`)
    }
  })
  p.printTable()
  // source: (firstProp?.parent || firstProp?.syntheticOrigin).declarations,
  // target: (secondProp?.parent || secondProp?.syntheticOrigin).declarations,

  if (stack.length) return
  const links: any = []
  if (context.noUndefined) {
    console.log(`\nADD "| undefined" here: ${context.targetTypeText} "| undefined"`)
  } else if (missings.length) {
    console.log('\nFOR these properties:\n')
    missings.forEach(({ theProp }) => {
      const declaration = theProp.declarations[0]
      console.log('\u2022 ' + declaration.getText())
      links.push(link(declaration))
    })
    // console.log(`\nADD them here: ${context.targetTypeText}`)
    // console.log([context.targetLink])
    // console.log('\nOR make them optional:')
    // console.log(links)
  } else if (mismatches.length) {
    mismatches.forEach(({ source, sourceType, target, targetType }) => {
      console.log(`\nEITHER make the source === ${targetType}`)
      console.log(`\nOR union the target type with ${sourceType}`)
      //      console.log(links)

      // if (target.node) {
      //   const sd = link(target.node)
      //   const sdr = 0
      // }

      // let declaration = source.declarations[0]
      // console.log('\u2022 ' + declaration.getText())
      // links.push(link(declaration))
      // console.log('\nMISMATCH')
      // declaration = target.declarations[0]
      // console.log('\u2022 ' + declaration.getText())
      // links.push(link(declaration))
      // console.log(links)
    })
  } else {
    console.log('Unidentified assignment error')
  }
}

function compareProperties(firstType, secondType) {
  const missings: any = []
  const mismatches: any = []
  const recurses: any = []
  firstType.getProperties().forEach((firstProp) => {
    firstProp = firstProp?.syntheticOrigin || firstProp
    const propName = firstProp.escapedName as string
    const secondProp = checker.getPropertyOfType(secondType, propName)
    if (secondProp) {
      const firstPropType = checker.getTypeOfSymbol(firstProp)
      const secondPropType = checker.getTypeOfSymbol(secondProp)
      if (firstType !== secondType) {
        // if both are simple types, just log the error
        if ((firstType.intrinsicName || 'not') !== (secondType.intrinsicName || 'not')) {
          mismatches.push({
            source: firstProp,
            sourceType: firstPropType,
            target: secondProp,
            targettype: secondPropType,
          })
        } else {
          // else recurse the complex types of these properties
          recurses.push({
            target: secondPropType,
            source: firstPropType,
            branch: {
              source: firstProp,
              target: secondProp,
              sourceType: checker.typeToString(firstPropType),
              targetType: checker.typeToString(secondPropType),
            },
          })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      missings.push({ target: secondType, theProp: firstProp })
    }
  })
  return { missings, mismatches, recurses }
}

// we know TS found a mismatch here -- we just have to find it again
function compareTypes(itarget, isource, stack, context, bothWays = false) {
  let reversed = false
  let missings = []
  let mismatches: any = []
  let recurses: any[] = []
  let noUndefined = false
  const propertyTypes: any = []
  const sources = isource.types || [isource]
  const targets = itarget.types || [itarget]
  if (
    !sources.every((source) => {
      return targets.some((target) => {
        if (source !== target) {
          if (source.intrinsicName !== 'undefined') {
            const targetType = checker.typeToString(target)
            const sourceType = checker.typeToString(source)
            if (source.value) {
              mismatches.push({
                source: source,
                sourceType: typeof source.value,
                target: target,
                targetType,
              })
            } else if (!target.intrinsicName) {
              ;({ missings, mismatches, recurses } = compareProperties(source, target))
              if (!missings.length && !mismatches.length && bothWays) {
                reversed = true
                ;({ missings, mismatches } = compareProperties(target, source))
              }
              if (!missings.length && !mismatches.length) {
                if (!recurses.length) {
                  mismatches.push({
                    source: source,
                    sourceType,
                    target: target,
                    targetType,
                  })
                } else {
                  propertyTypes.push(recurses)
                  return true
                }
              }
            } else if (target.intrinsicName !== 'undefined') {
              mismatches.push({
                source: source,
                sourceType,
                target: target,
                targetType,
              })
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
    thePayoff(missings, mismatches, stack, context)
    return false
  }
  if (propertyTypes.length) {
    // when properties types are made up of other properties
    // (ex: a structure and not an intrinsicName like 'string')
    return propertyTypes.every((recurses) => {
      return recurses.every(({ target, source, branch }) => {
        const clonedStack = cloneDeep(stack)
        clonedStack.push({
          ...branch,
        })
        return compareTypes(target, source, clonedStack, context, bothWays)
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
        let targetType
        let targetLink
        let targetTypeText
        const typeReference = container
          .getChildren()
          .reverse()
          .find(
            (c) =>
              c.kind === ts.SyntaxKind.TypeReference ||
              c.kind === ts.SyntaxKind.UnionType ||
              c.kind === ts.SyntaxKind.IntersectionType
          )
        if (typeReference) {
          targetType = checker.getTypeAtLocation(typeReference)
          targetTypeText = typeReference
            .getText()
            .split('\n')
            .map((l) => l.split('//')[0].trim())
            .join('')

          targetLink = link(typeReference)
        } else {
          const targetType: ts.Type = checker
            .getSignaturesOfType(checker.getTypeAtLocation(container), 0)[0]
            .getReturnType()

          targetTypeText = checker.typeToString(targetType)
          targetLink = link(container)
        }
        const sourceTypeText = node.getText()
        compareTypes(
          targetType,
          sourceType,
          [
            {
              target: { text: targetTypeText, link: targetLink },
              source: { text: sourceTypeText, link: link(node) },
            },
          ],
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
            source: sourceType.symbol,
            target: targetType.symbol,
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
