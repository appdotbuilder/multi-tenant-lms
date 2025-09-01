import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/utils/trpc';
import type { 
  Organization, 
  LMS, 
  User, 
  Course, 
  Enrollment,
  CreateEnrollmentInput,
  UpdateEnrollmentInput
} from '../../../server/src/schema';

interface EnrollmentManagerProps {
  selectedOrganization: Organization | null;
  selectedLMS: LMS | null;
}

export function EnrollmentManager({ selectedOrganization, selectedLMS }: EnrollmentManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courseEnrollments, setCourseEnrollments] = useState<Enrollment[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [enrollmentForm, setEnrollmentForm] = useState<CreateEnrollmentInput>({
    user_id: 0,
    course_id: 0,
    status: 'enrolled'
  });

  const loadUsers = useCallback(async (organizationId: number) => {
    try {
      const result = await trpc.getUsersByOrganization.query({ organizationId });
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  const loadCourses = useCallback(async (lmsId: number) => {
    try {
      const result = await trpc.getCoursesByLMS.query({ lmsId });
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  const loadUserEnrollments = useCallback(async (userId: number) => {
    try {
      const result = await trpc.getEnrollmentsByUser.query({ userId });
      setEnrollments(result);
    } catch (error) {
      console.error('Failed to load user enrollments:', error);
    }
  }, []);

  const loadCourseEnrollments = useCallback(async (courseId: number) => {
    try {
      const result = await trpc.getEnrollmentsByCourse.query({ courseId });
      setCourseEnrollments(result);
    } catch (error) {
      console.error('Failed to load course enrollments:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedOrganization) {
      loadUsers(selectedOrganization.id);
    }
  }, [selectedOrganization, loadUsers]);

  useEffect(() => {
    if (selectedLMS) {
      loadCourses(selectedLMS.id);
    }
  }, [selectedLMS, loadCourses]);

  useEffect(() => {
    if (selectedUser) {
      loadUserEnrollments(selectedUser.id);
    }
  }, [selectedUser, loadUserEnrollments]);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseEnrollments(selectedCourse.id);
    }
  }, [selectedCourse, loadCourseEnrollments]);

  const handleCreateEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const newEnrollment = await trpc.createEnrollment.mutate(enrollmentForm);
      
      // Update the relevant lists
      if (selectedUser && enrollmentForm.user_id === selectedUser.id) {
        setEnrollments((prev: Enrollment[]) => [...prev, newEnrollment]);
      }
      if (selectedCourse && enrollmentForm.course_id === selectedCourse.id) {
        setCourseEnrollments((prev: Enrollment[]) => [...prev, newEnrollment]);
      }
      
      // Reset form
      setEnrollmentForm({
        user_id: 0,
        course_id: 0,
        status: 'enrolled'
      });
    } catch (error) {
      console.error('Failed to create enrollment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateEnrollmentStatus = async (enrollmentId: number, status: 'enrolled' | 'completed' | 'dropped') => {
    try {
      const updateData: UpdateEnrollmentInput = {
        id: enrollmentId,
        status,
        completion_date: status === 'completed' ? new Date() : null
      };
      
      const updatedEnrollment = await trpc.updateEnrollment.mutate(updateData);
      
      // Update both lists
      setEnrollments((prev: Enrollment[]) => 
        prev.map((e: Enrollment) => e.id === enrollmentId ? updatedEnrollment : e)
      );
      setCourseEnrollments((prev: Enrollment[]) => 
        prev.map((e: Enrollment) => e.id === enrollmentId ? updatedEnrollment : e)
      );
    } catch (error) {
      console.error('Failed to update enrollment:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      enrolled: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      dropped: 'bg-red-100 text-red-800'
    };
    
    const icons: Record<string, string> = {
      enrolled: '📚',
      completed: '✅',
      dropped: '❌'
    };
    
    return (
      <Badge className={variants[status] || variants.enrolled}>
        {icons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getUserName = (userId: number) => {
    const user = users.find((u: User) => u.id === userId);
    return user ? user.name : `User ${userId}`;
  };

  const getCourseName = (courseId: number) => {
    const course = courses.find((c: Course) => c.id === courseId);
    return course ? course.title : `Course ${courseId}`;
  };

  if (!selectedOrganization || !selectedLMS) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization or LMS Selected</h3>
          <p className="text-gray-500">
            Please select both an organization and LMS instance to manage enrollments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Enrollment Form */}
      <Card>
        <CardHeader>
          <CardTitle>📝 Create New Enrollment</CardTitle>
          <CardDescription>
            Enroll students in courses within <strong>{selectedLMS.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateEnrollment} className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Student *
                </label>
                <Select 
                  value={enrollmentForm.user_id.toString()} 
                  onValueChange={(value: string) => 
                    setEnrollmentForm((prev: CreateEnrollmentInput) => ({ 
                      ...prev, 
                      user_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Course *
                </label>
                <Select 
                  value={enrollmentForm.course_id.toString()} 
                  onValueChange={(value: string) => 
                    setEnrollmentForm((prev: CreateEnrollmentInput) => ({ 
                      ...prev, 
                      course_id: parseInt(value) 
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.filter((course: Course) => course.status === 'published').map((course: Course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <Select 
                  value={enrollmentForm.status || 'enrolled'} 
                  onValueChange={(value: 'enrolled' | 'completed' | 'dropped') => 
                    setEnrollmentForm((prev: CreateEnrollmentInput) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrolled">📚 Enrolled</SelectItem>
                    <SelectItem value="completed">✅ Completed</SelectItem>
                    <SelectItem value="dropped">❌ Dropped</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '⏳ Creating...' : '🎯 Create Enrollment'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Enrollments Management */}
      <Tabs defaultValue="by-user" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="by-user">👤 By Student</TabsTrigger>
          <TabsTrigger value="by-course">📚 By Course</TabsTrigger>
        </TabsList>

        <TabsContent value="by-user" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>👤 Student Enrollments</CardTitle>
              <CardDescription>Select a student to view their enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select 
                  value={selectedUser?.id.toString() || ''} 
                  onValueChange={(value: string) => {
                    const user = users.find((u: User) => u.id === parseInt(value));
                    setSelectedUser(user || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a student" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user: User) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedUser && (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Enrollments for {selectedUser.name} ({enrollments.length})
                  </h3>
                  
                  {enrollments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📝</div>
                      <p className="text-gray-500">No enrollments found for this student</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {enrollments.map((enrollment: Enrollment) => (
                        <Card key={enrollment.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getCourseName(enrollment.course_id)}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Enrolled: {enrollment.enrollment_date.toLocaleDateString()}
                                </p>
                                {enrollment.completion_date && (
                                  <p className="text-sm text-gray-600">
                                    Completed: {enrollment.completion_date.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(enrollment.status)}
                                <Select
                                  value={enrollment.status}
                                  onValueChange={(status: 'enrolled' | 'completed' | 'dropped') =>
                                    handleUpdateEnrollmentStatus(enrollment.id, status)
                                  }
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="enrolled">Enrolled</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="dropped">Dropped</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-400">
                              Enrollment ID: {enrollment.id}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="by-course" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📚 Course Enrollments</CardTitle>
              <CardDescription>Select a course to view its enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Select 
                  value={selectedCourse?.id.toString() || ''} 
                  onValueChange={(value: string) => {
                    const course = courses.find((c: Course) => c.id === parseInt(value));
                    setSelectedCourse(course || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course: Course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title} ({course.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedCourse && (
                <div>
                  <h3 className="text-lg font-medium mb-4">
                    Enrollments for "{selectedCourse.title}" ({courseEnrollments.length})
                  </h3>
                  
                  {courseEnrollments.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-3">📝</div>
                      <p className="text-gray-500">No enrollments found for this course</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courseEnrollments.map((enrollment: Enrollment) => (
                        <Card key={enrollment.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {getUserName(enrollment.user_id)}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  Enrolled: {enrollment.enrollment_date.toLocaleDateString()}
                                </p>
                                {enrollment.completion_date && (
                                  <p className="text-sm text-gray-600">
                                    Completed: {enrollment.completion_date.toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {getStatusBadge(enrollment.status)}
                                <Select
                                  value={enrollment.status}
                                  onValueChange={(status: 'enrolled' | 'completed' | 'dropped') =>
                                    handleUpdateEnrollmentStatus(enrollment.id, status)
                                  }
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="enrolled">Enrolled</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="dropped">Dropped</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-400">
                              User ID: {enrollment.user_id} | Enrollment ID: {enrollment.id}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}