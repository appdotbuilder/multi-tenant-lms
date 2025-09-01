import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable } from '../db/schema';
import { type CreateOrganizationInput } from '../schema';
import { getOrganizations } from '../handlers/get_organizations';

describe('getOrganizations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no organizations exist', async () => {
    const result = await getOrganizations();

    expect(result).toEqual([]);
  });

  it('should return all organizations', async () => {
    // Create test organizations
    const testOrg1: CreateOrganizationInput = {
      name: 'Test Organization 1',
      description: 'First test organization'
    };

    const testOrg2: CreateOrganizationInput = {
      name: 'Test Organization 2',
      description: null
    };

    // Insert organizations directly into database
    await db.insert(organizationsTable)
      .values([
        {
          name: testOrg1.name,
          description: testOrg1.description
        },
        {
          name: testOrg2.name,
          description: testOrg2.description
        }
      ])
      .execute();

    const result = await getOrganizations();

    expect(result).toHaveLength(2);
    
    // Verify first organization
    const org1 = result.find(org => org.name === 'Test Organization 1');
    expect(org1).toBeDefined();
    expect(org1!.description).toEqual('First test organization');
    expect(org1!.id).toBeDefined();
    expect(org1!.created_at).toBeInstanceOf(Date);
    expect(org1!.updated_at).toBeInstanceOf(Date);

    // Verify second organization
    const org2 = result.find(org => org.name === 'Test Organization 2');
    expect(org2).toBeDefined();
    expect(org2!.description).toBeNull();
    expect(org2!.id).toBeDefined();
    expect(org2!.created_at).toBeInstanceOf(Date);
    expect(org2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return organizations in database order', async () => {
    // Create multiple organizations with specific names for order testing
    const orgNames = ['Alpha Corp', 'Beta Inc', 'Charlie LLC', 'Delta Ltd'];

    for (const name of orgNames) {
      await db.insert(organizationsTable)
        .values({
          name: name,
          description: `Description for ${name}`
        })
        .execute();
    }

    const result = await getOrganizations();

    expect(result).toHaveLength(4);
    
    // Verify all organizations are returned
    const resultNames = result.map(org => org.name);
    orgNames.forEach(name => {
      expect(resultNames).toContain(name);
    });

    // Verify each organization has required fields
    result.forEach(org => {
      expect(org.id).toBeDefined();
      expect(typeof org.id).toBe('number');
      expect(org.name).toBeDefined();
      expect(typeof org.name).toBe('string');
      expect(org.created_at).toBeInstanceOf(Date);
      expect(org.updated_at).toBeInstanceOf(Date);
      // description can be null or string
      expect(org.description === null || typeof org.description === 'string').toBe(true);
    });
  });

  it('should handle large number of organizations', async () => {
    // Create 50 organizations to test performance
    const organizations = [];
    for (let i = 1; i <= 50; i++) {
      organizations.push({
        name: `Organization ${i.toString().padStart(2, '0')}`,
        description: i % 3 === 0 ? null : `Description for organization ${i}`
      });
    }

    await db.insert(organizationsTable)
      .values(organizations)
      .execute();

    const result = await getOrganizations();

    expect(result).toHaveLength(50);
    
    // Verify some random entries
    const org1 = result.find(org => org.name === 'Organization 01');
    expect(org1).toBeDefined();
    expect(org1!.description).toEqual('Description for organization 1');

    const org15 = result.find(org => org.name === 'Organization 15');
    expect(org15).toBeDefined();
    expect(org15!.description).toBeNull(); // 15 % 3 === 0, so null

    const org25 = result.find(org => org.name === 'Organization 25');
    expect(org25).toBeDefined();
    expect(org25!.description).toEqual('Description for organization 25');
  });
});