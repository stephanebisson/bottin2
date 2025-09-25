<template>
  <v-container>
    <div class="d-flex justify-space-between align-center mb-6">
      <div>
        <v-btn
          class="mb-2"
          prepend-icon="mdi-arrow-left"
          variant="text"
          @click="$router.push('/admin')"
        >
          {{ $t('admin.backToAdminDashboard') }}
        </v-btn>
        <h1 class="text-h3 font-weight-bold">{{ $t('admin.schoolProgressionWorkflow') }}</h1>
      </div>
    </div>

    <!-- Overall Status -->
    <v-card class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-school-sync</v-icon>
        {{ $t('admin.overallStatus') }}
      </v-card-title>

      <v-card-text>
        <div v-if="currentWorkflow" class="mb-4">
          <v-alert
            :text="getWorkflowStatusMessage(currentWorkflow)"
            :title="$t('admin.currentWorkflow')"
            :type="getWorkflowStatusType(currentWorkflow.status)"
          />

          <!-- Workflow Stats -->
          <v-row class="mt-4">
            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-primary">
                    {{ currentWorkflow.stats?.totalStudents || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.totalStudents') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-info">
                    {{ currentWorkflow.stats?.autoProgression || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.autoProgression') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-warning">
                    {{ currentWorkflow.stats?.needsClassAssignment || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.needsAssignment') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <v-col cols="12" md="3" sm="6">
              <v-card variant="outlined">
                <v-card-text class="text-center">
                  <div class="text-h4 font-weight-bold text-success">
                    {{ currentWorkflow.stats?.graduating || 0 }}
                  </div>
                  <div class="text-body-2 text-grey-darken-1">
                    {{ $t('admin.graduating') }}
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Action Buttons -->
          <div class="text-center mt-6">
            <div class="d-flex flex-column flex-sm-row gap-4 justify-center">
              <v-btn
                v-if="currentWorkflow.status === 'active'"
                color="success"
                :disabled="!canApplyChanges || loading"
                :loading="applyingChanges"
                prepend-icon="mdi-check-circle"
                size="large"
                @click="showApplyChangesDialog = true"
              >
                {{ $t('admin.applyChanges') }}
              </v-btn>
            </div>
          </div>
        </div>

        <!-- No Current Workflow -->
        <div v-else class="text-center py-8">
          <v-icon color="grey-darken-2" size="48">mdi-school-question</v-icon>
          <p class="text-h6 mt-2 text-grey-darken-2">
            {{ $t('admin.noActiveProgressionWorkflow') }}
          </p>

          <div class="mt-6">
            <v-btn
              color="primary"
              :disabled="loading"
              :loading="loading"
              prepend-icon="mdi-rocket-launch"
              size="large"
              @click="showStartWorkflowDialog = true"
            >
              {{ $t('admin.startSchoolProgression') }}
            </v-btn>
          </div>
        </div>
      </v-card-text>
    </v-card>

    <!-- New Classes Composition -->
    <v-card v-if="currentWorkflow && firebaseStore.classes.length > 0" class="mb-6">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-view-grid</v-icon>
          {{ $t('admin.newClassesComposition') }}
        </div>

        <!-- Legend -->
        <div class="d-flex align-center gap-3">
          <div class="d-flex align-center">
            <div class="legend-dot text-success font-weight-bold">●</div>
            <span class="text-caption ml-1">{{ $t('admin.newStudents') }}</span>
          </div>
          <div class="d-flex align-center">
            <div class="legend-dot text-primary font-weight-medium">●</div>
            <span class="text-caption ml-1">{{ $t('admin.progressedReassigned') }}</span>
          </div>
          <div class="d-flex align-center">
            <div class="legend-dot text-grey-darken-1">●</div>
            <span class="text-caption ml-1">{{ $t('admin.unchanged') }}</span>
          </div>
        </div>
      </v-card-title>

      <v-card-text>
        <v-row>
          <v-col
            v-for="classItem in firebaseStore.classes"
            :key="classItem.id"
            cols="12"
            lg="3"
            md="4"
            sm="6"
          >
            <v-card class="h-100" variant="outlined">
              <v-card-title class="pa-3 bg-primary text-white">
                <div class="text-truncate">
                  {{ getTeacherName(classItem.teacher) }} ({{ classItem.classLetter }})
                </div>
              </v-card-title>

              <v-card-text class="pa-3">
                <!-- Teacher -->
                <div v-if="classItem.teacher" class="mb-2">
                  <div class="d-flex align-center">
                    <v-icon class="me-1" color="primary" size="small">mdi-account-tie</v-icon>
                    <span class="text-body-2">{{ getTeacherName(classItem.teacher) }}</span>
                  </div>
                </div>

                <!-- Student count and levels -->
                <div class="mb-2">
                  <div class="d-flex align-center">
                    <v-icon class="me-1" color="primary" size="small">mdi-account-multiple</v-icon>
                    <span class="text-body-2">{{ getProjectedClassStudents(classItem.classLetter).length }} {{ $t('classes.students') }}</span>
                    <span
                      v-if="getProjectedClassStudents(classItem.classLetter).length !== getClassStudents(classItem.classLetter).length"
                      class="text-caption text-primary ml-1"
                    >
                      ({{ getClassStudents(classItem.classLetter).length > getProjectedClassStudents(classItem.classLetter).length ? '-' : '+' }}{{ Math.abs(getProjectedClassStudents(classItem.classLetter).length - getClassStudents(classItem.classLetter).length) }})
                    </span>
                  </div>
                </div>

                <!-- Students by grade level -->
                <div v-if="getProjectedClassStudents(classItem.classLetter).length > 0">
                  <div v-for="levelData in getProjectedClassLevelData(classItem.classLetter)" :key="levelData.level" class="mb-2">
                    <!-- Level header -->
                    <div class="d-flex align-center mb-1">
                      <v-chip
                        color="secondary"
                        size="x-small"
                        variant="outlined"
                      >
                        {{ formatGradeLevel(levelData.level) }} ({{ levelData.students.length }})
                      </v-chip>
                    </div>

                    <!-- Student names -->
                    <div class="ml-2">
                      <div
                        v-for="student in levelData.students"
                        :key="student.id"
                        class="text-caption"
                        :class="{
                          'text-success font-weight-bold': student.isNew,
                          'text-primary font-weight-medium': student.isProgressed || student.wasReassigned,
                          'text-grey-darken-1': !student.isNew && !student.isProgressed && !student.wasReassigned
                        }"
                      >
                        {{ student.firstName }} {{ student.lastName }}
                      </div>
                    </div>
                  </div>
                </div>

                <div v-else class="text-caption text-grey">
                  {{ $t('classes.noStudentsFound') }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <!-- Class Assignments Section -->
    <v-card v-if="currentWorkflow && pendingAssignments.length > 0" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-account-switch</v-icon>
        {{ $t('admin.classAssignments') }}
        <v-chip class="ml-2" color="warning" size="small">
          {{ pendingAssignments.length }} {{ $t('admin.pending') }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="assignmentHeaders"
          item-key="studentId"
          :items="pendingAssignments"
          :loading="loading"
        >
          <template #item.studentName="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.studentName }}</div>
              <div class="text-caption text-grey-darken-1">
                {{ getFormattedClassName(item.currentClass) || `${$t('admin.currentClass')}: ${item.currentClass}` }} - {{ formatGradeLevel(item.currentLevel) }}
              </div>
            </div>
          </template>

          <template #item.newLevel="{ item }">
            <v-chip color="primary" size="small" variant="tonal">
              {{ formatGradeLevel(item.newLevel) }}
            </v-chip>
          </template>

          <template #item.assignedClass="{ item }">
            <v-select
              v-if="!item.assigned"
              v-model="item.selectedClass"
              density="compact"
              hide-details
              :items="getAvailableClasses(item.newLevel)"
              :label="$t('admin.selectClass')"
              variant="outlined"
              @update:model-value="assignClass(item)"
            />
            <v-chip v-else color="success" size="small">
              {{ item.assignedClass }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Completed Class Assignments Section -->
    <v-card v-if="currentWorkflow && completedAssignments.length > 0" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-check-circle</v-icon>
        {{ $t('admin.completedAssignments') }}
        <v-chip class="ml-2" color="success" size="small">
          {{ completedAssignments.length }} {{ $t('admin.completed') }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="completedAssignmentHeaders"
          item-key="studentId"
          :items="completedAssignments"
          :loading="loading"
        >
          <template #item.studentName="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.studentName }}</div>
              <div class="text-caption text-grey-darken-1">
                {{ getFormattedClassName(item.currentClass) || `${$t('admin.currentClass')}: ${item.currentClass}` }} - {{ formatGradeLevel(item.currentLevel) }}
              </div>
            </div>
          </template>

          <template #item.newLevel="{ item }">
            <v-chip color="primary" size="small" variant="tonal">
              {{ formatGradeLevel(item.newLevel) }}
            </v-chip>
          </template>

          <template #item.assignedClass="{ item }">
            <v-chip color="success" size="small">
              {{ getFormattedClassName(item.assignedClass) }}
            </v-chip>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- New Students Section -->
    <v-card v-if="currentWorkflow" class="mb-6">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          {{ $t('admin.newStudents') }}
          <v-chip v-if="newStudents.length > 0" class="ml-2" color="info" size="small">
            {{ newStudents.length }} {{ $t('admin.added') }}
          </v-chip>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-plus"
          size="small"
          @click="showAddStudentDialog = true"
        >
          {{ $t('admin.addNewStudent') }}
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div v-if="newStudents.length === 0" class="text-center py-4">
          <p class="text-body-1 text-grey-darken-1">
            {{ $t('admin.noNewStudentsAdded') }}
          </p>
        </div>

        <v-data-table
          v-else
          :headers="newStudentHeaders"
          item-key="id"
          :items="newStudents"
          :loading="loading"
        >
          <template #item.studentName="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.student.first_name }} {{ item.student.last_name }}</div>
              <div class="text-caption text-grey-darken-1">
                {{ $t('admin.class') }}: {{ item.student.className }} ({{ formatGradeLevel(1) }})
              </div>
            </div>
          </template>

          <template #item.parentInfo="{ item }">
            <div>
              <div v-if="item.parent1" class="mb-2">
                <v-alert
                  color="info"
                  density="compact"
                  icon="mdi-account-plus"
                  variant="tonal"
                >
                  <div>
                    <div class="font-weight-medium">
                      {{ `${item.parent1.first_name} ${item.parent1.last_name}` }}
                    </div>
                    <div class="text-caption text-grey-darken-1">
                      {{ item.parent1.isExisting ? (item.parent1.email || 'Unknown') : item.parent1.email }}
                    </div>
                    <div class="text-caption font-weight-medium text-info">
                      {{ item.parent1.isExisting ? $t('admin.existingParent') : $t('admin.newParent') }}
                    </div>
                  </div>
                </v-alert>
              </div>

              <div v-if="item.parent2" class="mb-2">
                <v-alert
                  color="info"
                  density="compact"
                  icon="mdi-account-plus"
                  variant="tonal"
                >
                  <div>
                    <div class="font-weight-medium">
                      {{ `${item.parent2.first_name} ${item.parent2.last_name}` }}
                    </div>
                    <div class="text-caption text-grey-darken-1">
                      {{ item.parent2.isExisting ? (item.parent2.email || 'Unknown') : item.parent2.email }}
                    </div>
                    <div class="text-caption font-weight-medium text-info">
                      {{ item.parent2.isExisting ? $t('admin.existingParent') : $t('admin.newParent') }}
                    </div>
                  </div>
                </v-alert>
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Departing Students Section -->
    <v-card v-if="currentWorkflow" class="mb-6">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-minus</v-icon>
          {{ $t('admin.departingStudents') }}
          <v-chip v-if="departingStudents.length > 0" class="ml-2" color="warning" size="small">
            {{ departingStudents.length }} {{ $t('admin.selected') }}
          </v-chip>
        </div>
        <v-btn
          color="warning"
          prepend-icon="mdi-account-remove"
          size="small"
          @click="showSelectDepartingDialog = true"
        >
          {{ $t('admin.selectDepartingStudents') }}
        </v-btn>
      </v-card-title>

      <v-card-text>
        <div v-if="departingStudents.length === 0" class="text-center py-4">
          <p class="text-body-1 text-grey-darken-1">
            {{ $t('admin.noDepartingStudentsSelected') }}
          </p>
        </div>

        <v-data-table
          v-else
          :headers="departingStudentHeaders"
          item-key="studentId"
          :items="departingStudents"
          :loading="loading"
        >
          <template #item.studentName="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.studentName }}</div>
              <div class="text-caption text-grey-darken-1">
                {{ getFormattedClassName(item.currentClass) || `${$t('admin.currentClass')}: ${item.currentClass}` }} - {{ formatGradeLevel(item.currentLevel) }}
              </div>
            </div>
          </template>

          <template #item.parentStatus="{ item }">
            <div v-if="!item.parentsNeedRemoval || item.parentsNeedRemoval.length === 0" class="text-caption">
              {{ $t('admin.noParentsListed') }}
            </div>
            <div v-else>
              <div v-for="parent in item.parentsNeedRemoval" :key="parent.email" class="mb-2">
                <v-alert
                  :color="parent.needsRemoval ? 'error' : 'success'"
                  density="compact"
                  :icon="parent.needsRemoval ? 'mdi-account-remove' : 'mdi-account-check'"
                  variant="tonal"
                >
                  <div>
                    <div class="font-weight-medium">{{ parent.name }}</div>
                    <div class="text-caption text-grey-darken-1">{{ parent.email }}</div>
                    <div class="text-caption font-weight-medium" :class="parent.needsRemoval ? 'text-error' : 'text-success'">
                      {{ parent.needsRemoval ? $t('admin.willBeDeleted') : $t('admin.willRemain') }}
                    </div>
                  </div>
                </v-alert>
              </div>
            </div>
          </template>

          <template #item.actions="{ item }">
            <v-btn
              color="error"
              icon="mdi-close"
              size="small"
              variant="text"
              @click="removeDepartingStudent(item.id)"
            />
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Graduating Students Section -->
    <v-card v-if="currentWorkflow && graduatingStudents.length > 0" class="mb-6">
      <v-card-title class="d-flex align-center">
        <v-icon class="mr-2">mdi-school</v-icon>
        {{ $t('admin.graduatingStudents') }}
        <v-chip class="ml-2" color="success" size="small">
          {{ graduatingStudents.length }} {{ $t('admin.graduating') }}
        </v-chip>
      </v-card-title>

      <v-card-text>
        <v-data-table
          :headers="graduatingStudentHeaders"
          item-key="studentId"
          :items="graduatingStudents"
          :loading="loading"
        >
          <template #item.studentName="{ item }">
            <div>
              <div class="font-weight-medium">{{ item.studentName }}</div>
              <div class="text-caption text-grey-darken-1">
                {{ getFormattedClassName(item.currentClass) || `${$t('admin.currentClass')}: ${item.currentClass}` }} - {{ formatGradeLevel(item.currentLevel) }}
              </div>
            </div>
          </template>

          <template #item.parentStatus="{ item }">
            <div v-if="!item.parentsNeedRemoval || item.parentsNeedRemoval.length === 0" class="text-caption">
              {{ $t('admin.noParentsListed') }}
            </div>
            <div v-else>
              <div v-for="parent in item.parentsNeedRemoval" :key="parent.email" class="mb-2">
                <v-alert
                  :color="parent.needsRemoval ? 'error' : 'success'"
                  density="compact"
                  :icon="parent.needsRemoval ? 'mdi-account-remove' : 'mdi-account-check'"
                  variant="tonal"
                >
                  <div>
                    <div class="font-weight-medium">{{ parent.name }}</div>
                    <div class="text-caption text-grey-darken-1">{{ parent.email }}</div>
                    <div class="text-caption font-weight-medium" :class="parent.needsRemoval ? 'text-error' : 'text-success'">
                      {{ parent.needsRemoval ? $t('admin.willBeDeleted') : $t('admin.willRemain') }}
                    </div>
                  </div>
                </v-alert>
              </div>
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Start Workflow Dialog -->
    <v-dialog v-model="showStartWorkflowDialog" max-width="500">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="warning">mdi-alert</v-icon>
          {{ $t('admin.confirmStartProgression') }}
        </v-card-title>

        <v-card-text>
          <p class="mb-4">{{ $t('admin.startProgressionWarning') }}</p>

          <v-alert
            class="mb-4"
            color="info"
            icon="mdi-information"
            variant="tonal"
          >
            <div class="text-body-2">
              <strong>{{ $t('admin.thisWillDo') }}:</strong>
              <ul class="mt-2 ml-4">
                <li>{{ $t('admin.analyzeAllStudents') }}</li>
                <li>{{ $t('admin.stageProgressionChanges') }}</li>
                <li>{{ $t('admin.identifyAssignmentsNeeded') }}</li>
              </ul>
            </div>
          </v-alert>

          <v-text-field
            v-model="confirmationText"
            class="mt-4"
            :label="$t('admin.confirmationType')"
            :placeholder="$t('admin.confirmationPlaceholder')"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showStartWorkflowDialog = false"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :disabled="confirmationText.toLowerCase() !== 'confirm'"
            :loading="loading"
            @click="startWorkflow"
          >
            {{ $t('admin.startWorkflow') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Add Student Dialog -->
    <v-dialog v-model="showAddStudentDialog" max-width="800">
      <v-card>
        <v-card-title>
          {{ $t('admin.addNewStudent') }}
        </v-card-title>

        <v-card-text>
          <v-form ref="studentForm" @submit.prevent="addNewStudent">
            <!-- Student Information -->
            <h3 class="mb-4">{{ $t('admin.studentInformation') }}</h3>
            <v-row>
              <v-col cols="6">
                <v-text-field
                  v-model="newStudent.first_name"
                  :label="$t('admin.firstName')"
                  required
                  :rules="[v => !!v || $t('validation.required')]"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newStudent.last_name"
                  :label="$t('admin.lastName')"
                  required
                  :rules="[v => !!v || $t('validation.required')]"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newStudent.className"
                  :items="getAllClasses()"
                  :label="$t('admin.class')"
                  required
                  :rules="[v => !!v || $t('validation.required')]"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <!-- Parent 1 Information -->
            <div class="d-flex align-center mb-4 mt-6">
              <h3>{{ $t('admin.parent1Information') }}</h3>
              <v-switch
                v-model="useExistingParent1"
                class="ml-4"
                color="primary"
                density="compact"
                hide-details
                :label="$t('admin.selectExistingParent')"
              />
            </div>

            <v-row v-if="useExistingParent1">
              <v-col cols="12">
                <v-autocomplete
                  v-model="selectedParent1"
                  clearable
                  item-title="displayName"
                  item-value="value"
                  :items="parentOptions"
                  :label="$t('admin.selectParent1')"
                  :no-data-text="$t('admin.noParentsFound')"
                  :rules="[v => !!v || $t('validation.required')]"
                  variant="outlined"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.email" :title="item.raw.displayName" />
                  </template>
                </v-autocomplete>
              </v-col>
            </v-row>

            <v-row v-else>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent1.first_name"
                  :label="$t('admin.firstName')"
                  required
                  :rules="[v => !!v || $t('validation.required')]"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent1.last_name"
                  :label="$t('admin.lastName')"
                  required
                  :rules="[v => !!v || $t('validation.required')]"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent1.email"
                  :label="$t('common.email')"
                  required
                  :rules="[v => !!v || $t('validation.required'), v => /.+@.+\..+/.test(v) || $t('validation.emailInvalid')]"
                  type="email"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent1.phone"
                  :label="$t('common.phone')"
                  variant="outlined"
                />
              </v-col>
            </v-row>

            <!-- Parent 2 Information (Optional) -->
            <div class="d-flex align-center mb-4 mt-6">
              <h3>{{ $t('admin.parent2Information') }}</h3>
              <v-switch
                v-model="hasParent2"
                class="ml-4"
                color="primary"
                density="compact"
                hide-details
                :label="$t('admin.hasSecondParent')"
              />
              <v-switch
                v-if="hasParent2"
                v-model="useExistingParent2"
                class="ml-4"
                color="primary"
                density="compact"
                hide-details
                :label="$t('admin.selectExistingParent')"
              />
            </div>

            <v-row v-if="hasParent2 && useExistingParent2">
              <v-col cols="12">
                <v-autocomplete
                  v-model="selectedParent2"
                  clearable
                  item-title="displayName"
                  item-value="value"
                  :items="parentOptions"
                  :label="$t('admin.selectParent2')"
                  :no-data-text="$t('admin.noParentsFound')"
                  variant="outlined"
                >
                  <template #item="{ props, item }">
                    <v-list-item v-bind="props" :subtitle="item.raw.email" :title="item.raw.displayName" />
                  </template>
                </v-autocomplete>
              </v-col>
            </v-row>

            <v-row v-if="hasParent2 && !useExistingParent2">
              <v-col cols="6">
                <v-text-field
                  v-model="newParent2.first_name"
                  :label="$t('admin.firstName')"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent2.last_name"
                  :label="$t('admin.lastName')"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent2.email"
                  :label="$t('common.email')"
                  :rules="[v => !v || /.+@.+\..+/.test(v) || $t('validation.emailInvalid')]"
                  type="email"
                  variant="outlined"
                />
              </v-col>
              <v-col cols="6">
                <v-text-field
                  v-model="newParent2.phone"
                  :label="$t('common.phone')"
                  variant="outlined"
                />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showAddStudentDialog = false"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="primary"
            :loading="addingStudent"
            @click="addNewStudent"
          >
            {{ $t('admin.addStudent') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Select Departing Students Dialog -->
    <v-dialog v-model="showSelectDepartingDialog" max-width="800">
      <v-card>
        <v-card-title>
          {{ $t('admin.selectDepartingStudents') }}
        </v-card-title>

        <v-card-text>
          <v-alert
            class="mb-4"
            color="warning"
            icon="mdi-alert"
            variant="tonal"
          >
            {{ $t('admin.departingStudentsWarning') }}
          </v-alert>

          <v-text-field
            v-model="departingSearchQuery"
            class="mb-4"
            clearable
            :label="$t('admin.searchStudents')"
            prepend-inner-icon="mdi-magnify"
            variant="outlined"
          />

          <v-data-table
            v-model="selectedDepartingStudents"
            :headers="departingTableHeaders"
            item-key="studentId"
            :items="filteredStudentsForDeparture"
            return-object
            show-select
          >
            <template #item.studentInfo="{ item }">
              <div>
                <div class="font-weight-medium">{{ item.studentName }}</div>
                <div class="text-caption text-grey-darken-1">
                  {{ $t('admin.class') }}: {{ item.currentClass }} |
                  {{ formatGradeLevel(item.currentLevel) }}
                </div>
              </div>
            </template>

            <template #item.reason="{ item }">
              <v-text-field
                v-model="item.departureReason"
                density="compact"
                hide-details
                :placeholder="$t('admin.departureReasonPlaceholder')"
                variant="outlined"
              />
            </template>
          </v-data-table>
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="cancelDepartingSelection"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="warning"
            :disabled="selectedDepartingStudents.length === 0"
            @click="confirmDepartingSelection"
          >
            {{ $t('admin.confirmDepartingStudents') }} ({{ selectedDepartingStudents.length }})
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Apply Changes Dialog -->
    <v-dialog v-model="showApplyChangesDialog" max-width="600">
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon class="mr-2" color="success">mdi-check-circle</v-icon>
          {{ $t('admin.confirmApplyChanges') }}
        </v-card-title>

        <v-card-text>
          <p class="mb-4">{{ $t('admin.applyChangesWarning') }}</p>

          <v-alert
            class="mb-4"
            color="warning"
            icon="mdi-alert"
            variant="tonal"
          >
            <div class="text-body-2">
              <strong>{{ $t('admin.thisCannotBeUndone') }}</strong>
            </div>
          </v-alert>

          <!-- Changes Summary -->
          <div v-if="currentWorkflow">
            <h4 class="mb-2">{{ $t('admin.changesSummary') }}:</h4>
            <ul class="ml-4">
              <li>{{ currentWorkflow.stats.autoProgression }} {{ $t('admin.studentsProgressed') }}</li>
              <li>{{ currentWorkflow.stats.graduating }} {{ $t('admin.studentsGraduated') }}</li>
              <li>{{ newStudents.length }} {{ $t('admin.newStudentsAdded') }}</li>
            </ul>
          </div>

          <v-text-field
            v-model="applyConfirmationText"
            class="mt-4"
            :label="$t('admin.confirmationType')"
            :placeholder="$t('admin.confirmationPlaceholder')"
            variant="outlined"
          />
        </v-card-text>

        <v-card-actions>
          <v-spacer />
          <v-btn
            color="grey"
            variant="text"
            @click="showApplyChangesDialog = false"
          >
            {{ $t('common.cancel') }}
          </v-btn>
          <v-btn
            color="success"
            :disabled="applyConfirmationText.toLowerCase() !== 'confirm'"
            :loading="applyingChanges"
            @click="applyChanges"
          >
            {{ $t('admin.applyChanges') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

  </v-container>
</template>

<script setup>
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { useAuthStore } from '@/stores/auth'
  import { useFirebaseDataStore } from '@/stores/firebaseData'

  const { t } = useI18n()
  const authStore = useAuthStore()
  const firebaseStore = useFirebaseDataStore()

  // State
  const loading = ref(false)
  const addingStudent = ref(false)
  const applyingChanges = ref(false)
  const error = ref(null)

  // Dialogs
  const showStartWorkflowDialog = ref(false)
  const showAddStudentDialog = ref(false)
  const showApplyChangesDialog = ref(false)
  const showSelectDepartingDialog = ref(false)

  // Confirmations
  const confirmationText = ref('')
  const applyConfirmationText = ref('')

  // Workflow data
  const currentWorkflow = ref(null)
  const workflowHistory = ref([])

  // New student form
  const hasParent2 = ref(false)
  const useExistingParent1 = ref(false)
  const useExistingParent2 = ref(false)
  const selectedParent1 = ref(null)
  const selectedParent2 = ref(null)

  const newStudent = ref({
    first_name: '',
    last_name: '',
    className: '',
  })
  const newParent1 = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })
  const newParent2 = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  })

  // Departing students
  const departingSearchQuery = ref('')
  const selectedDepartingStudents = ref([])
  const departingStudentsData = ref([])

  // Table headers
  const assignmentHeaders = [
    { title: t('admin.student'), key: 'studentName', sortable: true },
    { title: t('admin.newLevel'), key: 'newLevel', sortable: false },
    { title: t('admin.assignClass'), key: 'assignedClass', sortable: false },
  ]

  const completedAssignmentHeaders = [
    { title: t('admin.student'), key: 'studentName', sortable: true },
    { title: t('admin.newLevel'), key: 'newLevel', sortable: false },
    { title: t('admin.assignedClass'), key: 'assignedClass', sortable: false },
  ]

  const graduatingStudentHeaders = [
    { title: t('admin.student'), key: 'studentName', sortable: true },
    { title: t('admin.parentStatus'), key: 'parentStatus', sortable: false },
  ]

  const departingStudentHeaders = [
    { title: t('admin.student'), key: 'studentName', sortable: true },
    { title: t('admin.parentStatus'), key: 'parentStatus', sortable: false },
    { title: t('admin.actions'), key: 'actions', sortable: false },
  ]

  const newStudentHeaders = [
    { title: t('admin.student'), key: 'studentName', sortable: true },
    { title: t('admin.parentInfo'), key: 'parentInfo', sortable: false },
  ]

  const departingTableHeaders = [
    { title: t('admin.student'), key: 'studentInfo', sortable: true },
    { title: t('admin.departureReason'), key: 'reason', sortable: false },
  ]

  // Computed properties
  const pendingAssignments = computed(() => {
    if (!currentWorkflow.value?.assignments) return []

    // Get list of departing student IDs
    const departingStudentIds = new Set(departingStudentsData.value.map(s => s.studentId))

    return currentWorkflow.value.assignments
      .filter(assignment =>
        !assignment.assigned
        && !departingStudentIds.has(assignment.studentId),
      )
      .map(assignment => ({
        ...assignment,
        selectedClass: null,
      }))
      .sort((a, b) => {
        // First sort by new level (ascending)
        if (a.newLevel !== b.newLevel) {
          return a.newLevel - b.newLevel
        }
        // Then sort by student name (ascending)
        return a.studentName.localeCompare(b.studentName)
      })
  })

  const completedAssignments = computed(() => {
    if (!currentWorkflow.value?.assignments) return []

    // Get list of departing student IDs
    const departingStudentIds = new Set(departingStudentsData.value.map(s => s.studentId))

    return currentWorkflow.value.assignments
      .filter(assignment =>
        assignment.assigned
        && !departingStudentIds.has(assignment.studentId),
      )
      .sort((a, b) => {
        // First sort by new level (ascending)
        if (a.newLevel !== b.newLevel) {
          return a.newLevel - b.newLevel
        }
        // Then sort by student name (ascending)
        return a.studentName.localeCompare(b.studentName)
      })
  })

  const newStudents = computed(() => {
    return currentWorkflow.value?.newStudents || []
  })

  const canApplyChanges = computed(() => {
    return currentWorkflow.value
      && currentWorkflow.value.status === 'active'
      && pendingAssignments.value.length === 0
  })

  const parentOptions = computed(() => {
    if (!firebaseStore.parents) return []

    return firebaseStore.parents.map(parent => {
      const fullName = `${parent.first_name || ''} ${parent.last_name || ''}`.trim()
      return {
        displayName: fullName || parent.email,
        email: parent.email,
        value: parent,
      }
    }).sort((a, b) => a.displayName.localeCompare(b.displayName))
  })

  const departingStudents = computed(() => {
    const departing = departingStudentsData.value || []

    return departing.map(student => {
      // Find the actual student record to get parent information
      const fullStudent = firebaseStore.students?.find(s => s.id === student.studentId)
      if (!fullStudent) {
        return {
          ...student,
          parentsNeedRemoval: [],
        }
      }

      // Get parent emails and analyze removal needs
      const parentEmails = []
      if (fullStudent.parent1_email) parentEmails.push(fullStudent.parent1_email)
      if (fullStudent.parent2_email) parentEmails.push(fullStudent.parent2_email)

      const parentsNeedRemoval = parentEmails.map(email => {
        // Count how many other students have this parent email
        const otherStudentCount = firebaseStore.students?.filter(otherStudent =>
          otherStudent.id !== student.studentId
          && (otherStudent.parent1_email === email || otherStudent.parent2_email === email),
        ).length || 0

        // Check if this parent is also a parent of any new students in the workflow
        const isParentOfNewStudent = currentWorkflow.value?.newStudents?.some(newStudent => {
          const parent1Match = newStudent.parent1
            && (newStudent.parent1.email === email
              || (newStudent.parent1.isExisting && newStudent.parent1.value?.email === email))
          const parent2Match = newStudent.parent2
            && (newStudent.parent2.email === email
              || (newStudent.parent2.isExisting && newStudent.parent2.value?.email === email))
          return parent1Match || parent2Match
        }) || false

        // Find parent name from parent records
        const parentRecord = firebaseStore.parents?.find(p => p.email === email)
        let parentName = email // fallback to email
        if (parentRecord) {
          const name = `${parentRecord.first_name || ''} ${parentRecord.last_name || ''}`.trim()
          parentName = name || email
        }

        return {
          email,
          name: parentName,
          needsRemoval: otherStudentCount === 0 && !isParentOfNewStudent,
        }
      })

      return {
        ...student,
        parentsNeedRemoval,
      }
    })
  })

  const graduatingStudents = computed(() => {
    if (!currentWorkflow.value?.changes) return []

    return currentWorkflow.value.changes
      .filter(change => change.changeType === 'graduating')
      .map(change => {
        // Find the actual student record to get parent information
        const student = firebaseStore.students?.find(s => s.id === change.studentId)
        if (!student) {
          return {
            ...change,
            parentsNeedRemoval: [],
          }
        }

        // Get parent emails from the student record
        const parentEmails = []
        if (student.parent1_email) parentEmails.push(student.parent1_email)
        if (student.parent2_email) parentEmails.push(student.parent2_email)

        const parentsNeedRemoval = parentEmails.map(email => {
          // Count how many other students have this parent email
          const otherStudentCount = firebaseStore.students?.filter(otherStudent =>
            otherStudent.id !== change.studentId
            && (otherStudent.parent1_email === email || otherStudent.parent2_email === email),
          ).length || 0

          // Check if this parent is also a parent of any new students in the workflow
          const isParentOfNewStudent = currentWorkflow.value?.newStudents?.some(newStudent => {
            const parent1Match = newStudent.parent1
              && (newStudent.parent1.email === email
                || (newStudent.parent1.isExisting && newStudent.parent1.value?.email === email))
            const parent2Match = newStudent.parent2
              && (newStudent.parent2.email === email
                || (newStudent.parent2.isExisting && newStudent.parent2.value?.email === email))
            return parent1Match || parent2Match
          }) || false

          // Find parent name from parent records
          const parentRecord = firebaseStore.parents?.find(p => p.email === email)
          let parentName = email // fallback to email
          if (parentRecord) {
            const name = `${parentRecord.first_name || ''} ${parentRecord.last_name || ''}`.trim()
            parentName = name || email
          }

          return {
            email,
            name: parentName,
            needsRemoval: otherStudentCount === 0 && !isParentOfNewStudent,
          }
        })

        return {
          ...change,
          parentsNeedRemoval,
        }
      })
  })

  const availableStudentsForDeparture = computed(() => {
    if (!currentWorkflow.value?.changes) return []

    // Get students who are not already graduating (level 6) and not already marked as departing
    const departingIds = new Set(departingStudentsData.value.map(s => s.studentId))

    return currentWorkflow.value.changes
      .filter(change =>
        change.changeType !== 'graduating'
        && !departingIds.has(change.studentId),
      )
      .map(change => ({
        studentId: change.studentId,
        studentName: change.studentName,
        currentLevel: change.currentLevel,
        currentClass: change.currentClass,
        departureReason: '',
        // Add searchable fields for v-data-table filtering (accent-insensitive)
        searchText: normalizeText(`${change.studentName} ${change.currentClass} ${change.currentLevel}`),
      }))
  })

  const filteredStudentsForDeparture = computed(() => {
    if (!departingSearchQuery.value) return availableStudentsForDeparture.value

    const query = normalizeText(departingSearchQuery.value)
    return availableStudentsForDeparture.value.filter(student =>
      student.searchText.includes(query),
    )
  })

  // Helper functions
  const normalizeText = text => {
    return text
      .toLowerCase()
      .normalize('NFD') // Decompose accented characters
      .replace(/[\u0300-\u036F]/g, '') // Remove accent marks
  }

  const formatGradeLevel = level => {
    const { locale } = useI18n()
    const currentLocale = locale.value || 'en'

    if (currentLocale === 'fr') {
      switch (level) {
        case 1: { return '1ère année'
        }
        case 2: { return '2ème année'
        }
        case 3: { return '3ème année'
        }
        case 4: { return '4ème année'
        }
        case 5: { return '5ème année'
        }
        case 6: { return '6ème année'
        }
        default: { return `${level}ème année`
        }
      }
    } else {
      switch (level) {
        case 1: { return '1st grade'
        }
        case 2: { return '2nd grade'
        }
        case 3: { return '3rd grade'
        }
        case 4: { return '4th grade'
        }
        case 5: { return '5th grade'
        }
        case 6: { return '6th grade'
        }
        default: { return `${level}th grade`
        }
      }
    }
  }

  const getWorkflowStatusType = status => {
    switch (status) {
      case 'pending': { return 'warning'
      }
      case 'active': { return 'info'
      }
      case 'completed': { return 'success'
      }
      default: { return 'info'
      }
    }
  }

  const getWorkflowStatusMessage = workflow => {
    return t('admin.progressionWorkflowStatus', {
      schoolYear: workflow.schoolYear,
      phase: workflow.phase,
    })
  }

  const getFormattedClassName = classLetter => {
    if (!classLetter || !firebaseStore.classes || !firebaseStore.staff) {
      return null
    }

    const cls = firebaseStore.classes.find(c => c.classLetter === classLetter)
    if (!cls) {
      return null
    }

    // Find teacher in staff collection using teacher ID
    const teacher = firebaseStore.staff.find(s => s.id === cls.teacher)

    if (teacher && teacher.first_name && teacher.last_name) {
      return `${teacher.first_name} ${teacher.last_name} (${classLetter})`
    }

    return null
  }

  const getAvailableClasses = level => {
    if (!firebaseStore.classes) return []

    // Filter classes that typically have this level
    return firebaseStore.classes
      .filter(cls => {
        // Get students in this class to see what levels they have
        const classStudents = firebaseStore.students.filter(s => s.className === cls.classLetter)
        const levels = classStudents.map(s => Number.parseInt(s.level)).filter(l => !Number.isNaN(l))

        // For level 1, look for classes with levels 1-2
        if (level === 1) {
          return levels.some(l => l === 1 || l === 2) || levels.length === 0
        }
        // For level 3, look for classes with levels 3-4
        if (level === 3) {
          return levels.some(l => l === 3 || l === 4) || levels.length === 0
        }
        // For level 5, look for classes with levels 5-6
        if (level === 5) {
          return levels.some(l => l === 5 || l === 6) || levels.length === 0
        }

        return true
      })
      .map(cls => {
        // Find teacher in staff collection using teacher ID
        const teacher = firebaseStore.staff?.find(s => s.id === cls.teacher)
        const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : 'Teacher'

        return {
          title: `${teacherName} (${cls.classLetter})`,
          value: cls.classLetter,
        }
      })
  }

  const getAllClasses = () => {
    if (!firebaseStore.classes) return []

    return firebaseStore.classes.map(cls => {
      // Find teacher in staff collection using teacher ID
      const teacher = firebaseStore.staff?.find(s => s.id === cls.teacher)
      const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : 'Teacher'

      return {
        title: `${teacherName} (${cls.classLetter})`,
        value: cls.classLetter,
      }
    }).sort((a, b) => a.value.localeCompare(b.value))
  }

  const getTeacherName = teacherId => {
    if (!firebaseStore.staff || !teacherId) return 'Unknown Teacher'
    const teacher = firebaseStore.staff.find(s => s.id === teacherId)
    return teacher ? `${teacher.first_name} ${teacher.last_name}`.trim() : teacherId
  }

  const getClassStudents = classLetter => {
    if (!firebaseStore.students) return []
    return firebaseStore.students.filter(student => student.className === classLetter)
  }

  const getClassLevelData = classLetter => {
    const classStudents = getClassStudents(classLetter)

    // Group students by level and count them
    const levelCounts = classStudents.reduce((acc, student) => {
      const level = student.level ? String(student.level) : 'Unknown'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {})

    // Convert to array and sort by level number
    return Object.entries(levelCounts)
      .filter(([level]) => level !== 'Unknown')
      .sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
      .map(([level, count]) => ({
        level: Number.parseInt(level),
        count,
      }))
      .concat(
        levelCounts['Unknown'] ? [{ level: 'Unknown', count: levelCounts['Unknown'] }] : [],
      )
  }

  const getProjectedClassStudents = classLetter => {
    // If no workflow is active, return empty array (classes are being restructured)
    if (!currentWorkflow.value) {
      return []
    }

    const projectedStudents = []

    // Get sets of students being removed from school entirely
    const departingStudentIds = new Set(departingStudentsData.value?.map(s => s.studentId) || [])
    const graduatingStudentIds = new Set(graduatingStudents.value?.map(s => s.studentId) || [])
    const removedStudentIds = new Set([...departingStudentIds, ...graduatingStudentIds])

    // 1. ONLY ADD students who will be in this specific class after ALL changes

    // A) Students who auto-progress and STAY in their current class (no reassignment needed)
    const autoProgressionStudents = (currentWorkflow.value.changes || [])
      .filter(change =>
        change.changeType === 'level_progression'
        && !removedStudentIds.has(change.studentId),
      )

    for (const change of autoProgressionStudents) {
      const student = firebaseStore.students.find(s => s.id === change.studentId)
      if (!student) continue

      // Check if this student has an assignment (meaning they need to move classes)
      const assignment = (currentWorkflow.value.assignments || []).find(a => a.studentId === change.studentId)

      if (assignment) {
        // This student is handled in section B (assignments)
        continue
      }

      // Student progresses but stays in current class - only add if they're currently in this class
      if (student.className === classLetter) {
        projectedStudents.push({
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          level: change.newLevel, // Their NEW level after progression
          className: classLetter,
          isProgressed: true,
          isNew: false,
          wasReassigned: false,
        })
      }
    }

    // B) Students who are ASSIGNED to this class (either from other classes or progressed students needing new class)
    const studentsAssignedHere = (currentWorkflow.value.assignments || [])
      .filter(assignment =>
        assignment.assigned
        && assignment.assignedClass === classLetter
        && !removedStudentIds.has(assignment.studentId),
      )

    for (const assignment of studentsAssignedHere) {
      const student = firebaseStore.students.find(s => s.id === assignment.studentId)
      if (student) {
        projectedStudents.push({
          id: student.id,
          firstName: student.first_name,
          lastName: student.last_name,
          level: assignment.newLevel, // Their NEW level
          className: classLetter,
          isProgressed: true,
          isNew: false,
          wasReassigned: student.className !== classLetter, // True if coming from different class
        })
      }
    }

    // C) NEW students added to this class
    const newStudentsInClass = (currentWorkflow.value.newStudents || [])
      .filter(newStudent => newStudent.student.className === classLetter)

    for (const newStudent of newStudentsInClass) {
      projectedStudents.push({
        id: `new-${newStudent.id || Math.random()}`,
        firstName: newStudent.student.first_name,
        lastName: newStudent.student.last_name,
        level: 1, // New students always start at level 1
        className: classLetter,
        isProgressed: false,
        isNew: true,
        wasReassigned: false,
      })
    }

    // No "held back" students - everyone either auto-progresses, graduates, departs, or is reassigned

    return projectedStudents
  }

  const getProjectedClassLevelData = classLetter => {
    const projectedStudents = getProjectedClassStudents(classLetter)

    // Group students by level
    const levelGroups = projectedStudents.reduce((acc, student) => {
      const level = student.level ? String(student.level) : 'Unknown'
      if (!acc[level]) {
        acc[level] = []
      }
      acc[level].push(student)
      return acc
    }, {})

    // Sort students within each level by name
    for (const level of Object.keys(levelGroups)) {
      levelGroups[level].sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase()
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase()
        return nameA.localeCompare(nameB)
      })
    }

    // Convert to array and sort by level number
    return Object.entries(levelGroups)
      .filter(([level]) => level !== 'Unknown')
      .sort((a, b) => Number.parseInt(a[0]) - Number.parseInt(b[0]))
      .map(([level, students]) => ({
        level: Number.parseInt(level),
        students,
      }))
      .concat(
        levelGroups['Unknown'] ? [{ level: 'Unknown', students: levelGroups['Unknown'] }] : [],
      )
  }

  // API functions
  const startWorkflow = async () => {
    try {
      loading.value = true
      error.value = null

      const currentYear = new Date().getFullYear()
      const currentMonth = new Date().getMonth()
      const schoolYear = currentMonth >= 8
        ? `${currentYear}-${currentYear + 1}`
        : `${currentYear - 1}-${currentYear}`

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/startSchoolProgressionV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          schoolYear,
          adminEmail: authStore.userEmail,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
      }

      await loadWorkflowData()
      showStartWorkflowDialog.value = false
      confirmationText.value = ''
    } catch (error_) {
      console.error('Failed to start workflow:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
    }
  }

  const assignClass = async assignment => {
    if (!assignment.selectedClass || !currentWorkflow.value) return

    try {
      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/assignTransitionClassV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          studentId: assignment.studentId,
          assignedClass: assignment.selectedClass,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh data
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to assign class:', error_)
      error.value = error_.message
    }
  }

  const addNewStudent = async () => {
    if (!currentWorkflow.value) return

    try {
      addingStudent.value = true
      error.value = null

      // Prepare parent data based on selection
      let parent1Data, parent2Data

      parent1Data = useExistingParent1.value && selectedParent1.value ? selectedParent1.value : newParent1.value

      if (hasParent2.value) {
        parent2Data = useExistingParent2.value && selectedParent2.value ? selectedParent2.value : newParent2.value
      }

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/addNewStudentV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          student: newStudent.value,
          parent1: parent1Data,
          parent2: parent2Data || null,
          useExistingParent1: useExistingParent1.value,
          useExistingParent2: useExistingParent2.value,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Reset form
      resetAddStudentForm()
      showAddStudentDialog.value = false

      // Refresh data
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to add new student:', error_)
      error.value = error_.message
    } finally {
      addingStudent.value = false
    }
  }

  const resetAddStudentForm = () => {
    newStudent.value = { first_name: '', last_name: '', className: '' }
    newParent1.value = { first_name: '', last_name: '', email: '', phone: '' }
    newParent2.value = { first_name: '', last_name: '', email: '', phone: '' }
    hasParent2.value = false
    useExistingParent1.value = false
    useExistingParent2.value = false
    selectedParent1.value = null
    selectedParent2.value = null
  }

  // Departing students functions
  const confirmDepartingSelection = async () => {
    try {
      if (!currentWorkflow.value || selectedDepartingStudents.value.length === 0) return

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/markStudentsDepartingV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          departingStudents: selectedDepartingStudents.value,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local data
      departingStudentsData.value = [...departingStudentsData.value, ...selectedDepartingStudents.value]

      // Reset dialog
      selectedDepartingStudents.value = []
      departingSearchQuery.value = ''
      showSelectDepartingDialog.value = false

      // Refresh workflow data
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to mark students as departing:', error_)
      error.value = error_.message
    }
  }

  const cancelDepartingSelection = () => {
    selectedDepartingStudents.value = []
    departingSearchQuery.value = ''
    showSelectDepartingDialog.value = false
  }

  const removeDepartingStudent = async studentId => {
    try {
      if (!currentWorkflow.value) return

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/removeDepartingStudentV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          studentId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update local data
      departingStudentsData.value = departingStudentsData.value.filter(s => s.studentId !== studentId)

      // Refresh workflow data
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to remove departing student:', error_)
      error.value = error_.message
    }
  }

  const applyChanges = async () => {
    if (!currentWorkflow.value) return

    try {
      applyingChanges.value = true
      error.value = null

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/applyProgressionChangesV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      showApplyChangesDialog.value = false
      applyConfirmationText.value = ''

      // Refresh all data
      await loadWorkflowData()
      await firebaseStore.refreshData()
    } catch (error_) {
      console.error('Failed to apply changes:', error_)
      error.value = error_.message
    } finally {
      applyingChanges.value = false
    }
  }

  const loadWorkflowData = async () => {
    try {
      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/getProgressionStatusV2`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${await authStore.user.getIdToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      currentWorkflow.value = data.current
      workflowHistory.value = data.history || []

      // Load departing students data
      departingStudentsData.value = data.current?.departingStudents || []
    } catch (error_) {
      console.error('Failed to load workflow data:', error_)
    }
  }

  onMounted(async () => {
    await Promise.all([
      loadWorkflowData(),
      firebaseStore.loadAllData(),
    ])
  })
</script>

<style scoped>
.v-card-title {
  word-break: break-word;
}
</style>
