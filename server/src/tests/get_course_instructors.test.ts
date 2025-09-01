import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, usersTable, coursesTable, courseInstructorsTable } from '../db/schema';
import { getCourseInstructors } from '../handlers/get_course_instructors';
import { eq } from 'drizzle-orm';

describe('getCourseInstructors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when course has no instructors', async () => {
    // Create test data
    const org = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organization'
      })
      .returning()
      .execute();

    const lms = await db.insert(lmsTable)
      .values({
        organization_id: org[0].id,
        name: 'Test LMS',
        description: 'Test LMS'
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        lms_id: lms[0].id,
        title: 'Test Course',
        description: 'Test course description',
        slug: 'test-course',
        status: 'published'
      })
      .returning()
      .execute();

    const result = await getCourseInstructors(course[0].id);

    expect(result).toEqual([]);
  });

  it('should return course instructors for a specific course', async () => {
    // Create test data
    const org = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organization'
      })
      .returning()
      .execute();

    const lms = await db.insert(lmsTable)
      .values({
        organization_id: org[0].id,
        name: 'Test LMS',
        description: 'Test LMS'
      })
      .returning()
      .execute();

    const users = await db.insert(usersTable)
      .values([
        {
          organization_id: org[0].id,
          name: 'Instructor One',
          email: 'instructor1@test.com',
          password_hash: 'hash1'
        },
        {
          organization_id: org[0].id,
          name: 'Instructor Two',
          email: 'instructor2@test.com',
          password_hash: 'hash2'
        }
      ])
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        lms_id: lms[0].id,
        title: 'Test Course',
        description: 'Test course description',
        slug: 'test-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Create course instructor assignments
    const courseInstructors = await db.insert(courseInstructorsTable)
      .values([
        {
          course_id: course[0].id,
          user_id: users[0].id
        },
        {
          course_id: course[0].id,
          user_id: users[1].id
        }
      ])
      .returning()
      .execute();

    const result = await getCourseInstructors(course[0].id);

    expect(result).toHaveLength(2);
    
    // Verify the returned data structure
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('course_id', course[0].id);
    expect(result[0]).toHaveProperty('user_id');
    expect(result[0]).toHaveProperty('created_at');
    expect(result[0].created_at).toBeInstanceOf(Date);

    // Verify instructor user IDs are included
    const instructorUserIds = result.map(instructor => instructor.user_id);
    expect(instructorUserIds).toContain(users[0].id);
    expect(instructorUserIds).toContain(users[1].id);
  });

  it('should only return instructors for the specified course', async () => {
    // Create test data
    const org = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organization'
      })
      .returning()
      .execute();

    const lms = await db.insert(lmsTable)
      .values({
        organization_id: org[0].id,
        name: 'Test LMS',
        description: 'Test LMS'
      })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        organization_id: org[0].id,
        name: 'Test Instructor',
        email: 'instructor@test.com',
        password_hash: 'hash1'
      })
      .returning()
      .execute();

    const courses = await db.insert(coursesTable)
      .values([
        {
          lms_id: lms[0].id,
          title: 'Course One',
          description: 'First course',
          slug: 'course-one',
          status: 'published'
        },
        {
          lms_id: lms[0].id,
          title: 'Course Two',
          description: 'Second course',
          slug: 'course-two',
          status: 'published'
        }
      ])
      .returning()
      .execute();

    // Create course instructor assignments for both courses
    await db.insert(courseInstructorsTable)
      .values([
        {
          course_id: courses[0].id,
          user_id: user[0].id
        },
        {
          course_id: courses[1].id,
          user_id: user[0].id
        }
      ])
      .execute();

    // Query for first course only
    const result = await getCourseInstructors(courses[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].course_id).toEqual(courses[0].id);
    expect(result[0].user_id).toEqual(user[0].id);
  });

  it('should save course instructor assignments to database correctly', async () => {
    // Create test data
    const org = await db.insert(organizationsTable)
      .values({
        name: 'Test Org',
        description: 'Test organization'
      })
      .returning()
      .execute();

    const lms = await db.insert(lmsTable)
      .values({
        organization_id: org[0].id,
        name: 'Test LMS',
        description: 'Test LMS'
      })
      .returning()
      .execute();

    const user = await db.insert(usersTable)
      .values({
        organization_id: org[0].id,
        name: 'Test Instructor',
        email: 'instructor@test.com',
        password_hash: 'hash1'
      })
      .returning()
      .execute();

    const course = await db.insert(coursesTable)
      .values({
        lms_id: lms[0].id,
        title: 'Test Course',
        description: 'Test course description',
        slug: 'test-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Create course instructor assignment
    const courseInstructor = await db.insert(courseInstructorsTable)
      .values({
        course_id: course[0].id,
        user_id: user[0].id
      })
      .returning()
      .execute();

    // Use handler to fetch
    const result = await getCourseInstructors(course[0].id);

    // Verify against direct database query
    const dbInstructors = await db.select()
      .from(courseInstructorsTable)
      .where(eq(courseInstructorsTable.course_id, course[0].id))
      .execute();

    expect(result).toHaveLength(1);
    expect(dbInstructors).toHaveLength(1);
    expect(result[0].id).toEqual(dbInstructors[0].id);
    expect(result[0].course_id).toEqual(dbInstructors[0].course_id);
    expect(result[0].user_id).toEqual(dbInstructors[0].user_id);
  });

  it('should handle non-existent course ID gracefully', async () => {
    const result = await getCourseInstructors(999999);
    expect(result).toEqual([]);
  });
});