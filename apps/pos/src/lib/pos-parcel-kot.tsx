import { Button } from "@repo/ui/components/button";

export const isParcelKotActionVisible = ({
  isDeviceMode,
  kotSystemEnabled,
  isReplacingSale,
}: {
  isDeviceMode: boolean;
  kotSystemEnabled: boolean;
  isReplacingSale: boolean;
}) => isDeviceMode && kotSystemEnabled && !isReplacingSale;

type PosParcelKotActionProps = {
  available: boolean;
  disabled: boolean;
  isPending: boolean;
  onGenerate: () => void;
};

export const PosParcelKotAction = ({
  available,
  disabled,
  isPending,
  onGenerate,
}: PosParcelKotActionProps) => {
  if (!available) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="secondary"
      className="h-9 w-full rounded-lg text-xs font-semibold"
      disabled={disabled}
      onClick={onGenerate}
      data-testid="parcel-kot-action"
    >
      {isPending ? "Generating..." : "Parcel KOT"}
    </Button>
  );
};
