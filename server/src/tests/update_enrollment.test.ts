import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, usersTable, coursesTable, enrollmentsTable } from '../db/schema';
import { type UpdateEnrollmentInput } from '../schema';
import { updateEnrollment } from '../handlers/update_enrollment';
import { eq } from 'drizzle-orm';

describe('updateEnrollment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test org description'
      })
      .returning()
      .execute();

    // Create LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();

    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();

    // Create course
    const courseResult = await db.insert(coursesTable)
      .values({
        lms_id: lmsResult[0].id,
        title: 'Test Course',
        slug: 'test-course',
        status: 'published'
      })
      .returning()
      .execute();

    // Create enrollment
    const enrollmentResult = await db.insert(enrollmentsTable)
      .values({
        user_id: userResult[0].id,
        course_id: courseResult[0].id,
        status: 'enrolled'
      })
      .returning()
      .execute();

    return {
      enrollment: enrollmentResult[0]
    };
  };

  it('should update enrollment status', async () => {
    const { enrollment } = await createTestData();

    const input: UpdateEnrollmentInput = {
      id: enrollment.id,
      status: 'completed'
    };

    const result = await updateEnrollment(input);

    expect(result.id).toEqual(enrollment.id);
    expect(result.status).toEqual('completed');
    expect(result.user_id).toEqual(enrollment.user_id);
    expect(result.course_id).toEqual(enrollment.course_id);
    expect(result.enrollment_date).toBeInstanceOf(Date);
    expect(result.completion_date).toEqual(enrollment.completion_date);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > enrollment.updated_at).toBe(true);
  });

  it('should update completion date', async () => {
    const { enrollment } = await createTestData();
    const completionDate = new Date('2024-01-15T10:00:00Z');

    const input: UpdateEnrollmentInput = {
      id: enrollment.id,
      completion_date: completionDate
    };

    const result = await updateEnrollment(input);

    expect(result.id).toEqual(enrollment.id);
    expect(result.completion_date).toEqual(completionDate);
    expect(result.status).toEqual(enrollment.status); // Should remain unchanged
    expect(result.updated_at > enrollment.updated_at).toBe(true);
  });

  it('should update both status and completion date', async () => {
    const { enrollment } = await createTestData();
    const completionDate = new Date('2024-01-15T10:00:00Z');

    const input: UpdateEnrollmentInput = {
      id: enrollment.id,
      status: 'completed',
      completion_date: completionDate
    };

    const result = await updateEnrollment(input);

    expect(result.id).toEqual(enrollment.id);
    expect(result.status).toEqual('completed');
    expect(result.completion_date).toEqual(completionDate);
    expect(result.updated_at > enrollment.updated_at).toBe(true);
  });

  it('should set completion date to null', async () => {
    const { enrollment } = await createTestData();

    // First set a completion date
    await db.update(enrollmentsTable)
      .set({ completion_date: new Date() })
      .where(eq(enrollmentsTable.id, enrollment.id))
      .execute();

    const input: UpdateEnrollmentInput = {
      id: enrollment.id,
      completion_date: null
    };

    const result = await updateEnrollment(input);

    expect(result.id).toEqual(enrollment.id);
    expect(result.completion_date).toBeNull();
  });

  it('should save changes to database', async () => {
    const { enrollment } = await createTestData();

    const input: UpdateEnrollmentInput = {
      id: enrollment.id,
      status: 'dropped'
    };

    await updateEnrollment(input);

    // Verify the change was persisted
    const dbEnrollments = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.id, enrollment.id))
      .execute();

    expect(dbEnrollments).toHaveLength(1);
    expect(dbEnrollments[0].status).toEqual('dropped');
    expect(dbEnrollments[0].updated_at > enrollment.updated_at).toBe(true);
  });

  it('should throw error for non-existent enrollment', async () => {
    const input: UpdateEnrollmentInput = {
      id: 99999,
      status: 'completed'
    };

    await expect(updateEnrollment(input)).rejects.toThrow(/Enrollment with id 99999 not found/i);
  });

  it('should handle partial updates correctly', async () => {
    const { enrollment } = await createTestData();
    const originalStatus = enrollment.status;
    const originalCompletionDate = enrollment.completion_date;

    // Update only status
    const input1: UpdateEnrollmentInput = {
      id: enrollment.id,
      status: 'completed'
    };

    const result1 = await updateEnrollment(input1);
    expect(result1.status).toEqual('completed');
    expect(result1.completion_date).toEqual(originalCompletionDate); // Should remain unchanged

    // Update only completion date
    const completionDate = new Date('2024-01-15T10:00:00Z');
    const input2: UpdateEnrollmentInput = {
      id: enrollment.id,
      completion_date: completionDate
    };

    const result2 = await updateEnrollment(input2);
    expect(result2.status).toEqual('completed'); // Should remain as updated value
    expect(result2.completion_date).toEqual(completionDate);
  });

  it('should update with different enrollment statuses', async () => {
    const { enrollment } = await createTestData();

    // Test each valid status
    const statuses = ['enrolled', 'completed', 'dropped'] as const;

    for (const status of statuses) {
      const input: UpdateEnrollmentInput = {
        id: enrollment.id,
        status: status
      };

      const result = await updateEnrollment(input);
      expect(result.status).toEqual(status);
    }
  });
});