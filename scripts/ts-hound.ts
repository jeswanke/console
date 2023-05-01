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
const MAX_TITLE_LENGTH = 200
const MAX_COLUMN_WIDTH = 80
const simpleTypes = ['string', 'number', 'boolean', 'bigint', 'Date', 'any', 'unknown', 'never']
const handlesTheseTsErrors = [2322, 2559, 2345]

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
      // THE ERROR WILL BE ON THIS LINE BUT THE TARGET/SOURCE WILL BE DEFINED ON OTHER LINES
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
//===============  TARGET = SOURCE ====================================
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
    message: min(undefined, `Bad assignment: ${getText(errorNode)}`, MAX_TITLE_LENGTH),
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
//================= func( ):TARGET => {return SOURCE}   ================
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
        message: min(
          undefined,
          `Bad return type: ${container.parent.symbol.getName()}(): ${targetTypeText} => { ${chalk.red(
            getText(node)
          )} }`,
          MAX_TITLE_LENGTH
        ),
        sourceLink,
        targetLink,
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
//================= call func(..SOURCE...) => (...TARGET...)  =================
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
  const functionName = getText(children[0])
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
      const comma = args.length > 1 && inx > args.length - 1 ? ',' : ''
      const message = min(
        undefined,
        `Bad call argument #${inx + 1} type: ${functionName}( ${chalk.red(
          argName
        )}${comma} ) => ${functionName}( ${chalk.red(`${paramName}: ${targetTypeText}`)}${comma} )`,
        MAX_TITLE_LENGTH
      )

      const pathContext = {
        ...context,
        callPrototypeMatchUps,
        errorIndex,
        callMismatch: true,
        message,
        sourceLink: getNodeLink(node),
        targetLink: paramLink,
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
//==================TARGET[] = [SOURCE]  ==============================
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
      message: min(undefined, `Bad array item: ${getText(context.errorNode)}`, MAX_TITLE_LENGTH),
      sourceLink: getNodeLink(sourceNode),
      targetLink: targetInfo.nodeLink,
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
//   c) JUST FIND A SINGLE CONFLICT, WE WILL ELABORATE IN PART THREE

function compareTypes(targetType, sourceType, stack, context, bothWays?: boolean) {
  let problem: any | undefined = undefined
  let recurses: any[] = []
  const propertyTypes: any = []

  //======================================================================
  //================ [TARGET] = [SOURCE]  =================================
  //======================================================================
  // break out type arrays [targetType] = [sourceType]
  if (isArrayType(targetType) || isArrayType(sourceType)) {
    if (isArrayType(targetType) === isArrayType(sourceType)) {
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
    //====== PROBLEM: [TARGET] != SOURCE -OR- TARGET != [SOURCE] ================
    //======================================================================
    // JUST LOOKING FOR ONE CONFLICT, WILL DISPLAY ALL CONFLICTS IN THE BIG PAYOFF
    const sourceTypeText = typeToString(sourceType)
    const targetTypeText = typeToString(targetType)
    problem = {
      sourceInfo: { type: sourceType, typeText: sourceTypeText },
      targetInfo: { type: targetType, typeText: targetTypeText },
    }
    theBigPayoff(problem, context, stack)
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
            // ON FIRST PASS WE MAKE SURE ALL PROPERTIES IN SOURCE ARE IN TARGET
            // PROBLEM IF IT'S NOT AND IT'S NOT OPTIONAL OR IF THE TYPES DON'T MATCH
            // RECURSES ARE ADDED IF THE TYPE PROPERTIES ARE ALSO SHAPES
            ;({ problem, recurses } = compareTypeProperties(source, target))
            if (!problem && bothWays !== false) {
              // ON SECOND PASS COMPARE IN OTHER DIRECTION TO SURE ALL PROPERTIES IN TARGET ARE IN SOURCE
              // UNLESS strictFunctionType IS SET TO FALSE
              // NO NEED TO KEEP RECURSES, THEY'LL BE IDENTICAL
              ;({ problem } = compareTypeProperties(target, source))
            }
            if (!problem) {
              // NO CONFLICTS, SAVE RECURSES TO PERFORM NEXT
              // FOR SPEED, WE'RE LOOKING FOR CONFLICTS BREADTH-FIRST INSTEAD OF DEPTH-FIRST
              if (recurses.length) {
                propertyTypes.push(recurses)
              }
              // TODO--should this be false?
              return true // return true to allow recursion into type properties
            }
          } else {
            //======================================================================
            //===== PROBLEM: TYPES ARE MISMATCHED  ============================
            //======================================================================
            // RECORD PROBLEM BUT KEEP TRYING IF THERE ARE OTHER TARGET UNION TYPES
            problem = {
              sourceInfo: { type: source, typeText: sourceTypeText },
              targetInfo: { type: target, typeText: targetTypeText },
            }
          }
          return false // keep going
        })
      })
    ) {
      //======================================================================
      //========= PROBLEM: NO MATCHING TARGET TYPE ========================
      //======================================================================
      // IF WE GOT HERE, SOURCE COULDN'T FIND ANY MATCHING TARGET TYPE
      // JUST LOOKING FOR ONE CONFLICT, WILL DISPLAY ALL CONFLICTS IN THE BIG PAYOFF
      theBigPayoff(problem, context, stack)
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
//======================================================================
//======================================================================
//========= COMPARE TYPE PROPERTIES ========================
//======================================================================
//======================================================================
//======================================================================
function compareTypeProperties(firstType, secondType) {
  let problem: any | undefined = undefined
  const recurses: any = []
  const sourceTypeText = typeToString(firstType)
  const targetTypeText = typeToString(secondType)
  firstType.getProperties().every((firstProp) => {
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
        !isFunctionType(secondPropType)
      ) {
        // if both are simple types, just show the error
        const isFirstSimple = isSimpleType(firstPropTypeText)
        const isSecondSimple = isSimpleType(secondPropTypeText)
        if (isFirstSimple && isSecondSimple) {
          //======================================================================
          //========= PROBLEM: TYPES DON'T MATCH AND THEY AREN'T SHAPES ===================
          //======================================================================
          // IF SHAPES WE RECURSE INTO THEM UNTIL WE FIND SIMPLE TYPES TO COMPARE
          problem = {
            sourceInfo: {
              type: firstType,
              typeText: sourceTypeText,
            },
            targetInfo: {
              type: secondType,
              typeText: targetTypeText,
            },
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
        } // else might be string vs 'opt1|opt2'
      }
    } else if (!(firstProp.flags & ts.SymbolFlags.Optional)) {
      // missing
      // at this point we just know there's one or more problems in this type shape
      // we fully analyze the properties in showConflicts
      problem = {
        sourceInfo: { type: firstType, typeText: sourceTypeText },
        targetInfo: { type: secondType, typeText: targetTypeText },
      }
      return false
    }
    return true
  })
  return { problem, recurses }
}

function theBigPayoff(problem, context, stack) {
  showConflicts(problem, context, stack)
  showSuggestions(problem, context, stack)
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
//   b) TYPE PROPERTY CONFICTS IF ANY
//   c) CALLING ARGUMENT CONFLICTS IF ORIGINAL CONFLICT WAS PART OF A FUNCTION CALL

function showConflicts(problem, context, stack) {
  //show the error
  console.log(`TS${context.code}: ${context.message}`)

  //======================================================================
  //========= INITIALIZE THE COLUMNS =====================
  //======================================================================
  // FOR TYPE CONFLICTS, TARGET IS ON THE LEFT AND SOURCE IS ON THE RIGHT TO MATCH 'TARGET = SOURCE' CONVENTION
  // FOR FUNCTION CALL CONFLICTS, SOURCE IS ON THE LEFT AND TARGET ON THE RIGHT TO MATCH FUNC(ARG) ==> CONST FUNC(PARAM) CONVENTION
  // CALL TABLES ALSO HAVE AN ARGUMENT/PARAMETER NUMBER COLUMN
  const columns: {
    name: string
    minLen?: number
    title: string
    alignment: string
  }[] = []
  if (context.callMismatch) {
    columns.push({
      name: 'arg',
      title: 'Arg',
      alignment: 'right',
    })
    columns.push({
      name: 'source', // on the left
      minLen: 60,
      title: `Caller: ${context.sourceLink}`,
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
      title: `Method: ${context.targetLink} ${context.sourceLink === context.targetLink ? '(same)' : ''}`,
      alignment: 'left',
    })
  } else {
    columns.push({
      name: 'target', // on the left
      minLen: 60,
      title: `Target: ${context.targetLink}`,
      alignment: 'left',
    })
    columns.push({
      name: 'source', // on the right
      minLen: 60,
      title: `Source: ${context.sourceLink} ${context.sourceLink === context.targetLink ? '(same)' : ''}`,
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
  if (context.callMismatch) {
    showCallingArgumentConflicts(p, problem, context, stack, links, maxs, interfaces)
  } else {
    showTypeConflicts(p, problem, context, stack, links, maxs, interfaces)
  }

  // print the table
  p.printTable()

  // print the table notes:

  // 1) if the content width had to be abbreviated for the column, display the full content here
  if (maxs.length) {
    if (isVerbose) {
      maxs.forEach((max) => console.log(max))
      console.log('')
    } else {
      console.log(`${String.fromCharCode('\u24B6'.charCodeAt(0))}  to see use --v`)
    }
  }

  // 2) links to the resources shown in the table
  links.forEach((link) => console.log(link))

  // 3) if the content was too much and had to display the 'and more...', the full content here
  if (interfaces.length) {
    if (isVerbose) {
      interfaces.forEach((max) => console.log(max))
      console.log('')
    } else {
      console.log(`${String.fromCharCode('\u2474'.charCodeAt(0))}  to see use --v`)
    }
  }
  if (links.length) console.log('')
}

//======================================================================
//========= THE CALL ARGUMENT CONFLICT TABLE =====================
//======================================================================
function showCallingArgumentConflicts(p, problem, context, stack, links, maxs, interfaces) {
  context.callPrototypeMatchUps.forEach(({ argName, paramName, sourceTypeText, targetTypeText }, inx) => {
    if (inx !== context.errorIndex) {
      const conflict = sourceTypeText !== targetTypeText
      p.addRow(
        {
          arg: inx + 1,
          parm: inx + 1,
          source: `${min(maxs, argName)}`,
          target: `${min(maxs, `${paramName}: ${targetTypeText}`)}`,
        },
        { color: conflict ? 'red' : 'green' }
      )
    } else {
      // FOR THE ARGUMENT THAT HAD THE ACTUAL COMPILER ERROR, SHOW ITS FULL TYPE CONFLICT
      showTypeConflicts(p, problem, context, stack, links, maxs, interfaces, inx + 1)
    }
  })
}

//======================================================================
//========= THE TYPE CONFLICT TABLE =====================
//======================================================================

function showTypeConflicts(p, problem, context, stack, links, maxs, interfaces, arg?) {
  // display the path we took to get here
  let spacer = ''
  let lastTargetType
  let lastSourceType
  let showTypeProperties = false

  //======================================================================
  //========= FIRST WE DISPLAY THE PARENT TYPES THAT GOT US HERE ================
  //======================================================================
  // IF WE DIDN'T RECURSE INTO A TYPE PROPERTY, THIS IS THE WHOLE TABLE
  stack.forEach((layer, inx) => {
    const { sourceInfo, targetInfo } = layer
    const targetTypeText = targetInfo?.typeText
    const sourceTypeText = sourceInfo?.typeText

    // DETERMINE IF WE SHOULD ADD TYPE PROPERTY CONFLICTS BELOW
    // if either side is simple or not an array mismatch, reiterate into properties
    // the last value set into showTypeProperties determines if we show property diffs
    const isArrayMismatch = isArrayType(problem.sourceInfo.type) !== isArrayType(problem.targetInfo.type)
    showTypeProperties = !isArrayMismatch && !(isSimpleType(targetTypeText) || isSimpleType(sourceTypeText))

    const simpleConflict = isSimpleConflict(targetTypeText, sourceTypeText) || isArrayMismatch
    const color = simpleConflict ? 'red' : 'green'
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
  //========= FIND TYPE PROPERTY CONFLICTS ================
  //======================================================================
  // ONLY SHOWN IF CONFLICT IS AN INNER TYPE PROPERTY
  if (showTypeProperties && problem) {
    const mismatch: { source?: string; target?: string }[] = []
    const missing: { source?: string; target?: string }[] = []
    const targetMap = getTypeMap(problem.targetInfo.type)
    const sourceMap = getTypeMap(problem.sourceInfo.type)
    const sourcePropProblems: { missing: any[]; mismatch: any[] } | undefined = { missing: [], mismatch: [] }
    const targetPropProblems: { missing: any[]; mismatch: any[] } | undefined = { missing: [], mismatch: [] }
    context.sourcePropProblems = sourcePropProblems
    context.targetPropProblems = targetPropProblems
    context.targetMap = targetMap
    context.sourceMap = sourceMap

    const typesMatch = (arr1, arr2) => {
      if (arr1.length > arr2.length) [arr2, arr1] = [arr1, arr2]
      return arr1.every((type) => {
        return arr2.includes(type)
      })
    }

    // COMPARETYPES() ONLY FOUND THE TWO TYPES THAT ARE IN CONFLICT
    // THIS LOOP ITERATES THRU ALL TYPE PROPERTIES TO SEE EVERYHING THAT'S MISSING OR MISMATCHED
    // WHILE WE'RE AT IT, WE DISPLAY THE MATCHING PROPERTIES IN GREEN

    // FIRST PASS: WE FIND PROPERTIES THAT ARE IN SOURCE BUT NOT TARGET AND NOT OPTIONAL
    // NOTE: EVEN IF BOTH SIDES ARE OPTIONAL, IF THEY BOTH EXIST THEIR TYPES MUST MATCH
    Object.keys(sourceMap).forEach((propName) => {
      if (targetMap[propName] && targetMap[propName].fullText) {
        // at this point object types can't be mismatched, only mismatched properties
        const targetPropTypeText = targetMap[propName].typeText.split(' | ')
        const sourcePropTypeText = sourceMap[propName].typeText.split(' | ')
        if (
          typesMatch(sourcePropTypeText, targetPropTypeText) ||
          sourcePropTypeText.includes('any') ||
          targetPropTypeText.includes('any') ||
          (!isSimpleType(sourcePropTypeText[0]) && !isSimpleType(targetPropTypeText[0]))
        ) {
          p.addRow(
            {
              target: `${spacer}${min(maxs, targetMap[propName].fullText)}`,
              source: `${spacer}${min(maxs, sourceMap[propName].fullText)}`,
            },
            { color: 'green' }
          )
        } else {
          // PROPERTIES ARE IN BOTH TYPES, BUT THEIR TYPES ARE MISMATCHED
          mismatch.push({ source: propName, target: propName })
        }
      } else if (sourceMap[propName].isOpt) {
        // PROPERTY IS MISSING IN TARGET BUT IT'S OPTIONAL
        if (isVerbose) {
          p.addRow(
            {
              target: '',
              source: `${spacer}${min(maxs, sourceMap[propName].fullText)}`,
            },
            { color: 'green' }
          )
        }
      } else {
        // PROPERTY IS MISSING IN TARGET!!!
        missing.push({ source: propName })
      }
    })

    // SECOND PASS: WE FIND PROPERTIES THAT ARE IN TARGET BUT NOT SOURCE AND NOT OPTIONAL
    let inx = 0
    Object.keys(targetMap).forEach((propName) => {
      if (!targetMap[propName].isOpt && (!sourceMap[propName] || !sourceMap[propName].fullText)) {
        if (inx < missing.length) {
          missing[inx].target = propName
        } else {
          missing.push({ target: propName })
        }
        inx++
      }
    })

    // THIRD PASS: SORT CONFLICTING TYPES BY THEIR PARENT INTERFACE IF ANY
    context.externalLinks = []
    context.mismatchInterfaceMaps = asTypeInterfaces(mismatch, targetMap, sourceMap)
    context.missingInterfaceMaps = asTypeInterfaces(missing, targetMap, sourceMap)

    // FORTH PASS: DISPLAY MISMATCHED TYPES IN YELLOW
    displayDifferences(
      mismatch,
      'yellow',
      targetPropProblems.mismatch,
      sourcePropProblems.mismatch,
      context.mismatchInterfaceMaps
    )

    // FIFTH PASS: DISPLAY MISMATCHED TYPES IN YELLOW
    displayDifferences(
      missing,
      'red',
      targetPropProblems.missing,
      sourcePropProblems.missing,
      context.missingInterfaceMaps
    )

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
      suggestions.push('\nCall argument mismatch suggestions:')
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
      suggestions.push('Never mismatch suggestions:')
      return whenNeverTypeDoesntMatch(suggestions, problem, context, stack)

    case targetInfo.typeText === 'undefined' || sourceInfo.typeText === 'undefined':
      suggestions.push('Undefined mismatch suggestions:')
      return whenUndefinedTypeDoesntMatch(suggestions, problem, context, stack)

    case targetInfo.typeText === 'unknown' || sourceInfo.typeText === 'unknown':
      suggestions.push('Unknown mismatch suggestions:')
      return whenUnknownTypeDoesntMatch(suggestions, problem, context, stack)

    case isFunctionType(targetInfo.type) || isFunctionType(sourceInfo.type):
      suggestions.push('Function prototype mismatch suggestions:')
      return whenPrototypesDontMatch(suggestions, problem, context, stack)

    case isArrayType(targetInfo.type) || isArrayType(sourceInfo.type):
      suggestions.push('Array mismatch suggestions:')
      return whenArraysDontMatch(suggestions, problem, context, stack)

    case isSimpleType(targetInfo.typeText) && isSimpleType(sourceInfo.typeText):
      suggestions.push('Simple type mismatch suggestions:')
      return whenSimpleTypesDontMatch(suggestions, problem, context, stack)

    default:
      suggestions.push('Type shape mismatch suggestions:')
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
        suggestions.push(`BEST: Convert ${sourceName} to number here: ${chalk.blueBright(sourceInfo.nodeLink)}`)
        suggestions.push(`          ${chalk.greenBright(`${targetInfo.nodeText} = Number(${sourceInfo.nodeText})`)}`)
      }
      break
    case 'string':
      suggestions.push(
        `BEST: Convert ${sourceName} to string with ${chalk.green(
          `String(${sourceInfo.nodeText}).toString()`
        )} here: ${chalk.blueBright(sourceInfo.nodeLink)}`
      )
      break
    case 'boolean':
      suggestions.push(`BEST: Convert ${sourceName} to boolean here: ${chalk.blueBright(sourceInfo.nodeLink)}`)
      suggestions.push(`          ${chalk.greenBright(`${targetInfo.nodeText} = !!${sourceInfo.nodeText}`)}`)
      break
  }
  suggestions.push(
    `GOOD: Union ${targetName} with ${chalk.green(`| ${sourceInfo.typeText}`)} here: ${chalk.blueBright(
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
      `BEST: Change the ${targetName} ${chalk.green(targetInfo.nodeText)} type to ${chalk.green(
        sourceInfo.typeText
      )} here: ${chalk.blueBright(targetInfo.nodeLink)}`
    )
  } else {
    suggestions.push(
      `BEST: Union ${targetName} type with ${chalk.green('| undefined')} here: ${chalk.blueBright(
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
      `BEST: Declare the following type for ${chalk.green(context.targetDeclared.name.text)} here: ${chalk.blueBright(
        getNodeLink(context.targetDeclared)
      )}`
    )
    suggestions.push(`          ${chalk.greenBright(`${context.targetDeclared.name.text}: ${targetInfo.typeText}[]`)}`)
  } else if (problem.targetInfo.typeText.startsWith('never')) {
    suggestions.push(`NOTE: ${targetName}s use the 'never' type to catch code paths that shouldn't be executing`)
    suggestions.push(`BEST: Determine what code path led to this point and fix it`)
    suggestions.push(
      `GOOD: If appropriate, change the ${targetName} ${chalk.green(targetInfo.nodeText)} type to ${chalk.green(
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
    suggestions.push(`BEST: Make the missing properties optional using the ${chalk.green('Partial<type>')} utility:`)
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

function isSimpleConflict(targetTypeText, sourceTypeText) {
  return (
    targetTypeText !== sourceTypeText &&
    targetTypeText !== 'any' &&
    sourceTypeText !== 'any' &&
    (isSimpleType(targetTypeText) || isSimpleType(sourceTypeText))
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
