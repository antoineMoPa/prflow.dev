import { Team } from "@prisma/client";
import { getTeamStats } from "./getTeamStats";

export const generateTeamStatsSlackMessage = async ({
    team,
} : {
    team: Team;
}): Promise<string[]> => {
    const { stats } = await getTeamStats({ team });

    const message = [];

    message.push(`:chart_with_upwards_trend: *Pull Request flow digest - ${team.name}* :chart_with_upwards_trend:`);

    message.push(`Statistics are for the last 2 weeks.`);

    for (const [repoName, repoStats] of Object.entries(stats)) {
        message.push(`\n*${repoName}*`);
        message.push(`Average Time to First Review: ${repoStats.avgTimeToFirstReview.toFixed(1)} hours`);
        message.push(`Median Time to First Review: ${repoStats.medianTimeToFirstReview?.toFixed(1)} hours`);
        message.push(`Average Pull Request Cycle Time: ${repoStats.avgPullRequestCycleTime.toFixed(0)} hours`);
        message.push(`Team throughput: ${repoStats.throughputPRsPerWeek.toFixed(1)} PRs/week`);

    }

    message.push(`\n\More details:\nhttps://prflow.dev/team/${team.id}/dashboard`);
    return message;
};

export const sendTeamStats = async ({
    team,
    slackToken,
} : {
    team: Team;
    slackToken: string;
}) => {
    const message = await generateTeamStatsSlackMessage({ team });

    const slackWebhookUrl = slackToken;
    await fetch(slackWebhookUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            text: message.join("\n"),
        }),
    });
};
