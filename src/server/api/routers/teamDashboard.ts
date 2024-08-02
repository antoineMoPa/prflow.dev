import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure
} from "../../../server/api/trpc";
import { type Team } from "@prisma/client";


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

            return {
                team,
                teamMembers,
                githubRepositories,
            };
        }),
});
