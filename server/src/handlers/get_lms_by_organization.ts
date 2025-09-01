import { db } from '../db';
import { lmsTable } from '../db/schema';
import { type LMS } from '../schema';
import { eq } from 'drizzle-orm';

export const getLMSByOrganization = async (organizationId: number): Promise<LMS[]> => {
  try {
    const results = await db.select()
      .from(lmsTable)
      .where(eq(lmsTable.organization_id, organizationId))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch LMS instances by organization:', error);
    throw error;
  }
};