import { db } from '../db';
import { lessonsTable } from '../db/schema';
import { type Lesson } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getLessonsByModule(moduleId: number): Promise<Lesson[]> {
  try {
    const results = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.module_id, moduleId))
      .orderBy(asc(lessonsTable.order))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get lessons by module:', error);
    throw error;
  }
}