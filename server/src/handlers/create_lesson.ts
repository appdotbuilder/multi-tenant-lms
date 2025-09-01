import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { type CreateLessonInput, type Lesson } from '../schema';

export const createLesson = async (input: CreateLessonInput): Promise<Lesson> => {
  try {
    // Insert lesson record
    const result = await db.insert(lessonsTable)
      .values({
        module_id: input.module_id,
        title: input.title,
        description: input.description,
        content: input.content,
        type: input.type,
        order: input.order
      })
      .returning()
      .execute();

    // Return the created lesson
    const lesson = result[0];
    return lesson;
  } catch (error) {
    console.error('Lesson creation failed:', error);
    throw error;
  }
};