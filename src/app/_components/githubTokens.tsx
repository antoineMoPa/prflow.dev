"use client";

import { useState } from "react";

import { api } from "../../trpc/react";
import { Input } from "@nextui-org/react";

export function GithubTokens() {
    const [allGithubTokens] = api.githubToken.getAll.useSuspenseQuery();

    const utils = api.useUtils();
    const [name, setName] = useState("");
    const [value, setValue] = useState("");

    const createGithubToken = api.githubToken.create.useMutation({
        onSuccess: async () => {
            await utils.githubToken.invalidate();
            setName("");
            setValue("");
        },
    });

    return (
        <div className="w-full max-w-xs">
            <h2>GithubTokens</h2>
            <ul>
                {allGithubTokens.map((githubToken)  => {
                    return (
                        <li key={githubToken.id}>{githubToken.name}</li>
                    );
                })}
            </ul>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createGithubToken.mutate({ name, value });
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
                    <Input
                        type="text"
                        label="Token"
                        variant="bordered"
                        onChange={(e) => setValue(e.target.value)}
                        value={value}
                    />
                </div>
                <button
                    type="submit"
                    className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20"
                    disabled={createGithubToken.isPending}
                >
                    {createGithubToken.isPending ? "Submitting..." : "Submit"}
                </button>
            </form>
        </div>
    );
}
