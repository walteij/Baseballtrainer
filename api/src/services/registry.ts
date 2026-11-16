import { DefaultAzureCredential } from '@azure/identity';
import { loadConfig, type AppConfig } from './config.js';
import { CosmosClientProvider, CosmosRepository } from './cosmos.js';
import { TeamService } from './teams.js';
import { GoalsService } from './goals.js';
import { SkillService } from './skills.js';
import { CatalogService } from './catalog.js';
import { ProgramService } from './programs.js';
import { TeamAccessService } from './teamAccess.js';
import { CurriculumService } from './curriculum.js';
import { DevelopmentService } from './development.js';
import { DevelopmentAssignmentService } from './developmentAssignments.js';
import { DevelopmentSteeringService } from './developmentSteering.js';
import type { ICatalogService } from './interfaces/ICatalogService.js';
import type { IGoalsService } from './interfaces/IGoalsService.js';
import type { IProgramService } from './interfaces/IProgramService.js';
import type { ISkillService } from './interfaces/ISkillService.js';
import type { ITeamService } from './interfaces/ITeamService.js';

export interface Services {
  catalog: ICatalogService;
  goals: IGoalsService;
  programs: IProgramService;
  skills: ISkillService;
  teams: ITeamService;
  teamAccess: Pick<TeamAccessService, 'requireGoalWrite' | 'list' | 'assign' | 'unassign'>;
  curriculum: Pick<CurriculumService, 'get' | 'save'>;
  development: Pick<DevelopmentService, 'get' | 'save'>;
  developmentAssignments: Pick<DevelopmentAssignmentService, 'get' | 'save'>;
  developmentSteering: Pick<DevelopmentSteeringService, 'transitionCheck'>;
  cosmos: { healthCheck(): Promise<boolean> };
  hostStorage: { healthCheck(): Promise<boolean> };
}
let services: Services | null = null;
export function registerServices(value: Services): void { services = value; }
export function clearServices(): void { services = null; }
export function createHostStorageCheck(config: AppConfig) {
  return {
      async healthCheck(): Promise<boolean> {
        try {
          if (config.environment === 'Development') {
            const response = await fetch('http://127.0.0.1:10000/devstoreaccount1?comp=list', { signal: AbortSignal.timeout(5000) });
            return response.status === 200 || response.status === 400 || response.status === 403;
          }
          const endpoint = process.env.AzureWebJobsStorage__blobServiceUri ??
            (process.env.AzureWebJobsStorage__accountName ? `https://${process.env.AzureWebJobsStorage__accountName}.blob.core.windows.net` : undefined);
          if (!endpoint) return false;
          const token = await new DefaultAzureCredential().getToken('https://storage.azure.com/.default');
          const response = await fetch(`${endpoint.replace(/\/$/, '')}/?comp=list&maxresults=1`, {
            headers: { authorization: `Bearer ${token.token}`, 'x-ms-version': '2023-11-03', 'x-ms-date': new Date().toUTCString() },
            signal: AbortSignal.timeout(5000),
          });
          return response.ok;
        } catch { return false; }
      },
  };
}
export function getServices(): Services {
  if (!services) {
    const config = loadConfig();
    const provider = new CosmosClientProvider(config);
    const repo = new CosmosRepository(provider, config.cosmosDatabase);
    const catalog = new CatalogService(repo);
    const skills = new SkillService(repo);
    const steering = new DevelopmentSteeringService(repo);
    const hostStorage = createHostStorageCheck(config);
    services = { catalog, skills, cosmos: repo, hostStorage, teams: new TeamService(repo), goals: new GoalsService(repo), programs: new ProgramService(repo, catalog, skills, steering), teamAccess: new TeamAccessService(repo), curriculum: new CurriculumService(repo), development: new DevelopmentService(repo), developmentAssignments: new DevelopmentAssignmentService(repo), developmentSteering: steering };
  }
  return services;
}
