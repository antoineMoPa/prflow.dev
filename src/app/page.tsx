import Link from "next/link";

import { LatestPost } from "./_components/post";
import { GithubTokens } from "./_components/githubTokens";
import { getServerAuthSession } from "../server/auth";
import { api, HydrateClient } from "../trpc/server";
import { Teams } from "./_components/Teams";
import NavBar from "./_components/NavBar";

export default async function Home() {
    const hello = await api.post.hello({ text: "from tRPC" });
    const session = await getServerAuthSession();

    void api.post.getLatest.prefetch();

    return (
        <HydrateClient>
            <NavBar/>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                        Measure & <span className="text-[hsl(280,100%,70%)]">improve</span> team workflows
                    </h1>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-2xl text-white">
                            {hello ? hello.greeting : "Loading tRPC query..."}
                        </p>

                        <div className="flex flex-col items-center justify-center gap-4">
                            <p className="text-center text-2xl text-white">
                                {session && <span>Logged in as {session.user?.name}</span>}
                            </p>
                        </div>
                    </div>

                    {session?.user && <Teams />}
                    {session?.user && <LatestPost />}
                    {session?.user && <GithubTokens />}
                </div>
            </main>
        </HydrateClient>
    );
}
