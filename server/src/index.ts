import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createOrganizationInputSchema,
  createLmsInputSchema,
  createUserInputSchema,
  createCourseInputSchema,
  createModuleInputSchema,
  createLessonInputSchema,
  createUserOrganizationRoleInputSchema,
  createUserLmsRoleInputSchema,
  createCourseInstructorInputSchema,
  createEnrollmentInputSchema,
  updateEnrollmentInputSchema
} from './schema';

// Import handlers
import { createOrganization } from './handlers/create_organization';
import { getOrganizations } from './handlers/get_organizations';
import { createLMS } from './handlers/create_lms';
import { getLMSByOrganization } from './handlers/get_lms_by_organization';
import { createUser } from './handlers/create_user';
import { getUsersByOrganization } from './handlers/get_users_by_organization';
import { createCourse } from './handlers/create_course';
import { getCoursesByLMS } from './handlers/get_courses_by_lms';
import { createModule } from './handlers/create_module';
import { getModulesByCourse } from './handlers/get_modules_by_course';
import { createLesson } from './handlers/create_lesson';
import { getLessonsByModule } from './handlers/get_lessons_by_module';
import { createUserOrganizationRole } from './handlers/create_user_organization_role';
import { createUserLMSRole } from './handlers/create_user_lms_role';
import { createCourseInstructor } from './handlers/create_course_instructor';
import { getCourseInstructors } from './handlers/get_course_instructors';
import { createEnrollment } from './handlers/create_enrollment';
import { getEnrollmentsByUser } from './handlers/get_enrollments_by_user';
import { getEnrollmentsByCourse } from './handlers/get_enrollments_by_course';
import { updateEnrollment } from './handlers/update_enrollment';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Organization routes
  createOrganization: publicProcedure
    .input(createOrganizationInputSchema)
    .mutation(({ input }) => createOrganization(input)),
  
  getOrganizations: publicProcedure
    .query(() => getOrganizations()),

  // LMS routes
  createLMS: publicProcedure
    .input(createLmsInputSchema)
    .mutation(({ input }) => createLMS(input)),
  
  getLMSByOrganization: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(({ input }) => getLMSByOrganization(input.organizationId)),

  // User routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUsersByOrganization: publicProcedure
    .input(z.object({ organizationId: z.number() }))
    .query(({ input }) => getUsersByOrganization(input.organizationId)),

  // Course routes
  createCourse: publicProcedure
    .input(createCourseInputSchema)
    .mutation(({ input }) => createCourse(input)),
  
  getCoursesByLMS: publicProcedure
    .input(z.object({ lmsId: z.number() }))
    .query(({ input }) => getCoursesByLMS(input.lmsId)),

  // Module routes
  createModule: publicProcedure
    .input(createModuleInputSchema)
    .mutation(({ input }) => createModule(input)),
  
  getModulesByCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getModulesByCourse(input.courseId)),

  // Lesson routes
  createLesson: publicProcedure
    .input(createLessonInputSchema)
    .mutation(({ input }) => createLesson(input)),
  
  getLessonsByModule: publicProcedure
    .input(z.object({ moduleId: z.number() }))
    .query(({ input }) => getLessonsByModule(input.moduleId)),

  // Role management routes
  createUserOrganizationRole: publicProcedure
    .input(createUserOrganizationRoleInputSchema)
    .mutation(({ input }) => createUserOrganizationRole(input)),
  
  createUserLMSRole: publicProcedure
    .input(createUserLmsRoleInputSchema)
    .mutation(({ input }) => createUserLMSRole(input)),

  // Course instructor routes
  createCourseInstructor: publicProcedure
    .input(createCourseInstructorInputSchema)
    .mutation(({ input }) => createCourseInstructor(input)),
  
  getCourseInstructors: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getCourseInstructors(input.courseId)),

  // Enrollment routes
  createEnrollment: publicProcedure
    .input(createEnrollmentInputSchema)
    .mutation(({ input }) => createEnrollment(input)),
  
  getEnrollmentsByUser: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getEnrollmentsByUser(input.userId)),
  
  getEnrollmentsByCourse: publicProcedure
    .input(z.object({ courseId: z.number() }))
    .query(({ input }) => getEnrollmentsByCourse(input.courseId)),
  
  updateEnrollment: publicProcedure
    .input(updateEnrollmentInputSchema)
    .mutation(({ input }) => updateEnrollment(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();