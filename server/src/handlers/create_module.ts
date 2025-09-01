import { db } from '../db';
import { modulesTable } from '../db/schema';
import { type CreateModuleInput, type Module } from '../schema';

export const createModule = async (input: CreateModuleInput): Promise<Module> => {
  try {
    // Insert module record
    const result = await db.insert(modulesTable)
      .values({
        course_id: input.course_id,
        title: input.title,
        description: input.description,
        order: input.order
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Module creation failed:', error);
    throw error;
  }
};