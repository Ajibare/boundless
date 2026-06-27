'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BoundlessButton } from '@/components/buttons';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Trash2, Ban } from 'lucide-react';
import { deleteHackathon } from '@/lib/api/hackathons';
import { useCancelHackathon } from '@/hooks/hackathon/use-cancel-hackathon';
import { toast } from 'sonner';
import { api } from '@/lib/api/api';

const advancedSettingsSchema = z.object({
  maxParticipants: z.number().optional(),
});

type AdvancedSettingsFormData = z.infer<typeof advancedSettingsSchema>;

interface AdvancedSettingsTabProps {
  organizationId: string;
  hackathonId: string;
  initialData?: AdvancedSettingsFormData;
  initialVisibility?: 'PUBLIC' | 'PRIVATE';
  onSaveSuccess?: () => Promise<void>;
}

export default function AdvancedSettingsTab({
  organizationId,
  hackathonId,
  initialData,
  initialVisibility,
  onSaveSuccess,
}: AdvancedSettingsTabProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Visibility & access (PUBLIC vs PRIVATE + password).
  const wasPrivate = initialVisibility === 'PRIVATE';
  const [isPrivate, setIsPrivate] = useState(wasPrivate);
  const [accessPassword, setAccessPassword] = useState('');
  const [isSavingAccess, setIsSavingAccess] = useState(false);
  useEffect(() => {
    setIsPrivate(initialVisibility === 'PRIVATE');
  }, [initialVisibility]);

  const saveAccess = async () => {
    if (isPrivate && !wasPrivate && !accessPassword.trim()) {
      toast.error('Set a password to make this hackathon private.');
      return;
    }
    setIsSavingAccess(true);
    try {
      await api.patch(
        `/organizations/${organizationId}/hackathons/${hackathonId}/access`,
        {
          visibility: isPrivate ? 'PRIVATE' : 'PUBLIC',
          ...(isPrivate && accessPassword.trim()
            ? { password: accessPassword.trim() }
            : {}),
        }
      );
      toast.success(
        isPrivate ? 'Hackathon is now private' : 'Hackathon is now public'
      );
      setAccessPassword('');
      await onSaveSuccess?.();
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      toast.error(
        (Array.isArray(message) ? message[0] : message) ||
          'Could not update visibility.'
      );
    } finally {
      setIsSavingAccess(false);
    }
  };
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { cancel, isCancelling } = useCancelHackathon(
    organizationId,
    hackathonId,
    {
      onSuccess: () => {
        setShowCancelDialog(false);
        void onSaveSuccess?.();
      },
    }
  );

  const form = useForm<AdvancedSettingsFormData>({
    resolver: zodResolver(advancedSettingsSchema),
    defaultValues: {
      maxParticipants: undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const onSubmit = async (data: AdvancedSettingsFormData) => {
    setIsSaving(true);
    try {
      await api.patch(
        `/organizations/${organizationId}/hackathons/${hackathonId}/advanced-settings`,
        { advancedSettings: data }
      );
      toast.success('Advanced settings saved successfully!');
      form.reset(data);
      if (onSaveSuccess) {
        await onSaveSuccess();
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      const errorMessage = Array.isArray(message) ? message[0] : message;
      toast.error(
        errorMessage || 'Failed to save advanced settings. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteHackathon(hackathonId);
      toast.success('Hackathon deleted successfully', {
        description: 'All associated data has been permanently removed.',
      });
      setShowDeleteDialog(false);
      router.push(`/organizations/${organizationId}/hackathons`);
    } catch (error) {
      let errorMessage = 'Failed to delete hackathon. Please try again.';

      if (error instanceof Error) {
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('forbidden') || errorMsg.includes('permission')) {
          errorMessage = 'You do not have permission to delete this hackathon.';
        } else if (errorMsg.includes('not found')) {
          errorMessage =
            'Hackathon not found. It may have already been deleted.';
        } else if (errorMsg.includes('server') || errorMsg.includes('500')) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = error.message;
        }
      }

      toast.error('Failed to delete hackathon', {
        description: errorMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='bg-background-card rounded-xl border border-gray-900 p-6'>
        <div className='mb-4'>
          <h2 className='flex items-center gap-2 text-xl font-semibold text-white'>
            <Lock className='h-5 w-5 text-gray-400' />
            Visibility &amp; access
          </h2>
          <p className='mt-1 text-sm text-gray-400'>
            Public hackathons appear in listings and anyone can view them.
            Private hackathons are hidden and need a password to view.
          </p>
        </div>

        <div className='flex items-center justify-between rounded-lg border border-gray-900 p-4'>
          <div>
            <p className='text-sm text-white'>Private hackathon</p>
            <p className='text-xs text-gray-400'>
              Hide it from listings and require a password to view
            </p>
          </div>
          <Switch checked={isPrivate} onCheckedChange={setIsPrivate} />
        </div>

        {isPrivate && (
          <div className='mt-4'>
            <label className='mb-1 block text-sm text-white'>
              Access password
            </label>
            <Input
              type='password'
              value={accessPassword}
              onChange={e => setAccessPassword(e.target.value)}
              placeholder={
                wasPrivate
                  ? 'Leave blank to keep the current password'
                  : 'Set a password visitors will enter'
              }
              className='bg-background-card h-12 w-full rounded-[12px] border border-gray-900 p-4 placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0'
            />
            <p className='mt-1 text-xs text-gray-400'>
              Share this password with the people you want to let in.
            </p>
          </div>
        )}

        <div className='mt-4 flex justify-end'>
          <BoundlessButton
            onClick={saveAccess}
            disabled={isSavingAccess}
            className='min-w-[120px]'
          >
            {isSavingAccess ? 'Saving...' : 'Save visibility'}
          </BoundlessButton>
        </div>
      </div>

      <div className='bg-background-card rounded-xl border border-gray-900 p-6'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-white'>
            Advanced Settings
          </h2>
          <p className='mt-1 text-sm text-gray-400'>
            Configure advanced options for your hackathon.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
            <FormField
              control={form.control}
              name='maxParticipants'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-sm text-white'>
                    Maximum Participants
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type='number'
                      placeholder='Unlimited'
                      value={field.value || ''}
                      onChange={e =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className='bg-background-card h-12 w-full rounded-[12px] border border-gray-900 p-4 placeholder:text-gray-600 focus-visible:ring-0 focus-visible:ring-offset-0'
                    />
                  </FormControl>
                  <FormDescription className='text-xs text-gray-400'>
                    Leave empty for unlimited participants
                  </FormDescription>
                  <FormMessage className='text-error-400 text-xs' />
                </FormItem>
              )}
            />

            <div className='flex justify-end pt-4'>
              <BoundlessButton
                type='submit'
                variant='default'
                size='lg'
                disabled={isSaving}
                className='min-w-[120px]'
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </BoundlessButton>
            </div>
          </form>
        </Form>
      </div>

      <div className='bg-background-card rounded-xl border border-red-900/50 p-6'>
        <div className='mb-4'>
          <h3 className='text-lg font-semibold text-red-400'>Danger Zone</h3>
          <p className='mt-1 text-sm text-gray-400'>
            Irreversible and destructive actions
          </p>
        </div>

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant='outline'
              className='mb-4 gap-2 border-amber-700/60 text-amber-400 hover:bg-amber-950/30'
            >
              <Ban className='h-4 w-4' />
              Cancel Hackathon &amp; Refund Prize Pool
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className='bg-background-card border-gray-800'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-white'>
                Cancel Hackathon
              </AlertDialogTitle>
              <AlertDialogDescription className='text-gray-400'>
                This cancels the hackathon and refunds all contributors and any
                remaining prize pool funds to the owner. Refunds are automatic
                and may take a few minutes. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className='border-gray-800 text-white hover:bg-gray-800'>
                Keep Hackathon
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={e => {
                  e.preventDefault();
                  void cancel();
                }}
                disabled={isCancelling}
                className='bg-amber-600 text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isCancelling ? 'Cancelling…' : 'Cancel Hackathon'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant='destructive'
              className='gap-2 bg-red-600 hover:bg-red-700'
            >
              <Trash2 className='h-4 w-4' />
              Delete Hackathon
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className='bg-background-card border-gray-800'>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-white'>
                Delete Hackathon
              </AlertDialogTitle>
              <AlertDialogDescription className='text-gray-400'>
                Are you sure you want to delete this hackathon? This action
                cannot be undone and will permanently delete all associated data
                including participants, submissions, and rewards.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className='border-gray-800 text-white hover:bg-gray-800'>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className='bg-red-600 text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
