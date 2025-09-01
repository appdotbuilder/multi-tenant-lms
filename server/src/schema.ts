import { z } from 'zod';

// Enums
export const courseStatusEnum = z.enum(['draft', 'published', 'archived']);
export const lessonTypeEnum = z.enum(['video', 'text', 'quiz', 'file']);
export const enrollmentStatusEnum = z.enum(['enrolled', 'completed', 'dropped']);
export const organizationRoleEnum = z.enum(['org_admin']);
export const lmsRoleEnum = z.enum(['lms_admin', 'lms_instructor', 'lms_student']);

// Organization schema
export const organizationSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Organization = z.infer<typeof organizationSchema>;

// LMS schema
export const lmsSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type LMS = z.infer<typeof lmsSchema>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  organization_id: z.number(),
  name: z.string(),
  email: z.string().email(),
  password_hash: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Course schema with SEO fields
export const courseSchema = z.object({
  id: z.number(),
  lms_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  slug: z.string(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  keywords: z.string().nullable(),
  thumbnail_url: z.string().nullable(),
  duration_hours: z.number().nullable(),
  status: courseStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Course = z.infer<typeof courseSchema>;

// Module schema
export const moduleSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  order: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Module = z.infer<typeof moduleSchema>;

// Lesson schema
export const lessonSchema = z.object({
  id: z.number(),
  module_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  type: lessonTypeEnum,
  order: z.number().int(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Lesson = z.infer<typeof lessonSchema>;

// User Organization Role schema
export const userOrganizationRoleSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  organization_id: z.number(),
  role: organizationRoleEnum,
  created_at: z.coerce.date()
});

export type UserOrganizationRole = z.infer<typeof userOrganizationRoleSchema>;

// User LMS Role schema
export const userLmsRoleSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  lms_id: z.number(),
  role: lmsRoleEnum,
  created_at: z.coerce.date()
});

export type UserLMSRole = z.infer<typeof userLmsRoleSchema>;

// Course Instructor schema (many-to-many relationship)
export const courseInstructorSchema = z.object({
  id: z.number(),
  course_id: z.number(),
  user_id: z.number(),
  created_at: z.coerce.date()
});

export type CourseInstructor = z.infer<typeof courseInstructorSchema>;

// Enrollment schema
export const enrollmentSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  course_id: z.number(),
  status: enrollmentStatusEnum,
  enrollment_date: z.coerce.date(),
  completion_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

// Input schemas for creating entities
export const createOrganizationInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable()
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;

export const createLmsInputSchema = z.object({
  organization_id: z.number(),
  name: z.string().min(1),
  description: z.string().nullable()
});

export type CreateLMSInput = z.infer<typeof createLmsInputSchema>;

export const createUserInputSchema = z.object({
  organization_id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createCourseInputSchema = z.object({
  lms_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  slug: z.string().min(1),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  keywords: z.string().nullable(),
  thumbnail_url: z.string().url().nullable(),
  duration_hours: z.number().positive().nullable(),
  status: courseStatusEnum
});

export type CreateCourseInput = z.infer<typeof createCourseInputSchema>;

export const createModuleInputSchema = z.object({
  course_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  order: z.number().int().nonnegative()
});

export type CreateModuleInput = z.infer<typeof createModuleInputSchema>;

export const createLessonInputSchema = z.object({
  module_id: z.number(),
  title: z.string().min(1),
  description: z.string().nullable(),
  content: z.string().nullable(),
  type: lessonTypeEnum,
  order: z.number().int().nonnegative()
});

export type CreateLessonInput = z.infer<typeof createLessonInputSchema>;

export const createUserOrganizationRoleInputSchema = z.object({
  user_id: z.number(),
  organization_id: z.number(),
  role: organizationRoleEnum
});

export type CreateUserOrganizationRoleInput = z.infer<typeof createUserOrganizationRoleInputSchema>;

export const createUserLmsRoleInputSchema = z.object({
  user_id: z.number(),
  lms_id: z.number(),
  role: lmsRoleEnum
});

export type CreateUserLMSRoleInput = z.infer<typeof createUserLmsRoleInputSchema>;

export const createCourseInstructorInputSchema = z.object({
  course_id: z.number(),
  user_id: z.number()
});

export type CreateCourseInstructorInput = z.infer<typeof createCourseInstructorInputSchema>;

export const createEnrollmentInputSchema = z.object({
  user_id: z.number(),
  course_id: z.number(),
  status: enrollmentStatusEnum.default('enrolled')
});

export type CreateEnrollmentInput = z.infer<typeof createEnrollmentInputSchema>;

// Update schemas (all fields optional except id)
export const updateOrganizationInputSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional()
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationInputSchema>;

export const updateCourseInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  slug: z.string().min(1).optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  keywords: z.string().nullable().optional(),
  thumbnail_url: z.string().url().nullable().optional(),
  duration_hours: z.number().positive().nullable().optional(),
  status: courseStatusEnum.optional()
});

export type UpdateCourseInput = z.infer<typeof updateCourseInputSchema>;

export const updateEnrollmentInputSchema = z.object({
  id: z.number(),
  status: enrollmentStatusEnum.optional(),
  completion_date: z.coerce.date().nullable().optional()
});

export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentInputSchema>;