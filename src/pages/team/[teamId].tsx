"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../trpc/react';
import { useSession } from 'next-auth/react';
import { Button, Input } from '@nextui-org/react';
import React from 'react';

//import { Teams } from "../../app/_components/Teams";

function TeamEditor() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId);
    const team = api.team.get.useQuery({ id: teamId }).data;
    const { data: members, refetch } = api.team.getTeamMembers.useQuery({ teamId });
    const addTeamMember = api.team.addTeamMember.useMutation();
    const [memberGithubUserName, setMemberGithubUserName] = React.useState("");

    const addMember = async () => {
        await addTeamMember.mutateAsync({ teamId, githubUserName: memberGithubUserName });
        setMemberGithubUserName("");
        refetch();
    };

    return (
        <div className="container flex justify-center">
            <div className="container w-1/2">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                        Edit Team {team?.name}
                    </h1>
                </div>
                <h2>Members</h2>
                <ul>
                    {members?.map((member) => (
                        <li key={member.id}>{member.githubUserName}</li>
                    ))}
                </ul>
                <Input
                    placeholder="@username"
                    onChange={(e) => setMemberGithubUserName(e.target.value)}
                    value={memberGithubUserName}
                    className="mt-5"
                />
                <Button
                    className="mt-5"
                    onClick={addMember}
                >
                    Add
                </Button>
            </div>
        </div>
    );
}


function TeamEditorSuspense() {
    const session = useSession();

    if (!session?.data?.user) {
        return <div>loading...</div>;
    }

    return (
        <TeamEditor/>
    );
}

export default function Team() {
    return (
        <Layout>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <TeamEditorSuspense />
            </main>
        </Layout>
    );
}
