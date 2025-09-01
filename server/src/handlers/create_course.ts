import { db } from '../db';
import { coursesTable } from '../db/schema';
import { type CreateCourseInput, type Course } from '../schema';

export const createCourse = async (input: CreateCourseInput): Promise<Course> => {
  try {
    // Insert course record
    const result = await db.insert(coursesTable)
      .values({
        lms_id: input.lms_id,
        title: input.title,
        description: input.description,
        slug: input.slug,
        meta_title: input.meta_title,
        meta_description: input.meta_description,
        keywords: input.keywords,
        thumbnail_url: input.thumbnail_url,
        duration_hours: input.duration_hours ? input.duration_hours.toString() : null, // Convert number to string for numeric column
        status: input.status
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const course = result[0];
    return {
      ...course,
      duration_hours: course.duration_hours ? parseFloat(course.duration_hours) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Course creation failed:', error);
    throw error;
  }
};