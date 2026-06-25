import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowRight, Building2, CalendarDays } from "lucide-react";

import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
import { formatDateTime } from "@/lib/format";
import { organizationKeys } from "@/lib/query-keys";

const OrganizationsPage = () => {
    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations =
        organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : [];

    return (
        <div className="space-y-6">
            {/* Hero — compact with clear CTA */}
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="relative p-6 sm:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_30%)]" />
                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="max-w-xl space-y-2">
                            <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                Tenant builder
                            </Badge>
                            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                Organizations
                            </h2>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                Model separate business entities, then scale each into stores, devices, and operational
                                modules.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <CreateOrganizationDialog />
                            <Button variant="outline" className="rounded-full" render={<Link to="/dashboard" />}>
                                Back to dashboard
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Organizations list */}
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">
                        All organizations
                        {organizations.length > 0 && (
                            <span className="ml-2 text-lg font-normal text-muted-foreground">
                                ({organizations.length})
                            </span>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Choose one to drill into its stores, devices, and onboarding status.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {organizationsQuery.isPending ? (
                        <div className="flex items-center justify-center py-16">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : organizationsQuery.isError || organizationsQuery.data?.status === "error" ? (
                        <Empty className="rounded-2xl border border-dashed border-red-300/50 bg-red-500/5">
                            <EmptyHeader>
                                <EmptyTitle>Failed to load organizations</EmptyTitle>
                                <EmptyDescription>
                                    {(organizationsQuery.error as { message?: string })?.message ??
                                        organizationsQuery.data?.message ??
                                        "Something went wrong while loading your workspace."}
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="outline" className="rounded-full" onClick={() => organizationsQuery.refetch()}>
                                    Try again
                                </Button>
                            </EmptyContent>
                        </Empty>
                    ) : organizations.length === 0 ? (
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Building2 />
                                </EmptyMedia>
                                <EmptyTitle>No organizations yet</EmptyTitle>
                                <EmptyDescription>
                                    Start with a top-level organization, then branch into stores and device setup from
                                    there.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <CreateOrganizationDialog />
                            </EmptyContent>
                        </Empty>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                            {organizations.map((organization, index) => (
                                <Link
                                    key={organization.id}
                                    to={`/organizations/${organization.id}`}
                                    className="group rounded-2xl border border-border/60 bg-background/80 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-amber-400/20 text-primary">
                                            <span className="text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-lg font-semibold text-foreground">{organization.name}</p>
                                            <div className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                                                <CalendarDays className="size-3.5 shrink-0" />
                                                <span>{formatDateTime(organization.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4">
                                        <span className="text-sm font-medium text-primary">Open workspace</span>
                                        <ArrowRight className="size-4 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OrganizationsPage;
