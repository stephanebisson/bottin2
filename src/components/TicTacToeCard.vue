<template>
  <v-card
    class="tic-tac-toe-card pa-6 text-center d-flex flex-column"
    elevation="2"
    style="height: 100%; width: 100%;"
  >
    <div class="d-flex flex-column align-center flex-grow-1">
      <!-- Header -->
      <v-icon class="mb-3" color="success" size="48">mdi-gamepad-variant</v-icon>
      <h3 class="text-h6 font-weight-bold mb-1">{{ $t('easterEgg.ticTacToe') }}</h3>
      <p class="text-caption text-grey-darken-1 mb-4">{{ $t('easterEgg.takeABreak') }}</p>

      <!-- Game status -->
      <div class="mb-3">
        <v-chip
          v-if="!gameOver"
          color="primary"
          size="small"
          variant="flat"
        >
          {{ $t('easterEgg.yourTurn') }}
        </v-chip>
        <v-chip
          v-else-if="winner === 'X'"
          color="success"
          size="small"
          variant="flat"
        >
          {{ $t('easterEgg.youWin') }}
        </v-chip>
        <v-chip
          v-else-if="winner === 'O'"
          color="error"
          size="small"
          variant="flat"
        >
          {{ $t('easterEgg.computerWins') }}
        </v-chip>
        <v-chip
          v-else-if="isDraw"
          color="warning"
          size="small"
          variant="flat"
        >
          {{ $t('easterEgg.draw') }}
        </v-chip>
      </div>

      <!-- Game board -->
      <div class="game-board mb-3">
        <div
          v-for="(cell, index) in board"
          :key="index"
          class="game-cell"
          :class="{ 'cell-disabled': cell || gameOver }"
          @click="makeMove(index)"
        >
          <v-icon
            v-if="cell === 'X'"
            color="primary"
            size="32"
          >
            mdi-close
          </v-icon>
          <v-icon
            v-else-if="cell === 'O'"
            color="error"
            size="32"
          >
            mdi-circle-outline
          </v-icon>
        </div>
      </div>

      <!-- Reset button -->
      <v-btn
        color="primary"
        size="small"
        variant="outlined"
        @click="resetGame"
      >
        {{ $t('easterEgg.newGame') }}
      </v-btn>
    </div>
  </v-card>
</template>

<script setup>
  import { useTicTacToe } from '@/composables/useTicTacToe'

  const { board, gameOver, winner, isDraw, makeMove, resetGame } = useTicTacToe()
</script>

<style scoped>
.tic-tac-toe-card {
  min-height: 280px;
}

.game-board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  width: 180px;
  height: 180px;
}

.game-cell {
  background-color: rgba(var(--v-theme-surface-variant), 0.3);
  border: 2px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 54px;
  height: 54px;
  min-width: 54px;
  min-height: 54px;
  max-width: 54px;
  max-height: 54px;
  flex-shrink: 0;
}

.game-cell:hover:not(.cell-disabled) {
  background-color: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.5);
}

.game-cell.cell-disabled {
  cursor: not-allowed;
  opacity: 0.8;
}
</style>
