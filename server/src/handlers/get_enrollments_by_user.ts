import { db } from '../db';
import { enrollmentsTable } from '../db/schema';
import { type Enrollment } from '../schema';
import { eq } from 'drizzle-orm';

export const getEnrollmentsByUser = async (userId: number): Promise<Enrollment[]> => {
  try {
    // Query enrollments for the specific user
    const results = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.user_id, userId))
      .execute();

    // Return the results (no numeric conversions needed for this table)
    return results;
  } catch (error) {
    console.error('Failed to get enrollments by user:', error);
    throw error;
  }
};