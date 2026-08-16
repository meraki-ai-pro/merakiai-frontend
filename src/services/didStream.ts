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

// How long to wait for media before calling it. D-ID's own handshake is a few
// seconds on a healthy network; 25s is generous enough not to trip a slow
// campus connection while still resolving the spinner well inside a turn.
const CONNECT_TIMEOUT_MS = 25_000;

export class DidStream {
  private pc: RTCPeerConnection | null = null;
  private streamId = '';
  private closed = false;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;

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

      // D-ID's media server is Janus, and its offer carries a datachannel
      // m-line. Creating this channel before setRemoteDescription is what
      // their reference client does; answering without it leaves that m-line
      // rejected, which is the sort of asymmetry Janus is unforgiving about.
      // It also carries D-ID's stream events, so it costs nothing to keep.
      try {
        pc.createDataChannel('JanusDataChannel');
      } catch {
        /* a datachannel is not essential to receiving media */
      }

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          this.onStream(event.streams[0]);
        }
      };

      pc.onicecandidate = (event) => {
        // A null candidate means gathering has finished. D-ID's reference
        // client posts session_id alone for that case, and it matters: without
        // the end-of-candidates signal the media server keeps waiting for more
        // instead of completing negotiation with what it has.
        if (event.candidate) void this.sendIce(event.candidate);
        else void this.sendEndOfCandidates();
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        debugBackend('did:iceState', state);
        if (state === 'connected' || state === 'completed') {
          this.clearConnectTimer();
          this.onStatus('live');
        } else if (state === 'failed' || state === 'closed') {
          this.clearConnectTimer();
          this.onStatus('error');
        }
        // 'disconnected' is deliberately NOT an error here: it is often a
        // transient blip that recovers on its own. The connect timeout below
        // is what stops it hanging for ever.
      };

      // connectionState, not just iceConnectionState. When media cannot be
      // established at all — a network that blocks the media leg even with
      // TURN available — ICE settles on 'disconnected' and never reaches
      // 'failed', while connectionState does go to 'failed'. Watching only ICE
      // left the student on "Connecting your AI tutor…" indefinitely.
      pc.onconnectionstatechange = () => {
        debugBackend('did:connState', pc.connectionState);
        if (pc.connectionState === 'failed') {
          this.clearConnectTimer();
          this.onStatus('error');
        }
      };

      // Backstop for the case where neither handler ever fires a terminal
      // state. A spinner that never resolves reads as a broken product; an
      // error state lets the UI say so and keeps the text answer usable.
      this.connectTimer = setTimeout(() => {
        if (this.closed) return;
        if (pc.iceConnectionState !== 'connected' && pc.iceConnectionState !== 'completed') {
          debugBackend('did:connectTimeout', pc.iceConnectionState);
          this.onStatus('error');
        }
      }, CONNECT_TIMEOUT_MS);

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

  /** Tell D-ID that candidate gathering is finished. */
  private async sendEndOfCandidates() {
    try {
      await fetch(this.url(`/stream/${encodeURIComponent(this.streamId)}/ice`), {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify({ session_id: this.sessionId }),
      });
    } catch {
      /* non-fatal */
    }
  }

  private clearConnectTimer() {
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.clearConnectTimer();
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
