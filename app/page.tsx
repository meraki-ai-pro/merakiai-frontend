'use client'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useRouter } from 'next/navigation'
import { Sparkles, Video, Zap, Brain } from 'lucide-react'

export default function Home() {
  const router = useRouter()

  return (
    <main className="flex min-h-screen flex-col">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/40 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">Meraki</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button onClick={() => router.push('/dashboard')} className="gap-2">
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 py-12 md:py-24 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
            <Zap className="h-4 w-4" />
            <span className="text-sm font-medium">AI-Powered Learning</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-balance leading-tight">
            Learn with
            <span className="block bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Meraki
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto text-balance">
            Experience education reimagined. Ask questions, get video responses with synchronized subtitles. Powered by advanced AI.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => router.push('/dashboard')}
              className="gap-2 px-6 py-3"
            >
              Start Learning
              <Sparkles className="h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border bg-card/50 py-12 md:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Features
            </h2>
            <p className="text-muted-foreground text-lg">
              Everything you need for interactive learning
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
              <Video className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Video Responses</h3>
              <p className="text-sm text-muted-foreground">
                Get educational answers delivered as engaging videos with your own AI avatar
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
              <Sparkles className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Smart Subtitles</h3>
              <p className="text-sm text-muted-foreground">
                Perfect synchronized subtitles in multiple languages for accessibility
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
              <Brain className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Advanced AI</h3>
              <p className="text-sm text-muted-foreground">
                Powered by Claude API for intelligent, pedagogically appropriate responses
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
              <Zap className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Voice Input</h3>
              <p className="text-sm text-muted-foreground">
                Simply speak your questions - powered by OpenAI Whisper
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
              <Video className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Conversation History</h3>
              <p className="text-sm text-muted-foreground">
                Keep track of all your learning conversations in one place
              </p>
            </div>

            <div className="p-6 rounded-lg border border-border bg-background hover:border-primary/50 transition-colors">
              <Brain className="h-10 w-10 text-primary mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Personalized Learning</h3>
              <p className="text-sm text-muted-foreground">
                Customize preferences and get responses tailored to your learning style
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-12 md:py-24 text-center">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Ready to start learning?
          </h2>
          <p className="text-lg text-muted-foreground">
            Join students worldwide using Meraki for a smarter learning experience.
          </p>
          <Button
            size="lg"
            onClick={() => router.push('/dashboard')}
            className="gap-2 px-6 py-3"
          >
            Get Started Free
            <Sparkles className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-muted-foreground">
          <p>Built with Next.js and powered by advanced AI. © 2026 Meraki. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}