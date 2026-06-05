import { cn } from '@/lib/utils';

type MerakiLogoVariant = 'color' | 'white' | 'wordmark';

interface MerakiLogoProps {
  variant?: MerakiLogoVariant;
  className?: string;
  alt?: string;
  decorative?: boolean;
}

const logoSrc: Record<MerakiLogoVariant, string> = {
  color: '/brand/meraki-icon-color.png',
  white: '/brand/meraki-icon-white.png',
  wordmark: '/brand/meraki-wordmark.png',
};

export function MerakiLogo({
  variant = 'color',
  className,
  alt = 'Meraki',
  decorative = false,
}: MerakiLogoProps) {
  return (
    <img
      src={logoSrc[variant]}
      alt={decorative ? '' : alt}
      aria-hidden={decorative ? true : undefined}
      className={cn('block object-contain', className)}
    />
  );
}
