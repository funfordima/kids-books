import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { BooksController } from "./books.controller";
import { BooksService } from "./books.service";

@Module({
  imports: [BillingModule],
  controllers: [BooksController],
  providers: [BooksService],
  exports: [BooksService]
})
export class BooksModule {}
