export interface Participant {
  id: string;
  name: string;
  exclusions: string[]; // IDs of people this person cannot draw
}

export interface Assignment {
  giverId: string;
  receiverId: string;
}

export interface Room {
  id: string; // 4-digit alphanumeric
  name: string;
  participants: Participant[];
  assignments: Assignment[]; // Empty if not drawn yet
  isDrawn: boolean;
  theme: string;
}

export enum AppView {
  LANDING = 'LANDING',
  LOBBY = 'LOBBY',
  DRAW_REVEAL = 'DRAW_REVEAL',
}

export type ThemeSuggestion = {
  title: string;
  description: string;
};