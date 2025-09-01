import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { trpc } from '@/utils/trpc';
import type { 
  Organization, 
  LMS, 
  User, 
  CreateUserInput,
  CreateUserLMSRoleInput,
  CreateUserOrganizationRoleInput
} from '../../../server/src/schema';

interface UserManagerProps {
  selectedOrganization: Organization | null;
  selectedLMS: LMS | null;
}

export function UserManager({ selectedOrganization, selectedLMS }: UserManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserInput>({
    organization_id: 0,
    name: '',
    email: '',
    password: ''
  });
  const [roleData, setRoleData] = useState({
    lmsRole: '',
    orgRole: ''
  });

  const loadUsers = useCallback(async (organizationId: number) => {
    try {
      const result = await trpc.getUsersByOrganization.query({ organizationId });
      setUsers(result);
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  }, []);

  useEffect(() => {
    if (selectedOrganization) {
      loadUsers(selectedOrganization.id);
    }
  }, [selectedOrganization, loadUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrganization) return;
    
    setIsLoading(true);
    
    try {
      const userData = {
        ...formData,
        organization_id: selectedOrganization.id
      };
      
      const newUser = await trpc.createUser.mutate(userData);
      
      // Create organization role if specified
      if (roleData.orgRole) {
        const orgRoleData: CreateUserOrganizationRoleInput = {
          user_id: newUser.id,
          organization_id: selectedOrganization.id,
          role: roleData.orgRole as 'org_admin'
        };
        await trpc.createUserOrganizationRole.mutate(orgRoleData);
      }
      
      // Create LMS role if specified and LMS is selected
      if (roleData.lmsRole && selectedLMS) {
        const lmsRoleData: CreateUserLMSRoleInput = {
          user_id: newUser.id,
          lms_id: selectedLMS.id,
          role: roleData.lmsRole as 'lms_admin' | 'lms_instructor' | 'lms_student'
        };
        await trpc.createUserLMSRole.mutate(lmsRoleData);
      }
      
      setUsers((prev: User[]) => [...prev, newUser]);
      
      // Reset form
      setFormData({
        organization_id: 0,
        name: '',
        email: '',
        password: ''
      });
      setRoleData({
        lmsRole: '',
        orgRole: ''
      });
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!selectedOrganization) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Organization Selected</h3>
          <p className="text-gray-500">
            Please select an organization first to manage users.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle>👥 Create New User</CardTitle>
          <CardDescription>
            Add a new user to <strong>{selectedOrganization.name}</strong>
            {selectedLMS && (
              <span> and assign roles for <strong>{selectedLMS.name}</strong></span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="user-name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <Input
                  id="user-name"
                  placeholder="Enter user's full name"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData((prev: CreateUserInput) => ({ ...prev, email: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <Input
                id="user-password"
                type="password"
                placeholder="Enter a secure password (min 6 characters)"
                value={formData.password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateUserInput) => ({ ...prev, password: e.target.value }))
                }
                minLength={6}
                required
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Organization Role
                </label>
                <Select 
                  value={roleData.orgRole || ''} 
                  onValueChange={(value: string) => setRoleData((prev) => ({ ...prev, orgRole: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="org_admin">🏢 Organization Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  LMS Role {!selectedLMS && '(Select LMS first)'}
                </label>
                <Select 
                  value={roleData.lmsRole || ''} 
                  onValueChange={(value: string) => setRoleData((prev) => ({ ...prev, lmsRole: value }))}
                  disabled={!selectedLMS}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select LMS role (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lms_admin">⚙️ LMS Admin</SelectItem>
                    <SelectItem value="lms_instructor">👨‍🏫 LMS Instructor</SelectItem>
                    <SelectItem value="lms_student">🎓 LMS Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? '⏳ Creating...' : '✨ Create User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>📋 Users in {selectedOrganization.name} ({users.length})</CardTitle>
          <CardDescription>
            All users within this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users yet</h3>
              <p className="text-gray-500 mb-4">
                Create your first user to get started with user management.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {users.map((user: User) => (
                <Card key={user.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
                        ID: {user.id}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-400 space-y-1">
                      <div>Org ID: {user.organization_id}</div>
                      <div>Created: {user.created_at.toLocaleDateString()}</div>
                      <div>Updated: {user.updated_at.toLocaleDateString()}</div>
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