/* Copyright Contributors to the Open Cluster Management project */

import path from 'path'
import ts from 'typescript'
import cloneDeep from 'lodash/cloneDeep'

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

function nodeInfo(node: ts.Node) {
  return {
    text: node.getText(),
    link: link(node),
  }
}

// !!!!!!!!!!!!!THE PAYOFF!!!!!!!!!!
function thePayoff(missings, mismatches, parents, context) {
  const links: any = []
  if (context.noUndefined) {
    console.log(`\nADD "| undefined" here: ${context.targetTypeText} "| undefined"`)
    console.log(context.links)
  } else if (missings.length) {
    console.log('\nFOR these properties:\n')
    missings.forEach(({ theProp }) => {
      const declaration = theProp.declarations[0]
      console.log('\u2022 ' + declaration.getText())
      links.push(link(declaration))
    })
    console.log(`\nADD them here: ${context.targetTypeText}`)
    console.log([context.targetLink])
    console.log('\nOR make them optional:')
    console.log(links)
  } else if (mismatches.length) {
    mismatches.forEach(({ source, sourceType, target, targetType }) => {
      console.log(`\nEITHER make the source === ${targetType}`)
      console.log(`\nOR union the target type with ${sourceType}`)
      console.log(links)

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
    console.log("Oh man--this ain't good!!!")
  }
}

function compareProperties(first, second) {
  const missings: any = []
  const mismatches: any = []
  const recurses: any = []
  first.getProperties().forEach((firstProp) => {
    firstProp = firstProp?.syntheticOrigin || firstProp
    const propName = firstProp.escapedName as string
    const secondProp = checker.getPropertyOfType(second, propName)
    if (secondProp) {
      const firstType = checker.getTypeOfSymbol(firstProp)
      const secondType = checker.getTypeOfSymbol(secondProp)
      if (firstType !== secondType) {
        if ((firstType.intrinsicName || 'not') !== (secondType.intrinsicName || 'not')) {
          mismatches.push({
            source: firstProp,
            sourceType: firstType,
            target: secondProp,
            targettype: secondType,
          })
        } else {
          recurses.push({
            target: firstType,
            targetDeclarations: (secondProp?.parent || secondProp?.syntheticOrigin).declarations,
            source: secondType,
            sourceDeclarations: (firstProp?.parent || firstProp?.syntheticOrigin).declarations,
          })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      missings.push({ target: second, theProp: firstProp })
    }
  })
  return { missings, mismatches, recurses }
}

// we know TS found a mismatch here -- we just have to find it again
function compareTypes(itarget, isource, parents, context, bothWays = false) {
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
    thePayoff(missings, mismatches, parents, context)
    return false
  }
  if (propertyTypes.length) {
    // when properties types are made up of other properties
    // (ex: a structure and not an intrinsicName like 'string')
    return propertyTypes.every((recurses) => {
      return recurses.every(({ target, targetDeclarations, source, sourceDeclarations }) => {
        const cloneParents = cloneDeep(parents)
        cloneParents.push({
          targetType: checker.typeToString(target),
          sourceType: checker.typeToString(source),
          sourceDeclarations: sourceDeclarations.map(nodeInfo),
          targetDeclarations: targetDeclarations.map(nodeInfo),
        })

        return compareTypes(target, source, cloneParents, context, bothWays)
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
        console.log(`TS${code}: ${targetTypeText} !== ${sourceTypeText}`)
        compareTypes(
          targetType,
          sourceType,
          [
            {
              targetType: targetTypeText,
              sourceType: sourceTypeText,
              sourceDeclarations: [[nodeInfo(node)]],
              targetDeclarations: [[{ text: targetTypeText, link: targetLink }]],
            },
          ],
          {
            code,
            node,
            targetTypeText,
            targetLink,
            sourceTypeText,
            links: [link(node), targetLink],
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
      console.log(`TS${code}: ${targetTypeText} !== ${sourceTypeText}`)
      compareTypes(
        targetType,
        sourceType,
        [
          {
            targetType: targetTypeText,
            sourceType: sourceTypeText,
            // targetDeclarations: [targetType.symbol.declarations?.map(nodeInfo)],
            // sourceDeclarations: [sourceType.symbol.declarations?.map(nodeInfo)],
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
      console.log("Oh man--this ain't good!!!")
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
            console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n')
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
if (!syntactic.length) {
  elaborate(program.getSemanticDiagnostics())
} else {
  console.log('Fix syntactic errors first', syntactic)
}
