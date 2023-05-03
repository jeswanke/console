/* Copyright Contributors to the Open Cluster Management project */

import chalk from 'chalk'
import { Table } from 'console-table-printer'
import cloneDeep from 'lodash/cloneDeep'
import path from 'path'
import ts from 'typescript'

let options: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES5,
  module: ts.ModuleKind.CommonJS,
}

let isVerbose = false
const MAX_SHOWN_PROP_MISMATCH = 6
const MAX_COLUMN_WIDTH = 80
const simpleTypes = ['string', 'number', 'boolean', 'bigint', 'Date', 'any', 'unknown', 'never']
const handlesTheseTsErrors = [2322, 2559, 2345]

enum ErrorType {
  none = 0,
  mismatch = 1,
  objectToSimple = 3,
  simpleToObject = 4,
  arrayToNonArray = 5,
  nonArrayToArray = 6,
  propMissing = 7,
  propMismatch = 8,
  both = 9,
}

//======================================================================
//======================================================================
//======================================================================
//  ____            _      ___
// |  _ \ __ _ _ __| |_   / _ \ _ __   ___
// | |_) / _` | '__| __| | | | | '_ \ / _ \
// |  __/ (_| | |  | |_  | |_| | | | |  __/
// |_|   \__,_|_|   \__|  \___/|_| |_|\___|
//======================================================================
//======================================================================
//======================================================================
// In case the compiler combines multiple types into one type for comparison
// We need to keep track of each individual type in order to pinpoint the error
function cacheNodes(sourceFile: ts.SourceFile) {
  const cache = {
    startToNode: {},
    kindToNodes: new Map<ts.SyntaxKind, any[]>(),
    returnToContainer: {},
    arrayItemsToTarget: {},
    containerToReturns: {},
    blocksToDeclarations: {},
    processedNodes: new Set(),
  }
  function mapNodes(node: ts.Node) {
    // STORE BY START OF NODE WHICH IS UNIQUE
    cache.startToNode[node.getStart()] = node

    // GROUP BY WHAT KIND THE NODE IS FOR BELOW
    let nodes = cache.kindToNodes[node.kind]
    if (!nodes) {
      nodes = cache.kindToNodes[node.kind] = []
    }
    nodes.push(node)

    // FOR EACH NODE IN SOURCE FILE
    ts.forEachChild(node, mapNodes)
  }
  mapNodes(sourceFile)

  Object.entries(cache.kindToNodes).forEach(([kind, nodes]) => {
    switch (Number(kind)) {
      // FOR A SIMPLE TARGET = SOURCE,
      // THE ERROR WILL BE ON THIS LINE BUT THE TARGET/SOURCE CAN BE DEFINED ON ANOTHER LINE
      // REMEMBER WHERE THEY"RE LOCATED FOR THE HERELINK IN THE SUGGESTIONS
      case ts.SyntaxKind.VariableDeclaration:
        nodes.forEach((node) => {
          const blockId = getNodeBlockId(node)
          let declareMap = cache.blocksToDeclarations[blockId]
          if (!declareMap) {
            declareMap = cache.blocksToDeclarations[blockId] = {}
          }
          declareMap[node.getChildren()[0].getText()] = node
        })
        break

      // FOR EACH 'RETURN' REMEBER WHAT ITS CONTAINER IS TO DO THAT CHECK
      case ts.SyntaxKind.ReturnStatement:
        nodes.forEach((returnNode) => {
          const container = ts.findAncestor(returnNode.parent, (node) => {
            return !!node && (isFunctionLikeKind(node.kind) || ts.isClassStaticBlockDeclaration(node))
          })
          if (container) {
            cache.returnToContainer[returnNode.getStart()] = container
            let returnNodes = cache.containerToReturns[container.getStart()]
            if (!returnNodes) {
              returnNodes = cache.containerToReturns[container.getStart()] = []
            }
            returnNodes.push(returnNode)
          }
        })
        break
      // FOR EACH LITERAL ARRAY, REMEMBER A PARENT LOCATION WE CAN REFERENCE BELOW
      case ts.SyntaxKind.ArrayLiteralExpression:
        nodes.forEach((node) => {
          const arrayNode =
            ts.findAncestor(node, (node) => {
              return (
                !!node &&
                (node.kind === ts.SyntaxKind.VariableDeclaration ||
                  node.kind === ts.SyntaxKind.BinaryExpression ||
                  node.kind === ts.SyntaxKind.ReturnStatement)
              )
            }) || node

          const syntaxList = node.getChildren().find(({ kind }) => kind === ts.SyntaxKind.SyntaxList)
          let objectLiterals = syntaxList
            .getChildren()
            .filter(({ kind }) => kind === ts.SyntaxKind.ObjectLiteralExpression)
          let arrayItems = cache.arrayItemsToTarget[arrayNode.getStart()]
          if (!arrayItems) {
            arrayItems = cache.arrayItemsToTarget[arrayNode.getStart()] = []
          }
          if (objectLiterals.length === 0) {
            //const dfx = syntaxList.getProperties()
            // syntaxList
            //   .getChildren()
            //   .push(
            //     ts.factory.createObjectLiteralExpression([
            //       ts.factory.createPropertyAssignment('fileName', 'sdfgg'),
            //       ts.factory.createPropertyAssignment('lineNumber', '44'),
            //       ts.factory.createPropertyAssignment('columnNumber', 'awsf'),
            //     ])
            //   )
            //mockNode.kind = ts.SyntaxKind.        ObjectLiteralExpression = 205,

            //checker.
            const dx = 0
          }
          // ts.factory.cre.createObjectLiteralExpression()
          //  createObjectType
          arrayItems.push(objectLiterals.length > 0 ? objectLiterals : node)
          cache.arrayItemsToTarget[arrayNode.getStart()] = arrayItems.flat()
        })

        break
    }
  })
  return cache
}

//======================================================================
//======================================================================
//======================================================================
//  ____            _     _____
// |  _ \ __ _ _ __| |_  |_   _|_      _____
// | |_) / _` | '__| __|   | | \ \ /\ / / _ \
// |  __/ (_| | |  | |_    | |  \ V  V / (_) |
// |_|   \__,_|_|   \__|   |_|   \_/\_/ \___/
//======================================================================
//======================================================================
//======================================================================
// FIND THE TARGET AND SOURCE OF AN ASSIGNMENT CONFLICT
//   a) DETERMINE WHAT THE TARGET AND SOURCE ACTUALLY ARE
//      (the error node is just in the neighborhood)
//   b) THEN COMPARE THEM TO FIND THE CONFLICT
function findTargetAndSourceToCompare(code, errorNode: ts.Node, cache) {
  const node =
    ts.findAncestor(errorNode, (node) => {
      return (
        !!node &&
        (node.kind === ts.SyntaxKind.ReturnStatement ||
          node.kind === ts.SyntaxKind.VariableDeclaration ||
          node.kind === ts.SyntaxKind.ExpressionStatement ||
          node.kind === ts.SyntaxKind.CallExpression)
      )
    }) || errorNode

  // compiler might throw multiple errors for the same problem
  // only process one of them
  if (!cache.processedNodes.has(node.getStart())) {
    cache.processedNodes.add(node.getStart())
    const context: {
      code: any
      node: ts.Node
      errorNode?: ts.Node
      arrayItems?: ts.Node[]
      cache: any
      sourceDeclared?: ts.Node
      targetDeclared?: ts.Node
    } = {
      code,
      node,
      errorNode,
      cache,
    }

    let children = node.getChildren()
    switch (node.kind) {
      //======================================================================
      //================= ( ):TARGET => { return SOURCE } ==========================
      //======================================================================
      case ts.SyntaxKind.ReturnStatement:
        return findReturnStatementTargetAndSourceToCompare(node, undefined, context)

      //======================================================================
      //===========  func(...SOURCE...) --> const func(...TARGET...) =======
      //======================================================================
      case ts.SyntaxKind.CallExpression:
        // if the function is a property of an object, where is that object defined
        if (children[0].kind === ts.SyntaxKind.PropertyAccessExpression) {
          const objectName = children[0].getFirstToken()
          if (objectName) {
            context.targetDeclared = getNodeDeclartion(objectName, cache)
          }
        }
        return findFunctionCallTargetAndSourceToCompare(node, errorNode, context)

      //======================================================================
      //=========== const TARGET = SOURCE  =================================
      //======================================================================
      case ts.SyntaxKind.VariableDeclaration:
        const sourceNode = children[children.length - 1]
        const targetNode = children[0]
        return findAssignmentTargetAndSourceToCompare(node, targetNode, sourceNode, context)

      //======================================================================
      //================ TARGET = SOURCE  =================================
      //======================================================================
      case ts.SyntaxKind.ExpressionStatement:
        // get the whole expression (left = right)
        const statement = node as ts.ExpressionStatement
        children = statement.expression.getChildren()
        const target = children[0]
        const source = children[2]
        if (source && target) {
          context.sourceDeclared = getNodeDeclartion(source, cache)
          context.targetDeclared = getNodeDeclartion(target, cache)

          const path = target.getText().split(/\W+/)
          if (path.length > 1) {
            //======================================================================
            //================ a.b.c.TARGET = SOURCE  =================================
            //======================================================================
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
          return findAssignmentTargetAndSourceToCompare(statement, target, source, context)
        }

      default:
        console.log(`Missing support for kind === ${node.kind}`)
        console.log(getNodeLink(node))
        return false
    }
  }
}

//======================================================================
//======================================================================
//======================================================================
//===============  TARGET = SOURCE ====================================
//======================================================================
//======================================================================
//======================================================================
function findAssignmentTargetAndSourceToCompare(errorNode, targetNode: ts.Node, sourceNode: ts.Node, context) {
  const targetType: ts.Type = checker.getTypeAtLocation(targetNode)
  const targetTypeText = typeToString(targetType)
  let sourceType: ts.Type = checker.getTypeAtLocation(sourceNode)
  const targetInfo = {
    nodeText: getText(targetNode),
    typeText: targetTypeText,
    typeValue: targetType?.value,
    fullText: `${getText(targetNode)}: ${targetTypeText}`,
    nodeLink: getNodeLink(targetNode),
  }

  //======================================================================
  //===============  TARGET = [ { } ] ==========================
  //======================================================================
  const arrayItems = context.cache.arrayItemsToTarget[targetNode.getStart()]
  if (arrayItems && isArrayType(targetType)) {
    return findArrayItemTargetAndSourceToCompare(arrayItems, targetType, targetInfo, context)

    //======================================================================
    //===============  TARGET = ()=>return SOURCE ==========================
    //======================================================================
  } else if (isFunctionLikeKind(sourceNode.kind)) {
    // if function, need to make sure each type returned can be assigned to target
    const returns = context.cache.containerToReturns[sourceNode.getStart()]
    if (returns) {
      let hadPayoff = false
      returns.forEach((rn) => {
        if (hadPayoff) {
          console.log('\n\n')
        }
        hadPayoff = findReturnStatementTargetAndSourceToCompare(rn, targetType, context)
      })
      return hadPayoff
    } else {
      //======================================================================
      //===============   TARGET = ()=> literal SOURCE ==========================
      //======================================================================
      let children = sourceNode.getChildren()
      sourceNode = children[children.length - 1]
      if (sourceNode.kind === ts.SyntaxKind.CallExpression) {
        children = sourceNode.getChildren()
        sourceType = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0].getReturnType()
      } else {
        sourceType = checker.getTypeAtLocation(sourceNode)
      }
    }
  }

  // const sourceType: ts.Type = checker.getTypeAtLocation(sourceNode)
  const sourceTypeText = typeToString(sourceType)
  const sourceInfo = {
    nodeText: getText(sourceNode),
    typeText: sourceTypeText,
    typeValue: sourceType?.value,
    fullText: `${getText(sourceNode)}: ${sourceTypeText}`,
    nodeLink: getNodeLink(sourceNode),
  }

  // individual array items mismatch the target
  const pathContext = {
    ...context,
    prefix: 'Right hand type',
    sourceLink: getNodeLink(sourceNode),
    targetLink: getNodeLink(targetNode),
    hadPayoff: false,
  }
  compareTypes(
    targetType,
    sourceType,
    [
      {
        sourceInfo,
        targetInfo,
      },
    ],
    pathContext
  )
  return pathContext.hadPayoff
}
//======================================================================
//======================================================================
//======================================================================
//======================================================================
//================= func( ):TARGET => {return SOURCE}   ================
//======================================================================
//======================================================================
//======================================================================

function findReturnStatementTargetAndSourceToCompare(node: ts.Node, containerType: ts.Type | undefined, context) {
  const children = node.getChildren()
  // source is return type
  const sourceType: ts.Type = checker.getTypeAtLocation(children[1])
  // target is container type
  const container = context.cache.returnToContainer[node.getStart()]
  if (container) {
    containerType = containerType || checker.getTypeAtLocation(container)
    const targetType: ts.Type = checker.getSignaturesOfType(containerType, 0)[0].getReturnType()
    const targetTypeText = typeToString(targetType)
    const sourceLink = getNodeLink(node)
    const targetLink = getNodeLink(container)
    const sourceTypeText = sourceType.value ? typeof sourceType.value : getText(node)
    const targetInfo = {
      nodeText: container.parent.symbol.getName(),
      typeText: targetTypeText,
      typeValue: targetType?.value,
      fullText: `${
        container.parent.kind !== ts.SyntaxKind.SourceFile ? `${container.parent.symbol.getName()}: ` : ''
      }${targetTypeText}`,
      nodeLink: getNodeLink(container),
    }

    const arrayItems = context.cache.arrayItemsToTarget[node.getStart()]
    if (arrayItems) {
      return findArrayItemTargetAndSourceToCompare(arrayItems, targetType, targetInfo, context)
    } else {
      const sourceInfo = {
        nodeText: getText(node),
        typeText: sourceTypeText.replace('return ', ''),
        typeValue: sourceType?.value,
        fullText: `${getText(node)}${sourceType.value ? ': ' + typeof sourceType.value : ''}`,
        nodeLink: getNodeLink(node),
      }
      const pathContext = {
        ...context,
        prefix: 'The return type',
        sourceLink,
        targetLink,
        sourceTitle: 'Return',
        hadPayoff: false,
      }
      compareTypes(
        targetType,
        sourceType,
        [
          {
            targetInfo,
            sourceInfo,
          },
        ],
        pathContext,
        options.strictFunctionTypes
      )
      return pathContext.hadPayoff
    }
  }
  return false
}

//======================================================================
//======================================================================
//======================================================================
//================= call func(..SOURCE...) => (...TARGET...)  =================
//======================================================================
//======================================================================
//======================================================================
function findFunctionCallTargetAndSourceToCompare(node: ts.Node, errorNode, context) {
  const children = node.getChildren()
  // signature of function being called
  const signature = checker.getSignaturesOfType(checker.getTypeAtLocation(children[0]), 0)[0]
  const parameters = signature.getParameters()
  // args that are being passed
  const args = children[2].getChildren().filter((node) => node.kind !== ts.SyntaxKind.CommaToken)
  // calling arguments are the sources
  // function parameters are the targets
  const callPrototypeMatchUps = args.map((arg, inx) => {
    const sourceType = checker.getTypeAtLocation(arg)
    const prototypeMatchup: {
      argName: string
      targetType?: ts.Type
      targetTypeText?: string
      sourceType: ts.Type
      sourceTypeText: string
      paramName?: string
      paramLink?: string
    } = {
      argName: getText(arg),
      sourceType,
      sourceTypeText: typeToString(sourceType),
    }
    if (inx < parameters.length) {
      const param = parameters[inx]
      prototypeMatchup.paramLink = getNodeLink(param.valueDeclaration)
      prototypeMatchup.targetType = checker.getTypeOfSymbolAtLocation(param, node)
      prototypeMatchup.targetTypeText = typeToString(prototypeMatchup.targetType)
      prototypeMatchup.paramName = param.escapedName as string
    }
    return prototypeMatchup
  })
  // individual array items mismatch the target
  const errorIndex = args.findIndex((node) => node === errorNode)
  // for each arg, compare its type to call parameter type
  let hadPayoff = false
  // calling arguments are the sources
  // function parameters are the targets
  callPrototypeMatchUps.some(
    ({ targetType, targetTypeText, sourceType, sourceTypeText, argName, paramName, paramLink }, inx) => {
      const sourceInfo = {
        nodeText: argName,
        typeText: sourceTypeText,
        typeValue: sourceType?.value,
        fullText: argName === sourceTypeText ? argName : `${argName}: ${sourceTypeText}`,
        nodeLink: getNodeLink(node),
      }

      // if argument is an Array, see if we're passing an array literal and compare each object literal type
      if (isArrayType(sourceType)) {
        const arrayNode = ts.findAncestor(args[inx], (node) => {
          return !!node && node.kind === ts.SyntaxKind.VariableDeclaration
        })
        if (arrayNode) {
          const arrayItems = context.cache.arrayItemsToTarget[arrayNode.getStart()]
          if (arrayItems) {
            findArrayItemTargetAndSourceToCompare(arrayItems, sourceType, sourceInfo, context)
            hadPayoff = context.hadPayoff
            return hadPayoff // stops on first conflict just like typescript
          }
        }
      }

      const targetInfo = {
        nodeText: paramName,
        typeText: targetTypeText,
        typeValue: targetType?.value,
        fullText: `${paramName}: ${targetTypeText}`,
        nodeLink: paramLink,
      }

      // individual array items mismatch the target
      const pathContext = {
        ...context,
        callPrototypeMatchUps,
        errorIndex,
        callMismatch: true,
        prefix: 'The calling argument type',
        sourceLink: getNodeLink(node),
        targetLink: paramLink,
        sourceTitle: 'Caller',
        targetTitle: 'Callee',
        hadPayoff: false,
      }
      if (hadPayoff) {
        console.log('\n\n')
      }
      // calling arguments are the sources
      // function parameters are the targets
      compareTypes(
        targetType,
        sourceType,
        [
          {
            sourceInfo,
            targetInfo,
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

//======================================================================
//======================================================================
//======================================================================
//==================TARGET[] = [SOURCE]  ==============================
//======================================================================
//======================================================================
//======================================================================

function findArrayItemTargetAndSourceToCompare(arrayItems, targetType, targetInfo, context) {
  // const targetType: ts.Type = checker.getTypeAtLocation(targetNode)
  // const targetTypeText = typeToString(targetType)
  let hadPayoff = false

  // target has GOT to be an array
  targetType = targetType.typeArguments[0]
  arrayItems.some((sourceNode) => {
    const sourceType: ts.Type = checker.getTypeAtLocation(sourceNode)
    const sourceTypeText = typeToString(sourceType)
    const pathContext = {
      ...context,
      prefix: 'The array item type',
      sourceLink: getNodeLink(sourceNode),
      targetLink: targetInfo.nodeLink,
      sourceTitle: 'Item',
      targetTitle: 'Target',
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
          targetInfo,
        },
      ],
      pathContext
    )
    hadPayoff = context.hadPayoff = pathContext.hadPayoff
    return hadPayoff // stops on first conflict just like typescript
  })
  return hadPayoff
}

//======================================================================
//======================================================================
//======================================================================
//  ____            _     _____ _
// |  _ \ __ _ _ __| |_  |_   _| |__  _ __ ___  ___
// | |_) / _` | '__| __|   | | | '_ \| '__/ _ \/ _ \
// |  __/ (_| | |  | |_    | | | | | | | |  __/  __/
// |_|   \__,_|_|   \__|   |_| |_| |_|_|  \___|\___|
//======================================================================
//======================================================================
//======================================================================

// COMPARE TARGET TYPE WITH SOURCE TYPE
//   a) IF THE TYPES HAVE PROPERTIES, COMPARE THOSE PROPERTIES TOO
//   b) KEEP TRACK OF WHAT INNER TYPE WE'RE LOOKING AT ON A STACK

function compareTypes(targetType, sourceType, stack, context, bothWays?: boolean) {
  let typeProblem: any
  let shapeProblems: any[] = []
  let recurses: any[] = []
  const propertyTypes: any = []

  //======================================================================
  //================ [TARGET] = [SOURCE]  =================================
  //======================================================================
  // break out type arrays [targetType] = [sourceType]
  const sourceIsArray = isArrayType(sourceType)
  const targetIsArray = isArrayType(targetType)
  if (sourceIsArray || targetIsArray) {
    if (sourceIsArray === targetIsArray) {
      const sourceArr = sourceType.typeArguments
      const targetArr = targetType.typeArguments
      if (sourceArr.length === targetArr.length) {
        return sourceArr.every((source, inx) => {
          const target = targetArr[inx]
          return compareTypes(target, source, stack, context, bothWays)
        })
      }
    }
    //======================================================================
    //====== PROBLEM: ARRAY MISMATCH ================
    //======================================================================
    const sourceTypeText = typeToString(sourceType)
    const targetTypeText = typeToString(targetType)
    typeProblem = {
      sourceIsArray,
      targetIsArray,
      sourceInfo: { type: sourceType, typeText: sourceTypeText },
      targetInfo: { type: targetType, typeText: targetTypeText },
    }
    theBigPayoff(typeProblem, shapeProblems, context, stack)
    return false
  } else {
    //======================================================================
    //=========== TARGET|TARGET|TARGET = SOURCE|SOURCE|SOURCE ===================
    //======================================================================
    const sources = sourceType.types || [sourceType]
    const targets = targetType.types || [targetType]
    if (
      // every SOURCE type must match at least one TARGET type
      !sources.every((source) => {
        return targets.some((target) => {
          //just need one TARGET to match
          // but it's got to be just one target type that matches
          const sourceTypeText = typeToString(source)
          const targetTypeText = typeToString(target)
          //======================================================================
          //=========== TYPES MATCH--DONE! ===================
          //======================================================================
          if (sourceTypeText === targetTypeText || sourceTypeText === 'any' || targetTypeText === 'any') {
            return true // stop here, DONE
          } else if (
            //======================================================================
            //=========== TYPES ARE SHAPES--RECURSE! ===================
            //======================================================================
            sourceTypeText !== 'undefined' && // undefined is not a simple type
            targetTypeText !== 'undefined' && // but neither does it have properties
            !isSimpleType(sourceTypeText) &&
            !isSimpleType(targetTypeText)
          ) {
            // On first pass, make sure all properties are shared and have the same type
            let s2tProblem: any | undefined = undefined
            let t2sProblem: any | undefined = undefined
            ;({ problem: s2tProblem, recurses } = compareTypeProperties(source, target))
            if (bothWays !== false) {
              // On second pass, make sure all properties are shared in the opposite direction
              // Unless strictFunctionType is set to false
              ;({ problem: t2sProblem } = compareTypeProperties(target, source))
            }
            // If no problems, but some types were shapes, recurse into those type shapes
            if (!s2tProblem && !t2sProblem) {
              if (recurses.length) {
                propertyTypes.push(recurses)
              }
              // return true because even though there might have been problems
              // and might be future problems between other types in this union
              // all we need is one match to take us to the next level
              shapeProblems = []
              return true
            } else {
              // consolidate the error--mismatch will be the same,
              // but keep missing separate for each direction
              const problem = s2tProblem || t2sProblem
              if (s2tProblem && t2sProblem) {
                problem.reversed = t2sProblem.missing
              } else if (!s2tProblem) {
                problem.reversed = problem.missing
                problem.missing.length = 0
              } else {
                problem.reversed = []
              }
              shapeProblems.push(problem)
            }
          } else {
            //======================================================================
            //===== PROBLEM: TYPES ARE MISMATCHED  ============================
            //======================================================================
            // RECORD PROBLEM BUT KEEP TRYING IF THERE ARE OTHER TARGET UNION TYPES
            typeProblem = {
              sourceInfo: { type: source, typeText: sourceTypeText },
              targetInfo: { type: target, typeText: targetTypeText },
            }
          }
          return false // keep looking for a union type match
        })
      })
    ) {
      //======================================================================
      //========= PROBLEM: NO MATCHING TARGET TYPE ========================
      //======================================================================
      // IF WE GOT HERE, SOURCE COULDN'T FIND ANY MATCHING TARGET TYPE
      theBigPayoff(typeProblem, shapeProblems, context, stack)
      return false
    }
    //======================================================================
    //========= KEEP RECURSING TO FIND CONFLICT ========================
    //======================================================================
    // IF WE GOT HERE NO CONFLICTS FOUND YET,
    // SEE IF THERE ARE PROPERTY TYPES TO RECURSE INTO
    if (propertyTypes.length) {
      return propertyTypes.every((recurses) => {
        return recurses.every(({ targetType, sourceType, branch }) => {
          // KEEP A SEPARATE STACK FOR EVERY TYPE WE RECURSE INTO
          // SO WE CAN DISPLAY HOW WE GOT TO AN INNER CONFLICT
          const clonedStack = cloneDeep(stack)
          clonedStack.push({
            ...branch,
          })
          return compareTypes(targetType, sourceType, clonedStack, context, bothWays)
        })
      })
    }
  }
  return true
}

//======================================================================
//========= COMPARE TYPE PROPERTIES ========================
//======================================================================
function compareTypeProperties(firstType, secondType) {
  const matched: string[] = []
  const mismatch: string[] = []
  const missing: string[] = []
  const unchecked: string[] = []
  const recurses: any = []
  const sourceTypeText = typeToString(firstType)
  const targetTypeText = typeToString(secondType)
  firstType.getProperties().forEach((firstProp) => {
    firstProp = firstProp?.syntheticOrigin || firstProp
    const propName = firstProp.escapedName as string
    const secondProp = checker.getPropertyOfType(secondType, propName)
    //======================================================================
    //========= MAKE SURE TARGET AND SOURCE HAVE THE SAME PROPERTY ========================
    //======================================================================
    if (secondProp) {
      const firstPropType = checker.getTypeOfSymbol(firstProp)
      const secondPropType = checker.getTypeOfSymbol(secondProp)
      const firstPropTypeText = typeToString(firstPropType)
      const secondPropTypeText = typeToString(secondPropType)
      //======================================================================
      //========= MAKE SURE TARGET AND SOURCE ARE THE SAME TYPE =====================
      //======================================================================
      if (
        firstPropTypeText !== secondPropTypeText &&
        firstPropTypeText !== 'any' &&
        secondPropTypeText !== 'any' &&
        !isFunctionType(firstPropType) &&
        !isFunctionType(secondPropType) &&
        !simpleUnionPropTypeMatch(firstPropType, secondPropType)
      ) {
        // if both are simple types, just show the error
        const isFirstSimple = isSimpleType(firstPropTypeText)
        const isSecondSimple = isSimpleType(secondPropTypeText)
        if (isFirstSimple && isSecondSimple) {
          mismatch.push(propName)
        } else {
          // else recurse the complex types of these properties
          unchecked.push(propName)
          recurses.push({
            targetType: secondPropType,
            sourceType: firstPropType,
            branch: {
              sourceInfo: getPropertyInfo(firstProp, firstPropType),
              targetInfo: getPropertyInfo(secondProp, secondPropType),
            },
          })
        } // else might be string vs 'opt1|opt2'
      } else {
        matched.push(propName)
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      missing.push(propName)
    }
  })

  let problem: any | undefined = undefined
  if (mismatch.length !== 0 || missing.length !== 0) {
    problem = {
      matched,
      mismatch,
      missing,
      unchecked,
      sourceInfo: {
        type: firstType,
        typeText: sourceTypeText,
      },
      targetInfo: {
        type: secondType,
        typeText: targetTypeText,
      },
    }
  }
  return { problem, recurses }
}

const simpleUnionPropTypeMatch = (firstPropType, secondPropType) => {
  if (firstPropType.types || secondPropType.types) {
    let firstPropArr = (firstPropType.types || [firstPropType])
      .map((type) => typeToString(type))
      .filter((type) => isSimpleType(type))
    let secondPropArr = (secondPropType.types || [secondPropType])
      .map((type) => typeToString(type))
      .filter((type) => isSimpleType(type))
    if (firstPropArr.length > secondPropArr.length) [secondPropArr, firstPropArr] = [firstPropArr, secondPropArr]
    return secondPropArr.some((type) => {
      return firstPropArr.includes(type)
    })
  }
  return false
}

//======================================================================
//========= FIND CLOSEST MATCHING TYPES ========================
//======================================================================

function theBigPayoff(typeProblem, shapeProblems, context, stack) {
  // with type unions we want to find the closest matching type
  // so you can work towards that
  let problem
  if (shapeProblems.length) {
    // sort with biggest differences at bottom
    // missing counts for more then a mismatched
    // pop the top for the closest match
    if (shapeProblems.length > 1) {
      shapeProblems.sort((a, b) => {
        return (
          (a.missing.length + a.reversed.length) * 10 +
          a.mismatch.length -
          ((b.missing.length + b.reversed.length) * 10 + b.mismatch.length)
        )
      })
    }
    problem = shapeProblems[0]
  } else {
    problem = typeProblem
  }
  showConflicts(problem, context, stack)
  //showSuggestions(problem, context, stack)
  context.hadPayoff = true
}

//======================================================================
//======================================================================
//======================================================================
//  ____            _     _____
// |  _ \ __ _ _ __| |_  |  ___|__  _   _ _ __
// | |_) / _` | '__| __| | |_ / _ \| | | | '__|
// |  __/ (_| | |  | |_  |  _| (_) | |_| | |
// |_|   \__,_|_|   \__| |_|  \___/ \__,_|_|
//======================================================================
//======================================================================
//======================================================================

// DISPLAY CONFLICTS IN A TABLE
//   a) TYPE CONFLICTS
//   b) TYPE SHAPE CONFICTS
//   c) FUNCTION CALL CONFLICTS

function showConflicts(problem, context, stack) {
  //======================================================================
  //========= INITIALIZE THE COLUMNS =====================
  //======================================================================
  // FOR TYPE CONFLICTS, TARGET IS ON THE LEFT AND SOURCE IS ON THE RIGHT TO MATCH 'TARGET = SOURCE' CONVENTION
  // FOR FUNCTION CALLS, THE ORDER IS REVERSED TO MATCH FUNC(ARG) ==> CONST FUNC(PARAM) CONVENTION
  const { code, callMismatch, sourceTitle = 'Source', targetTitle = 'Target', sourceLink, targetLink } = context
  let { prefix } = context

  const columns: {
    name: string
    minLen?: number
    title: string
    alignment: string
  }[] = []
  if (callMismatch) {
    columns.push({
      name: 'arg',
      title: 'Arg',
      alignment: 'right',
    })
    columns.push({
      name: 'source', // on the left
      minLen: 60,
      title: `${sourceTitle}: ${sourceLink}`,
      alignment: 'left',
    })
    columns.push({
      name: 'parm',
      title: 'Prm',
      alignment: 'right',
    })
    columns.push({
      name: 'target', // on the right
      minLen: 60,
      title: `${targetTitle}: ${targetLink} ${sourceLink === targetLink ? '(same)' : ''}`,
      alignment: 'left',
    })
  } else {
    columns.push({
      name: 'target', // on the left
      minLen: 60,
      title: `${targetTitle}: ${targetLink}`,
      alignment: 'left',
    })
    columns.push({
      name: 'source', // on the right
      minLen: 60,
      title: `${sourceTitle}: ${sourceLink} ${sourceLink === targetLink ? '(same)' : ''}`,
      alignment: 'left',
    })
  }

  //======================================================================
  //========= CREATE/FILL THE TABLE =====================
  //======================================================================
  const p = new Table({
    columns,
  })

  const links = []
  const maxs = []
  const interfaces = []
  let errorType: ErrorType = ErrorType.none
  if (callMismatch) {
    errorType = showCallingArgumentConflicts(p, problem, context, stack, links, maxs, interfaces)
  } else {
    errorType = showTypeConflicts(p, problem, context, stack, links, maxs, interfaces)
  }

  //show the error
  let specs
  switch (errorType) {
    case ErrorType.objectToSimple:
      specs = `is a function or object ${chalk.red('but should be simple')}`
      break
    case ErrorType.simpleToObject:
      specs = `is simple ${chalk.red('but should be a function or object')}`
      break
    case ErrorType.mismatch:
      prefix = 'The types are'
      specs = chalk.yellow('mismatched')
      break
    case ErrorType.arrayToNonArray:
      specs = `is an array ${chalk.red('but should be simple')}`
      break
    case ErrorType.nonArrayToArray:
      specs = `is simple ${chalk.red('but should be an array')}`
      break
    case ErrorType.propMissing:
      specs = `is ${chalk.red('missing')} properties`
      break
    case ErrorType.propMismatch:
      specs = `has ${chalk.yellow('mismatched')} properties`
      break
    case ErrorType.both:
      specs = `has ${chalk.yellow('mismatched')} and ${chalk.red('missing')} properties`
      break
  }
  errorType
  console.log(`TS${code}: ${prefix} ${specs}`)

  // print the table
  p.printTable()

  if (problem.unchecked && problem.unchecked.length) {
    console.log(`( ${chalk.cyan(problem.unchecked.join(', '))} not yet checked )`)
  }

  // print the table notes:
  links.forEach((link) => console.log(link))

  if (isVerbose) {
    maxs.forEach((max) => console.log(max))
    interfaces.forEach((inter) => console.log(inter))
    console.log('')
  } else if (maxs.length || interfaces.length) {
    console.log(`To see all notes use --v`)
    if (links.length) console.log('')
  }
}

//======================================================================
//========= THE CALL ARGUMENT CONFLICT TABLE =====================
//======================================================================
function showCallingArgumentConflicts(p, problem, context, stack, links, maxs, interfaces): ErrorType {
  let errorType: ErrorType = ErrorType.none
  context.callPrototypeMatchUps.forEach(({ argName, paramName, sourceTypeText, targetTypeText }, inx) => {
    if (inx !== context.errorIndex) {
      let color = 'green'
      if (sourceTypeText !== targetTypeText) {
        if (context.errorIndex === -1 && errorType === ErrorType.none) {
          errorType = showTypeConflicts(p, problem, context, stack, links, maxs, interfaces, inx + 1)
        }
        color = isSimpleMismatch(targetTypeText, sourceTypeText) ? 'yellow' : 'red'
      }
      p.addRow(
        {
          arg: inx + 1,
          parm: inx + 1,
          source: `${min(maxs, argName)}`,
          target: `${min(maxs, `${paramName}: ${targetTypeText}`)}`,
        },
        { color }
      )
    } else {
      // FOR THE ARGUMENT THAT HAD THE ACTUAL COMPILER ERROR, SHOW ITS FULL TYPE CONFLICT
      errorType = showTypeConflicts(p, problem, context, stack, links, maxs, interfaces, inx + 1)
    }
  })
  return errorType
}

//======================================================================
//========= THE TYPE CONFLICT TABLE =====================
//======================================================================

function showTypeConflicts(p, problem, context, stack, links, maxs, interfaces, arg?): ErrorType {
  // display the path we took to get here
  let spacer = ''
  let lastTargetType
  let lastSourceType
  let errorType: ErrorType = ErrorType.none
  const { mismatch, missing, reversed, sourceIsArray, targetIsArray, matched, unchecked } = problem
  const showTypeProperties = !!mismatch && !!missing && !!reversed

  //======================================================================
  //========= FIRST WE DISPLAY THE PARENT TYPES THAT GOT US HERE ================
  //======================================================================
  // IF WE DIDN'T RECURSE INTO A TYPE PROPERTY, THIS IS THE WHOLE TABLE
  stack.forEach((layer, inx) => {
    const { sourceInfo, targetInfo } = layer
    const targetTypeText = targetInfo?.typeText
    const sourceTypeText = sourceInfo?.typeText

    let color: string = 'green'
    if (sourceIsArray !== targetIsArray) {
      errorType = sourceIsArray ? ErrorType.arrayToNonArray : ErrorType.nonArrayToArray
      color = 'red'
    } else if (!showTypeProperties && targetTypeText !== sourceTypeText) {
      const isSourceSimple = isSimpleType(sourceTypeText)
      const isTargetSimple = isSimpleType(targetTypeText)
      if (isSourceSimple && isTargetSimple) {
        errorType = ErrorType.mismatch
        color = 'yellow'
      } else {
        errorType = isSourceSimple ? ErrorType.simpleToObject : ErrorType.objectToSimple
        color = 'red'
      }
    }

    const simpleConflict = false
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

  //======================================================================
  //========= SHOW TYPE PROPERTY CONFLICTS ================
  //======================================================================
  // ONLY SHOWN IF CONFLICT IS AN INNER TYPE PROPERTY
  if (showTypeProperties && problem) {
    const targetMap = (context.targetMap = getTypeMap(problem.targetInfo.type))
    const sourceMap = (context.sourceMap = getTypeMap(problem.sourceInfo.type))
    const sourcePropProblems: { missing: any[]; mismatch: any[] } | undefined = (context.sourcePropProblems = {
      missing: [],
      mismatch: [],
    })
    const targetPropProblems: { missing: any[]; mismatch: any[] } | undefined = (context.targetPropProblems = {
      missing: [],
      mismatch: [],
    })

    // matched, unchecked
    const colors = ['green', 'cyan']
    ;[matched, unchecked].forEach((arr, inx) => {
      arr.forEach((propName) => {
        let targetText = targetMap[propName].fullText
        let sourceText = sourceMap[propName].fullText
        if (inx === 0 && targetText.split('|').length > 1 && !isVerbose) {
          targetText = `${propName}: ${sourceMap[propName].typeText} | ... ${addNote(maxs, targetText)}`
        }
        if (inx === 1) {
          targetText = `${targetText}  ${addLink(
            links,
            spacer,
            targetMap[propName].fullText,
            targetMap[propName].nodeLink,
            colors[inx]
          )}`
          sourceText = `${sourceText}  ${addLink(
            links,
            spacer,
            sourceMap[propName].fullText,
            sourceMap[propName].nodeLink,
            colors[inx]
          )}`
        }

        p.addRow(
          {
            target: `${spacer}${min(maxs, targetText)}`,
            source: `${spacer}${min(maxs, sourceText)}`,
          },
          { color: colors[inx] }
        )
      })
    })

    // mismatch, missing, reversed
    const mismatchArr: { source?: string; target?: string }[] = mismatch.map((propName) => {
      return { source: propName, target: propName }
    })
    const missingArr: { source?: string; target?: string }[] = missing.map((propName) => {
      return { source: propName }
    })
    reversed.forEach((propName, inx) => {
      if (!targetMap[propName].isOpt && (!sourceMap[propName] || !sourceMap[propName].fullText)) {
        if (inx < missingArr.length) {
          missingArr[inx].target = propName
        } else {
          missingArr.push({ target: propName })
        }
      }
    })

    // SORT CONFLICTING TYPES BY THEIR PARENT INTERFACE IF ANY
    context.externalLinks = []
    context.mismatchInterfaceMaps = asTypeInterfaces(mismatchArr, targetMap, sourceMap)
    context.missingInterfaceMaps = asTypeInterfaces(missingArr, targetMap, sourceMap)

    // DISPLAY MISMATCHED TYPES IN YELLOW
    displayDifferences(
      mismatchArr,
      'yellow',
      targetPropProblems.mismatch,
      sourcePropProblems.mismatch,
      context.mismatchInterfaceMaps
    )

    // DISPLAY missing TYPES IN red
    displayDifferences(
      missingArr,
      'red',
      targetPropProblems.missing,
      sourcePropProblems.missing,
      context.missingInterfaceMaps
    )

    if (missing.length && mismatch.length) {
      errorType = ErrorType.both
    } else if (missing.length) {
      errorType = ErrorType.propMissing
    } else if (mismatch.length) {
      errorType = ErrorType.propMismatch
    }
    return errorType

    //======================================================================
    //========= DISPLAY TYPE PROPERTY CONFLICTS ================
    //======================================================================

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
            if (
              isVerbose &&
              targetMap[target].parentInfo &&
              targetMap[target].parentInfo.fullText !== lastTargetParent
            ) {
              lastTargetParent = targetMap[target].parentInfo.fullText
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
            if (
              isVerbose &&
              sourceMap[source].parentInfo &&
              sourceMap[source].parentInfo.fullText !== lastSourceParent
            ) {
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
  return errorType
}

//======================================================================
//======================================================================
//======================================================================
// ____            _     _____ _
// |  _ \ __ _ _ __| |_  |  ___(_)_   _____
// | |_) / _` | '__| __| | |_  | \ \ / / _ \
// |  __/ (_| | |  | |_  |  _| | |\ V /  __/
// |_|   \__,_|_|   \__| |_|   |_| \_/ \___|
//======================================================================
//======================================================================
//======================================================================

// WE'VE SHOWN THE DIFFERENCES, NOW SHOW POSSIBLE SOLUTIONS

function showSuggestions(problem, context, stack) {
  const suggestions: string[] = []
  // calling arguments are the sources
  // function parameters are the targets
  context.targetName = context.callMismatch ? 'Callee Parameter' : 'Target'
  context.sourceName = context.callMismatch ? 'Caller Argument' : 'Source'

  // IF THIS WAS A CALL, SEE IF THE CALL ARGUMENTS MATCH UP WITH THE FUNCTION PARAMETERS
  context.callMismatch
    ? whenCallArgumentsDontMatch(suggestions, problem, context, stack)
    : otherPossibleSuggestions(suggestions, problem, context, stack)

  // IF ANY OF THE PROBLEM RESOURCES WERE FOUND IN NODE_MODULES, SHOW THE BAD NEWS
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
    suggestions.push(`\nNOTE: Because the problem is in external libraries: ${chalk.green(externalLibs)}`)
    suggestions.push(
      `      You will need to disable the error with these comments here: ${chalk.blueBright(
        getNodeLink(context.errorNode)
      )}`
    )
    suggestions.push(`${chalk.greenBright('        // eslint-disable-next-line @typescript-eslint/ban-ts-comment')} `)
    suggestions.push(`${chalk.greenBright(`        // @ts-ignore: Fixed required in ${externalLibs}`)} `)
  }

  suggestions.forEach((solution) => console.log(chalk.whiteBright(solution)))
  if (suggestions.length) console.log('')
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

    case isFunctionType(targetInfo.type) || isFunctionType(sourceInfo.type):
      return whenPrototypesDontMatch(suggestions, problem, context, stack)

    case isArrayType(targetInfo.type) || isArrayType(sourceInfo.type):
      return whenArraysDontMatch(suggestions, problem, context, stack)

    case isSimpleType(targetInfo.typeText) && isSimpleType(sourceInfo.typeText):
      return whenSimpleTypesDontMatch(suggestions, problem, context, stack)

    default:
      return whenTypeShapesDontMatch(suggestions, problem, context, stack)
  }
}

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
        suggestions.push(`TRY: Convert ${sourceName} to number here: ${chalk.blueBright(sourceInfo.nodeLink)}`)
        suggestions.push(`          ${chalk.greenBright(`${targetInfo.nodeText} = Number(${sourceInfo.nodeText})`)}`)
      }
      break
    case 'string':
      suggestions.push(
        `TRY: Convert ${sourceName} to string with ${chalk.green(
          `String(${sourceInfo.nodeText}).toString()`
        )} here: ${chalk.blueBright(sourceInfo.nodeLink)}`
      )
      break
    case 'boolean':
      suggestions.push(`TRY: Convert ${sourceName} to boolean here: ${chalk.blueBright(sourceInfo.nodeLink)}`)
      suggestions.push(`          ${chalk.greenBright(`${targetInfo.nodeText} = !!${sourceInfo.nodeText}`)}`)
      break
  }
  suggestions.push(
    `TRY: Union ${targetName} with ${chalk.green(`| ${sourceInfo.typeText}`)} here: ${chalk.blueBright(
      context.targetDeclared ? getNodeLink(context.targetDeclared) : targetInfo.nodeLink
    )}`
  )
  suggestions.push(`          ${chalk.greenBright(`${targetInfo.fullText} | ${sourceInfo.typeText}`)}`)
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
      ` Did you mean to assign just one element of the ${chalk.greenBright(
        sourceInfo.nodeText
      )} array here?: ${chalk.blueBright(sourceInfo.nodeLink)}`
    )
    suggestions.push(`          ${chalk.greenBright(`${targetInfo.fullText} = ${sourceInfo.nodeText}[0]`)}`)
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
      `TRY: Change the ${targetName} ${chalk.green(targetInfo.nodeText)} type to ${chalk.green(
        sourceInfo.typeText
      )} here: ${chalk.blueBright(targetInfo.nodeLink)}`
    )
  } else {
    suggestions.push(
      `TRY: Union ${targetName} type with ${chalk.green('| undefined')} here: ${chalk.blueBright(
        context.targetDeclared ? getNodeLink(context.targetDeclared) : targetInfo.nodeLink
      )}`
    )
    suggestions.push(`          ${chalk.greenBright(`${targetInfo.typeText} | undefined`)}`)
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
      `TRY: Declare the following type for ${chalk.green(context.targetDeclared.name.text)} here: ${chalk.blueBright(
        getNodeLink(context.targetDeclared)
      )}`
    )
    suggestions.push(`          ${chalk.greenBright(`${context.targetDeclared.name.text}: ${targetInfo.typeText}[]`)}`)
  } else if (problem.targetInfo.typeText.startsWith('never')) {
    suggestions.push(`NOTE: ${targetName}s use the 'never' type to catch code paths that shouldn't be executing`)
    suggestions.push(`TRY: Determine what code path led to this point and fix it`)
    suggestions.push(
      `TRY: If appropriate, change the ${targetName} ${chalk.green(targetInfo.nodeText)} type to ${chalk.green(
        sourceInfo.typeText
      )} here: ${chalk.blueBright(context.targetDeclared ? getNodeLink(context.targetDeclared) : targetInfo.nodeLink)}`
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

function whenUnknownTypeDoesntMatch(suggestions, problem, context, stack) {}

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
      `\n${targetName} is expecting a ${chalk.greenBright('function prototype')} here: ${chalk.blueBright(
        targetInfo.nodeLink
      )}`
    )
    suggestions.push(
      ` But ${sourceName} is a ${chalk.greenBright(sourceInfo.typeText)} here: ${chalk.blueBright(sourceInfo.nodeLink)}`
    )
  } else {
    suggestions.push(
      ` The ${sourceName} is a ${chalk.greenBright(
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
          ` Did you mean to use ${chalk.greenBright(
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
    suggestions.push(`TRY: Make the missing properties optional using the ${chalk.green('Partial<type>')} utility:`)
    partialInterfaces.forEach((parentInfo) => {
      suggestions.push(
        `   ${chalk.greenBright(`interface Partial<${parentInfo.typeText}>`)} here: ${chalk.blueBright(
          parentInfo.nodeLink
        )}`
      )
    })
  }
}

// ===============================================================================
// ===============================================================================
// ===============================================================================
//  _   _      _
// | | | | ___| |_ __   ___ _ __ ___
// | |_| |/ _ \ | '_ \ / _ \ '__/ __|
// |  _  |  __/ | |_) |  __/ |  \__ \
// |_| |_|\___|_| .__/ \___|_|  |___/
//              |_|
// ===============================================================================
// ===============================================================================
// ===============================================================================

function getPropertyInfo(prop: ts.Symbol, type?: ts.Type) {
  const declarations = prop?.declarations
  if (Array.isArray(declarations)) {
    const declaration = declarations[0]
    type = type || checker.getTypeAtLocation(declaration)
    const typeText = (type.types || [type]).map((type) => typeToString(type)).join(' | ')
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

function min(maxs, type, max = MAX_COLUMN_WIDTH) {
  type = type.replace(' | undefined', '').replace(/\\n/g, '')
  if (type.length > max) {
    type = `${type.substr(0, max / 4)}.....${type.substr(-max / 2)}  ${maxs ? addNote(maxs, type) : ''}`
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

function addLink(links: string[], spacer, property, link?: string, color?: string) {
  const num = String.fromCharCode('\u2460'.charCodeAt(0) + links.length)
  let fullNote = `${chalk.bold(num)}${spacer}${property.split(':')[0] + ': '}${link}`
  switch (color) {
    case 'red':
      fullNote = chalk.red(fullNote)
      break
    case 'yellow':
      fullNote = chalk.yellow(fullNote)
      break
    case 'cyan':
      fullNote = chalk.cyan(fullNote)
      break
  }
  links.push(fullNote)
  return num
}

function isSimpleType(type) {
  return simpleTypes.includes(type)
}

function isArrayType(type) {
  return checker.typeToTypeNode(type, undefined, 0)?.kind === ts.SyntaxKind.ArrayType
}

function isFunctionType(type) {
  return checker.typeToTypeNode(type, undefined, 0)?.kind === ts.SyntaxKind.FunctionType
}

function typeToString(type) {
  if (type.intrinsicName === 'true' || type.intrinsicName === 'false') {
    return 'boolean'
    // } else if (type.intrinsicName === 'error') {
    //   return 'error'
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

function getNodeDeclartion(node: ts.Node | ts.Identifier, cache) {
  const declarationMap = cache.blocksToDeclarations[getNodeBlockId(node)]
  const varName = node.getText()
  return declarationMap && varName ? declarationMap[varName] : node
}

function isSimpleMismatch(targetTypeText, sourceTypeText) {
  return (
    targetTypeText !== sourceTypeText &&
    targetTypeText !== 'any' &&
    sourceTypeText !== 'any' &&
    isSimpleType(targetTypeText) &&
    isSimpleType(sourceTypeText)
  )
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

/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////

function findSupportedErrors(semanticDiagnostics: readonly ts.Diagnostic[], fileNames: string[]) {
  let hadPayoff = true // the first one is always free
  let anyPayoff = false
  const fileMap = {}
  semanticDiagnostics.forEach(({ code, file, start, messageText }) => {
    if (file && fileNames.includes(file.fileName)) {
      let cache = fileMap[file.fileName]
      if (!cache) {
        cache = fileMap[file.fileName] = cacheNodes(file)
      }
      if (start) {
        const node = cache.startToNode[start]
        if (node) {
          if (handlesTheseTsErrors.includes(code)) {
            if (hadPayoff) {
              console.log('\n\n')
            }
            hadPayoff = findTargetAndSourceToCompare(code, node, cache)
            anyPayoff = anyPayoff || hadPayoff
          }
        }
      }
    }
  })
  if (!anyPayoff) {
    console.log(`\n--no squirrels--  only looks for these: ${handlesTheseTsErrors.join(', ')}`)
  }
  console.log('\n\n--------------------------------------------------------------------------')
}

const fileNames = process.argv.slice(2).filter((arg) => {
  if (arg.startsWith('-')) {
    if (arg.startsWith('-v') || arg.startsWith('--v')) isVerbose = true
    return false
  }
  return true
})

// Read tsconfig.json file
const tsconfigPath = ts.findConfigFile(fileNames[0], ts.sys.fileExists, 'tsconfig.json')
if (tsconfigPath) {
  const tsconfigFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile)
  options = ts.parseJsonConfigFileContent(tsconfigFile.config, ts.sys, path.dirname(tsconfigPath)).options
}
//isVerbose = true
//options.isolatedModules = false
console.log('starting...')
const program = ts.createProgram(fileNames, options)
const checker = program.getTypeChecker()
const syntactic = program.getSyntacticDiagnostics()
console.log('looking...')
findSupportedErrors(program.getSemanticDiagnostics(), fileNames)
if (!!syntactic.length) {
  console.log('Warning: there were syntax errors.', syntactic)
}
