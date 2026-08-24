import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BillingModule } from "./billing/billing.module";
import { BooksModule } from "./books/books.module";
import { GenerationModule } from "./generation/generation.module";
import { JobsModule } from "./jobs/jobs.module";
import { PdfExportModule } from "./pdf-exports/pdf-export.module";
import { TemplatesModule } from "./templates/templates.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    AuthModule,
    BillingModule,
    UsersModule,
    BooksModule,
    TemplatesModule,
    JobsModule,
    PdfExportModule,
    GenerationModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
