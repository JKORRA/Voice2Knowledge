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

export interface Settings {
  model: string;
  chatModel: string;
  device: string;
  computeType: string;
  beamSize: number;
}
