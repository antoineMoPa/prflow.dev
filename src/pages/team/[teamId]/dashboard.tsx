"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../../trpc/react';
import { useSession } from 'next-auth/react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, Title, Tooltip, Legend, ArcElement } from 'chart.js';

// Register the necessary components with Chart.js
ChartJS.register(CategoryScale, Title, Tooltip, Legend, ArcElement);
import type { RepositoryStats } from '~/server/api/routers/getTeamStats';
import React from 'react';
import { FaExternalLinkAlt } from 'react-icons/fa';
import { Button, Link, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@nextui-org/react';
import { FaGear } from 'react-icons/fa6';

function PRAuthoredPerDeveloperPieChart({ stats }: { stats: RepositoryStats }) {
    const pullStatsPerDeveloper = Object.values(stats.pullStats ?? {}).reduce((acc, stat) => {
        if (!stat.author) {
            return acc;
        }

        if (!acc[stat.author]) {
            acc[stat.author] = 0;
        }

        acc[stat.author]! += 1;

        return acc;
    }, {} as Record<string, number>);

    const data = {
        labels: Object.keys(pullStatsPerDeveloper),
        datasets: [
            {
                label: 'PRs authored',
                data: Object.values(pullStatsPerDeveloper),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'right' as const,
            },
            title: {
                display: true,
                text: 'PRs per developer',
            },
        },
    };

    return (
        <Pie data={data} options={options} />
    );
}

function PRsReviewedPerDeveloperPieChart({ stats }: { stats: RepositoryStats }) {
    const pullStatsPerDeveloper = Object.values(stats.pullStats ?? {}).reduce((acc, stat) => {
        if (!stat.reviewer) {
            return acc;
        }

        if (!acc[stat.reviewer]) {
            acc[stat.reviewer] = 0;
        }

        acc[stat.reviewer]! += 1;

        return acc;
    }, {} as Record<string, number>);

    const data = {
        labels: Object.keys(pullStatsPerDeveloper),
        datasets: [
            {
                label: 'PRs reviewed',
                data: Object.values(pullStatsPerDeveloper),
                backgroundColor: [
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                    'rgba(255, 99, 132, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                    'rgba(255, 206, 86, 0.2)',
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(153, 102, 255, 0.2)',
                    'rgba(255, 159, 64, 0.2)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                display: true,
                position: 'right' as const,
            },
            title: {
                display: true,
                text: 'Who reviews our PRs?',
            },
        },
    };

    return (
        <Pie data={data} options={options} />
    );
}

function PullStats({ stats }: { stats: RepositoryStats }) {
    const displayStats = Object.values(stats?.pullStats ?? {});
    displayStats.sort((a, b) => {
        return (a.timeToFirstReview ?? 0) - (b.timeToFirstReview ?? 0);
    });

    return (
        <div>
            <div className="mt-4">
                <div className="w-1/4 inline-flex">
                    <PRAuthoredPerDeveloperPieChart stats={stats} />
                </div>
                <div className="w-1/4 inline-flex">
                    <PRsReviewedPerDeveloperPieChart stats={stats} />
                </div>
            </div>

            <h2 className="text-xl mt-4">Pull Request Stats Summary</h2>
            <Table className="text-right my-4 w-full">
                <TableHeader>
                    <TableColumn className="text-left">Stat</TableColumn>
                    <TableColumn className="text-right">Value</TableColumn>
                    <TableColumn className="text-right">Unit</TableColumn>
                </TableHeader>
                <TableBody>
                    <TableRow>
                        <TableCell className="text-left">Average Time to First Review</TableCell>
                        <TableCell className="text-right">{stats.avgTimeToFirstReview.toFixed(1)}</TableCell>
                        <TableCell className="text-right">hours</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="text-left">Median Time to First Review</TableCell>
                        <TableCell className="text-right">{stats.medianTimeToFirstReview?.toFixed(1)}</TableCell>
                        <TableCell className="text-right">hours</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="text-left">Average Pull Request Cycle Time</TableCell>
                        <TableCell className="text-right">{stats.avgPullRequestCycleTime?.toFixed(0)}</TableCell>
                        <TableCell className="text-right">hours</TableCell>
                    </TableRow>
                    <TableRow>
                        <TableCell className="text-left">Throughput</TableCell>
                        <TableCell className="text-right">{stats.weeklyStats.throughputPRs?.toFixed(0)}</TableCell>
                        <TableCell className="text-right">PRs/week</TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <h2 className="text-xl mt-4">Pull Request Details</h2>
            <Table className="text-right mt-4 w-full">
                <TableHeader>
                    <TableColumn className="text-left">PR #</TableColumn>
                    <TableColumn className="text-center">Author</TableColumn>
                    <TableColumn className="text-center">Reviewer</TableColumn>
                    <TableColumn className="text-center">Time to First Review (hours)</TableColumn>
                    <TableColumn className="text-right">Cycle Time (hours)</TableColumn>
                    <TableColumn className="text-right">Waiting to be merged?</TableColumn>
                </TableHeader>
                <TableBody>
                    {displayStats.filter(stat => stat.reviewer).map((stat) => {
                        return (
                            <TableRow key={stat.number}>
                                <TableCell className="text-left">
                                    <a href={stat.link} target="_blank">
                                        {stat.number}
                                    </a>
                                </TableCell>
                                <TableCell className="text-center">{stat.author}</TableCell>
                                <TableCell className="text-center">{stat.reviewer}</TableCell>
                                <TableCell className="text-center">{stat?.timeToFirstReview?.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{stat?.cycleTime?.toFixed(2)}</TableCell>
                                <TableCell className="text-right">{stat?.isWaitingToBeMerged ? 'Yes' : 'No'}</TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function RepoStats({ stats }: { stats: RepositoryStats }) {
    if (!stats) {
        return <div>loading...</div>;
    }

    return (
        <div>
            { stats && <PullStats stats={stats}/>}
        </div>
    );
}

function TeamDashboard() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);

    const { data: stats, isLoading, isError, error } = api.teamDashboard.getDashboardStats.useQuery({ teamId });

    if (isLoading) {
        return (
            <div className="flex justify-center">
                <Spinner />
                <div className="w-5"></div>
                <p className="text-xl ml-2">
                    Fetching pull requests from github.
                    <br/>
                    This may take a few minutes.
                    <br/>
                    Please don&apos;t refresh the page.
                </p>
            </div>
        );
    }

    if (isError) {
        return <div className="text-red-500 justify-center">
                   <p className="text-xl text-center">
                       Error: {error.message}
                   </p>
               </div>;
    }

    return (
        <div>
            <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900 w-1/2 m-auto">
                <h2 className="text-xl">Your team</h2>
                <ul className="my-5">
                    {(stats?.teamMembers ?? []).map((member) => {
                        return (
                            <Button
                                key={member}
                                as={Link}
                                href={`https://github.com/${member}`}
                                target="_blank"
                                className="m-1"
                                startContent={<FaExternalLinkAlt/>}
                                color="primary"
                            >
                                {member}
                            </Button>
                        );
                    })}
                </ul>
            </div>
            {stats?.githubRepositories?.map((repo) => {
                return (

                    <div key={repo} className="flex p-5 m-5 rounded-md border-solid border-2 border-indigo-900 text-slate-700 bg-white">
                        <div className="grow self-center">
                            <h3 className="text-lg text-right">
                                <Button
                                    as={Link}
                                    href={`https://github.com/${repo}`}
                                    target="_blank"
                                    className="m-1"
                                    startContent={<FaExternalLinkAlt/>}
                                    color="primary"
                                >
                                    {repo}
                                </Button>
                                <Button
                                    as={Link}
                                    href={`/team/${teamId}/settings`}
                                    className="m-1"
                                    startContent={<FaGear/>}
                                    color="default"
                                >
                                    Settings
                                </Button>
                            </h3>
                            {stats?.stats[repo] &&
                                <RepoStats stats={stats.stats[repo]!} />
                            }
                        </div>
                    </div>
                );
            })
            }
        </div>
    );
}

function TeamDashboardSuspense() {
    const session = useSession();

    if (!session?.data?.user) {
        return <div>Please sign in to view this page.</div>;
    }

    return (
        <div className="container">
            <TeamDashboard/>
        </div>
    );
}

export default function Team() {
    return (
        <Layout>
            <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <div className="container flex flex-col items-center justify-center pb-8 mt-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-center">
                        Team Dashboard
                    </h1>
                </div>

                <TeamDashboardSuspense />
            </main>
        </Layout>
    );
}
