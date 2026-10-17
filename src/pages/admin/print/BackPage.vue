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
          <p class="school-name">École alternative {{ SCHOOL_LOCATION.name }}</p>
          <p class="address-line">{{ SCHOOL_LOCATION.address }}</p>
          <p class="address-line">{{ SCHOOL_LOCATION.city }}, {{ SCHOOL_LOCATION.province }} {{ SCHOOL_LOCATION.postal_code }}</p>
          <p class="address-line">{{ formatPhoneForDisplay(SCHOOL_LOCATION.phone) }}</p>
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import { SCHOOL_LOCATION } from '@/config/school.js'
  import { formatPhoneForDisplay } from '@/utils/phoneFormatter.js'
  import PrintPage from './PrintPage.vue'
</script>

<style scoped>
/* Back Page */
.back-page {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  padding: 1.4rem 0;
}

/* Resources Section */
.resources-section {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
  align-items: center;
  text-align: center;
}

.resource-item {
  margin-bottom: 0.35rem;
}

.resource-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 13pt;
  font-weight: 600;
  margin: 0 0 0.35rem 0;
  color: #000;
}

.resource-link {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  margin: 0;
  color: #000;
  word-break: break-word;
}

.resource-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  margin: 0;
  color: #000;
}

/* Bottom Section */
.bottom-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.7rem;
  margin-top: 1.4rem;
}

.logo-container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.logo-container img {
  width: 30%;
  max-height: 1.3in;
  height: auto;
  object-fit: contain;
  object-position: center;
}

.school-address {
  text-align: center;
}

.school-name {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 11pt;
  font-weight: bold;
  margin: 0 0 0.35rem 0;
  color: #000;
}

.address-line {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 9.5pt;
  margin: 0.1rem 0;
  color: #000;
}

/* Print-specific styles */
@media print {
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
