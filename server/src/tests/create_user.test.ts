import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, organizationsTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

describe('createUser', () => {
  let testOrgId: number;

  beforeEach(async () => {
    await createDB();

    // Create a test organization for users
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'A test organization'
      })
      .returning()
      .execute();
    
    testOrgId = orgResult[0].id;
  });

  afterEach(resetDB);

  const testInput: CreateUserInput = {
    organization_id: 0, // Will be set in each test
    name: 'Test User',
    email: 'test@example.com',
    password: 'securepassword123'
  };

  it('should create a user with valid input', async () => {
    const input = { ...testInput, organization_id: testOrgId };
    const result = await createUser(input);

    // Basic field validation
    expect(result.name).toEqual('Test User');
    expect(result.email).toEqual('test@example.com');
    expect(result.organization_id).toEqual(testOrgId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify password is hashed, not plain text
    expect(result.password_hash).not.toEqual('securepassword123');
    expect(result.password_hash).toBeDefined();
    expect(result.password_hash.length).toBeGreaterThan(10);
  });

  it('should save user to database', async () => {
    const input = { ...testInput, organization_id: testOrgId };
    const result = await createUser(input);

    // Query user from database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].name).toEqual('Test User');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].organization_id).toEqual(testOrgId);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly using Bun password hashing', async () => {
    const input = { ...testInput, organization_id: testOrgId };
    const result = await createUser(input);

    // Verify password can be verified with Bun's password.verify
    const isValid = await Bun.password.verify('securepassword123', result.password_hash);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should create multiple users in the same organization', async () => {
    const input1 = { 
      ...testInput, 
      organization_id: testOrgId,
      email: 'user1@example.com'
    };
    const input2 = { 
      ...testInput, 
      organization_id: testOrgId,
      email: 'user2@example.com',
      name: 'Second User'
    };

    const result1 = await createUser(input1);
    const result2 = await createUser(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.organization_id).toEqual(testOrgId);
    expect(result2.organization_id).toEqual(testOrgId);

    // Verify both users exist in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.organization_id, testOrgId))
      .execute();

    expect(users).toHaveLength(2);
  });

  it('should throw error for non-existent organization', async () => {
    const input = { ...testInput, organization_id: 99999 };

    await expect(createUser(input)).rejects.toThrow(/organization with id 99999 does not exist/i);
  });

  it('should handle unique email constraint violation', async () => {
    const input = { ...testInput, organization_id: testOrgId };

    // Create first user
    await createUser(input);

    // Try to create second user with same email and organization
    await expect(createUser(input)).rejects.toThrow();
  });

  it('should allow same email in different organizations', async () => {
    // Create second organization
    const org2Result = await db.insert(organizationsTable)
      .values({
        name: 'Second Organization',
        description: 'Another test organization'
      })
      .returning()
      .execute();
    
    const testOrg2Id = org2Result[0].id;

    const input1 = { ...testInput, organization_id: testOrgId };
    const input2 = { ...testInput, organization_id: testOrg2Id };

    const result1 = await createUser(input1);
    const result2 = await createUser(input2);

    expect(result1.email).toEqual(result2.email);
    expect(result1.organization_id).not.toEqual(result2.organization_id);
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should handle different password lengths correctly', async () => {
    const shortPasswordInput = { 
      ...testInput, 
      organization_id: testOrgId,
      email: 'short@example.com',
      password: 'abc123'
    };
    
    const longPasswordInput = { 
      ...testInput, 
      organization_id: testOrgId,
      email: 'long@example.com',
      password: 'this-is-a-very-long-password-with-many-characters-123456789'
    };

    const result1 = await createUser(shortPasswordInput);
    const result2 = await createUser(longPasswordInput);

    // Both passwords should be hashed successfully
    expect(result1.password_hash).toBeDefined();
    expect(result2.password_hash).toBeDefined();
    
    // Verify both passwords can be verified
    const isValid1 = await Bun.password.verify('abc123', result1.password_hash);
    const isValid2 = await Bun.password.verify('this-is-a-very-long-password-with-many-characters-123456789', result2.password_hash);
    
    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });
});