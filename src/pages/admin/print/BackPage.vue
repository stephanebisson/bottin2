<template>
  <PrintPage :no-footer="true">
    <div class="back-page">
      <div class="placeholder-section">
        <h1>PAGE ARRIÈRE</h1>
        <p class="placeholder-text">
          [À REMPLIR : Informations similaires à la page titre]
        </p>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'
</script>

<style scoped>
/* Back Page */
.back-page {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.back-page h1 {
  font-size: 36pt;
  text-align: center;
  margin-bottom: 2rem;
}

/* Placeholder sections */
.placeholder-section {
  padding: 2rem;
  border: 2px dashed #ccc;
  background: #f9f9f9;
  text-align: center;
  min-height: 4in;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.placeholder-text {
  color: #000;
  font-style: italic;
  font-size: 12pt;
}

/* Print-specific styles */
@media print {
  .placeholder-section {
    border: none;
    background: transparent;
  }
}
</style>
