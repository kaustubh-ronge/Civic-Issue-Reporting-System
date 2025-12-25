import { checkUser } from "@/lib/checkUser";
import HeaderClient from "./HeaderClient";

export default async function Header() {
  // Fetch user data server-side (syncs with DB automatically)
  const user = await checkUser();

  return <HeaderClient user={user} />;
}