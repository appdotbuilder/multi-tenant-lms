import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, usersTable } from '../db/schema';
import { getUsersByOrganization } from '../handlers/get_users_by_organization';
import { eq } from 'drizzle-orm';

describe('getUsersByOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return users for a specific organization', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'A test organization'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    // Create test users for this organization
    const passwordHash = 'hashed_password_123';
    
    const user1Result = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: 'John Doe',
        email: 'john@test.com',
        password_hash: passwordHash
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: 'Jane Smith',
        email: 'jane@test.com',
        password_hash: passwordHash
      })
      .returning()
      .execute();

    // Fetch users by organization
    const users = await getUsersByOrganization(organizationId);

    // Verify results
    expect(users).toHaveLength(2);
    
    const userNames = users.map(u => u.name).sort();
    expect(userNames).toEqual(['Jane Smith', 'John Doe']);
    
    // Verify all users belong to the correct organization
    users.forEach(user => {
      expect(user.organization_id).toBe(organizationId);
      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.password_hash).toBeDefined();
      expect(user.created_at).toBeInstanceOf(Date);
      expect(user.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array when organization has no users', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Empty Organization',
        description: 'Organization with no users'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    const users = await getUsersByOrganization(organizationId);

    expect(users).toHaveLength(0);
    expect(users).toEqual([]);
  });

  it('should return empty array for non-existent organization', async () => {
    const nonExistentOrgId = 99999;
    const users = await getUsersByOrganization(nonExistentOrgId);

    expect(users).toHaveLength(0);
    expect(users).toEqual([]);
  });

  it('should only return users from specified organization', async () => {
    const passwordHash = 'hashed_password_123';

    // Create two organizations
    const org1Result = await db.insert(organizationsTable)
      .values({
        name: 'Organization 1',
        description: 'First organization'
      })
      .returning()
      .execute();
    const org1Id = org1Result[0].id;

    const org2Result = await db.insert(organizationsTable)
      .values({
        name: 'Organization 2',
        description: 'Second organization'
      })
      .returning()
      .execute();
    const org2Id = org2Result[0].id;

    // Create users for both organizations
    await db.insert(usersTable)
      .values([
        {
          organization_id: org1Id,
          name: 'User 1 Org 1',
          email: 'user1@org1.com',
          password_hash: passwordHash
        },
        {
          organization_id: org1Id,
          name: 'User 2 Org 1',
          email: 'user2@org1.com',
          password_hash: passwordHash
        },
        {
          organization_id: org2Id,
          name: 'User 1 Org 2',
          email: 'user1@org2.com',
          password_hash: passwordHash
        }
      ])
      .execute();

    // Fetch users for organization 1
    const org1Users = await getUsersByOrganization(org1Id);

    expect(org1Users).toHaveLength(2);
    org1Users.forEach(user => {
      expect(user.organization_id).toBe(org1Id);
      expect(user.name).toMatch(/Org 1$/);
    });

    // Fetch users for organization 2
    const org2Users = await getUsersByOrganization(org2Id);

    expect(org2Users).toHaveLength(1);
    expect(org2Users[0].organization_id).toBe(org2Id);
    expect(org2Users[0].name).toBe('User 1 Org 2');
  });

  it('should preserve all user fields correctly', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Testing field preservation'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    const passwordHash = 'hashed_testpassword';
    const testEmail = 'testuser@example.com';
    const testName = 'Test User';

    // Create a user with known values
    const userResult = await db.insert(usersTable)
      .values({
        organization_id: organizationId,
        name: testName,
        email: testEmail,
        password_hash: passwordHash
      })
      .returning()
      .execute();
    const originalUser = userResult[0];

    // Fetch the user through the handler
    const users = await getUsersByOrganization(organizationId);

    expect(users).toHaveLength(1);
    const fetchedUser = users[0];

    // Verify all fields match exactly
    expect(fetchedUser.id).toBe(originalUser.id);
    expect(fetchedUser.organization_id).toBe(organizationId);
    expect(fetchedUser.name).toBe(testName);
    expect(fetchedUser.email).toBe(testEmail);
    expect(fetchedUser.password_hash).toBe(passwordHash);
    expect(fetchedUser.created_at).toEqual(originalUser.created_at);
    expect(fetchedUser.updated_at).toEqual(originalUser.updated_at);
  });
});