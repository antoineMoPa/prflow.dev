import { Team,  } from "@prisma/client";
import { getTeamStats } from "./getTeamStats";

const displayDuration = (hours: number) => {
    // if under one hour, show minutes count
    if (hours < 1) {
        return `${(hours * 60).toFixed(0)} minutes`;
    }
    return `${hours.toFixed(1)} hours`;
}

const LOWER = 'lower';
const HIGHER = 'higher';

const displayStat = (
    currentWeekStat: number,
    lastWeekStat: number,
    statName: string,
    displayFn: (num: number) => string = num => num.toFixed(1),
    { goal }: { goal: { value: number, valueShouldBe: 'lower' | 'higher' } },
) => {
    const statMessage = `*${statName}*:\n${displayFn(currentWeekStat)} - Last week: ${displayFn(lastWeekStat)}`;
        const isGoalMet = goal.valueShouldBe === LOWER ? currentWeekStat < goal.value : currentWeekStat > goal.value;
    const goalIcon = isGoalMet ? ":white_check_mark:" : ":upside_down_face:";
    const goalMessage = `Goal: ${goal.valueShouldBe === LOWER ? "<" : ">"} ${displayFn(goal.value)} ${goalIcon}`;

    const isProgressingTowardsGoal = goal.valueShouldBe === LOWER ? currentWeekStat < lastWeekStat : currentWeekStat > lastWeekStat;

    const progressMessage = isProgressingTowardsGoal ? "doing better than last week" : "doing worse than last week";

    return `${statMessage} - ${goalMessage} - ${progressMessage}`;
}

export const generateTeamStatsSlackMessage = async ({
    team,
} : {
    team: Team;
}): Promise<string[]> => {

    const { stats, teamMembers } = await getTeamStats({ team });
    const goals = {
        avgTimeToFirstReview: {
            value: 1,
            valueShouldBe: 'lower' as const,
        },
        medianTimeToFirstReview: {
            value: 1,
            valueShouldBe: 'lower' as const,
        },
        avgPullRequestCycleTime: {
            value: 24,
            valueShouldBe: 'lower' as const,
        },
        throughputPRs: {
            value: teamMembers.length * 5, // 1 PRs per day per team member makes sense.
            valueShouldBe: 'higher' as const,
        },
    }

    const message = [];

    message.push(`:chart_with_upwards_trend: *Pull Request flow digest - ${team.name}* :chart_with_upwards_trend:`);

    for (const [repoName, repoStats] of Object.entries(stats)) {
        message.push(`\n*${repoName}*`);

        message.push(displayStat(
            repoStats.weeklyStats.avgTimeToFirstReview,
            repoStats.weeklyStats.previousWeekAvgTimeToFirstReview,
            "Average Time to First Review",
            displayDuration,
            { goal: goals.avgTimeToFirstReview },
        ));

        message.push(displayStat(
            repoStats.weeklyStats.medianTimeToFirstReview ?? 0,
            repoStats.weeklyStats.previousWeekMedianTimeToFirstReview ?? 0,
            "Median Time to First Review",
            displayDuration,
            { goal: goals.medianTimeToFirstReview },
        ));

        message.push(displayStat(
            repoStats.weeklyStats.avgPullRequestCycleTime,
            repoStats.weeklyStats.previousWeekAvgPullRequestCycleTime,
            "Average Cycle Time",
            displayDuration,
            { goal: goals.avgPullRequestCycleTime },
        ));

        const currentWeekThroughput = repoStats.weeklyStats.throughputPRs;
        const lastWeekThroughput = repoStats.weeklyStats.previousWeekThroughputPRs;

        // team throughput
        message.push(displayStat(
            currentWeekThroughput,
            lastWeekThroughput,
            "Team Throughput",
            num => `${num.toFixed(1)} PRs/week`,
            { goal: goals.throughputPRs },
        ));
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
