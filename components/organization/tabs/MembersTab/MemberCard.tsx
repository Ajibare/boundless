'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BoundlessButton } from '@/components/buttons';
import { ChevronsUpDown, Delete } from 'lucide-react';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  status: 'active' | 'pending' | 'suspended';
}

interface MemberCardProps {
  member: Member;
  onRoleChange: (memberId: string, newRole: string) => void;
  onRemoveMember: (memberId: string) => void;
  canManage?: boolean;
}

const roleLabel = (role: Member['role']) =>
  role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Member';

export default function MemberCard({
  member,
  onRoleChange,
  onRemoveMember,
  canManage = false,
}: MemberCardProps) {
  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex gap-3'>
        <Avatar className='h-12 w-12'>
          <AvatarImage src={member.avatar} alt={member.name} />
          <AvatarFallback className='bg-gray-700 text-white'>
            {member.name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className='flex flex-col gap-0'>
          <h4 className='text-white'>{member.name}</h4>
          <p className='text-sm text-gray-500'>{member.email}</p>
        </div>
      </div>

      <div className='flex items-center gap-2'>
        {canManage ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant='outline'
                size='sm'
                title='Change role'
                className='data-[state=open]:text-primary border-gray-700 text-gray-300 hover:text-white'
              >
                Role: {roleLabel(member.role)}
                <ChevronsUpDown className='ml-1 size-4' />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align='end'
              className='bg-background w-60 rounded-[16px] border-white/24 p-2'
            >
              <p className='px-2 py-1 text-xs text-gray-500'>
                Set this person&apos;s role
              </p>
              <RadioGroup
                value={member.role}
                onValueChange={value => onRoleChange(member.id, value)}
                className='flex flex-col gap-1'
              >
                <label
                  htmlFor={`admin-${member.id}`}
                  className='flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/5'
                >
                  <span>
                    <span className='block text-sm text-white'>Admin</span>
                    <span className='block text-xs text-gray-500'>
                      Helps run the organization and treasury
                    </span>
                  </span>
                  <RadioGroupItem
                    value='admin'
                    id={`admin-${member.id}`}
                    className='mt-1'
                  />
                </label>
                <label
                  htmlFor={`member-${member.id}`}
                  className='flex cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2 hover:bg-white/5'
                >
                  <span>
                    <span className='block text-sm text-white'>Member</span>
                    <span className='block text-xs text-gray-500'>
                      Can view and take part
                    </span>
                  </span>
                  <RadioGroupItem
                    value='member'
                    id={`member-${member.id}`}
                    className='mt-1'
                  />
                </label>
              </RadioGroup>
            </PopoverContent>
          </Popover>
        ) : (
          <span className='rounded-full border border-gray-800 px-3 py-1 text-xs text-gray-400'>
            {roleLabel(member.role)}
          </span>
        )}

        {canManage && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                title='Remove member'
                className='h-8 rounded-full border border-gray-700 bg-transparent px-3 text-xs text-gray-300 hover:bg-gray-800 hover:text-white'
              >
                Remove
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align='end'
              side='bottom'
              className='bg-background w-60 rounded-[16px] border-white/24 p-3'
            >
              <p className='mb-2 text-xs text-gray-400'>
                Remove {member.name} from this organization?
              </p>
              <BoundlessButton
                variant='destructive'
                icon={<Delete className='size-4 text-white' />}
                fullWidth
                onClick={() => onRemoveMember(member.id)}
                className='text-white'
              >
                Remove member
              </BoundlessButton>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
