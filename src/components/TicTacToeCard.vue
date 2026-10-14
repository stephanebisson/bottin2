<template>
  <v-card
    class="tic-tac-toe-card pa-6 text-center d-flex flex-column"
    elevation="1"
    style="height: 100%; width: 100%;"
  >
    <div class="d-flex flex-column align-center flex-grow-1">
      <!-- Header -->
      <v-icon class="mb-3" color="success" size="48">mdi-gamepad-variant</v-icon>
      <h3 class="text-title-large font-weight-bold mb-1">{{ $i18n('easterEgg.ticTacToe') }}</h3>
      <p class="text-body-small text-medium-emphasis mb-4">{{ $i18n('easterEgg.takeABreak') }}</p>

      <!-- Game status -->
      <div class="mb-3">
        <v-chip
          v-if="!gameOver"
          color="primary"
          size="small"
          variant="flat"
        >
          {{ $i18n('easterEgg.yourTurn') }}
        </v-chip>

        <v-chip
          v-else-if="winner === 'X'"
          color="success"
          size="small"
          variant="flat"
        >
          {{ $i18n('easterEgg.youWin') }}
        </v-chip>

        <v-chip
          v-else-if="winner === 'O'"
          color="error"
          size="small"
          variant="flat"
        >
          {{ $i18n('easterEgg.computerWins') }}
        </v-chip>

        <v-chip
          v-else-if="isDraw"
          color="warning"
          size="small"
          variant="flat"
        >
          {{ $i18n('easterEgg.draw') }}
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
        {{ $i18n('easterEgg.newGame') }}
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
  background-color: color-mix(in srgb, rgb(var(--v-theme-surface-variant)) 30%, transparent);
  border: 2px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 20%, transparent);
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
  background-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 10%, transparent);
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 50%, transparent);
}

.game-cell.cell-disabled {
  cursor: not-allowed;
  opacity: 0.8;
}
</style>
