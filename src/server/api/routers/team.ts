import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "../../../server/api/trpc";

export const teamRouter = createTRPCRouter({

    create: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.team.create({
                data: {
                    name: input.name,
                    teamLead: { connect: { id: ctx.session.user.id } },
                },
            });
        }),

    get: protectedProcedure.query(async ({ ctx, id }) => {
        return ctx.db.team.findFirst({
            where: {
                teamLead: { id: ctx.session.user.id },
                id,
            },
        });
    }),

    getTeamMembers: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
        return ctx.db.teamMember.findMany({
            where: {
                team: { id: input.teamId }
            },
        })
    }),

    addTeamMember: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ githubUserName: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.teamMember.create({
                data: {
                    team: { connect: { id: input.teamId } },
                    githubUserName: input.githubUserName,
                },
            });
        }),

    deleteTeamMember: protectedProcedure
        .input(z.object({ memberId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.teamMember.delete({
                where: {
                    id: input.memberId,
                },
            });
        }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.team.findMany({
            where: { teamLead: { id: ctx.session.user.id } },
        });
    }),

    getAllTokens: protectedProcedure
        .input(z.object({
            teamId: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.db.authToken.findMany({
                where: {
                    teamId: input.teamId,
                },
                select: {
                    name: true,
                    id: true,
                    type: true,
                }
            });
        }),

    createToken: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            value: z.string().min(1),
            teamId: z.number(),
            type: z.string().regex(/github/),
        }))
        .mutation(async ({ ctx, input }) => {
            // TODO: Check if user is team lead of this team
            return ctx.db.authToken.create({
                data: {
                    name: input.name,
                    value: input.value,
                    teamId: input.teamId,
                    type: input.type,
                },
            });
        }),

    deleteToken: protectedProcedure
        .input(z.object({
            id: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.authToken.delete({
                where: {
                    id: input.id,
                },
            });
        }),

    getSecretMessage: protectedProcedure.query(() => {
        return "you can now see this secret message!";
    }),
});
