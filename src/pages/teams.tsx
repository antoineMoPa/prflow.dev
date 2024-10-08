"use client";

import Layout from '~/app/_components/Layout';
import { useSession } from 'next-auth/react';
import { useState } from "react";
import { api } from "../trpc/react";
import { Button, Input } from "@nextui-org/react";
import { FaGear, FaChartLine } from 'react-icons/fa6';

export function Teams() {
    const [allTeams] = api.team.getAll.useSuspenseQuery();

    const utils = api.useUtils();
    const [name, setName] = useState("");

    const createTeam = api.team.create.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            setName("");
        },
    });

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900 container w-1/2">
            <h1 className="text-4xl font-extrabold tracking-tight text-center">
                Teams
            </h1>
            <ul className="my-5">
                {allTeams.map((team)  => {
                    return (
                        <li key={team.id}>
                            <div className="flex grow justify-center mb-5">
                                <div className="flex-grow">
                                    {team.name}
                                </div>
                                <a href={`/team/${team.id}/dashboard`} >
                                    <Button startContent={<FaChartLine/>} className="mr-5 bg-blue-700 text-white">
                                        Dashboard
                                    </Button>
                                </a>
                                <a href={`/team/${team.id}/settings`} >
                                    <Button startContent={<FaGear/>}>
                                        Team Settings
                                    </Button>
                                </a>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createTeam.mutate({ name });
                }}
                className="flex mt-5"
            >
                <Input
                    type="text"
                    label="Name"
                    onChange={(e) => setName(e.target.value)}
                    value={name}
                />
                <Button
                    className="ml-2 self-center p-7"
                    disabled={createTeam.isPending}
                    onClick={() => createTeam.mutate({ name })}
                >
                    {createTeam.isPending ? "Submitting..." : "Add"}
                </Button>
            </form>
        </div>
    );
}

function TeamsPage() {
    const session = useSession();

    return (
        <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
            <div className="container flex flex-col items-center gap-12 px-4 py-16">
                {session?.data?.user && <Teams />}
            </div>
        </main>
    );
}

export default function Team() {

    return (
        <Layout>
            <TeamsPage />
        </Layout>
    );
}
