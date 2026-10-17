<template>
  <PrintPage :first-page="true" :no-footer="true">
    <div class="title-page">
      <div class="title-box">
        <div class="title-section">
          <h1 class="main-title">
            <div class="title-word">Le</div>
            <div class="title-word">Gros</div>
            <div class="title-word">Bottin</div>
          </h1>
        </div>

        <div class="title-section">
          <h2 class="subtitle">2025 - 2026</h2>
        </div>

        <div class="title-section">
          <img alt="Étoile filante Logo" src="@/assets/EF_logo.jpg">
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'
</script>

<style scoped>
/* Title Page */
.title-page {
  width: 100%;
  height: 100%;
}

.title-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-evenly;
  width: 100%;
  height: 100%;
  border: 4px double #222;
  padding: 1.4rem;
  background: #fafafa;
}

.title-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.main-title {
  font-family: Didot, 'Bodoni MT', 'Bodoni 72', Georgia, serif;
  font-size: 48pt;
  font-weight: bold;
  text-align: center;
  line-height: 0.95;
  margin: 0;
  text-transform: uppercase;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title-word {
  display: block;
}

.title-page .subtitle {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 2.75rem !important;
  font-weight: 300;
  text-align: center;
  margin: 0 !important;
  letter-spacing: 0.15em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title-section img {
  width: 40%;
  max-height: 1.6in;
  height: auto;
  object-fit: contain;
  object-position: center;
}

/* Print-specific styles */
@media print {
  .title-box {
    width: 100%;
    height: 100%;
    border: 4px double #222;
    background: white;
    padding: 1rem;
  }

  .main-title {
    font-size: 48pt;
    line-height: 0.95;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .title-page .subtitle {
    font-size: 2.75rem !important;
    margin: 0 !important;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .title-section img {
    width: 40%;
    max-height: 1.6in;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
