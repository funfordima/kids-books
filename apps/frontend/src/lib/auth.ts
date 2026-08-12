import { redirect } from "next/navigation";
import {
  getSession,
  normalizeReturnPath,
  type ParentSession
} from "./backend-client";

export const requireParentSession = async (
  returnTo: string
): Promise<ParentSession> => {
  const session = await getSession();

  if (!session.ok) {
    redirect(
      `/login?returnTo=${encodeURIComponent(normalizeReturnPath(returnTo))}`
    );
  }

  return session.data;
};
