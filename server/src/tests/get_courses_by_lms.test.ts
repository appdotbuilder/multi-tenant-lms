import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, coursesTable } from '../db/schema';
import { type CreateOrganizationInput, type CreateLMSInput, type CreateCourseInput } from '../schema';
import { getCoursesByLMS } from '../handlers/get_courses_by_lms';
import { eq } from 'drizzle-orm';

describe('getCoursesByLMS', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return courses for a specific LMS', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Test organization description'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    // Create test LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Test LMS',
        description: 'Test LMS description'
      })
      .returning()
      .execute();
    const lmsId = lmsResult[0].id;

    // Create test courses
    const courseData = [
      {
        lms_id: lmsId,
        title: 'Course 1',
        description: 'First course description',
        slug: 'course-1',
        meta_title: 'Course 1 Meta Title',
        meta_description: 'Course 1 meta description',
        keywords: 'course, test, learning',
        thumbnail_url: 'https://example.com/thumb1.jpg',
        duration_hours: '10.5',
        status: 'published' as const
      },
      {
        lms_id: lmsId,
        title: 'Course 2',
        description: 'Second course description',
        slug: 'course-2',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft' as const
      }
    ];

    await db.insert(coursesTable)
      .values(courseData)
      .execute();

    // Test the handler
    const result = await getCoursesByLMS(lmsId);

    // Verify results
    expect(result).toHaveLength(2);
    
    // Check first course
    const course1 = result.find(c => c.slug === 'course-1');
    expect(course1).toBeDefined();
    expect(course1!.title).toEqual('Course 1');
    expect(course1!.description).toEqual('First course description');
    expect(course1!.slug).toEqual('course-1');
    expect(course1!.meta_title).toEqual('Course 1 Meta Title');
    expect(course1!.meta_description).toEqual('Course 1 meta description');
    expect(course1!.keywords).toEqual('course, test, learning');
    expect(course1!.thumbnail_url).toEqual('https://example.com/thumb1.jpg');
    expect(course1!.duration_hours).toEqual(10.5);
    expect(typeof course1!.duration_hours).toBe('number');
    expect(course1!.status).toEqual('published');
    expect(course1!.lms_id).toEqual(lmsId);
    expect(course1!.id).toBeDefined();
    expect(course1!.created_at).toBeInstanceOf(Date);
    expect(course1!.updated_at).toBeInstanceOf(Date);

    // Check second course
    const course2 = result.find(c => c.slug === 'course-2');
    expect(course2).toBeDefined();
    expect(course2!.title).toEqual('Course 2');
    expect(course2!.description).toEqual('Second course description');
    expect(course2!.slug).toEqual('course-2');
    expect(course2!.meta_title).toBeNull();
    expect(course2!.meta_description).toBeNull();
    expect(course2!.keywords).toBeNull();
    expect(course2!.thumbnail_url).toBeNull();
    expect(course2!.duration_hours).toBeNull();
    expect(course2!.status).toEqual('draft');
    expect(course2!.lms_id).toEqual(lmsId);
  });

  it('should return empty array when LMS has no courses', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Empty Organization',
        description: 'Organization with empty LMS'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    // Create test LMS with no courses
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Empty LMS',
        description: 'LMS with no courses'
      })
      .returning()
      .execute();
    const lmsId = lmsResult[0].id;

    // Test the handler
    const result = await getCoursesByLMS(lmsId);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent LMS', async () => {
    const nonExistentLmsId = 999999;

    // Test the handler with non-existent LMS ID
    const result = await getCoursesByLMS(nonExistentLmsId);

    // Verify empty result
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return courses for the specified LMS', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Multi-LMS Organization',
        description: 'Organization with multiple LMS instances'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    // Create two LMS instances
    const lmsResults = await db.insert(lmsTable)
      .values([
        {
          organization_id: organizationId,
          name: 'LMS 1',
          description: 'First LMS'
        },
        {
          organization_id: organizationId,
          name: 'LMS 2',
          description: 'Second LMS'
        }
      ])
      .returning()
      .execute();
    
    const lms1Id = lmsResults[0].id;
    const lms2Id = lmsResults[1].id;

    // Create courses for both LMS instances
    await db.insert(coursesTable)
      .values([
        {
          lms_id: lms1Id,
          title: 'LMS 1 Course',
          description: 'Course in first LMS',
          slug: 'lms1-course',
          status: 'published' as const,
          duration_hours: '5.0'
        },
        {
          lms_id: lms2Id,
          title: 'LMS 2 Course',
          description: 'Course in second LMS',
          slug: 'lms2-course',
          status: 'published' as const,
          duration_hours: '8.0'
        }
      ])
      .execute();

    // Test getting courses for LMS 1
    const lms1Courses = await getCoursesByLMS(lms1Id);
    expect(lms1Courses).toHaveLength(1);
    expect(lms1Courses[0].title).toEqual('LMS 1 Course');
    expect(lms1Courses[0].lms_id).toEqual(lms1Id);
    expect(lms1Courses[0].duration_hours).toEqual(5.0);

    // Test getting courses for LMS 2
    const lms2Courses = await getCoursesByLMS(lms2Id);
    expect(lms2Courses).toHaveLength(1);
    expect(lms2Courses[0].title).toEqual('LMS 2 Course');
    expect(lms2Courses[0].lms_id).toEqual(lms2Id);
    expect(lms2Courses[0].duration_hours).toEqual(8.0);
  });

  it('should handle courses with various statuses', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Status Test Organization',
        description: 'Testing course statuses'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    // Create test LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Status Test LMS',
        description: 'Testing course statuses'
      })
      .returning()
      .execute();
    const lmsId = lmsResult[0].id;

    // Create courses with different statuses
    await db.insert(coursesTable)
      .values([
        {
          lms_id: lmsId,
          title: 'Draft Course',
          description: 'Course in draft',
          slug: 'draft-course',
          status: 'draft' as const
        },
        {
          lms_id: lmsId,
          title: 'Published Course',
          description: 'Published course',
          slug: 'published-course',
          status: 'published' as const
        },
        {
          lms_id: lmsId,
          title: 'Archived Course',
          description: 'Archived course',
          slug: 'archived-course',
          status: 'archived' as const
        }
      ])
      .execute();

    // Test the handler
    const result = await getCoursesByLMS(lmsId);

    // Verify all courses are returned regardless of status
    expect(result).toHaveLength(3);
    
    const statuses = result.map(course => course.status).sort();
    expect(statuses).toEqual(['archived', 'draft', 'published']);
  });

  it('should preserve all course fields including nullable ones', async () => {
    // Create test organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Field Test Organization',
        description: 'Testing all course fields'
      })
      .returning()
      .execute();
    const organizationId = orgResult[0].id;

    // Create test LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: organizationId,
        name: 'Field Test LMS',
        description: 'Testing all course fields'
      })
      .returning()
      .execute();
    const lmsId = lmsResult[0].id;

    // Create course with all fields populated
    const courseResult = await db.insert(coursesTable)
      .values({
        lms_id: lmsId,
        title: 'Full Field Course',
        description: 'Course with all fields',
        slug: 'full-field-course',
        meta_title: 'SEO Meta Title',
        meta_description: 'SEO meta description for this course',
        keywords: 'keyword1, keyword2, keyword3',
        thumbnail_url: 'https://example.com/thumbnail.jpg',
        duration_hours: '15.75',
        status: 'published' as const
      })
      .returning()
      .execute();

    // Test the handler
    const result = await getCoursesByLMS(lmsId);

    expect(result).toHaveLength(1);
    const course = result[0];
    
    // Verify all fields are present and correctly typed
    expect(course.title).toEqual('Full Field Course');
    expect(course.description).toEqual('Course with all fields');
    expect(course.slug).toEqual('full-field-course');
    expect(course.meta_title).toEqual('SEO Meta Title');
    expect(course.meta_description).toEqual('SEO meta description for this course');
    expect(course.keywords).toEqual('keyword1, keyword2, keyword3');
    expect(course.thumbnail_url).toEqual('https://example.com/thumbnail.jpg');
    expect(course.duration_hours).toEqual(15.75);
    expect(typeof course.duration_hours).toBe('number');
    expect(course.status).toEqual('published');
    expect(course.id).toBeDefined();
    expect(course.lms_id).toEqual(lmsId);
    expect(course.created_at).toBeInstanceOf(Date);
    expect(course.updated_at).toBeInstanceOf(Date);
  });
});