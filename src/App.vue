<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script setup>
  //
</script>

<style>
  /* Hide Firebase emulator warning globally */
  .firebase-emulator-warning,
  [class*="firebase-emulator"],
  [class*="emulator-warning"],
  iframe[src*="/__/"] {
    display: none !important;
  }

  /* Native mobile app viewport handling */
  html, body {
    height: 100%;
    width: 100%;
    /* Prevent overscroll bounce effect (native app feel) */
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
  }

  /* Use dynamic viewport height for mobile browsers */
  @supports (height: 100dvh) {
    html, body {
      height: 100dvh;
    }
  }

  /* Ensure v-app fills the viewport */
  .v-application {
    height: 100%;
  }

  /* Support safe areas on mobile */
  @media (max-width: 600px) {
    .v-main {
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
      padding-bottom: env(safe-area-inset-bottom);
      /* Prevent overscroll bounce in main content area */
      overscroll-behavior: contain;
    }
  }

  /* Allow pull-to-refresh on mobile */
  @media (max-width: 600px) {
    body {
      overscroll-behavior-y: auto;
    }
  }

  /* Print styles - hide UI elements and remove padding */
  @media print {
    /* Hide all app UI components */
    .v-app-bar,
    .v-navigation-drawer,
    .v-footer {
      display: none !important;
    }

    /* Remove all padding from main content for print */
    .v-main,
    .main-content {
      padding: 0 !important;
    }
  }
</style>
