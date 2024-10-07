"use client";

import Layout from '~/app/_components/Layout';

export default function Team() {

    return (
        <Layout>
            <main className="flex min-h-screen flex-col bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white py-10">
                <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem] text-center">
                    Pricing
                </h1>
                <p className="text-center text-xl mt-10">200$/year for small teams (&lt;7 developers)</p>
            </main>

        </Layout>
    );
}
