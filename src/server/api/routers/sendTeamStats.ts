import { Team } from "@prisma/client";
import { getTeamStats } from "./getTeamStats";

const displayDuration = (hours: number) => {
    // if under one hour, show minutes count
    if (hours < 1) {
        return `${(hours * 60).toFixed(0)} minutes`;
    }
    return `${hours.toFixed(1)} hours`;
}

const displayStatWithArrowIcons = (
    currentWeekStat: number,
    lastWeekStat: number,
    statName: string,
    displayFn: (num: number) => string = num => num.toFixed(1)
) => {
    const statIcon = currentWeekStat > lastWeekStat ? ":arrow_up:" : ":arrow_down:";
    return `${statName}: ${displayFn(currentWeekStat)} - Last week: ${displayFn(lastWeekStat)} ${statIcon}`;
}

export const generateTeamStatsSlackMessage = async ({
    team,
} : {
    team: Team;
}): Promise<string[]> => {
    const { stats } = await getTeamStats({ team });

    const message = [];

    message.push(`:chart_with_upwards_trend: *Pull Request flow digest - ${team.name}* :chart_with_upwards_trend:`);

    for (const [repoName, repoStats] of Object.entries(stats)) {
        message.push(`\n*${repoName}*`);

        message.push(displayStatWithArrowIcons(
            repoStats.weeklyStats.avgTimeToFirstReview,
            repoStats.weeklyStats.previousWeekAvgTimeToFirstReview,
            "Average Time to First Review",
            displayDuration
        ));

        message.push(displayStatWithArrowIcons(
            repoStats.weeklyStats.medianTimeToFirstReview ?? 0,
            repoStats.weeklyStats.previousWeekMedianTimeToFirstReview ?? 0,
            "Median Time to First Review",
            displayDuration
        ));

        message.push(displayStatWithArrowIcons(
            repoStats.weeklyStats.avgPullRequestCycleTime,
            repoStats.weeklyStats.previousWeekAvgPullRequestCycleTime,
            "Average Cycle Time",
            displayDuration
        ));

        const currentWeekThroughput = repoStats.weeklyStats.throughputPRs;
        const lastWeekThroughput = repoStats.weeklyStats.previousWeekThroughputPRs;
        const throughputIcon = currentWeekThroughput > lastWeekThroughput ? ":arrow_up:" : ":arrow_down:";

        message.push(`Team throughput: ${currentWeekThroughput.toFixed(1)} PRs/week - Last week: ${lastWeekThroughput.toFixed(1)} PRs/week ${throughputIcon}`);

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
