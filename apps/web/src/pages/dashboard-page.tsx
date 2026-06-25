import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getOrganizations } from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { ArrowRight, Building2, CheckCircle2, Layers3, Sparkles, Store } from "lucide-react";

import CreateOrganizationDialog from "@/components/organizations/create-organization-dialog";
import { formatDateTime } from "@/lib/format";
import { organizationKeys } from "@/lib/query-keys";
import { useAuthUser } from "@/store/auth.store";

const DashboardPage = () => {
    const authUser = useAuthUser();

    const organizationsQuery = useQuery({
        queryKey: organizationKeys.list(),
        queryFn: getOrganizations,
    });

    const organizations =
        organizationsQuery.data?.status === "success" ? organizationsQuery.data.data?.organizations ?? [] : [];
    const organizationCount = organizations.length;

    return (
        <div className="space-y-8">
            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5 backdrop-blur">
                    <CardContent className="relative p-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.14),_transparent_28%)]" />
                        <div className="relative grid gap-8 p-8 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-6">
                                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                    Workspace ready
                                </Badge>
                                <div className="space-y-3">
                                    <h2 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                                        Welcome back, {authUser?.firstName}.
                                    </h2>
                                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                                        Ganatri is set up as your retail command center. Start with organizations, branch out
                                        into stores, and keep device onboarding clean for every counter and cashier.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                    <CreateOrganizationDialog />
                                    <Button variant="outline" className="rounded-full" render={<Link to="/organizations" />}>
                                        Explore organizations
                                        <ArrowRight className="ml-2 size-4" />
                                    </Button>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    <div className="rounded-3xl border border-border/60 bg-background/80 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                            Organizations
                                        </p>
                                        <p className="mt-3 text-3xl font-semibold text-foreground">{organizationCount}</p>
                                    </div>
                                    <div className="rounded-3xl border border-border/60 bg-background/80 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                            Access mode
                                        </p>
                                        <p className="mt-3 text-lg font-semibold text-foreground">Phone-first auth</p>
                                    </div>
                                    <div className="rounded-3xl border border-border/60 bg-background/80 p-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                                            Session owner
                                        </p>
                                        <p className="mt-3 text-lg font-semibold text-foreground">{authUser?.phone}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[28px] border border-border/60 bg-slate-950 p-6 text-white shadow-xl shadow-black/20 dark:bg-slate-900">
                                <div className="flex items-center gap-2 text-amber-300">
                                    <Sparkles className="size-4" />
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em]">Setup momentum</p>
                                </div>
                                <div className="mt-5 space-y-4">
                                    {[
                                        {
                                            title: "Create your tenant root",
                                            description: "An organization becomes the top-level business workspace.",
                                            icon: Building2,
                                        },
                                        {
                                            title: "Add operating stores",
                                            description: "Model every branch, outlet, or warehouse cleanly.",
                                            icon: Store,
                                        },
                                        {
                                            title: "Assign cashier devices",
                                            description: "Use user-defined secrets and reveal them only when needed.",
                                            icon: Layers3,
                                        },
                                    ].map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                                                        <Icon className="size-4" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-white">{item.title}</p>
                                                        <p className="mt-1 text-sm leading-6 text-slate-300">{item.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5">
                    <CardHeader>
                        <CardTitle className="font-display text-2xl">Operating principles</CardTitle>
                        <CardDescription>
                            The new workspace is designed to feel like a polished SaaS back office instead of a basic CRUD
                            screen.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            "A persistent workspace shell with strong navigation and visual hierarchy.",
                            "Privacy-aware device secrets with hidden-by-default reveal flows.",
                            "Light and dark themes that stay readable without flattening the UI.",
                        ].map((item) => (
                            <div key={item} className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4">
                                <CheckCircle2 className="mt-0.5 size-4 text-emerald-500" />
                                <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-border/60 bg-card/80 shadow-lg shadow-black/5">
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div>
                            <CardTitle className="font-display text-2xl">Recent organizations</CardTitle>
                            <CardDescription>
                                Your latest top-level workspaces for stores and POS device rollout.
                            </CardDescription>
                        </div>
                        <Button variant="ghost" className="rounded-full" render={<Link to="/organizations" />}>
                            See all
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {organizationCount === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-border bg-background/60 p-8 text-center">
                                <p className="font-medium text-foreground">No organizations yet</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Create your first organization to unlock stores, device registration, and the rest of
                                    the workspace flow.
                                </p>
                                <div className="mt-5 flex justify-center">
                                    <CreateOrganizationDialog />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {organizations.slice(0, 4).map((organization, index) => (
                                    <Link
                                        key={organization.id}
                                        to={`/organizations/${organization.id}`}
                                        className="group flex items-center gap-4 rounded-[24px] border border-border/60 bg-background/70 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                                    >
                                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-emerald-500/15 text-primary">
                                            <span className="text-sm font-semibold">{String(index + 1).padStart(2, "0")}</span>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate font-medium text-foreground">{organization.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Created {formatDateTime(organization.createdAt)}
                                            </p>
                                        </div>
                                        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
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

export default DashboardPage;
