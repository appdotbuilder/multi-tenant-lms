import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { 
  Course,
  Module,
  Lesson,
  CreateModuleInput,
  CreateLessonInput
} from '../../../server/src/schema';

interface CourseModuleManagerProps {
  course: Course;
  onBack: () => void;
}

export function CourseModuleManager({ course, onBack }: CourseModuleManagerProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState(false);
  
  const [moduleForm, setModuleForm] = useState<CreateModuleInput>({
    course_id: course.id,
    title: '',
    description: null,
    order: 1
  });
  
  const [lessonForm, setLessonForm] = useState<CreateLessonInput>({
    module_id: 0,
    title: '',
    description: null,
    content: null,
    type: 'text',
    order: 1
  });

  const loadModules = useCallback(async () => {
    try {
      const result = await trpc.getModulesByCourse.query({ courseId: course.id });
      setModules(result);
      
      // Auto-select first module if none selected
      if (!selectedModule && result.length > 0) {
        setSelectedModule(result[0]);
      }
    } catch (error) {
      console.error('Failed to load modules:', error);
    }
  }, [course.id, selectedModule]);

  const loadLessons = useCallback(async (moduleId: number) => {
    try {
      const result = await trpc.getLessonsByModule.query({ moduleId });
      setLessons(result);
    } catch (error) {
      console.error('Failed to load lessons:', error);
    }
  }, []);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  useEffect(() => {
    if (selectedModule) {
      loadLessons(selectedModule.id);
    }
  }, [selectedModule, loadLessons]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingModules(true);
    
    try {
      const moduleData = {
        ...moduleForm,
        order: modules.length + 1
      };
      
      const newModule = await trpc.createModule.mutate(moduleData);
      setModules((prev: Module[]) => [...prev, newModule]);
      
      // Reset form
      setModuleForm({
        course_id: course.id,
        title: '',
        description: null,
        order: 1
      });
      
      // Select the new module
      setSelectedModule(newModule);
    } catch (error) {
      console.error('Failed to create module:', error);
    } finally {
      setIsLoadingModules(false);
    }
  };

  const handleCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;
    
    setIsLoadingLessons(true);
    
    try {
      const lessonData = {
        ...lessonForm,
        module_id: selectedModule.id,
        order: lessons.length + 1
      };
      
      const newLesson = await trpc.createLesson.mutate(lessonData);
      setLessons((prev: Lesson[]) => [...prev, newLesson]);
      
      // Reset form
      setLessonForm({
        module_id: selectedModule.id,
        title: '',
        description: null,
        content: null,
        type: 'text',
        order: 1
      });
    } catch (error) {
      console.error('Failed to create lesson:', error);
    } finally {
      setIsLoadingLessons(false);
    }
  };

  const getLessonTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      video: '🎥',
      text: '📝',
      quiz: '❓',
      file: '📎'
    };
    return icons[type] || '📄';
  };

  const getLessonTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      video: 'bg-red-100 text-red-800',
      text: 'bg-blue-100 text-blue-800',
      quiz: 'bg-yellow-100 text-yellow-800',
      file: 'bg-green-100 text-green-800'
    };
    
    return (
      <Badge className={variants[type] || variants.text}>
        {getLessonTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>📚 Course Content Management</CardTitle>
              <CardDescription>
                Managing modules and lessons for <strong>{course.title}</strong>
              </CardDescription>
            </div>
            <Button onClick={onBack} variant="outline">
              ← Back to Courses
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Column - Modules */}
        <div className="space-y-6">
          {/* Create Module Form */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Create New Module</CardTitle>
              <CardDescription>Add a new module to organize course content</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateModule} className="space-y-4">
                <div>
                  <label htmlFor="module-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Module Title *
                  </label>
                  <Input
                    id="module-title"
                    placeholder="e.g., Introduction to JavaScript"
                    value={moduleForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setModuleForm((prev: CreateModuleInput) => ({ ...prev, title: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label htmlFor="module-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Module Description
                  </label>
                  <Textarea
                    id="module-description"
                    placeholder="Brief description of what this module covers"
                    value={moduleForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setModuleForm((prev: CreateModuleInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={isLoadingModules} className="w-full">
                  {isLoadingModules ? '⏳ Creating...' : '✨ Create Module'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Modules List */}
          <Card>
            <CardHeader>
              <CardTitle>📋 Course Modules ({modules.length})</CardTitle>
              <CardDescription>Select a module to manage its lessons</CardDescription>
            </CardHeader>
            <CardContent>
              {modules.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📋</div>
                  <p className="text-gray-500">No modules yet. Create one above!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modules.map((module: Module) => (
                    <div
                      key={module.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedModule?.id === module.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedModule(module)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{module.title}</h3>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          #{module.order}
                        </span>
                      </div>
                      
                      {module.description && (
                        <p className="text-sm text-gray-600 mb-2">{module.description}</p>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        Created: {module.created_at.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Lessons */}
        <div className="space-y-6">
          {/* Create Lesson Form */}
          <Card>
            <CardHeader>
              <CardTitle>📝 Create New Lesson</CardTitle>
              <CardDescription>
                {selectedModule 
                  ? `Add a lesson to "${selectedModule.title}"` 
                  : 'Select a module first to create lessons'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateLesson} className="space-y-4">
                <div>
                  <label htmlFor="lesson-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Title *
                  </label>
                  <Input
                    id="lesson-title"
                    placeholder="e.g., Variables and Data Types"
                    value={lessonForm.title}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setLessonForm((prev: CreateLessonInput) => ({ ...prev, title: e.target.value }))
                    }
                    disabled={!selectedModule}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Type *
                  </label>
                  <Select 
                    value={lessonForm.type || 'text'} 
                    onValueChange={(value: 'video' | 'text' | 'quiz' | 'file') => 
                      setLessonForm((prev: CreateLessonInput) => ({ ...prev, type: value }))
                    }
                    disabled={!selectedModule}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">📝 Text Content</SelectItem>
                      <SelectItem value="video">🎥 Video</SelectItem>
                      <SelectItem value="quiz">❓ Quiz</SelectItem>
                      <SelectItem value="file">📎 File/Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label htmlFor="lesson-description" className="block text-sm font-medium text-gray-700 mb-1">
                    Lesson Description
                  </label>
                  <Textarea
                    id="lesson-description"
                    placeholder="Brief description of the lesson content"
                    value={lessonForm.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setLessonForm((prev: CreateLessonInput) => ({
                        ...prev,
                        description: e.target.value || null
                      }))
                    }
                    rows={2}
                    disabled={!selectedModule}
                  />
                </div>

                <div>
                  <label htmlFor="lesson-content" className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <Textarea
                    id="lesson-content"
                    placeholder={
                      lessonForm.type === 'video' ? 'Video URL (e.g., YouTube, Vimeo)' :
                      lessonForm.type === 'file' ? 'File URL or attachment link' :
                      lessonForm.type === 'quiz' ? 'Quiz questions and answers (JSON format)' :
                      'Lesson text content (supports HTML)'
                    }
                    value={lessonForm.content || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setLessonForm((prev: CreateLessonInput) => ({
                        ...prev,
                        content: e.target.value || null
                      }))
                    }
                    rows={4}
                    disabled={!selectedModule}
                  />
                </div>

                <Button type="submit" disabled={isLoadingLessons || !selectedModule} className="w-full">
                  {isLoadingLessons ? '⏳ Creating...' : '🚀 Create Lesson'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Lessons List */}
          <Card>
            <CardHeader>
              <CardTitle>
                📝 Lessons {selectedModule && `in "${selectedModule.title}"`} ({lessons.length})
              </CardTitle>
              <CardDescription>
                {selectedModule 
                  ? 'All lessons in the selected module' 
                  : 'Select a module to view its lessons'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedModule ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-gray-500">Select a module to view lessons</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-gray-500">No lessons yet. Create one above!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lessons.map((lesson: Lesson) => (
                    <Card key={lesson.id} className="hover:shadow-sm transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{lesson.title}</h4>
                          <div className="flex items-center gap-2">
                            {getLessonTypeBadge(lesson.type)}
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              #{lesson.order}
                            </span>
                          </div>
                        </div>
                        
                        {lesson.description && (
                          <p className="text-sm text-gray-600 mb-2">{lesson.description}</p>
                        )}
                        
                        {lesson.content && (
                          <div className="text-sm text-gray-700 mb-2">
                            <span className="font-medium">Content:</span>
                            <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                              {lesson.content.length > 100 
                                ? `${lesson.content.substring(0, 100)}...` 
                                : lesson.content
                              }
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400">
                          Created: {lesson.created_at.toLocaleDateString()}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}