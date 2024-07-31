"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../trpc/react';
import { useSession } from 'next-auth/react';
import { Button, Input } from '@nextui-org/react';
import React from 'react';
import { FaRegTrashCan } from 'react-icons/fa6';

//import { Teams } from "../../app/_components/Teams";

function TeamEditor() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId);
    const team = api.team.get.useQuery({ id: teamId }).data;
    const { data: members, refetch } = api.team.getTeamMembers.useQuery({ teamId });
    const addTeamMember = api.team.addTeamMember.useMutation();
    const deleteTeamMember = api.team.deleteTeamMember.useMutation();
    const [memberGithubUserName, setMemberGithubUserName] = React.useState("@username");

    const addMember = async () => {
        if (!memberGithubUserName) {
            return;
        }
        await addTeamMember.mutateAsync({ teamId, githubUserName: memberGithubUserName });
        setMemberGithubUserName("");
        refetch();
    };

    const deleteMember = async (memberId) => {
        await deleteTeamMember.mutateAsync({ memberId });
        refetch();
    };

    return (
        <div className="container flex justify-center">
            <div className="container w-1/2">
                <div className="container flex flex-col items-center justify-center py-8">
                    <h1 className="text-2xl font-extrabold tracking-tight text-center">
                        Edit Team {team?.name}
                    </h1>
                </div>
                <h2 className="text-xl">Members</h2>
                <ul className="my-10">
                    {members?.map((member) => (
                        <li key={member.id} className="flex">
                            <div className="grow self-center">
                                {member.githubUserName}
                            </div>
                            <Button
                                className="ml-2 mt-2"
                                startContent={<FaRegTrashCan/>}
                                onClick={() => deleteMember(member.id)}
                            >
                                Delete
                            </Button>
                        </li>
                    ))}
                </ul>
                <div className="flex my-2 mb-5">
                    <Input
                        onChange={(e) => setMemberGithubUserName(e.target.value)}
                        value={memberGithubUserName}
                        className="grow self-center"
                    />
                    <Button
                        className="ml-2"
                        onClick={addMember}
                    >
                        Add
                    </Button>
                </div>
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
