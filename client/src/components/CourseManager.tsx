import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CourseModuleManager } from '@/components/CourseModuleManager';
import { trpc } from '@/utils/trpc';
import type { 
  LMS, 
  Course, 
  CreateCourseInput
} from '../../../server/src/schema';

interface CourseManagerProps {
  selectedLMS: LMS | null;
}

export function CourseManager({ selectedLMS }: CourseManagerProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModuleManager, setShowModuleManager] = useState(false);
  const [formData, setFormData] = useState<CreateCourseInput>({
    lms_id: 0,
    title: '',
    description: null,
    slug: '',
    meta_title: null,
    meta_description: null,
    keywords: null,
    thumbnail_url: null,
    duration_hours: null,
    status: 'draft'
  });

  const loadCourses = useCallback(async (lmsId: number) => {
    try {
      const result = await trpc.getCoursesByLMS.query({ lmsId });
      setCourses(result);
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedLMS) {
      loadCourses(selectedLMS.id);
    }
  }, [selectedLMS, loadCourses]);

  // Auto-generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLMS) return;
    
    setIsLoading(true);
    
    try {
      const courseData = {
        ...formData,
        lms_id: selectedLMS.id,
        slug: formData.slug || generateSlug(formData.title)
      };
      
      const newCourse = await trpc.createCourse.mutate(courseData);
      setCourses((prev: Course[]) => [...prev, newCourse]);
      
      // Reset form
      setFormData({
        lms_id: 0,
        title: '',
        description: null,
        slug: '',
        meta_title: null,
        meta_description: null,
        keywords: null,
        thumbnail_url: null,
        duration_hours: null,
        status: 'draft'
      });
    } catch (error) {
      console.error('Failed to create course:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-red-100 text-red-800'
    };
    
    return (
      <Badge className={variants[status] || variants.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!selectedLMS) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No LMS Selected</h3>
          <p className="text-gray-500">
            Please select an LMS instance first to manage courses.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (showModuleManager && selectedCourse) {
    return (
      <CourseModuleManager 
        course={selectedCourse}
        onBack={() => setShowModuleManager(false)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Course Form */}
      <Card>
        <CardHeader>
          <CardTitle>📚 Create New Course</CardTitle>
          <CardDescription>
            Add a new course to <strong>{selectedLMS.name}</strong> with SEO optimization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">📋 Basic Information</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="course-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Course Title *
                  </label>
                  <Input
                    id="course-title"
                    placeholder="Enter course title"
                    value={formData.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const title = e.target.value;
                      setFormData((prev: CreateCourseInput) => ({ 
                        ...prev, 
                        title,
                        slug: prev.slug || generateSlug(title)
                      }));
                    }}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="course-slug" className="block text-sm font-medium text-gray-700 mb-1">
                    URL Slug *
                  </label>
                  <Input
                    id="course-slug"
                    placeholder="course-url-slug"
                    value={formData.slug}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCourseInput) => ({ ...prev, slug: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="course-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Course Description
                </label>
                <Textarea
                  id="course-description"
                  placeholder="Detailed description of the course content and objectives"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateCourseInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                  rows={4}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="duration-hours" className="block text-sm font-medium text-gray-700 mb-1">
                    Duration (Hours)
                  </label>
                  <Input
                    id="duration-hours"
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g., 40.5"
                    value={formData.duration_hours || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCourseInput) => ({ 
                        ...prev, 
                        duration_hours: parseFloat(e.target.value) || null 
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status *
                  </label>
                  <Select 
                    value={formData.status || 'draft'} 
                    onValueChange={(value: 'draft' | 'published' | 'archived') => 
                      setFormData((prev: CreateCourseInput) => ({ ...prev, status: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">📝 Draft</SelectItem>
                      <SelectItem value="published">🚀 Published</SelectItem>
                      <SelectItem value="archived">📦 Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SEO Section */}
            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900">🔍 SEO Optimization</h3>
              
              <div>
                <label htmlFor="meta-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Title
                </label>
                <Input
                  id="meta-title"
                  placeholder="SEO-friendly title (50-60 characters recommended)"
                  value={formData.meta_title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateCourseInput) => ({
                      ...prev,
                      meta_title: e.target.value || null
                    }))
                  }
                  maxLength={60}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.meta_title || '').length}/60 characters
                </p>
              </div>

              <div>
                <label htmlFor="meta-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Meta Description
                </label>
                <Textarea
                  id="meta-description"
                  placeholder="Brief description for search engines (150-160 characters recommended)"
                  value={formData.meta_description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData((prev: CreateCourseInput) => ({
                      ...prev,
                      meta_description: e.target.value || null
                    }))
                  }
                  rows={2}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {(formData.meta_description || '').length}/160 characters
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
                    Keywords
                  </label>
                  <Input
                    id="keywords"
                    placeholder="keyword1, keyword2, keyword3"
                    value={formData.keywords || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCourseInput) => ({
                        ...prev,
                        keywords: e.target.value || null
                      }))
                    }
                  />
                </div>

                <div>
                  <label htmlFor="thumbnail-url" className="block text-sm font-medium text-gray-700 mb-1">
                    Thumbnail Image URL
                  </label>
                  <Input
                    id="thumbnail-url"
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={formData.thumbnail_url || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData((prev: CreateCourseInput) => ({
                        ...prev,
                        thumbnail_url: e.target.value || null
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '⏳ Creating...' : '🚀 Create Course'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Courses List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Courses in {selectedLMS.name} ({courses.length})</CardTitle>
          <CardDescription>
            All courses within this LMS instance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No courses yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first course to start building educational content.
              </p>
            </div>
          ) : (
            <div className="grid gap-6">
              {courses.map((course: Course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{course.title}</h3>
                          {getStatusBadge(course.status)}
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            ID: {course.id}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-600 mb-3">
                          <span className="font-medium">Slug:</span> /{course.slug}
                        </div>
                        
                        {course.description && (
                          <p className="text-gray-700 mb-3">{course.description}</p>
                        )}
                        
                        {/* SEO Info */}
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            {course.meta_title && (
                              <div className="mb-2">
                                <span className="font-medium text-gray-600">Meta Title:</span>
                                <p className="text-gray-800">{course.meta_title}</p>
                              </div>
                            )}
                            {course.keywords && (
                              <div>
                                <span className="font-medium text-gray-600">Keywords:</span>
                                <p className="text-gray-800">{course.keywords}</p>
                              </div>
                            )}
                          </div>
                          <div>
                            {course.duration_hours && (
                              <div className="mb-2">
                                <span className="font-medium text-gray-600">Duration:</span>
                                <p className="text-gray-800">{course.duration_hours} hours</p>
                              </div>
                            )}
                            {course.thumbnail_url && (
                              <div>
                                <span className="font-medium text-gray-600">Thumbnail:</span>
                                <a 
                                  href={course.thumbnail_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline ml-1"
                                >
                                  View Image
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {course.meta_description && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <span className="font-medium text-gray-600 text-sm">Meta Description:</span>
                            <p className="text-gray-800 text-sm mt-1">{course.meta_description}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="ml-4">
                        <Button
                          onClick={() => {
                            setSelectedCourse(course);
                            setShowModuleManager(true);
                          }}
                          size="sm"
                        >
                          📝 Manage Content
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-400 space-y-1 border-t pt-3">
                      <div>LMS ID: {course.lms_id}</div>
                      <div>Created: {course.created_at.toLocaleDateString()}</div>
                      <div>Updated: {course.updated_at.toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}