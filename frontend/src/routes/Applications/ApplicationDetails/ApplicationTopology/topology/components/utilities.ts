/* Copyright Contributors to the Open Cluster Management project */
import { NodeStatus } from '@patternfly/react-topology'
import capitalize from 'lodash/capitalize'
import get from 'lodash/get'

const MAX_LABEL_WIDTH = 18

export function getLabel(type: string | undefined) {
    if (type !== undefined) {
        const label = capitalize(type)
            .replace('Ocpa', 'OCP A')
            .replace('stream', 'Stream')
            .replace('channel', 'Channel')
            .replace('source', 'Source')
            .replace('reSource', 'Resource')
            .replace('definition', 'Definition')
            .replace('config', 'Config')
            .replace('account', 'Account')
            .replace('controller', 'Controller')
        return label
    } else {
        return ''
    }
}

export function getSecondaryLabel(node: { name: any }) {
    let label = ''
    if (get(node, 'type', '') !== 'cluster' || get(node, 'specs.clusterNames', []).length === 1) {
        label = node?.name ?? ''
        if (label.length > MAX_LABEL_WIDTH) {
            label = label.substr(0, MAX_LABEL_WIDTH / 3) + '..' + label.substr((-MAX_LABEL_WIDTH * 2) / 3)
        }
    }
    return label
}

export const getStatus = (node: {
    type: any
    specs?:
        | { clusterStatus: { hasWarning: any; hasFailure: any; isDisabled: any; hasViolations: any; isOffline: any } }
        | undefined
}) => {
    const { type, specs } = node

    // status icon
    let status
    let disabled = false
    let waiting = false

    if (type === 'cluster') {
        // determine icon
        if (specs?.clusterStatus) {
            const { hasWarning, hasFailure, isDisabled, hasViolations, isOffline } = specs.clusterStatus
            status = NodeStatus.success
            if (hasFailure || hasViolations || isOffline) {
                status = NodeStatus.danger
            } else if (hasWarning) {
                status = NodeStatus.warning
            }
            disabled = isDisabled
        }
    }

    const pulse = get(node, 'specs.pulse', '')

    switch (pulse) {
        case 'red':
            status = NodeStatus.danger
            break
        case 'yellow':
            status = NodeStatus.warning
            break
        case 'orange':
            status = NodeStatus.default
            break
        case 'green':
            status = NodeStatus.success
            break
        case 'spinner':
            status = NodeStatus.default
            waiting = true
            break
        default:
            break
    }

    return { status, isDisabled: disabled, isWaiting: waiting }
}

// export const getType = (type: string | undefined) => {
//     return capitalize(startCase(type))
// }

// export const getNodeLabel = (node: { type: string | undefined }) => {
//     let label = getType(node.type)

//     if (label === 'Cluster') {
//         const nbOfClusters = _.get(node, 'specs.clusterNames', []).length
//         if (nbOfClusters > 1) {
//             label = `${nbOfClusters} Clusters`
//         }
//     }

//     return label
// }

// //as scale decreases from max to min, return a counter zoomed value from min to max
// export const counterZoom = (scale, scaleMin, scaleMax, valueMin, valueMax) => {
//     if (scale >= scaleMax) {
//         return valueMin
//     } else if (scale <= scaleMin) {
//         return valueMax
//     }
//     return valueMin + (1 - (scale - scaleMin) / (scaleMax - scaleMin)) * (valueMax - valueMin)
// }
