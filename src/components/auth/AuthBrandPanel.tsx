import { GraduationCap } from 'lucide-react';

interface AuthBrandPanelProps {
  variant: 'login' | 'signup';
}

const loginFeatures = [
  { title: 'Learn', desc: 'Get clear explanations of any flotation concept' },
  { title: 'Practice', desc: 'Work through real industrial scenarios step by step' },
  { title: 'Review', desc: 'Test your knowledge with adaptive assessments' },
];

const signupFeatures = [
  'Unlimited learn-mode conversations',
  'Guided practice scenarios',
  'Adaptive review assessments',
  'Video avatar responses',
  'Full conversation history',
];

export function AuthBrandPanel({ variant }: AuthBrandPanelProps) {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-card border-r border-border/40 flex-col items-center justify-center p-12">
      <div className="max-w-sm text-center">

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
          <GraduationCap className="h-8 w-8 text-primary" />
        </div>

        <h1 className="text-3xl font-bold text-foreground tracking-tight">Meraki</h1>

        {variant === 'login' ? (
          <>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Your AI-powered tutor for froth flotation. Master the concepts through
              conversation, practice scenarios, and adaptive review.
            </p>
            <div className="mt-10 grid grid-cols-1 gap-3 text-left">
              {loginFeatures.map(({ title, desc }) => (
                <div key={title} className="flex gap-3 rounded-lg border border-border/40 bg-background/50 p-3">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Join to start learning froth flotation through intelligent conversation,
              guided practice, and adaptive review — all powered by AI.
            </p>
            <div className="mt-8 rounded-xl border border-border/40 bg-background/50 p-5 text-left">
              <p className="text-xs font-semibold text-foreground mb-3">What you get</p>
              {signupFeatures.map((item) => (
                <div key={item} className="flex items-center gap-2 py-1">
                  <div className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
                  <p className="text-[11px] text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}