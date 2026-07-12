import { Controller, Get } from "@nestjs/common";
import { AppService, type ServiceInfo } from "./app.service";

@Controller()
export class AppController {
  public constructor(private readonly appService: AppService) {}

  @Get()
  public getServiceInfo(): ServiceInfo {
    return this.appService.getServiceInfo();
  }
}
