import { Injectable } from "@nestjs/common";
import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

export function requireDatabaseUrl(
  databaseUrl = process.env["DATABASE_URL"]
): string {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required before enabling PrismaService");
  }

  return databaseUrl;
}

export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg(databaseUrl)
  });
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  public constructor(databaseUrl = requireDatabaseUrl()) {
    super({
      adapter: new PrismaPg(databaseUrl)
    });
  }

  public async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  public async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
