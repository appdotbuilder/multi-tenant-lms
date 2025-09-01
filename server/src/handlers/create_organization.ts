import { db } from '../db';
import { organizationsTable } from '../db/schema';
import { type CreateOrganizationInput, type Organization } from '../schema';

export const createOrganization = async (input: CreateOrganizationInput): Promise<Organization> => {
  try {
    // Insert organization record
    const result = await db.insert(organizationsTable)
      .values({
        name: input.name,
        description: input.description
      })
      .returning()
      .execute();

    // Return the created organization
    const organization = result[0];
    return organization;
  } catch (error) {
    console.error('Organization creation failed:', error);
    throw error;
  }
};