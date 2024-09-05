"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../../trpc/react';
import { useSession } from 'next-auth/react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, LogarithmicScale } from 'chart.js';
import 'chartjs-adapter-date-fns';

// Register the necessary components with Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, TimeScale, LogarithmicScale);
import type { RepositoryStats } from '~/server/api/routers/getTeamStats';
import React from 'react';
import { FaGithub, FaLink } from 'react-icons/fa6';
import { Button, Link, Spinner } from '@nextui-org/react';

function PullTimeToFirstReviewTimeSeriesChart({ data }
    : { data: any[] }
) {
    let displayData: any[] = data;

    // Filter out times below 0 minutes
    displayData = displayData.filter((stat: any) => stat.timeToFirstReview > 0);


    displayData = displayData.map((stat: any) => {
        return {
            ...stat,
            x: new Date(stat.created_at).getTime(),
            y: stat.timeToFirstReview,
            data: stat,
        };
    }).filter(
        stat => stat.timeToFirstReview !== null
    );

    // we need to sort the data by created_at
    displayData.sort((a: any, b: any) => {
        return a.x - b.x;
    });

    const chartData = {
        datasets: [
            {
                label: 'Time to first review',
                data: displayData,
                fill: false,
                backgroundColor: 'rgb(255, 99, 132)',
                borderColor: 'rgba(255, 99, 132, 0.2)',
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: {
                type: 'time',
                time: {
                    unit: 'day',
                },
                title: {
                    display: true,
                    text: 'Date',
                    color: '#333333',
                },
                ticks: {
                    color: '#333333',
                },
            },
            y: {
                type: 'logarithmic',
                title: {
                    display: true,
                    text: 'Time to first review (hours) [log scale]',
                    color: '#333333',
                },
                ticks: {
                    color: '#333333',
                },
            },

        },
        onClick: function(_e: any, activeElements: any) {
            const element = activeElements[0]?.element;

            if (!element) {
                return;
            }

            const link = element.$context.raw.data.link;
            if (!link) {
                return;
            }

            window.open(link, '_blank');
        },
        plugins: {
            legend: {
                display: false,
                color: '#ffffff',
            },
            title: {
                display: true,
                text: 'Time to first review',
                color: '#ffffff',
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        const label = context.dataset.label || '';
                        const yValue = context.raw.y;
                        const author = context.raw.author || '';
                        const number = context.raw.data.number || '';
                        const reviewer = context.raw.data.reviewer || '';

                        return [
                            `${label}: ${yValue.toFixed(2)} hours`,
                            `#${number}`,
                            `Author: ${author}`,
                            `Reviewer: ${reviewer}`,
                        ];
                    }
                }
            }
        },
    };

    return (
        <Line data={chartData} options={options as any} />
    );
}

function PullStats({ stats }: { stats: RepositoryStats }) {
    const displayStats = Object.values(stats?.pullStats ?? {});
    displayStats.sort((a, b) => {
        return (a.timeToFirstReview ?? 0) - (b.timeToFirstReview ?? 0);
    });

    return (
        <div>
            <h3 className="text-xl">Pull Request Stats</h3>
            <table className="text-right my-4 w-full">
                <tr className="text-slate-600 border-b-2 border-slate-600">
                    <th className="px-1 text-left">Stat</th>
                    <th className="px-1 text-right">Value</th>
                    <th className="px-1 text-right">Unit</th>
                </tr>
                <tr>
                    <td className="px-1 text-left">Average Time to First Review</td>
                    <td className="px-1 text-right">{stats.avgTimeToFirstReview.toFixed(1)}</td>
                    <td className="px-1 text-right">hours</td>
                </tr>
                <tr>
                    <td className="px-1 text-left">Median Time to First Review</td>
                    <td className="px-1 text-right">{stats.medianTimeToFirstReview?.toFixed(1)}</td>
                    <td className="px-1 text-right">hours</td>
                </tr>
                <tr>
                    <td className="px-1 text-left">Average Pull Request Cycle Time</td>
                    <td className="px-1 text-right">{stats.avgPullRequestCycleTime?.toFixed(0)}</td>
                    <td className="px-1 text-right">hours</td>
                </tr>
                <tr>
                    <td className="px-1 text-left">Throughput</td>
                    <td className="px-1 text-right">{stats.throughputPRsPerWeek?.toFixed(0)}</td>
                    <td className="px-1 text-right">PRs/week</td>
                </tr>
            </table>

            <table className="text-right mt-4 w-full">
                <tr className="text-slate-700 border-b-2 border-slate-700">
                    <th className="px-1 text-left">PR #</th>
                    <th className="px-1 text-center">Author</th>
                    <th className="px-1 text-center">Reviewer</th>
                    <th className="px-1 text-center">Time to First Review (hours)</th>
                    <th className="px-1 text-right">Cycle Time (hours)</th>
                    <th className="px-1 text-right">Waiting to be merged?</th>
                </tr>
                {displayStats.filter(stat => stat.reviewer).map((stat) => {
                    return (
                        <tr key={stat.number}>
                            <td className="px-1 text-left">
                                <a href={stat.link} target="_blank">
                                    {stat.number}
                                </a>
                            </td>
                            <td className="px-1 text-center">{stat.author}</td>
                            <td className="px-1 text-center">{stat.reviewer}</td>
                            <td className="px-1 text-center">{stat?.timeToFirstReview?.toFixed(2)}</td>
                            <td className="px-1 text-right">{stat?.cycleTime?.toFixed(2)}</td>
                            <td className="px-1 text-right">{stat?.isWaitingToBeMerged ? 'Yes' : 'No'}</td>
                        </tr>
                    );
                })}
            </table>

            <PullTimeToFirstReviewTimeSeriesChart data={displayStats}/>
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
                                as={Link}
                                href={`https://github.com/${member}`}
                                target="_blank"
                                className="m-1"
                                startContent={<FaGithub/>}
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
                                <a href={`https://github.com/${repo}`} target="_blank">
                                    {repo}
                                    <FaGithub className="inline-block ml-1" />
                                </a>
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
