'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Edit3,
  Loader2,
  Minus,
  RotateCcw,
  Save,
  Users2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganization } from '@/lib/providers/OrganizationProvider';
import {
  getOrganizationPermissions,
  resetOrganizationPermissions,
  updateOrganizationPermissions,
  type RawOrganizationPermissions,
} from '@/lib/api/organization';

type RolePerm = { owner: boolean; admin: boolean; member: boolean };
const DEFAULT_PERM: RolePerm = { owner: true, admin: false, member: false };

// Plain-language labels for each capability key (matches the backend matrix).
const CAPABILITY_META: { key: string; label: string; description?: string }[] =
  [
    {
      key: 'create_edit_profile',
      label: 'Edit the organization profile',
      description: 'Name, logo, tagline, and about',
    },
    {
      key: 'manage_hackathons_grants',
      label: 'Create and manage hackathons, bounties, and grants',
    },
    {
      key: 'publish_hackathons',
      label: 'Publish hackathons, bounties, and grants',
    },
    { key: 'view_analytics', label: 'View hackathons and analytics' },
    { key: 'invite_remove_members', label: 'Invite and remove members' },
    {
      key: 'assign_roles',
      label: 'Set member roles',
      description: 'Promote or demote between admin and member',
    },
    { key: 'post_announcements', label: 'Post announcements' },
    { key: 'comment_discussions', label: 'Comment and join discussions' },
    {
      key: 'access_submissions',
      label: 'View submissions and judge if assigned',
    },
    {
      key: 'delete_organization',
      label: 'Transfer ownership or delete the organization',
    },
  ];

const clone = (p: RawOrganizationPermissions): RawOrganizationPermissions =>
  JSON.parse(JSON.stringify(p));

export default function PermissionsTable() {
  const { activeOrgId } = useOrganization();
  const [permissions, setPermissions] = useState<RawOrganizationPermissions>(
    {}
  );
  const [draft, setDraft] = useState<RawOrganizationPermissions>({});
  const [isCustom, setIsCustom] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeOrgId) return;
    setLoading(true);
    try {
      const body = await getOrganizationPermissions(activeOrgId);
      const data = body?.data;
      if (data) {
        setPermissions(data.permissions ?? {});
        setIsCustom(!!data.isCustom);
        setCanEdit(!!data.canEdit);
      }
    } catch {
      toast.error('Could not load role permissions');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    load();
  }, [load]);

  const startEdit = () => {
    setDraft(clone(permissions));
    setIsEditing(true);
  };

  const toggle = (key: string, role: 'admin' | 'member') => {
    setDraft(prev => {
      const cur = prev[key] ?? { ...DEFAULT_PERM };
      return { ...prev, [key]: { ...cur, owner: true, [role]: !cur[role] } };
    });
  };

  const save = async () => {
    if (!activeOrgId) return;
    setSaving(true);
    try {
      await updateOrganizationPermissions(activeOrgId, { permissions: draft });
      setPermissions(draft);
      setIsCustom(true);
      setIsEditing(false);
      toast.success('Role permissions updated');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not save permissions'
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!activeOrgId) return;
    setSaving(true);
    try {
      await resetOrganizationPermissions(activeOrgId);
      await load();
      setIsEditing(false);
      toast.success('Reset to default permissions');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Could not reset permissions'
      );
    } finally {
      setSaving(false);
    }
  };

  const view = isEditing ? draft : permissions;
  const cellOf = (key: string): RolePerm => view[key] ?? DEFAULT_PERM;

  return (
    <div className='space-y-4 rounded-xl border border-gray-900 bg-[#101010] p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='flex items-center gap-2 text-sm font-medium text-white'>
            <Users2 className='h-4 w-4 text-gray-500' />
            What each role can do
            {isCustom && (
              <span className='rounded bg-amber-400/10 px-2 py-0.5 text-xs text-amber-300'>
                Custom
              </span>
            )}
          </h3>
          <p className='mt-1 text-xs text-gray-500'>
            Owners always have full access.{' '}
            {canEdit
              ? 'Customize what admins and members can do, then save.'
              : 'Only the owner can change these.'}
          </p>
        </div>

        {canEdit && !loading && (
          <div className='flex gap-2'>
            {!isEditing ? (
              <Button
                variant='outline'
                size='sm'
                onClick={startEdit}
                className='border-gray-700 text-white hover:bg-gray-800'
              >
                <Edit3 className='mr-2 h-4 w-4' />
                Customize
              </Button>
            ) : (
              <>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={reset}
                  disabled={saving}
                  className='border-gray-700 text-white hover:bg-gray-800'
                >
                  <RotateCcw className='mr-2 h-4 w-4' />
                  Reset to defaults
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className='border-gray-700 text-white hover:bg-gray-800'
                >
                  Cancel
                </Button>
                <Button
                  size='sm'
                  onClick={save}
                  disabled={saving}
                  className='bg-primary text-black'
                >
                  {saving ? (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  ) : (
                    <Save className='mr-2 h-4 w-4' />
                  )}
                  Save changes
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className='flex items-center gap-2 py-6 text-sm text-gray-500'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading permissions…
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow className='border-gray-800 hover:bg-transparent'>
                <TableHead className='px-0 font-medium text-white'>
                  Capability
                </TableHead>
                <TableHead className='px-2 text-center font-medium text-white'>
                  Owner
                </TableHead>
                <TableHead className='px-2 text-center font-medium text-white'>
                  Admin
                </TableHead>
                <TableHead className='px-2 text-center font-medium text-white'>
                  Member
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {CAPABILITY_META.map(cap => {
                const cell = cellOf(cap.key);
                return (
                  <TableRow
                    key={cap.key}
                    className='border-gray-800/50 hover:bg-gray-800/10'
                  >
                    <TableCell className='px-0'>
                      <div className='text-sm text-white'>{cap.label}</div>
                      {cap.description && (
                        <div className='mt-0.5 text-xs text-gray-500'>
                          {cap.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='px-2 text-center'>
                      <Check className='text-success-500 mx-auto h-4 w-4' />
                    </TableCell>
                    {(['admin', 'member'] as const).map(role => (
                      <TableCell key={role} className='px-2 text-center'>
                        {isEditing ? (
                          <input
                            type='checkbox'
                            checked={cell[role]}
                            onChange={() => toggle(cap.key, role)}
                            className='h-4 w-4 cursor-pointer rounded border-gray-600 bg-gray-800'
                          />
                        ) : cell[role] ? (
                          <Check className='text-success-500 mx-auto h-4 w-4' />
                        ) : (
                          <Minus className='mx-auto h-4 w-4 text-gray-600' />
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
