import { expect, test, vitest } from 'vitest'

import { getTeamStats } from '../server/api/routers/getTeamStats';
import { env } from '../env';

test('gets a repo stats', async () => {
    await getTeamStats({
        githubToken: env.TEST_GITHUB_TOKEN,
        teamMembers: ['antoineMoPa'],
        githubRepositories: ['antoineMoPa/shadergif']
    });

    expect(true).toBe(true);
});
