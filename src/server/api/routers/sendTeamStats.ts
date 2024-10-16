import { Team,  } from "@prisma/client";
import { getTeamStats } from "./getTeamStats";
import { env } from "../../../env";
import { OpenAI } from "openai";
import { extendGoalsWithDefaults } from "../../../lib/goals";

const displayDuration = (hours: number) => {
    // if under one hour, show minutes count
    if (hours < 1) {
        return `${(hours * 60).toFixed(0)} minutes`;
    }
    return `${hours.toFixed(1)} hours`;
}

const LOWER = 'lower';

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

export const generateAIComment = async ({
    stats
}: {
    stats: any
}) => {
    const api_key = env.OPENAI_API_KEY;
    const client = new OpenAI({
        apiKey: api_key,
    });
    const model = "gpt-4o";
    const prompt = "Given a statistics JSON, you post a 1-2 sentence summary of how the team's tickets pull requests are flowing along with any notable changes. The AI will generate a comment that you can post in the team's Slack channel. Please mention if any pull request was an outliler and skewed statistics. If notable, please discuss points added mid-sprint, completion rate, cycle time. Provide positive reinforcement if the team is doing well. If the team is not doing well, provide constructive feedback. Make sure to add newlines for readability, but don't try to add links or emojis. Keep the message short and impactful.";
    const chatCompletion = await client.chat.completions.create({
        model,
        messages: [{
            role: 'system',
            content: prompt
        }, {
            role: 'user',
            content: JSON.stringify(stats)
        }],
    });

    return chatCompletion.choices[0]?.message.content;
};

export const generateTeamStatsSlackMessage = async ({
    team,
} : {
    team: Team;
}): Promise<string[]> => {
    const {
        showAverageTimeToFirstReview,
        showMedianTimeToFirstReview,
        showAverageCycleTime,
        showTeamThroughput,
        showCompletedStoryPoints,
        showStoryPointsRemaining,
        showStoryPointsAddedDuringSprint,
        showTaskCycleTime,
        showStoryPointsCompletionRate,
    } = JSON.parse(team.slackMessageConfig ?? "{}");

    const goals = extendGoalsWithDefaults(JSON.parse(team.teamGoalsConfig ?? "{}"));

    const { githubStats, jiraStats } = await getTeamStats({ team });
    const { stats, teamMembers } = githubStats;

    const message: string[] = [];

    message.push(`:chart_with_upwards_trend: *Pull Request flow digest - ${team.name}* :chart_with_upwards_trend:`);

    for (const [repoName, repoStats] of Object.entries(stats)) {
        message.push(`\n*${repoName}*`);

        (showAverageTimeToFirstReview ?? true) &&
            message.push(displayStat(
                repoStats.weeklyStats.avgTimeToFirstReview,
                repoStats.weeklyStats.previousWeekAvgTimeToFirstReview,
                "Average Time to First Review",
                displayDuration,
                { goal: goals.avgTimeToFirstReview },
            ));

        (showMedianTimeToFirstReview ?? true) &&
            message.push(displayStat(
                repoStats.weeklyStats.medianTimeToFirstReview ?? 0,
                repoStats.weeklyStats.previousWeekMedianTimeToFirstReview ?? 0,
                "Median Time to First Review",
                displayDuration,
                { goal: goals.medianTimeToFirstReview },
            ));

        (showAverageCycleTime ?? true) &&
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
        (showTeamThroughput ?? true) &&
            message.push(displayStat(
                currentWeekThroughput,
                lastWeekThroughput,
                "Team Throughput",
                num => `${num.toFixed(1)} PRs/week`, {
                    goal: {
                        ...goals.throughputPRsPerMember,
                        value: goals.throughputPRsPerMember.value * teamMembers.length,
                    }
                },
            ));
    }

    if (jiraStats) {
        message.push("\n\n*JIRA Stats*");
        (showCompletedStoryPoints ?? true) &&
            message.push(`:white_check_mark: *Completed Story Points*: ${jiraStats?.aggregatedStats?.completedPoints}`);

        const totalLeft = (jiraStats?.aggregatedStats?.pointsToDo ?? 0) + (jiraStats?.aggregatedStats?.pointsInProgress ?? 0);

        (showStoryPointsRemaining ?? true) &&
            message.push(`:construction: *Story Points remaining*: ${totalLeft}`);

        (showStoryPointsAddedDuringSprint ?? true) &&
            message.push(`:heavy_plus_sign: *Story Points added during sprint*: ${jiraStats?.aggregatedStats?.pointsAddedMidSprint}`);

        (showTaskCycleTime ?? true) &&
            message.push(`:hourglass: *Task Cycle Time*: ${displayDuration(jiraStats?.aggregatedStats?.averageCycleTime ?? 0)}`);

        const stats = jiraStats.aggregatedStats;
        if (stats?.sprintTimePassedRatio) {
            const sprintTimePassedPercent = ((stats.sprintTimePassedRatio ?? 0) * 100).toFixed(0);
            const pointsCompletionRate = (stats.pointsCompletionRate * 100).toFixed(0);
            const isBehindSchedule = stats.pointsCompletionRate < stats.sprintTimePassedRatio;
            const completionRateIcon = isBehindSchedule ? ":warning:" : ":white_check_mark:";

            (showStoryPointsCompletionRate ?? true) &&
                message.push(`:calendar: *Sprint Time Passed*: ${sprintTimePassedPercent}% | *Story Points Completion Rate*: ${pointsCompletionRate}% ${completionRateIcon}`);
        }
    }

    // Let's wrap open ai part in try/catch in case we run out of credits.
    try {
        const aiComment = await generateAIComment({ stats: { githubStats, jiraStats }});
        message.push(`\n\n:robot_face: ${aiComment}`);
        message.push(`\n\n\More details:\nhttps://prflow.dev/team/${team.id}/dashboard`);
    } catch (e) {
        console.error("Failed to generate AI comment", e);
    }

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
