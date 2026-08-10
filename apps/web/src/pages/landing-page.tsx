import { ArrowRight, Check, LayoutDashboard, MessageCircle, Phone, Store } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@repo/assets/logo.png";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";

import ThemeToggle from "@/components/dashboard/theme-toggle";

const supportContacts = [
    {
        name: "Dev Jariwala",
        phone: "+91 79901 76865",
        href: "tel:+917990176865",
    },
    {
        name: "Himank Khaptawala",
        phone: "+91 95379 53709",
        href: "tel:+919537953709",
    },
] as const;

const highlights = [
    "Manage products, categories, and add-ons",
    "Keep stores and POS devices organized",
    "Bill customers with a clear daily workflow",
] as const;

const LandingPage = () => {
    return (
        <main className="relative min-h-[100dvh] overflow-hidden bg-background">
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -left-32 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
                <div className="grid-bg absolute inset-0 opacity-20 dark:opacity-10" />
            </div>

            <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <Link to="/" className="flex items-center gap-2.5" aria-label="Ganatri home">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
                        <img src={logo} alt="Ganatri" className="size-6 object-contain brightness-0 invert" />
                    </div>
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary">Loomsnack</p>
                        <p className="font-display text-lg font-bold tracking-tight text-foreground">Ganatri</p>
                    </div>
                </Link>

                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <Button variant="outline" className="hidden rounded-xl sm:inline-flex" render={<Link to="/login" />}>
                        Login
                    </Button>
                    <Button className="rounded-xl" render={<Link to="/register" />}>
                        Get started
                    </Button>
                </div>
            </nav>

            <div className="mx-auto w-full max-w-6xl px-4 pb-5 pt-5 sm:px-6 sm:pb-8 sm:pt-8 lg:px-8 lg:pb-10 lg:pt-10">
                <section className="grid items-center gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
                    <div className="max-w-2xl">
                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/5 px-3 py-1 text-primary">
                            Simple store management
                        </Badge>
                        <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                            Run your store with clarity.
                        </h1>
                        <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                            Ganatri brings your products, stores, POS devices, and billing workflow together in one simple workspace.
                        </p>

                        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                            <Button size="lg" className="h-11 rounded-xl px-5" render={<Link to="/register" />}>
                                Create your account
                                <ArrowRight className="size-4" />
                            </Button>
                            <p className="text-sm text-muted-foreground">
                                Already have an account?{" "}
                                <Link to="/login" className="font-semibold text-primary hover:underline">
                                    Login
                                </Link>
                            </p>
                        </div>

                        <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                            {highlights.map((highlight) => (
                                <div key={highlight} className="flex items-start gap-2">
                                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Check className="size-3" />
                                    </span>
                                    <span>{highlight}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Card className="relative overflow-hidden border-primary/15 bg-card/80 shadow-xl shadow-primary/5 backdrop-blur-sm">
                        <div className="absolute -right-16 -top-16 size-44 rounded-full bg-primary/10 blur-2xl" />
                        <CardHeader className="relative border-b border-border/60 px-5 py-4 sm:px-6">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary">Your workspace</p>
                                    <CardTitle className="mt-1 text-xl">Everything in one place</CardTitle>
                                </div>
                                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                    <LayoutDashboard className="size-5" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="relative grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                                <Store className="size-5 text-primary" />
                                <p className="mt-4 font-semibold text-foreground">Stores & devices</p>
                                <p className="mt-1 text-sm leading-5 text-muted-foreground">Set up branches and connect cashier devices.</p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                                <LayoutDashboard className="size-5 text-primary" />
                                <p className="mt-4 font-semibold text-foreground">Products & billing</p>
                                <p className="mt-1 text-sm leading-5 text-muted-foreground">Keep your catalog ready for daily sales.</p>
                            </div>
                            <div className="border-t border-border/60 pt-3 text-sm text-muted-foreground sm:col-span-2">
                                Start with your account and build your workspace as you grow.
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section id="support" className="mt-10 border-t border-border/60 pt-6 sm:mt-12 sm:pt-8">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Need help?</p>
                            <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Talk to our support team</h2>
                            <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">Call either contact below for help with your Ganatri setup.</p>
                        </div>
                        <MessageCircle className="hidden size-8 text-primary/50 sm:block" />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        {supportContacts.map((contact) => (
                            <Card key={contact.phone} className="border-border/70 bg-card/80">
                                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-semibold text-foreground">{contact.name}</p>
                                        <a href={contact.href} className="mt-1 inline-block text-sm text-muted-foreground transition-colors hover:text-primary">
                                            {contact.phone}
                                        </a>
                                    </div>
                                    <Button size="sm" variant="outline" className="w-full rounded-xl sm:w-auto" render={<a href={contact.href} aria-label={`Call ${contact.name}`} />}>
                                        <Phone className="size-4" />
                                        Call now
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <footer className="mt-5 flex flex-col gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>© {new Date().getFullYear()} Ganatri by Loomsnack</p>
                    <p>Built for simple, everyday retail operations.</p>
                </footer>
            </div>
        </main>
    );
};

export default LandingPage;
