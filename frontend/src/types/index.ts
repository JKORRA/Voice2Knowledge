export type Role = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: Role;
  content: string;
  isStreaming?: boolean;
  type?: "text" | "progress" | "result" | "error" | "cancelled";
  file?: string;
  percent?: number;
  files?: { names: string[] };
}

export interface ExternalModelConfig {
  id: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
}

export interface CustomLocalModel {
  id: string;
  name: string;
  path: string;
}

export interface Settings {
  model: string;
  chatModel: string;
  device: string;
  computeType: string;
  beamSize: number;
  chatProvider: 'local' | 'external';
  externalModels: ExternalModelConfig[];
  selectedExternalModelId: string | null;
  customLocalModels?: CustomLocalModel[];
}
