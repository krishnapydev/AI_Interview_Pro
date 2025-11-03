
export enum Tab {
  Interview = 'Interview',
  Resume = 'Resume',
  Creative = 'Creative',
  Chat = 'Chat',
}

export interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  sources?: GroundingSource[];
}

export interface GroundingSource {
    title: string;
    uri: string;
}

export interface TranscriptEntry {
  speaker: 'user' | 'model';
  text: string;
}
