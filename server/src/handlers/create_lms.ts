import { db } from '../db';
import { lmsTable } from '../db/schema';
import { type CreateLMSInput, type LMS } from '../schema';

export const createLMS = async (input: CreateLMSInput): Promise<LMS> => {
  try {
    // Insert LMS record
    const result = await db.insert(lmsTable)
      .values({
        organization_id: input.organization_id,
        name: input.name,
        description: input.description
      })
      .returning()
      .execute();

    const lms = result[0];
    return lms;
  } catch (error) {
    console.error('LMS creation failed:', error);
    throw error;
  }
};