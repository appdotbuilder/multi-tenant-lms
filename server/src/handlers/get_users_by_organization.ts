import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export async function getUsersByOrganization(organizationId: number): Promise<User[]> {
  try {
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.organization_id, organizationId))
      .execute();

    return result;
  } catch (error) {
    console.error('Failed to fetch users by organization:', error);
    throw error;
  }
}