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
    console.log('\nmake these properties optional here:')
    const links = []
    missings.forEach(({ target, theProp }) => {
      context.container
      // need to add these properties here:
      // or make these properties optinal here:
      const declaration = theProp.declarations[0]
      console.log('  ' + declaration.getText())
      links.push(link(declaration))
      const sf = declaration.getSourceFile()
      const parentType = checker.getTypeAtLocation(declaration.parent)
      const sdg = checker.typeToString(parentType)
      const { line } = sf.getLineAndCharacterOfPosition(declaration.getStart())
      const fi9 = sf.text.split('\n')[line]

      const f = 0
    })
    console.log(links)
  } else if (mismatches.length) {
    const sdfsdrfx = 0
  }
}

function compareProperties(first, second) {
  const missings = []
  const mismatches = []
  const recurses = []
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
  let mismatches = []
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
        console.log(`TS${code} Mismatch! (...): ${targetTypeText} !== ${sourceTypeText}\n${link(node)}`)
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
      console.log(`TS${code} Mismatch! ${targetTypeText} !== ${sourceTypeText}\n${link(node)}`)
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
        console.log('\n\n=======================')
        elaborateMismatch(code, node)
        break
    }
  })
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

// // if (!reverseMisses) {
// //   return nextTypes.some(({ firstType, secondType }) => {
// //     // still looking...
// //     return compareTypes(firstType, secondType, bothWays)
// //   })
// // }

// const possibility: any = {}
// const nextTypes = []
// possibility.misses = findMismatches(target, source, nextTypes)
// possibility.nextTypes = nextTypes
// possibility.reverseMisses = findMismatches(target, source)
// possibilities.push(possibility)
//})

// possibilities.forEach((f) => {
//   return f.nextTypes.some(({ firstType, secondType }) => {
//     // still looking...
//     return compareTypes(firstType, secondType, bothWays)
//   })
// })
// // if (!reverseMisses) {
// //   return nextTypes.some(({ firstType, secondType }) => {
// //     // still looking...
// //     return compareTypes(firstType, secondType, bothWays)
// //   })
// // }

//})

// return props.every((prop1) => {
//   const propName = prop1.escapedName as string
//   const prop2 = checker.getPropertyOfType(second, propName)
//   if (prop2) {
//     // properties = getPropertiesOfType(target);
//     // targetProp = properties_2[_i];
//     // if (!(requireOptionalProperties || !(targetProp.flags & 16777216 /* Optional */ || ts.getCheckFlags(targetProp) & 48 /* Partial */))) return [3 /*break*/, 5];
//     // sourceProp = getPropertyOfType(source, targetProp.escapedName);

//     // targetType = getTypeOfSymbol(targetProp);
//     // if (!(targetType.flags & 109440 /* Unit */)) return [3 /*break*/, 5];
//     // sourceType = getTypeOfSymbol(sourceProp);
//     // if (!!(sourceType.flags & 1 /* Any */ || getRegularTypeOfLiteralType(sourceType) === getRegularTypeOfLiteralType(targetType))) return [3 /*break*/, 5];

//     // function getRegularTypeOfLiteralType(type) {
//     //   return type.flags & 2944 /* Literal */
//     //     ? type.regularType
//     //     : type.flags & 1048576 /* Union */
//     //     ? type.regularType || (type.regularType = mapType(type, getRegularTypeOfLiteralType))
//     //     : type
//     // }

//     if (!propMap[propName]) {
//       propMap[propName] = { sourcePropType: checker.getTypeOfSymbol(prop2) }
//     } else {
//       propMap[propName].targetPropType = checker.getTypeOfSymbol(prop2)
//     }
//   }
//   return !!prop2
// })
//}
// if (propertyNamesMatch(source, target) && propertyNamesMatch(source, target)) {
//   return Object.values(propMap).every(({ targetPropType, sourcePropType }) => {
//     compareTypes(targetPropType, sourcePropType)
//     return true
//   })
// }

//   // if (
//   //  return symbol.flags & 33554432 /* Transient */ ? symbol.checkFlags : 0;
//   const fg = targetProp.flags & 16777216

//   const ff = !(targetProp.flags & 16777216 /* Optional */ || ts.getCheckFlags(targetProp) & 48)
//   propMap[propName] = { tprop: checker.getTypeOfSymbol(tprop) }
// })
// const tprops = checker.getPropertiesOfType(target.type)
// tprops.forEach((prop) => {
//   const propName = prop.escapedName as string
//   // if !map[prop.escapedName] -- log
//   const sprop = checker.getPropertyOfType(source.type, propName)
//   propMap[propName].sprop = checker.getTypeOfSymbol(sprop)
// })
// // for each prop in map
// // compare types (target, source)
//    }

// function compareProperties(targetProps: PropMap, sourceProps: PropMap) {}

// function getPropertyMap(type: ts.Type, properties = type.getProperties()) {
//   const map = {}
//   for (const property of properties) {
//     const propertyName = property.escapedName as string
//     map[propertyName] = {
//       parent: type,
//       type: checker.typeToString(checker.getTypeOfSymbol(property)),
//       property,
//     }
//   }
//   return map
// }

// const ignore = ['string', 'String', 'number', 'boolean', 'any', 'unknown', 'never', 'undefined', 'true', 'false']
// function compareTypes(
//   parentType: ts.Type,
//   compareMap: {} | undefined = undefined,
//   logOut: string[] | undefined = undefined,
//   parentProperties = parentType.getProperties(),
//   parentMap: PropMap = {}
// ) {
//   if (!compareMap) {
//     Object.assign(parentMap, getPropertyMap(parentType, parentProperties))
//   } else {
//     const log = []
//     if (parentType.types) {
//       parentType.types.forEach((type) => {
//         const sadf = getPropertyMap(type)
//         const sdf = 0
//       })
//     }
//     const sfs = checker.typeToString(parentType)
//     const dsf = Object.keys(parentMap).sort().join(', ')
//     compareProperties(parentMap, compareMap)
//   }

//   // for each property's type--collect those properties, iterating down
//   const sd = checker.typeToString(parentType)
//   if (!ignore.includes(checker.typeToString(parentType))) {
//     Object.entries(parentMap).forEach(([k, v]) => {
//       if (v.property.type) {
//         const types = v.property.type.types || [v.property.type]
//         types.forEach((type) => {
//           const properties = type.getProperties()
//           if (properties.length) {
//             let maps = parentMap[k].maps
//             if (!maps) {
//               maps = parentMap[k].maps = []
//             }
//             const map: PropMap = {}
//             maps.push(map)
//             compareTypes(type, compareMap, logOut, properties, map)
//           }
//         })
//       }
//     })
//   }
//   return parentMap
// }

// function getRegularTypeOfLiteralType(type) {
//   return type.flags & 2944 /* Literal */
//     ? type.regularType
//     : type.flags & 1048576 /* Union */
//     ? type.regularType || (type.regularType = mapType(type, getRegularTypeOfLiteralType))
//     : type
// }

// switch (expression.kind) {
//   case ts.SyntaxKind.CallExpression:
//     const sourceSignature = checker.getResolvedSignature(expression)
//     sourceType = checker.getReturnTypeOfSignature(sourceSignature)
//     const sdfls = checker.getTypeAtLocation(expression)
//     if (sourceType !== sdfls) {
//       const sdf = 0
//     }
//     break
//   default:
//   case ts.SyntaxKind.Identifier:
//     const symbol = checker.getSymbolAtLocation(node.expression)
//     sourceType = checker.getTypeOfSymbolAtLocation(symbol!, expression)
//     const sdufs = checker.getTypeAtLocation(expression)
//     if (sourceType !== sdufs) {
//       const sdf = 0
//     }
//     break
// }
// get the return type which is the SOURCE
// node.expression.kind === ts.SyntaxKind.CallExpression returning a call expression
// node.expression.kind === ts.SyntaxKind.Identifier returning variable

// export function logMismatches(sourceFile: ts.SourceFile) {
//   logMismatchedNodes(sourceFile)

//   function logMismatchedNodes(node: ts.Node) {
//     const logOut: string[] = []
//     switch (node.kind) {
//       // ex: const func():TARGET => {return SOURCE}
//       case ts.SyntaxKind.ReturnStatement:
//         // when the TARGET is a function declaration and the SOURCE is a return statement

//         // get the return type which is the SOURCE
//         const sourceFile = node.getSourceFile()
//         const sourceSignature = checker.getResolvedSignature(node.expression)
//         const sourceType = checker.getReturnTypeOfSignature(sourceSignature)
//         const sourceTypeText = node.getText()

//         // get the function/class/etc container, which is the TARGET
//         const returnContainer = ts.findAncestor(node.parent, (node) => {
//           return !!node && (isFunctionLikeKind(node.kind) || ts.isClassStaticBlockDeclaration(node))
//         })
//         if (returnContainer) {
//           // get what type this  container's
//           const targetSignature = checker.getSignatureFromDeclaration(returnContainer)
//           const targetType = checker.getReturnTypeOfSignature(targetSignature)
//           const targetTypeText = checker.typeToString(targetType)

//           // try to find a TARGET type that matches this source

//           logOut.push('TS2322 Target type !== Source type:')
//           logOut.push(
//             `Target = ${sourceFile.getLineAndCharacterOfPosition(returnContainer.getStart()).line}: ${targetTypeText}`
//           )
//           logOut.push(`Source = ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line}:   ${sourceTypeText}`)
//           //const sd99f = checker.getUnmatchedProperties(targetType.types[1], sourceType, true).next()

//           //function compareTypes(parentType, compareMap=undefined, logOut=[], parentProperties = parentType.getProperties(), parentMap = {}) {
//           const sourceMap = compareTypes(sourceType)
//           compareTypes(targetType, sourceMap, logOut)
//           const f = 0

//           // console.log('$$$$$$$$$$$$$$$ SOURCE $$$$$$$$$$$$$$$$$$$$')
//           // const sourceTypeProperties = getTypes(sourceType)
//           // console.log('\n\n\n\n\n$$$$$$$$$$$$$$$ TARGET $$$$$$$$$$$$$$$$$$$$')
//           // const targetTypeProperties = getTypes(targetType)
//           // const key = Object.keys(sourceTypeProperties)[0]
//           // const srcProps = sourceTypeProperties[key]
//           // const tgtProps = targetTypeProperties[key]
//           //   function getBestMatchingType(source, target, isRelatedTo) {
//           //     if (isRelatedTo === void 0) { isRelatedTo = compareTypesAssignable; }
//           //     return findMatchingDiscriminantType(source, target, isRelatedTo, /*skipPartial*/ true) ||
//           //         findMatchingTypeReferenceOrTypeAliasReference(source, target) ||
//           //         findBestTypeForObjectLiteral(source, target) ||
//           //         findBestTypeForInvokable(source, target) ||
//           //         findMostOverlappyType(source, target);
//           // }

//           // logOut.push('\n\n\n\n')
//           // console.log(logOut.join('\n'))
//         }

//         break

//       case ts.SyntaxKind.CallExpression:
//         break
//       case ts.SyntaxKind.NewExpression:
//         break
//       case ts.SyntaxKind.FunctionExpression:
//         break
//     }
//     ts.forEachChild(node, logMismatchedNodes)
//   }
// }

/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////

// program.getSemanticDiagnostics().forEach((diag) => {
//   switch (diag.code) {
//     case 2322:
//       const f = 0
//       break
//     default:
//       break
//   }
// })

// case SyntaxKind.ReturnStatement:
// const fd = node.getFullText()
// const fff = checker.getResolvedSignature(node)
// let symbol = checker.getSymbolAtLocation(node.parent.parent.expression)
// const f = checker.getResolvedSignature(node)
// const e = checker.getReturnTypeOfSignature(f)
//checker.ge

// checker.getReturnTypeOfSignature

// const gg = checker.getPropertiesOfType(f)
// const dd = checker.getPropertiesOfType(f.target)
// //const f = checker.getTypeAtLocation(node) //.getReturnTypeOfSignature()
// const txt = node.getFullText()
// //const txt2 = f.node.getFullText()
// const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())
//const { line2, character3 } = sourceFile.getLineAndCharacterOfPosition(f.node.getStart())

// const g = 0

// case ts.SyntaxKind.QuestionQuestionToken:
//   // determine where to put istanbul comment
//   // start by finding the first valid ancestor to put the comment
//   let parent = node.parent
//   let ancestor = node
//   if (parent.kind === ts.SyntaxKind.BinaryExpression) {
//     ancestor = parent.parent
//   }
//   ancestor = parent.getFirstToken(sourceFile) || parent

//   // then find a better common ancestor
//   let common: ts.Node | undefined = undefined
//   let possible: ts.Node | undefined = undefined
//   let walker = ancestor
//   let intermediary: boolean
//   do {
//     intermediary = false
//     // getLineAndCharacterOfPosition doesn't work is we remember blank lines below
//     // const txt = walker.getFullText()
//     // const { line, character } = sourceFile.getLineAndCharacterOfPosition(walker.getStart())
//     const kind = walker.kind
//     switch (kind) {
//       // return/const var=/=> are great common places
//       case ts.SyntaxKind.ReturnStatement:
//       case ts.SyntaxKind.VariableStatement:
//         common = walker
//         break

//       // these are possible if no better ancestor
//       //case ts.SyntaxKind.ArrowFunction:
//       case ts.SyntaxKind.ExpressionStatement:
//       case ts.SyntaxKind.ParenthesizedExpression:
//         possible = walker
//         intermediary = true
//         break

//       // these aren't good but we can keep going
//       case ts.SyntaxKind.AsExpression:
//       case ts.SyntaxKind.CallExpression:
//       case ts.SyntaxKind.ObjectLiteralExpression:
//       case ts.SyntaxKind.PropertyAssignment:
//       case ts.SyntaxKind.PropertyAccessExpression:
//       case ts.SyntaxKind.VariableDeclarationList:
//       case ts.SyntaxKind.VariableDeclaration:
//       case ts.SyntaxKind.Parameter:
//       case ts.SyntaxKind.BinaryExpression:
//       case ts.SyntaxKind.Identifier:
//       case ts.SyntaxKind.SpreadElement:
//       case ts.SyntaxKind.ArrayLiteralExpression:
//       case ts.SyntaxKind.ConditionalExpression:
//       case ts.SyntaxKind.ElementAccessExpression:
//         intermediary = true
//         break

//       // these aren't good and we should stop
//       default:
//         break
//     }
//     walker = walker.parent
//   } while (!common && intermediary && walker)
//   common = common ?? possible ?? ancestor

//   // don't add istanbul comment if there already is one
//   if (
//     !common.getFullText().includes(ignoreCmt) &&
//     !(ts.getSyntheticLeadingComments(common) || []).find(({ text }) => text === ignoreCmt)
//   ) {
//     ts.addSyntheticLeadingComment(common, ts.SyntaxKind.MultiLineCommentTrivia, ignoreCmt, false)
//   }

// function logUnassignableProperties(
//   logOut: string[],
//   node: ts.Node,
//   targetType: ts.Type,
//   sourceType: ts.Type,
//   level = 0
// ) {
//   // if (level === 0) {
//   //   console.group(`.\n└──Processing '${checker.typeToString(targetType)}'`)
//   // }

//   for (const property of sourceType.getProperties()) {
//     const propertyType = checker.getTypeOfSymbolAtLocation(property, node)
//     const ggg = checker.getPropertyOfType(sourceType, property.escapedName)
//     const propertyTypeName = checker.typeToString(sourceType)

//     console.log(`===========${property.escapedName}===============`)
//     console.log(`===========${property.escapedName}===============`)
//     console.log(`===========${property.escapedName}===============`)
//     console.log(`===========${property.escapedName}===============`)
//     console.log(`===========${property.escapedName}===============`)
//     console.log(`===========${property.escapedName}===============`)
//     getMappedTypes(property, property.escapedName)

//     //logUnassignableProperties(propertyType, node, level + 1)
//     //console.log(`  ├── ${property.name}: ${propertyTypeName}`)
//   }

//   //checker.getBestMatchingType()
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)
//   console.log(`===========TARGET===============`)

//   //  else if (source.flags & 1048576 /* Union */) {
//   //       // Source is a union or intersection type, infer from each constituent type
//   //       var sourceTypes = source.types;
//   //       for (var _e = 0, sourceTypes_2 = sourceTypes; _e < sourceTypes_2.length; _e++) {
//   //           var sourceType = sourceTypes_2[_e];
//   //           inferFromTypes(sourceType, target);
//   //       }
//   //   }
//   const sd = targetType.flags & ts.TypeFlags.Union

//   const targetTypes = targetType.types || [targetType]
//   for (const tt of targetTypes) {
//     for (const property of tt.getProperties()) {
//       const sd99f = checker.getUnmatchedProperties(tt, sourceType, true).next()
//       const propertyTypeName4 = checker.typeToString(tt)
//       const propertyType = checker.getTypeOfSymbolAtLocation(property, node)
//       const ggg = checker.getPropertyOfType(sourceType, property.escapedName)
//       const propertyTypeName = checker.typeToString(sourceType)
//       console.log(`===========${property.escapedName}===============`)
//       console.log(`===========${property.escapedName}===============`)
//       console.log(`===========${property.escapedName}===============`)
//       console.log(`===========${property.escapedName}===============`)

//       getMappedTypes(property, property.escapedName)

//       //logUnassignableProperties(propertyType, node, level + 1)
//       //console.log(`  ├── ${property.name}: ${propertyTypeName}`)
//     }
//   }
//   //console.groupEnd()
// }

// var token = ts.getTokenAtPosition(sourceFile, returnContainer.getStart())
// const dsf789 = targetSignature?.declaration.getText()

// const dx = returnContainer.getText()
// console.log(dx)
// const sff = returnContainer.getSourceFile()
// const { line, character } = sff.getLineAndCharacterOfPosition(returnContainer.getStart())
// const dsfsdf = returnContainer.getFirstToken()
// const arr = sff.getText().split('\n')
// const fdsdfsdf = arr[line + 1]

// const dsf = returnContainer.getFullText()
// const sdasz = targetType.types[1].node.getText()
// const sdgsaf = targetType.types[1].node.getFullText()
// const sdgfwae = targetSignature?.declaration?.getFullText()
// const jo = targetSignature?.declaration?.getText()
// const sf = getSourceFileOfNode(targetType.types[1].node)
// const gg = sf.getText()
// //sf.getL
// const zxff = targetType.types[1].node.getSourceFile()

//const { line, character } = sf.getLineAndCharacterOfPosition(targetType.types[1].node.getStart())

// const sourceSignature = checker.getResolvedSignature(node.expression)
// const sourceType = checker.getReturnTypeOfSignature(sourceSignature)
// const sdkfsd8g = checker.typeToString(sourceType)

// //          const sdfsdg = ts.typeToString(sourceType)
// const dfs = node.getText()
// const asdf = node.getFullText()
// const sdf = checker.getShorthandAssignmentValueSymbol(node)
// const sd99f = checker.getUnmatchedProperties(targetType.types[1], sourceType, true).next()
// const targetProperties1 = checker.getPropertiesOfType(targetType.types[0])
// const targetProperties2 = checker.getPropertiesOfType(targetType.types[1])
// const propertyType = checker.getTypeOfSymbolAtLocation(targetProperties2[0], node)

// const nnnn = targetProperties2[0].declarations[0]
// const sf = getSourceFileOfNode(nnnn)
// const txt = nnnn.getFullText()
// const txtd = nnnn.getText()
// const { line, character } = sf.getLineAndCharacterOfPosition(nnnn.getStart())

// const targetProperties3 = checker.getPropertiesOfType(targetType.types[2])
// const ffi = targetType.types[1].typeArguments
// const fff = targetType.types[2].typeArguments
// const t = checker.getAugmentedPropertiesOfType(targetType.types[1])

// const sourceSignature = checker.getResolvedSignature(node.expression)
// const sourceType = checker.getReturnTypeOfSignature(sourceSignature)
// const sourceProperties = checker.getPropertiesOfType(sourceType)
// const g = checker.getApparentType(sourceType)
// //          const p = checker.getPropertyOfType(sourceType)
// const k = checker.getTypeArguments(sourceType)
// const u = checker.getWidenedType(sourceType)
// const y = checker.getSignaturesOfType(sourceType)
// const m = checker.getAmbientModules()
// const d = checker.symbolToString(sourceType.symbol)

// for each sourceProperties, get that property from target
// for each of targetType's types
//   const targetProperties = checker.getPropertiesOfType(targetType.types[1])
//   build list of all target types of all mappers of both properties and compare

// const targetText = returnContainer.getText()
// const sourceExpression = node.expression.expression.expression
// const sourceText = sourceExpression.escapedText
//const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart())

// processProperty(targetType, node)

// const q = targetType.getProperties()
// const t = targetType.getApparentProperties()
// const wq = targetType.getBaseTypes()
// const as = targetType.getSymbol()
// const dfxcxkfe = checker.getPropertiesOfType(targetType.types[0])
// processProperty(targetType.types[2], returnContainer)
// const dfxcxkf = checker.getPropertiesOfType(targetType.types[1])
// const dfxcxf = checker.getPropertiesOfType(targetType.types[2])

// members are in property maps!!!
//function getMappedType(type, mapper) {

//checker.getTypeOfSymbol(targetSymbol)

// //targetType===>inferenceSourceType
// const sourceSig2 = checker.getResolvedSignature(node.expression)
// const inferenceSourceType = checker.getReturnTypeOfSignature(sourceSig2)
// const rrr = checker.getPropertiesOfType(inferenceSourceType)

// processProperty(inferenceSourceType, node)

// const safa = checker.getPropertyOfType(inferenceSourceType, 'propTypes')
//checker.getPropertyOfUnionOrIntersectionType()

// inferTypes(context.inferences, inferenceSourceType, inferenceTargetType, 128 /* ReturnType */);

//   if (inferenceSourceType.flags & 1048576 /* Union */) {
//     // Source is a union or intersection type, infer from each constituent type
//     var sourceTypes = source.types;
//     for (var _e = 0, sourceTypes_2 = sourceTypes; _e < sourceTypes_2.length; _e++) {
//         var sourceType = sourceTypes_2[_e];
//         inferFromTypes(sourceType, target); << for each type, do inferal
//     }
// }

// const sdaf = checker.getTypeArguments(targetType)

// // (2) get "sourceType" type--what type is this: withPanZoom()(GraphComponent) returning
// //const returnStatementText = node.getText()

// const sourceSig = checker.getResolvedSignature(node.expression)
// const rt = checker.getReturnTypeOfSignature(sourceSig)
// const sdaf4 = checker.getTypeArguments(rt)
// const props = checker.getPropertiesOfType(rt)

// const safa44 = checker.getPropertyOfType(rt, 'propTypes')

// for each prop, make sure source
//const  sourceProp = getPropertyOfType(source, targetProp.escapedName);

// var properties = getPropertiesOfObjectType(target);
// for (var _i = 0, properties_3 = properties; _i < properties_3.length; _i++) {
//     var targetProp = properties_3[_i];
//     var sourceProp = getPropertyOfType(source, targetProp.escapedName);
//     if (sourceProp) { //will have type.types[x].members
//         inferFromTypes(getTypeOfSymbol(sourceProp), getTypeOfSymbol(targetProp));
//     }
// }
// checker.getTypeArguments()
// checker.getTypeAtLocation()
// checker.getTypeFromTypeNode()
// checker.getTypeArguments)
// const sourceExpression = node.expression.expression.expression
// console.log('//////////////////////////////////////////////////////////////////////////')
// const sourceText = sourceExpression.escapedText
// const sourceSymbols = ts.findAncestor(node.parent, (node) => {
//   return !!node && node.locals && node.locals.get(sourceText)
// })
// const importSpecifier = sourceSymbols.locals.get(sourceText).declarations[0]
// const importDeclaration = importSpecifier.parent.parent.parent

// //checker.resolveCallExpression
// const moduleSpecifier = importDeclaration.moduleSpecifier
// const importFileName = sourceFile.resolvedModules.get(moduleSpecifier.text)
// const importFile = program.getSourceFile(importFileName.resolvedFileName)
// const exportsMap = checker.getExportsOfModule(importFile.symbol)
// const symbolFromModule = exportsMap.find(({ escapedName }) => escapedName === sourceText)
// const valueDeclaration = symbolFromModule?.valueDeclaration
// //const ss = checker.getPropertiesOfType(valueDeclaration.type.type)
// const fsd = 0
// node is callexpression
// node.expression is call expresssion
// node.expression.expression is Identifier
// use this to get Identifier symbol from locals
//    location = node
//    name = node.escapedText === 'withPanZoom'
//      gets node location, then loops to location.parent until parent has location.locals (symbols)
//      get symbol from symbols.get(name)
//            use this symbol if symbol.flags & 111551 /* Value */ | 1048576 /* ExportValue */
// found Identifier symbol will have declarations
// declarations[0] == declaration node
//  if that declaration node is a ImportSpecifier(here), it's node.parent.parent.parent will be a ImportDeclaration
//  var moduleSpecifier = ts.getExternalModuleRequireArgument(node) || node.moduleSpecifier; ('@patternfly/react-topology')
// var resolvedModule = sourceFile.resolvedModules.get('@patternfly/react-topology', mode)
// var sourceFile = program.getSourceFile(resolvedModule.resolvedFileName) ("/Users/johnswanke/Development/git2/console-experiments/frontend/node_modules/@patternfly/react-topology/dist/esm/index.d.ts")
// var moduleSymbol = sourceFile.symbol

// const exportsMap = checker.getExportsOfModule(moduleSymbol)
// const symbolFromModule = exportsMap.get('withPanZoom')

// var declaration = symbolFromModule.valueDeclaration;
// var declaration.type
// var type = createObjectType(16 /* Anonymous */, declaration.type.symbol);
//  type.members.get("__call")

//   var symbolFromModule = getExportOfModule(moduleSymbol, 'withPanZoom', ImportSpecifier(here), dontResolveAlias);
//      moduleSymbol has exports on it
// var exportStars = moduleSymbol.exports.get("__export" /* ExportStar */);

// type = symbolFromModule.decarations[0].type

//  var funcType ... = checkExpression(node.expression);

// funcType has a call Signature
//   call signature has a return type "resolvedReturnType" getReturnTypeOfSignature(signature)

// this resolvedReturnType has a properties attribute
// targetType has multiple types, each with a properties attribute

// checker.getPropertiesOfType()
// checker.getResolvedModule()

// var type = getNarrowedTypeOfSymbol(Identifier symbol, Identifier node);

// var exprType = node.expression ? checkExpressionCached(node.expression) : undefinedType;
//  = checkCallExpression(node, checkMode);
//       var signature = getResolvedSignature(node, /*candidatesOutArray*/ undefined, checkMode);
//          var result = resolveSignature(node, candidatesOutArray, checkMode || 0 /* Normal */);
//            case 207 /* CallExpression */:
//              return resolveCallExpression(node, candidatesOutArray, checkMode);
//                 var funcType = checkExpression(node.expression); <<<<<<<<<<<<< get function type of "sourceType"
//                     return checkIdentifier(node, checkMode);
//                       function resolveName(location, name, meaning, nameNotFoundMessage, nameArg, isUse, excludeGlobals, getSpellingSuggstions) {

// location = node
// name = node.escapedText === 'withPanZoom'
//  gets node location, then loops to location.parent until parent has location.locals (symbols)
//   get symbol from symbols.get(name)
//     use this symbol if symbol.flags & 111551 /* Value */ | 1048576 /* ExportValue */
//                  if (location.locals && !isGlobalSourceFile(location)) {
//                    location.locals == symbols
//                    symbol = symbols.get(name)

// ts.resolveModuleName()
// ts.resolveModuleNameFromCache()

// for node.expression === withPanZoom

// var type (funcType) = checkExpression(node.expression);

// funcType now has a symbol with members

// gets members
// var members = getMembersOfSymbol(symbol);

// var callSignatures = getSignaturesOfSymbol( symbol with declarations = members.get("__call" /* Call */))

// const declarations = members.get('__call' /* Call */)

// checker.getSignatureFromDeclaration

// member has a declaration

// var callSignatures = getSignaturesOfSymbol(members.get("__call" /* Call */));
// var constructSignatures = getSignaturesOfSymbol(members.get("__new" /* New */));
// var indexInfos = getIndexInfosOfSymbol(symbol);

//getSignaturesOfType(type)

//resolveStructuredTypeMembers(type)

//resolveAnonymousTypeMembers(type);

//          const sss = 0
//const functionFlags = checker.getFunctionFlags(container);
// console.log('get type that this block expects to be returned'+ returnType)
// if (strictNullChecks || node.expression || returnType.flags & 131072 /* Never */) {
//     var exprType = node.expression ? checkExpressionCached(node.expression) : undefinedType;
//     console.log('get type of what this expression returns'+ exprType)
//     if (container.kind === 172 /* SetAccessor */) {
//         if (node.expression) {
//             error(node, ts.Diagnostics.Setters_cannot_return_a_value);
//         }
//     }
//     else if (container.kind === 170 /* Constructor */) {
//         if (node.expression && !checkTypeAssignableToAndOptionallyElaborate(exprType, returnType, node, node.expression)) {
//             error(node, ts.Diagnostics.Return_type_of_constructor_signature_must_be_assignable_to_the_instance_type_of_the_class);
//         }
//     }
//     else if (getReturnTypeFromAnnotation(container)) {
//         var unwrappedReturnType = (_a = unwrapReturnType(returnType, functionFlags)) !== null && _a !== void 0 ? _a : returnType;
//         var unwrappedExprType = functionFlags & 2 /* Async */
//             ? checkAwaitedType(exprType, /*withAlias*/ false, node, ts.Diagnostics.The_return_type_of_an_async_function_must_either_be_a_valid_promise_or_must_not_contain_a_callable_then_member)
//             : exprType;
//         if (unwrappedReturnType) {
//             // If the function has a return type, but promisedType is
//             // undefined, an error will be reported in checkAsyncFunctionReturnType
//             // so we don't need to report one here.
//             console.log('can what is being returned (source) be assigned to what block expects to be returned (target)')
//             checkTypeAssignableToAndOptionallyElaborate(unwrappedExprType, unwrappedReturnType, node, node.expression);
//         }
//     }

//Type made up of properties that each have types that are made up of properties

// [{
//   Type: name
//   Required: prop joined
//   Props: {
//       Prop: {
//          Type: name
//           Map: {same}
//   }
//   }
// ]
// allTypeProperties: TypeMap
// requiredTypeProperties: string

// interface PropInfo {
//   types: any[]
//   //  allTypeProperties: TypeMap
//   requiredTypeProperties: string
//   isOptional: boolean
//   //  sourceLine?: string
//   //  url?: string
// }

// export function getMappedTypes(isymbol, dict, map = {}) {
//   const symbols = checker.getTypeOfSymbol(isymbol).getProperties()
//   if (symbols.length) {
//     const pt = checker.typeToString(checker.getTypeOfSymbol(isymbol))
//     if (dict[pt]) return
//     dict[pt] = {}
//     console.log(`-------getMappedTypes---------${isymbol.escapedName}: ${pt}`)
//     console.log(`-------  properties of: ${pt}`)
//     for (const symbol of symbols) {
//       const propertyName = symbol.escapedName
//       const declaration = symbol.declarations[0]
//       const type = checker.getTypeOfSymbol(symbol)
//       const propertyType = checker.typeToString(type)
//       const gg = checker.getSignaturesOfType(type)
//       if (type.callSignatures) {
//         //const sourceType = checker.getReturnTypeOfSignature(type.callSignatures[0])
//         // const propertyType2 = checker.typeToString(sourceType)

//         //const sourceSignature = checker.getSignaturesOfType.getResolvedSignature(type.callSignatures[0])
//         const fd = 0
//       } else if (!ignore.includes(propertyType)) {
//         const ssr = getMappedSymbols(symbol, dict)
//       }

//       const isOptional = !!(symbol.flags & ts.SymbolFlags.Optional)
//       console.log(`    ${propertyName}${isOptional ? '?' : ''}: ${propertyType}`)
//       const g = 0
//     }
//   } else {
//     const propertyType = checker.typeToString(checker.getTypeOfSymbol(isymbol))
//     const f = 0
//   }
//   //const sra = checker.typeToString(checker.getTypeOfSymbol(ff[3]))
// }
//   const propertyType3 =
//   if (type.intrinsicName) {
//     return {
//       type: type.intrinsicName,
//     }
//   } else if (type.symbol || type.aliasSymbol) {
//     const symbol = type.symbol || type.aliasSymbol
//     const typeName = symbol.escapedName
//     //const declaration = symbol.declarations[0]
//     // const sf = declaration.getSourceFile()
//     // const { line } = sf.getLineAndCharacterOfPosition(declaration.getStart())
//     //const properties = getPropertyMap(type, dict)
//     const propertyType2 = checker.typeToString(type)
//     const f = {
//       type: typeName, // ex: 'FunctionalComponent'
//       typeArgs: type?.typeArguments?.map((arg) => checker.typeToString(arg)).join(','), // ex: "{ element: GraphElement<ElementModel, any;'
//       //sourceLine: sf.text.split('\n')[line].trim(),
//       //url: `${sf.fileName}:${line + 1}`,
//       //properties: checker.getTypeOfSymbol(declaration.symbol).getProperties(),
//     }
//     return f

//     // const map: TypeMap = {}
//     // properties[type.intrinsicName || type.symbol.escapedName] = map
//     // for (const property of type.getProperties()) {
//     //   const declaration = property.declarations[0]
//     //   const allTypeProperties = getPropertyMap(property)
//     //   const requiredTypeProperties = Object.entries(allTypeProperties)
//     //     .filter(([_k, { isOptional }]) => !isOptional)
//     //     .map(([k, _v]) => k)
//     //     .join(',')
//     //   map[property.escapedName] = {
//     //     type: checker.typeToString(checker.getTypeOfSymbol(declaration.symbol)),
//     //     allTypeProperties,
//     //     requiredTypeProperties,
//     //     isOptional: !!(property.flags & ts.SymbolFlags.Optional),
//     //   }
//     // }

//     // return {
//     //   type: type.symbol.escapedName,
//     //   isOptional: !!(p.flags & ts.SymbolFlags.Optional),
//     //   sourceLine: sf.text.split('\n')[line].trim(),
//     //   url: `${sf.fileName}:${line + 1}`,
//     //   properties: checker.getTypeOfSymbol(declaration.symbol).getProperties(),
//     // }
//   } else {
//     debugger
//   }
// }

// function getTypes(type: any): TypeInfo[] {
//   const getType = (t: any) => {
//     const propMap = {}
//     getPropertyMap(t, {}, propMap)
//     return {
//       type: t,
//       name: checker.typeToString(t),
//       propMap,
//     }
//   }
//   if (type.types) {
//     // if union
//     return type.types.map((t: any) => getType(t))
//   } else {
//     return [getType(type)]
//   }
// }

// export function getMappedSymbols(parent, parentMap = {}) {
//   const mapper = parent.mapper2 || parent.mapper
//   if (parent.getProperties && mapper) {
//     const f = 0
//   }
//   if (!parent.getProperties && mapper) {
//     const f = 0
//   }

//   // only if parent is type
//   const symbols = parent.getProperties ? parent.getProperties() : parent.resolvedProperties || parent.properties
//   if (symbols) {
//     for (const symbol of symbols) {
//       const propertyName = symbol.escapedName
//       parentMap[propertyName] = {
//         type: checker.typeToString(checker.getTypeOfSymbol(symbol)),
//         isOptional: !!(symbol.flags & ts.SymbolFlags.Optional),
//         symbol,
//       }

//       if (!symbol.type) {
//         const asdfx = 3
//         const ds = checker.typeToString(checker.getTypeOfSymbol(symbol))
//         const sdrg = 9
//       }
//       if (symbol.type) {
//         const f = checker.getTypeOfSymbol(symbol)
//         const r = symbol.type
//         const u = checker.typeToString(checker.getTypeOfSymbol(symbol))
//         const k = checker.typeToString(symbol.type)
//         if (symbol.type.types) {
//           const sdf = symbol.type.types[0].getProperties()
//           const skdf = symbol.type.types[1].getProperties()
//           const fsd = 9
//         }
//         const map = {}
//         getMappedSymbols(symbol.type, map)
//         if (Object.keys(map).length) {
//           parentMap[propertyName].map = map
//         }
//       }
//     }
//   } else if (mapper) {
//     if (mapper.mapper2) {
//       getMappedSymbols(mapper, parentMap)
//     } else if (mapper.target) {
//       getMappedSymbols(mapper.target, parentMap)
//     } else if (mapper.targets) {
//       for (const target of mapper.targets) {
//         getMappedSymbols(target, parentMap)
//       }
//     }
//   }
// }

//const ignore = ['string', 'number', 'boolean', 'any', 'unknown', 'never', 'undefined']

// export function compareTypefs(targetType: ts.Type, sourceType: ts.Type) {
//   const sfs = checker.typeToString(sourceType)

//   const sourcePropMap = getPropertyMap(sourceType)
//   const targetPropMap1 = getPropertyMap(targetType.types[0])
//   const targetPropMap2 = getPropertyMap(targetType.types[1])
//   const targetPropMap3 = getPropertyMap(targetType.types[2])

//   const sadwsax = 0

//const targetTypes = getTypes(targetType)

// try to find by exact type name
// keep track of other possibilities
// if (
//   !sourceTypes.some((source) => {
//     return (
//       source.name !== 'undefined' &&
//       targetTypes.find((target) => {
//         if (source.name !== target.name) {
//           if (source.symbol === target.symbol) {
//             const propMap = {}
//             const propertyNamesMatch = (first, second) => {
//               const props = checker.getPropertiesOfType(first.type)
//               return props.every((prop1) => {
//                 const propName = prop1.escapedName as string
//                 const prop2 = checker.getPropertyOfType(second.type, propName)
//                 if (prop2) {
//                   if (!propMap[propName]) {
//                     propMap[propName] = { sourcePropType: checker.getTypeOfSymbol(prop2) }
//                   } else {
//                     propMap[propName].targetPropType = checker.getTypeOfSymbol(prop2)
//                   }
//                 }
//                 return !!prop2
//               })
//             }
//             if (propertyNamesMatch(source, target) && propertyNamesMatch(source, target)) {
//               return Object.values(propMap).every(({ targetPropType, sourcePropType }) => {
//                 compareTypes(targetPropType, sourcePropType)
//                 return true
//               })
//             }

//             //   // if (
//             //   //  return symbol.flags & 33554432 /* Transient */ ? symbol.checkFlags : 0;
//             //   const fg = targetProp.flags & 16777216

//             //   const ff = !(targetProp.flags & 16777216 /* Optional */ || ts.getCheckFlags(targetProp) & 48)
//             //   propMap[propName] = { tprop: checker.getTypeOfSymbol(tprop) }
//             // })
//             // const tprops = checker.getPropertiesOfType(target.type)
//             // tprops.forEach((prop) => {
//             //   const propName = prop.escapedName as string
//             //   // if !map[prop.escapedName] -- log
//             //   const sprop = checker.getPropertyOfType(source.type, propName)
//             //   propMap[propName].sprop = checker.getTypeOfSymbol(sprop)
//             // })
//             // // for each prop in map
//             // // compare types (target, source)
//           }
//           return false
//         }
//         return target.name !== 'undefined'
//       })
//     )
//   })
// ) {
//   // no dice
// }
//}
