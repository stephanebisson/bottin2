<template>
  <PrintPage id="section-faq2" class="faq-page">
    <div class="page-header">
      <h1 class="section-title">Trucs et astuces pour les périodes de coéducation (suite)</h1>
    </div>

    <div class="faq-item">
      <h3 class="question">Que fait-on si un enfant ne respecte pas les consignes ou a un comportement dérangeant?</h3>
      <div class="answer">
        <p>Vous avez le droit d'intervenir.</p>
        <p>Il y a plusieurs moyens selon la situation: faites asseoir l'élève/demandez-lui d'écouter/de se calmer/ramenez-le vers le sujet du projet/demandez à un autre élève d'aller chercher l'enseignant si nécessaire.</p>
        <p>Si un enfant a un comportement dérangeant, rappelez les consignes et utilisez les trucs qui marchent pour vous (changer l'enfant de place, fermer les lumières, faire un décompte, utiliser l'humour, etc.)</p>
        <p>Si le problème persiste, confiez l'enfant à son enseignant.</p>
        <p>Si vous perdez l'attention ce n'est pas grave. Ça arrive même aux profs!</p>
      </div>
    </div>

    <div class="faq-item">
      <h3 class="question">Vers la fin de la période de coéducation – les 10 dernières minutes?</h3>
      <div class="answer">
        <p>Aidez les enfants à réfléchir sur ce qui a été fait et ce qui reste à faire (à la maison ou à la prochaine période, si nécessaire).</p>
        <p>Assurez-vous que les enfants ramassent le matériel.</p>
      </div>
    </div>

    <div class="faq-item">
      <h3 class="question">Que fait-on lorsque la période de coéducation est terminée?</h3>
      <div class="answer">
        <p>N'hésitez jamais à communiquer à l'enseignant, devant le ou les enfant(s), la liste des bons coups. Un peu de valorisation, ça peut faire beaucoup de bien!</p>
        <p>Si possible, partagez vos réflexions sur vos apprentissages et vos observations durant cette période, avec les parents et les enseignants.</p>
      </div>
    </div>
  </PrintPage>
</template>

<script setup>
  import PrintPage from './PrintPage.vue'

// No props or logic needed for now
</script>

<style scoped>
.faq-page {
  font-size: 12pt;
  line-height: 1.2;
}

h2 {
  font-size: 16pt;
  font-weight: 600;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
}

h3 {
  font-size: 15pt;
  font-weight: 600;
  text-align: center;
  margin-top: 1rem;
  margin-bottom: 1rem;
}

p {
  margin-bottom: 0.75rem;
}

p:last-child {
  margin-bottom: 0;
}

.faq-item {
  margin-bottom: 1rem;
  page-break-inside: avoid;
}

.faq-item .question {
  font-size: 13pt;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-align: left;
  margin-top: 0;
}

.faq-item .answer {
  margin-left: 1.5rem;
}

.faq-item .answer p {
  margin-bottom: 0.5rem;
}

.faq-item .answer p:last-child {
  margin-bottom: 0;
}
</style>
