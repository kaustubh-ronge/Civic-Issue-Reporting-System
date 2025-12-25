import { checkUser } from "@/lib/checkUser";
import HeroClient from "./HeroClient";

export default async function Hero() {
    // Fetch the user to determine if they are Admin or Citizen
    const user = await checkUser();

    return (
        <section className="bg-slate-950 min-h-screen">
            <HeroClient user={user} />
        </section>
    );
}