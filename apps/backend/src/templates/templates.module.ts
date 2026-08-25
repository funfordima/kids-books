import { Module } from "@nestjs/common";
import {
  DeterministicTemplateGeneralizer,
  DeterministicTemplateSimilarityPort
} from "./template-publication.ports";
import { TemplatesController } from "./templates.controller";
import {
  TEMPLATE_GENERALIZATION_PORT,
  TEMPLATE_SIMILARITY_PORT
} from "./templates.interfaces";
import { TemplatesService } from "./templates.service";

@Module({
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    {
      provide: TEMPLATE_GENERALIZATION_PORT,
      useClass: DeterministicTemplateGeneralizer
    },
    {
      provide: TEMPLATE_SIMILARITY_PORT,
      useClass: DeterministicTemplateSimilarityPort
    }
  ],
  exports: [TemplatesService]
})
export class TemplatesModule {}
