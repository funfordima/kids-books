import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { AuthModule } from "./auth/auth.module";
import { BooksModule } from "./books/books.module";
import { JobsModule } from "./jobs/jobs.module";
import { TemplatesModule } from "./templates/templates.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [AuthModule, UsersModule, BooksModule, TemplatesModule, JobsModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
