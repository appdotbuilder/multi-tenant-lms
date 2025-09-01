import { db } from '../db';
import { enrollmentsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateEnrollmentInput, type Enrollment } from '../schema';

export const updateEnrollment = async (input: UpdateEnrollmentInput): Promise<Enrollment> => {
  try {
    // Build update data object with only defined fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.status !== undefined) {
      updateData.status = input.status;
    }

    if (input.completion_date !== undefined) {
      updateData.completion_date = input.completion_date;
    }

    // Update enrollment record
    const result = await db.update(enrollmentsTable)
      .set(updateData)
      .where(eq(enrollmentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Enrollment with id ${input.id} not found`);
    }

    // Return the updated enrollment with proper type conversion
    const enrollment = result[0];
    return {
      ...enrollment,
      // No numeric conversions needed - all fields are already correct types
    };
  } catch (error) {
    console.error('Enrollment update failed:', error);
    throw error;
  }
};