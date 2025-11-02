<template>
  <PrintPage>
    <div class="toc">
      <h1 class="section-title">Table des matières</h1>
      <div class="toc-items">
        <div class="toc-item">
          <span class="toc-label">Personnel (École Étoile filante)</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="staff">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Personnel (Service de garde)</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="sdg">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Conseil d'établissement</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="committees">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Fondation de l'école Étoile filante</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="fondation">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Comités</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="comites">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Centre de services scolaire de Montréal</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="cssdm">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">REPAQ</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="repaq">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Liste des classes (1<sup>e</sup>-2<sup>e</sup>)</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="classes">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Liste des classes (3<sup>e</sup>-4<sup>e</sup>)</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="classes-34">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Liste des classes (5<sup>e</sup>-6<sup>e</sup>)</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="classes-56">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Liste alphabétique des enfants</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="families">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Annexe A</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="appendix">___</span>
        </div>
        <div class="toc-item">
          <span class="toc-label">Annexe B</span>
          <span class="toc-dots" />
          <span class="toc-page" data-section="appendix-b">___</span>
        </div>
      </div>
    </div>
  </PrintPage>
</template>

<style scoped>
/* Section titles */
.section-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0 0 1rem 0;
  padding: 0.5rem 0;
  border-bottom: 2px solid black;
}

/* Table of Contents */
.toc {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toc-items {
  margin-top: 2rem;
}

.toc-item {
  display: flex;
  align-items: baseline;
  margin-bottom: 1rem;
  font-size: 14pt;
}

.toc-label {
  font-weight: bold;
  white-space: nowrap;
}

.toc-dots {
  flex: 1;
  border-bottom: 1px dotted #999;
  margin: 0 0.5rem;
  min-width: 2rem;
}

.toc-page {
  font-weight: bold;
  white-space: nowrap;
  min-width: 3rem;
  text-align: right;
}
</style>
