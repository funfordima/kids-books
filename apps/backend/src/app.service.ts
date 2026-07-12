import { Injectable } from "@nestjs/common";
import { SHARED_PACKAGE_VERSION } from "@kids-books/shared";

export interface ServiceInfo {
  readonly name: "kids-books-backend";
  readonly sharedPackageVersion: typeof SHARED_PACKAGE_VERSION;
}

@Injectable()
export class AppService {
  public getServiceInfo(): ServiceInfo {
    return {
      name: "kids-books-backend",
      sharedPackageVersion: SHARED_PACKAGE_VERSION
    };
  }
}
