/* Copyright Contributors to the Open Cluster Management project */

import path from 'path'
import ts from 'typescript'

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

interface PropInfo {
  types: any[]
  //  allTypeProperties: TypeMap
  requiredTypeProperties: string
  isOptional: boolean
  //  sourceLine?: string
  //  url?: string
}
interface TypeMap {
  [key: string]: TypeInfo
}
interface TypeInfo {
  type: string
  typeArgs?: string
  sourceLine?: string
  url?: string
}

function getTypes(type: any): TypeInfo | TypeInfo[] | undefined {
  // if union of types, return an array of TypeInfo
  const dict = {}
  if (type.types) {
    return type.types.map((t: any) => getTypes(t))
  } else {
    if (type.intrinsicName) {
      return {
        type: type.intrinsicName,
      }
    } else if (type.symbol || type.aliasSymbol) {
      const symbol = type.symbol || type.aliasSymbol
      const typeName = symbol.escapedName
      //const declaration = symbol.declarations[0]
      // const sf = declaration.getSourceFile()
      // const { line } = sf.getLineAndCharacterOfPosition(declaration.getStart())
      const properties = getPropertyMap(type, dict)
      return {
        type: typeName, // ex: 'FunctionalComponent'
        typeArgs: type?.typeArguments?.map((arg) => checker.typeToString(arg)).join(','), // ex: "{ element: GraphElement<ElementModel, any;'
        //sourceLine: sf.text.split('\n')[line].trim(),
        //url: `${sf.fileName}:${line + 1}`,
        //properties: checker.getTypeOfSymbol(declaration.symbol).getProperties(),
      }

      // const map: TypeMap = {}
      // properties[type.intrinsicName || type.symbol.escapedName] = map
      // for (const property of type.getProperties()) {
      //   const declaration = property.declarations[0]
      //   const allTypeProperties = getPropertyMap(property)
      //   const requiredTypeProperties = Object.entries(allTypeProperties)
      //     .filter(([_k, { isOptional }]) => !isOptional)
      //     .map(([k, _v]) => k)
      //     .join(',')
      //   map[property.escapedName] = {
      //     type: checker.typeToString(checker.getTypeOfSymbol(declaration.symbol)),
      //     allTypeProperties,
      //     requiredTypeProperties,
      //     isOptional: !!(property.flags & ts.SymbolFlags.Optional),
      //   }
      // }

      // return {
      //   type: type.symbol.escapedName,
      //   isOptional: !!(p.flags & ts.SymbolFlags.Optional),
      //   sourceLine: sf.text.split('\n')[line].trim(),
      //   url: `${sf.fileName}:${line + 1}`,
      //   properties: checker.getTypeOfSymbol(declaration.symbol).getProperties(),
      // }
    } else {
      debugger
    }
  }
}

const ignore = ['string', 'number', 'boolean', 'any', 'unknown', 'never', 'undefined']

function getPropertyMap(type, dict, map = {}) {
  //const fd = type.getProperties()

  const symbols = type.getProperties ? type.getProperties() : type.resolvedProperties || type.properties
  if (symbols) {
    console.log('=========getPropertyMap=============')
    for (const symbol of symbols) {
      const propertyName = symbol.escapedName
      //const declaration = symbol.declarations[0]
      const dwds = checker.getTypeOfSymbol(symbol).getProperties()
      const propertyType = checker.typeToString(checker.getTypeOfSymbol(symbol))
      const isOptional = !!(symbol.flags & ts.SymbolFlags.Optional)
      console.log(`${propertyName}${isOptional ? '?' : ''}: ${propertyType}`)
      const ssr = getMappedSymbols(symbol, dict)
      //      const sf = declaration.getSourceFile()
      //      const { line } = sf.getLineAndCharacterOfPosition(declaration.getStart())
      map[propertyName] = {
        // types: getTypes(checker.getTypeOfSymbol(declaration.symbol)),
        // isOptional: !!(symbol.flags & ts.SymbolFlags.Optional),
        // //        sourceLine: sf.text.split('\n')[line].trim(),
        // //        url: `${sf.fileName}:${line + 1}`,
        // //        properties: checker.getTypeOfSymbol(declaration.symbol).getProperties(),
      }
    }
  }
}

export function getMappedSymbols(target, dict, map = {}) {
  if (target.intrinsicName) return
  const ff = target.symbol ? target.symbol.escapedName : checker.typeToString(checker.getTypeOfSymbol(target))
  const sdfgs = checker.getTypeOfSymbol(target)
  const fff = sdfgs.types[0].typeArguments() //?.map((arg) => checker.typeToString(arg)).join(',')
  const ffh = sdfgs.types[1].typeArguments() //?.map((arg) => checker.typeToString(arg)).join(',')
  const mapper = target.mapper2 || target.mapper
  const psym = target.symbol || target.aliasSymbol
  const symbols = target.getProperties ? target.getProperties() : target.resolvedProperties || target.properties
  if (symbols) {
    const symbols = target.resolvedProperties || target.properties
    if (symbols) {
      if (!dict[psym.escapedName] || psym.escapedName === '__type') {
        dict[psym.escapedName] = {}
        console.log(`-------getMappedSymbols---------${ff}`)
        for (const symbol of symbols) {
          const propertyName = symbol.escapedName
          //const declaration = symbol.declarations[0]
          const propertyType = checker.typeToString(checker.getTypeOfSymbol(symbol))
          const isOptional = !!(symbol.flags & ts.SymbolFlags.Optional)
          console.log(`  ${propertyName}${isOptional ? '?' : ''}: ${propertyType}`)
          if (!ignore.includes(propertyType)) {
            const sdfsd = getMappedTypes(symbol, dict)
          }
          //const ssr = getMappedSymbols(symbol)
          //      const sf = declaration.getSourceFile()
          //      const { line } = sf.getLineAndCharacterOfPosition(declaration.getStart())
          map[propertyName] = {
            // types: getTypes(checker.getTypeOfSymbol(declaration.symbol)),
            // isOptional: !!(symbol.flags & ts.SymbolFlags.Optional),
            // //        sourceLine: sf.text.split('\n')[line].trim(),
            // //        url: `${sf.fileName}:${line + 1}`,
            // //        properties: checker.getTypeOfSymbol(declaration.symbol).getProperties(),
          }
        }
      } else {
        console.log(`-------no  need for getMappedSymbols---------${psym ? psym.escapedName : ff}`)
      }
    }
  } else if (mapper) {
    if (mapper.mapper2) {
      getMappedSymbols(mapper, dict, map)
    } else if (mapper.target) {
      getMappedSymbols(mapper.target, dict, map)
    } else if (mapper.targets) {
      for (const target of mapper.targets) {
        getMappedSymbols(target, dict, map)
      }
    }
  }
}

export function getMappedTypes(isymbol, dict, map = {}) {
  const symbols = checker.getTypeOfSymbol(isymbol).getProperties()
  if (symbols.length) {
    const pt = checker.typeToString(checker.getTypeOfSymbol(isymbol))
    if (dict[pt]) return
    dict[pt] = {}
    console.log(`-------getMappedTypes---------${isymbol.escapedName}: ${pt}`)
    console.log(`-------  properties of: ${pt}`)
    for (const symbol of symbols) {
      const propertyName = symbol.escapedName
      const declaration = symbol.declarations[0]
      const type = checker.getTypeOfSymbol(symbol)
      const propertyType = checker.typeToString(type)
      const gg = checker.getSignaturesOfType(type)
      if (type.callSignatures) {
        //const sourceType = checker.getReturnTypeOfSignature(type.callSignatures[0])
        // const propertyType2 = checker.typeToString(sourceType)

        //const sourceSignature = checker.getSignaturesOfType.getResolvedSignature(type.callSignatures[0])
        const fd = 0
      } else if (!ignore.includes(propertyType)) {
        const ssr = getMappedSymbols(symbol, dict)
      }

      const isOptional = !!(symbol.flags & ts.SymbolFlags.Optional)
      console.log(`    ${propertyName}${isOptional ? '?' : ''}: ${propertyType}`)
      const g = 0
    }
  } else {
    const propertyType = checker.typeToString(checker.getTypeOfSymbol(isymbol))
    const f = 0
  }
  //const sra = checker.typeToString(checker.getTypeOfSymbol(ff[3]))
}

export function logMismatchedTypes(sourceFile: ts.SourceFile) {
  logMismatchedNodeType(sourceFile)

  function logMismatchedNodeType(node: ts.Node) {
    const logOut: string[] = []
    switch (node.kind) {
      // where ():TARGET => {return SOURCE}
      case ts.SyntaxKind.ReturnStatement:
        // the source is a return statement
        const sourceFile = node.getSourceFile()
        const sourceSignature = checker.getResolvedSignature(node.expression)
        const sourceType = checker.getReturnTypeOfSignature(sourceSignature)
        const sourceTypeText = node.getText()

        // the target is the container the return is in
        const returnContainer = ts.findAncestor(node.parent, (node) => {
          return !!node && (isFunctionLikeKind(node.kind) || ts.isClassStaticBlockDeclaration(node))
        })
        if (returnContainer) {
          // get what type this  container's
          const targetSignature = checker.getSignatureFromDeclaration(returnContainer)
          const targetType = checker.getReturnTypeOfSignature(targetSignature)
          const targetTypeText = checker.typeToString(targetType)
          //logUnassignableProperties(logOut, node, targetType, sourceType)

          logOut.push('TS2322 Target type !== Source type:')
          logOut.push(
            `Target = ${sourceFile.getLineAndCharacterOfPosition(returnContainer.getStart()).line}: ${targetTypeText}`
          )
          logOut.push(`Source = ${sourceFile.getLineAndCharacterOfPosition(node.getStart()).line}:   ${sourceTypeText}`)

          console.log('$$$$$$$$$$$$$$$ SOURCE $$$$$$$$$$$$$$$$$$$$')
          const sourceTypeProperties = getTypes(sourceType)
          console.log('\n\n\n\n\n$$$$$$$$$$$$$$$ TARGET $$$$$$$$$$$$$$$$$$$$')
          const targetTypeProperties = getTypes(targetType)
          const key = Object.keys(sourceTypeProperties)[0]
          const srcProps = sourceTypeProperties[key]
          const tgtProps = targetTypeProperties[key]
          //   function getBestMatchingType(source, target, isRelatedTo) {
          //     if (isRelatedTo === void 0) { isRelatedTo = compareTypesAssignable; }
          //     return findMatchingDiscriminantType(source, target, isRelatedTo, /*skipPartial*/ true) ||
          //         findMatchingTypeReferenceOrTypeAliasReference(source, target) ||
          //         findBestTypeForObjectLiteral(source, target) ||
          //         findBestTypeForInvokable(source, target) ||
          //         findMostOverlappyType(source, target);
          // }

          logOut.push('\n\n\n\n')
          console.log(logOut.join('\n'))

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

          const dfg = 0

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

          const f = 0
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
        }

        break

      case ts.SyntaxKind.CallExpression:
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
        break
    }
    ts.forEachChild(node, logMismatchedNodeType)
  }
}

const fileNames = process.argv.slice(2)
// Read tsconfig.json file
let options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
}
const tsconfigPath = ts.findConfigFile(fileNames[0], ts.sys.fileExists, 'tsconfig.json')
if (tsconfigPath) {
  const tsconfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  options = ts.parseJsonConfigFileContent(tsconfigFile.config, ts.sys, path.dirname(tsconfigPath)).options
}
options.isolatedModules = false
const program = ts.createProgram(fileNames, options)
const checker = program.getTypeChecker()

const semantics = program.getSemanticDiagnostics()

fileNames.forEach((fileName) => {
  const sourceFile = program.getSourceFile(fileName)
  if (sourceFile) {
    logMismatchedTypes(sourceFile)
  }
})

// program.getSemanticDiagnostics().forEach((diag) => {
//   switch (diag.code) {
//     case 2322:
//       const f = 0
//       break
//     default:
//       break
//   }
// })

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
