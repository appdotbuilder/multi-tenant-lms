import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { lmsTable, organizationsTable } from '../db/schema';
import { type CreateLMSInput } from '../schema';
import { createLMS } from '../handlers/create_lms';
import { eq } from 'drizzle-orm';

// Test data
const testOrganization = {
  name: 'Test Organization',
  description: 'An organization for testing'
};

const testInput: CreateLMSInput = {
  organization_id: 1, // Will be set after creating organization
  name: 'Test LMS',
  description: 'An LMS for testing'
};

const testInputMinimal: CreateLMSInput = {
  organization_id: 1, // Will be set after creating organization
  name: 'Minimal LMS',
  description: null
};

describe('createLMS', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an LMS with all fields', async () => {
    // Create prerequisite organization
    const [org] = await db.insert(organizationsTable)
      .values(testOrganization)
      .returning()
      .execute();

    const input = { ...testInput, organization_id: org.id };
    const result = await createLMS(input);

    // Basic field validation
    expect(result.name).toEqual('Test LMS');
    expect(result.description).toEqual('An LMS for testing');
    expect(result.organization_id).toEqual(org.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an LMS with minimal fields (null description)', async () => {
    // Create prerequisite organization
    const [org] = await db.insert(organizationsTable)
      .values(testOrganization)
      .returning()
      .execute();

    const input = { ...testInputMinimal, organization_id: org.id };
    const result = await createLMS(input);

    // Basic field validation
    expect(result.name).toEqual('Minimal LMS');
    expect(result.description).toBeNull();
    expect(result.organization_id).toEqual(org.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save LMS to database', async () => {
    // Create prerequisite organization
    const [org] = await db.insert(organizationsTable)
      .values(testOrganization)
      .returning()
      .execute();

    const input = { ...testInput, organization_id: org.id };
    const result = await createLMS(input);

    // Query using proper drizzle syntax
    const lmsInstances = await db.select()
      .from(lmsTable)
      .where(eq(lmsTable.id, result.id))
      .execute();

    expect(lmsInstances).toHaveLength(1);
    expect(lmsInstances[0].name).toEqual('Test LMS');
    expect(lmsInstances[0].description).toEqual('An LMS for testing');
    expect(lmsInstances[0].organization_id).toEqual(org.id);
    expect(lmsInstances[0].created_at).toBeInstanceOf(Date);
    expect(lmsInstances[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create multiple LMS instances for the same organization', async () => {
    // Create prerequisite organization
    const [org] = await db.insert(organizationsTable)
      .values(testOrganization)
      .returning()
      .execute();

    // Create first LMS
    const input1 = { ...testInput, organization_id: org.id };
    const result1 = await createLMS(input1);

    // Create second LMS
    const input2 = { 
      organization_id: org.id,
      name: 'Second LMS',
      description: 'Another LMS for the same organization'
    };
    const result2 = await createLMS(input2);

    // Verify both LMS instances exist
    const lmsInstances = await db.select()
      .from(lmsTable)
      .where(eq(lmsTable.organization_id, org.id))
      .execute();

    expect(lmsInstances).toHaveLength(2);
    expect(lmsInstances.map(lms => lms.name)).toContain('Test LMS');
    expect(lmsInstances.map(lms => lms.name)).toContain('Second LMS');
    expect(result1.id).not.toEqual(result2.id);
  });

  it('should fail when organization does not exist', async () => {
    const input = { ...testInput, organization_id: 9999 };

    await expect(createLMS(input)).rejects.toThrow(/violates foreign key constraint/i);
  });
});