import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable } from '../db/schema';
import { type CreateOrganizationInput, type CreateLMSInput } from '../schema';
import { getLMSByOrganization } from '../handlers/get_lms_by_organization';

// Test data
const testOrg1: CreateOrganizationInput = {
  name: 'Test Organization 1',
  description: 'First test organization'
};

const testOrg2: CreateOrganizationInput = {
  name: 'Test Organization 2',
  description: 'Second test organization'
};

describe('getLMSByOrganization', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all LMS instances for a specific organization', async () => {
    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values(testOrg1)
      .returning()
      .execute();

    // Create multiple LMS instances for the organization
    const lms1Input: CreateLMSInput = {
      organization_id: organization.id,
      name: 'Primary LMS',
      description: 'Main learning management system'
    };

    const lms2Input: CreateLMSInput = {
      organization_id: organization.id,
      name: 'Secondary LMS',
      description: 'Additional LMS for specialized courses'
    };

    const [lms1] = await db.insert(lmsTable)
      .values(lms1Input)
      .returning()
      .execute();

    const [lms2] = await db.insert(lmsTable)
      .values(lms2Input)
      .returning()
      .execute();

    // Test the handler
    const result = await getLMSByOrganization(organization.id);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Sort results by id to ensure consistent ordering for testing
    const sortedResult = result.sort((a, b) => a.id - b.id);
    
    expect(sortedResult[0].id).toEqual(lms1.id);
    expect(sortedResult[0].organization_id).toEqual(organization.id);
    expect(sortedResult[0].name).toEqual('Primary LMS');
    expect(sortedResult[0].description).toEqual('Main learning management system');
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);
    expect(sortedResult[0].updated_at).toBeInstanceOf(Date);

    expect(sortedResult[1].id).toEqual(lms2.id);
    expect(sortedResult[1].organization_id).toEqual(organization.id);
    expect(sortedResult[1].name).toEqual('Secondary LMS');
    expect(sortedResult[1].description).toEqual('Additional LMS for specialized courses');
    expect(sortedResult[1].created_at).toBeInstanceOf(Date);
    expect(sortedResult[1].updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when organization has no LMS instances', async () => {
    // Create test organization without LMS instances
    const [organization] = await db.insert(organizationsTable)
      .values(testOrg1)
      .returning()
      .execute();

    // Test the handler
    const result = await getLMSByOrganization(organization.id);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent organization', async () => {
    // Test with non-existent organization ID
    const result = await getLMSByOrganization(999);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return LMS instances for the specified organization', async () => {
    // Create two test organizations
    const [organization1] = await db.insert(organizationsTable)
      .values(testOrg1)
      .returning()
      .execute();

    const [organization2] = await db.insert(organizationsTable)
      .values(testOrg2)
      .returning()
      .execute();

    // Create LMS instances for both organizations
    const lms1Input: CreateLMSInput = {
      organization_id: organization1.id,
      name: 'Org1 LMS',
      description: 'LMS for organization 1'
    };

    const lms2Input: CreateLMSInput = {
      organization_id: organization2.id,
      name: 'Org2 LMS',
      description: 'LMS for organization 2'
    };

    const lms3Input: CreateLMSInput = {
      organization_id: organization1.id,
      name: 'Another Org1 LMS',
      description: 'Second LMS for organization 1'
    };

    await db.insert(lmsTable)
      .values([lms1Input, lms2Input, lms3Input])
      .execute();

    // Test that only organization 1 LMS instances are returned
    const result = await getLMSByOrganization(organization1.id);

    // Verify results
    expect(result).toHaveLength(2);
    result.forEach(lms => {
      expect(lms.organization_id).toEqual(organization1.id);
    });

    // Verify the names are correct (should only be org1 LMS instances)
    const lmsNames = result.map(lms => lms.name).sort();
    expect(lmsNames).toEqual(['Another Org1 LMS', 'Org1 LMS']);
  });

  it('should handle LMS instances with null descriptions', async () => {
    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values(testOrg1)
      .returning()
      .execute();

    // Create LMS with null description
    const lmsInput: CreateLMSInput = {
      organization_id: organization.id,
      name: 'LMS with null description',
      description: null
    };

    await db.insert(lmsTable)
      .values(lmsInput)
      .execute();

    // Test the handler
    const result = await getLMSByOrganization(organization.id);

    // Verify results
    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('LMS with null description');
    expect(result[0].description).toBeNull();
  });

  it('should return results ordered by creation time', async () => {
    // Create test organization
    const [organization] = await db.insert(organizationsTable)
      .values(testOrg1)
      .returning()
      .execute();

    // Create multiple LMS instances with slight delay to ensure different creation times
    const lms1Input: CreateLMSInput = {
      organization_id: organization.id,
      name: 'First LMS',
      description: 'Created first'
    };

    const [firstLms] = await db.insert(lmsTable)
      .values(lms1Input)
      .returning()
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const lms2Input: CreateLMSInput = {
      organization_id: organization.id,
      name: 'Second LMS',
      description: 'Created second'
    };

    const [secondLms] = await db.insert(lmsTable)
      .values(lms2Input)
      .returning()
      .execute();

    // Test the handler
    const result = await getLMSByOrganization(organization.id);

    // Verify results are in creation order
    expect(result).toHaveLength(2);
    expect(result[0].id).toEqual(firstLms.id);
    expect(result[1].id).toEqual(secondLms.id);
    expect(result[0].created_at <= result[1].created_at).toBe(true);
  });
});