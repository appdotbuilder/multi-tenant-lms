import { db } from '../db';
import { userOrganizationRolesTable, usersTable, organizationsTable } from '../db/schema';
import { type CreateUserOrganizationRoleInput, type UserOrganizationRole } from '../schema';
import { eq } from 'drizzle-orm';

export const createUserOrganizationRole = async (input: CreateUserOrganizationRoleInput): Promise<UserOrganizationRole> => {
  try {
    // Verify that the organization exists first
    const organization = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.organization_id))
      .execute();

    if (organization.length === 0) {
      throw new Error(`Organization with ID ${input.organization_id} not found`);
    }

    // Verify that the user exists and belongs to the organization
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    if (user[0].organization_id !== input.organization_id) {
      throw new Error(`User ${input.user_id} does not belong to organization ${input.organization_id}`);
    }

    // Insert the user organization role record
    const result = await db.insert(userOrganizationRolesTable)
      .values({
        user_id: input.user_id,
        organization_id: input.organization_id,
        role: input.role
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User organization role creation failed:', error);
    throw error;
  }
};