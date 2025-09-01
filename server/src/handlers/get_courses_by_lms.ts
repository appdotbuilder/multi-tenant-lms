import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type Course } from '../schema';
import { eq } from 'drizzle-orm';

export const getCoursesByLMS = async (lmsId: number): Promise<Course[]> => {
  try {
    // Query courses for the specific LMS instance
    const results = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.lms_id, lmsId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(course => ({
      ...course,
      duration_hours: course.duration_hours ? parseFloat(course.duration_hours) : null
    }));
  } catch (error) {
    console.error('Failed to fetch courses by LMS:', error);
    throw error;
  }
};