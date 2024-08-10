import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { db } from "../../db";

export type PullStats = {
    timeToFirstReview: number | null,
    author: string,
    number: number,
    reviewer: string | null,
    created_at: string,
    link: string,
};

export type RepositoryStats = {
    avgTimeToFirstReview: number,
    medianTimeToFirstReview: number | undefined,
    pullStats: Record<string, PullStats>,
    cacheSchemaVersion: number,
};

type StatsPerRepository = Record<string, RepositoryStats>;

const CACHE_SCHEMA_VERSION = 9;
const DEV_MODE = true;

const computeTimeToFirstReview = async({
    owner,
    repo,
    pull,
    octokit,
}: {
    owner: string,
    repo: string,
    pull: any,
    octokit: Octokit,
}): Promise<{
    timeToFirstReview: number | null;
    reviews: RestEndpointMethodTypes["pulls"]["listReviews"]["response"]["data"];
    events: RestEndpointMethodTypes["issues"]["listEvents"]["response"]["data"];
}> => {
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
        .filter((comment) => comment.user!.login.includes("[bot]"))
        .filter((comment) => comment.user!.login.includes("[bot]"))
        .filter((comment) => new Date(comment.created_at).getTime() > new Date(readyForReviewDate).getTime())
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const firstCommentDate = comments[0]?.created_at;

    // Get the first PR review time
    const reviewsResponse = await octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: pull.number,
    });

    const reviews = reviewsResponse.data
        .filter((review) => review.user!.login !== pull.user!.login)
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

    return {
        timeToFirstReview,
        reviews,
        events,
    };
}


export const getTeamStats = async ({
    githubToken,
    teamMembers,
    githubRepositories,
}: {
    githubToken: string,
    teamMembers: string[],
    githubRepositories: string[],
}) => {
    const octokit = new Octokit({
        auth: githubToken,
    });

    const statsPerRepository: StatsPerRepository = {};

    for (const repoPath of githubRepositories) {
        // Restore from cache
        const cachedStats = await db.repoCache.findFirst({
            where: {
                path: repoPath,
            },
        });

        let pullStats: Record<string, PullStats> = {};


        if (cachedStats?.cache) {
            const cache = JSON.parse(cachedStats.cache) as unknown as RepositoryStats;

            if (cache.cacheSchemaVersion == CACHE_SCHEMA_VERSION) {
                pullStats = cache.pullStats;
            }

            const CACHE_CUTOFF = 1000 * 60 * 60 * 24; // 1 day
            const cacheDate = new Date(cachedStats.updatedAt).getTime();

            if (cache.cacheSchemaVersion == CACHE_SCHEMA_VERSION &&
                (new Date().getTime() - cacheDate) < CACHE_CUTOFF
            ) {
                // Don't fetch PR pages, use cache.
                statsPerRepository[repoPath] = cache;
                break;
            }
        }

        const owner = repoPath.split("/")[0]!;
        const repo = repoPath.split("/")[1]!;

        const pulls = [];
        const prFetchCuttoff = (new Date().getTime()) - 1000 * 60 * 60 * 24 * 30;

        let page = 0;
        while (true) {
            if (DEV_MODE && page > 1) {
                console.log("DEV MODE: Stopping after 1 page");
                break;
            }
            console.log(`Fetching page ${page} of PRs for repo ${repoPath}`);
            const pullsResponse = await octokit.rest.pulls.list({
                owner,
                repo,
                sort: "created",
                direction: "desc",
                per_page: 100,
                page,
                state: "closed",
            });

            pulls.push(...pullsResponse.data
                .filter((pull) => teamMembers.includes(pull.user!.login)));

            if (!pullsResponse.data.length) {
                break;
            }

            // Filter out PRs before 2 years
            const created_at_date = new Date(pullsResponse.data[0]!.created_at);
            if (created_at_date.getTime() < prFetchCuttoff) {
                console.log(`PRs are older than 2 years; stopping pagination`);
                break;
            }

            // Stop processing if we are aware of this PR
            if (pullsResponse.data[pullsResponse.data.length - 1]!.number in pullStats) {
                console.log(`PRs are cached; stopping pagination ${pullsResponse.data[0]!.number}`);
                break;
            }

            page++;
        }

        // Process each PR sequentially to avoid rate limiting
        let pullCounter = 0;
        for (const pull of pulls) {
            pullCounter++;
            if (DEV_MODE && pullCounter > 10) {
                console.log("DEV MODE: Stopping after 10 PRs");
                break;
            }

            if (pull.number in pullStats) {
                // Result was cached; skip.
                break;
            }

            console.log(`Processing pull #${pull.number}`)

            const { timeToFirstReview, reviews } = await computeTimeToFirstReview({
                owner,
                repo,
                pull,
                octokit,
            });

            const created_at = pull.created_at;

            pullStats[pull.number] = {
                // convert to hours
                timeToFirstReview: (timeToFirstReview && timeToFirstReview > 0) ? timeToFirstReview / 1000 / 60 / 60 : null,
                created_at,
                link: pull.html_url,
                author: pull.user!.login,
                number: pull.number,
                reviewer: reviews[0]?.user?.login ?? null,
            };
        }

        const timesToFirstReview = Object.values(pullStats)
            .filter(pull => pull.reviewer !== null)
            .map(pull => pull.timeToFirstReview)
            .filter((timeToFirstReview) => timeToFirstReview !== null);
        timesToFirstReview.sort();
        const countTimesToFirstReview = timesToFirstReview.length;
        const sumTimesToFirstReview = timesToFirstReview.reduce((a, b) => a + b, 0);
        const avgTimeToFirstReview = sumTimesToFirstReview / countTimesToFirstReview;
        const medianTimeToFirstReview = timesToFirstReview[Math.floor(countTimesToFirstReview / 2)];

        const repositoryStats: RepositoryStats = {
            avgTimeToFirstReview,
            medianTimeToFirstReview,
            pullStats,
            cacheSchemaVersion: CACHE_SCHEMA_VERSION,
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
    }

    return statsPerRepository;
};
