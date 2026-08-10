import { API_BASE_URL } from '@/lib/constants';
import { tokenStore } from '@/services/api';
import { debugBackend } from '@/lib/debug';

/**
 * D-ID Agents real-time WebRTC client.
 *
 * Establishes a persistent live-avatar stream for a session so that video
 * answers are spoken in real-time (~1-3s) instead of rendering an MP4 clip
 * (30-60s). The backend caches the stream by session_id the moment
 * POST /stream returns, so subsequent rag turns take the fast speak() path.
 *
 * Flow (standard D-ID streaming handshake):
 *   1. POST  /api/v1/video/stream            → { stream_id, did_session_id, offer, ice_servers }
 *   2. new RTCPeerConnection({ iceServers }); setRemoteDescription(offer)
 *   3. createAnswer → setLocalDescription → POST /stream/{id}/sdp
 *   4. onicecandidate → POST /stream/{id}/ice   (trickle)
 *   5. ontrack → MediaStream (the live avatar)
 *   6. DELETE /stream/{id} on close
 *
 * One instance per session, deduped via a static registry (mirrors
 * MerakiWebSocket) so multiple mounts share a single connection.
 */

export type DidStreamStatus = 'connecting' | 'live' | 'error' | 'closed';

interface DidStreamOptions {
  sessionId: string;
  onStream: (stream: MediaStream | null) => void;
  onStatus: (status: DidStreamStatus) => void;
}

interface CreateStreamResponse {
  stream_id: string;
  did_session_id: string;
  offer: RTCSessionDescriptionInit;
  ice_servers: RTCIceServer[];
}

const REGISTRY = new Map<string, DidStream>();

export class DidStream {
  private pc: RTCPeerConnection | null = null;
  private streamId = '';
  private closed = false;

  public onStream: (stream: MediaStream | null) => void;
  public onStatus: (status: DidStreamStatus) => void;

  private readonly sessionId: string;

  static getOrCreate(opts: DidStreamOptions): DidStream {
    const existing = REGISTRY.get(opts.sessionId);
    if (existing && !existing.closed) {
      existing.onStream = opts.onStream;
      existing.onStatus = opts.onStatus;
      return existing;
    }
    const instance = new DidStream(opts);
    REGISTRY.set(opts.sessionId, instance);
    return instance;
  }

  static closeSession(sessionId: string) {
    const existing = REGISTRY.get(sessionId);
    if (existing) {
      existing.close();
      REGISTRY.delete(sessionId);
    }
  }

  private constructor(opts: DidStreamOptions) {
    this.sessionId = opts.sessionId;
    this.onStream = opts.onStream;
    this.onStatus = opts.onStatus;
    void this.connect();
  }

  private headers(): Record<string, string> {
    const token = tokenStore.get();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private url(path: string): string {
    return `${API_BASE_URL}/api/v1/video${path}`;
  }

  private async connect() {
    this.onStatus('connecting');
    try {
      const res = await fetch(this.url('/stream'), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ session_id: this.sessionId }),
      });
      if (!res.ok) throw new Error(`create stream failed: HTTP ${res.status}`);
      const data: CreateStreamResponse = await res.json();
      if (this.closed) return;

      this.streamId = data.stream_id;

      const pc = new RTCPeerConnection({ iceServers: data.ice_servers ?? [] });
      this.pc = pc;

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) void this.sendIce(event.candidate);
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        debugBackend('did:iceState', state);
        if (state === 'connected' || state === 'completed') {
          this.onStatus('live');
        } else if (state === 'failed' || state === 'closed') {
          this.onStatus('error');
        }
      };

      await pc.setRemoteDescription(data.offer);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.sendAnswer(answer.sdp ?? '');
    } catch (err) {
      if (this.closed) return;
      console.error('[DidStream] connect failed', err);
      this.onStatus('error');
    }
  }

  private async sendAnswer(sdp: string) {
    try {
      await fetch(this.url(`/stream/${encodeURIComponent(this.streamId)}/sdp`), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          session_id: this.sessionId,
          answer_sdp: sdp,
          sdp_type: 'answer',
        }),
      });
    } catch (err) {
      console.error('[DidStream] sendAnswer failed', err);
    }
  }

  private async sendIce(candidate: RTCIceCandidate) {
    try {
      await fetch(this.url(`/stream/${encodeURIComponent(this.streamId)}/ice`), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({
          session_id: this.sessionId,
          candidate: candidate.candidate,
          sdp_mid: candidate.sdpMid ?? '',
          sdp_mline_index: candidate.sdpMLineIndex ?? 0,
        }),
      });
    } catch {
      /* trickle ICE failures are non-fatal */
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.onStream(null);
    if (this.streamId) {
      // Fire-and-forget cleanup so D-ID releases the stream resource.
      fetch(
        this.url(
          `/stream/${encodeURIComponent(this.streamId)}?session_id=${encodeURIComponent(this.sessionId)}`,
        ),
        { method: 'DELETE', headers: this.headers() },
      ).catch(() => {});
    }
    try {
      this.pc?.close();
    } catch {
      /* ignore */
    }
    this.pc = null;
    this.onStatus('closed');
  }
}
