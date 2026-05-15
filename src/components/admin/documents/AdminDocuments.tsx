'use client';

import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '@/services/adminApi';
import type { AdminDocument, DocumentUploadRequest } from '@/services/adminApi';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  FileUp,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DOC_TYPES = [
  { value: 'knowledge', label: 'Knowledge Base' },
  { value: 'assessment', label: 'Assessment' },
] as const;

const DEFAULT_MODES = [
  { value: 'learn', label: 'Learn' },
  { value: 'practice', label: 'Practice' },
  { value: 'review', label: 'Review' },
] as const;

const DIFFICULTIES = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    ready:      { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    failed:     { icon: XCircle,      color: 'text-red-400',     bg: 'bg-red-400/10' },
    processing: { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  };
  const cfg = map[status] ?? map.processing;
  const Icon = cfg.icon;
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium', cfg.bg, cfg.color)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}

export function AdminDocuments() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [form, setForm] = useState<DocumentUploadRequest>({
    doc_type: 'knowledge',
    default_mode: 'learn',
    difficulty: 'beginner',
    version: '',
  });

  const load = async () => {
    setLoading(true);
    const res = await adminApiClient.getAllDocuments();
    if (res.success && Array.isArray(res.data)) {
      setDocuments(res.data);
    } else {
      setDocuments([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadResult(null);

    const params: DocumentUploadRequest = {
      ...form,
      version: form.version || undefined,
    };

    const res = await adminApiClient.uploadDocument(selectedFile, params);
    if (res.success) {
      setUploadResult({ success: true, message: res.data?.message ?? 'Document uploaded successfully.' });
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } else {
      setUploadResult({ success: false, message: res.error?.message ?? 'Upload failed.' });
    }
    setUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload panel */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <FileUp className="h-4 w-4 text-primary" />
          Upload New Document
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
          {/* Doc type */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Document Type</label>
            <div className="relative">
              <select
                value={form.doc_type}
                onChange={(e) => setForm((f) => ({ ...f, doc_type: e.target.value as typeof form.doc_type }))}
                className="w-full appearance-none rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 pr-8"
              >
                {DOC_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            </div>
          </div>

          {/* Default mode */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Default Mode</label>
            <div className="relative">
              <select
                value={form.default_mode}
                onChange={(e) => setForm((f) => ({ ...f, default_mode: e.target.value as typeof form.default_mode }))}
                className="w-full appearance-none rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 pr-8"
              >
                {DEFAULT_MODES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Difficulty</label>
            <div className="relative">
              <select
                value={form.difficulty}
                onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as typeof form.difficulty }))}
                className="w-full appearance-none rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 pr-8"
              >
                {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 pointer-events-none" />
            </div>
          </div>

          {/* Version */}
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Version (optional)</label>
            <input
              type="text"
              value={form.version}
              onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
              placeholder="e.g. v2.1"
              className="w-full rounded-lg border border-border bg-accent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* File drop area */}
        <div
          onClick={() => fileRef.current?.click()}
          className={cn(
            'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all',
            selectedFile
              ? 'border-primary/40 bg-primary/5'
              : 'border-border hover:border-primary/30 hover:bg-card'
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <Upload className={cn('h-6 w-6', selectedFile ? 'text-primary' : 'text-muted-foreground/50')} />
          <div className="text-center">
            {selectedFile ? (
              <>
                <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">{(selectedFile.size / 1024).toFixed(1)} KB — click to change</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Drop a file or click to browse</p>
                <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOCX, TXT supported</p>
              </>
            )}
          </div>
        </div>

        {uploadResult && (
          <div className={cn(
            'mt-3 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm',
            uploadResult.success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          )}>
            {uploadResult.success ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />}
            {uploadResult.message}
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!selectedFile || uploading}
          className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary/85 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? 'Uploading & Ingesting…' : 'Upload Document'}
        </button>
      </div>

      {/* Documents table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Ingested Documents
          </h2>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground/90 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground/70">No documents ingested yet</p>
            <p className="text-xs text-muted-foreground/50 mt-1">Upload a document above to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60">
                  {['Filename', 'Type', 'Mode', 'Difficulty', 'Status', 'Uploaded'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {documents.map((doc, i) => (
                  <tr
                    key={doc.id}
                    className={cn(
                      'border-b border-border/50 hover:bg-card transition-colors',
                      i % 2 === 0 ? '' : 'bg-muted/30'
                    )}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground/60 flex-shrink-0" />
                        <span className="text-foreground/90 font-medium max-w-[180px] truncate">{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-muted-foreground text-xs capitalize">{doc.doc_type}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-muted-foreground text-xs capitalize">{doc.default_mode}</span>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-muted-foreground text-xs capitalize">{doc.difficulty}</span>
                    </td>
                    <td className="px-6 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-muted-foreground/70 text-xs">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
