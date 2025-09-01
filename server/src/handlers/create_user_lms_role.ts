import { db } from '../db';
import { userLmsRolesTable, usersTable, lmsTable } from '../db/schema';
import { type CreateUserLMSRoleInput, type UserLMSRole } from '../schema';
import { eq } from 'drizzle-orm';

export const createUserLMSRole = async (input: CreateUserLMSRoleInput): Promise<UserLMSRole> => {
  try {
    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Verify LMS exists
    const lms = await db.select()
      .from(lmsTable)
      .where(eq(lmsTable.id, input.lms_id))
      .execute();

    if (lms.length === 0) {
      throw new Error(`LMS with id ${input.lms_id} not found`);
    }

    // Insert user LMS role record
    const result = await db.insert(userLmsRolesTable)
      .values({
        user_id: input.user_id,
        lms_id: input.lms_id,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User LMS role creation failed:', error);
    throw error;
  }
};