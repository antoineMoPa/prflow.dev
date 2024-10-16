
export const defaultGoals = {
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
    throughputPRsPerMember: {
        value: 5, // 1 PRs per day per team member makes sense.
        valueShouldBe: 'higher' as const,
    },
}

export const extendGoalsWithDefaults = (goals: any) => {
    return {
        ...defaultGoals,
        ...goals,
    };
}
