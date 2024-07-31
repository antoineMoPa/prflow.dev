import { getServerAuthSession } from "../server/auth";
import { HydrateClient } from "../trpc/server";
import NavBar from "./_components/NavBar";

export default async function Home() {
    return (
        <HydrateClient>
            <NavBar/>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                        Measure & <span className="text-[hsl(280,100%,70%)]">improve</span> team workflows
                    </h1>
                </div>
            </main>
        </HydrateClient>
    );
}
