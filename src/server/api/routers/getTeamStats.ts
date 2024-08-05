import { Octokit } from "@octokit/rest";

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

    await Promise.all(githubRepositories.map(async (repoPath) => {
        console.log('Reading repo: ', repoPath);
        const owner = repoPath.split("/")[0]!;
        const repo = repoPath.split("/")[1]!;
        const pulls = await octokit.rest.pulls.list({
            owner,
            repo,
            sort: "updated",
            per_page: 100,
            page: 0,
        });

        await Promise.all(pulls.data.map(async (pull) => {
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
                .filter((comment) => comment.user.login !== pull.user.login)
                .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            const firstCommentDate = comments[0]?.created_at;

            // Get the first PR review time
            const reviewsResponse = await octokit.rest.pulls.listReviews({
                owner,
                repo,
                pull_number: pull.number,
            });

            const reviews = reviewsResponse.data
                .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

            const firstReviewDate = reviews[0]?.submitted_at;

            // Compute time to first review (smallest of first review/comment time)
            let timeToFirstReview = 0.0;
            if (comments[0] && reviews[0]) {
                timeToFirstReview = Math.min(
                    new Date(firstCommentDate).getTime() - new Date(readyForReviewDate).getTime(),
                    new Date(firstReviewDate).getTime() - new Date(readyForReviewDate).getTime(),
                );
            } else if (comments[0]) {
                timeToFirstReview = new Date(firstCommentDate).getTime() - new Date(readyForReviewDate).getTime();
            } else if (reviews[0]) {
                timeToFirstReview = new Date(firstReviewDate).getTime() - new Date(readyForReviewDate).getTime();
            } else {
                timeToFirstReview = null;
            }

            console.log('Time to first review: ', timeToFirstReview, pull.number);
        }));
    }));

    console.log('Done');
};
