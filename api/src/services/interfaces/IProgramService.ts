import type {
  Program,
  ProgramSettings,
  Session,
} from '../../../../shared/types/entities.js';

export interface IProgramService {
  createProgram(teamId: string, settings: ProgramSettings): Promise<{ program: Program; sessions: Session[] }>;
  getProgram(id: string): Promise<Program | null>;
  listSessions(programId: string): Promise<Session[] | null>;
  listTeamSessions(teamId: string): Promise<Session[]>;
  getSession(id: string): Promise<Session | null>;
  saveSession(id: string, session: Session): Promise<Session>;
  healthCheck(): Promise<boolean>;
}
