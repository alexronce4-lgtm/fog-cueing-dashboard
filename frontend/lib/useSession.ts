"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, wsUrl } from "./api";
import type { FogEvent, StatusResponse, StreamMessage } from "./types";

export type ConnectionState = "connecting" | "open" | "closed";

interface SessionData {
  status: StatusResponse | null;
  trace: number[];
  freezeHistory: number[];
  events: FogEvent[];
  connection: ConnectionState;
}

const MAX_HISTORY = 200;

export function useSession(): SessionData {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [trace, setTrace] = useState<number[]>([]);
  const [freezeHistory, setFreezeHistory] = useState<number[]>([]);
  const [events, setEvents] = useState<FogEvent[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const socketRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessage = useCallback((msg: StreamMessage) => {
    setStatus(msg.status);
    if (msg.recent) {
      setTrace(msg.recent);
    }
    if (msg.sample) {
      setFreezeHistory((prev) => {
        const next = [...prev, msg.sample!.freeze_index];
        return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
      });
    }
    if (msg.status.active_event) {
      // Surface the in-progress episode immediately at the top of the list.
      const active = msg.status.active_event;
      setEvents((prev) => {
        const rest = prev.filter((e) => e.id !== active.id);
        return [active, ...rest].slice(0, 25);
      });
    }
  }, []);

  // Poll the REST endpoint for finalized events (durations, cued flag).
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const list = await api.events();
        if (!cancelled) setEvents(list.slice(0, 25));
      } catch {
        /* backend not ready yet */
      }
    };
    load();
    const timer = setInterval(load, 1500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    const connect = () => {
      setConnection("connecting");
      const socket = new WebSocket(wsUrl());
      socketRef.current = socket;

      socket.onopen = () => {
        if (!disposed) setConnection("open");
      };
      socket.onmessage = (evt) => {
        try {
          handleMessage(JSON.parse(evt.data) as StreamMessage);
        } catch {
          /* ignore malformed frames */
        }
      };
      socket.onclose = () => {
        if (disposed) return;
        setConnection("closed");
        retryRef.current = setTimeout(connect, 1500);
      };
      socket.onerror = () => socket.close();
    };

    connect();

    return () => {
      disposed = true;
      if (retryRef.current) clearTimeout(retryRef.current);
      socketRef.current?.close();
    };
  }, [handleMessage]);

  return { status, trace, freezeHistory, events, connection };
}
