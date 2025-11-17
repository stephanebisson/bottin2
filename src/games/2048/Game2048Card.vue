<template>
  <v-card
    class="game-2048-card pa-6 text-center d-flex flex-column"
    elevation="2"
    style="height: 100%; width: 100%;"
  >
    <div class="d-flex flex-column align-center flex-grow-1">
      <!-- Header -->
      <v-icon class="mb-3" color="warning" size="48">mdi-grid</v-icon>
      <h3 class="text-h6 font-weight-bold mb-1">{{ $i18n('easterEgg.2048') }}</h3>
      <p class="text-caption text-grey-darken-1 mb-4">{{ $i18n('easterEgg.joinTiles') }}</p>

      <!-- Score display -->
      <div class="d-flex gap-2 mb-4">
        <v-chip color="primary" size="small" variant="flat">
          {{ $i18n('easterEgg.score') }}: {{ score }}
        </v-chip>
        <v-chip color="success" size="small" variant="flat">
          {{ $i18n('easterEgg.best') }}: {{ bestScore }}
        </v-chip>
      </div>

      <!-- Win/Lose overlay -->
      <v-chip
        v-if="gameWon && !continuePlaying"
        class="mb-2"
        color="success"
        size="small"
        variant="flat"
      >
        {{ $i18n('easterEgg.youWin2048') }}
      </v-chip>
      <v-chip
        v-else-if="gameOver"
        class="mb-2"
        color="error"
        size="small"
        variant="flat"
      >
        {{ $i18n('easterEgg.gameOver') }}
      </v-chip>

      <!-- Game board -->
      <div
        ref="boardRef"
        class="game-board mb-3"
        @touchend="handleTouchEnd"
        @touchstart="handleTouchStart"
      >
        <div
          v-for="(row, i) in board"
          :key="i"
          class="game-row"
        >
          <div
            v-for="(cell, j) in row"
            :key="j"
            class="game-tile"
            :class="getTileClass(cell)"
          >
            <span v-if="cell.value > 0" class="tile-value">{{ cell.value }}</span>
          </div>
        </div>
      </div>

      <!-- Hint -->
      <p class="text-caption text-grey mb-3">{{ $i18n('easterEgg.useArrows') }}</p>

      <!-- Buttons -->
      <div class="d-flex gap-2">
        <v-btn
          v-if="gameWon && !continuePlaying"
          color="success"
          size="small"
          variant="outlined"
          @click="handleContinue"
        >
          {{ $i18n('easterEgg.continue') }}
        </v-btn>
        <v-btn
          color="primary"
          size="small"
          variant="outlined"
          @click="handleReset"
        >
          {{ $i18n('easterEgg.newGame') }}
        </v-btn>
      </div>
    </div>
  </v-card>
</template>

<script setup>
  import { onMounted, onUnmounted, ref } from 'vue'
  import { use2048 } from './use2048'

  const {
    board,
    score,
    bestScore,
    gameOver,
    gameWon,
    moveTiles,
    resetGame,
    continueGame,
    handleKeyPress,
  } = use2048()

  const boardRef = ref(null)
  const continuePlaying = ref(false)
  const touchStartX = ref(0)
  const touchStartY = ref(0)

  function getTileClass (cell) {
    const classes = [`tile-${cell.value}`]
    if (cell.isNew) classes.push('tile-new')
    if (cell.isMerged) classes.push('tile-merged')
    return classes.join(' ')
  }

  function handleContinue () {
    continuePlaying.value = true
    continueGame()
  }

  function handleReset () {
    continuePlaying.value = false
    resetGame()
  }

  function handleTouchStart (e) {
    touchStartX.value = e.touches[0].clientX
    touchStartY.value = e.touches[0].clientY
  }

  function handleTouchEnd (e) {
    if (!touchStartX.value || !touchStartY.value) return

    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY

    const diffX = touchEndX - touchStartX.value
    const diffY = touchEndY - touchStartY.value

    const minSwipeDistance = 30

    if (Math.abs(diffX) > Math.abs(diffY)) {
      // Horizontal swipe
      if (Math.abs(diffX) > minSwipeDistance) {
        moveTiles(diffX > 0 ? 'right' : 'left')
      }
    } else {
      // Vertical swipe
      if (Math.abs(diffY) > minSwipeDistance) {
        moveTiles(diffY > 0 ? 'down' : 'up')
      }
    }

    touchStartX.value = 0
    touchStartY.value = 0
  }

  onMounted(() => {
    window.addEventListener('keydown', handleKeyPress)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyPress)
  })
</script>

<style scoped>
.game-2048-card {
  min-height: 380px;
  max-width: 400px;
}

.game-board {
  background-color: #bbada0;
  border-radius: 8px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  touch-action: none;
  user-select: none;
}

.game-row {
  display: flex;
  gap: 8px;
}

.game-tile {
  width: 60px;
  height: 60px;
  background-color: rgba(238, 228, 218, 0.35);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 24px;
  transition: all 0.15s ease-in-out;
}

.tile-value {
  color: #776e65;
}

/* Tile colors based on value */
.tile-2 { background-color: #eee4da; }
.tile-4 { background-color: #ede0c8; }
.tile-8 { background-color: #f2b179; color: #f9f6f2; }
.tile-8 .tile-value { color: #f9f6f2; }
.tile-16 { background-color: #f59563; color: #f9f6f2; }
.tile-16 .tile-value { color: #f9f6f2; }
.tile-32 { background-color: #f67c5f; color: #f9f6f2; }
.tile-32 .tile-value { color: #f9f6f2; }
.tile-64 { background-color: #f65e3b; color: #f9f6f2; }
.tile-64 .tile-value { color: #f9f6f2; }
.tile-128 { background-color: #edcf72; color: #f9f6f2; font-size: 20px; }
.tile-128 .tile-value { color: #f9f6f2; }
.tile-256 { background-color: #edcc61; color: #f9f6f2; font-size: 20px; }
.tile-256 .tile-value { color: #f9f6f2; }
.tile-512 { background-color: #edc850; color: #f9f6f2; font-size: 20px; }
.tile-512 .tile-value { color: #f9f6f2; }
.tile-1024 { background-color: #edc53f; color: #f9f6f2; font-size: 18px; }
.tile-1024 .tile-value { color: #f9f6f2; }
.tile-2048 { background-color: #edc22e; color: #f9f6f2; font-size: 18px; }
.tile-2048 .tile-value { color: #f9f6f2; }

/* Animation for new tiles */
.tile-new {
  animation: appear 0.2s ease-in-out;
}

@keyframes appear {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Animation for merged tiles */
.tile-merged {
  animation: merge 0.15s ease-in-out;
}

@keyframes merge {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style>
