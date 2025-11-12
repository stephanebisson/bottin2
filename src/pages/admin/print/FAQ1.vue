<template>
  <PrintPage id="section-faq1" class="faq-page">
    <div class="page-header">
      <h1 class="section-title">Trucs et astuces pour les périodes de coéducation</h1>
    </div>

    <div class="faq-item">
      <h3 class="question">Que fait-on au début de la période de coéducation (projets, matinées parents, périodes de TA, etc.)?</h3>
      <div class="answer">
        <p><strong>À votre arrivée :</strong> allez confirmer l'objectif de la période avec l'enseignant; et selon le type d'activité : le fonctionnement (exemple : travail en grand groupe, en équipe, individuel), le local et le matériel.</p>
        <p>Attendez que les élèves soient assis, en silence et attentifs, avant de commencer l'activité.</p>
      </div>
    </div>

    <div class="faq-item">
      <h3 class="question">Que fait-on durant la période de coéducation?</h3>
      <div class="answer">
        <p>Circulez dans la classe. Allez vers chaque groupe et prenez un petit moment pour écouter, là où ils sont rendus. Soyez attentif aux besoins des élèves ou des équipes. Laissez les élèves régler leurs différends, mais n'hésitez pas à intervenir pour donner des conseils ou des encouragements, si nécessaire.</p>
        <p>N'hésitez pas à faire respecter les consignes – assurez-vous, cependant, qu'elles soient courtes, claires et bien comprises. N'oubliez pas que tous les élèves de la classe ont besoin de votre encadrement, de vos conseils et de vos encouragements.</p>
      </div>
    </div>

    <div class="faq-item">
      <h3 class="question">Que dois-je faire si les élèves ont soif ou besoin d'aller à la toilette?</h3>
      <div class="answer">
        <p>L'enfant doit vous avertir avant de sortir de classe. Assurez-vous que l'enfant sort calmement (un à la fois, si possible).</p>
      </div>
    </div>

    <div class="faq-item">
      <h3 class="question">Que puis-je faire si je ne peux répondre aux questions des élèves?</h3>
      <div class="answer">
        <p>Proposez à l'enfant d'utiliser ses outils (référentiels, dictionnaire, etc.)</p>
        <p>Demandez de l'aide à un autre enfant ou à son enseignant (à la fin de la période).</p>
      </div>
    </div>

    <div class="faq-item">
      <h3 class="question">Que faire lorsque l'élève refuse d'effectuer la tâche demandée?</h3>
      <div class="answer">
        <p>Si un enfant ne semble pas accomplir sa tâche, encouragez-le.</p>
        <p>Vérifiez que l'enfant a bien compris sa tâche et qu'il se sent capable de l'accomplir (scinder la tâche, si nécessaire).</p>
        <p>Si le problème persiste, confiez l'enfant à son enseignant.</p>
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
  font-size: 14pt;
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
