import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { modulesTable, organizationsTable, lmsTable, coursesTable } from '../db/schema';
import { type CreateModuleInput } from '../schema';
import { createModule } from '../handlers/create_module';
import { eq } from 'drizzle-orm';

// Test input
const testInput: CreateModuleInput = {
  course_id: 1,
  title: 'Introduction to Programming',
  description: 'Learn the basics of programming',
  order: 1
};

describe('createModule', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a module', async () => {
    // Create prerequisite organization, LMS, and course
    await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'A test organization'
    }).execute();

    await db.insert(lmsTable).values({
      organization_id: 1,
      name: 'Test LMS',
      description: 'A test LMS'
    }).execute();

    await db.insert(coursesTable).values({
      lms_id: 1,
      title: 'Test Course',
      description: 'A test course',
      slug: 'test-course',
      status: 'draft'
    }).execute();

    const result = await createModule(testInput);

    // Basic field validation
    expect(result.title).toEqual('Introduction to Programming');
    expect(result.description).toEqual('Learn the basics of programming');
    expect(result.course_id).toEqual(1);
    expect(result.order).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save module to database', async () => {
    // Create prerequisite organization, LMS, and course
    await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'A test organization'
    }).execute();

    await db.insert(lmsTable).values({
      organization_id: 1,
      name: 'Test LMS',
      description: 'A test LMS'
    }).execute();

    await db.insert(coursesTable).values({
      lms_id: 1,
      title: 'Test Course',
      description: 'A test course',
      slug: 'test-course',
      status: 'draft'
    }).execute();

    const result = await createModule(testInput);

    // Query using proper drizzle syntax
    const modules = await db.select()
      .from(modulesTable)
      .where(eq(modulesTable.id, result.id))
      .execute();

    expect(modules).toHaveLength(1);
    expect(modules[0].title).toEqual('Introduction to Programming');
    expect(modules[0].description).toEqual('Learn the basics of programming');
    expect(modules[0].course_id).toEqual(1);
    expect(modules[0].order).toEqual(1);
    expect(modules[0].created_at).toBeInstanceOf(Date);
    expect(modules[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create module with nullable description', async () => {
    // Create prerequisite organization, LMS, and course
    await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'A test organization'
    }).execute();

    await db.insert(lmsTable).values({
      organization_id: 1,
      name: 'Test LMS',
      description: 'A test LMS'
    }).execute();

    await db.insert(coursesTable).values({
      lms_id: 1,
      title: 'Test Course',
      description: 'A test course',
      slug: 'test-course',
      status: 'draft'
    }).execute();

    const inputWithNullDescription: CreateModuleInput = {
      course_id: 1,
      title: 'Advanced Topics',
      description: null,
      order: 2
    };

    const result = await createModule(inputWithNullDescription);

    expect(result.title).toEqual('Advanced Topics');
    expect(result.description).toBeNull();
    expect(result.course_id).toEqual(1);
    expect(result.order).toEqual(2);
  });

  it('should handle multiple modules for same course', async () => {
    // Create prerequisite organization, LMS, and course
    await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'A test organization'
    }).execute();

    await db.insert(lmsTable).values({
      organization_id: 1,
      name: 'Test LMS',
      description: 'A test LMS'
    }).execute();

    await db.insert(coursesTable).values({
      lms_id: 1,
      title: 'Test Course',
      description: 'A test course',
      slug: 'test-course',
      status: 'draft'
    }).execute();

    // Create first module
    const firstModule = await createModule({
      course_id: 1,
      title: 'Module 1',
      description: 'First module',
      order: 1
    });

    // Create second module
    const secondModule = await createModule({
      course_id: 1,
      title: 'Module 2', 
      description: 'Second module',
      order: 2
    });

    expect(firstModule.id).not.toEqual(secondModule.id);
    expect(firstModule.order).toEqual(1);
    expect(secondModule.order).toEqual(2);
    expect(firstModule.course_id).toEqual(secondModule.course_id);
  });

  it('should reject creation with non-existent course_id', async () => {
    const inputWithInvalidCourse: CreateModuleInput = {
      course_id: 999, // Non-existent course
      title: 'Invalid Module',
      description: 'This should fail',
      order: 1
    };

    await expect(createModule(inputWithInvalidCourse)).rejects.toThrow(/foreign key constraint/i);
  });
});