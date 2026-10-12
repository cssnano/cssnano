export type PresetName = import('./_data/presets.js').PresetName;

export interface MinificationSuccess {
  ok: true;
  css: string;
}

export interface MinificationError {
  ok: false;
  /** `input` is true only when the submitted CSS is the cause. */
  error: { message: string; input: boolean };
}

export interface CssNanoWorker {
  postMessage: (request: MinificationRequest) => void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

export interface MinificationRequest {
  input: string;
  preset: PresetName;
}

export type MinificationResult = MinificationSuccess | MinificationError;
