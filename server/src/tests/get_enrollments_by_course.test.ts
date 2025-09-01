import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  organizationsTable, 
  lmsTable, 
  usersTable, 
  coursesTable, 
  enrollmentsTable 
} from '../db/schema';
import { getEnrollmentsByCourse } from '../handlers/get_enrollments_by_course';

describe('getEnrollmentsByCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return enrollments for a specific course', async () => {
    // Create prerequisite data
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values([
        {
          organization_id: orgResult[0].id,
          name: 'Test User 1',
          email: 'user1@test.com',
          password_hash: 'hashed_password_1'
        },
        {
          organization_id: orgResult[0].id,
          name: 'Test User 2',
          email: 'user2@test.com',
          password_hash: 'hashed_password_2'
        }
      ])
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values([
        {
          lms_id: lmsResult[0].id,
          title: 'Course 1',
          description: 'Course 1 description',
          slug: 'course-1',
          status: 'published'
        },
        {
          lms_id: lmsResult[0].id,
          title: 'Course 2',
          description: 'Course 2 description',
          slug: 'course-2',
          status: 'published'
        }
      ])
      .returning()
      .execute();

    // Create enrollments for course 1
    await db.insert(enrollmentsTable)
      .values([
        {
          user_id: userResult[0].id,
          course_id: courseResult[0].id,
          status: 'enrolled'
        },
        {
          user_id: userResult[1].id,
          course_id: courseResult[0].id,
          status: 'completed'
        }
      ])
      .execute();

    // Create enrollment for course 2 (should not be returned)
    await db.insert(enrollmentsTable)
      .values({
        user_id: userResult[0].id,
        course_id: courseResult[1].id,
        status: 'enrolled'
      })
      .execute();

    // Test the handler
    const enrollments = await getEnrollmentsByCourse(courseResult[0].id);

    // Verify results
    expect(enrollments).toHaveLength(2);
    expect(enrollments[0].course_id).toEqual(courseResult[0].id);
    expect(enrollments[1].course_id).toEqual(courseResult[0].id);
    
    // Verify both enrollments belong to course 1
    const userIds = enrollments.map(e => e.user_id).sort();
    const expectedUserIds = [userResult[0].id, userResult[1].id].sort();
    expect(userIds).toEqual(expectedUserIds);

    // Verify statuses
    const statuses = enrollments.map(e => e.status).sort();
    expect(statuses).toEqual(['completed', 'enrolled']);

    // Verify all required fields are present
    enrollments.forEach(enrollment => {
      expect(enrollment.id).toBeDefined();
      expect(enrollment.user_id).toBeDefined();
      expect(enrollment.course_id).toEqual(courseResult[0].id);
      expect(enrollment.status).toBeDefined();
      expect(enrollment.enrollment_date).toBeInstanceOf(Date);
      expect(enrollment.created_at).toBeInstanceOf(Date);
      expect(enrollment.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for course with no enrollments', async () => {
    // Create prerequisite data
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        lms_id: lmsResult[0].id,
        title: 'Empty Course',
        description: 'Course with no enrollments',
        slug: 'empty-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Test the handler
    const enrollments = await getEnrollmentsByCourse(courseResult[0].id);

    // Verify results
    expect(enrollments).toHaveLength(0);
    expect(Array.isArray(enrollments)).toBe(true);
  });

  it('should return empty array for non-existent course', async () => {
    // Test with a course ID that doesn't exist
    const enrollments = await getEnrollmentsByCourse(99999);

    // Verify results
    expect(enrollments).toHaveLength(0);
    expect(Array.isArray(enrollments)).toBe(true);
  });

  it('should handle enrollments with different statuses', async () => {
    // Create prerequisite data
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values([
        {
          organization_id: orgResult[0].id,
          name: 'User 1',
          email: 'user1@test.com',
          password_hash: 'hashed_password_1'
        },
        {
          organization_id: orgResult[0].id,
          name: 'User 2',
          email: 'user2@test.com',
          password_hash: 'hashed_password_2'
        },
        {
          organization_id: orgResult[0].id,
          name: 'User 3',
          email: 'user3@test.com',
          password_hash: 'hashed_password_3'
        }
      ])
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        lms_id: lmsResult[0].id,
        title: 'Status Test Course',
        description: 'Course for testing different enrollment statuses',
        slug: 'status-test-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Create enrollments with different statuses
    await db.insert(enrollmentsTable)
      .values([
        {
          user_id: userResult[0].id,
          course_id: courseResult[0].id,
          status: 'enrolled'
        },
        {
          user_id: userResult[1].id,
          course_id: courseResult[0].id,
          status: 'completed'
        },
        {
          user_id: userResult[2].id,
          course_id: courseResult[0].id,
          status: 'dropped'
        }
      ])
      .execute();

    // Test the handler
    const enrollments = await getEnrollmentsByCourse(courseResult[0].id);

    // Verify results
    expect(enrollments).toHaveLength(3);

    // Check that we have all three statuses
    const statuses = enrollments.map(e => e.status).sort();
    expect(statuses).toEqual(['completed', 'dropped', 'enrolled']);

    // Verify all enrollments belong to the correct course
    enrollments.forEach(enrollment => {
      expect(enrollment.course_id).toEqual(courseResult[0].id);
    });
  });

  it('should handle enrollments with completion dates', async () => {
    // Create prerequisite data
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const userResult = await db.insert(usersTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test User',
        email: 'user@test.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const courseResult = await db.insert(coursesTable)
      .values({
        lms_id: lmsResult[0].id,
        title: 'Completion Test Course',
        description: 'Course for testing completion dates',
        slug: 'completion-test-course',
        status: 'published'
      })
      .returning()
      .execute();

    const completionDate = new Date();
    
    // Create enrollment with completion date
    await db.insert(enrollmentsTable)
      .values({
        user_id: userResult[0].id,
        course_id: courseResult[0].id,
        status: 'completed',
        completion_date: completionDate
      })
      .execute();

    // Test the handler
    const enrollments = await getEnrollmentsByCourse(courseResult[0].id);

    // Verify results
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].status).toEqual('completed');
    expect(enrollments[0].completion_date).toBeInstanceOf(Date);
    expect(enrollments[0].completion_date?.getTime()).toBeCloseTo(completionDate.getTime(), -3); // Within 1 second
  });
});