<template>
  <v-footer class="footer-compact d-flex align-center justify-center px-4 py-2">
    <div class="d-flex align-center text-caption text-disabled">
      <span v-html="$t('footer.copyright')" />
      <span class="mx-2">•</span>
      <a
        class="text-decoration-none text-disabled"
        href="mailto:bottin.etoile.filante@gmail.com"
      >
        bottin.etoile.filante@gmail.com
      </a>
    </div>
  </v-footer>
</template>

<script setup>
</script>

<style scoped>
.footer-compact {
  height: auto !important;
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
