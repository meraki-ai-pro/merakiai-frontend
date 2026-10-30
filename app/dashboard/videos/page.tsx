import { VideoLibrary } from '@/components/activities/VideoLibrary';

export const metadata = {
  title: 'YouTube Videos/Animations | Meraki',
  description: 'Animations and lecture videos from your instructor.',
};

export default function VideosPage() {
  return <VideoLibrary />;
}
