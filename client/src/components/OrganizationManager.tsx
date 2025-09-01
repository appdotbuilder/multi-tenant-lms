import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trpc } from '@/utils/trpc';
import type { Organization, CreateOrganizationInput } from '../../../server/src/schema';

interface OrganizationManagerProps {
  organizations: Organization[];
  onOrganizationCreated: (organization: Organization) => void;
}

export function OrganizationManager({ 
  organizations, 
  onOrganizationCreated 
}: OrganizationManagerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateOrganizationInput>({
    name: '',
    description: null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const newOrganization = await trpc.createOrganization.mutate(formData);
      onOrganizationCreated(newOrganization);
      
      // Reset form
      setFormData({
        name: '',
        description: null
      });
    } catch (error) {
      console.error('Failed to create organization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Organization Form */}
      <Card>
        <CardHeader>
          <CardTitle>🏢 Create New Organization</CardTitle>
          <CardDescription>
            Organizations are top-level entities that can manage multiple LMS instances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name *
              </label>
              <Input
                id="name"
                placeholder="Enter organization name"
                value={formData.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateOrganizationInput) => ({ ...prev, name: e.target.value }))
                }
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Textarea
                id="description"
                placeholder="Brief description of the organization (optional)"
                value={formData.description || ''}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setFormData((prev: CreateOrganizationInput) => ({
                    ...prev,
                    description: e.target.value || null
                  }))
                }
                rows={3}
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '⏳ Creating...' : '✨ Create Organization'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 All Organizations ({organizations.length})</CardTitle>
          <CardDescription>
            Manage and view all organizations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {organizations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No organizations yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first organization to get started with the LMS platform.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org: Organization) => (
                <Card key={org.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        ID: {org.id}
                      </span>
                    </div>
                    
                    {org.description && (
                      <p className="text-gray-600 text-sm mb-3">{org.description}</p>
                    )}
                    
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Created: {org.created_at.toLocaleDateString()}</div>
                      <div>Updated: {org.updated_at.toLocaleDateString()}</div>
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