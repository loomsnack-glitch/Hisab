import { useState } from "react";
import { BarChart3, Building2, LogOut, ShieldCheck, Users } from "lucide-react";
import type { OwnerUserDTO, PlatformDashboardQueryJSON } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";

import OwnerUsersPage, { type OwnerUsersPageProps } from "@/components/owner-users-page";
import PlatformDashboardPage, { type PlatformDashboardPageProps } from "@/components/platform-dashboard-page";
import PlatformOrganizationsPage, { type PlatformOrganizationsPageProps } from "@/components/platform-organizations-page";

const destinations = [
    { title: "Dashboard", description: "Platform adoption totals and reporting periods", icon: BarChart3 },
    { title: "Organizations", description: "Cross-organization adoption health", icon: Building2 },
    { title: "Owner Users", description: "Internal access administration", icon: Users },
] as const;

type ConsoleEntryProps = {
    ownerUser: OwnerUserDTO;
    onLogout: () => Promise<void>;
    ownerUsersPageProps?: Pick<OwnerUsersPageProps, "listOwnerUsers" | "createOwnerUser" | "setOwnerUserActiveState">;
    dashboardPageProps?: Pick<PlatformDashboardPageProps, "getPlatformDashboard" | "initialQuery" | "initialCustomValues">;
    organizationsPageProps?: Pick<
        PlatformOrganizationsPageProps,
        "getPlatformOrganizations" | "getPlatformOrganization" | "initialSearch" | "initialActivity"
    >;
};

const ConsoleEntry = ({ ownerUser, onLogout, ownerUsersPageProps, dashboardPageProps, organizationsPageProps }: ConsoleEntryProps) => {
    const [destination, setDestination] = useState<"home" | "owner-users" | "dashboard" | "organizations">("home");
    const [reportingQuery, setReportingQuery] = useState<PlatformDashboardQueryJSON>(
        dashboardPageProps?.initialQuery ?? { period: "all-time" },
    );
    const [customValues, setCustomValues] = useState(
        dashboardPageProps?.initialCustomValues ?? { startDate: "", endDate: "" },
    );

    return (
        <main className="min-h-screen bg-slate-100 text-slate-950">
            <header className="border-b bg-slate-950 text-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300">Ganatri internal</p>
                        <p className="text-lg font-semibold">Platform Operations Console</p>
                    </div>
                    <Button variant="outline" className="border-slate-600 bg-transparent text-white hover:bg-slate-800 hover:text-white" onClick={() => void onLogout()}>
                        <LogOut className="size-4" /> Sign out
                    </Button>
                </div>
            </header>
            <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
                {destination === "owner-users" ? (
                    <OwnerUsersPage currentOwnerUser={ownerUser} onBack={() => setDestination("home")} {...ownerUsersPageProps} />
                ) : destination === "dashboard" ? (
                    <PlatformDashboardPage
                        onBack={() => setDestination("home")}
                        {...dashboardPageProps}
                        initialQuery={reportingQuery}
                        initialCustomValues={customValues}
                        onReportingPeriodChange={(query, nextCustomValues) => {
                            setReportingQuery(query);
                            setCustomValues(nextCustomValues);
                        }}
                    />
                ) : destination === "organizations" ? (
                    <PlatformOrganizationsPage
                        onBack={() => setDestination("home")}
                        reportingQuery={reportingQuery}
                        {...organizationsPageProps}
                    />
                ) : (
                    <>
                        <section className="space-y-2">
                            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100"><ShieldCheck className="size-3" /> Active Owner User</Badge>
                            <h1 className="text-3xl font-semibold tracking-tight">Welcome, {ownerUser.firstName}</h1>
                            <p className="text-slate-600">Your isolated owner session is active. Choose a console destination.</p>
                        </section>
                        <section className="grid gap-4 md:grid-cols-3" aria-label="Console destinations">
                            {destinations.map(({ title, description, icon: Icon }) => (
                                <Card key={title}>
                                    <CardHeader>
                                        <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><Icon className="size-5" /></div>
                                        <CardTitle>{title}</CardTitle>
                                        <CardDescription>{description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {title === "Owner Users" ? (
                                            <Button type="button" onClick={() => setDestination("owner-users")}>Open Owner Users</Button>
                                        ) : title === "Dashboard" ? (
                                            <Button type="button" onClick={() => setDestination("dashboard")}>Open Dashboard</Button>
                                        ) : (
                                            <Button type="button" onClick={() => setDestination("organizations")}>Open Organizations</Button>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </section>
                    </>
                )}
            </div>
        </main>
    );
};

export default ConsoleEntry;
