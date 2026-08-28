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
      this.onAuthError();
      return;
    }

    const url = `${WS_URL}/ws/${this.sessionId}?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retries = 0;
    };

    this.ws.onmessage = (event) => {
      // Parsing and handling are guarded SEPARATELY on purpose.
      //
      // One try/catch around both swallows every exception the application's
      // handler throws and reports it as "malformed socket message" — so a
      // rendering bug looks exactly like a protocol problem: frames arrive,
      // nothing appears on screen, and the console stays clean. That cost an
      // afternoon once; a handler that throws must be loud.
      let msg: WsIncoming;
      try {
        msg = JSON.parse(event.data);
      } catch {
        console.warn('[ws] ignoring malformed frame', String(event.data).slice(0, 200));
        return;
      }

      try {
        this.onMessage(msg);
      } catch (err) {
        console.error('[ws] handler threw while applying a frame', msg, err);
      }
    };

    this.ws.onclose = (event) => {
      if (this.closed) return;
      if (event.code === 4001) {
        this.onAuthError();
        return;
      }
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onerror fires before onclose — let onclose handle the reconnect.
    };
  }

  private scheduleReconnect() {
    const delay = Math.min(1000 * 2 ** this.retries, 30_000);
    this.retries++;
    setTimeout(() => this.connect(), delay);
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  private send(payload: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
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
