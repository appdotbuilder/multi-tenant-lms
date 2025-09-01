import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, usersTable, userLmsRolesTable } from '../db/schema';
import { type CreateUserLMSRoleInput } from '../schema';
import { createUserLMSRole } from '../handlers/create_user_lms_role';
import { eq } from 'drizzle-orm';

describe('createUserLMSRole', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let organizationId: number;
  let lmsId: number;
  let userId: number;

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

    // Create test LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Test LMS',
        description: 'A test LMS'
      })
      .returning()
      .execute();
    lmsId = lmsResult[0].id;

    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: 'Test User',
        email: 'test@example.com',
        password_hash: 'hashed_password'
      })
      .returning()
      .execute();
    userId = userResult[0].id;
  });

  it('should create a user LMS role with lms_admin role', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_admin'
    };

    const result = await createUserLMSRole(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.lms_id).toEqual(lmsId);
    expect(result.role).toEqual('lms_admin');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user LMS role with lms_instructor role', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_instructor'
    };

    const result = await createUserLMSRole(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.lms_id).toEqual(lmsId);
    expect(result.role).toEqual('lms_instructor');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a user LMS role with lms_student role', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_student'
    };

    const result = await createUserLMSRole(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.lms_id).toEqual(lmsId);
    expect(result.role).toEqual('lms_student');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user LMS role to database', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_instructor'
    };

    const result = await createUserLMSRole(testInput);

    // Query the database to verify the role was saved
    const roles = await db.select()
      .from(userLmsRolesTable)
      .where(eq(userLmsRolesTable.id, result.id))
      .execute();

    expect(roles).toHaveLength(1);
    expect(roles[0].user_id).toEqual(userId);
    expect(roles[0].lms_id).toEqual(lmsId);
    expect(roles[0].role).toEqual('lms_instructor');
    expect(roles[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: 99999, // Non-existent user ID
      lms_id: lmsId,
      role: 'lms_student'
    };

    await expect(createUserLMSRole(testInput)).rejects.toThrow(/user with id 99999 not found/i);
  });

  it('should throw error when LMS does not exist', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: 99999, // Non-existent LMS ID
      role: 'lms_student'
    };

    await expect(createUserLMSRole(testInput)).rejects.toThrow(/lms with id 99999 not found/i);
  });

  it('should enforce unique constraint on user-lms-role combination', async () => {
    const testInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_admin'
    };

    // Create the first role
    await createUserLMSRole(testInput);

    // Try to create the same role again - should fail due to unique constraint
    await expect(createUserLMSRole(testInput)).rejects.toThrow();
  });

  it('should allow same user to have different roles in same LMS', async () => {
    const adminInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_admin'
    };

    const instructorInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_instructor'
    };

    const adminResult = await createUserLMSRole(adminInput);
    const instructorResult = await createUserLMSRole(instructorInput);

    expect(adminResult.role).toEqual('lms_admin');
    expect(instructorResult.role).toEqual('lms_instructor');
    expect(adminResult.id).not.toEqual(instructorResult.id);
  });

  it('should allow same user to have same role in different LMS instances', async () => {
    // Create second LMS
    const secondLmsResult = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Second Test LMS',
        description: 'Another test LMS'
      })
      .returning()
      .execute();
    const secondLmsId = secondLmsResult[0].id;

    const firstLmsInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: lmsId,
      role: 'lms_admin'
    };

    const secondLmsInput: CreateUserLMSRoleInput = {
      user_id: userId,
      lms_id: secondLmsId,
      role: 'lms_admin'
    };

    const firstResult = await createUserLMSRole(firstLmsInput);
    const secondResult = await createUserLMSRole(secondLmsInput);

    expect(firstResult.lms_id).toEqual(lmsId);
    expect(secondResult.lms_id).toEqual(secondLmsId);
    expect(firstResult.role).toEqual('lms_admin');
    expect(secondResult.role).toEqual('lms_admin');
    expect(firstResult.id).not.toEqual(secondResult.id);
  });
});