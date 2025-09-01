import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  enrollmentsTable, 
  organizationsTable, 
  lmsTable, 
  usersTable, 
  coursesTable 
} from '../db/schema';
import { type CreateEnrollmentInput } from '../schema';
import { createEnrollment } from '../handlers/create_enrollment';
import { eq, and } from 'drizzle-orm';

// Test data setup
const testOrg = {
  name: 'Test Organization',
  description: 'Test organization for enrollment tests'
};

const testLms = {
  name: 'Test LMS',
  description: 'Test LMS for enrollment tests'
};

const testUser = {
  name: 'Test Student',
  email: 'student@test.com',
  password_hash: 'hashedpassword123'
};

const testCourse = {
  title: 'Test Course',
  description: 'A course for enrollment testing',
  slug: 'test-course',
  status: 'published' as const
};

describe('createEnrollment', () => {
  let organizationId: number;
  let lmsId: number;
  let userId: number;
  let courseId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    const orgResult = await db.insert(organizationsTable)
      .values(testOrg)
      .returning()
      .execute();
    organizationId = orgResult[0].id;

    const lmsResult = await db.insert(lmsTable)
      .values({
        ...testLms,
        organization_id: organizationId
      })
      .returning()
      .execute();
    lmsId = lmsResult[0].id;

    const userResult = await db.insert(usersTable)
      .values({
        ...testUser,
        organization_id: organizationId
      })
      .returning()
      .execute();
    userId = userResult[0].id;

    const courseResult = await db.insert(coursesTable)
      .values({
        ...testCourse,
        lms_id: lmsId
      })
      .returning()
      .execute();
    courseId = courseResult[0].id;
  });

  afterEach(resetDB);

  it('should create an enrollment with default status', async () => {
    const input: CreateEnrollmentInput = {
      user_id: userId,
      course_id: courseId,
      status: 'enrolled'
    };

    const result = await createEnrollment(input);

    // Verify basic fields
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.course_id).toEqual(courseId);
    expect(result.status).toEqual('enrolled');
    expect(result.enrollment_date).toBeInstanceOf(Date);
    expect(result.completion_date).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an enrollment with specified status', async () => {
    const input: CreateEnrollmentInput = {
      user_id: userId,
      course_id: courseId,
      status: 'completed'
    };

    const result = await createEnrollment(input);

    expect(result.status).toEqual('completed');
    expect(result.user_id).toEqual(userId);
    expect(result.course_id).toEqual(courseId);
  });

  it('should save enrollment to database', async () => {
    const input: CreateEnrollmentInput = {
      user_id: userId,
      course_id: courseId,
      status: 'enrolled'
    };

    const result = await createEnrollment(input);

    // Query database to verify enrollment was saved
    const enrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.id, result.id))
      .execute();

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].user_id).toEqual(userId);
    expect(enrollments[0].course_id).toEqual(courseId);
    expect(enrollments[0].status).toEqual('enrolled');
    expect(enrollments[0].enrollment_date).toBeInstanceOf(Date);
    expect(enrollments[0].completion_date).toBeNull();
  });

  it('should enforce unique constraint on user_id and course_id', async () => {
    const input: CreateEnrollmentInput = {
      user_id: userId,
      course_id: courseId,
      status: 'enrolled'
    };

    // Create first enrollment
    await createEnrollment(input);

    // Attempt to create duplicate enrollment
    await expect(createEnrollment(input)).rejects.toThrow(
      /already enrolled in course/i
    );
  });

  it('should throw error when user does not exist', async () => {
    const input: CreateEnrollmentInput = {
      user_id: 99999, // Non-existent user ID
      course_id: courseId,
      status: 'enrolled'
    };

    await expect(createEnrollment(input)).rejects.toThrow(
      /User with ID 99999 does not exist/i
    );
  });

  it('should throw error when course does not exist', async () => {
    const input: CreateEnrollmentInput = {
      user_id: userId,
      course_id: 99999, // Non-existent course ID
      status: 'enrolled'
    };

    await expect(createEnrollment(input)).rejects.toThrow(
      /Course with ID 99999 does not exist/i
    );
  });

  it('should handle dropped enrollment status', async () => {
    const input: CreateEnrollmentInput = {
      user_id: userId,
      course_id: courseId,
      status: 'dropped'
    };

    const result = await createEnrollment(input);

    expect(result.status).toEqual('dropped');
    expect(result.completion_date).toBeNull();
  });

  it('should verify enrollment uniqueness with multiple users and courses', async () => {
    // Create second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        name: 'Second Student',
        email: 'student2@test.com',
        password_hash: 'hashedpassword456',
        organization_id: organizationId
      })
      .returning()
      .execute();
    const secondUserId = secondUserResult[0].id;

    // Create second course
    const secondCourseResult = await db.insert(coursesTable)
      .values({
        title: 'Second Test Course',
        slug: 'second-test-course',
        lms_id: lmsId,
        status: 'published'
      })
      .returning()
      .execute();
    const secondCourseId = secondCourseResult[0].id;

    // Should allow same user in different course
    await createEnrollment({
      user_id: userId,
      course_id: courseId,
      status: 'enrolled'
    });

    await createEnrollment({
      user_id: userId,
      course_id: secondCourseId,
      status: 'enrolled'
    });

    // Should allow different user in same course
    await createEnrollment({
      user_id: secondUserId,
      course_id: courseId,
      status: 'enrolled'
    });

    // Verify all enrollments exist
    const allEnrollments = await db.select()
      .from(enrollmentsTable)
      .execute();

    expect(allEnrollments).toHaveLength(3);
  });
});