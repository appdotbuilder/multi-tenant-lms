import { db } from '../db';
import { enrollmentsTable } from '../db/schema';
import { type Enrollment } from '../schema';
import { eq } from 'drizzle-orm';

export async function getEnrollmentsByCourse(courseId: number): Promise<Enrollment[]> {
  try {
    const result = await db.select()
      .from(enrollmentsTable)
      .where(eq(enrollmentsTable.course_id, courseId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch enrollments by course:', error);
    throw error;
  }
}