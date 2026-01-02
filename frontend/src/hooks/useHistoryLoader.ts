import { useState, useEffect, useCallback, useRef } from "react";
import type { AllMessage, TimestampedSDKMessage } from "../types";
import type { ConversationHistory } from "../../../shared/types";
import { getConversationUrl } from "../config/api";
import { useMessageConverter } from "./useMessageConverter";

// Polling interval in milliseconds (3 seconds)
const POLLING_INTERVAL = 3000;

interface HistoryLoaderState {
  messages: AllMessage[];
  loading: boolean;
  error: string | null;
  sessionId: string | null;
}

interface HistoryLoaderResult extends HistoryLoaderState {
  loadHistory: (projectPath: string, sessionId: string) => Promise<void>;
  clearHistory: () => void;
}

// Type guard to check if a message is a TimestampedSDKMessage
function isTimestampedSDKMessage(
  message: unknown,
): message is TimestampedSDKMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "type" in message &&
    "timestamp" in message &&
    typeof (message as { timestamp: unknown }).timestamp === "string"
  );
}

/**
 * Hook for loading and converting conversation history from the backend
 */
export function useHistoryLoader(): HistoryLoaderResult {
  const [state, setState] = useState<HistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
  });

  const { convertConversationHistory } = useMessageConverter();

  const loadHistory = useCallback(
    async (encodedProjectName: string, sessionId: string) => {
      if (!encodedProjectName || !sessionId) {
        setState((prev) => ({
          ...prev,
          error: "Encoded project name and session ID are required",
        }));
        return;
      }

      try {
        setState((prev) => ({
          ...prev,
          loading: true,
          error: null,
        }));

        const response = await fetch(
          getConversationUrl(encodedProjectName, sessionId),
        );

        if (!response.ok) {
          throw new Error(
            `Failed to load conversation: ${response.status} ${response.statusText}`,
          );
        }

        const conversationHistory: ConversationHistory = await response.json();

        // Validate the response structure
        if (
          !conversationHistory.messages ||
          !Array.isArray(conversationHistory.messages)
        ) {
          throw new Error("Invalid conversation history format");
        }

        // Convert unknown[] to TimestampedSDKMessage[] with type checking
        const timestampedMessages: TimestampedSDKMessage[] = [];
        for (const msg of conversationHistory.messages) {
          if (isTimestampedSDKMessage(msg)) {
            timestampedMessages.push(msg);
          } else {
            console.warn("Skipping invalid message in history:", msg);
          }
        }

        // Convert to frontend message format
        const convertedMessages =
          convertConversationHistory(timestampedMessages);

        setState((prev) => ({
          ...prev,
          messages: convertedMessages,
          loading: false,
          sessionId: conversationHistory.sessionId,
        }));
      } catch (error) {
        console.error("Error loading conversation history:", error);

        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation history",
        }));
      }
    },
    [convertConversationHistory],
  );

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
    });
  }, []);

  return {
    ...state,
    loadHistory,
    clearHistory,
  };
}

/**
 * Hook for loading conversation history on mount when sessionId is provided
 * Includes automatic polling to detect external updates (e.g., from SSH/CLI)
 */
export function useAutoHistoryLoader(
  encodedProjectName?: string,
  sessionId?: string,
  enablePolling: boolean = true,
): HistoryLoaderResult {
  const [state, setState] = useState<HistoryLoaderState>({
    messages: [],
    loading: false,
    error: null,
    sessionId: null,
  });

  const { convertConversationHistory } = useMessageConverter();
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageCountRef = useRef<number>(0);

  // Shared fetch and convert function
  const fetchAndConvert = useCallback(
    async (isPolling: boolean = false) => {
      if (!encodedProjectName || !sessionId) return;

      try {
        if (!isPolling) {
          setState((prev) => ({ ...prev, loading: true, error: null }));
        }

        const response = await fetch(
          getConversationUrl(encodedProjectName, sessionId),
        );

        if (!response.ok) {
          if (!isPolling) {
            throw new Error(
              `Failed to load conversation: ${response.status} ${response.statusText}`,
            );
          }
          return;
        }

        const conversationHistory: ConversationHistory = await response.json();

        if (
          !conversationHistory.messages ||
          !Array.isArray(conversationHistory.messages)
        ) {
          if (!isPolling) {
            throw new Error("Invalid conversation history format");
          }
          return;
        }

        const newMessageCount = conversationHistory.messages.length;

        // For polling: only update if there are new messages
        if (isPolling && newMessageCount <= lastMessageCountRef.current) {
          return;
        }

        if (isPolling) {
          console.log(
            `[Polling] Detected ${newMessageCount - lastMessageCountRef.current} new message(s), updating...`
          );
        }

        // Convert messages
        const timestampedMessages: TimestampedSDKMessage[] = [];
        for (const msg of conversationHistory.messages) {
          if (isTimestampedSDKMessage(msg)) {
            timestampedMessages.push(msg);
          }
        }

        const convertedMessages = convertConversationHistory(timestampedMessages);

        setState((prev) => ({
          ...prev,
          messages: convertedMessages,
          loading: false,
          sessionId: conversationHistory.sessionId,
        }));

        lastMessageCountRef.current = newMessageCount;
      } catch (error) {
        console.error("Error loading conversation history:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to load conversation history",
        }));
      }
    },
    [encodedProjectName, sessionId, convertConversationHistory],
  );

  // Initial load
  useEffect(() => {
    if (encodedProjectName && sessionId) {
      fetchAndConvert(false);
    } else if (!sessionId) {
      setState({
        messages: [],
        loading: false,
        error: null,
        sessionId: null,
      });
      lastMessageCountRef.current = 0;
    }
  }, [encodedProjectName, sessionId, fetchAndConvert]);

  // Polling for external updates
  useEffect(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    if (!enablePolling || !encodedProjectName || !sessionId) {
      return;
    }

    pollingRef.current = setInterval(() => {
      fetchAndConvert(true);
    }, POLLING_INTERVAL);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [encodedProjectName, sessionId, enablePolling, fetchAndConvert]);

  const clearHistory = useCallback(() => {
    setState({
      messages: [],
      loading: false,
      error: null,
      sessionId: null,
    });
    lastMessageCountRef.current = 0;
  }, []);

  return {
    ...state,
    loadHistory: async (_encodedProjectName: string, _sessionId: string) => {
      await fetchAndConvert(false);
    },
    clearHistory,
  };
}
