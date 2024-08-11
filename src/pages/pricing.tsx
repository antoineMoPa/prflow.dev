"use client";

import Layout from '~/app/_components/Layout';

export default function Team() {

    return (
        <Layout>
            <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white py-10">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                    Pricing
                </h1>
                <p className="text-center text-xl mt-10">prflow.dev if free while in beta!</p>
                <p className="text-center text-xl mt-10">After beta, we plan to offer these tiers:</p>
                <div className="flex w-full justify-center mt-10">
                    <div className="flex">
                        <div className="flex flex-col bg-[#1f1f1f] p-10 rounded-lg m-5">
                            <h2 className="text-2xl font-bold">Basic</h2>
                            <p className="text-lg mt-2">Track 2 metrics:</p>
                            <ul className="list-disc mt-4 ml-4">
                                <li>Time to first review</li>
                                <li>Throughput</li>
                            </ul>
                            <p className="text-lg mt-2">2$ / developer / month</p>
                        </div>
                        <div className="flex flex-col bg-[#1f1f1f] p-10 rounded-lg m-5">
                            <h2 className="text-2xl font-bold">Pro</h2>
                            <p className="text-lg mt-2">Track all of our metrics:</p>
                            <ul className="list-disc mt-4 ml-4">
                                <li>Time to first review</li>
                                <li>Throughput</li>
                                <li>More metrics to come!</li>
                            </ul>
                            <p className="text-lg mt-2">5$ / developer / month</p>
                        </div>
                    </div>
                </div>

            </main>

        </Layout>
    );
}
