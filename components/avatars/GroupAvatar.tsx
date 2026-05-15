import Link from 'next/link';
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from '@/components/ui/avatar';

interface GroupAvatarProps {
  members: string[];
  usernames?: (string | undefined)[];
}

const GroupAvatar = ({ members, usernames }: GroupAvatarProps) => {
  const showCount = members.length > 3;
  const maxVisible = showCount ? 3 : members.length;
  const visibleMembers = members.slice(0, maxVisible);
  const remainingCount = members.length - maxVisible;

  return (
    <AvatarGroup>
      {visibleMembers.map((member, index) => {
        const username = usernames?.[index];
        const avatar = (
          <Avatar className='size-8 border-none! sm:size-6'>
            <AvatarImage src={member} alt={`Member ${index + 1}`} />
            <AvatarFallback className='bg-[#1E2329] text-[10px] text-white'>
              {member.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        );
        if (username) {
          return (
            <Link
              key={index}
              href={`/profile/${username}`}
              target='_blank'
              rel='noopener noreferrer'
              aria-label={`View @${username} profile`}
              className='hover:ring-primary/40 rounded-full transition-all hover:ring-2'
            >
              {avatar}
            </Link>
          );
        }
        return <div key={index}>{avatar}</div>;
      })}
      {remainingCount > 0 && (
        <AvatarGroupCount className='bg-background text-foreground ring-border size-8 text-xs font-bold ring-2 sm:size-6 sm:text-xs'>
          +{remainingCount}
        </AvatarGroupCount>
      )}
    </AvatarGroup>
  );
};

export default GroupAvatar;
