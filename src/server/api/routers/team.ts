import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure
} from "../../../server/api/trpc";
import { type Team } from "@prisma/client";
import { generateTeamStatsSlackMessage, sendTeamStats } from "./sendTeamStats";

const getTeamAndCheckAdminAccess = async ({ ctx, teamId }: { ctx: any, teamId: number }) => {
    const currentUserId: string = ctx.session.user.id;

    if (ctx.session.user.isSuperUser) {
        const team: Team | null = await ctx.db.team.findFirst({
            where: {
                id: teamId,
            },
        });

        if (!team) {
            throw new Error("Team not found");
        }

        return { team };
    }

    const team: Team | null = await ctx.db.team.findFirst({
        where: {
            teamLead: { id: currentUserId },
            id: teamId,
        },
    });

    if (!team) {
        throw new Error("Team not found");
    }

    return { team };
};

export const teamRouter = createTRPCRouter({
    checkTeamAdminAccess: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return true;
        }),

    sendSlackReport: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { team } = await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            const slackToken = await ctx.db.authToken.findFirst({
                where: {
                    teamId: input.teamId,
                    type: "slack_webhook_url",
                },
            });

            if (!slackToken) {
                throw new Error("Slack webhook URL not found. Add one in the team's settings.");
            }

            await sendTeamStats({
                team,
                slackToken: slackToken.value,
            });
        }),

    create: protectedProcedure
        .input(z.object({ name: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.team.create({
                data: {
                    name: input.name,
                    teamLead: { connect: { id: ctx.session.user.id } },
                    lastSlackDate: new Date().toISOString(),
                    slackMessageConfig: "{}",
                },
            });
        }),

    get: protectedProcedure
        .input(z.object({
            id: z.number()
        }))
        .query(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.id });

            return ctx.db.team.findFirst({
                where: {
                    id: input.id,
                },
            });
        }),

    delete: protectedProcedure
        .input(z.object({
            id: z.number(),
        }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.id });

            return ctx.db.team.delete({
                where: {
                    id: input.id,
                },
            });
        }),

    getTeamMembers: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return ctx.db.teamMember.delete({
                where: {
                    id: input.memberId,
                },
            });
        }),

    getAllGithubRepositories: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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

    getExampleSlackMessage: protectedProcedure
        .input(z.object({
            teamId: z.number(),
        }))
        .query(async ({ ctx, input }) => {
            const { team } = await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return generateTeamStatsSlackMessage({ team });
        }),

    createToken: protectedProcedure
        .input(z.object({
            name: z.string().min(1),
            value: z.string().min(1),
            teamId: z.number(),
            type: z.string(),
        }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

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
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return ctx.db.authToken.delete({
                where: {
                    id: input.id,
                    teamId: input.teamId,
                },
            });
        }),

    getTeamGoalConfig: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { team } = await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return team.teamGoalsConfig;
        }),

    setTeamGoalConfig: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ teamGoalsConfig: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return ctx.db.team.update({
                where: {
                    id: input.teamId,
                },
                data: {
                    teamGoalsConfig: input.teamGoalsConfig,
                },
            });
        }),

    getSlackDaysOfWeek: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { team } = await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return team.slackDaysOfWeek;
        }),

    setSlackDaysOfWeek: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ slackDaysOfWeek: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return ctx.db.team.update({
                where: {
                    id: input.teamId,
                },
                data: {
                    slackDaysOfWeek: input.slackDaysOfWeek,
                },
            });
        }),

    getSlackMessageConfig: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { team } = await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return team.slackMessageConfig;
        }),

    setSlackMessageConfig: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ slackMessageConfig: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return ctx.db.team.update({
                where: {
                    id: input.teamId,
                },
                data: {
                    slackMessageConfig: input.slackMessageConfig,
                },
            });
        }),

    clearRepositoryCache: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ path: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            await ctx.db.cache.deleteMany({
                where: {
                    path: input.path,
                }
            });

            return true;
        }),

    getJiraStoryPointsFieldName: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .query(async ({ ctx, input }) => {
            const { team } = await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return team.jiraStoryPointsFieldName;
        }),

    setJiraStoryPointsFieldName: protectedProcedure
        .input(z.object({ teamId: z.number() }))
        .input(z.object({ jiraStoryPointsFieldName: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await getTeamAndCheckAdminAccess({ ctx, teamId: input.teamId });

            return ctx.db.team.update({
                where: {
                    id: input.teamId,
                },
                data: {
                    jiraStoryPointsFieldName: input.jiraStoryPointsFieldName,
                },
            });
        }),
});
