"use client";

import { useRouter } from 'next/router';
import Layout from '~/app/_components/Layout';
import { api } from '../../../trpc/react';
import { useSession } from 'next-auth/react';
import { Button, Checkbox, Input, Select, SelectItem } from '@nextui-org/react';
import React, { useCallback, useEffect } from 'react';
import { FaRegTrashCan } from 'react-icons/fa6';
import Link from 'next/link';

function GithubRepositoriesEditor() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);
    const { data: allGithubRepositories, refetch } = api.team.getAllGithubRepositories.useQuery({ teamId });

    const utils = api.useUtils();
    const [path, setPath] = React.useState("");

    const addGithubRepository = api.team.addGithubRepository.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            setPath("");
            await refetch();
        },
    });

    const deleteGithubRepository = api.team.deleteGithubRepository.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            await refetch();
        },
    });

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900 w-1/2 m-auto">
            <h2 className="text-xl">Github Repositories</h2>
            <ul className="my-5">
                {allGithubRepositories?.map((githubRepo)  => {
                    return (
                        <li key={githubRepo.id} className="flex">
                            <div className="grow self-center">
                                {githubRepo.path}
                            </div>
                            <Button
                                className="ml-2 mt-2"
                                startContent={<FaRegTrashCan/>}
                                onClick={() => deleteGithubRepository.mutate({ id: githubRepo.id, teamId })}
                            >
                                Delete
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    addGithubRepository.mutate({ path, teamId });
                }}
                className="flex flex-col gap-2"
            >
                <div className="flex">
                    <Input
                        type="text"
                        label="org/repoName"
                        onChange={(e) => setPath(e.target.value)}
                        value={path}
                    />
                    <Button
                        type="submit"
                        className="ml-5 px-10 py-7"
                        disabled={addGithubRepository.isPending}
                    >
                        {addGithubRepository.isPending ? "Submitting..." : "Add"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function AuthTokens() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);
    const { data: allAuthTokens, refetch } = api.team.getAllTokens.useQuery({ teamId });

    const utils = api.useUtils();
    const [name, setName] = React.useState("team token");
    const [value, setValue] = React.useState("");
    const [tokenType, setTokenType] = React.useState("github");

    const createAuthToken = api.team.createToken.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            setName("");
            setValue("");
            await refetch();
        },
    });

    const deleteAuthToken = api.team.deleteToken.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            await refetch();
        },
    });

    React.useEffect(() => {
        if (tokenType === "slack_webhook_url") {
            setName("slack webhook url");
        }
        if (tokenType === "github") {
            setName("github token");
        }
        if (tokenType === "jira_domain") {
            setName("jira domain");
        }
        if (tokenType === "jira_auth_token") {
            setName("jira auth token");
        }
        if (tokenType === "jira_board_id") {
            setName("jira board id");
        }
        if (tokenType === "jira_project_id") {
            setName("jira project id");
        }
        if (tokenType === "jira_user_email") {
            setName("jira user email");
        }
    }, [tokenType]);

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900 w-1/2 m-auto">
            <h2 className="text-xl">Authentication tokens</h2>
            <p className="text-md">
                GitHub Instructions
            </p>
            <p>
                Generate a github authentication token here:&nbsp;
                <Link
                    href="https://github.com/settings/tokens"
                    className="text-blue-500"
                    target="_blank">
                    github.com/settings/tokens
                </Link>
                <p>Make sure to use a classic token and give repo permissions.</p>
            </p>
            <p className="text-md mt-4">
                Jira Instructions
            </p>
            <p>
                Your domain should look like this: https://your-domain.atlassian.net<br/>

                You can find your auth token here:&nbsp;
                <Link
                    href="https://id.atlassian.com/manage-profile/security/api-tokens"
                    className="text-blue-500"
                    target="_blank">
                    id.atlassian.com/manage-profile/security/api-tokens
                </Link>
                <br/>

                Your board id is a number that can be found in the URL when you are viewing
                a sprint or backlog in Jira.<br/>

                Your project id what your issues usually start with. (ex: the &quot;MR&quot; in &quot;MR-1234&quot;)<br/>

                Your user email is the email you use to login to Jira. We use it to communicate with JIRA&lsquo;s API, using your API token.
            </p>
            <ul className="my-5">
                {allAuthTokens?.map((authToken)  => {
                    return (
                        <li key={authToken.id} className="flex">
                            <div className="grow self-center">
                                {authToken.name}
                                <span className="text-slate-500 ml-1">[{authToken.type}]</span>
                            </div>
                            <Button
                                className="ml-2 mt-2"
                                startContent={<FaRegTrashCan/>}
                                onClick={() => deleteAuthToken.mutate({ id: authToken.id, teamId })}
                            >
                                Delete
                            </Button>
                        </li>
                    );
                })}
            </ul>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    createAuthToken.mutate({ name, value, teamId, type: tokenType });
                }}
                className="flex flex-col gap-2"
            >
                <div className="flex">
                    <Input
                        type="text"
                        label="Name"
                        onChange={(e) => setName(e.target.value)}
                        value={name}
                    />
                    <Input
                        type="text"
                        label="Value"
                        className="ml-5"
                        onChange={(e) => setValue(e.target.value)}
                        value={value}
                    />
                    <Select
                        selectedKeys={[tokenType]}
                        className="ml-5"
                        label="Token Type"
                        onChange={(e) => setTokenType(e.target.value)}
                    >
                        <SelectItem key="github">GitHub</SelectItem>
                        <SelectItem key="slack_webhook_url">Slack Webhook URL</SelectItem>
                        <SelectItem key="jira_domain">Jira Domain</SelectItem>
                        <SelectItem key="jira_auth_token">Jira Auth Token</SelectItem>
                        <SelectItem key="jira_board_id">Jira Board ID</SelectItem>
                        <SelectItem key="jira_project_id">Jira Project Id</SelectItem>
                        <SelectItem key="jira_user_email">Jira User Email</SelectItem>
                    </Select>
                    <Button
                        type="submit"
                        className="ml-5 px-10 py-7"
                        disabled={createAuthToken.isPending}
                    >
                        {createAuthToken.isPending ? "Submitting..." : "Add"}
                    </Button>
                </div>
            </form>
        </div>
    );
}

function SlackDaysOfWeekEditor() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);
    const { data: dbSlackDaysOfWeek, refetch } = api.team.getSlackDaysOfWeek.useQuery({ teamId });

    const utils = api.useUtils();

    const [monday, setMonday] = React.useState(dbSlackDaysOfWeek?.includes("1"));
    const [tuesday, setTuesday] = React.useState(dbSlackDaysOfWeek?.includes("2"));
    const [wednesday, setWednesday] = React.useState(dbSlackDaysOfWeek?.includes("3"));
    const [thursday, setThursday] = React.useState(dbSlackDaysOfWeek?.includes("4"));
    const [friday, setFriday] = React.useState(dbSlackDaysOfWeek?.includes("5"));
    const [saturday, setSaturday] = React.useState(dbSlackDaysOfWeek?.includes("6"));
    const [sunday, setSunday] = React.useState(dbSlackDaysOfWeek?.includes("0"));

    useEffect(() => {
        setMonday(dbSlackDaysOfWeek?.includes("1"));
        setTuesday(dbSlackDaysOfWeek?.includes("2"));
        setWednesday(dbSlackDaysOfWeek?.includes("3"));
        setThursday(dbSlackDaysOfWeek?.includes("4"));
        setFriday(dbSlackDaysOfWeek?.includes("5"));
        setSaturday(dbSlackDaysOfWeek?.includes("6"));
        setSunday(dbSlackDaysOfWeek?.includes("0"));
    }, [dbSlackDaysOfWeek]);

    const updateSlackDaysOfWeek = api.team.setSlackDaysOfWeek.useMutation({
        onSuccess: async () => {
            await utils.team.invalidate();
            await refetch();
        },
    });

    const onSubmit = useCallback(() => {
        const daysOfWeek = [
            monday ? "1" : "",
            tuesday ? "2" : "",
            wednesday ? "3" : "",
            thursday ? "4" : "",
            friday ? "5" : "",
            saturday ? "6" : "",
            sunday ? "0" : "",
        ].filter((day) => day !== "").join(",");

        updateSlackDaysOfWeek.mutate({ teamId, slackDaysOfWeek: daysOfWeek });
    }, [monday, tuesday, wednesday, thursday, friday, saturday, sunday, updateSlackDaysOfWeek, teamId]);

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900 w-3/4 m-auto">
            <h2 className="text-xl">Slack Days of Week</h2>
            <p className="text-md">
                This is the days of the week that the slack report will be sent.
            </p>
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    onSubmit();
                }}
                className="my-5"
            >
                <div className="flex">
                    <Checkbox
                        isSelected={monday}
                        onChange={(e) => setMonday(e.target.checked)}
                    >
                        <span className="text-white">
                            Monday, {monday}
                        </span>
                    </Checkbox>
                    <Checkbox
                        isSelected={tuesday}
                        onChange={(e) => setTuesday(e.target.checked)}
                        className="ml-5"
                    >
                        <span className="text-white">
                            Tuesday
                        </span>
                    </Checkbox>
                    <Checkbox
                        isSelected={wednesday}
                        onChange={(e) => setWednesday(e.target.checked)}
                        className="ml-5"
                    >
                        <span className="text-white">
                            Wednesday, {wednesday}
                        </span>
                    </Checkbox>
                    <Checkbox
                        isSelected={thursday}
                        onChange={(e) => setThursday(e.target.checked)}
                        className="ml-5"
                    >
                        <span className="text-white">
                            Thursday
                        </span>
                    </Checkbox>
                    <Checkbox
                        isSelected={friday}
                        onChange={(e) => setFriday(e.target.checked)}
                        className="ml-5"
                    >
                        <span className="text-white">
                            Friday
                        </span>
                    </Checkbox>
                    <Checkbox
                        isSelected={saturday}
                        onChange={(e) => setSaturday(e.target.checked)}
                        className="ml-5"
                    >
                        <span className="text-white">
                            Saturday
                        </span>
                    </Checkbox>
                    <Checkbox
                        isSelected={sunday}
                        onChange={(e) => setSunday(e.target.checked)}
                        className="ml-5"
                    >
                        <span className="text-white">
                            Sunday
                        </span>
                    </Checkbox>
                </div>
                <div>
                    <div className="flex">
                        <Button
                            type="submit"
                            className="px-10 py-7 mt-5"
                            disabled={updateSlackDaysOfWeek.isPending}
                        >
                            {updateSlackDaysOfWeek.isPending ? "Submitting..." : "Update"}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}

function SlackReportTest() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);
    const {
        isError,
        isSuccess,
        mutate,
        failureReason,
    } = api.team.sendSlackReport.useMutation();
    const { data: exampleSlackMessage } = api.team.getExampleSlackMessage.useQuery({ teamId });

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
            <h2 className="my-2 mt-4">Slack Message Preview</h2>
            <p>This is the content we send to slack.</p>
            <p>The ai-generated comment will vary.</p>
            <pre className="bg-white p-2 rounded-md border-solid border-2 border-indigo-900 text-black">
                {exampleSlackMessage?.join("\n")}
            </pre>
        </div>
    );
}

function TeamEditor() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);
    const { data: members, refetch } = api.team.getTeamMembers.useQuery({ teamId });
    const addTeamMember = api.team.addTeamMember.useMutation();
    const deleteTeamMember = api.team.deleteTeamMember.useMutation();
    const [memberGithubUserName, setMemberGithubUserName] = React.useState("");

    const addMember = async () => {
        if (!memberGithubUserName) {
            return;
        }
        await addTeamMember.mutateAsync({ teamId, githubUserName: memberGithubUserName });
        setMemberGithubUserName("");
        await refetch();
    };

    const deleteMember = async (memberId: number) => {
        await deleteTeamMember.mutateAsync({ memberId, teamId });
        await refetch();
    };

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900 w-1/2 m-auto">
            <div>
                <h2 className="text-xl">Members</h2>
                <ul className="my-5">
                    {members?.map((member) => (
                        <li key={member.id} className="flex">
                            <div className="grow self-center">
                                {member.githubUserName}
                            </div>
                            <Button
                                className="ml-2 mt-2"
                                startContent={<FaRegTrashCan/>}
                                onClick={() => deleteMember(member.id)}
                            >
                                Delete
                            </Button>
                        </li>
                    ))}
                </ul>
                <div className="flex my-2 mb-5">
                    <Input
                        onChange={(e) => setMemberGithubUserName(e.target.value)}
                        value={memberGithubUserName}
                        label="@username"
                        className="grow self-center"
                    />
                    <Button
                        className="ml-2 self-center p-7"
                        onClick={addMember}
                    >
                        Add
                    </Button>
                </div>
            </div>
        </div>
    );
}

function DangerZone() {
    const router = useRouter();
    const teamId = parseInt(router.query.teamId as string);
    const deleteTeam = api.team.delete.useMutation();

    const deleteThisTeam = async () => {
        await deleteTeam.mutateAsync({ id: teamId });
        await router.push("/teams");
    };

    const deleteWithConfirmation = async () => {
        if (confirm("Are you sure you want to delete this team?")) {
            await deleteThisTeam();
        }
    };

    return (
        <div className="p-5 m-5 rounded-md border-solid border-2 border-red-900">
            <div>
                <h2 className="text-xl">Danger Zone</h2>
            </div>
            <div className="flex my-2 mb-5">
                <div className="flex-grow">
                    <p>
                        Delete team, including team members and token.
                    </p>
                </div>
                <Button
                    className="ml-2 p-7 bg-red-500 text-white"
                    onClick={deleteWithConfirmation}
                >
                    Delete this team
                </Button>
            </div>
        </div>
    );
}

function TeamEditorSuspense() {
    const session = useSession();

    if (!session?.data?.user) {
        return <div>loading...</div>;
    }

    return (
        <div className="container">
            <TeamEditor/>
            <div className="my-10"></div>
            <GithubRepositoriesEditor/>
            <div className="my-10"></div>
            <AuthTokens/>
            <div className="my-10"></div>
            <SlackDaysOfWeekEditor/>
            <div className="p-5 m-5 rounded-md border-solid border-2 border-indigo-900">
                <h2 className="text-xl">Slack Report Test</h2>
                <SlackReportTest/>
            </div>
            <div className="my-10"></div>
            <DangerZone/>
        </div>
    );
}

export default function Team() {
    return (
        <Layout>
            <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
                <div className="container flex flex-col items-center justify-center pb-8 mt-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-center">
                        Team Settings
                    </h1>
                </div>

                <TeamEditorSuspense />
            </main>
        </Layout>
    );
}
