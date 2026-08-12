import { Injectable } from "@nestjs/common";
import type { SubscriptionStatus } from "../generated/prisma/enums";
import type { AuthenticatedParentContext } from "../auth/authenticated-parent";
import type { PrismaService } from "../database/prisma.service";
import type {
  BillingRepository,
  BillingSubscriptionRecord,
  BillingUserRecord,
  CreateWebhookReceiptInput,
  SyncSubscriptionInput
} from "./billing.interfaces";

const blockingStatuses = ["TRIALING", "ACTIVE"] as const;

@Injectable()
export class PrismaBillingRepository implements BillingRepository {
  public constructor(private readonly prisma: PrismaService) {}

  public async findUser(
    parent: AuthenticatedParentContext
  ): Promise<BillingUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id: parent.parentId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionStatus: true
      }
    });
  }

  public async setStripeCustomerId(
    userId: string,
    customerId: string
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId }
    });
  }

  public async findBlockingSubscription(
    userId: string
  ): Promise<BillingSubscriptionRecord | null> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: [...blockingStatuses] }
      },
      orderBy: { updatedAt: "desc" }
    });
  }

  public async hasUsedTrial(userId: string): Promise<boolean> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        OR: [
          { trialStartedAt: { not: null } },
          { trialEndsAt: { not: null } },
          { status: "TRIALING" }
        ]
      },
      select: { id: true }
    });

    return subscription !== null;
  }

  public async findUserByStripeCustomerId(
    customerId: string
  ): Promise<BillingUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { stripeCustomerId: customerId },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionStatus: true
      }
    });
  }

  public async findSubscriptionByStripeId(
    stripeSubscriptionId: string
  ): Promise<BillingSubscriptionRecord | null> {
    return this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId }
    });
  }

  public async syncSubscription(input: SyncSubscriptionInput): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: input.userId },
        data: {
          stripeCustomerId: input.stripeCustomerId,
          subscriptionStatus: input.status as SubscriptionStatus
        }
      }),
      this.prisma.subscription.upsert({
        where: { stripeSubscriptionId: input.stripeSubscriptionId },
        create: {
          userId: input.userId,
          stripeSubscriptionId: input.stripeSubscriptionId,
          stripeCustomerId: input.stripeCustomerId,
          stripePriceId: input.stripePriceId,
          plan: "monthly-999-usd",
          status: input.status as SubscriptionStatus,
          providerStatus: input.providerStatus,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          trialStartedAt: input.trialStartedAt,
          trialEndsAt: input.trialEndsAt,
          cancelAt: input.cancelAt,
          canceledAt: input.canceledAt,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          latestEventCreatedAt: input.latestEventCreatedAt
        },
        update: {
          userId: input.userId,
          stripeCustomerId: input.stripeCustomerId,
          stripePriceId: input.stripePriceId,
          status: input.status as SubscriptionStatus,
          providerStatus: input.providerStatus,
          currentPeriodStart: input.currentPeriodStart,
          currentPeriodEnd: input.currentPeriodEnd,
          trialStartedAt: input.trialStartedAt,
          trialEndsAt: input.trialEndsAt,
          cancelAt: input.cancelAt,
          canceledAt: input.canceledAt,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd,
          latestEventCreatedAt: input.latestEventCreatedAt
        }
      })
    ]);
  }

  public async createWebhookReceipt(
    input: CreateWebhookReceiptInput
  ): Promise<"created" | "completed_duplicate" | "retryable_duplicate"> {
    try {
      await this.prisma.stripeWebhookEvent.create({
        data: {
          stripeEventId: input.stripeEventId,
          type: input.type,
          providerObjectId: input.providerObjectId,
          providerCreatedAt: input.providerCreatedAt,
          processingStatus: "FAILED"
        }
      });
      return "created";
    } catch {
      const existing = await this.prisma.stripeWebhookEvent.findUnique({
        where: { stripeEventId: input.stripeEventId },
        select: { processingStatus: true }
      });

      if (
        existing?.processingStatus === "PROCESSED" ||
        existing?.processingStatus === "IGNORED"
      ) {
        return "completed_duplicate";
      }

      return "retryable_duplicate";
    }
  }

  public async markWebhookProcessed(
    stripeEventId: string,
    status: "PROCESSED" | "IGNORED",
    result: Record<string, string | boolean | null>,
    userId?: string
  ): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        processingStatus: status,
        result,
        userId,
        processedAt: new Date(),
        errorCode: null
      }
    });
  }

  public async markWebhookFailed(
    stripeEventId: string,
    errorCode: string
  ): Promise<void> {
    await this.prisma.stripeWebhookEvent.update({
      where: { stripeEventId },
      data: {
        processingStatus: "FAILED",
        errorCode
      }
    });
  }

  public async getEntitlement(
    userId: string
  ): Promise<BillingSubscriptionRecord | null> {
    return this.prisma.subscription.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });
  }
}
