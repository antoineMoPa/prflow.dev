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

            const teamMembers = await ctx.db.teamMember.findMany({
                where: {
                    teamId: input.teamId,
                },
            });

            const githubRepositories = await ctx.db.githubRepository.findMany({
                where: {
                    teamId: input.teamId,
                },
            });

            const githubToken = await ctx.db.authToken.findFirst({
                where: {
                    teamId: input.teamId,
                    type: "github",
                },
            });

            if (!githubToken) {
                throw new Error("GitHub token not found");
            }

            const stats = await getTeamStats({
                githubToken: githubToken.value,
                teamMembers: teamMembers.map((member) => member.githubUserName),
                githubRepositories: githubRepositories.map((repo) => repo.path),
            });

            return {
                team,
                teamMembers,
                githubRepositories,
                stats,
            };
        }),
});
