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
    });

    expect(results['Lumen5/framefusion']!.avgTimeToFirstReview).toBeGreaterThan(0);
});
