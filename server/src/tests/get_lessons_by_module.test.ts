import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, coursesTable, modulesTable, lessonsTable } from '../db/schema';
import { getLessonsByModule } from '../handlers/get_lessons_by_module';
import { eq } from 'drizzle-orm';

describe('getLessonsByModule', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return lessons ordered by their sequence', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({ 
        organization_id: organization.id,
        name: 'Test LMS',
        description: null
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: null,
        slug: 'test-course',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft'
      })
      .returning()
      .execute();

    const [module] = await db.insert(modulesTable)
      .values({
        course_id: course.id,
        title: 'Test Module',
        description: null,
        order: 1
      })
      .returning()
      .execute();

    // Create lessons with different orders (insert in non-sequential order to test ordering)
    await db.insert(lessonsTable)
      .values([
        {
          module_id: module.id,
          title: 'Lesson 3',
          description: 'Third lesson',
          content: 'Content 3',
          type: 'text',
          order: 3
        },
        {
          module_id: module.id,
          title: 'Lesson 1',
          description: 'First lesson',
          content: 'Content 1',
          type: 'video',
          order: 1
        },
        {
          module_id: module.id,
          title: 'Lesson 2',
          description: 'Second lesson',
          content: 'Content 2',
          type: 'quiz',
          order: 2
        }
      ])
      .execute();

    const result = await getLessonsByModule(module.id);

    expect(result).toHaveLength(3);
    
    // Verify lessons are ordered by sequence
    expect(result[0].title).toEqual('Lesson 1');
    expect(result[0].order).toEqual(1);
    expect(result[0].type).toEqual('video');
    
    expect(result[1].title).toEqual('Lesson 2');
    expect(result[1].order).toEqual(2);
    expect(result[1].type).toEqual('quiz');
    
    expect(result[2].title).toEqual('Lesson 3');
    expect(result[2].order).toEqual(3);
    expect(result[2].type).toEqual('text');

    // Verify all fields are present and properly typed
    result.forEach(lesson => {
      expect(lesson.id).toBeDefined();
      expect(lesson.module_id).toEqual(module.id);
      expect(lesson.title).toBeDefined();
      expect(lesson.created_at).toBeInstanceOf(Date);
      expect(lesson.updated_at).toBeInstanceOf(Date);
      expect(['video', 'text', 'quiz', 'file']).toContain(lesson.type);
      expect(typeof lesson.order).toBe('number');
    });
  });

  it('should return empty array for module with no lessons', async () => {
    // Create prerequisite data without lessons
    const [organization] = await db.insert(organizationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({ 
        organization_id: organization.id,
        name: 'Test LMS',
        description: null
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: null,
        slug: 'test-course',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft'
      })
      .returning()
      .execute();

    const [module] = await db.insert(modulesTable)
      .values({
        course_id: course.id,
        title: 'Empty Module',
        description: null,
        order: 1
      })
      .returning()
      .execute();

    const result = await getLessonsByModule(module.id);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent module', async () => {
    const result = await getLessonsByModule(99999);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should only return lessons for the specified module', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({ 
        organization_id: organization.id,
        name: 'Test LMS',
        description: null
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: null,
        slug: 'test-course',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft'
      })
      .returning()
      .execute();

    // Create two modules
    const [module1] = await db.insert(modulesTable)
      .values({
        course_id: course.id,
        title: 'Module 1',
        description: null,
        order: 1
      })
      .returning()
      .execute();

    const [module2] = await db.insert(modulesTable)
      .values({
        course_id: course.id,
        title: 'Module 2',
        description: null,
        order: 2
      })
      .returning()
      .execute();

    // Create lessons for both modules
    await db.insert(lessonsTable)
      .values([
        {
          module_id: module1.id,
          title: 'Module 1 Lesson 1',
          description: null,
          content: null,
          type: 'text',
          order: 1
        },
        {
          module_id: module1.id,
          title: 'Module 1 Lesson 2',
          description: null,
          content: null,
          type: 'video',
          order: 2
        },
        {
          module_id: module2.id,
          title: 'Module 2 Lesson 1',
          description: null,
          content: null,
          type: 'quiz',
          order: 1
        }
      ])
      .execute();

    const result = await getLessonsByModule(module1.id);

    expect(result).toHaveLength(2);
    
    // Verify only module 1 lessons are returned
    result.forEach(lesson => {
      expect(lesson.module_id).toEqual(module1.id);
      expect(lesson.title).toMatch(/^Module 1/);
    });

    // Verify proper ordering
    expect(result[0].order).toEqual(1);
    expect(result[1].order).toEqual(2);
  });

  it('should handle lessons with nullable fields correctly', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({ 
        organization_id: organization.id,
        name: 'Test LMS',
        description: null
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: null,
        slug: 'test-course',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft'
      })
      .returning()
      .execute();

    const [module] = await db.insert(modulesTable)
      .values({
        course_id: course.id,
        title: 'Test Module',
        description: null,
        order: 1
      })
      .returning()
      .execute();

    // Create lesson with nullable fields set to null
    await db.insert(lessonsTable)
      .values({
        module_id: module.id,
        title: 'Minimal Lesson',
        description: null,
        content: null,
        type: 'file',
        order: 1
      })
      .execute();

    const result = await getLessonsByModule(module.id);

    expect(result).toHaveLength(1);
    
    const lesson = result[0];
    expect(lesson.title).toEqual('Minimal Lesson');
    expect(lesson.description).toBeNull();
    expect(lesson.content).toBeNull();
    expect(lesson.type).toEqual('file');
    expect(lesson.order).toEqual(1);
    expect(lesson.module_id).toEqual(module.id);
  });

  it('should verify lessons are saved to database correctly', async () => {
    // Create prerequisite data
    const [organization] = await db.insert(organizationsTable)
      .values({ name: 'Test Org', description: null })
      .returning()
      .execute();

    const [lms] = await db.insert(lmsTable)
      .values({ 
        organization_id: organization.id,
        name: 'Test LMS',
        description: null
      })
      .returning()
      .execute();

    const [course] = await db.insert(coursesTable)
      .values({
        lms_id: lms.id,
        title: 'Test Course',
        description: null,
        slug: 'test-course',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft'
      })
      .returning()
      .execute();

    const [module] = await db.insert(modulesTable)
      .values({
        course_id: course.id,
        title: 'Test Module',
        description: null,
        order: 1
      })
      .returning()
      .execute();

    await db.insert(lessonsTable)
      .values({
        module_id: module.id,
        title: 'Test Lesson',
        description: 'Test Description',
        content: 'Test Content',
        type: 'text',
        order: 1
      })
      .execute();

    // Call the handler
    const result = await getLessonsByModule(module.id);

    // Verify by querying database directly
    const dbLessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.module_id, module.id))
      .execute();

    expect(result).toHaveLength(1);
    expect(dbLessons).toHaveLength(1);
    
    expect(result[0].title).toEqual(dbLessons[0].title);
    expect(result[0].description).toEqual(dbLessons[0].description);
    expect(result[0].content).toEqual(dbLessons[0].content);
    expect(result[0].type).toEqual(dbLessons[0].type);
    expect(result[0].order).toEqual(dbLessons[0].order);
  });
});