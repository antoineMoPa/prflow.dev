import { expect, test } from 'vitest'

import { getTeamStatsHeadless } from '../server/api/routers/getTeamStats';
import { env } from '../env';

test('gets a repo stats', async () => {
    if (!env?.TEST_GITHUB_TOKEN) {
        throw new Error("You need a TEST_GITHUB_TOKEN to run this test.");
    }

    const { stats } = await getTeamStatsHeadless({
        githubToken: env.TEST_GITHUB_TOKEN,
        teamMembers: ['antoineMoPa'],
        githubRepositories: ['Lumen5/framefusion'],
    });

    expect(stats['Lumen5/framefusion']!.avgTimeToFirstReview).toBeGreaterThan(0);
}, 50000);
