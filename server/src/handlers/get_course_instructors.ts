import { db } from '../db';
import { courseInstructorsTable } from '../db/schema';
import { type CourseInstructor } from '../schema';
import { eq } from 'drizzle-orm';

export const getCourseInstructors = async (courseId: number): Promise<CourseInstructor[]> => {
  try {
    // Query course instructors by course ID
    const results = await db.select()
      .from(courseInstructorsTable)
      .where(eq(courseInstructorsTable.course_id, courseId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch course instructors:', error);
    throw error;
  }
};