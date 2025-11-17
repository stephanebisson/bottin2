<template>
  <v-footer class="footer-compact d-flex align-center justify-center px-4 py-2">
    <div class="d-flex align-center text-caption text-disabled">
      <span v-html="$i18n('footer.copyright')" />
      <span class="mx-2">•</span>
      <a
        class="text-decoration-none text-disabled"
        href="mailto:bottin.etoile.filante@gmail.com"
      >
        bottin.etoile.filante@gmail.com
      </a>
      <span class="mx-2">•</span>
      <router-link
        class="game-link"
        to="/games"
      >
        <v-icon size="14">mdi-gamepad-variant</v-icon>
      </router-link>
    </div>
  </v-footer>
</template>

<script setup>
</script>

<style scoped>
.footer-compact {
  height: auto !important;
}

.game-link {
  color: rgba(var(--v-theme-on-surface), 0.38);
  text-decoration: none;
  transition: all 0.2s ease;
  opacity: 0.6;
  display: inline-flex;
  align-items: center;
}

.game-link:hover {
  opacity: 1;
  color: rgb(var(--v-theme-success));
  transform: scale(1.1);
}

/* Mobile optimization */
@media (max-width: 600px) {
  .footer-compact {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }

  .footer-compact > div {
    font-size: 0.65rem;
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
