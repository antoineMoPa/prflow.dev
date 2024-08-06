import { expect, test } from 'vitest'

import { getTeamStats } from '../server/api/routers/getTeamStats';
import { env } from '../env';

test('gets a repo stats', async () => {
    if (!env?.TEST_GITHUB_TOKEN) {
        throw new Error("You need a TEST_GITHUB_TOKEN to run this test.");
    }

    const results = await getTeamStats({
        githubToken: env.TEST_GITHUB_TOKEN,
        teamMembers: ['antoineMoPa'],
        githubRepositories: ['Lumen5/framefusion'],
        startTime: new Date("2023-04-17T19:36:55Z"),
        endTime: new Date("2023-11-08T17:03:51Z"),
    });

    expect(results['Lumen5/framefusion'].avgTimeToFirstReview).toBeCloseTo(3380636, 0);
});
