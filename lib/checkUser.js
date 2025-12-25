import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./prisma";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches the current Clerk user with a few short retries to avoid
 * occasional nulls immediately after sign-in.
 */
async function getStableCurrentUser() {
  const attempt = async () => {
    try {
      const user = await currentUser();
      if (user) return user;

      // Fallback: pull from auth() when currentUser is temporarily null.
      const { userId } = await auth();
      if (!userId) return null;
      return await currentUser();
    } catch (e) {
      return null;
    }
  };

  const retries = [0, 120, 240]; // total ~360ms backoff
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

    // 1. Check if user already exists in OUR database
    // We use 'clerkId' as defined in our schema.prisma
    const loggedInUser = await db.user.findUnique({
      where: {
        clerkId: user.id, 
      },
    });

    if (loggedInUser) {
      return loggedInUser;
    }

    // 2. Create a new user if not found
    const primaryEmail =
      user.emailAddresses?.find((e) => e.id === user.primaryEmailAddressId)
        ?.emailAddress || user.emailAddresses?.[0]?.emailAddress;

    const newUser = await db.user.create({
      data: {
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

    return newUser;
  } catch (error) {
    console.error("Error in checkUser:", error);
    return null;
  }
};