<template>
  <PrintPage id="section-implication" class="implication-page">
    <div class="page-header">
      <h1 class="section-title">L'implication parentale</h1>
    </div>

    <p>L'implication parentale est un élément central de l'école Étoile filante. On
      s'attend à un minimum de 20 heures par année.</p>

    <h2>Comment s'impliquer?</h2>

    <ol class="numbered-list">
      <li>
        <strong>Moments de coéducation</strong> en accompagnant les élèves en classe lors des:
        <ul class="bullet-list">
          <li>Activités Ouvertes d'Apprentissage (AOA);</li>
          <li>Ateliers - animation ou supervision (mercredi après-midi);</li>
          <li>Matinées de parents;</li>
          <li>Périodes de travail autonome (TA);</li>
          <li>Projets de classe.</li>
        </ul>
        <p>C'est de cette façon que nous soutenons le plus les enseignants et nos
          élèves car plusieurs de ces moments de coéducation émanent directement
          des besoins des classes.</p>
        <p>Une autre façon de soutenir directement nos enseignants et élèves est de
          s'offrir comme représentant de classe.</p>
      </li>

      <li>
        <strong>D'autres occasions d'être avec les élèves:</strong>
        <ul class="bullet-list">
          <li>Bibliothèque;</li>
          <li>Sorties;</li>
          <li>Semaines thématiques (semaine de la lecture);</li>
          <li>Équipes et activités sportives (basket, soccer, cross-country, mois de
            l'éducation physique, etc.);</li>
          <li>Activités sociales (barbecue de la rentrée, déjeuner de Noël, pique-nique de fin d'année, etc.).</li>
        </ul>
      </li>

      <li>
        <strong>Joignez-vous à un comité.</strong>
        <p>La liste se trouve dans le bottin et plusieurs comités ont besoin de parents.</p>
      </li>
    </ol>

    <h2>Comment s'informer?</h2>

    <p>Restez informés avec les courriels de l'école, le Calendrier et l'info du mois
      (direction), l'infolettre de l'OPP (Organisation de Participation des Parents) et
      le groupe privé Facebook de la communauté de l'école Étoile filante.</p>

    <p class="emphasis">Bref, les occasions ne manquent pas! À vous de faire le saut et de
      choisir où vous impliquer! Rappelez-vous, nous sommes tous en
      apprentissage!</p>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'

// No props or logic needed for now
</script>

<style scoped>
.implication-page {
  font-size: 12pt;
  line-height: 1.2;
}

p {
  margin-bottom: 0.75rem;
}

p:last-child {
  margin-bottom: 0;
}

.numbered-list {
  margin-left: 1.5rem;
  margin-bottom: 0.75rem;
}

.numbered-list > li {
  margin-bottom: 0.75rem;
  padding-left: 0.5rem;
}

.numbered-list > li > strong {
  text-transform: uppercase;
}

.bullet-list {
  margin-top: 0.4rem;
  margin-bottom: 0.4rem;
  margin-left: 1.5rem;
}

.bullet-list > li {
  margin-bottom: 0.2rem;
}

.numbered-list > li > p {
  margin-top: 0.4rem;
  margin-left: 0;
}

.emphasis {
  font-weight: 600;
  text-transform: uppercase;
  margin-top: 1rem;
}
</style>
