export type SpeechRecognitionResult = {
  transcript: string;
  isFinal: boolean;
};

export type SpeechRecognitionStatus =
  | "idle"
  | "listening"
  | "error"
  | "unsupported";

export class SpeechRecognitionService {
  recognition: SpeechRecognition | null = null;
  isListening = false;
  lang = "ru-RU";
  onResult?: (result: SpeechRecognitionResult) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: SpeechRecognitionStatus) => void;

  constructor() {
    if (
      typeof window !== "undefined" &&
      ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ) {
      const SpeechRecognitionImpl =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionImpl();
      this.configureRecognition();
      // Автоматический рестарт при возвращении на вкладку
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.isListening) {
          try {
            this.recognition?.start();
            this.onStatusChange?.("listening");
          } catch {}
        }
      });
    } else {
      this.recognition = null;
      this.onStatusChange?.("unsupported");
    }
  }

  configureRecognition() {
    if (!this.recognition) return;
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = this.lang;
    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const result = event.results[i];
        this.onResult?.({
          transcript: result[0].transcript,
          isFinal: result.isFinal,
        });
      }
    };
    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      this.onError?.(event.error);
      this.onStatusChange?.("error");
    };
    this.recognition.onstart = () => this.onStatusChange?.("listening");
    this.recognition.onend = () => {
      this.onStatusChange?.("idle");
      // Автоматический рестарт если слушаем и нет ошибки
      if (this.isListening) {
        try {
          this.recognition?.start();
          this.onStatusChange?.("listening");
        } catch {}
      }
    };
  }

  async startListening() {
    if (!this.recognition) return;
    try {
      // Явно запрашиваем доступ к микрофону
      await navigator.mediaDevices.getUserMedia({ audio: true });
      this.recognition.start();
      this.isListening = true;
      this.onStatusChange?.("listening");
    } catch (err) {
      this.onError?.("Нет доступа к микрофону");
      this.onStatusChange?.("error");
    }
  }

  stopListening() {
    if (!this.recognition) return;
    this.recognition.stop();
    this.isListening = false;
    this.onStatusChange?.("idle");
  }

  // Fallback для Whisper (заглушка)
  async recognizeWithWhisper(audioBlob: Blob): Promise<string> {
    // TODO: реализовать интеграцию с Whisper API
    return Promise.resolve("");
  }
}
