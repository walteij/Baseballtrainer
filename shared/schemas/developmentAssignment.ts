import { z } from 'zod';

export const DevelopmentAssignmentSchema = z.object({
  id: z.string().min(1).max(100),
  teamId: z.string().uuid(),
  seasonId: z.string().uuid(),
  ageGroupId: z.string().regex(/^age_[a-z0-9_]+$/),
  goalType: z.enum(['skill_goal', 'club_goal']),
  goalId: z.string().min(1).max(100),
  active: z.boolean(),
  priority: z.number().int().min(1).max(5),
  coachNote: z.string().max(2000).optional(),
  overrides: z.object({
    name: z.string().max(300).optional(),
    description: z.string().max(2000).optional(),
    masteryTargetPercentage: z.number().min(0).max(100).optional(),
  }).strict().optional(),
}).strict();

export const SaveDevelopmentAssignmentsSchema = z.object({
  expectedVersion: z.number().int().min(0),
  modelVersion: z.number().int().positive(),
  assignments: z.array(DevelopmentAssignmentSchema).max(200),
}).strict();

export type DevelopmentAssignment = z.infer<typeof DevelopmentAssignmentSchema>;
export type SaveDevelopmentAssignments = z.infer<typeof SaveDevelopmentAssignmentsSchema>;
