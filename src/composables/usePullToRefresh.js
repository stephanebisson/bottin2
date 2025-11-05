import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Composable for implementing pull-to-refresh functionality
 * @param {Function} onRefresh - Callback function to execute when refresh is triggered
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Distance in pixels to trigger refresh (default: 80)
 * @param {number} options.maxPull - Maximum pull distance (default: 120)
 * @param {boolean} options.disabled - Disable pull-to-refresh (default: false)
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,
    maxPull = 120,
    disabled = false,
  } = options

  const isRefreshing = ref(false)
  const pullDistance = ref(0)
  const isPulling = ref(false)

  let startY = 0
  let currentY = 0

  const canPullToRefresh = () => {
    if (disabled) {return false}
    // Only allow pull-to-refresh when scrolled to the top
    return window.scrollY === 0 || document.documentElement.scrollTop === 0
  }

  const handleTouchStart = e => {
    if (!canPullToRefresh()) {return}
    startY = e.touches[0].pageY
    isPulling.value = false
  }

  const handleTouchMove = e => {
    if (!canPullToRefresh() || isRefreshing.value) {return}

    currentY = e.touches[0].pageY
    const distance = currentY - startY

    // Only handle downward pulls
    if (distance > 0) {
      isPulling.value = true
      // Apply resistance to the pull (exponential decay)
      pullDistance.value = Math.min(
        distance * 0.5,
        maxPull
      )

      // Only prevent default if the event is cancelable
      if (distance > 10 && e.cancelable) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = async () => {
    if (!isPulling.value || isRefreshing.value) {
      isPulling.value = false
      pullDistance.value = 0
      return
    }

    isPulling.value = false

    // Trigger refresh if pulled beyond threshold
    if (pullDistance.value >= threshold) {
      isRefreshing.value = true

      try {
        await onRefresh()
      } catch (error) {
        console.error('Pull-to-refresh error:', error)
      } finally {
        isRefreshing.value = false
        pullDistance.value = 0
      }
    } else {
      // Snap back if not pulled enough
      pullDistance.value = 0
    }
  }

  onMounted(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
  })

  return {
    isRefreshing,
    pullDistance,
    isPulling,
  }
}
