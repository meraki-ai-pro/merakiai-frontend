'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { apiClient } from '@/services/api';
import { useUserStore } from '@/store/userStore';
import toast from 'react-hot-toast';

interface AvatarSelectorProps {
  open: boolean;
  onClose: () => void;
}

const AVATARS = [
  { id: 'amy', name: 'Amy', gender: 'female', emoji: '👩‍🏫', voice: 'Female voice', gradient: 'from-pink-400 to-purple-500' },
  { id: 'josh', name: 'Josh', gender: 'male', emoji: '👨‍🏫', voice: 'Male voice', gradient: 'from-blue-400 to-cyan-500' },
] as const;

type AvatarId = (typeof AVATARS)[number]['id'];

/** Shared by the first-run dialog and the header toggle. */
function useSelectAvatar() {
  const [loading, setLoading] = useState(false);
  const user = useUserStore((s) => s.user);

  const select = async (avatarId: AvatarId): Promise<boolean> => {
    const avatar = AVATARS.find((a) => a.id === avatarId)!;
    setLoading(true);
    try {
      const res = await apiClient.selectAvatar(avatarId);
      if (!res.success || !res.data) {
        toast.error(res.error?.message ?? 'Failed to select avatar');
        return false;
      }
      toast.success(`${avatar.name} selected!`);
      // Backend returns: { status, avatar_id, voice_id, did_presenter_id }.
      // Gender is deterministic from the selection and matches
      // avatar_voice_bundles, so it is stored alongside.
      if (user) {
        useUserStore.setState({
          user: {
            ...user,
            avatar_id: res.data.avatar_id,
            voice_id: res.data.voice_id,
            avatar_gender: avatar.gender,
            voice_gender: avatar.gender,
            avatar_provider: 'd-id',
            voice_provider: 'elevenlabs',
          },
        });
      }
      return true;
    } catch {
      toast.error('Failed to select avatar');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { select, loading, currentId: user?.avatar_id };
}

/**
 * Switch tutor without leaving the conversation. Shown beside the Text/Video
 * toggle while video answers are on; the live stream reopens with the new
 * presenter (see useAvatarStream).
 */
export function AvatarToggle({ disabled = false }: { disabled?: boolean }) {
  const { select, loading, currentId } = useSelectAvatar();

  return (
    <div role="radiogroup" aria-label="Video tutor" className="flex items-center gap-0.5">
      {AVATARS.map((a) => {
        const active = currentId === a.id;
        return (
          <button
            key={a.id}
            role="radio"
            aria-checked={active}
            aria-label={`${a.name} (${a.voice.toLowerCase()})`}
            title={active ? `${a.name} is your video tutor` : `Switch video tutor to ${a.name}`}
            onClick={() => !active && void select(a.id)}
            disabled={disabled || loading}
            className={`flex h-7 items-center gap-1 rounded-lg px-1.5 text-xs font-semibold transition-all disabled:opacity-50 ${
              active
                ? 'bg-slate-950/[0.08] text-slate-950 dark:bg-white/15 dark:text-white'
                : 'text-slate-500 hover:bg-slate-950/5 dark:text-slate-400 dark:hover:bg-white/10'
            }`}
          >
            <span aria-hidden>{a.emoji}</span>
            <span className="hidden lg:inline">{a.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function AvatarSelector({ open, onClose }: AvatarSelectorProps) {
  const { select, loading } = useSelectAvatar();

  const handleSelect = async (avatarId: AvatarId) => {
    if (await select(avatarId)) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Tutor</DialogTitle>
          <DialogDescription>
            Select an AI tutor avatar to enable video responses. You can switch tutor any time from the header.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleSelect(a.id)}
              disabled={loading}
              className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${a.gradient} flex items-center justify-center text-3xl`}>
                {a.emoji}
              </div>
              <div className="text-center">
                <p className="font-semibold text-sm">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.voice}</p>
              </div>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={onClose}
          className="w-full mt-2"
        >
          Skip for now
        </Button>
      </DialogContent>
    </Dialog>
  );
}