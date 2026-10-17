<template>
  <PrintFlow :section-id="sectionId">
    <template #header>
      <div class="class-page-header">
        <h1 class="section-title">Liste des classes</h1>
        <span class="class-level-badge" v-html="levelBadge" />
      </div>
    </template>

    <ClassBlock
      v-for="classData in classesData"
      :key="classData.classItem.id"
      :class-item="classData.classItem"
      :feves-student-ids="fevesStudentIds"
      :rep1="classData.rep1"
      :rep2="classData.rep2"
      :students-by-grade="classData.studentsByGrade"
      :teacher-name="classData.teacherName"
    />
  </PrintFlow>
</template>

<script setup>
  import ClassBlock from './components/ClassBlock.vue'
  import PrintFlow from './PrintFlow.vue'

  defineProps({
    classesData: {
      type: Array,
      required: true,
    },
    // Students on the fèves committee
    fevesStudentIds: {
      type: Set,
      default: () => new Set(),
    },
    levelBadge: {
      type: String,
      required: true,
    },
    sectionId: {
      type: String,
      default: '',
    },
  })
</script>

<style scoped>
/* Classes Section */
.class-page-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 2px solid black;
  padding-bottom: 0.35rem;
  margin-bottom: 0;
}

.class-page-header .section-title {
  border-bottom: none;
  margin-bottom: 0;
  padding-top: 0.35rem;
  padding-bottom: 0;
}

.class-level-badge {
  font-size: var(--print-size-subtitle);
  font-weight: 600;
  color: #000;
}

</style>
