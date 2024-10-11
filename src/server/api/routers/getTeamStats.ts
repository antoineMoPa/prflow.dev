import { Octokit, RestEndpointMethodTypes } from "@octokit/rest";
import { db } from "../../db";
import { GithubRepository, Team, TeamMember } from "@prisma/client";
import { AgileClient, Version3Client } from 'jira.js';
import { Issue } from "jira.js/out/version3/models";

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
    pullStats: Record<string, PullStats>,
    weeklyStats: {
        previousWeekAvgPullRequestCycleTime: number,
        avgPullRequestCycleTime: number,
        previousWeekAvgTimeToFirstReview: number,
        avgTimeToFirstReview: number,
        previousWeekMedianTimeToFirstReview: number | undefined,
        medianTimeToFirstReview: number | undefined,
        throughputPRs: number,
        previousWeekThroughputPRs: number,
    },
    cacheSchemaVersion: number,
};

export type JiraTaskStats = {
    issueDetail: Issue,
    cacheSchemaVersion: number,
}

type StatsPerRepository = Record<string, RepositoryStats>;

const GITHUB_CACHE_SCHEMA_VERSION = 20;
const JIRA_CACHE_SCHEMA_VERSION = 2;
const DEV_MODE = false;

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;
const ONE_WEEK_AGO = (new Date().getTime()) - ONE_WEEK_MS;
const TWO_WEEKS_AGO = (new Date().getTime()) - ONE_WEEK_MS * 2;

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
        .filter((comment) => !comment.user!.login.includes("[bot]"))
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
}): Promise<{
    githubStats: GetGithubTeamStats,
    jiraStats?: GetJiraTeamStats
}> => {
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

    const jiraToken = (await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "jira_auth_token",
        },
    }))?.value;

    const jiraDomain = (await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "jira_domain",
        },
    }))?.value;

    const jiraBoardId = (await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "jira_board_id",
        },
    }))?.value;

    const jiraProjectId = (await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "jira_project_id",
        },
    }))?.value;

    const jiraUserEmail = (await db.authToken.findFirst({
        where: {
            teamId: team.id,
            type: "jira_user_email",
        },
    }))?.value;

    const stats = await getGithubTeamStats({
        githubToken,
        teamMembers,
        githubRepositories,
    });

    let jiraStats: GetJiraTeamStats | undefined = undefined;

    if (jiraToken && jiraDomain && jiraBoardId && jiraProjectId && jiraUserEmail) {
        try {
            jiraStats = await getJiraTeamStats({
                jiraToken,
                jiraDomain,
                jiraProjectId,
                jiraBoardId,
                jiraUserEmail,
            })
        } catch (e) {
            console.error('JIRA Stats failed');
        }
    }

    return {
        githubStats: stats,
        jiraStats,
    };
};

type GetGithubTeamStats = {
    stats: StatsPerRepository,
    teamMembers: string[],
    githubRepositories: string[],
};

export const getGithubTeamStats = async ({
    githubToken,
    teamMembers,
    githubRepositories,
}: {
    githubToken: string,
    teamMembers: string[],
    githubRepositories: string[],
}): Promise<GetGithubTeamStats> => {
    const octokit = new Octokit({
        auth: githubToken,
    });

    const statsPerRepository: StatsPerRepository = {};

    // Step 1: fetch data from github
    for (const repoPath of githubRepositories) {
        const cachedStats = await db.cache.findFirst({
            where: {
                path: repoPath,
            },
        });

        let pullStats: Record<string, PullStats> = {};

        if (cachedStats?.cache) {
            const cache = JSON.parse(cachedStats.cache) as unknown as RepositoryStats;

            if (cache.cacheSchemaVersion == GITHUB_CACHE_SCHEMA_VERSION) {
                pullStats = cache.pullStats;
            }

            const CACHE_CUTOFF = 1000 * 60 * 60 * 24; // 1 day
            const cacheDate = new Date(cachedStats.updatedAt).getTime();

            if (cache.cacheSchemaVersion == GITHUB_CACHE_SCHEMA_VERSION &&
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

        await db.cache.upsert({
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
            pullStats,
            weeklyStats: {
                previousWeekAvgPullRequestCycleTime: -1,
                avgPullRequestCycleTime: -1,
                previousWeekAvgTimeToFirstReview: -1,
                avgTimeToFirstReview: -1,
                previousWeekMedianTimeToFirstReview: -1,
                medianTimeToFirstReview: -1,
                throughputPRs: -1,
                previousWeekThroughputPRs: -1,
            },
            cacheSchemaVersion: GITHUB_CACHE_SCHEMA_VERSION,
        };

        statsPerRepository[repoPath] = repositoryStats;

        const cache = JSON.stringify(repositoryStats);
        const path = repoPath;
        await db.cache.upsert({
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

        const previousWeekPullStats = Object.values(currentReportPullStats)
            .filter(pull => new Date(pull.created_at).getTime() > TWO_WEEKS_AGO && new Date(pull.created_at).getTime() < ONE_WEEK_AGO);

        const currentWeekPullStats = Object.values(currentReportPullStats)
            .filter(pull => new Date(pull.created_at).getTime() > ONE_WEEK_AGO);

        // Review Time
        const timesToFirstReview = Object.values(currentReportPullStats)
            .filter(pull => pull.reviewer !== null)
            .map(pull => pull.timeToFirstReview)
            .filter((timeToFirstReview) => timeToFirstReview !== null);
        timesToFirstReview.sort();

        const previousWeekTimesToFirstReview = previousWeekPullStats
            .filter(pull => pull.reviewer !== null)
            .map(pull => pull.timeToFirstReview)
            .filter((timeToFirstReview) => timeToFirstReview !== null);
        previousWeekTimesToFirstReview.sort();

        const countTimesToFirstReview = timesToFirstReview.length;
        const sumTimesToFirstReview = timesToFirstReview.reduce((a, b) => a + b, 0);
        const avgTimeToFirstReview = sumTimesToFirstReview / countTimesToFirstReview;
        const medianTimeToFirstReview = timesToFirstReview[Math.floor(countTimesToFirstReview / 2)];

        const previousWeekCountTimesToFirstReview = previousWeekTimesToFirstReview.length;
        const previousWeekSumTimesToFirstReview = previousWeekTimesToFirstReview.reduce((a, b) => a + b, 0);
        const previousWeekAvgTimeToFirstReview = previousWeekSumTimesToFirstReview / previousWeekCountTimesToFirstReview;
        const previousWeekMedianTimeToFirstReview = previousWeekTimesToFirstReview[Math.floor(previousWeekCountTimesToFirstReview / 2)];

        // Pull Cycle Time
        const cycleTimes = Object.values(currentWeekPullStats)
            .map(pull => pull.cycleTime)
            .filter(val => val != null);
        const sumCycleTime = cycleTimes.reduce((a, b) => a + b, 0);
        const avgPullRequestCycleTime = sumCycleTime / cycleTimes.length;

        const previousWeekCycleTimes = Object.values(previousWeekPullStats)
            .map(pull => pull.cycleTime)
            .filter(val => val != null);
        const previousWeekSumCycleTime = previousWeekCycleTimes.reduce((a, b) => a + b, 0);
        const previousWeekAvgPullRequestCycleTime = previousWeekSumCycleTime / previousWeekCycleTimes.length;

        const previousWeekThroughputPRs = previousWeekPullStats.length;
        const throughputPRs = currentWeekPullStats.length;

        const repositoryStats: RepositoryStats = {
            avgPullRequestCycleTime,
            avgTimeToFirstReview,
            medianTimeToFirstReview,
            pullStats: currentReportPullStats,
            cacheSchemaVersion: GITHUB_CACHE_SCHEMA_VERSION,
            weeklyStats: {
                avgPullRequestCycleTime: avgPullRequestCycleTime,
                previousWeekAvgPullRequestCycleTime: previousWeekAvgPullRequestCycleTime,
                avgTimeToFirstReview,
                previousWeekAvgTimeToFirstReview,
                medianTimeToFirstReview,
                previousWeekMedianTimeToFirstReview,
                throughputPRs,
                previousWeekThroughputPRs,
            }
        };

        statsPerRepository[repoPath] = repositoryStats;
    }

    return {
        stats: statsPerRepository,
        teamMembers,
        githubRepositories,
    };
};

export type IssueStats = {
    cycleTime?: number, // hours
    inProgressTime?: number, // hours
    storyPoints?: number, // hours
    status?: string,
};

export type AggregatedIssueStats = {
    completedPoints: number,
    pointsToDo: number,
    pointsInProgress: number,
    pointsAddedMidSprint: number,
    issuesAddedMidSprint: { key: string, points: number, link: string }[],
    sprintTimePassedRatio: number | null,
    pointsCompletionRate: number,
    averageCycleTime: number, // hours
}

export type GetJiraTeamStats = {
    issueStats?: Record<string, IssueStats>,
    aggregatedStats?: AggregatedIssueStats,
}

export const getJiraTeamStats = async ({
    jiraToken,
    jiraDomain,
    jiraProjectId,
    jiraBoardId,
    jiraUserEmail,
}: {
    jiraToken: string,
    jiraDomain: string,
    jiraProjectId: string,
    jiraBoardId: string,
    jiraUserEmail: string,
}): Promise<GetJiraTeamStats> => {
    const client = new Version3Client({
        host: jiraDomain,
        authentication: {
            basic: {
                email: jiraUserEmail,
                apiToken: jiraToken
            },
        },
    });
    const agileClient = new AgileClient({
        host: jiraDomain,
        authentication: {
            basic: {
                email: jiraUserEmail,
                apiToken: jiraToken
            },
        },
    });

    // check if client is working
    try {
        await client.myself.getCurrentUser();
    } catch (e) {
        console.error("Jira auth unsuccessful");
        throw e;
    }

    const sprints = await agileClient.board.getAllSprints({
        boardId: parseInt(jiraBoardId),
        state: "active",
    });

    const currentSprint = sprints.values?.[0];
    const sprintStartDate: Date | null = currentSprint?.startDate ? new Date(currentSprint?.startDate): null;
    const sprintEndDate: Date | null = currentSprint?.endDate ? new Date(currentSprint?.endDate): null;

    let sprintTimePassedRatio = null;

    if (sprintStartDate && sprintEndDate) {
        sprintTimePassedRatio = (new Date().getTime() - sprintStartDate.getTime()) / (sprintEndDate.getTime() - sprintStartDate.getTime());
    }

    const issues = await client.issueSearch.searchForIssuesUsingJql({
        jql: `sprint in openSprints() AND project="${jiraProjectId}"`,
        maxResults: 100,
    });

    // JIRA points are stored in a custom field
    // So let's find it.
    const fields = await client.issueFields.getFields();
    const storyPointsField: string | undefined = Object.values(fields).find((field) => field.name === "Story Points")?.id;


    // This is a map of issue key to stats that we either get from our cache in DB
    // or fetch from Jira API. (then store in cache)
    const statsPerIssue: Record<string, JiraTaskStats> = {};

    for (const issue of issues?.issues ?? []) {
        const now = new Date();
        const path = `${jiraDomain}-${jiraProjectId}-${issue.key}`;

        // Check if we already have this issue in cache
        const cachedStats = await db.cache.findFirst({
            where: {
                path,
            },
        });

        if (cachedStats) {
            const cache = JSON.parse(cachedStats.cache) as unknown as JiraTaskStats;
            const CACHE_CUTOFF = 1000 * 60 * 60 * 24; // 1 day
            const cacheDate = new Date(cachedStats.updatedAt).getTime();

            if (cache.cacheSchemaVersion == JIRA_CACHE_SCHEMA_VERSION &&
                (new Date().getTime() - cacheDate) < CACHE_CUTOFF
            ) {
                // Don't fetch, use cache.
                statsPerIssue[path] = cache;
                console.log("Using cache for issue", issue.key);
                continue;
            }
        }

        const issueDetail = await client.issues.getIssue({
            issueIdOrKey: issue.key,
            expand: ["changelog"],
        });

        if (!issueDetail) {
            console.error(`Issue ${issue.key} not found`);
            continue;
        }

        const stats: JiraTaskStats = {
            issueDetail,
            cacheSchemaVersion: JIRA_CACHE_SCHEMA_VERSION
        };

        const cache = JSON.stringify(stats);

        await db.cache.upsert({
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

    const aggregatedStats: AggregatedIssueStats = {
        completedPoints: 0,
        pointsToDo: 0,
        pointsInProgress: 0,
        pointsAddedMidSprint: 0,
        averageCycleTime: 0,
        sprintTimePassedRatio,
        pointsCompletionRate: 0,
        issuesAddedMidSprint: [],
    };

    const issueStats: Record<string, IssueStats> = {};

    for (const [key, issue] of Object.entries(statsPerIssue)) {
        issueStats[key] = {
            status: issue.issueDetail.fields.status?.name,
        };

        // compute cycle time
        // Cycle time is defined as the time between the first transition to "In Progress"
        // and the first transition to "Done"
        // We can use the changelog to compute this
        const changelog = issue.issueDetail.changelog;
        if (!changelog) {
            continue;
        }

        const status = issue.issueDetail.fields.status?.name;


        const historiesWithInprogressItems = changelog.histories?.
            filter((history) => history.items?.some((item) => item.fieldId === "status" && item.toString === "In Progress"));
        const historiesWithDoneItems = changelog.histories?.
            filter((history) => history.items?.some((item) => item.fieldId === "status" && item.toString === "Done"));

        const firstInProgressTimeString = historiesWithInprogressItems?.[0]?.created;
        const lastDoneTimeString = historiesWithDoneItems?.[historiesWithDoneItems.length - 1]?.created;

        if (status == 'Done') {

            // Compute cycle time

            if (lastDoneTimeString && firstInProgressTimeString) {
                const firstInProgressDate = new Date(firstInProgressTimeString);
                const lastDoneDate = new Date(lastDoneTimeString);
                const cycleTime = (lastDoneDate.getTime() - firstInProgressDate.getTime()) / 1000 / 60 / 60;

                issueStats[key] = {
                    ...issueStats[key],
                    cycleTime,
                }

            }
        }

        if (firstInProgressTimeString) {
            const now = new Date().getTime();
            const inProgressTime = (now - new Date(firstInProgressTimeString).getTime()) / 1000 / 60 / 60;

            issueStats[key] = {
                ...issueStats[key],
                inProgressTime,
            }
        }

        if (storyPointsField) {
            const storyPoints = issue.issueDetail.fields[storyPointsField];
            issueStats[key] = {
                ...issueStats[key],
                storyPoints,
            }
        }

        // find out if issue was added mid-sprint
        if (sprintStartDate) {
            const sprintFieldHistories = changelog.histories?.filter((history) => history.items?.some((item) => item.field === "Sprint"));
            const sprintFieldHistoryCreatedDatesStrings = sprintFieldHistories?.map((history) => history.created ?? '');
            const sprintFieldHistoryCreatedDates = sprintFieldHistoryCreatedDatesStrings?.map((dateString) => new Date(dateString).getTime());

            sprintFieldHistoryCreatedDates?.sort((a, b) => a - b);

            // Find latest sprint modification
            const latestSprintModification = sprintFieldHistoryCreatedDates?.[sprintFieldHistoryCreatedDates.length - 1];

            if (latestSprintModification
                && latestSprintModification > sprintStartDate.getTime()) {
                aggregatedStats.pointsAddedMidSprint += issueStats[key].storyPoints ?? 0;
            }

            aggregatedStats.issuesAddedMidSprint.push({
                key: issue.issueDetail.key,
                points: issueStats[key].storyPoints ?? 0,
                link: `${jiraDomain}/browse/${issue.issueDetail.key}`,
            });
        }
    }

    const sumReducer = (a?: number, b?: number) => ((a ?? 0) + (b ?? 0));

    // Compute aggregated stats
    const completedPoints = Object.values(issueStats)
        .filter((issue) => issue.status === "Done")
        .map((issue) => issue.storyPoints)
        .reduce(sumReducer, 0) ?? 0;
    const pointsToDo = Object.values(issueStats)
        .filter((issue) => issue.status === "To Do")
        .map((issue) => issue.storyPoints)
        .reduce(sumReducer, 0) ?? 0;
    const pointsInProgress = Object.values(issueStats)
        .filter((issue) => issue.status === "In Progress")
        .map((issue) => issue.storyPoints)
        .reduce(sumReducer, 0) ?? 0;
    const allCycleTimes = Object.values(issueStats)
        .map((issue) => issue.cycleTime)
        .filter(cycleTime => cycleTime);

    const pointsCompletionRate = completedPoints / (pointsToDo + pointsInProgress);
    aggregatedStats.sprintTimePassedRatio = sprintTimePassedRatio;
    aggregatedStats.pointsCompletionRate = pointsCompletionRate;

    const averageCycleTime = (allCycleTimes.reduce(sumReducer, 0) ?? 0) / allCycleTimes.length;

    aggregatedStats.completedPoints = completedPoints;
    aggregatedStats.pointsToDo = pointsToDo;
    aggregatedStats.pointsInProgress = pointsInProgress;
    aggregatedStats.averageCycleTime = averageCycleTime;

    return {
        issueStats,
        aggregatedStats,
    }
}
