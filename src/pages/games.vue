<template>
  <v-container>
    <!-- Header Section -->
    <div class="text-center mb-8">
      <v-icon color="success" size="64">mdi-gamepad-variant</v-icon>
      <h1 class="text-h3 font-weight-bold mb-2 mt-4">{{ $i18n('games.title') }}</h1>
      <p class="text-h6 text-grey-darken-1">{{ $i18n('games.subtitle') }}</p>
    </div>

    <!-- Games Grid -->
    <v-row>
      <!-- TicTacToe -->
      <v-col
        class="d-flex"
        cols="12"
        md="4"
        sm="6"
      >
        <TicTacToeCard />
      </v-col>

      <!-- 2048 -->
      <v-col
        class="d-flex"
        cols="12"
        md="4"
        sm="6"
      >
        <Game2048Card />
      </v-col>

      <!-- Placeholder for future games -->
      <v-col
        v-for="n in 4"
        :key="n"
        class="d-flex"
        cols="12"
        md="4"
        sm="6"
      >
        <v-card
          class="pa-6 text-center d-flex flex-column"
          elevation="2"
          style="height: 100%; width: 100%; opacity: 0.5;"
        >
          <div class="d-flex flex-column align-center flex-grow-1">
            <v-icon class="mb-3" color="grey" size="48">mdi-lock</v-icon>
            <h3 class="text-h6 font-weight-bold mb-1 text-grey">{{ $i18n('games.comingSoon') }}</h3>
            <p class="text-caption text-grey">{{ $i18n('games.moreGames') }}</p>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
  import TicTacToeCard from '@/components/TicTacToeCard.vue'
  import Game2048Card from '@/games/2048/Game2048Card.vue'
</script>

<style scoped>
/* Add any games-specific styles here */
</style>
