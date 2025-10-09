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
            md="6"
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

                <!-- Students by grade level (two-column layout) -->
                <div v-if="getProjectedClassStudents(classItem.classLetter).length > 0">
                  <template v-for="(levelPair, pairIndex) in getProjectedClassLevelPairs(classItem.classLetter)" :key="`pair-${pairIndex}`">
                    <v-row class="mb-3">
                      <v-col
                        v-for="levelData in levelPair"
                        :key="`level-${levelData.level}`"
                        cols="6"
                      >
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
                          <template v-if="levelData.students.length > 0">
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
                          </template>
                          <div v-else class="text-caption text-grey-lighten-1 font-italic">
                            {{ $t('classes.noStudentsFound') }}
                          </div>
                        </div>
                      </v-col>
                    </v-row>
                  </template>
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

    <!-- New Student Parents Section -->
    <v-card v-if="currentWorkflow" class="mb-6">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          {{ $t('admin.newStudentParents') }}
          <v-chip v-if="newStudentParents.length > 0" class="ml-2" color="success" size="small">
            {{ newStudentParents.length }} {{ $t('admin.parents') }}
          </v-chip>
        </div>
        <v-btn
          color="success"
          prepend-icon="mdi-plus"
          size="small"
          @click="addNewParentRow"
        >
          {{ $t('admin.addNewParent') }}
        </v-btn>
      </v-card-title>

      <v-card-text>
        <v-alert
          class="mb-4"
          color="info"
          density="compact"
          icon="mdi-information"
          variant="tonal"
        >
          {{ $t('admin.newStudentParentsHelp') }}
        </v-alert>

        <div v-if="newStudentParents.length === 0" class="text-center py-4">
          <p class="text-body-1 text-grey-darken-1">
            {{ $t('admin.noNewParentsAdded') }}
          </p>
        </div>

        <v-data-table
          v-else
          :headers="newParentsTableHeaders"
          hide-default-footer
          item-key="key"
          :items="newStudentParents"
          :items-per-page="-1"
          :loading="loading"
        >
          <template #item.first_name="{ item }">
            <v-text-field
              v-model="item.first_name"
              density="compact"
              hide-details
              :placeholder="$t('admin.firstName')"
              variant="outlined"
              @blur="validateAndSaveParent(item)"
              @keyup.enter="validateAndSaveParent(item)"
            />
          </template>

          <template #item.last_name="{ item }">
            <v-text-field
              v-model="item.last_name"
              density="compact"
              hide-details
              :placeholder="$t('admin.lastName')"
              variant="outlined"
              @blur="validateAndSaveParent(item)"
              @keyup.enter="validateAndSaveParent(item)"
            />
          </template>

          <template #item.phone="{ item }">
            <v-text-field
              v-model="item.phone"
              density="compact"
              hide-details
              :placeholder="$t('common.phone')"
              variant="outlined"
              @blur="validateAndSaveParent(item)"
              @keyup.enter="validateAndSaveParent(item)"
            />
          </template>

          <template #item.email="{ item }">
            <v-text-field
              v-model="item.email"
              density="compact"
              hide-details
              :placeholder="$t('common.email')"
              :rules="[v => !v || /.+@.+\..+/.test(v) || $t('validation.emailInvalid')]"
              type="email"
              variant="outlined"
              @blur="validateAndSaveParent(item)"
              @keyup.enter="validateAndSaveParent(item)"
            />
          </template>

          <template #item.actions="{ item }">
            <div class="d-flex gap-1 align-center">
              <v-icon
                v-if="item.isValid"
                color="success"
                size="small"
              >
                mdi-check-circle
              </v-icon>
              <v-icon
                v-else-if="item.hasChanges"
                color="warning"
                size="small"
              >
                mdi-alert-circle
              </v-icon>
              <v-btn
                color="error"
                icon="mdi-delete"
                size="small"
                variant="text"
                @click="removeParentRow(item.key)"
              />
            </div>
          </template>
        </v-data-table>
      </v-card-text>
    </v-card>

    <!-- Students Management Section -->
    <v-card v-if="currentWorkflow" class="mb-6">
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex align-center">
          <v-icon class="mr-2">mdi-account-school</v-icon>
          {{ $t('admin.studentsManagement') }}
          <v-chip v-if="allStudentsForTable.length > 0" class="ml-2" color="info" size="small">
            {{ allStudentsForTable.length }} {{ $t('admin.students') }}
          </v-chip>
        </div>
        <div class="d-flex gap-2">
          <v-btn
            color="primary"
            prepend-icon="mdi-plus"
            size="small"
            @click="addNewStudentRow"
          >
            {{ $t('admin.addStudent') }}
          </v-btn>
        </div>
      </v-card-title>

      <v-card-text>
        <div v-if="allStudentsForTable.length === 0" class="text-center py-4">
          <p class="text-body-1 text-grey-darken-1">
            {{ $t('admin.noStudentsFound') }}
          </p>
        </div>

        <v-data-table
          v-else
          :headers="studentsTableHeaders"
          item-key="key"
          :items="allStudentsForTable"
          :items-per-page="50"
          :loading="loading"
        >
          <template #item="{ item }">
            <tr :class="getStudentRowClass(item)">
              <td>
                <div v-if="item.isEditing" class="d-flex align-center gap-2">
                  <v-text-field
                    v-model="item.first_name"
                    density="compact"
                    hide-details
                    :placeholder="$t('admin.firstName')"
                    variant="outlined"
                  />
                  <v-text-field
                    v-model="item.last_name"
                    density="compact"
                    hide-details
                    :placeholder="$t('admin.lastName')"
                    variant="outlined"
                  />
                </div>
                <div v-else>
                  <div class="font-weight-medium">{{ item.fullName }}</div>
                  <div class="text-caption text-grey-darken-1">{{ item.statusText }}</div>
                </div>
              </td>
              <td>
                <v-select
                  v-if="item.isEditing || item.isClassEditable"
                  v-model="item.className"
                  density="compact"
                  hide-details
                  :items="getAllClassOptions()"
                  :placeholder="$t('admin.selectClass')"
                  variant="outlined"
                  @update:model-value="handleClassAssignment(item)"
                />
                <span v-else>{{ getFormattedClassName(item.className) || item.className }}</span>
              </td>
              <td>
                <v-select
                  v-if="item.isEditing"
                  v-model="item.level"
                  density="compact"
                  hide-details
                  :items="getAvailableLevelsForClass(item.className)"
                  :placeholder="$t('admin.selectLevel')"
                  variant="outlined"
                />
                <span v-else>{{ formatGradeLevel(item.level) }}</span>
              </td>
              <td>
                <v-select
                  v-if="item.isEditing"
                  v-model="item.parent1"
                  clearable
                  density="compact"
                  hide-details
                  item-title="displayName"
                  item-value="email"
                  :items="parentOptionsForSelector"
                  :placeholder="$t('admin.selectParent')"
                  variant="outlined"
                />
                <span v-else>{{ item.parent1Name || '-' }}</span>
              </td>
              <td>
                <v-select
                  v-if="item.isEditing"
                  v-model="item.parent2"
                  clearable
                  density="compact"
                  hide-details
                  item-title="displayName"
                  item-value="email"
                  :items="parentOptionsForSelector"
                  :placeholder="$t('admin.selectParent')"
                  variant="outlined"
                />
                <span v-else>{{ item.parent2Name || '-' }}</span>
              </td>
              <td>
                <div class="d-flex gap-1">
                  <v-btn
                    v-if="item.canMarkDeparting"
                    :color="item.isDeparting ? 'success' : 'warning'"
                    :icon="item.isDeparting ? 'mdi-undo' : 'mdi-account-minus'"
                    size="small"
                    variant="text"
                    @click="toggleStudentDeparting(item)"
                  />
                  <!-- New student row buttons -->
                  <template v-if="item.isNew">
                    <template v-if="item.isEditing">
                      <!-- Editing mode: Show save and cancel -->
                      <v-btn
                        color="success"
                        icon="mdi-content-save"
                        size="small"
                        variant="text"
                        @click="saveNewStudentRow(item)"
                      />
                      <v-btn
                        color="error"
                        icon="mdi-close"
                        size="small"
                        variant="text"
                        @click="cancelNewStudentRow(item)"
                      />
                    </template>
                    <template v-else>
                      <!-- View mode: Show edit and delete (removed final save) -->
                      <v-btn
                        color="primary"
                        icon="mdi-pencil"
                        size="small"
                        variant="text"
                        @click="editNewStudentRow(item)"
                      />
                      <v-btn
                        color="error"
                        icon="mdi-delete"
                        size="small"
                        variant="text"
                        @click="removeNewStudentRow(item)"
                      />
                    </template>
                  </template>
                </div>
              </td>
            </tr>
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
                  @update:model-value="newStudent.level = null"
                />
              </v-col>
              <v-col cols="6">
                <v-select
                  v-model="newStudent.level"
                  :disabled="!newStudent.className"
                  :items="getAvailableLevelsForClass(newStudent.className)"
                  :label="$t('admin.level')"
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
                    <v-list-item v-bind="props" :title="item.raw.displayName">
                      <template #subtitle>
                        <div>
                          <div>{{ item.raw.email }}</div>
                          <v-chip
                            :color="item.raw.source === 'database' ? 'primary' : 'success'"
                            size="x-small"
                            variant="tonal"
                          >
                            {{ item.raw.source === 'database' ? $t('admin.existingParent') : $t('admin.newParent') }}
                          </v-chip>
                        </div>
                      </template>
                    </v-list-item>
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
                    <v-list-item v-bind="props" :title="item.raw.displayName">
                      <template #subtitle>
                        <div>
                          <div>{{ item.raw.email }}</div>
                          <v-chip
                            :color="item.raw.source === 'database' ? 'primary' : 'success'"
                            size="x-small"
                            variant="tonal"
                          >
                            {{ item.raw.source === 'database' ? $t('admin.existingParent') : $t('admin.newParent') }}
                          </v-chip>
                        </div>
                      </template>
                    </v-list-item>
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
  import { addDoc, collection, deleteDoc, doc, getDocs, query, updateDoc } from 'firebase/firestore'
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from '@/composables/useI18n'
  import { getFunctionsBaseUrl } from '@/config/functions'
  import { ParentDTO } from '@/dto/ParentDTO'
  import { db } from '@/firebase'
  import { ParentRepository } from '@/repositories/ParentRepository'
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

  // New Student Parents Management
  const parentRepository = new ParentRepository()
  const newStudentParents = ref([])
  const parentRowCounter = ref(0)

  // Students Management
  const allStudentsForTable = ref([])
  const newStudentsRows = ref([])
  const studentRowCounter = ref(0)

  // Firestore operations for new_students subcollection
  const saveNewStudentToFirestore = async studentData => {
    if (!currentWorkflow.value?.id) return null

    try {
      const newStudentsRef = collection(db, 'workflows', currentWorkflow.value.id, 'new_students')
      const dataToSave = {
        ...studentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const docRef = await addDoc(newStudentsRef, dataToSave)
      return docRef.id
    } catch (error) {
      console.error('Failed to save new student to Firestore:', error)
      throw error
    }
  }

  const updateNewStudentInFirestore = async (docId, studentData) => {
    if (!currentWorkflow.value?.id || !docId) return

    try {
      const docRef = doc(db, 'workflows', currentWorkflow.value.id, 'new_students', docId)
      const dataToUpdate = {
        ...studentData,
        updatedAt: new Date(),
      }
      await updateDoc(docRef, dataToUpdate)
    } catch (error) {
      console.error('Failed to update new student in Firestore:', error)
      throw error
    }
  }

  const deleteNewStudentFromFirestore = async docId => {
    if (!currentWorkflow.value?.id || !docId) return

    try {
      const docRef = doc(db, 'workflows', currentWorkflow.value.id, 'new_students', docId)
      await deleteDoc(docRef)
    } catch (error) {
      console.error('Failed to delete new student from Firestore:', error)
      throw error
    }
  }

  const loadNewStudentsFromFirestore = async () => {
    if (!currentWorkflow.value?.id) return

    try {
      const newStudentsRef = collection(db, 'workflows', currentWorkflow.value.id, 'new_students')
      const querySnapshot = await getDocs(newStudentsRef)

      const loadedStudents = []
      for (const doc of querySnapshot) {
        const data = doc.data()
        // Ensure all required properties exist with defaults
        const studentData = {
          key: data.key || doc.id,
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          className: data.className || '',
          level: data.level || null,
          parent1: data.parent1 || null,
          parent2: data.parent2 || null,
          isEditing: data.isEditing || false,
          originalData: null,
          firestoreId: doc.id,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }

        // Always load temporary students - they should remain editable
        loadedStudents.push(studentData)
      }

      newStudentsRows.value = loadedStudents

      // Update counter to avoid conflicts
      if (loadedStudents.length > 0) {
        const maxCounter = Math.max(0, ...loadedStudents.map(row =>
          Number.parseInt(row.key?.split('-')[1]) || 0,
        ))
        studentRowCounter.value = maxCounter + 1
      }
    } catch (error) {
      console.error('Failed to load new students from Firestore:', error)
      // Set empty array on error to prevent crashes
      newStudentsRows.value = []
    }
  }

  const clearNewStudentsFromFirestore = async () => {
    if (!currentWorkflow.value?.id) return

    try {
      const newStudentsRef = collection(db, 'workflows', currentWorkflow.value.id, 'new_students')
      const querySnapshot = await getDocs(newStudentsRef)

      const deletePromises = []
      for (const doc of querySnapshot) {
        deletePromises.push(deleteDoc(doc.ref))
      }

      await Promise.all(deletePromises)
    } catch (error) {
      console.error('Failed to clear new students from Firestore:', error)
    }
  }

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
    level: null,
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
  const newParentsTableHeaders = [
    { title: t('admin.firstName'), key: 'first_name', sortable: false },
    { title: t('admin.lastName'), key: 'last_name', sortable: false },
    { title: t('common.phone'), key: 'phone', sortable: false },
    { title: t('common.email'), key: 'email', sortable: false },
    { title: t('admin.actions'), key: 'actions', sortable: false, width: 100 },
  ]

  const studentsTableHeaders = [
    { title: t('admin.student'), key: 'fullName', sortable: false },
    { title: t('admin.class'), key: 'className', sortable: false },
    { title: t('admin.level'), key: 'level', sortable: false },
    { title: t('admin.parent1'), key: 'parent1Name', sortable: false },
    { title: t('admin.parent2'), key: 'parent2Name', sortable: false },
    { title: t('admin.actions'), key: 'actions', sortable: false, width: 120 },
  ]
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
    // Basic workflow validation
    if (!currentWorkflow.value || currentWorkflow.value.status !== 'active') {
      return false
    }

    // Ensure all manual assignments are completed
    if (pendingAssignments.value.length > 0) {
      return false
    }

    // Validate that we have both workflow changes and Firebase data loaded
    if (!currentWorkflow.value.changes || !firebaseStore.studentsDTO) {
      return false
    }

    // Additional validation: check that all assigned students exist in Firebase data
    const assignedStudentIds = (currentWorkflow.value.assignments || [])
      .filter(assignment => assignment.assigned)
      .map(assignment => assignment.studentId)

    const missingStudents = assignedStudentIds.filter(studentId =>
      !firebaseStore.studentsDTO.some(s => s.id === studentId),
    )

    if (missingStudents.length > 0) {
      console.warn('Cannot apply changes: some assigned students not found in Firebase data:', missingStudents)
      return false
    }

    return true
  })

  const parentOptions = computed(() => {
    const options = []

    // Add existing parents from database
    if (firebaseStore.parentsDTO) {
      const existingParents = firebaseStore.parentsDTO.map(parent => {
        const fullName = `${parent.first_name || ''} ${parent.last_name || ''}`.trim()
        return {
          displayName: fullName || parent.email,
          email: parent.email,
          value: parent,
          isExisting: true,
          source: 'database',
        }
      })
      options.push(...existingParents)
    }

    // Add parents from previously added new students in current workflow
    if (currentWorkflow.value?.newStudents) {
      const newStudentParents = []

      for (const newStudent of currentWorkflow.value.newStudents) {
        // Add parent1 if it's a new parent (not existing)
        if (newStudent.parent1 && !newStudent.parent1.isExisting && newStudent.parent1.email) {
          const fullName = `${newStudent.parent1.first_name || ''} ${newStudent.parent1.last_name || ''}`.trim()
          newStudentParents.push({
            displayName: fullName || newStudent.parent1.email,
            email: newStudent.parent1.email,
            value: newStudent.parent1,
            isExisting: false,
            source: 'new_student',
          })
        }

        // Add parent2 if it exists and is a new parent (not existing)
        if (newStudent.parent2 && !newStudent.parent2.isExisting && newStudent.parent2.email) {
          const fullName = `${newStudent.parent2.first_name || ''} ${newStudent.parent2.last_name || ''}`.trim()
          newStudentParents.push({
            displayName: fullName || newStudent.parent2.email,
            email: newStudent.parent2.email,
            value: newStudent.parent2,
            isExisting: false,
            source: 'new_student',
          })
        }
      }

      // Remove duplicates based on email
      const uniqueNewParents = newStudentParents.filter((parent, index, self) =>
        index === self.findIndex(p => p.email === parent.email),
      )

      options.push(...uniqueNewParents)
    }

    return options.sort((a, b) => a.displayName.localeCompare(b.displayName))
  })

  const departingStudents = computed(() => {
    const departing = departingStudentsData.value || []

    return departing.map(student => {
      // Find the actual student record to get parent information
      const fullStudent = firebaseStore.studentsDTO?.find(s => s.id === student.studentId)
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
        // Count how many other students have this parent email (excluding those who are also leaving)
        const allLeavingStudentIds = new Set([
          ...departingStudentsData.value.map(s => s.studentId),
          ...(graduatingStudents.value || []).map(s => s.studentId),
        ])

        const remainingStudents = firebaseStore.studentsDTO?.filter(otherStudent =>
          otherStudent.id !== student.studentId
          && !allLeavingStudentIds.has(otherStudent.id)
          && (otherStudent.parent1_email === email || otherStudent.parent2_email === email),
        ) || []

        const otherStudentCount = remainingStudents.length

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
        const parentRecord = firebaseStore.parentsDTO?.find(p => p.email === email)
        let parentName = email // fallback to email
        if (parentRecord) {
          const name = `${parentRecord.first_name || ''} ${parentRecord.last_name || ''}`.trim()
          parentName = name || email
        }

        // Get names of remaining children for display
        const remainingChildrenNames = remainingStudents.map(s =>
          `${s.first_name || ''} ${s.last_name || ''}`.trim(),
        ).filter(name => name.length > 0)

        return {
          email,
          name: parentName,
          needsRemoval: otherStudentCount === 0 && !isParentOfNewStudent,
          remainingChildren: remainingChildrenNames,
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
        const student = firebaseStore.studentsDTO?.find(s => s.id === change.studentId)
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
          // Count how many other students have this parent email (excluding those who are also leaving)
          const allLeavingStudentIds = new Set([
            ...departingStudentsData.value.map(s => s.studentId),
            ...(graduatingStudents.value || []).map(s => s.studentId),
          ])

          const remainingStudents = firebaseStore.studentsDTO?.filter(otherStudent =>
            otherStudent.id !== change.studentId
            && !allLeavingStudentIds.has(otherStudent.id)
            && (otherStudent.parent1_email === email || otherStudent.parent2_email === email),
          ) || []

          const otherStudentCount = remainingStudents.length

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
          const parentRecord = firebaseStore.parentsDTO?.find(p => p.email === email)
          let parentName = email // fallback to email
          if (parentRecord) {
            const name = `${parentRecord.first_name || ''} ${parentRecord.last_name || ''}`.trim()
            parentName = name || email
          }

          // Get names of remaining children for display
          const remainingChildrenNames = remainingStudents.map(s =>
            `${s.first_name || ''} ${s.last_name || ''}`.trim(),
          ).filter(name => name.length > 0)

          return {
            email,
            name: parentName,
            needsRemoval: otherStudentCount === 0 && !isParentOfNewStudent,
            remainingChildren: remainingChildrenNames,
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

  // New Student Parent Management Functions
  const createNewParentRow = () => {
    parentRowCounter.value++
    return {
      key: `new-parent-${parentRowCounter.value}`,
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      hasChanges: false,
      isValid: false,
    }
  }

  const addNewParentRow = () => {
    const newRow = createNewParentRow()
    newStudentParents.value.push(newRow)
  }

  const removeParentRow = key => {
    const index = newStudentParents.value.findIndex(p => p.key === key)
    if (index !== -1) {
      newStudentParents.value.splice(index, 1)
      // Update students table to refresh parent options
      buildAllStudentsForTable()
    }
  }

  const validateAndSaveParent = parent => {
    // Update validation and change tracking
    const wasValid = parent.isValid
    parent.isValid = parent.first_name.trim() && parent.last_name.trim() && parent.email.trim() && parent.email.includes('@')
    parent.hasChanges = parent.first_name.trim() || parent.last_name.trim() || parent.phone.trim() || parent.email.trim()

    // If validation state changed, update students table
    if (wasValid !== parent.isValid) {
      buildAllStudentsForTable()
    }
  }

  const saveParent = async parent => {
    // This function is not needed in the new approach
    // Parents are saved automatically when creating new students
    // This is just a placeholder to prevent errors
    console.log('Parent save called, but parents are now saved with students')
  }

  // Students Management Functions
  const parentOptionsForSelector = computed(() => {
    const options = []

    // Add existing parents from database
    if (firebaseStore.parentsDTO) {
      options.push(...firebaseStore.parentsDTO.map(parent => ({
        displayName: parent.fullName || parent.email,
        email: parent.email,
        isExisting: true,
      })))
    }

    // Add new parents from the new student parents table (valid ones only)
    const newParentsFromTable = newStudentParents.value
      .filter(p => p.isValid && p.email && p.email.includes('@'))
      .map(p => ({
        displayName: `${p.first_name} ${p.last_name}`.trim() || p.email,
        email: p.email,
        isExisting: false,
      }))

    options.push(...newParentsFromTable)

    return options.sort((a, b) => a.displayName.localeCompare(b.displayName))
  })

  const getAllClassOptions = () => {
    if (!firebaseStore.classes) return []

    return firebaseStore.classes.map(cls => {
      const teacher = firebaseStore.staffDTO?.find(s => s.id === cls.teacher)
      const teacherName = teacher ? teacher.fullName : 'Teacher'
      return {
        title: `${teacherName} (${cls.classCode})`,
        value: cls.classLetter,
      }
    }).sort((a, b) => a.value.localeCompare(b.value))
  }

  const buildAllStudentsForTable = () => {
    const students = []

    if (!currentWorkflow.value) {
      allStudentsForTable.value = students
      return
    }

    // Process workflow changes to create unified student list
    const processedStudentIds = new Set()

    // 1. Add students from workflow changes (existing students)
    if (currentWorkflow.value.changes) {
      for (const change of currentWorkflow.value.changes) {
        if (processedStudentIds.has(change.studentId)) continue
        processedStudentIds.add(change.studentId)

        const student = firebaseStore.studentsDTO?.find(s => s.id === change.studentId)
        if (!student) continue

        // Check if student is departing
        const isDeparting = departingStudentsData.value.some(d => d.studentId === change.studentId)

        // Check if student has a pending assignment (needs class selection)
        const pendingAssignment = currentWorkflow.value.assignments?.find(a =>
          a.studentId === change.studentId && !a.assigned,
        )

        // Check if student has a completed assignment (class already assigned)
        const completedAssignment = currentWorkflow.value.assignments?.find(a =>
          a.studentId === change.studentId && a.assigned,
        )

        // Determine parent names
        const parent1Name = getParentNameByEmail(student.parent1_email)
        const parent2Name = getParentNameByEmail(student.parent2_email)

        const studentRow = {
          key: `existing-${change.studentId}`,
          id: change.studentId,
          fullName: student.fullName,
          first_name: student.first_name,
          last_name: student.last_name,
          className: pendingAssignment ? (pendingAssignment.selectedClass || '') : (completedAssignment ? completedAssignment.assignedClass : student.className),
          level: change.changeType === 'graduating' ? null : (student.level ? student.level + 1 : null),
          levelSortValue: change.changeType === 'graduating' ? 7 : (student.level ? student.level + 1 : 0),
          parent1: student.parent1_email,
          parent2: student.parent2_email,
          parent1Name,
          parent2Name,
          changeType: change.changeType,
          statusText: getStudentStatusText(change, isDeparting),
          isDeparting,
          isNew: false,
          isEditable: false,
          isClassEditable: !!pendingAssignment, // Allow class editing if assignment pending
          isLevelEditable: false, // Level is auto-set based on class
          isParentsEditable: false,
          canMarkDeparting: !isDeparting && change.changeType !== 'graduating',
          pendingAssignment, // Store for later use
        }

        students.push(studentRow)
      }
    }

    // 2. Add new students from workflow (but skip if they exist as editable temporary students)
    if (currentWorkflow.value.newStudents) {
      for (const newStudent of currentWorkflow.value.newStudents) {
        // Handle both possible data structures with null checks
        const studentData = newStudent.student || newStudent

        // Skip if this student exists in temporary editable rows (prioritize editable version)
        const existsInTempRows = newStudentsRows.value.some(tempRow => {
          return tempRow?.first_name === studentData?.first_name
            && tempRow?.last_name === studentData?.last_name
            && tempRow?.className === studentData?.className
        })

        if (existsInTempRows) {
          continue // Skip this permanent student, use the editable version instead
        }

        const parent1Name = getParentNameFromNewStudentParent(newStudent.parent1)
        const parent2Name = getParentNameFromNewStudentParent(newStudent.parent2)

        const studentRow = {
          key: `workflow-new-${newStudent.id}`,
          id: newStudent.id,
          fullName: `${studentData?.first_name || ''} ${studentData?.last_name || ''}`.trim() || 'New Student',
          first_name: studentData?.first_name || '',
          last_name: studentData?.last_name || '',
          className: studentData?.className || '',
          level: studentData?.level || null,
          levelSortValue: studentData?.level || 0,
          parent1: newStudent.parent1?.email || newStudent.parent1?.value?.email || null,
          parent2: newStudent.parent2?.email || newStudent.parent2?.value?.email || null,
          parent1Name,
          parent2Name,
          changeType: 'new',
          statusText: 'New Student',
          isDeparting: false,
          isNew: false, // These are already saved to workflow
          isEditable: false,
          isClassEditable: false,
          isLevelEditable: false,
          isParentsEditable: false,
          canMarkDeparting: false,
        }

        students.push(studentRow)
      }
    }

    // 3. Add new student rows from table (not yet saved to workflow)
    for (const newRow of newStudentsRows.value) {
      // Add null checks for all properties
      const firstName = newRow?.first_name || ''
      const lastName = newRow?.last_name || ''
      const parent1Name = getParentNameByEmail(newRow?.parent1)
      const parent2Name = getParentNameByEmail(newRow?.parent2)

      const studentRow = {
        key: newRow?.key,
        id: null,
        fullName: `${firstName} ${lastName}`.trim() || 'New Student',
        first_name: firstName,
        last_name: lastName,
        className: newRow?.className || '',
        level: newRow?.level || null,
        levelSortValue: newRow?.level || 0, // New rows without level should be at the very top
        parent1: newRow?.parent1 || null,
        parent2: newRow?.parent2 || null,
        parent1Name,
        parent2Name,
        changeType: 'new',
        statusText: 'New Student (Unsaved)',
        isDeparting: false,
        isNew: true,
        isEditing: newRow?.isEditing || false,
        isEditable: newRow?.isEditing || false,
        isClassEditable: newRow?.isEditing || false,
        isLevelEditable: newRow?.isEditing || false,
        isParentsEditable: newRow?.isEditing || false,
        canMarkDeparting: false,
        firestoreId: newRow?.firestoreId, // Include the Firestore document ID
      }

      students.push(studentRow)
    }

    // Sort students by level, then by name for consistent default order
    allStudentsForTable.value = students.sort((a, b) => {
      if (a.levelSortValue !== b.levelSortValue) {
        return a.levelSortValue - b.levelSortValue
      }
      return a.fullName.localeCompare(b.fullName)
    })
  }

  const getParentNameByEmail = email => {
    if (!email) return null

    // Check in existing parents from database
    const parent = firebaseStore.parentsDTO?.find(p => p.email === email)
    if (parent) return parent.fullName

    // Check in new student parents table
    const newParent = newStudentParents.value.find(p => p.email === email)
    if (newParent) {
      return `${newParent.first_name} ${newParent.last_name}`.trim() || email
    }

    return email
  }

  const getParentNameFromNewStudentParent = parent => {
    if (!parent) return null

    if (parent.isExisting && parent.value) {
      return parent.value.fullName || parent.value.email
    } else if (parent.first_name || parent.last_name) {
      return `${parent.first_name || ''} ${parent.last_name || ''}`.trim()
    } else if (parent.email) {
      return parent.email
    }

    return null
  }

  const getStudentStatusText = (change, isDeparting) => {
    if (isDeparting) return 'Departing'

    switch (change.changeType) {
      case 'auto_progression': { return 'Auto Progression'
      }
      case 'graduating': { return 'Graduating'
      }
      case 'new': { return 'New Student'
      }
      default: { return 'Manual Progression'
      }
    }
  }

  const getStudentRowClass = student => {
    if (student.isDeparting) return 'student-row-departing'
    if (student.isNew) return 'student-row-new'

    switch (student.changeType) {
      case 'auto_progression': { return 'student-row-auto-progression'
      }
      case 'graduating': { return 'student-row-graduating'
      }
      case 'new': { return 'student-row-new'
      }
      default: { return 'student-row-manual-progression'
      }
    }
  }

  const addNewStudentRow = async () => {
    try {
      studentRowCounter.value++
      const newRow = {
        key: `new-student-${studentRowCounter.value}`,
        first_name: '',
        last_name: '',
        className: '',
        level: null,
        parent1: null,
        parent2: null,
        isEditing: true,
        originalData: null, // No original data since it's new
      }

      // Save immediately to Firestore
      const firestoreId = await saveNewStudentToFirestore(newRow)
      newRow.firestoreId = firestoreId

      newStudentsRows.value.push(newRow)
      buildAllStudentsForTable()
    } catch (error) {
      console.error('Failed to add new student row:', error)
      // Show error to user if needed
      if (error.value !== undefined) {
        error.value = error.message
      }
    }
  }

  const removeNewStudentRow = async studentRow => {
    const index = newStudentsRows.value.findIndex(s => s.key === studentRow.key)
    if (index !== -1) {
      try {
        // Delete from Firestore first
        if (studentRow.firestoreId) {
          await deleteNewStudentFromFirestore(studentRow.firestoreId)
        }

        // Remove from local state
        newStudentsRows.value.splice(index, 1)
        buildAllStudentsForTable()
      } catch (error) {
        console.error('Failed to remove new student row:', error)
        alert('Failed to delete student. Please try again.')
      }
    }
  }

  const editNewStudentRow = studentRow => {
    const index = newStudentsRows.value.findIndex(s => s.key === studentRow.key)
    if (index !== -1) {
      // Store original data for cancel functionality
      newStudentsRows.value[index].originalData = { ...newStudentsRows.value[index] }
      newStudentsRows.value[index].isEditing = true
      buildAllStudentsForTable()
    }
  }

  const saveNewStudentRow = async studentRow => {
    const index = newStudentsRows.value.findIndex(s => s.key === studentRow.key)
    if (index !== -1) {
      // Validate required fields
      if (!studentRow.first_name.trim() || !studentRow.last_name.trim()) {
        alert('First name and last name are required')
        return
      }

      try {
        // Update the data in newStudentsRows
        const updatedData = {
          ...newStudentsRows.value[index],
          first_name: studentRow.first_name,
          last_name: studentRow.last_name,
          className: studentRow.className,
          level: studentRow.level,
          parent1: studentRow.parent1,
          parent2: studentRow.parent2,
          isEditing: false,
          originalData: null,
        }

        // Update in Firestore
        if (studentRow.firestoreId) {
          await updateNewStudentInFirestore(studentRow.firestoreId, updatedData)
        } else {
          console.warn('No firestoreId found for student:', studentRow)
        }

        newStudentsRows.value[index] = updatedData
        buildAllStudentsForTable()
      } catch (error) {
        console.error('Failed to save new student row:', error)
        alert('Failed to save student data. Please try again.')
      }
    }
  }

  const cancelNewStudentRow = studentRow => {
    const index = newStudentsRows.value.findIndex(s => s.key === studentRow.key)
    if (index !== -1) {
      const row = newStudentsRows.value[index]
      if (row.originalData) {
        // Restore original data
        for (const key of Object.keys(row.originalData)) {
          if (key !== 'originalData' && key !== 'isEditing') {
            row[key] = row.originalData[key]
          }
        }
      }
      row.isEditing = false
      row.originalData = null
      buildAllStudentsForTable()
    }
  }

  const saveNewStudent = async studentRow => {
    if (!currentWorkflow.value) return

    try {
      loading.value = true

      // Validate required fields
      if (!studentRow.first_name || !studentRow.last_name || !studentRow.className) {
        throw new Error('First name, last name, and class are required')
      }

      // Prepare student data
      const studentData = {
        first_name: studentRow.first_name,
        last_name: studentRow.last_name,
        className: studentRow.className,
        level: studentRow.level,
      }

      // Prepare parent data
      let parent1Data = null
      let parent2Data = null
      let useExistingParent1 = false
      let useExistingParent2 = false

      if (studentRow.parent1) {
        // Check if it's an existing parent
        const existingParent1 = firebaseStore.parentsDTO?.find(p => p.email === studentRow.parent1)
        if (existingParent1) {
          parent1Data = existingParent1
          useExistingParent1 = true
        } else {
          // Check if it's a new parent from the new student parents table
          const newParent1 = newStudentParents.value.find(p => p.email === studentRow.parent1)
          if (newParent1) {
            parent1Data = {
              first_name: newParent1.first_name,
              last_name: newParent1.last_name,
              phone: newParent1.phone,
              email: newParent1.email,
            }
            useExistingParent1 = false
          }
        }
      }

      if (studentRow.parent2) {
        // Check if it's an existing parent
        const existingParent2 = firebaseStore.parentsDTO?.find(p => p.email === studentRow.parent2)
        if (existingParent2) {
          parent2Data = existingParent2
          useExistingParent2 = true
        } else {
          // Check if it's a new parent from the new student parents table
          const newParent2 = newStudentParents.value.find(p => p.email === studentRow.parent2)
          if (newParent2) {
            parent2Data = {
              first_name: newParent2.first_name,
              last_name: newParent2.last_name,
              phone: newParent2.phone,
              email: newParent2.email,
            }
            useExistingParent2 = false
          }
        }
      }

      // Call the existing addNewStudent API
      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/addNewStudentV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          student: studentData,
          parent1: parent1Data,
          parent2: parent2Data,
          useExistingParent1,
          useExistingParent2,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Remove from new students rows and refresh data
      removeNewStudentRow(studentRow)
      await loadWorkflowData()

      // Refresh Firebase data if new parents were created
      if (!useExistingParent1 || !useExistingParent2) {
        await firebaseStore.loadParentsDTO()
      }
    } catch (error_) {
      console.error('Failed to save new student:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
    }
  }

  const toggleStudentDeparting = async studentRow => {
    if (!currentWorkflow.value || !studentRow.id) return

    try {
      loading.value = true

      if (studentRow.isDeparting) {
        // Remove from departing (undo)
        const baseUrl = getFunctionsBaseUrl()
        const response = await fetch(`${baseUrl}/removeDepartingStudentV2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
          },
          body: JSON.stringify({
            workflowId: currentWorkflow.value.id,
            studentId: studentRow.id,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      } else {
        // Mark as departing
        const departingStudent = {
          studentId: studentRow.id,
          studentName: studentRow.fullName,
          currentClass: studentRow.className,
          currentLevel: studentRow.level,
          departureReason: '', // Could be made editable in the future
        }

        const baseUrl = getFunctionsBaseUrl()
        const response = await fetch(`${baseUrl}/markStudentsDepartingV2`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
          },
          body: JSON.stringify({
            workflowId: currentWorkflow.value.id,
            departingStudents: [departingStudent],
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
      }

      // Refresh workflow data to update the table
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to toggle student departing status:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
    }
  }

  const handleClassAssignment = async studentRow => {
    if (!currentWorkflow.value || !studentRow.pendingAssignment || !studentRow.className) return

    try {
      loading.value = true

      const baseUrl = getFunctionsBaseUrl()
      const response = await fetch(`${baseUrl}/assignTransitionClassV2`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await authStore.user.getIdToken()}`,
        },
        body: JSON.stringify({
          workflowId: currentWorkflow.value.id,
          studentId: studentRow.id,
          assignedClass: studentRow.className,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh workflow data to update assignments
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to assign class:', error_)
      error.value = error_.message
    } finally {
      loading.value = false
    }
  }

  const formatGradeLevel = level => {
    if (level === null || level === undefined) {
      return '' // Return blank for graduating students
    }

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
    if (!classLetter || !firebaseStore.classes || !firebaseStore.staffDTO) {
      return null
    }

    const cls = firebaseStore.classes.find(c => c.classLetter === classLetter)
    if (!cls) {
      return null
    }

    // Find teacher in staff collection using teacher ID
    const teacher = firebaseStore.staffDTO.find(s => s.id === cls.teacher)

    if (teacher && teacher.fullName) {
      return `${teacher.fullName} (${classLetter})`
    }

    return null
  }

  const getAvailableClasses = level => {
    if (!firebaseStore.classes) return []

    // Filter classes that typically have this level
    return firebaseStore.classes
      .filter(cls => {
        // Get students in this class to see what levels they have
        const classStudents = firebaseStore.studentsDTO.filter(s => s.className === cls.classLetter)
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
        const teacher = firebaseStore.staffDTO?.find(s => s.id === cls.teacher)
        const teacherName = teacher ? teacher.fullName : 'Teacher'

        return {
          title: `${teacherName} (${cls.classCode})`,
          value: cls.classLetter,
        }
      })
  }

  const getAllClasses = () => {
    if (!firebaseStore.classes) return []

    return firebaseStore.classes.map(cls => {
      // Find teacher in staff collection using teacher ID
      const teacher = firebaseStore.staffDTO?.find(s => s.id === cls.teacher)
      const teacherName = teacher ? teacher.fullName : 'Teacher'

      return {
        title: `${teacherName} (${cls.classCode})`,
        value: cls.classLetter,
      }
    }).sort((a, b) => a.value.localeCompare(b.value))
  }

  const getTeacherName = teacherId => {
    if (!firebaseStore.staffDTO || !teacherId) return 'Unknown Teacher'
    const teacher = firebaseStore.staffDTO.find(s => s.id === teacherId)
    return teacher ? teacher.fullName : 'Unknown Teacher'
  }

  const getClassStudents = classLetter => {
    if (!firebaseStore.studentsDTO) return []
    return firebaseStore.studentsDTO.filter(student => student.className === classLetter)
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
        change.changeType === 'auto_progression'
        && !removedStudentIds.has(change.studentId),
      )

    for (const change of autoProgressionStudents) {
      const student = firebaseStore.studentsDTO.find(s => s.id === change.studentId)
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
      const student = firebaseStore.studentsDTO.find(s => s.id === assignment.studentId)
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
      .filter(newStudent => {
        // Handle both possible data structures with null checks
        const studentData = newStudent.student || newStudent
        return studentData?.className === classLetter
      })

    for (const newStudent of newStudentsInClass) {
      const studentData = newStudent.student || newStudent
      projectedStudents.push({
        id: `new-${newStudent.id || Math.random()}`,
        firstName: studentData?.first_name || '',
        lastName: studentData?.last_name || '',
        level: studentData?.level || 1, // Use selected level or default to 1
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

  const getAvailableLevelsForClass = className => {
    // Get the available grade levels for a specific class
    if (!firebaseStore.classes || !className) return []

    // Find the class object
    const classItem = firebaseStore.classes.find(cls => cls.classLetter === className)
    if (!classItem) return []

    // Get current students in this class to determine the grade level range
    const classStudents = firebaseStore.studentsDTO.filter(s => s.className === className)
    const levels = classStudents.map(s => Number.parseInt(s.level)).filter(l => !Number.isNaN(l))

    if (levels.length === 0) {
      // No existing students, return default levels 1-2
      return [
        { title: formatGradeLevel(1), value: 1 },
        { title: formatGradeLevel(2), value: 2 },
      ]
    }

    // Determine the level range for this class based on existing students
    const minLevel = Math.min(...levels)

    // Classes are organized as 1-2, 3-4, 5-6
    if (minLevel <= 2) {
      return [
        { title: formatGradeLevel(1), value: 1 },
        { title: formatGradeLevel(2), value: 2 },
      ]
    } else if (minLevel <= 4) {
      return [
        { title: formatGradeLevel(3), value: 3 },
        { title: formatGradeLevel(4), value: 4 },
      ]
    } else {
      return [
        { title: formatGradeLevel(5), value: 5 },
        { title: formatGradeLevel(6), value: 6 },
      ]
    }
  }

  const getNewStudentGradeLevel = className => {
    // Determine the appropriate starting grade level for a new student based on their assigned class
    const availableLevels = getAvailableLevelsForClass(className)
    return availableLevels.length > 0 ? availableLevels[0].value : 1
  }

  const getProjectedClassLevelPairs = classLetter => {
    const levelData = getProjectedClassLevelData(classLetter)

    // Determine which 2 consecutive levels this class should have
    // Based on existing students in the current class
    const currentClassStudents = getClassStudents(classLetter)
    const currentLevels = [...new Set(currentClassStudents.map(s => Number(s.level)).filter(l => !Number.isNaN(l)))]
      .sort((a, b) => a - b)

    let expectedLevels = []
    if (currentLevels.length > 0) {
      // Use the range of existing levels, ensuring we have exactly 2 consecutive levels
      const minLevel = currentLevels[0]
      const maxLevel = currentLevels.at(-1)

      if (minLevel <= 2) {
        expectedLevels = [1, 2] // Levels 1-2 class
      } else if (minLevel <= 4) {
        expectedLevels = [3, 4] // Levels 3-4 class
      } else {
        expectedLevels = [5, 6] // Levels 5-6 class
      }
    } else {
      // Default to levels 1-2 if no current students
      expectedLevels = [1, 2]
    }

    // Create the 2 expected levels, with empty arrays if they don't exist
    const classLevels = expectedLevels.map(level => {
      const existingLevel = levelData.find(ld => ld.level === level)
      return existingLevel || {
        level,
        students: [],
      }
    })

    // Add any Unknown level if it exists
    const unknownLevel = levelData.find(ld => ld.level === 'Unknown')
    if (unknownLevel) {
      classLevels.push(unknownLevel)
    }

    // Return as a single pair (2 columns)
    const pairs = []
    if (classLevels.length >= 2) {
      pairs.push([classLevels[0], classLevels[1]])
      // If there's an Unknown level, add it in a second row
      if (classLevels.length > 2) {
        pairs.push([classLevels[2]])
      }
    } else if (classLevels.length === 1) {
      pairs.push([classLevels[0]])
    }

    return pairs
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

      // Only workflow data changed, no need to refresh Firebase data
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

      // Only workflow data changed, no need to refresh Firebase data
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

      // Only workflow data changed, no need to refresh Firebase data
      await loadWorkflowData()
    } catch (error_) {
      console.error('Failed to add new student:', error_)
      error.value = error_.message
    } finally {
      addingStudent.value = false
    }
  }

  const resetAddStudentForm = () => {
    newStudent.value = { first_name: '', last_name: '', className: '', level: null }
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

      // Reset dialog
      selectedDepartingStudents.value = []
      departingSearchQuery.value = ''
      showSelectDepartingDialog.value = false

      // Refresh workflow data to get updated departing students and modified changes
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

      // Refresh workflow data to get updated departing students and restored changes
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

      // Clear temporary new student rows since changes have been applied
      await clearNewStudentsFromFirestore()
      newStudentsRows.value = []

      // Refresh all data - Firebase data first, then workflow data
      await firebaseStore.refreshData()
      await loadWorkflowData()
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

      // Load new students from Firestore subcollection
      await loadNewStudentsFromFirestore()

      // Rebuild students table when workflow data changes
      buildAllStudentsForTable()
    } catch (error_) {
      console.error('Failed to load workflow data:', error_)
    }
  }

  onMounted(async () => {
    // Load Firebase data first to ensure computed properties have current student/parent data
    await firebaseStore.loadAllData()
    // Load students DTO data needed for class filtering
    await firebaseStore.loadStudentsDTO()
    // Load parents DTO data needed for parent selection
    await firebaseStore.loadParentsDTO()
    // Load staff DTO data needed for teacher name display
    await firebaseStore.loadStaffDTO()
    // Then load workflow data which depends on Firebase data for calculations
    await loadWorkflowData()
    // Build students table after workflow data is loaded
    buildAllStudentsForTable()
  })
</script>

<style scoped>
.v-card-title {
  word-break: break-word;
}

/* Student row color coding */
.student-row-auto-progression {
  background-color: rgba(76, 175, 80, 0.1);
}

.student-row-manual-progression {
  background-color: rgba(255, 193, 7, 0.1);
}

.student-row-departing {
  background-color: rgba(244, 67, 54, 0.1);
}

.student-row-new {
  background-color: rgba(33, 150, 243, 0.1);
}

.student-row-graduating {
  background-color: rgba(156, 39, 176, 0.1);
}
</style>
