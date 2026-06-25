import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowRight, Building2, PlusCircle, Sparkles } from "lucide-react";

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
        <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardContent className="relative p-8">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.12),_transparent_30%)]" />
                        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                            <div className="max-w-2xl space-y-4">
                                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                    Tenant builder
                                </Badge>
                                <div>
                                    <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                                        Organizations are your control centers.
                                    </h2>
                                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                                        Use them to model separate business entities, then scale each one into stores,
                                        device access, and future operational modules.
                                    </p>
                                </div>
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

                <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                    <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5">
                        <CardContent className="p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                Total organizations
                            </p>
                            <p className="mt-3 text-3xl font-semibold text-foreground">{organizations.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5">
                        <CardContent className="p-5">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                Workspace style
                            </p>
                            <p className="mt-3 text-lg font-semibold text-foreground">Modern SaaS shell</p>
                        </CardContent>
                    </Card>
                    <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5">
                        <CardContent className="p-5">
                            <div className="flex items-center gap-2 text-primary">
                                <Sparkles className="size-4" />
                                <p className="text-xs font-semibold uppercase tracking-[0.24em]">Focus</p>
                            </div>
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                                Strong information hierarchy, cleaner flows, and safer device-secret visibility.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            <section>
                <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <CardTitle className="font-display text-2xl">All organizations</CardTitle>
                            <CardDescription>
                                Choose one to drill into its stores, devices, and onboarding status.
                            </CardDescription>
                        </div>
                        <CreateOrganizationDialog
                            trigger={
                                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                                    <PlusCircle className="mr-2 size-4" />
                                    New organization
                                </Button>
                            }
                        />
                    </CardHeader>
                    <CardContent>
                        {organizationsQuery.isPending ? (
                            <div className="flex items-center justify-center py-16">
                                <Spinner className="size-6 text-primary" />
                            </div>
                        ) : organizationsQuery.isError || organizationsQuery.data?.status === "error" ? (
                            <Empty className="rounded-[28px] border border-dashed border-red-300/50 bg-red-500/5">
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
                            <Empty className="rounded-[28px] border border-dashed border-border bg-background/60">
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
                                        className="group rounded-[28px] border border-border/60 bg-background/80 p-5 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-amber-400/20 text-primary">
                                                <span className="text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span>
                                            </div>
                                            <Badge variant="outline" className="rounded-full">
                                                Workspace
                                            </Badge>
                                        </div>

                                        <div className="mt-5">
                                            <p className="text-xl font-semibold text-foreground">{organization.name}</p>
                                            <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                Created {formatDateTime(organization.createdAt)}
                                            </p>
                                        </div>

                                        <div className="mt-6 flex items-center justify-between">
                                            <span className="text-sm font-medium text-primary">Open workspace</span>
                                            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </section>
        </div>
    );
};

export default OrganizationsPage;
