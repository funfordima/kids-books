import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module";
import { OpenAiModerationAdapter } from "../generation/openai.adapters";
import { loadOpenAiProviderConfig } from "../generation/provider.config";
import {
  DeterministicTemplateGeneralizer,
  DeterministicTemplateSimilarityPort
} from "./template-publication.ports";
import { PrismaTemplatePublicationRepository } from "./template-publication.repository";
import { TemplatesController } from "./templates.controller";
import {
  TEMPLATE_GENERALIZATION_PORT,
  TEMPLATE_PUBLICATION_MODERATION_PORT,
  TEMPLATE_PUBLICATION_REPOSITORY,
  TEMPLATE_SIMILARITY_PORT
} from "./templates.interfaces";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [DatabaseModule],
  controllers: [TemplatesController],
  providers: [
    TemplatesService,
    {
      provide: TEMPLATE_PUBLICATION_REPOSITORY,
      useClass: PrismaTemplatePublicationRepository
    },
    {
      provide: TEMPLATE_GENERALIZATION_PORT,
      useClass: DeterministicTemplateGeneralizer
    },
    {
      provide: TEMPLATE_SIMILARITY_PORT,
      useClass: DeterministicTemplateSimilarityPort
    },
    {
      provide: TEMPLATE_PUBLICATION_MODERATION_PORT,
      useFactory: () => {
        try {
          return new OpenAiModerationAdapter(loadOpenAiProviderConfig());
        } catch {
          return {
            moderateText: () =>
              Promise.reject(new Error("Template moderation is not configured."))
          };
        }
      }
    }
  ],
  exports: [TemplatesService]
})
export class TemplatesModule {}
