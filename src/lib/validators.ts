import { z } from 'zod';

// Message validators
export const messageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, 'Message cannot be empty').max(10000),
  audioUrl: z.string().url().optional(),
  timestamp: z.date(),
});

export const chatRequestSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1, 'Message cannot be empty').max(5000),
  audioUrl: z.string().url().optional(),
});

// Subtitle validators
export const subtitleSchema = z.object({
  id: z.string().uuid(),
  start: z.number().min(0),
  end: z.number().min(0),
  text: z.string().min(1),
});

// Video response validators
export const videoResponseSchema = z.object({
  videoUrl: z.string().url(),
  duration: z.number().min(0),
  subtitles: z.array(subtitleSchema),
  status: z.enum(['generating', 'ready', 'error']),
});

// Conversation validators
export const conversationSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  createdAt: z.date(),
  updatedAt: z.date(),
  messages: z.array(messageSchema).default([]),
  previewMessage: z.string().optional(),
});

// Auth validators
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100),
});

// User preferences validators
export const userPreferencesSchema = z.object({
  theme: z.enum(['dark', 'light']),
  language: z.string().default('en'),
  subtitlesEnabled: z.boolean().default(true),
  autoPlayVideo: z.boolean().default(true),
});

// Pagination validators
export const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
});

// Type exports
export type Message = z.infer<typeof messageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type Subtitle = z.infer<typeof subtitleSchema>;
export type VideoResponse = z.infer<typeof videoResponseSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;
export type SignupCredentials = z.infer<typeof signupSchema>;
export type UserPreferences = z.infer<typeof userPreferencesSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
