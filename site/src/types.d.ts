export type PresetName = 'cssnano-preset-default' | 'cssnano-preset-lite' | 'cssnano-preset-advanced';

export interface MinificationSuccess {
  ok: true;
  css: string;
}

export interface MinificationError {
  ok: false;
  error: { message: string };
}

export interface CssNanoWorker {
  postMessage: (request: MinificationRequest) => void;
  onmessage: ((event: MessageEvent) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent) => void) | null;
}

export interface MinificationRequest {
  input: string;
  config: PresetName;
}

export type MinificationResult = MinificationSuccess | MinificationError;
