import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));


async function getStableCurrentUser() {
  const attempt = async () => {
    try {
      const user = await currentUser();
      if (user) return user;

      const { userId } = await auth();
      if (!userId) return null;
      return await currentUser();
    } catch (e) {
      return null;
    }
  };

  const retries = [0, 120, 240];
  for (const delay of retries) {
    if (delay) await sleep(delay);
    const user = await attempt();
    if (user) return user;
  }
  return null;
}

export const checkUser = async () => {
  try {
    const user = await getStableCurrentUser();

    if (!user) {
      return null;
    }

    // Use upsert to atomically find or create the user, avoiding race conditions
    const primaryEmail =
      user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress || user.emailAddresses?.[0]?.emailAddress;

    const loggedInUser = await db.user.upsert({
      where: { clerkId: user.id },
      update: {}, // If found, do nothing
      create: {
        clerkId: user.id,
        email: primaryEmail || "",
        firstName: user.firstName,
        lastName: user.lastName,
        // We default role to USER, preventing accidental admin access
        role: "USER",
        // We initialize strikes to 0
        strikeCount: 0,
      },
    });

    return loggedInUser;
  } catch (error) {
    console.error("Error in checkUser:", error);
    return null;
  }
};