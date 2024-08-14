import { NextApiRequest, NextApiResponse } from 'next';
import { sendTeamStats } from '~/server/api/routers/sendTeamStats';
import { db } from '~/server/db';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
    // Find a team that needs processing
    const now = new Date();
    const nowIso = now.toISOString();
    const cutOff = new Date(now.getTime() - 24 * 60 * 1000).toISOString();
    const dayOfWeek = now.getDay();
    const hour = now.getUTCHours();

    const team = await db.team.findFirst({
        where: {
            lastSlackDate: {
                lte: cutOff,
            },
            slackDaysOfWeek: {
                contains: dayOfWeek.toString(),
            },
            slackHour: {
                gte: hour,
            },
        },
    });

    if (!team) {
        res.status(200).json({ success: true, noTeamsNeedProcessing: true });
        return;
    }

    // Update lastSlackDate now so it's not processed twice
    await db.team.update({
        where: {
            id: team.id,
        },
        data: {
            lastSlackDate: nowIso,
        },
    });

    const slackToken = await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "slack_webhook_url",
        },
    });

    if (!slackToken) {
        res.status(200).json({ success: true, teamHasNoSlackToken: true });
        return;
    }

    await sendTeamStats({
        team,
        slackToken: slackToken.value,
    });

    res.status(200).json({ success: true, processedTeam: team.id });
}
