<template>
  <div class="class-block">
    <!-- Class Name and Code -->
    <div class="class-header-row">
      <h2 class="class-title">{{ classItem.className }}</h2>
      <span class="class-code">{{ classItem.classCode }}</span>
    </div>

    <!-- Teacher -->
    <div v-if="teacherName" class="class-teacher-name">
      {{ teacherName }}
    </div>

    <!-- Parent Reps -->
    <ParentRepsTable :rep1="rep1" :rep2="rep2" />

    <!-- Students by Grade Level -->
    <div class="class-students-section">
      <div class="students-by-grade">
        <div v-for="gradeGroup in studentsByGrade" :key="gradeGroup.level" class="grade-column">
          <div class="grade-label">{{ formatGradeLevel(gradeGroup.level) }}</div>
          <div class="grade-students">
            <div v-for="student in gradeGroup.students" :key="student.id" class="student-item" :class="{ 'student-rep': isStudentRep(student.id) }">
              {{ student.first_name }} {{ student.last_name }}<template v-if="isStudentRep(student.id)"> (R)</template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import ParentRepsTable from './ParentRepsTable.vue'

  const props = defineProps({
    classItem: {
      type: Object,
      required: true,
    },
    teacherName: {
      type: String,
      default: '',
    },
    rep1: {
      type: Object,
      default: null,
    },
    rep2: {
      type: Object,
      default: null,
    },
    studentsByGrade: {
      type: Array,
      required: true,
    },
  })

  // Helper: Check if student is a student rep
  function isStudentRep (studentId) {
    return props.classItem.student_rep_1 === studentId || props.classItem.student_rep_2 === studentId
  }

  // Helper: Format grade level
  function formatGradeLevel (level) {
    if (!level || level === 'Unknown') return level

    const numLevel = Number(level)

    switch (numLevel) {
      case 1: { return '1ère année' }
      case 2: { return '2ème année' }
      case 3: { return '3ème année' }
      case 4: { return '4ème année' }
      case 5: { return '5ème année' }
      case 6: { return '6ème année' }
      default: { return `${level}ème année` }
    }
  }
</script>

<style scoped>
.class-block {
  height: 50%;
  min-height: 50%;
  max-height: 50%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.class-block:not(:last-child) {
  margin-bottom: 1rem;
}

.class-header-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding-top: 0.4rem;
  border-top: 1px solid black;
  margin-bottom: 0.4rem;
}

.class-title {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: bold;
  margin: 0;
  color: #000;
}

.class-code {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14pt;
  font-weight: 600;
  color: #000;
}

.class-teacher-name {
  font-size: 10.5pt;
  font-style: italic;
  color: #000;
  margin-bottom: 0.5rem;
}

.class-students-section {
  margin-top: 0.5rem;
  flex: 1;
  overflow: hidden;
}

.students-by-grade {
  display: flex;
  gap: 0.75rem;
  height: 100%;
}

.grade-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #999;
  padding-right: 0.6rem;
}

.grade-column:last-child {
  border-right: none;
}

.grade-label {
  font-size: 8.5pt;
  font-weight: bold;
  color: #000;
  margin-bottom: 0.35rem;
  padding-bottom: 0.2rem;
  border-bottom: 1px solid #ddd;
}

.grade-students {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.student-item {
  font-size: 8.5pt;
  line-height: 1.35;
  page-break-inside: avoid;
}

.student-rep {
  font-weight: 700;
}
</style>
