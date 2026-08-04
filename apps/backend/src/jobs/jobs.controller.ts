import { Controller, Get, Inject, Param } from "@nestjs/common";
import type {
  GenerationJobStatus,
  JobsModuleStatus
} from "./jobs.interfaces";
import { JobsService } from "./jobs.service";

@Controller("jobs")
export class JobsController {
  public constructor(
    @Inject(JobsService) private readonly jobsService: JobsService
  ) {}

  @Get("status")
  public getStatus(): JobsModuleStatus {
    return this.jobsService.getStatus();
  }

  @Get(":jobId")
  public getJobStatus(
    @Param("jobId") jobId: string
  ): GenerationJobStatus {
    return this.jobsService.getJobStatus(jobId);
  }
}
