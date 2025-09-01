import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable } from '../db/schema';
import { type CreateOrganizationInput } from '../schema';
import { createOrganization } from '../handlers/create_organization';
import { eq } from 'drizzle-orm';

// Test inputs
const testInput: CreateOrganizationInput = {
  name: 'Test Organization',
  description: 'A test organization for unit testing'
};

const testInputWithNullDescription: CreateOrganizationInput = {
  name: 'Test Org Null Desc',
  description: null
};

describe('createOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an organization with description', async () => {
    const result = await createOrganization(testInput);

    // Basic field validation
    expect(result.name).toEqual('Test Organization');
    expect(result.description).toEqual('A test organization for unit testing');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an organization with null description', async () => {
    const result = await createOrganization(testInputWithNullDescription);

    // Basic field validation
    expect(result.name).toEqual('Test Org Null Desc');
    expect(result.description).toBeNull();
    expect(result.id).toBeDefined();
    expect(typeof result.id).toEqual('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save organization to database', async () => {
    const result = await createOrganization(testInput);

    // Query using proper drizzle syntax
    const organizations = await db.select()
      .from(organizationsTable)
      .where(eq(organizationsTable.id, result.id))
      .execute();

    expect(organizations).toHaveLength(1);
    expect(organizations[0].name).toEqual('Test Organization');
    expect(organizations[0].description).toEqual('A test organization for unit testing');
    expect(organizations[0].created_at).toBeInstanceOf(Date);
    expect(organizations[0].updated_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for multiple organizations', async () => {
    const firstOrg = await createOrganization({
      name: 'First Organization',
      description: 'First test org'
    });

    const secondOrg = await createOrganization({
      name: 'Second Organization',
      description: 'Second test org'
    });

    expect(firstOrg.id).not.toEqual(secondOrg.id);
    expect(typeof firstOrg.id).toEqual('number');
    expect(typeof secondOrg.id).toEqual('number');

    // Verify both are in database
    const allOrganizations = await db.select()
      .from(organizationsTable)
      .execute();

    expect(allOrganizations).toHaveLength(2);
    
    const names = allOrganizations.map(org => org.name).sort();
    expect(names).toEqual(['First Organization', 'Second Organization']);
  });

  it('should set created_at and updated_at timestamps', async () => {
    const beforeCreation = new Date();
    const result = await createOrganization(testInput);
    const afterCreation = new Date();

    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Timestamps should be within reasonable range
    expect(result.created_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime() - 1000);
    expect(result.created_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1000);
    expect(result.updated_at.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime() - 1000);
    expect(result.updated_at.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1000);
  });
});