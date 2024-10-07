import { Button, Link } from "@nextui-org/react";
import { HydrateClient } from "../trpc/server";
import NavBar from "./_components/NavBar";

export default async function Home() {
    return (
        <HydrateClient>
            <NavBar/>
            <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                        Measure & <span className="text-[hsl(280,100%,70%)]">improve</span> team workflows
                    </h1>
                    <p className="text-2xl text-center">
                        prflow.dev sends slack reports to your team&apos;s channel. We integrate with JIRA and github&apos;s API to provide team statistics.
                    </p>
                    <div className="w-3/4 text-center">
                        <img src="slack_screenshot.png"
                            alt="Slack screenshot"
                            className="w-full rounded shadow-md shadow-gray-900"/>
                    </div>
                </div>
            </main>
            <section className="bg-gradient-to-b from-[#15162c] to-[#2e026d] text-white">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-[3rem] text-center">
                        Features
                    </h2>
                    <div className="grid grid-cols-1 gap-12 sm:grid-cols-3 flex items-start">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <h3 className="text-2xl font-extrabold tracking-tight sm:text-[2.5rem] text-center">
                                PR Statistics
                            </h3>
                            <ul className="list-disc list-inside">
                                <li>
                                    Average Time to First Review,
                                </li>
                                <li>
                                    Median Time to First Review,
                                </li>
                                <li>
                                    Average Cycle Time,
                                </li>
                                <li>
                                    Team Throughput,
                                </li>
                            </ul>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <h3 className="text-2xl font-extrabold tracking-tight sm:text-[2.5rem] text-center">
                                JIRA Statistics
                            </h3>
                            <ul className="list-disc list-inside">
                                <li>
                                    Completed Story Points,
                                </li>
                                <li>
                                    Story Points remaining,
                                </li>
                                <li>
                                    Story Points added during sprint,
                                </li>
                                <li>
                                    Task Cycle Time,
                                </li>
                                <li>
                                    Story Points Completion Rate,
                                </li>
                            </ul>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <h3 className="text-2xl font-extrabold tracking-tight sm:text-[2.5rem] text-center">
                                AI Summary
                            </h3>
                            <ul className="list-disc list-inside">
                                <li>
                                    We generate a sprint summary using GPT-4o<br/> to help you understand your team&apos;s performance.
                                </li>
                            </ul>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <h3 className="text-2xl font-extrabold tracking-tight sm:text-[2.5rem] text-center">
                                Team Dashboard
                            </h3>
                            <ul className="list-disc list-inside">
                                <li>
                                    Detailed view of statistics per pull-request,
                                </li>
                                <li>
                                    PRs per developer (pie chart),
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
            <section className="bg-gradient-to-b from-[#15162c] to-[#2e026d] text-white">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <p className="font-extrabold tracking-tight text-lg text-center">
                        Get insights into your team&apos;s workflow and improve your team&apos;s productivity with data-driven decisions.
                    </p>
                </div>
            </section>

            <section className="bg-gradient-to-b from-[#15162c] to-[#2e026d] text-white">
                <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
                    <h2 className="text-3xl font-extrabold tracking-tight sm:text-[3rem] text-center">
                        Book a demo
                    </h2>

                    <p className="text-2xl text-center">
                        We will show you how to integrate prflow.dev with your team&apos;s slack channel and provide you with a demo of the features.
                    </p>
                    <div className="flex flex-col items-center justify-center gap-4">
                        <Button
                            as={Link}
                            color="success"
                            className="text-white text-lg p-8"
                            href="https://docs.google.com/forms/d/e/1FAIpQLSfcT2arJ_gFdokI36FtCbuQbJjLVDuOR2XSR47E-OmeaSrMRw/viewform?usp=sf_link"
                            target="_blank">
                            Book a Demo
                        </Button>
                    </div>
                </div>
            </section>
        </HydrateClient>
    );
}
