<template>
  <div class="class-block">
    <!-- Like the app's class view: the name the students chose, then the teacher and the class code -->
    <h2 class="class-title">{{ classItem.className }}</h2>

    <div class="class-subtitle">
      <span v-if="teacherName">{{ teacherName }}</span>
      <span class="class-code">{{ classItem.classCode }}</span>
    </div>

    <!-- Parent Reps -->
    <ParentRepsTable :rep1="rep1" :rep2="rep2" />

    <!-- Students by Grade Level -->
    <div class="students-by-grade">
      <div v-for="gradeGroup in studentsByGrade" :key="gradeGroup.level" class="grade-column">
        <div class="grade-label">
          {{ formatGradeLevel(gradeGroup.level, 'fr') }}
          <span class="grade-count">{{ gradeGroup.students.length }}</span>
        </div>

        <div v-for="student in gradeGroup.students" :key="student.id" class="student-item">
          <span class="no-wrap">{{ student.first_name }}</span>
          {{ ' ' }}<span class="no-wrap">{{ student.last_name }}<template v-if="isStudentRep(student.id)">{{ ' ' }}<RepIcon /></template><template v-if="fevesStudentIds.has(student.id)">{{ ' ' }}<v-icon class="feves-icon" icon="mdi-leaf" size="1.1em" /></template></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { formatGradeLevel } from '@/utils/gradeFormatter.js'
  import ParentRepsTable from './ParentRepsTable.vue'
  import RepIcon from './RepIcon.vue'

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
    // Students on the fèves committee: a leaf next to their name, like the app's class view (black: the print is black and white)
    fevesStudentIds: {
      type: Set,
      default: () => new Set(),
    },
  })

  // Helper: Check if student is a student rep
  function isStudentRep (studentId) {
    return props.classItem.student_rep_1 === studentId || props.classItem.student_rep_2 === studentId
  }
</script>

<style scoped>
/* Natural height: ClassesPage puts two classes on a page when they fit */
.class-block {
  display: flex;
  flex-direction: column;
  padding-top: 0.5rem;
}

.class-block:not(:last-child) {
  margin-bottom: 0.5rem;
}

/* A rule between the classes of a page */
.class-block:not(:first-child) {
  border-top: 1px solid #000;
}

/* The name the students chose: playful, in Nunito Extra Bold like the app's class view */
.class-block .class-title {
  font-family: 'Nunito', Avenir, sans-serif;
  font-size: var(--print-size-subtitle);
  font-weight: 800;
  line-height: 1.15;
  text-wrap: balance;
  margin: 0;
  color: #000;
}

/* The teacher, and the official class code on the right */
.class-subtitle {
  display: flex;
  align-items: baseline;
  gap: 0.7rem;
  margin-bottom: 0.35rem;
  font-size: var(--print-size-contact);
}

.class-code {
  margin-left: auto;
  font-size: var(--print-size-detail);
  letter-spacing: 0.03em;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.students-by-grade {
  display: flex;
  gap: 0.7rem;
  margin-top: 0.2rem;
}

.grade-column {
  flex: 1;
  min-width: 0;
}

/* Level header, like the app: small capitals and the number of students */
.grade-label {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
  padding-bottom: 0.1rem;
  margin-bottom: 0.15rem;
  border-bottom: 1.5px solid #999;
  font-size: var(--print-size-detail);
  font-weight: 500;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  white-space: nowrap;
}

.grade-count {
  margin-left: auto;
  font-weight: 400;
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

/* A name breaks only between first and last name, with the last name indented */
.student-item {
  padding-left: 1em;
  text-indent: -1em;
  font-size: var(--print-size-detail);
  line-height: 1.3;
}

.no-wrap {
  white-space: nowrap;
}

.feves-icon {
  vertical-align: -0.15em;
}
</style>
