import { db } from '../db';
import { usersTable, organizationsTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // First verify that the organization exists
    const organization = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, input.organization_id))
      .execute();

    if (organization.length === 0) {
      throw new Error(`Organization with id ${input.organization_id} does not exist`);
    }

    // Hash the password using Bun's built-in password hashing
    const passwordHash = await Bun.password.hash(input.password);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        organization_id: input.organization_id,
        name: input.name,
        email: input.email,
        password_hash: passwordHash
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}