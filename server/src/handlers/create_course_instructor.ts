import { db } from '../db';
import { courseInstructorsTable, coursesTable, usersTable } from '../db/schema';
import { type CreateCourseInstructorInput, type CourseInstructor } from '../schema';
import { eq } from 'drizzle-orm';

export const createCourseInstructor = async (input: CreateCourseInstructorInput): Promise<CourseInstructor> => {
  try {
    // Verify that the course exists
    const course = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, input.course_id))
      .execute();
    
    if (course.length === 0) {
      throw new Error(`Course with id ${input.course_id} does not exist`);
    }

    // Verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();
    
    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} does not exist`);
    }

    // Insert the course instructor relationship
    const result = await db.insert(courseInstructorsTable)
      .values({
        course_id: input.course_id,
        user_id: input.user_id
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Course instructor creation failed:', error);
    throw error;
  }
};