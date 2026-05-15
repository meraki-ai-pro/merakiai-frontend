import { WS_URL } from '@/lib/constants';
import type { WsIncoming } from '@/types';

type OnMessageFn   = (msg: WsIncoming) => void;
type OnAuthErrorFn = () => void;


const REGISTRY = new Map<string, MerakiWebSocket>();

export class MerakiWebSocket {
  private ws:      WebSocket | null = null;
  private retries  = 0;
  private closed   = false;

  public onMessage: OnMessageFn;

  private readonly sessionId:   string;
  private readonly getToken:    () => string | null;
  private readonly onAuthError: OnAuthErrorFn;

  static getOrCreate(opts: {
    sessionId:   string;
    getToken:    () => string | null;
    onMessage:   OnMessageFn;
    onAuthError: OnAuthErrorFn;
  }): MerakiWebSocket {
    const existing = REGISTRY.get(opts.sessionId);
    if (existing && !existing.closed) {
      // Update the handler pointer — never recreate the socket.
      existing.onMessage = opts.onMessage;
      return existing;
    }
    const instance = new MerakiWebSocket(opts);
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

  private constructor(opts: {
    sessionId:   string;
    getToken:    () => string | null;
    onMessage:   OnMessageFn;
    onAuthError: OnAuthErrorFn;
  }) {
    this.sessionId   = opts.sessionId;
    this.getToken    = opts.getToken;
    this.onMessage   = opts.onMessage;
    this.onAuthError = opts.onAuthError;
    this.connect();
  }

  private connect() {
    if (this.closed) return;

    const token = this.getToken();
    if (!token) {
      console.warn('[WS] No auth token — cannot connect');
      this.onAuthError();
      return;
    }

    const url = `${WS_URL}/ws/${this.sessionId}?token=${encodeURIComponent(token)}`;
    console.log(`[WS] Connecting session=${this.sessionId} retry=${this.retries}`);

    try {
      this.ws = new WebSocket(url);
    } catch (err) {
      console.error('[WS] Failed to construct WebSocket:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log(`[WS] Connected session=${this.sessionId}`);
      this.retries = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsIncoming = JSON.parse(event.data);
        this.onMessage(msg);
      } catch {
        console.error('[WS] Parse error', event.data);
      }
    };

    this.ws.onclose = (event) => {
      if (this.closed) return;
      if (event.code === 4001) {
        console.error('[WS] Auth failure (4001) — not retrying');
        this.onAuthError();
        return;
      }
      console.warn(`[WS] Closed code=${event.code} — will retry`);
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onerror fires before onclose — let onclose handle the reconnect.
      console.warn('[WS] Socket error on session', this.sessionId);
    };
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.retries, 30_000);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.retries + 1})`);
    this.retries++;
    setTimeout(() => this.connect(), delay);
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  private send(payload: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn(`[WS] Not open (state=${this.ws?.readyState}) — dropped`, payload);
    }
  }

  // ─── Typed send helpers ───────────────────────────────────────────────────

  sendLearnMessage(message: string) {
    this.send({ type: 'rag_turn', message });
  }

  startModeSession(opts: {
    mode:        'application' | 'review';
    session_type: string;
    difficulty:  'Basic' | 'Intermediate' | 'Advanced';
    total_items: number;
  }) {
    this.send({ type: 'mode_session_start', ...opts });
  }

  sendModeAnswer(modeSessionId: string, message: string) {
    this.send({ type: 'mode_session_turn', mode_session_id: modeSessionId, message });
  }

  endModeSession(modeSessionId: string) {
    this.send({ type: 'mode_session_end', mode_session_id: modeSessionId });
  }

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  close() {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}
