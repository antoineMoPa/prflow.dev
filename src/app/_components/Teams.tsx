"use client";

import { useState } from "react";

import { api } from "../../trpc/react";
import { Input, Link } from "@nextui-org/react";

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
        <div className="w-full max-w-xs">
            <h2>Teams</h2>
            <ul>
                {allTeams.map((team)  => {
                    return (
                        <li key={team.id}>
                            <Link href={`/team/${team.id}`}>
                                {team.name}
                            </Link>
                        </li>
                    );
                })}
            </ul>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createTeam.mutate({ name });
                }}
                className="flex flex-col gap-2"
            >
                <div className="flex">
                    <Input
                        type="text"
                        label="Name"
                        variant="bordered"
                        onChange={(e) => setName(e.target.value)}
                        value={name}
                    />
                </div>
                <button
                    type="submit"
                    className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
                    disabled={createTeam.isPending}
                >
                    {createTeam.isPending ? "Submitting..." : "Submit"}
                </button>
            </form>
        </div>
    );
}
