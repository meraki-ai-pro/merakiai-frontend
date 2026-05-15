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

export function AvatarSelector({ open, onClose }: AvatarSelectorProps) {
  const [loading, setLoading] = useState(false);
  const user = useUserStore((s) => s.user);

  const handleSelect = async (avatarId: 'amy' | 'josh') => {
    setLoading(true);
    try {
      const res = await apiClient.selectAvatar(avatarId);
      if (res.success && res.data) {
        toast.success(`${avatarId === 'amy' ? 'Amy' : 'Josh'} selected!`);
        
        // Backend returns: { status, avatar_id, voice_id, did_presenter_id }
        // Avatar gender is deterministic from the selection — store it alongside
        // the voice bundle data so VideoPlayer and other components can reference it.
        if (user) {
          useUserStore.setState({
            user: {
              ...user,
              avatar_id: res.data.avatar_id,
              voice_id: res.data.voice_id,
              // Amy = female, Josh = male — matches avatar_voice_bundles in DB
              avatar_gender: avatarId === 'amy' ? 'female' : 'male',
              voice_gender: avatarId === 'amy' ? 'female' : 'male',
              avatar_provider: 'd-id',
              voice_provider: 'elevenlabs',
            },
          });
        }
        
        onClose();
      } else {
        toast.error(res.error?.message ?? 'Failed to select avatar');
      }
    } catch (err) {
      toast.error('Failed to select avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Tutor</DialogTitle>
          <DialogDescription>
            Select an AI tutor avatar to enable video responses. You can change this later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-4">
          {/* Amy */}
          <button
            onClick={() => handleSelect('amy')}
            disabled={loading}
            className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-3xl">
              👩‍🏫
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Amy</p>
              <p className="text-xs text-muted-foreground">Female voice</p>
            </div>
          </button>

          {/* Josh */}
          <button
            onClick={() => handleSelect('josh')}
            disabled={loading}
            className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-3xl">
              👨‍🏫
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Josh</p>
              <p className="text-xs text-muted-foreground">Male voice</p>
            </div>
          </button>
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