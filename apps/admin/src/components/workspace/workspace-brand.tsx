import logo from "@repo/assets/logo.png";

import AppVersionBadge from "@/components/app-version-badge";

export type Workspace = "admin" | "pos";

type WorkspaceBrandProps = {
  workspace: Workspace;
  showLabel?: boolean;
};

const workspaceTitles: Record<Workspace, string> = {
  admin: "Ganatri Admin",
  pos: "Ganatri POS",
};

const WorkspaceBrand = ({
  workspace,
  showLabel = true,
}: WorkspaceBrandProps) => {
  return (
    <>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm shadow-primary/20">
        <img
          src={logo}
          alt="Ganatri"
          className="h-5 w-5 object-contain brightness-0 invert"
        />
      </div>
      {showLabel ? (
        <div className="min-w-0 flex flex-col justify-center">
          <div className="flex min-w-0 items-center gap-1">
            <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-primary leading-tight">
              Loomsnack
            </p>
            <AppVersionBadge className="shrink-0 border-0 bg-transparent p-0 text-[9px] uppercase tracking-[0.12em]" />
          </div>
          <p className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground leading-tight mt-0.5">
            {workspaceTitles[workspace]}
          </p>
        </div>
      ) : null}
    </>
  );
};

export default WorkspaceBrand;
