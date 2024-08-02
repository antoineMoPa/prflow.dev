import { Octokit } from "@octokit/rest";

export const getTeamStats = async ({
    githubToken,
    teamMembers,
    githubRepositories,
}: {
    githubToken: string,
    teamMembers: string[],
    githubRepositories: string[],
}) => {
    const octokit = new Octokit({
        auth: githubToken,
    });
    const pulls = [];

    await Promise.all(githubRepositories.map(async (repoPath) => {
        console.log('Reading repo: ', repoPath);
        const owner = repoPath.split("/")[0] as string;
        const repo = repoPath.split("/")[1] as string;
        const repoStats = await octokit.rest.pulls.list({
            owner,
            repo,
            sort: "updated",
            per_page: 100,
            page: 0,
        });

        console.log(repoStats);
    }));

    console.log('Done');
};
