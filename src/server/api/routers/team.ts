import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure
} from "../../../server/api/trpc";
import { type Team } from "@prisma/client";
import { getTeamStats } from "./getTeamStats";


export const teamRouter = createTRPCRouter({

    sendSlackReport: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .mutation(async ({ ctx, input }) => {
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

            const slackToken = await ctx.db.authToken.findFirst({
                where: {
                    teamId: input.teamId,
                    type: "slack_webhook_url",
                },
            });

            if (!slackToken) {
                throw new Error("Slack webhook URL not found. Add one in the team's settings.");
            }

            const { stats } = await getTeamStats({ team });

            const message = [];

            message.push(`:chart_with_upwards_trend: *Weekly pull request flow digest - ${team.name}* :chart_with_upwards_trend:`);

            for (const [repoName, repoStats] of Object.entries(stats)) {
                message.push(`\n*${repoName}*`);
                message.push(`Average Time to First Review: ${repoStats.avgTimeToFirstReview.toFixed(1)}`);
                message.push(`Median Time to First Review: ${repoStats.medianTimeToFirstReview?.toFixed(1)}`);
                message.push(`Average Pull Request Cycle Time: ${repoStats.avgPullRequestCycleTime.toFixed(1)}`);
            }

            message.push(`\n\More details:\nhttps://prflow.dev/team/${team.id}/dashboard`);

            const slackWebhookUrl = slackToken.value;
            await fetch(slackWebhookUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: message.join("\n"),
                }),
            });
        }),

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

    get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ ctx, input }) => {
        return ctx.db.team.findFirst({
            where: {
                teamLead: { id: ctx.session.user.id },
                id: input.id,
            },
        });
    }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.team.delete({
                where: {
                    teamLead: { id: ctx.session.user.id },
                    id: input.id,
                },
            });
        }),

    getTeamMembers: protectedProcedure
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


            return ctx
                .db
                .teamMember
                .create({
                data: {
                    team: { connect: { id: input.teamId } },
                    githubUserName: input.githubUserName.replace(/^@/, ""),
                },
            });
        }),

    deleteTeamMember: protectedProcedure
        .input(z.object({ memberId: z.number() }))
        .input(z.object({ teamId: z.number() }))
        .mutation(async ({ ctx, input }) => {
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

            return ctx.db.teamMember.delete({
                where: {
                    id: input.memberId,
                },
            });
        }),

    getAllGithubRepositories: protectedProcedure
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

            return ctx.db.githubRepository.findMany({
                where: {
                    team: { id: input.teamId }
                },
            })
    }),

    addGithubRepository: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ path: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
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


            return ctx
                .db
                .githubRepository
                .create({
                data: {
                    team: { connect: { id: input.teamId } },
                    path: input.path,
                },
            });
        }),

    deleteGithubRepository: protectedProcedure
        .input(z.object({ id: z.number() }))
        .input(z.object({ teamId: z.number() }))
        .mutation(async ({ ctx, input }) => {
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

            return ctx.db.githubRepository.delete({
                where: {
                    id: input.id,
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
            type: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
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
            teamId: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
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

            return ctx.db.authToken.delete({
                where: {
                    id: input.id,
                    teamId: input.teamId,
                },
            });
        }),
});
