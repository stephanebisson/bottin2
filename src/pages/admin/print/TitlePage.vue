<template>
  <PrintPage :first-page="true" :no-footer="true">
    <div class="title-page">
      <div class="title-box">
        <div class="title-content">
          <h1 class="main-title">
            <div class="title-word">Le</div>
            <div class="title-word">Gros</div>
            <div class="title-word">Bottin</div>
          </h1>
          <h2 class="subtitle">2025 2026</h2>
        </div>
        <div class="title-logo">
          <img alt="Étoile filante Logo" src="@/assets/EF_logo.jpg">
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<style scoped>
/* Title Page */
.title-page {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.title-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  border: 4px dotted #222;
  padding: 2rem;
  background: #fafafa;
}

.title-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.main-title {
  font-family: Didot, 'Bodoni MT', 'Bodoni 72', Georgia, serif;
  font-size: 72pt;
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

.subtitle {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 36pt;
  font-weight: 300;
  text-align: center;
  margin: 1.5rem 0 0 0;
  letter-spacing: 0.15em;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.title-logo {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 1.5rem 0 0 0;
}

.title-logo img {
  width: 40%;
  max-height: 2.5in;
  height: auto;
  object-fit: contain;
  object-position: center;
}

/* Print-specific styles */
@media print {
  .title-page {
    width: 100%;
    height: 100%;
  }

  .title-box {
    border: 4px dotted #222;
    background: white;
    padding: 1.5rem;
  }

  .main-title {
    font-size: 72pt;
    line-height: 0.95;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .subtitle {
    font-size: 36pt;
    margin: 1.5rem 0 0 0;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .title-logo {
    padding: 1rem 0 0 0;
  }

  .title-logo img {
    width: 40%;
    max-height: 2.5in;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
