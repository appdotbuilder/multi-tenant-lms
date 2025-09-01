import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { coursesTable, lmsTable, organizationsTable } from '../db/schema';
import { type CreateCourseInput } from '../schema';
import { createCourse } from '../handlers/create_course';
import { eq } from 'drizzle-orm';

describe('createCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testLmsId: number;

  beforeEach(async () => {
    // Create prerequisite organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'An organization for testing'
      })
      .returning()
      .execute();

    // Create prerequisite LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: orgResult[0].id,
        name: 'Test LMS',
        description: 'An LMS for testing'
      })
      .returning()
      .execute();

    testLmsId = lmsResult[0].id;
  });

  it('should create a course with all fields', async () => {
    const testInput: CreateCourseInput = {
      lms_id: testLmsId,
      title: 'Advanced JavaScript',
      description: 'Learn advanced JavaScript concepts',
      slug: 'advanced-javascript',
      meta_title: 'Advanced JavaScript Course - Learn JS',
      meta_description: 'Master advanced JavaScript with our comprehensive course',
      keywords: 'javascript, programming, web development',
      thumbnail_url: 'https://example.com/thumbnail.jpg',
      duration_hours: 25.5,
      status: 'published'
    };

    const result = await createCourse(testInput);

    // Basic field validation
    expect(result.lms_id).toEqual(testLmsId);
    expect(result.title).toEqual('Advanced JavaScript');
    expect(result.description).toEqual('Learn advanced JavaScript concepts');
    expect(result.slug).toEqual('advanced-javascript');
    expect(result.meta_title).toEqual('Advanced JavaScript Course - Learn JS');
    expect(result.meta_description).toEqual('Master advanced JavaScript with our comprehensive course');
    expect(result.keywords).toEqual('javascript, programming, web development');
    expect(result.thumbnail_url).toEqual('https://example.com/thumbnail.jpg');
    expect(result.duration_hours).toEqual(25.5);
    expect(typeof result.duration_hours).toEqual('number');
    expect(result.status).toEqual('published');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a course with minimal fields', async () => {
    const testInput: CreateCourseInput = {
      lms_id: testLmsId,
      title: 'Basic HTML',
      description: null,
      slug: 'basic-html',
      meta_title: null,
      meta_description: null,
      keywords: null,
      thumbnail_url: null,
      duration_hours: null,
      status: 'draft'
    };

    const result = await createCourse(testInput);

    expect(result.lms_id).toEqual(testLmsId);
    expect(result.title).toEqual('Basic HTML');
    expect(result.description).toBeNull();
    expect(result.slug).toEqual('basic-html');
    expect(result.meta_title).toBeNull();
    expect(result.meta_description).toBeNull();
    expect(result.keywords).toBeNull();
    expect(result.thumbnail_url).toBeNull();
    expect(result.duration_hours).toBeNull();
    expect(result.status).toEqual('draft');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save course to database', async () => {
    const testInput: CreateCourseInput = {
      lms_id: testLmsId,
      title: 'React Fundamentals',
      description: 'Learn React from scratch',
      slug: 'react-fundamentals',
      meta_title: 'React Fundamentals Course',
      meta_description: 'Master React with our beginner-friendly course',
      keywords: 'react, javascript, frontend',
      thumbnail_url: 'https://example.com/react-thumb.jpg',
      duration_hours: 15.0,
      status: 'published'
    };

    const result = await createCourse(testInput);

    // Query using proper drizzle syntax
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(courses).toHaveLength(1);
    expect(courses[0].title).toEqual('React Fundamentals');
    expect(courses[0].description).toEqual('Learn React from scratch');
    expect(courses[0].slug).toEqual('react-fundamentals');
    expect(courses[0].meta_title).toEqual('React Fundamentals Course');
    expect(courses[0].meta_description).toEqual('Master React with our beginner-friendly course');
    expect(courses[0].keywords).toEqual('react, javascript, frontend');
    expect(courses[0].thumbnail_url).toEqual('https://example.com/react-thumb.jpg');
    expect(parseFloat(courses[0].duration_hours!)).toEqual(15.0);
    expect(courses[0].status).toEqual('published');
    expect(courses[0].created_at).toBeInstanceOf(Date);
    expect(courses[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric duration_hours correctly', async () => {
    const testInput: CreateCourseInput = {
      lms_id: testLmsId,
      title: 'Python Basics',
      description: 'Introduction to Python programming',
      slug: 'python-basics',
      meta_title: null,
      meta_description: null,
      keywords: null,
      thumbnail_url: null,
      duration_hours: 12.75,
      status: 'draft'
    };

    const result = await createCourse(testInput);

    // Verify numeric conversion is handled correctly
    expect(result.duration_hours).toEqual(12.75);
    expect(typeof result.duration_hours).toEqual('number');

    // Check database storage
    const courses = await db.select()
      .from(coursesTable)
      .where(eq(coursesTable.id, result.id))
      .execute();

    expect(parseFloat(courses[0].duration_hours!)).toEqual(12.75);
  });

  it('should throw error for non-existent lms_id', async () => {
    const testInput: CreateCourseInput = {
      lms_id: 99999, // Non-existent LMS ID
      title: 'Test Course',
      description: 'Test description',
      slug: 'test-course',
      meta_title: null,
      meta_description: null,
      keywords: null,
      thumbnail_url: null,
      duration_hours: null,
      status: 'draft'
    };

    await expect(createCourse(testInput)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should handle different course statuses', async () => {
    const statuses: Array<'draft' | 'published' | 'archived'> = ['draft', 'published', 'archived'];

    for (const status of statuses) {
      const testInput: CreateCourseInput = {
        lms_id: testLmsId,
        title: `Course - ${status}`,
        description: `A course with ${status} status`,
        slug: `course-${status}`,
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: status
      };

      const result = await createCourse(testInput);
      expect(result.status).toEqual(status);
      expect(result.title).toEqual(`Course - ${status}`);
    }
  });
});