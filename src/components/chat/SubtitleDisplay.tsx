'use client';

interface SubtitleDisplayProps {
  text: string;
}

export function SubtitleDisplay({ text }: SubtitleDisplayProps) {
  return (
    <div className="absolute bottom-20 left-0 right-0 flex justify-center px-4 py-2">
      <div className="bg-black/80 px-4 py-2 rounded-lg max-w-xs md:max-w-md lg:max-w-lg backdrop-blur">
        <p className="text-white text-center text-sm md:text-base font-medium leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}
