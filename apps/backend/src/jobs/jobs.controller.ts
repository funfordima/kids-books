import { Controller, Get, Inject, Param, Req, UseGuards } from "@nestjs/common";
import type { AuthenticatedRequest } from "../auth/authenticated-parent";
import { AuthenticatedParentGuard } from "../auth/authenticated-parent.guard";
import { validateNonEmptyIdentifier } from "../common/validation";
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

  @UseGuards(AuthenticatedParentGuard)
  @Get(":jobId")
  public getJobStatus(
    @Req() request: AuthenticatedRequest,
    @Param("jobId") jobId: string
  ): GenerationJobStatus {
    if (!request.parent) {
      throw new Error("Authenticated parent context missing after guard.");
    }

    return this.jobsService.getJobStatus(
      request.parent,
      validateNonEmptyIdentifier(jobId, "jobId")
    );
  }
}
