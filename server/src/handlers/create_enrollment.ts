import { db } from '../db';
import { enrollmentsTable, usersTable, coursesTable } from '../db/schema';
import { type CreateEnrollmentInput, type Enrollment } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createEnrollment = async (input: CreateEnrollmentInput): Promise<Enrollment> => {
  try {
    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .limit(1)
      .execute();

    if (course.length === 0) {
      throw new Error(`Course with ID ${input.course_id} does not exist`);
    }

    // Check if enrollment already exists
    const existingEnrollment = await db.select()
      .from(enrollmentsTable)
      .where(and(
        eq(enrollmentsTable.user_id, input.user_id),
        eq(enrollmentsTable.course_id, input.course_id)
      ))
      .limit(1)
      .execute();

    if (existingEnrollment.length > 0) {
      throw new Error(`User ${input.user_id} is already enrolled in course ${input.course_id}`);
    }

    // Insert enrollment record
    const result = await db.insert(enrollmentsTable)
      .values({
        user_id: input.user_id,
        course_id: input.course_id,
        status: input.status
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Enrollment creation failed:', error);
    throw error;
  }
};