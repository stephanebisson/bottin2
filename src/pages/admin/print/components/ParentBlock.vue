<template>
  <div class="parent-entry">
    <div class="parent-name">{{ parent.lastNameFirst }}</div>
    <div class="children-section">
      <div v-for="child in parent.children" :key="child.id" class="child-row">
        <div class="child-name">{{ child.lastNameFirst }}</div>
        <div class="child-class">({{ child.teacherFirstName }}{{ child.levelDisplay ? ', ' + child.levelDisplay : '' }})</div>
      </div>
    </div>
  </div>
</template>

<script setup>
  const props = defineProps({
    parent: {
      type: Object,
      required: true,
    },
  })
</script>

<style scoped>
.parent-entry {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1rem;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #ddd;
  font-size: 9pt;
  line-height: 1.4;
  break-inside: avoid;
}

.parent-name {
  font-weight: 600;
  padding-top: 0.1rem;
}

.children-section {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.child-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.child-name {
  color: #000;
}

.child-class {
  color: #000;
}
</style>
