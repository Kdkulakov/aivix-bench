"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  SpeechRecognitionService,
  SpeechRecognitionResult,
  SpeechRecognitionStatus,
} from "./speechRecognition";

async function sendToBackend(text: string) {
  try {
    const res = await fetch("/api/process-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error("Ошибка запроса к backend");
    return await res.json();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[Backend]", e);
    return null;
  }
}

export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [backendResult, setBackendResult] = useState<any>(null);
  const serviceRef = useRef<SpeechRecognitionService | null>(null);

  useEffect(() => {
    serviceRef.current = new SpeechRecognitionService();
    const service = serviceRef.current;
    service.onResult = async (result: SpeechRecognitionResult) => {
      setTranscript((prev) =>
        result.isFinal ? result.transcript : prev + result.transcript
      );
      if (result.isFinal && result.transcript.trim()) {
        const backendResp = await sendToBackend(result.transcript.trim());
        setBackendResult(backendResp);
        // eslint-disable-next-line no-console
        console.log("[Backend response]", backendResp);
      }
    };
    service.onError = (err) => setError(err);
    service.onStatusChange = (s) => setStatus(s);
    // Стартуем прослушку сразу при маунте
    (async () => {
      await service.startListening();
    })();
    return () => {
      service.stopListening();
    };
  }, []);

  // Логируем результат в консоль для отладки
  useEffect(() => {
    if (transcript) {
      // eslint-disable-next-line no-console
      console.log("[SpeechRecognition]", transcript);
    }
  }, [transcript]);

  const start = useCallback(async () => {
    setTranscript("");
    setError(null);
    await serviceRef.current?.startListening();
  }, []);

  const stop = useCallback(() => {
    serviceRef.current?.stopListening();
  }, []);

  return {
    status,
    error,
    transcript,
    backendResult,
    start,
    stop,
    isListening: status === "listening",
    isSupported: status !== "unsupported",
  };
}
