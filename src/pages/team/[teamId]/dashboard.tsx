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
import { FaLink } from 'react-icons/fa6';
import { Button } from '@nextui-org/react';

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
                    color: '#eeeeee',
                },
                ticks: {
                    color: '#eeeeee',
                },
            },
            y: {
                type: 'logarithmic',
                title: {
                    display: true,
                    text: 'Time to first review (hours) [log scale]',
                    color: '#eeeeee',
                },
                ticks: {
                    color: '#eeeeee',
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
            <PullTimeToFirstReviewTimeSeriesChart data={displayStats}/>
            <h4>Avg. Time to First Review (hours)</h4>
            <p>{stats.avgTimeToFirstReview.toFixed(2)}</p>
            <h4>Median Time to First Review (hours)</h4>
            <p>{stats.medianTimeToFirstReview!.toFixed(4)}</p>
            <h4>Avg. Pull Request Cycle Time (hours)</h4>
            <p>{stats.avgPullRequestCycleTime?.toFixed(4)}</p>

            <table className="text-right mt-4 w-full">
                <tr>
                    <th className="px-1 text-left">PR #</th>
                    <th className="px-1 text-center">Author</th>
                    <th className="px-1 text-center">Reviewer</th>
                    <th className="px-1 text-center">Time to First Review (hours)</th>
                    <th className="px-1 text-right">Cycle Time (hours)</th>
                </tr>
                {displayStats.filter(stat => stat.reviewer).map((stat) => {
                    return (
                        <tr key={stat.number} className="text-slate-300">
                            <td className="px-1 text-left">
                                <a href={stat.link} target="_blank">
                                    {stat.number}
                                </a>
                            </td>
                            <td className="px-1 text-center">{stat.author}</td>
                            <td className="px-1 text-center">{stat.reviewer}</td>
                            <td className="px-1 text-center">{stat?.timeToFirstReview?.toFixed(2)}</td>
                            <td className="px-1 text-right">{stat?.cycleTime?.toFixed(2)}</td>
                        </tr>
                    );
                })}
            </table>

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

function SlackReportTest({ teamId }: { teamId: number }) {
    const {
        isError,
        isSuccess,
        mutate,
        failureReason,
    } = api.team.sendSlackReport.useMutation();


    return (
        <div>
            <h2 className="my-2">Test Slack Notifications</h2>
            <p className="my-2">
                Use this section to test the slack webhook notifications for your team.
            </p>
            <Button
                className="mt-2"
                onClick={() => {
                    mutate({ teamId });
                }}
            >
                Send Slack Report
            </Button>
            <div className="mt-2 text-red-500">
                {isError && <div>Failed to send slack report: {failureReason?.message}</div>}
            </div>
            <div className="mt-2 text-green-500">
                {isSuccess && <div>Slack report sent successfully!</div>}
            </div>
        </div>
    );
}

function TeamDashboard() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);

    const { data: stats } = api.teamDashboard.getDashboardStats.useQuery({ teamId });

    return (
        <div>
            <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900">
                <h2 className="text-xl">Your team</h2>
                <ul className="my-5">
                    {(stats?.teamMembers ?? []).map((member) => {
                        return (
                            <li key={member} className="flex">
                                <div className="grow self-center">
                                    <a href={`https://github.com/${member}`} target="_blank">{member}  <FaLink className="inline-block ml-1" /></a>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <h2 className="text-xl pl-5">Github Repositories</h2>
            {stats?.githubRepositories?.map((repo) => {
                return (

                    <div key={repo} className="flex p-5 m-5 rounded-md border-solid border-2 border-indigo-900">
                        <div className="grow self-center">
                            <h3 className="text-lg text-center">
                                <a href={`https://github.com/${repo}`} target="_blank">
                                    {repo}
                                    <FaLink className="inline-block ml-1" />
                                </a>
                            </h3>
                            {stats?.stats[repo] &&
                                <RepoStats stats={stats.stats[repo]!} />
                            }
                        </div>
                    </div>
                );
            })}
            <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900">
                <h2 className="text-xl">Slack Report Test</h2>
                <SlackReportTest teamId={teamId} />
            </div>
        </div>
    );
}

function TeamDashboardSuspense() {
    const session = useSession();

    if (!session?.data?.user) {
        return <div>loading...</div>;
    }

    return (
        <div className="container w-1/2">
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
