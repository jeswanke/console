/* Copyright Contributors to the Open Cluster Management project */

import path from 'path'
import ts from 'typescript'

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
function thePayoff(missings, mismatches, context) {
  if (missings.length) {
    console.log('\nFOR these properties:\n')
    const links: any = []
    missings.forEach(({ target, theProp }) => {
      context.container
      // need to add these properties here:
      // or make these properties optinal here:
      const declaration = theProp.declarations[0]
      console.log('\u2022 ' + declaration.getText())
      links.push(link(declaration))
      const sf = declaration.getSourceFile()
      const parentType = checker.getTypeAtLocation(declaration.parent)
      const sdg = checker.typeToString(parentType)
      const { line } = sf.getLineAndCharacterOfPosition(declaration.getStart())
      const fi9 = sf.text.split('\n')[line]

      const f = 0
    })
    console.log('\nEITHER make them optional here:')
    console.log(links)
    console.log('\nSINCE ... ')
  } else if (mismatches.length) {
    const sdfsdrfx = 0
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
          recurses.push({ target: firstType, source: secondType })
        }
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      missings.push({ target: second, theProp: firstProp })
    }
  })
  return { missings, mismatches, recurses }
}

// we know TS found a mismatch here -- we just have to find it again
function compareTypes(itarget, isource, context, bothWays = false) {
  let reversed = false
  let missings = []
  let mismatches: any = []
  let recurses: any[] = []
  const propertyTypes: any = []
  const sources = isource.types || [isource]
  const targets = itarget.types || [itarget]
  // every source type must have a matching target type
  if (
    !sources.every((source) => {
      return targets.some((target) => {
        if (source !== target && source.intrinsicName !== 'undefined') {
          if (source.value) {
            mismatches.push({
              source: source,
              sourceType: typeof source.value,
              targetProp: target,
              targetType: checker.typeToString(target),
            })
          } else if (target.intrinsicName !== 'undefined') {
            ;({ missings, mismatches, recurses } = compareProperties(source, target))
            if (!missings.length && !mismatches.length && bothWays) {
              reversed = true
              ;({ missings, mismatches } = compareProperties(target, source))
            }
            if (!missings.length && !mismatches.length && recurses.length) {
              propertyTypes.push(recurses)
              return true
            }
          }
          return false
        }
        return true
      })
    })
  ) {
    context.reversed = reversed
    thePayoff(missings, mismatches, context)
    return false
  }
  if (propertyTypes.length) {
    // when properties types are made up of other properties
    // (ex: a structure and not an intrinsicName like 'string')
    return propertyTypes.every((recurses) => {
      return recurses.every(({ target, source }) => {
        return compareTypes(target, source, context, bothWays)
      })
    })
  }
  return true
}

function elaborateMismatch(code, node: ts.Node) {
  const children = node.getChildren()
  switch (node.kind) {
    // can't return this type
    case ts.SyntaxKind.ReturnStatement: {
      const sourceType: ts.Type = checker.getTypeAtLocation(children[1])
      const container = ts.findAncestor(node.parent, (node) => {
        return !!node && (isFunctionLikeKind(node.kind) || ts.isClassStaticBlockDeclaration(node))
      })
      if (container) {
        const targetType: ts.Type = checker
          .getSignaturesOfType(checker.getTypeAtLocation(container), 0)[0]
          .getReturnType()
        const sourceTypeText = node.getText()
        const targetTypeText = checker.typeToString(targetType)
        console.log(`TS${code}: ${targetTypeText} !== ${sourceTypeText}`)
        compareTypes(
          targetType,
          sourceType,
          { code, container, sourceTypeText, targetTypeText },
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
      compareTypes(targetType, sourceType, { code, sourceTypeText, targetTypeText })
      break
    }

    // can't pass these values to this call
    case ts.SyntaxKind.CallExpression: {
      const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0]
      const args = children[2].getChildren()
      signature.getParameters().forEach((param) => {
        const targetType = checker.getTypeOfSymbolAtLocation(param, node)
        const sourceType = checker.getTypeAtLocation(args[0])
      })
      break
    }
  }
}

function elaborate(semanticDiagnostics: readonly ts.Diagnostic[]) {
  semanticDiagnostics.forEach(({ code, file, start, messageText }) => {
    const token = ts.getTokenAtPosition(file, start)
    const node = token.parent
    switch (code) {
      case 2322:
      case 2559:
      case 2345:
        console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n')
        elaborateMismatch(code, node)
        break
    }
  })
  console.log('\n-33-\n---------------------')
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
