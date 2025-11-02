<template>
  <PrintPage :id="sectionId">
    <template #header>
      <div class="class-page-header">
        <h1 class="section-title">Liste des classes</h1>
        <span class="class-level-badge" v-html="levelBadge" />
      </div>
    </template>

    <div class="classes-content">
      <ClassBlock
        v-for="classData in classesData"
        :key="classData.classItem.id"
        :class-item="classData.classItem"
        :rep1="classData.rep1"
        :rep2="classData.rep2"
        :students-by-grade="classData.studentsByGrade"
        :teacher-name="classData.teacherName"
      />
    </div>
  </PrintPage>
</template>

<script setup>
  import ClassBlock from './components/ClassBlock.vue'

  const props = defineProps({
    classesData: {
      type: Array,
      required: true,
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
/* Section titles */
.section-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 24pt;
  font-weight: bold;
  margin: 0 0 1rem 0;
  padding: 0.5rem 0;
  border-bottom: 2px solid black;
}

/* Classes Section */
.class-page-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-top: 3px solid black;
  border-bottom: none;
}

.class-page-header .section-title {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.class-level-badge {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18pt;
  font-weight: 600;
  color: #000;
}

.classes-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
