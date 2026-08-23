export const getOrgInitials = (name?: string) => {
    if (!name) return "OR";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

export const getOrgBgColor = (id?: string) => {
    if (!id) return "bg-primary/10 text-primary border-primary/20";
    const colors = [
        "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
};
