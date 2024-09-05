import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { db } from "../../db";
import { GithubRepository, Team, TeamMember } from "@prisma/client";

export type PullStats = {
    timeToFirstReview: number | null,
    author: string,
    number: number,
    reviewer: string | null,
    created_at: string,
    link: string,
    cycleTime: number | null,
    isMerged: boolean,
    isReadyForReview: boolean,
    isWaitingToBeMerged: boolean,
};

export type RepositoryStats = {
    avgPullRequestCycleTime: number,
    avgTimeToFirstReview: number,
    medianTimeToFirstReview: number | undefined,
    throughputPRsPerWeek: number,
    pullStats: Record<string, PullStats>,
    cacheSchemaVersion: number,
};

type StatsPerRepository = Record<string, RepositoryStats>;

const CACHE_SCHEMA_VERSION = 16;
const DEV_MODE = false;

const TWO_WEEKS_AGO = (new Date().getTime()) - 1000 * 60 * 60 * 24 * 7;

const computeTimeToFirstReview = async({
    owner,
    repoName,
    pull,
    octokit,
}: {
    owner: string,
    repoName: string,
    pull: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0],
    octokit: Octokit,
}): Promise<{
    timeToFirstReview: number | null;
    reviews: RestEndpointMethodTypes["pulls"]["listReviews"]["response"]["data"];
    events: RestEndpointMethodTypes["issues"]["listEvents"]["response"]["data"];
    readyForReviewDate: string;
}> => {
    // Get last time ready_for_review event time
    // to find the time where he PR stopped being a draft.
    const eventsResponse = await octokit.rest.issues.listEvents({
        owner,
        repo: repoName,
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
        repo: repoName,
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
        repo: repoName,
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
        readyForReviewDate,
        reviews,
        events,
    };
}

const computePullCycleTime = async({
    pull,
    owner,
    repoName,
    octokit,
    events,
} : {
    pull: RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][0];
    owner: string;
    repoName: string;
    octokit: Octokit;
    events: RestEndpointMethodTypes["issues"]["listEvents"]["response"]["data"];
}): Promise<{
    cycleTime: number | null
}> => {
    const mergeEvent = events.find(e => e.event === 'merged');
    const commitsResponse = await octokit.rest.pulls.listCommits({
        owner,
        repo: repoName,
        pull_number: pull.number,
        per_page: 1,
        sort: "created",
        direction: "asc",
    });
    const commits = commitsResponse.data;

    const firstCommitDate = commits[0]?.commit.author?.date;
    const mergeDate = mergeEvent?.created_at;

    if (!firstCommitDate || !mergeDate) {
        return {
            cycleTime: null,
        };
    }

    const firstCommitTime = new Date(firstCommitDate).getTime();
    const mergeTime = new Date(mergeDate).getTime();

    const cycleTime = (mergeDate && firstCommitDate) ?
        (mergeTime - firstCommitTime) / 1000 / 60 / 60:
        null;

    return {
        cycleTime
    }
};

export const getTeamStats = async ({
    team,
}: {
    team: Team,
}) => {
    const teamMembers = (await db.teamMember.findMany({
        where: {
            teamId: team.id,
        },
    })).map((teamMember: TeamMember) => teamMember.githubUserName);

    const githubRepositories: string[] = (await db.githubRepository.findMany({
        where: {
            teamId: team.id,
        },
    })).map((repo: GithubRepository) => repo.path);

    const githubToken = (await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "github",
        },
    }))?.value;

    if (!githubToken) {
        throw new Error("GitHub token not found");
    }

    return getTeamStatsHeadless({
        githubToken,
        teamMembers,
        githubRepositories,
    });
};

/**
 * The easily testable part of getTeamStats
 */
export const getTeamStatsHeadless = async ({
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

    // Step 1: fetch data from github
    for (const repoPath of githubRepositories) {
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
                continue;
            }
        }

        const now = new Date();

        if (cachedStats?.lastFetchStarted) {
            const lastFetchStarted = new Date(cachedStats.lastFetchStarted).getTime();
            const timeSinceLastFetch = now.getTime() - lastFetchStarted;

            // If fetch was started less than 15 minutes ago,
            // skip to avoid processing the same repo twice
            if (timeSinceLastFetch < 1000 * 60 * 15) {
                throw new Error("Fetch already in progress, please come back in a few minutes");
            }
        }

        await db.repoCache.upsert({
            where: {
                path: repoPath,
            },
            update: {
                lastFetchStarted: now,
            },
            create: {
                path: repoPath,
                lastFetchStarted: now,
                cache: "{}",
            }
        });

        const owner = repoPath.split("/")[0]!;
        const repoName = repoPath.split("/")[1]!;

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
                repo: repoName,
                sort: "created",
                direction: "desc",
                per_page: 100,
                page,
                state: "all",
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

            const { timeToFirstReview, reviews, events } = await computeTimeToFirstReview({
                owner,
                repoName,
                pull,
                octokit,
            });

            const { cycleTime } = await computePullCycleTime({
                pull,
                owner,
                repoName,
                octokit,
                events,
            });

            const created_at = pull.created_at;
            const isMerged = pull.merged_at !== null;
            const isReadyForReview = pull.draft === false;
            const isWaitingToBeMerged = !isMerged && !isReadyForReview;

            pullStats[pull.number] = {
                // convert to hours
                timeToFirstReview: (timeToFirstReview && timeToFirstReview > 0) ? timeToFirstReview / 1000 / 60 / 60 : null,
                created_at,
                link: pull.html_url,
                author: pull.user!.login,
                number: pull.number,
                reviewer: reviews[0]?.user?.login ?? null,
                cycleTime,
                isMerged,
                isReadyForReview,
                isWaitingToBeMerged,
            };
        }

        const repositoryStats: RepositoryStats = {
            avgPullRequestCycleTime: -1,
            avgTimeToFirstReview: -1,
            medianTimeToFirstReview: -1,
            throughputPRsPerWeek: -1,
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
                lastFetchStarted: now,
            },
            create: {
                path,
                cache,
                lastFetchStarted: now,
            }
        });
    }

    // Step 2: compute team stats
    for (const repoPath of githubRepositories) {
        if (!statsPerRepository[repoPath]?.pullStats) {
            throw new Error("No pull stats found");
        }

        const pullStats = statsPerRepository[repoPath].pullStats;

        const currentReportPullStats = Object.fromEntries(Object.entries(pullStats)
            .filter(([_number, pull]) => {
                // by default, only show stats for last 2 weeks
                // (we can parameterize this later if needed)
                if (new Date(pull.created_at).getTime() < TWO_WEEKS_AGO) {
                    console.log(`PR is older than 2 weeks; skipping`);
                    return false;
                }
                return true;
            })
        );

        // Review Time
        const timesToFirstReview = Object.values(currentReportPullStats)
            .filter(pull => pull.reviewer !== null)
            .map(pull => pull.timeToFirstReview)
            .filter((timeToFirstReview) => timeToFirstReview !== null);
        timesToFirstReview.sort();

        const countTimesToFirstReview = timesToFirstReview.length;
        const sumTimesToFirstReview = timesToFirstReview.reduce((a, b) => a + b, 0);
        const avgTimeToFirstReview = sumTimesToFirstReview / countTimesToFirstReview;
        const medianTimeToFirstReview = timesToFirstReview[Math.floor(countTimesToFirstReview / 2)];

        // Pull Cycle Time
        const cycleTimes = Object.values(currentReportPullStats)
            .map(pull => pull.cycleTime)
            .filter(val => val != null);
        const sumCycleTime = cycleTimes.reduce((a, b) => a + b, 0);
        const avgPullRequestCycleTime = sumCycleTime / cycleTimes.length;

        const throughputPRsPerWeek = Object.values(currentReportPullStats)
            .length / 2;

        const repositoryStats: RepositoryStats = {
            avgPullRequestCycleTime,
            avgTimeToFirstReview,
            medianTimeToFirstReview,
            throughputPRsPerWeek,
            pullStats: currentReportPullStats,
            cacheSchemaVersion: CACHE_SCHEMA_VERSION,
        };

        statsPerRepository[repoPath] = repositoryStats;
    }

    return {
        stats: statsPerRepository,
        teamMembers,
        githubRepositories,
    };
};
