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
import { getEnrollmentsByUser } from '../handlers/get_enrollments_by_user';
import { eq } from 'drizzle-orm';

describe('getEnrollmentsByUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all enrollments for a specific user', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({
        organization_id: organization.id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        organization_id: organization.id,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [course1] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Course 1',
        description: 'First course',
        slug: 'course-1',
        status: 'published'
      })
      .returning()
      .execute();

    const [course2] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Course 2',
        description: 'Second course',
        slug: 'course-2',
        status: 'published'
      })
      .returning()
      .execute();

    // Create enrollments for the user
    const [enrollment1] = await db.insert(enrollmentsTable)
      .values({
        user_id: user.id,
        course_id: course1.id,
        status: 'enrolled'
      })
      .returning()
      .execute();

    const [enrollment2] = await db.insert(enrollmentsTable)
      .values({
        user_id: user.id,
        course_id: course2.id,
        status: 'completed'
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getEnrollmentsByUser(user.id);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Sort by id to ensure consistent order for comparison
    const sortedResult = result.sort((a, b) => a.id - b.id);
    
    expect(sortedResult[0].id).toEqual(enrollment1.id);
    expect(sortedResult[0].user_id).toEqual(user.id);
    expect(sortedResult[0].course_id).toEqual(course1.id);
    expect(sortedResult[0].status).toEqual('enrolled');
    expect(sortedResult[0].enrollment_date).toBeInstanceOf(Date);
    expect(sortedResult[0].completion_date).toBeNull();
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);
    expect(sortedResult[0].updated_at).toBeInstanceOf(Date);

    expect(sortedResult[1].id).toEqual(enrollment2.id);
    expect(sortedResult[1].user_id).toEqual(user.id);
    expect(sortedResult[1].course_id).toEqual(course2.id);
    expect(sortedResult[1].status).toEqual('completed');
    expect(sortedResult[1].enrollment_date).toBeInstanceOf(Date);
    expect(sortedResult[1].completion_date).toBeNull();
    expect(sortedResult[1].created_at).toBeInstanceOf(Date);
    expect(sortedResult[1].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array for user with no enrollments', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        organization_id: organization.id,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    // Test the handler with user that has no enrollments
    const result = await getEnrollmentsByUser(user.id);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent user', async () => {
    // Test with non-existent user ID
    const result = await getEnrollmentsByUser(999999);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return enrollments for the specified user', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({
        organization_id: organization.id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    // Create two users
    const [user1] = await db.insert(usersTable)
      .values({
        organization_id: organization.id,
        name: 'User 1',
        email: 'user1@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        organization_id: organization.id,
        name: 'User 2',
        email: 'user2@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: 'Test course',
        slug: 'test-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Create enrollments for both users
    await db.insert(enrollmentsTable)
      .values({
        user_id: user1.id,
        course_id: course.id,
        status: 'enrolled'
      })
      .execute();

    await db.insert(enrollmentsTable)
      .values({
        user_id: user2.id,
        course_id: course.id,
        status: 'enrolled'
      })
      .execute();

    // Test that we only get enrollments for user1
    const result = await getEnrollmentsByUser(user1.id);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].course_id).toEqual(course.id);
    expect(result[0].status).toEqual('enrolled');
  });

  it('should handle different enrollment statuses correctly', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({
        organization_id: organization.id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        organization_id: organization.id,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    // Create courses
    const [course1] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Course 1',
        description: 'First course',
        slug: 'course-1',
        status: 'published'
      })
      .returning()
      .execute();

    const [course2] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Course 2',
        description: 'Second course',
        slug: 'course-2',
        status: 'published'
      })
      .returning()
      .execute();

    const [course3] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Course 3',
        description: 'Third course',
        slug: 'course-3',
        status: 'published'
      })
      .returning()
      .execute();

    // Create enrollments with different statuses
    await db.insert(enrollmentsTable)
      .values({
        user_id: user.id,
        course_id: course1.id,
        status: 'enrolled'
      })
      .execute();

    await db.insert(enrollmentsTable)
      .values({
        user_id: user.id,
        course_id: course2.id,
        status: 'completed'
      })
      .execute();

    await db.insert(enrollmentsTable)
      .values({
        user_id: user.id,
        course_id: course3.id,
        status: 'dropped'
      })
      .execute();

    // Test the handler
    const result = await getEnrollmentsByUser(user.id);

    expect(result).toHaveLength(3);
    
    // Verify all statuses are included
    const statuses = result.map(e => e.status).sort();
    expect(statuses).toEqual(['completed', 'dropped', 'enrolled']);
  });

  it('should validate data exists in database after retrieval', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test description'
      })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({
        organization_id: organization.id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    const [user] = await db.insert(usersTable)
      .values({
        organization_id: organization.id,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: 'Test course',
        slug: 'test-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Create enrollment
    await db.insert(enrollmentsTable)
      .values({
        user_id: user.id,
        course_id: course.id,
        status: 'enrolled'
      })
      .execute();

    // Get enrollments via handler
    const result = await getEnrollmentsByUser(user.id);

    // Verify enrollment exists in database by direct query
    const dbEnrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.user_id, user.id))
      .execute();

    expect(result).toHaveLength(1);
    expect(dbEnrollments).toHaveLength(1);
    expect(result[0].id).toEqual(dbEnrollments[0].id);
    expect(result[0].user_id).toEqual(dbEnrollments[0].user_id);
    expect(result[0].course_id).toEqual(dbEnrollments[0].course_id);
    expect(result[0].status).toEqual(dbEnrollments[0].status);
  });
});