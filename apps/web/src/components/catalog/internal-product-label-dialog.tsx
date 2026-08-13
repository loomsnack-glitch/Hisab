import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getLabelTemplates } from "@repo/services";
import type { LabelTemplateDTO, ProductResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { Barcode, Printer, ScanLine } from "lucide-react";
import { toast } from "sonner";

import {
  buildInternalLabelPreview,
  canPrintInternalLabels,
  labelPrintConfirmationKey,
  printInternalLabelDocument,
  sheetLabelCapacity,
} from "@/lib/internal-label-printing";
import { catalogKeys } from "@/lib/query-keys";

type InternalProductLabelDialogProps = {
  organizationId: string;
  product: ProductResponseDTO;
  trigger?: React.ReactElement;
};

const InternalProductLabelDialog = ({
  organizationId,
  product,
  trigger,
}: InternalProductLabelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [copyCount, setCopyCount] = useState("1");
  const [startingPosition, setStartingPosition] = useState("1");
  const [includeProductName, setIncludeProductName] = useState(true);
  const [includeSellingPrice, setIncludeSellingPrice] = useState(false);
  const [testPrintedFor, setTestPrintedFor] = useState<string | null>(null);
  const [testScanConfirmed, setTestScanConfirmed] = useState(false);

  const templatesQuery = useQuery({
    queryKey: catalogKeys.labelTemplates(organizationId),
    queryFn: () => getLabelTemplates(organizationId),
    enabled: Boolean(organizationId) && open,
  });

  const activeTemplates = useMemo(() => {
    const templates =
      templatesQuery.data?.status === "success"
        ? templatesQuery.data.data?.labelTemplates ?? []
        : [];
    return templates.filter((template) => template.status === "active");
  }, [templatesQuery.data]);

  useEffect(() => {
    if (activeTemplates.length === 0) {
      setTemplateId("");
      return;
    }

    if (!activeTemplates.some((entry) => entry.id === templateId)) {
      setTemplateId(activeTemplates[0]?.id ?? "");
      setTestScanConfirmed(false);
    }
  }, [activeTemplates, templateId]);

  const productCode = product.productCode;
  const template = activeTemplates.find((entry) => entry.id === templateId) ?? null;
  const sheetCapacity = template ? sheetLabelCapacity(template) : 0;
  const isSheet = template?.stock.media === "sheet";
  const labelProduct = {
    productCode: productCode ?? "",
    name: includeProductName ? product.name : null,
    price: includeSellingPrice ? product.price : null,
  };
  const layoutSignature = template
    ? labelPrintConfirmationKey({
        templateId: template.id,
        includeProductName,
        includeSellingPrice,
      })
    : "";
  const testPrintedForCurrentLayout = testPrintedFor === layoutSignature;
  const parsedCopyCount = Number(copyCount);
  const parsedStartingPosition = Number(startingPosition);
  const validCopyCount =
    Number.isInteger(parsedCopyCount) &&
    parsedCopyCount >= 1 &&
    parsedCopyCount <= 1_000;
  const validStartingPosition =
    !isSheet ||
    (Number.isInteger(parsedStartingPosition) &&
      parsedStartingPosition >= 1 &&
      parsedStartingPosition <= sheetCapacity);
  const preview = template
    ? buildInternalLabelPreview({
        template,
        product: labelProduct,
      })
    : null;
  const printAllowed =
    Boolean(template) &&
    validCopyCount &&
    validStartingPosition &&
    canPrintInternalLabels({
      testPrinted: testPrintedForCurrentLayout,
      testScanConfirmed,
    });

  if (product.productCodeKind !== "internal_rcn" || !productCode) {
    return null;
  }

  const printInput = (nextCopyCount: number) => {
    if (!template) {
      return null;
    }
    return {
      template,
      product: labelProduct,
      job: {
        copyCount: nextCopyCount,
        ...(isSheet ? { startingPosition: parsedStartingPosition } : {}),
      },
    };
  };

  const handleTestPrint = () => {
    if (!validStartingPosition) {
      toast.error(
        `Choose an A4 starting position from 1 to ${sheetCapacity}`,
      );
      return;
    }

    const input = printInput(1);
    if (!input || !printInternalLabelDocument(input)) {
      toast.error("Unable to open the browser print dialog");
      return;
    }

    setTestPrintedFor(layoutSignature);
    setTestScanConfirmed(false);
    toast.success(
      "Test label opened. Scan the printed label before bulk printing.",
    );
  };

  const handlePrint = () => {
    if (!printAllowed) {
      return;
    }

    const input = printInput(parsedCopyCount);
    if (!input || !printInternalLabelDocument(input)) {
      toast.error("Unable to open the browser print dialog");
      return;
    }

    toast.success(
      `${parsedCopyCount} internal label${parsedCopyCount === 1 ? "" : "s"} opened for printing.`,
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger
        render={
          trigger ?? (
            <Button type="button" size="sm" variant="outline">
              <Barcode className="size-4" />
              Print labels
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader
          icon={<Barcode className="size-5" />}
          title="Print store-only labels"
          subtitle="The barcode always encodes only this exact Internal Product Code. Product text never changes scan identity."
        />

        <div className="grid gap-5 pt-2 md:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
              <p className="text-xs text-muted-foreground">
                Internal Product Code
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-foreground">
                {productCode}
              </p>
            </div>

            {templatesQuery.isPending ? (
              <div className="flex min-h-24 items-center justify-center">
                <Spinner className="size-5 text-primary" />
              </div>
            ) : activeTemplates.length === 0 ? (
              <p className="rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                No active Label Templates are available. Add or reactivate one in Label Templates.
              </p>
            ) : (
              <label className="block space-y-1.5 text-sm font-medium">
                Label Template
                <select
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  value={template?.id ?? ""}
                  onChange={(event) => {
                    setTemplateId(event.target.value);
                    setTestScanConfirmed(false);
                  }}
                >
                  {activeTemplates.map((entry: LabelTemplateDTO) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1.5 text-sm font-medium">
                Copy count
                <Input
                  type="number"
                  min={1}
                  max={1_000}
                  value={copyCount}
                  onChange={(event) => setCopyCount(event.target.value)}
                />
              </label>
              {isSheet ? (
                <label className="block space-y-1.5 text-sm font-medium">
                  A4 starting position
                  <Input
                    type="number"
                    min={1}
                    max={sheetCapacity}
                    value={startingPosition}
                    onChange={(event) =>
                      setStartingPosition(event.target.value)
                    }
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    1–{sheetCapacity}; use this for partially used sheets.
                  </span>
                </label>
              ) : null}
            </div>

            <div className="space-y-2 rounded-xl border border-border/60 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeProductName}
                  onChange={(event) => {
                    setIncludeProductName(event.target.checked);
                    setTestScanConfirmed(false);
                  }}
                />
                Show Product name
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={includeSellingPrice}
                  onChange={(event) => {
                    setIncludeSellingPrice(event.target.checked);
                    setTestScanConfirmed(false);
                  }}
                />
                Show selling price ({preview?.textBelowBarcode ?? "optional"})
              </label>
              {preview?.sellingPriceWarning ? (
                <p className="rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs text-amber-800 dark:text-amber-300">
                  {preview.sellingPriceWarning}
                </p>
              ) : null}
            </div>

            <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="flex items-start gap-2">
                <ScanLine className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Hardware validation required
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Automated checks verify the renderer, but only a real
                    scanner on production-like printer and label stock validates
                    this label.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestPrint}
                disabled={!template}
              >
                <Printer className="size-4" />
                Test print one label
              </Button>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={testScanConfirmed}
                  disabled={!testPrintedForCurrentLayout}
                  onChange={(event) =>
                    setTestScanConfirmed(event.target.checked)
                  }
                />
                <span>
                  I scanned the test label successfully using production-like
                  hardware and label stock.
                </span>
              </label>
              {!testPrintedForCurrentLayout ? (
                <p className="text-xs text-muted-foreground">
                  Test print this Label Template after changing template or printed text.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            {preview ? (
              <div
                className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm"
                dangerouslySetInnerHTML={{ __html: preview.svg }}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-3 py-10 text-center text-xs text-muted-foreground">
                Choose a Label Template to preview this Product.
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Black bars on white with the required EAN-13 quiet zones.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Close
          </Button>
          <Button type="button" disabled={!printAllowed} onClick={handlePrint}>
            <Printer className="size-4" />
            Print labels
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InternalProductLabelDialog;
