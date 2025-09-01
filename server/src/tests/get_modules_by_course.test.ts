import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, coursesTable, modulesTable } from '../db/schema';
import { getModulesByCourse } from '../handlers/get_modules_by_course';

describe('getModulesByCourse', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return modules ordered by sequence', async () => {
    // Create test data
    const org = await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'Test organization for modules'
    }).returning().execute();

    const lms = await db.insert(lmsTable).values({
      organization_id: org[0].id,
      name: 'Test LMS',
      description: 'Test LMS for modules'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      lms_id: lms[0].id,
      title: 'Test Course',
      slug: 'test-course',
      status: 'published'
    }).returning().execute();

    // Insert modules in different order than sequence
    const modules = await db.insert(modulesTable).values([
      {
        course_id: course[0].id,
        title: 'Module 3',
        description: 'Third module',
        order: 3
      },
      {
        course_id: course[0].id,
        title: 'Module 1',
        description: 'First module',
        order: 1
      },
      {
        course_id: course[0].id,
        title: 'Module 2',
        description: 'Second module',
        order: 2
      }
    ]).returning().execute();

    const result = await getModulesByCourse(course[0].id);

    // Should return 3 modules ordered by sequence
    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Module 1');
    expect(result[0].order).toEqual(1);
    expect(result[1].title).toEqual('Module 2');
    expect(result[1].order).toEqual(2);
    expect(result[2].title).toEqual('Module 3');
    expect(result[2].order).toEqual(3);

    // Verify all fields are present
    result.forEach(module => {
      expect(module.id).toBeDefined();
      expect(module.course_id).toEqual(course[0].id);
      expect(module.title).toBeDefined();
      expect(module.created_at).toBeInstanceOf(Date);
      expect(module.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return empty array for course with no modules', async () => {
    // Create test data without modules
    const org = await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'Test organization'
    }).returning().execute();

    const lms = await db.insert(lmsTable).values({
      organization_id: org[0].id,
      name: 'Test LMS',
      description: 'Test LMS'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      lms_id: lms[0].id,
      title: 'Empty Course',
      slug: 'empty-course',
      status: 'draft'
    }).returning().execute();

    const result = await getModulesByCourse(course[0].id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent course', async () => {
    const result = await getModulesByCourse(999999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return modules for specified course', async () => {
    // Create test data with multiple courses
    const org = await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'Test organization'
    }).returning().execute();

    const lms = await db.insert(lmsTable).values({
      organization_id: org[0].id,
      name: 'Test LMS',
      description: 'Test LMS'
    }).returning().execute();

    const courses = await db.insert(coursesTable).values([
      {
        lms_id: lms[0].id,
        title: 'Course 1',
        slug: 'course-1',
        status: 'published'
      },
      {
        lms_id: lms[0].id,
        title: 'Course 2',
        slug: 'course-2',
        status: 'published'
      }
    ]).returning().execute();

    // Add modules to both courses
    await db.insert(modulesTable).values([
      {
        course_id: courses[0].id,
        title: 'Course 1 Module 1',
        order: 1
      },
      {
        course_id: courses[0].id,
        title: 'Course 1 Module 2',
        order: 2
      },
      {
        course_id: courses[1].id,
        title: 'Course 2 Module 1',
        order: 1
      }
    ]).execute();

    const result = await getModulesByCourse(courses[0].id);

    // Should only return modules for course 1
    expect(result).toHaveLength(2);
    result.forEach(module => {
      expect(module.course_id).toEqual(courses[0].id);
      expect(module.title.startsWith('Course 1')).toBe(true);
    });
  });

  it('should handle modules with zero order correctly', async () => {
    // Create test data
    const org = await db.insert(organizationsTable).values({
      name: 'Test Organization',
      description: 'Test organization'
    }).returning().execute();

    const lms = await db.insert(lmsTable).values({
      organization_id: org[0].id,
      name: 'Test LMS',
      description: 'Test LMS'
    }).returning().execute();

    const course = await db.insert(coursesTable).values({
      lms_id: lms[0].id,
      title: 'Test Course',
      slug: 'test-course',
      status: 'published'
    }).returning().execute();

    // Insert modules with order starting from 0
    await db.insert(modulesTable).values([
      {
        course_id: course[0].id,
        title: 'Module 0',
        order: 0
      },
      {
        course_id: course[0].id,
        title: 'Module 1',
        order: 1
      }
    ]).execute();

    const result = await getModulesByCourse(course[0].id);

    // Should return modules ordered correctly, starting from 0
    expect(result).toHaveLength(2);
    expect(result[0].title).toEqual('Module 0');
    expect(result[0].order).toEqual(0);
    expect(result[1].title).toEqual('Module 1');
    expect(result[1].order).toEqual(1);
    result.forEach(module => {
      expect(module.course_id).toEqual(course[0].id);
    });
  });
});