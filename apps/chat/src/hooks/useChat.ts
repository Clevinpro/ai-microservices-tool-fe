import { sendMessage as chatApiSendMessage, streamMessage, type IChatMessage } from '@libs/api';
import { queryKeys, useConversation } from '@libs/store';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

const RESPONSE_RECEIVE_ERROR_MESSAGE = 'Could not receive AI response. Please try again.';
const RESPONSE_SEND_ERROR_MESSAGE = 'Could not send message. Please try again.';
const PENDING_STREAM_STORAGE_KEY = 'pendingChatStream';
const PENDING_STREAM_TTL_MS = 10 * 60 * 1000;
const RECONNECT_IDLE_TIMEOUT_MS = 45_000;

type AiSsePayload = {
  userId?: string;
  event?: 'status' | 'chunk' | 'complete' | 'error';
  status?: string;
  result?: string;
  conversationId?: string;
  error?: string;
};

type PendingChatStream = {
  conversationId: string;
  createdAt: string;
};

function readPendingStream(): PendingChatStream | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(PENDING_STREAM_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PendingChatStream;
    return typeof parsed.conversationId === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

function savePendingStream(conversationId: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(
    PENDING_STREAM_STORAGE_KEY,
    JSON.stringify({ conversationId, createdAt: new Date().toISOString() }),
  );
}

function clearPendingStream(conversationId?: string | null) {
  if (typeof window === 'undefined') {
    return;
  }

  const pending = readPendingStream();
  if (!conversationId || pending?.conversationId === conversationId) {
    window.localStorage.removeItem(PENDING_STREAM_STORAGE_KEY);
  }
}

function getTimestamp(value?: string): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function getElapsedSeconds(startedAt?: string) {
  const startedAtTimestamp = getTimestamp(startedAt);
  if (startedAtTimestamp === null) {
    return undefined;
  }

  return Math.max(0, Math.round((Date.now() - startedAtTimestamp) / 1000));
}

function isPendingStreamExpired(pending: PendingChatStream) {
  const createdAt = getTimestamp(pending.createdAt);
  return createdAt !== null && Date.now() - createdAt > PENDING_STREAM_TTL_MS;
}

function hasAssistantResponseForLatestUser(messages: IChatMessage[]) {
  const latestUserIndex = messages.reduce(
    (lastIndex, message, index) => (message.role === 'user' ? index : lastIndex),
    -1,
  );

  return messages
    .slice(latestUserIndex + 1)
    .some((message) => message.role === 'assistant' && message.content.trim().length > 0);
}

export type UseChatOptions = {
  onConversationId?: (id: string) => void;
};

export function useChat(conversationId: string | null, options?: UseChatOptions) {
  const queryClient = useQueryClient();
  const onConversationIdRef = useRef(options?.onConversationId);
  onConversationIdRef.current = options?.onConversationId;

  const [messages, setMessages] = useState<IChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [localConversationId, setLocalConversationId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const inFlightRef = useRef(false);
  const lastStreamEventAtRef = useRef<number | null>(null);
  const lastOptimisticResponseRef = useRef<{
    conversationId: string;
    assistantContent: string;
  } | null>(null);

  const effectiveConversationId = conversationId ?? localConversationId;

  const closeStream = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  useEffect(() => {
    if (inFlightRef.current && eventSourceRef.current) {
      setLocalConversationId(null);
      return;
    }

    setLocalConversationId(null);
    closeStream();
    inFlightRef.current = false;
    setStreaming(false);
  }, [closeStream, conversationId]);

  const { data: conversationBundle, isLoading: loadingHistory } = useConversation(conversationId);

  useEffect(() => {
    if (!conversationId) {
      if (!inFlightRef.current) {
        setMessages([]);
      }
      return;
    }
    if (conversationBundle?.messages) {
      const pending = readPendingStream();
      if (
        pending?.conversationId === conversationId &&
        (isPendingStreamExpired(pending) ||
          hasAssistantResponseForLatestUser(conversationBundle.messages))
      ) {
        clearPendingStream(conversationId);
      }

      const optimisticResponse = lastOptimisticResponseRef.current;
      const historyHasOptimisticAssistant =
        optimisticResponse?.conversationId === conversationId &&
        conversationBundle.messages.some(
          (message) =>
            message.role === 'assistant' && message.content === optimisticResponse.assistantContent,
        );

      if (optimisticResponse?.conversationId === conversationId && !historyHasOptimisticAssistant) {
        return;
      }

      if (historyHasOptimisticAssistant) {
        lastOptimisticResponseRef.current = null;
      }

      setMessages((prev) => {
        const pendingAssistant = prev.find(
          (message) => message.role === 'assistant' && message.content.trim().length === 0,
        );

        if (inFlightRef.current && pendingAssistant) {
          return [...conversationBundle.messages, pendingAssistant];
        }

        return conversationBundle.messages;
      });
    }
  }, [conversationId, conversationBundle]);

  const rememberConversationId = useCallback(
    (nextConversationId: string) => {
      setLocalConversationId((prev) => prev ?? nextConversationId);
      onConversationIdRef.current?.(nextConversationId);
      void queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.one(nextConversationId),
      });
    },
    [queryClient],
  );

  const connectStream = useCallback(
    (convIdForFilter: string | null, pendingAssistantId: string) => {
      closeStream();

      const es = streamMessage(convIdForFilter ?? undefined);
      eventSourceRef.current = es;
      let streamOpened = false;
      let resolveStreamReady: () => void;
      let rejectStreamReady: (reason?: unknown) => void;
      const streamReady = new Promise<void>((resolve, reject) => {
        resolveStreamReady = resolve;
        rejectStreamReady = reject;
      });

      const finishStream = () => {
        if (eventSourceRef.current === es) {
          closeStream();
        } else {
          es.close();
        }
        inFlightRef.current = false;
        lastStreamEventAtRef.current = null;
        setStreaming(false);
      };

      const showReceiveError = (content = RESPONSE_RECEIVE_ERROR_MESSAGE) => {
        setMessages((prev) => [
          ...prev.filter((message) => message.id !== pendingAssistantId),
          {
            role: 'system',
            content,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        ]);
      };

      const parsePayload = (event: MessageEvent<string>): AiSsePayload => {
        try {
          return JSON.parse(event.data) as AiSsePayload;
        } catch {
          return { result: typeof event.data === 'string' ? event.data : '' };
        }
      };

      const handleStreamMessage = (event: MessageEvent<string>) => {
        lastStreamEventAtRef.current = Date.now();
        const payload = parsePayload(event);
        const nextConversationId = payload.conversationId ?? convIdForFilter;

        if (nextConversationId) {
          rememberConversationId(nextConversationId);
        }

        if (payload.event === 'status') {
          const status = typeof payload.status === 'string' ? payload.status : undefined;
          if (status) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === pendingAssistantId && message.content.trim().length === 0
                  ? { ...message, status, responseSeconds: getElapsedSeconds(message.createdAt) }
                  : message,
              ),
            );
          }
          return;
        }

        if (payload.event === 'complete') {
          setMessages((prev) =>
            prev.map((message) =>
              message.id === pendingAssistantId
                ? { ...message, responseSeconds: getElapsedSeconds(message.createdAt) }
                : message,
            ),
          );
          clearPendingStream(nextConversationId);
          finishStream();
          return;
        }

        if (payload.event === 'error') {
          clearPendingStream(nextConversationId);
          showReceiveError(payload.error);
          finishStream();
          return;
        }

        const piece = typeof payload.result === 'string' ? payload.result : '';

        if (piece) {
          setMessages((prev) => {
            let assistantContent = piece;
            const next = prev.map((message) => {
              if (message.id !== pendingAssistantId) {
                return message;
              }

              assistantContent = `${message.content}${piece}`;
              return {
                ...message,
                content: assistantContent,
                status: undefined,
                responseSeconds: getElapsedSeconds(message.createdAt),
              };
            });

            if (nextConversationId) {
              lastOptimisticResponseRef.current = {
                conversationId: nextConversationId,
                assistantContent,
              };
            }

            return next;
          });
        }

        if (!payload.event) {
          finishStream();
        }
      };

      es.onopen = () => {
        streamOpened = true;
        resolveStreamReady();
      };

      es.onmessage = handleStreamMessage;

      es.onerror = () => {
        showReceiveError();
        finishStream();
        if (!streamOpened) {
          rejectStreamReady(new Error(RESPONSE_RECEIVE_ERROR_MESSAGE));
        }
      };

      return streamReady;
    },
    [closeStream, rememberConversationId],
  );

  useEffect(() => {
    if (!conversationId || loadingHistory || inFlightRef.current || eventSourceRef.current) {
      return;
    }

    const pending = readPendingStream();
    if (pending?.conversationId !== conversationId) {
      return;
    }
    if (
      isPendingStreamExpired(pending) ||
      hasAssistantResponseForLatestUser(conversationBundle?.messages ?? [])
    ) {
      clearPendingStream(conversationId);
      return;
    }

    const pendingAssistantId = crypto.randomUUID();
    inFlightRef.current = true;
    lastStreamEventAtRef.current = Date.now();
    setStreaming(true);
    setMessages((prev) => {
      const hasPendingAssistant = prev.some(
        (message) => message.role === 'assistant' && message.content.trim().length === 0,
      );

      if (hasPendingAssistant) {
        return prev.map((message) =>
          message.role === 'assistant' && message.content.trim().length === 0
            ? {
                ...message,
                id: pendingAssistantId,
                status: message.status ?? 'Reconnecting to stream...',
                responseSeconds: getElapsedSeconds(message.createdAt),
              }
            : message,
        );
      }

      return [
        ...prev,
        {
          role: 'assistant',
          content: '',
          id: pendingAssistantId,
          createdAt: pending.createdAt,
          status: 'Reconnecting to stream...',
          responseSeconds: getElapsedSeconds(pending.createdAt),
        },
      ];
    });

    const idleTimeoutId = window.setInterval(() => {
      const lastStreamEventAt = lastStreamEventAtRef.current;
      if (lastStreamEventAt === null || !inFlightRef.current) {
        window.clearInterval(idleTimeoutId);
        return;
      }
      if (Date.now() - lastStreamEventAt < RECONNECT_IDLE_TIMEOUT_MS) {
        return;
      }

      clearPendingStream(conversationId);
      closeStream();
      inFlightRef.current = false;
      lastStreamEventAtRef.current = null;
      setStreaming(false);
      setMessages((prev) =>
        prev.filter(
          (message) =>
            !(
              message.id === pendingAssistantId &&
              message.role === 'assistant' &&
              message.content.trim().length === 0
            ),
        ),
      );
      window.clearInterval(idleTimeoutId);
    }, 1000);

    void connectStream(conversationId, pendingAssistantId).catch(() => {
      clearPendingStream(conversationId);
      inFlightRef.current = false;
      lastStreamEventAtRef.current = null;
      setStreaming(false);
      window.clearInterval(idleTimeoutId);
    });

    return () => {
      window.clearInterval(idleTimeoutId);
    };
  }, [connectStream, conversationId, loadingHistory]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || inFlightRef.current) {
        return;
      }

      const convForSend = effectiveConversationId ?? undefined;
      const userMessageId = crypto.randomUUID();
      const assistantMessageId = crypto.randomUUID();
      const createdAt = new Date().toISOString();

      inFlightRef.current = true;
      setStreaming(true);
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: trimmed, id: userMessageId, createdAt },
        {
          role: 'assistant',
          content: '',
          id: assistantMessageId,
          createdAt,
          status: 'Waiting for response...',
          responseSeconds: 0,
        },
      ]);
      if (convForSend) {
        savePendingStream(convForSend);
      }

      try {
        await connectStream(effectiveConversationId, assistantMessageId);
        const response = await chatApiSendMessage({
          message: trimmed,
          conversationId: convForSend,
        });
        const nextConversationId = response.conversationId ?? convForSend;

        if (nextConversationId) {
          rememberConversationId(nextConversationId);
          savePendingStream(nextConversationId);
        }
      } catch {
        clearPendingStream(convForSend);
        closeStream();
        inFlightRef.current = false;
        setStreaming(false);
        setMessages((prev) => [
          ...prev.filter(
            (message) => message.id !== userMessageId && message.id !== assistantMessageId,
          ),
          {
            role: 'system',
            content: RESPONSE_SEND_ERROR_MESSAGE,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
          },
        ]);
        return;
      }
    },
    [closeStream, connectStream, effectiveConversationId],
  );

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, [closeStream]);

  return { messages, streaming, loadingHistory, sendMessage };
}
