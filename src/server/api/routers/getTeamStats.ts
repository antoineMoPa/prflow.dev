import { Octokit } from "@octokit/rest";
import { DateTime } from "luxon";
import { db } from "../../db";

type PullStats = { timeToFirstReview: number | null };

type RepositoryStats = {
    avgTimeToFirstReview: number,
    medianTimeToFirstReview: number | undefined,
    pullStats: Record<string, PullStats>,
};

type StatsPerRepository = Record<string, RepositoryStats>;

export const getTeamStats = async ({
    githubToken,
    teamMembers,
    githubRepositories,
    startTime,
    endTime,
}: {
    githubToken: string,
    teamMembers: string[],
    githubRepositories: string[],
    startTime?: Date | undefined,
    endTime?: Date | undefined,
}) => {
    const octokit = new Octokit({
        auth: githubToken,
    });

    if (!startTime) {
        startTime = DateTime.now().setZone('America/New_York').minus({ weeks: 2 }).startOf('day').toJSDate();
    }
    if (!endTime) {
        endTime = DateTime.now().setZone('America/New_York').endOf('day').toJSDate();
    }

    const statsPerRepository: StatsPerRepository = {};

    await Promise.all(githubRepositories.map(async (repoPath) => {
        // Restore from cache
        const cachedStats = await db.repoCache.findFirst({
            where: {
                path: repoPath,
            },
        });

        const pullStats: Record<string, PullStats> =
            (JSON.parse(cachedStats?.cache ?? "{}") as unknown as RepositoryStats).pullStats ?? {};

        console.log({pullStats});

        const owner = repoPath.split("/")[0]!;
        const repo = repoPath.split("/")[1]!;

        const pulls = [];

        // Walk the pagination
        let page = 0;
        while (true) {
            const pullsResponse = await octokit.rest.pulls.list({
                owner,
                repo,
                sort: "created",
                per_page: 100,
                page,
                state: "closed",
            });

            pulls.push(...pullsResponse.data
                .filter((pull) => teamMembers.includes(pull.user!.login))
                .filter((pull) => (new Date(pull.created_at).getTime() >= startTime.getTime())));
            if (!pullsResponse.data.length) {
                break;
            }
            page++;
        }

        await Promise.all(pulls.map(async (pull) => {
            if (pull.number in pullStats) {
                // Result was cached; skip.
                console.log('Cache hit ✅', pull.number);
                return;
            }
            // Get last time ready_for_review event time
            // to find the time where he PR stopped being a draft.
            const eventsResponse = await octokit.rest.issues.listEvents({
                owner,
                repo,
                issue_number: pull.number,
            });

            const events = eventsResponse.data
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            let readyForReviewDate = pull.created_at;

            const readyForReviewEvent = events.find((event) => event.event === "ready_for_review");

            if (readyForReviewEvent) {
                readyForReviewDate = readyForReviewEvent.created_at;
            }

            // Get the first comment on a PR after it's ready
            // (but not a comment from the author)
            const commentsResponse = await octokit.rest.issues.listComments({
                owner,
                repo,
                issue_number: pull.number,
            });


            const comments = commentsResponse.data
                .filter((comment) => comment.user!.login !== pull.user!.login)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const firstCommentDate = comments[0]?.created_at;

            // Get the first PR review time
            const reviewsResponse = await octokit.rest.pulls.listReviews({
                owner,
                repo,
                pull_number: pull.number,
            });

            const reviews = reviewsResponse.data
                .sort((a, b) => new Date(a.submitted_at!).getTime() - new Date(b.submitted_at!).getTime());

            const firstReviewDate = reviews[0]?.submitted_at;

            // Compute time to first review (smallest of first review/comment time)
            let timeToFirstReview: number | null = 0.0;
            if (comments[0] && reviews[0]) {
                timeToFirstReview = Math.min(
                    new Date(firstCommentDate!).getTime() - new Date(readyForReviewDate).getTime(),
                    new Date(firstReviewDate!).getTime() - new Date(readyForReviewDate).getTime(),
                );
            } else if (comments[0]) {
                timeToFirstReview = new Date(firstCommentDate!).getTime() - new Date(readyForReviewDate).getTime();
            } else if (reviews[0]) {
                timeToFirstReview = new Date(firstReviewDate!).getTime() - new Date(readyForReviewDate).getTime();
            } else {
                timeToFirstReview = null;
            }

            pullStats[pull.number] = {
                timeToFirstReview,
            };
        }));


        const timesToFirstReview = Object.values(pullStats)
            .map(pull => pull.timeToFirstReview)
            .filter((timeToFirstReview) => timeToFirstReview !== null);
        const countTimesToFirstReview = timesToFirstReview.length;
        const sumTimesToFirstReview = timesToFirstReview.reduce((a, b) => a + b, 0);
        const avgTimeToFirstReview = sumTimesToFirstReview / countTimesToFirstReview;
        const medianTimeToFirstReview = timesToFirstReview.sort()[Math.floor(countTimesToFirstReview / 2)];


        const repositoryStats: RepositoryStats = {
            avgTimeToFirstReview,
            medianTimeToFirstReview,
            pullStats,
        };

        statsPerRepository[repoPath] = repositoryStats;

        const cache = JSON.stringify(repositoryStats);
        const path = repoPath;
        await db.repoCache.upsert({
            where: {
                path,
            },
            update: {
                cache,
            },
            create: {
                path,
                cache,
            }
        });
    }));

    return statsPerRepository;
};
