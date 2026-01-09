
export interface ScriptOptions {
  padding: number;
  prefix: string;
  defaultListName: string;
  autoSave: boolean;
}

export interface GeneratedScript {
  code: string;
  description: string;
  platform: 'Trello' | 'Generic' | 'Custom';
}
