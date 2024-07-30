"use client";

import { useSession } from "next-auth/react";
//import { Octokit } from "@octokit/rest";

export function RepoStats() {
    const session = useSession();

    if (!session) {
        return null;
    }

    return (
        <div className="w-full max-w-xs">
            empty
        </div>
    );
}
