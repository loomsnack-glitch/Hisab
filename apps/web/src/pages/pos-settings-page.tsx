import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";

import PosDeviceSidebar from "@/components/pos/pos-device-sidebar";
import AppearanceSettingsSection from "@/components/settings/appearance-settings-section";

const PosSettingsPage = () => {
    return (
        <div className="flex min-h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] flex-col max-lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px)-var(--pos-mobile-nav-height,0px))] lg:h-[calc(100dvh-var(--pos-header-height,3.5rem)-env(safe-area-inset-top,0px))] lg:min-h-0 lg:overflow-hidden lg:flex-row">
            <PosDeviceSidebar activeSettings />

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
                    <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardContent className="relative p-6 sm:p-8">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.1),_transparent_28%)]" />
                            <div className="relative max-w-xl space-y-2">
                                <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                                    Preferences
                                </Badge>
                                <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                                    Settings
                                </h2>
                                <p className="text-sm leading-relaxed text-muted-foreground">
                                    Customize how Ganatri POS looks and feels on this device.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <AppearanceSettingsSection />
                </div>
            </div>
        </div>
    );
};

export default PosSettingsPage;
