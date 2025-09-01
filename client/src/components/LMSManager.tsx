import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { Organization, LMS, CreateLMSInput } from '../../../server/src/schema';

interface LMSManagerProps {
  selectedOrganization: Organization | null;
  lmsList: LMS[];
  onLMSCreated: (lms: LMS) => void;
}

export function LMSManager({ 
  selectedOrganization, 
  lmsList, 
  onLMSCreated 
}: LMSManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateLMSInput>({
    organization_id: 0,
    name: '',
    description: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization) return;
    
    setIsLoading(true);
    
    try {
      const lmsData = {
        ...formData,
        organization_id: selectedOrganization.id
      };
      
      const newLMS = await trpc.createLMS.mutate(lmsData);
      onLMSCreated(newLMS);
      
      // Reset form
      setFormData({
        organization_id: 0,
        name: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to create LMS:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedOrganization) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
          <p className="text-gray-500">
            Please select an organization first to manage LMS instances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create LMS Form */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 Create New LMS Instance</CardTitle>
          <CardDescription>
            Create a new LMS instance within <strong>{selectedOrganization.name}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="lms-name" className="block text-sm font-medium text-gray-700 mb-1">
                LMS Instance Name *
              </label>
              <Input
                id="lms-name"
                placeholder="Enter LMS instance name (e.g., 'Engineering Department', 'Sales Training')"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateLMSInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label htmlFor="lms-description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                id="lms-description"
                placeholder="Brief description of this LMS instance (optional)"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateLMSInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '⏳ Creating...' : '🚀 Create LMS Instance'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* LMS Instances List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 LMS Instances for {selectedOrganization.name} ({lmsList.length})</CardTitle>
          <CardDescription>
            All LMS instances within this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {lmsList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No LMS instances yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first LMS instance to start managing courses and users.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {lmsList.map((lms: LMS) => (
                <Card key={lms.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{lms.name}</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        ID: {lms.id}
                      </span>
                    </div>
                    
                    {lms.description && (
                      <p className="text-gray-600 text-sm mb-3">{lms.description}</p>
                    )}
                    
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Org ID: {lms.organization_id}</div>
                      <div>Created: {lms.created_at.toLocaleDateString()}</div>
                      <div>Updated: {lms.updated_at.toLocaleDateString()}</div>
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