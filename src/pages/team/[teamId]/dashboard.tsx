"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../../trpc/react';
import { useSession } from 'next-auth/react';
import React from 'react';

function AuthTokens() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);

    const { data: stats } = api.teamDashboard.getDashboardStats.useQuery({ teamId });

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900">
            <h2 className="text-xl">Members</h2>
            <ul className="my-5">
                {stats?.teamMembers?.map((member)  => {
                    return (
                        <li key={member.id} className="flex">
                            <div className="grow self-center">
                                <a href={`https://github.com/${member.githubUserName}`} target="_blank">{member.githubUserName}</a>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <h2 className="text-xl">Github Repositories</h2>
            <ul className="my-5">
                {stats?.githubRepositories?.map((repo)  => {
                    return (
                        <li key={repo.id} className="flex">
                            <div className="grow self-center">
                                <a href={`https://github.com/${repo.path}`} target="_blank">{repo.path}</a>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function TeamEditorSuspense() {
    const session = useSession();

    if (!session?.data?.user) {
        return <div>loading...</div>;
    }

    return (
        <div className="container w-1/2">
            <AuthTokens/>
        </div>
    );
}

export default function Team() {
    return (
        <Layout>
            <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <div className="container flex flex-col items-center justify-center pb-8 mt-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-center">
                        Team Dashboard
                    </h1>
                </div>

                <TeamEditorSuspense />
            </main>
        </Layout>
    );
}
