/* Copyright Contributors to the Open Cluster Management project */
import { css, keyframes } from '@emotion/css'
import { Alert, AlertActionCloseButton, AlertActionLink, AlertGroup, AlertProps } from '@patternfly/react-core'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PulseColor } from '../../types'
import type { TopologyAlert } from '../../model/analyzeTopology'

const STATUS_ORDER: PulseColor[] = ['red', 'orange', 'yellow', 'green']

const statusToVariant: Record<string, AlertProps['variant']> = {
  red: 'danger',
  orange: 'warning',
  yellow: 'warning',
  green: 'success',
}

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`

const fadeOut = keyframes`
  from {
    opacity: 1;
    max-height: 500px;
  }
  to {
    opacity: 0;
    max-height: 0;
    margin: 0;
    padding: 0;
    overflow: hidden;
  }
`

const containerBase = css`
  position: absolute;
  top: 20px;
  left: 20px;
  width: 650px;
  max-width: 33%;
  z-index: 10;
  overflow-y: auto;
`

const containerWithBorder = css`
  border: 1px solid #bee1f4;
  border-radius: var(--pf-t--global--border--radius--medium);
`

const containerHiddenOverflow = css`
  overflow: hidden;
`

const alertFadeIn = css`
  animation: ${fadeIn} 0.3s ease-out;
`

const alertFadeOut = css`
  animation: ${fadeOut} 0.5s ease-out forwards;
`

const bulletSpacer = css`
  margin-top: var(--pf-t--global--spacer--sm);
`

const bulletMarker = css`
  margin-right: var(--pf-t--global--spacer--sm);
`

/** Sorts alerts with major alerts first, then by severity status. */
const sortAlerts = (alerts: TopologyAlert[]): TopologyAlert[] => {
  return [...alerts].sort((a, b) => {
    if (a.isMajor && !b.isMajor) return -1
    if (!a.isMajor && b.isMajor) return 1
    const aIndex = STATUS_ORDER.indexOf(a.status)
    const bIndex = STATUS_ORDER.indexOf(b.status)
    return (aIndex === -1 ? STATUS_ORDER.length : aIndex) - (bIndex === -1 ? STATUS_ORDER.length : bIndex)
  })
}

export interface TopologyAlertsProps {
  alerts: TopologyAlert[]
}

export function TopologyAlerts({ alerts }: TopologyAlertsProps) {
  const dismissedIdsRef = useRef<Set<string>>(new Set())
  const [visibleAlerts, setVisibleAlerts] = useState<TopologyAlert[]>([])
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set())
  const [newAlertIds, setNewAlertIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasScrollbar, setHasScrollbar] = useState(false)

  const sortedInputAlerts = useMemo(() => sortAlerts(alerts), [alerts])

  useEffect(() => {
    const incoming = sortedInputAlerts.filter((alert) => !dismissedIdsRef.current.has(alert.title))
    const existingTitles = new Set(visibleAlerts.map((a) => a.title))
    const toAdd = incoming.filter((alert) => !existingTitles.has(alert.title))

    if (toAdd.length === 0) {
      setVisibleAlerts(incoming)
      return
    }

    let delay = 0
    const addedIds = new Set<string>()

    toAdd.forEach((alert) => {
      const alertTitle = alert.title
      setTimeout(() => {
        setVisibleAlerts((prev) => {
          if (prev.some((a) => a.title === alertTitle)) return prev
          return sortAlerts([...prev, alert])
        })
        setNewAlertIds((prev) => new Set(prev).add(alertTitle))
        setTimeout(() => {
          setNewAlertIds((prev) => {
            const next = new Set(prev)
            next.delete(alertTitle)
            return next
          })
        }, 300)
      }, delay)
      delay += 100
      addedIds.add(alertTitle)
    })

    setVisibleAlerts((prev) => {
      const kept = prev.filter((a) => incoming.some((i) => i.title === a.title))
      return sortAlerts(kept)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedInputAlerts])

  useEffect(() => {
    const el = containerRef.current
    if (!el || newAlertIds.size > 0) {
      setHasScrollbar(false)
      return
    }
    setHasScrollbar(el.scrollHeight > el.clientHeight)
  }, [visibleAlerts, newAlertIds])

  const closeAction = useCallback((alertId: string) => {
    setRemovingIds((prev) => new Set(prev).add(alertId))
    setTimeout(() => {
      dismissedIdsRef.current.add(alertId)
      setVisibleAlerts((prev) => prev.filter((a) => a.title !== alertId))
      setRemovingIds((prev) => {
        const next = new Set(prev)
        next.delete(alertId)
        return next
      })
    }, 500)
  }, [])

  const hasMajor = visibleAlerts.some((alert) => alert.isMajor)
  const maxHeight = hasMajor ? '66vh' : '375px'
  const isFadingIn = newAlertIds.size > 0

  if (!visibleAlerts.length) {
    return null
  }

  return (
    <div
      ref={containerRef}
      className={`${containerBase} ${isFadingIn ? containerHiddenOverflow : ''} ${hasScrollbar ? containerWithBorder : ''}`}
      style={{ maxHeight }}
    >
      <AlertGroup>
        {visibleAlerts.map((alert, index) => {
          const alertId = alert.title
          const isRemoving = removingIds.has(alertId)
          const isNew = newAlertIds.has(alertId)
          const actionLinks = alert.actions?.length ? (
            <Fragment>
              {alert.actions.map((action) =>
                action.action.url ? (
                  <AlertActionLink key={action.label} component="a" href={action.action.url}>
                    {action.label}
                  </AlertActionLink>
                ) : (
                  <AlertActionLink key={action.label} onClick={action.action.func}>
                    {action.label}
                  </AlertActionLink>
                )
              )}
            </Fragment>
          ) : undefined

          return (
            <div key={alertId} className={isRemoving ? alertFadeOut : isNew ? alertFadeIn : undefined}>
              <Alert
                isExpandable={index > 0 && !alert.isMajor}
                variant={statusToVariant[alert.status] ?? 'warning'}
                title={alert.title}
                id={alertId}
                actionClose={<AlertActionCloseButton onClose={() => closeAction(alertId)} />}
                actionLinks={actionLinks}
              >
                {alert.description && (
                  <>
                    <p>{alert.description.message}</p>
                    {alert.description.bullets?.length ? (
                      <div className={bulletSpacer}>
                        {alert.description.bullets.map((bullet) => (
                          <p key={bullet}>
                            <span className={bulletMarker}>{'\u25CF'}</span>
                            {bullet}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </>
                )}
              </Alert>
            </div>
          )
        })}
      </AlertGroup>
    </div>
  )
}
