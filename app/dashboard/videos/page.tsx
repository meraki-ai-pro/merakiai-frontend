import { VideoLibrary } from '@/components/activities/VideoLibrary';

export const metadata = {
  title: 'Videos | Meraki',
  description: 'Animations and lecture videos from your lecturer.',
};

export default function VideosPage() {
  return <VideoLibrary />;
}
