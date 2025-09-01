import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { OrganizationManager } from '@/components/OrganizationManager';
import { LMSManager } from '@/components/LMSManager';
import { UserManager } from '@/components/UserManager';
import { CourseManager } from '@/components/CourseManager';
import { EnrollmentManager } from '@/components/EnrollmentManager';
import { trpc } from '@/utils/trpc';
import type { Organization, LMS } from '../../server/src/schema';

function App() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [lmsList, setLMSList] = useState<LMS[]>([]);
  const [selectedLMS, setSelectedLMS] = useState<LMS | null>(null);

  const loadOrganizations = useCallback(async () => {
    try {
      const result = await trpc.getOrganizations.query();
      setOrganizations(result);
      
      // Auto-select first organization if none selected
      if (!selectedOrganization && result.length > 0) {
        setSelectedOrganization(result[0]);
      }
    } catch (error) {
      console.error('Failed to load organizations:', error);
    }
  }, [selectedOrganization]);

  const loadLMSByOrganization = useCallback(async (organizationId: number) => {
    try {
      const result = await trpc.getLMSByOrganization.query({ organizationId });
      setLMSList(result);
      
      // Auto-select first LMS if none selected
      if (!selectedLMS && result.length > 0) {
        setSelectedLMS(result[0]);
      }
    } catch (error) {
      console.error('Failed to load LMS instances:', error);
    }
  }, [selectedLMS]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (selectedOrganization) {
      loadLMSByOrganization(selectedOrganization.id);
    }
  }, [selectedOrganization, loadLMSByOrganization]);

  const handleOrganizationCreated = (newOrganization: Organization) => {
    setOrganizations((prev: Organization[]) => [...prev, newOrganization]);
    setSelectedOrganization(newOrganization);
  };

  const handleLMSCreated = (newLMS: LMS) => {
    setLMSList((prev: LMS[]) => [...prev, newLMS]);
    setSelectedLMS(newLMS);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            🎓 Learning Management System
          </h1>
          <p className="text-lg text-gray-600">
            Multi-tenant LMS platform for organizations and educational institutions
          </p>
        </div>

        {/* Organization & LMS Selection */}
        <div className="mb-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>📋 Current Context</CardTitle>
              <CardDescription>Select your organization and LMS instance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization
                  </label>
                  <select
                    value={selectedOrganization?.id || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const org = organizations.find((o: Organization) => o.id === parseInt(e.target.value));
                      setSelectedOrganization(org || null);
                      setSelectedLMS(null); // Reset LMS selection
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an organization...</option>
                    {organizations.map((org: Organization) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    LMS Instance
                  </label>
                  <select
                    value={selectedLMS?.id || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const lms = lmsList.find((l: LMS) => l.id === parseInt(e.target.value));
                      setSelectedLMS(lms || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!selectedOrganization}
                  >
                    <option value="">Select an LMS instance...</option>
                    {lmsList.map((lms: LMS) => (
                      <option key={lms.id} value={lms.id}>
                        {lms.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Management Interface */}
        <Tabs defaultValue="organizations" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="organizations">🏢 Organizations</TabsTrigger>
            <TabsTrigger value="lms">🎯 LMS Instances</TabsTrigger>
            <TabsTrigger value="users">👥 Users</TabsTrigger>
            <TabsTrigger value="courses">📚 Courses</TabsTrigger>
            <TabsTrigger value="enrollments">📝 Enrollments</TabsTrigger>
          </TabsList>

          <TabsContent value="organizations" className="space-y-6">
            <OrganizationManager
              organizations={organizations}
              onOrganizationCreated={handleOrganizationCreated}
            />
          </TabsContent>

          <TabsContent value="lms" className="space-y-6">
            <LMSManager
              selectedOrganization={selectedOrganization}
              lmsList={lmsList}
              onLMSCreated={handleLMSCreated}
            />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <UserManager
              selectedOrganization={selectedOrganization}
              selectedLMS={selectedLMS}
            />
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <CourseManager
              selectedLMS={selectedLMS}
            />
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-6">
            <EnrollmentManager
              selectedOrganization={selectedOrganization}
              selectedLMS={selectedLMS}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;