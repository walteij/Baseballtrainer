import { z } from 'zod';

export const AgeGroupIdSchema = z.enum(['Beeball', 'U12', 'U15', 'U21', 'Senioren']);
export const UuidSchema = z.string().uuid();
export const SkillIdSchema = z.string().min(1).max(100).regex(/^[a-z0-9][a-z0-9._-]*$/i);
export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'MISSING_PROGRESSION',
  'BAD_REQUEST',
  'NOT_FOUND',
  'CONFLICT',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export const ProgramSettingsSchema = z.object({
  startDate: z.string().date(),
  day: z.string().min(1).max(20),
  time: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
  duration: z.number().int().min(15).max(240),
  phase: z.string().min(1).max(80),
  location: z.string().min(1).max(160),
  equipment: z.array(z.string().min(1).max(80)).max(50),
  field: z.boolean(),
  cage: z.boolean(),
  mound: z.boolean(),
});

export const CreateProgramSchema = z.object({
  team_id: UuidSchema,
  settings: ProgramSettingsSchema,
});
export const ProgramIdParamsSchema = z.object({ id: UuidSchema });
export const ProgramSessionsParamsSchema = ProgramIdParamsSchema;
export const SessionIdParamsSchema = z.object({ id: UuidSchema });
export const SessionIcalParamsSchema = SessionIdParamsSchema;
export const UpdateSessionCompletionSchema = z.object({
  completed: z.boolean(),
  completedItems: z.array(z.string().min(1).max(100)).max(100),
});
export const CreateTeamSchema = z.object({
  name: z.string().trim().min(1).max(100),
  age_group_id: AgeGroupIdSchema,
});
export const UpdateTeamSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  age_group_id: AgeGroupIdSchema.optional(),
}).refine((value) => value.name !== undefined || value.age_group_id !== undefined);
export const TeamIdParamsSchema = z.object({ id: UuidSchema });
export const SkillProgressionQuerySchema = z.object({
  age_group_id: AgeGroupIdSchema,
});
export const TeamSkillProgressParamsSchema = z.object({ id: UuidSchema });
export const TeamSkillProgressUpdateParamsSchema = z.object({
  id: UuidSchema,
  skillId: SkillIdSchema,
});
export const UpdateTeamSkillProgressSchema = z.object({
  status: z.enum(['introduced', 'developing', 'proficient']),
  notes: z.string().trim().max(500).optional(),
});
export const AgeGroupGoalsParamsSchema = z.object({ ageGroupId: AgeGroupIdSchema });
export const AgeGroupGoalsQuerySchema = z.object({
  version: z.coerce.number().int().positive().optional(),
});
export const CreateTeamSeasonParamsSchema = z.object({ teamId: UuidSchema });
export const CreateTeamSeasonSchema = z.object({
  year: z.number().int().min(2000).max(2200),
  age_group_id: AgeGroupIdSchema,
  name: z.string().trim().min(1).max(100).optional(),
});
export const TeamSeasonGoalsParamsSchema = z.object({
  teamId: UuidSchema,
  seasonId: UuidSchema,
});
export const SaveTeamSeasonGoalsSchema = z.object({
  age_group_goal_version: z.number().int().positive(),
  selected_generic_goal_ids: z.array(UuidSchema).max(200),
  team_goals: z.array(z.object({
    id: UuidSchema.optional(),
    text: z.string().trim().min(1).max(300),
    skill_ids: z.array(SkillIdSchema).max(50),
  })).max(200),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});
