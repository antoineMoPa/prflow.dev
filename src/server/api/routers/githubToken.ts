import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "../../../server/api/trpc";

export const githubTokenRouter = createTRPCRouter({
    hello: publicProcedure
        .input(z.object({ text: z.string() }))
        .query(({ input }) => {
            return {
                greeting: `Hello ${input.text}`,
            };
        }),

    create: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .input(z.object({ value: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.githubToken.create({
                data: {
                    name: input.name,
                    value: input.value,
                    // TODO: team
                },
            });
        }),

    getLatest: protectedProcedure.query(async ({ ctx }) => {
        const githubToken = await ctx.db.githubToken.findFirst({
            orderBy: { updatedAt: "desc" },
            // TODO: where user is in team
        });

        return githubToken ?? null;
    }),

    getAll: protectedProcedure.query(async ({ ctx }) => {
        return ctx.db.githubToken.findMany({
            // TODO Filter by team
            // TODO Redact token
            // where: { createdBy: { id: ctx.session.user.id } },
        });
    }),

    getSecretMessage: protectedProcedure.query(() => {
        return "you can now see this secret message!";
    }),
});
