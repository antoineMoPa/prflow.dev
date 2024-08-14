import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure
} from "../../../server/api/trpc";
import { type Team } from "@prisma/client";
import { getTeamStats } from "./getTeamStats";

export const teamDashboardRouter = createTRPCRouter({

    getDashboardStats: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            const currentUserId: string = ctx.session.user.id;

            const team: Team | null = await ctx.db.team.findFirst({
                where: {
                    teamLead: { id: currentUserId },
                    id: input.teamId,
                },
            });

            // TODO: allow a team member to view the dashboard

            if (!team) {
                throw new Error("Team not found");
            }

            const { stats, teamMembers, githubRepositories } = await getTeamStats({ team });

            return {
                team,
                teamMembers,
                githubRepositories,
                stats,
            };
        }),
});
