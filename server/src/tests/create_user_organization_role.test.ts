import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, usersTable, userOrganizationRolesTable } from '../db/schema';
import { type CreateUserOrganizationRoleInput } from '../schema';
import { createUserOrganizationRole } from '../handlers/create_user_organization_role';
import { eq } from 'drizzle-orm';

describe('createUserOrganizationRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let organizationId: number;
  let userId: number;
  let otherOrganizationId: number;

  beforeEach(async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'A test organization'
      })
      .returning()
      .execute();
    organizationId = orgResult[0].id;

    // Create another organization for testing cross-org validation
    const otherOrgResult = await db.insert(organizationsTable)
      .values({
        name: 'Other Organization',
        description: 'Another test organization'
      })
      .returning()
      .execute();
    otherOrganizationId = otherOrgResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password_123'
      })
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  it('should create a user organization role', async () => {
    const input: CreateUserOrganizationRoleInput = {
      user_id: userId,
      organization_id: organizationId,
      role: 'org_admin'
    };

    const result = await createUserOrganizationRole(input);

    // Verify the returned data
    expect(result.user_id).toEqual(userId);
    expect(result.organization_id).toEqual(organizationId);
    expect(result.role).toEqual('org_admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user organization role to database', async () => {
    const input: CreateUserOrganizationRoleInput = {
      user_id: userId,
      organization_id: organizationId,
      role: 'org_admin'
    };

    const result = await createUserOrganizationRole(input);

    // Query the database to verify the role was saved
    const roles = await db.select()
      .from(userOrganizationRolesTable)
      .where(eq(userOrganizationRolesTable.id, result.id))
      .execute();

    expect(roles).toHaveLength(1);
    expect(roles[0].user_id).toEqual(userId);
    expect(roles[0].organization_id).toEqual(organizationId);
    expect(roles[0].role).toEqual('org_admin');
    expect(roles[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const input: CreateUserOrganizationRoleInput = {
      user_id: 99999, // Non-existent user
      organization_id: organizationId,
      role: 'org_admin'
    };

    await expect(createUserOrganizationRole(input)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should throw error when organization does not exist', async () => {
    const input: CreateUserOrganizationRoleInput = {
      user_id: userId,
      organization_id: 99999, // Non-existent organization
      role: 'org_admin'
    };

    await expect(createUserOrganizationRole(input)).rejects.toThrow(/Organization with ID 99999 not found/i);
  });

  it('should throw error when user does not belong to the organization', async () => {
    const input: CreateUserOrganizationRoleInput = {
      user_id: userId, // User belongs to organizationId, not otherOrganizationId
      organization_id: otherOrganizationId,
      role: 'org_admin'
    };

    await expect(createUserOrganizationRole(input)).rejects.toThrow(
      new RegExp(`User ${userId} does not belong to organization ${otherOrganizationId}`, 'i')
    );
  });

  it('should handle duplicate role assignment constraint violation', async () => {
    const input: CreateUserOrganizationRoleInput = {
      user_id: userId,
      organization_id: organizationId,
      role: 'org_admin'
    };

    // Create the role first time - should succeed
    await createUserOrganizationRole(input);

    // Try to create the same role again - should fail due to unique constraint
    await expect(createUserOrganizationRole(input)).rejects.toThrow(/duplicate key value/i);
  });

  it('should create role with correct timestamps', async () => {
    const beforeCreate = new Date();
    
    const input: CreateUserOrganizationRoleInput = {
      user_id: userId,
      organization_id: organizationId,
      role: 'org_admin'
    };

    const result = await createUserOrganizationRole(input);
    
    const afterCreate = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
  });
});