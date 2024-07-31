"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../trpc/react';
import { useSession } from 'next-auth/react';
import { Button, Input, Select, SelectItem } from '@nextui-org/react';
import React from 'react';
import { FaRegTrashCan } from 'react-icons/fa6';
import Link from 'next/link';

function AuthTokens() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId);
    const { data: allAuthTokens, refetch } = api.team.getAllTokens.useQuery({ teamId });

    const utils = api.useUtils();
    const [name, setName] = React.useState("team token");
    const [value, setValue] = React.useState("");
    const [tokenType, setTokenType] = React.useState("github");

    const createAuthToken = api.team.createToken.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            setName("");
            setValue("");
            await refetch();
        },
    });

    const deleteAuthToken = api.team.deleteToken.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            await refetch();
        },
    });

    return (
        <div>
            <h2 className="text-xl">Authentication tokens</h2>
            <p>
                Generate a github authentication token here:&nbsp;
                <Link
                    href="https://github.com/settings/tokens"
                    className="text-blue-500"
                    target="_blank">
                    github.com/settings/tokens
                </Link>
            </p>
            <ul className="my-5">
                {allAuthTokens?.map((authToken)  => {
                    return (
                        <li key={authToken.id} className="flex">
                            <div className="grow self-center">
                                {authToken.name} - {authToken.type} token
                            </div>
                            <Button
                                className="ml-2 mt-2"
                                startContent={<FaRegTrashCan/>}
                                onClick={() => deleteAuthToken.mutate({ id: authToken.id, teamId })}
                            >
                                Delete
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createAuthToken.mutate({ name, value, teamId, type: tokenType });
                }}
                className="flex flex-col gap-2"
            >
                <div className="flex">
                    <Input
                        type="text"
                        label="Name"
                        onChange={(e) => setName(e.target.value)}
                        value={name}
                    />
                    <Input
                        type="text"
                        label="Token"
                        className="ml-5"
                        onChange={(e) => setValue(e.target.value)}
                        value={value}
                    />
                    <Select
                        selectedKeys={[tokenType]}
                        className="ml-5"
                        label="Token Type"
                        onChange={(e) => setTokenType(e.target.value)}
                    >
                       <SelectItem key="github">GitHub</SelectItem>
                    </Select>
                    <Button
                        type="submit"
                        className="ml-5 px-10 py-7"
                        disabled={createAuthToken.isPending}
                    >
                        {createAuthToken.isPending ? "Submitting..." : "Add"}
                    </Button>
                </div>
            </form>
        </div>
    );
}


function TeamEditor() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId);
    const { data: team } = api.team.get.useQuery({ id: teamId });
    const { data: members, refetch } = api.team.getTeamMembers.useQuery({ teamId });
    const addTeamMember = api.team.addTeamMember.useMutation();
    const deleteTeamMember = api.team.deleteTeamMember.useMutation();
    const [memberGithubUserName, setMemberGithubUserName] = React.useState("");

    const addMember = async () => {
        if (!memberGithubUserName) {
            return;
        }
        await addTeamMember.mutateAsync({ teamId, githubUserName: memberGithubUserName });
        setMemberGithubUserName("");
        await refetch();
    };

    const deleteMember = async (memberId: number) => {
        await deleteTeamMember.mutateAsync({ memberId, teamId });
        await refetch();
    };

    return (
        <div className="mb-10">
            <div>
                <div className="container flex flex-col items-center justify-center py-8">
                    <h1 className="text-4xl font-extrabold tracking-tight text-center">
                        Edit Team {team?.name}
                    </h1>
                </div>
                <h2 className="text-xl">Members</h2>
                <ul className="my-5">
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
                        label="@username"
                        className="grow self-center"
                    />
                    <Button
                        className="ml-2 self-center p-7"
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
        <div className="container w-1/2">
            <TeamEditor/>
            <AuthTokens/>
        </div>
    );
}

export default function Team() {
    return (
        <Layout>
            <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <TeamEditorSuspense />
            </main>
        </Layout>
    );
}
