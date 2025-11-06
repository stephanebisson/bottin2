<template>
  <PrintPage :no-footer="true">
    <div class="back-page">
      <div class="resources-section">
        <div class="resource-item">
          <h3 class="resource-title">Site web CSSDM</h3>
          <p class="resource-link">etoile-filante.csdm.ca</p>
        </div>

        <div class="resource-item">
          <h3 class="resource-title">Référentiel pédagogique</h3>
          <p class="resource-link">https://view.genial.ly/6283ec73c151340012d839e0/guide-referentiel-etoile-filante</p>
        </div>

        <div class="resource-item">
          <h3 class="resource-title">Groupe Facebook</h3>
          <p class="resource-text">Communauté de l'école alternative Étoile filante</p>
        </div>

        <div class="resource-item">
          <h3 class="resource-title">Fondation</h3>
          <p class="resource-link">www.etoilefilante.myshopify.com</p>
        </div>

        <div class="resource-item">
          <h3 class="resource-title">Service de garde</h3>
          <p class="resource-link">etoile-filante.csdm.ca/services/service-de-garde/</p>
        </div>
      </div>

      <div class="bottom-section">
        <div class="logo-container">
          <img alt="Étoile filante Logo" src="@/assets/EF_logo.jpg">
        </div>
        <div class="school-address">
          <p class="school-name">École alternative Étoile filante</p>
          <p class="address-line">5619 Chem. de la Côte-Saint-Antoine</p>
          <p class="address-line">Montreal, QC H4A 1R5</p>
          <p class="address-line">514-596-5682</p>
        </div>
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
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 2rem 0;
}

/* Resources Section */
.resources-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
  text-align: center;
}

.resource-item {
  margin-bottom: 0.5rem;
}

.resource-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  margin: 0 0 0.5rem 0;
  color: #000;
}

.resource-link {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  margin: 0;
  color: #333;
  word-break: break-word;
}

.resource-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  margin: 0;
  color: #333;
}

/* Bottom Section */
.bottom-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  margin-top: 2rem;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.logo-container img {
  width: 30%;
  max-height: 2in;
  height: auto;
  object-fit: contain;
  object-position: center;
}

.school-address {
  text-align: center;
}

.school-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  margin: 0 0 0.5rem 0;
  color: #000;
}

.address-line {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  margin: 0.15rem 0;
  color: #333;
}

/* Print-specific styles */
@media print {
  .back-page {
    padding: 1rem 0;
  }

  .resource-title {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .resource-link,
  .resource-text {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .logo-container img {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .school-name,
  .address-line {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
</style>
