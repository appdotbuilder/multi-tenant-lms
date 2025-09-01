import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { organizationsTable, lmsTable, coursesTable, modulesTable, lessonsTable } from '../db/schema';
import { type CreateLessonInput } from '../schema';
import { createLesson } from '../handlers/create_lesson';
import { eq } from 'drizzle-orm';

// Test data setup
let testOrganization: any;
let testLms: any;
let testCourse: any;
let testModule: any;

const testLessonInput: CreateLessonInput = {
  module_id: 0, // Will be set after module creation
  title: 'Introduction to JavaScript',
  description: 'Learn the basics of JavaScript programming',
  content: 'JavaScript is a versatile programming language...',
  type: 'video',
  order: 1
};

describe('createLesson', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create prerequisite organization
    const orgResult = await db.insert(organizationsTable)
      .values({
        name: 'Test Organization',
        description: 'Organization for testing'
      })
      .returning()
      .execute();
    testOrganization = orgResult[0];

    // Create prerequisite LMS
    const lmsResult = await db.insert(lmsTable)
      .values({
        organization_id: testOrganization.id,
        name: 'Test LMS',
        description: 'LMS for testing'
      })
      .returning()
      .execute();
    testLms = lmsResult[0];

    // Create prerequisite course
    const courseResult = await db.insert(coursesTable)
      .values({
        lms_id: testLms.id,
        title: 'JavaScript Programming Course',
        description: 'Learn JavaScript from scratch',
        slug: 'javascript-programming',
        status: 'draft'
      })
      .returning()
      .execute();
    testCourse = courseResult[0];

    // Create prerequisite module
    const moduleResult = await db.insert(modulesTable)
      .values({
        course_id: testCourse.id,
        title: 'JavaScript Fundamentals',
        description: 'Basic JavaScript concepts',
        order: 1
      })
      .returning()
      .execute();
    testModule = moduleResult[0];

    // Update test input with actual module_id
    testLessonInput.module_id = testModule.id;
  });

  afterEach(resetDB);

  it('should create a lesson successfully', async () => {
    const result = await createLesson(testLessonInput);

    // Verify basic fields
    expect(result.module_id).toBe(testModule.id);
    expect(result.title).toBe('Introduction to JavaScript');
    expect(result.description).toBe('Learn the basics of JavaScript programming');
    expect(result.content).toBe('JavaScript is a versatile programming language...');
    expect(result.type).toBe('video');
    expect(result.order).toBe(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save lesson to database', async () => {
    const result = await createLesson(testLessonInput);

    // Query the database to verify the lesson was saved
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, result.id))
      .execute();

    expect(lessons).toHaveLength(1);
    expect(lessons[0].title).toBe('Introduction to JavaScript');
    expect(lessons[0].description).toBe('Learn the basics of JavaScript programming');
    expect(lessons[0].content).toBe('JavaScript is a versatile programming language...');
    expect(lessons[0].type).toBe('video');
    expect(lessons[0].order).toBe(1);
    expect(lessons[0].module_id).toBe(testModule.id);
    expect(lessons[0].created_at).toBeInstanceOf(Date);
    expect(lessons[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create lesson with different lesson types', async () => {
    const testCases = [
      { type: 'text' as const, title: 'Text Lesson' },
      { type: 'quiz' as const, title: 'Quiz Lesson' },
      { type: 'file' as const, title: 'File Lesson' }
    ];

    for (const testCase of testCases) {
      const input: CreateLessonInput = {
        ...testLessonInput,
        title: testCase.title,
        type: testCase.type,
        order: testCases.indexOf(testCase) + 2 // Avoid order conflicts
      };

      const result = await createLesson(input);
      expect(result.type).toBe(testCase.type);
      expect(result.title).toBe(testCase.title);
    }
  });

  it('should create lesson with nullable fields as null', async () => {
    const input: CreateLessonInput = {
      module_id: testModule.id,
      title: 'Minimal Lesson',
      description: null,
      content: null,
      type: 'text',
      order: 0
    };

    const result = await createLesson(input);

    expect(result.title).toBe('Minimal Lesson');
    expect(result.description).toBeNull();
    expect(result.content).toBeNull();
    expect(result.type).toBe('text');
    expect(result.order).toBe(0);
  });

  it('should create lessons with different order values', async () => {
    const lesson1 = await createLesson({
      ...testLessonInput,
      title: 'First Lesson',
      order: 1
    });

    const lesson2 = await createLesson({
      ...testLessonInput,
      title: 'Second Lesson',
      order: 2
    });

    expect(lesson1.order).toBe(1);
    expect(lesson2.order).toBe(2);

    // Verify both lessons exist in database
    const lessons = await db.select()
      .from(lessonsTable)
      .where(eq(lessonsTable.module_id, testModule.id))
      .execute();

    expect(lessons).toHaveLength(2);
    expect(lessons.find(l => l.title === 'First Lesson')?.order).toBe(1);
    expect(lessons.find(l => l.title === 'Second Lesson')?.order).toBe(2);
  });

  it('should handle foreign key constraint violation', async () => {
    const invalidInput: CreateLessonInput = {
      module_id: 99999, // Non-existent module
      title: 'Invalid Lesson',
      description: 'This should fail',
      content: 'Content',
      type: 'video',
      order: 1
    };

    await expect(createLesson(invalidInput)).rejects.toThrow(/foreign key constraint/i);
  });

  it('should handle unique constraint violation for order per module', async () => {
    // Create first lesson
    await createLesson(testLessonInput);

    // Try to create another lesson with same order in same module
    const duplicateOrderInput: CreateLessonInput = {
      ...testLessonInput,
      title: 'Duplicate Order Lesson',
      order: testLessonInput.order // Same order as first lesson
    };

    await expect(createLesson(duplicateOrderInput)).rejects.toThrow(/unique/i);
  });
});