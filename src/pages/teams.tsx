import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { getSession, useSession } from 'next-auth/react';
import { Teams } from '~/app/_components/Teams';

//import { Teams } from "../../app/_components/Teams";

function TeamPage() {
    const session = useSession();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
            <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                    Team
                </h1>
                {session?.data?.user && <Teams />}
            </div>
        </main>
    );
}

export default function Team() {
    const router = useRouter();
    const { teamId } = router.query;

    return (
        <Layout>
            <TeamPage />
        </Layout>
    );
}
