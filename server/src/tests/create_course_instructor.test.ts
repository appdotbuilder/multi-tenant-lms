import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, usersTable, coursesTable, courseInstructorsTable } from '../db/schema';
import { type CreateCourseInstructorInput } from '../schema';
import { createCourseInstructor } from '../handlers/create_course_instructor';
import { eq } from 'drizzle-orm';

describe('createCourseInstructor', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let organizationId: number;
  let lmsId: number;
  let userId: number;
  let courseId: number;

  beforeEach(async () => {
    // Create organization
    const org = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test organization for course instructor tests'
      })
      .returning()
      .execute();
    organizationId = org[0].id;

    // Create LMS
    const lms = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Test LMS',
        description: 'Test LMS for course instructor tests'
      })
      .returning()
      .execute();
    lmsId = lms[0].id;

    // Create user
    const user = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: 'Test Instructor',
        email: 'instructor@test.com',
        password_hash: 'hashedpassword'
      })
      .returning()
      .execute();
    userId = user[0].id;

    // Create course
    const course = await db.insert(coursesTable)
      .values({
        lms_id: lmsId,
        title: 'Test Course',
        description: 'A course for testing instructor assignment',
        slug: 'test-course',
        status: 'draft'
      })
      .returning()
      .execute();
    courseId = course[0].id;
  });

  it('should create a course instructor relationship', async () => {
    const testInput: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: userId
    };

    const result = await createCourseInstructor(testInput);

    // Basic field validation
    expect(result.course_id).toEqual(courseId);
    expect(result.user_id).toEqual(userId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save course instructor to database', async () => {
    const testInput: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: userId
    };

    const result = await createCourseInstructor(testInput);

    // Query using proper drizzle syntax
    const courseInstructors = await db.select()
      .from(courseInstructorsTable)
      .where(eq(courseInstructorsTable.id, result.id))
      .execute();

    expect(courseInstructors).toHaveLength(1);
    expect(courseInstructors[0].course_id).toEqual(courseId);
    expect(courseInstructors[0].user_id).toEqual(userId);
    expect(courseInstructors[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when course does not exist', async () => {
    const testInput: CreateCourseInstructorInput = {
      course_id: 99999, // Non-existent course ID
      user_id: userId
    };

    await expect(createCourseInstructor(testInput))
      .rejects
      .toThrow(/course with id 99999 does not exist/i);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: 99999 // Non-existent user ID
    };

    await expect(createCourseInstructor(testInput))
      .rejects
      .toThrow(/user with id 99999 does not exist/i);
  });

  it('should handle duplicate course instructor assignment', async () => {
    const testInput: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: userId
    };

    // Create first assignment
    await createCourseInstructor(testInput);

    // Attempt to create duplicate assignment
    await expect(createCourseInstructor(testInput))
      .rejects
      .toThrow(); // Should fail due to unique constraint
  });

  it('should allow same user to be instructor for different courses', async () => {
    // Create another course
    const course2 = await db.insert(coursesTable)
      .values({
        lms_id: lmsId,
        title: 'Test Course 2',
        description: 'Another course for testing',
        slug: 'test-course-2',
        status: 'draft'
      })
      .returning()
      .execute();
    const course2Id = course2[0].id;

    const testInput1: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: userId
    };

    const testInput2: CreateCourseInstructorInput = {
      course_id: course2Id,
      user_id: userId
    };

    // Create assignments for both courses
    const result1 = await createCourseInstructor(testInput1);
    const result2 = await createCourseInstructor(testInput2);

    expect(result1.course_id).toEqual(courseId);
    expect(result1.user_id).toEqual(userId);
    expect(result2.course_id).toEqual(course2Id);
    expect(result2.user_id).toEqual(userId);

    // Verify both records exist in database
    const assignments = await db.select()
      .from(courseInstructorsTable)
      .where(eq(courseInstructorsTable.user_id, userId))
      .execute();

    expect(assignments).toHaveLength(2);
  });

  it('should allow different users to be instructors for same course', async () => {
    // Create another user
    const user2 = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: 'Test Instructor 2',
        email: 'instructor2@test.com',
        password_hash: 'hashedpassword2'
      })
      .returning()
      .execute();
    const user2Id = user2[0].id;

    const testInput1: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: userId
    };

    const testInput2: CreateCourseInstructorInput = {
      course_id: courseId,
      user_id: user2Id
    };

    // Create assignments for both users
    const result1 = await createCourseInstructor(testInput1);
    const result2 = await createCourseInstructor(testInput2);

    expect(result1.course_id).toEqual(courseId);
    expect(result1.user_id).toEqual(userId);
    expect(result2.course_id).toEqual(courseId);
    expect(result2.user_id).toEqual(user2Id);

    // Verify both records exist in database
    const assignments = await db.select()
      .from(courseInstructorsTable)
      .where(eq(courseInstructorsTable.course_id, courseId))
      .execute();

    expect(assignments).toHaveLength(2);
  });
});