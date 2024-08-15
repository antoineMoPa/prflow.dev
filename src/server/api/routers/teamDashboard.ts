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

            // Find out if the user has access due to being the team lead
            const team: Team | null = await ctx.db.team.findFirst({
                where: {
                    teamLead: { id: currentUserId },
                    id: input.teamId,
                },
            });

            if (!team) {
                // Find out if the user has access due to being a team member
                const teamMember = await ctx.db.teamMember.findFirst({
                    where: {
                        team: { id: input.teamId },
                        githubUserName: ctx.session.user.githubUserName,
                    },
                });
                if (!teamMember) {
                    throw new Error("Team not found");
                }
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
