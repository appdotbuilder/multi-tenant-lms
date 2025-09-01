import { 
  serial, 
  text, 
  pgTable, 
  timestamp, 
  numeric, 
  integer,
  pgEnum,
  foreignKey,
  unique
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const courseStatusEnum = pgEnum('course_status', ['draft', 'published', 'archived']);
export const lessonTypeEnum = pgEnum('lesson_type', ['video', 'text', 'quiz', 'file']);
export const enrollmentStatusEnum = pgEnum('enrollment_status', ['enrolled', 'completed', 'dropped']);
export const organizationRoleEnum = pgEnum('organization_role', ['org_admin']);
export const lmsRoleEnum = pgEnum('lms_role', ['lms_admin', 'lms_instructor', 'lms_student']);

// Organizations table
export const organizationsTable = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// LMS instances table
export const lmsTable = pgTable('lms', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id').notNull().references(() => organizationsTable.id),
  name: text('name').notNull(),
  description: text('description'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  organization_id: integer('organization_id').notNull().references(() => organizationsTable.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  password_hash: text('password_hash').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueEmail: unique().on(table.email, table.organization_id),
}));

// Courses table with SEO fields
export const coursesTable = pgTable('courses', {
  id: serial('id').primaryKey(),
  lms_id: integer('lms_id').notNull().references(() => lmsTable.id),
  title: text('title').notNull(),
  description: text('description'), // Nullable
  slug: text('slug').notNull(),
  meta_title: text('meta_title'), // Nullable
  meta_description: text('meta_description'), // Nullable
  keywords: text('keywords'), // Nullable
  thumbnail_url: text('thumbnail_url'), // Nullable
  duration_hours: numeric('duration_hours', { precision: 5, scale: 2 }), // Nullable
  status: courseStatusEnum('status').notNull().default('draft'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueSlugPerLms: unique().on(table.slug, table.lms_id),
}));

// Modules table
export const modulesTable = pgTable('modules', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  title: text('title').notNull(),
  description: text('description'), // Nullable
  order: integer('order').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueOrderPerCourse: unique().on(table.course_id, table.order),
}));

// Lessons table
export const lessonsTable = pgTable('lessons', {
  id: serial('id').primaryKey(),
  module_id: integer('module_id').notNull().references(() => modulesTable.id),
  title: text('title').notNull(),
  description: text('description'), // Nullable
  content: text('content'), // Nullable
  type: lessonTypeEnum('type').notNull(),
  order: integer('order').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueOrderPerModule: unique().on(table.module_id, table.order),
}));

// User organization roles table
export const userOrganizationRolesTable = pgTable('user_organization_roles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  organization_id: integer('organization_id').notNull().references(() => organizationsTable.id),
  role: organizationRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserOrgRole: unique().on(table.user_id, table.organization_id, table.role),
}));

// User LMS roles table
export const userLmsRolesTable = pgTable('user_lms_roles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  lms_id: integer('lms_id').notNull().references(() => lmsTable.id),
  role: lmsRoleEnum('role').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserLmsRole: unique().on(table.user_id, table.lms_id, table.role),
}));

// Course instructors table (many-to-many)
export const courseInstructorsTable = pgTable('course_instructors', {
  id: serial('id').primaryKey(),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  uniqueCourseInstructor: unique().on(table.course_id, table.user_id),
}));

// Enrollments table
export const enrollmentsTable = pgTable('enrollments', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  course_id: integer('course_id').notNull().references(() => coursesTable.id),
  status: enrollmentStatusEnum('status').notNull().default('enrolled'),
  enrollment_date: timestamp('enrollment_date').defaultNow().notNull(),
  completion_date: timestamp('completion_date'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueUserCourse: unique().on(table.user_id, table.course_id),
}));

// Relations
export const organizationsRelations = relations(organizationsTable, ({ many }) => ({
  lmsInstances: many(lmsTable),
  users: many(usersTable),
  userOrganizationRoles: many(userOrganizationRolesTable),
}));

export const lmsRelations = relations(lmsTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [lmsTable.organization_id],
    references: [organizationsTable.id],
  }),
  courses: many(coursesTable),
  userLmsRoles: many(userLmsRolesTable),
}));

export const usersRelations = relations(usersTable, ({ one, many }) => ({
  organization: one(organizationsTable, {
    fields: [usersTable.organization_id],
    references: [organizationsTable.id],
  }),
  userOrganizationRoles: many(userOrganizationRolesTable),
  userLmsRoles: many(userLmsRolesTable),
  courseInstructors: many(courseInstructorsTable),
  enrollments: many(enrollmentsTable),
}));

export const coursesRelations = relations(coursesTable, ({ one, many }) => ({
  lms: one(lmsTable, {
    fields: [coursesTable.lms_id],
    references: [lmsTable.id],
  }),
  modules: many(modulesTable),
  courseInstructors: many(courseInstructorsTable),
  enrollments: many(enrollmentsTable),
}));

export const modulesRelations = relations(modulesTable, ({ one, many }) => ({
  course: one(coursesTable, {
    fields: [modulesTable.course_id],
    references: [coursesTable.id],
  }),
  lessons: many(lessonsTable),
}));

export const lessonsRelations = relations(lessonsTable, ({ one }) => ({
  module: one(modulesTable, {
    fields: [lessonsTable.module_id],
    references: [modulesTable.id],
  }),
}));

export const userOrganizationRolesRelations = relations(userOrganizationRolesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userOrganizationRolesTable.user_id],
    references: [usersTable.id],
  }),
  organization: one(organizationsTable, {
    fields: [userOrganizationRolesTable.organization_id],
    references: [organizationsTable.id],
  }),
}));

export const userLmsRolesRelations = relations(userLmsRolesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [userLmsRolesTable.user_id],
    references: [usersTable.id],
  }),
  lms: one(lmsTable, {
    fields: [userLmsRolesTable.lms_id],
    references: [lmsTable.id],
  }),
}));

export const courseInstructorsRelations = relations(courseInstructorsTable, ({ one }) => ({
  course: one(coursesTable, {
    fields: [courseInstructorsTable.course_id],
    references: [coursesTable.id],
  }),
  user: one(usersTable, {
    fields: [courseInstructorsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const enrollmentsRelations = relations(enrollmentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [enrollmentsTable.user_id],
    references: [usersTable.id],
  }),
  course: one(coursesTable, {
    fields: [enrollmentsTable.course_id],
    references: [coursesTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  organizations: organizationsTable,
  lms: lmsTable,
  users: usersTable,
  courses: coursesTable,
  modules: modulesTable,
  lessons: lessonsTable,
  userOrganizationRoles: userOrganizationRolesTable,
  userLmsRoles: userLmsRolesTable,
  courseInstructors: courseInstructorsTable,
  enrollments: enrollmentsTable,
};

// TypeScript types for tables
export type Organization = typeof organizationsTable.$inferSelect;
export type NewOrganization = typeof organizationsTable.$inferInsert;

export type LMS = typeof lmsTable.$inferSelect;
export type NewLMS = typeof lmsTable.$inferInsert;

export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Course = typeof coursesTable.$inferSelect;
export type NewCourse = typeof coursesTable.$inferInsert;

export type Module = typeof modulesTable.$inferSelect;
export type NewModule = typeof modulesTable.$inferInsert;

export type Lesson = typeof lessonsTable.$inferSelect;
export type NewLesson = typeof lessonsTable.$inferInsert;

export type UserOrganizationRole = typeof userOrganizationRolesTable.$inferSelect;
export type NewUserOrganizationRole = typeof userOrganizationRolesTable.$inferInsert;

export type UserLMSRole = typeof userLmsRolesTable.$inferSelect;
export type NewUserLMSRole = typeof userLmsRolesTable.$inferInsert;

export type CourseInstructor = typeof courseInstructorsTable.$inferSelect;
export type NewCourseInstructor = typeof courseInstructorsTable.$inferInsert;

export type Enrollment = typeof enrollmentsTable.$inferSelect;
export type NewEnrollment = typeof enrollmentsTable.$inferInsert;