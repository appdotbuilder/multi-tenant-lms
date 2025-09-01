import { db } from '../db';
import { modulesTable } from '../db/schema';
import { type Module } from '../schema';
import { eq, asc } from 'drizzle-orm';

export const getModulesByCourse = async (courseId: number): Promise<Module[]> => {
  try {
    const results = await db.select()
      .from(modulesTable)
      .where(eq(modulesTable.course_id, courseId))
      .orderBy(asc(modulesTable.order))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch modules by course:', error);
    throw error;
  }
};