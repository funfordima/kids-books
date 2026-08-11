import { Module } from "@nestjs/common";
import { GenerationQueueProducer } from "./generation-queue.producer";
import { JobsController } from "./jobs.controller";
import { JobsService } from "./jobs.service";
import { NoopGenerationQueueLifecycle } from "./queue.lifecycle";

@Module({
  controllers: [JobsController],
  providers: [JobsService, GenerationQueueProducer, NoopGenerationQueueLifecycle],
  exports: [JobsService, GenerationQueueProducer, NoopGenerationQueueLifecycle]
})
export class JobsModule {}
