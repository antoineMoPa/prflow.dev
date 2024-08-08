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
                },
            },
            y: {
                type: 'logarithmic',
                title: {
                    display: true,
                    text: 'Time to first review (hours) [log scale]',
                }
            }
        },
        onClick: function(e: any, activeElements: any) {
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
            },
            title: {
                display: true,
                text: 'Time to first review',
            }
        },
    };

    return (
        <Line data={chartData} options={options as any} />
    );
}

function PullStats({ stats }: { stats: RepositoryStats }) {
    const displayStats = Object.values(stats?.pullStats ?? {});

    return (
        <div>
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
            <h3>Repo Stats</h3>
            { stats && <PullStats stats={stats}/>}
            <h4>Avg. Time to first review (hours)</h4>
            <p>{stats.avgTimeToFirstReview.toFixed(2)}</p>
            <h4>Median Time to first review (hours)</h4>
            <p>{stats.medianTimeToFirstReview!.toFixed(2)}</p>
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
                <h2 className="text-xl">Members</h2>
                <ul className="my-5">
                    {(stats?.teamMembers ?? []).map((member) => {
                        return (
                            <li key={member.id} className="flex">
                                <div className="grow self-center">
                                    <a href={`https://github.com/${member.githubUserName}`} target="_blank">{member.githubUserName}</a>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>
            <h2 className="text-xl pl-5">Github Repositories</h2>
            {stats?.githubRepositories?.map((repo) => {
                return (

                    <div key={repo.id} className="flex p-5 m-5 rounded-md border-solid border-2 border-indigo-900">
                        <div className="grow self-center">
                            <h3 className="text-lg text-center">
                                {repo.path}
                            </h3>
                            <a href={`https://github.com/${repo.path}`} target="_blank">{repo.path}</a>
                            {stats?.stats[repo.path] &&
                                <RepoStats stats={stats?.stats[repo.path]!} />
                            }
                        </div>
                    </div>
                );
            })}
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
