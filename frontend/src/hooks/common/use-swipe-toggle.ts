/*
 * SPDX-FileCopyrightText: 2026 The HedgeDoc developers (see AUTHORS file)
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */
import type { RefObject } from 'react'
import { useEffect, useRef } from 'react'

const MIN_HORIZONTAL_DISTANCE = 75
const MAX_VERTICAL_DISTANCE = 100

/**
 * Detects horizontal swipe gestures on a container element.
 *
 * @param containerRef The ref to the container element to listen for swipes on
 * @param onSwipeLeft Called when a left swipe is detected
 * @param onSwipeRight Called when a right swipe is detected
 */
export const useSwipeToggle = (
  containerRef: RefObject<HTMLElement | null>,
  onSwipeLeft: () => void,
  onSwipeRight: () => void
): void => {
  const startX = useRef(0)
  const startY = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const onTouchStart = (event: TouchEvent): void => {
      const touch = event.touches[0]
      if (touch) {
        startX.current = touch.clientX
        startY.current = touch.clientY
      }
    }

    const onTouchEnd = (event: TouchEvent): void => {
      const touch = event.changedTouches[0]
      if (!touch) {
        return
      }

      const deltaX = touch.clientX - startX.current
      const deltaY = touch.clientY - startY.current

      if (Math.abs(deltaX) >= MIN_HORIZONTAL_DISTANCE && Math.abs(deltaY) <= MAX_VERTICAL_DISTANCE) {
        if (deltaX < 0) {
          onSwipeLeft()
        } else {
          onSwipeRight()
        }
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend', onTouchEnd)
    }
  }, [containerRef, onSwipeLeft, onSwipeRight])
}
