import { useState } from "react";
import type { ProductResponseDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Barcode, Printer, ScanLine } from "lucide-react";
import { toast } from "sonner";

import {
  A4_LABEL_CAPACITY,
  buildInternalLabelPreview,
  canPrintInternalLabels,
  printInternalLabelDocument,
  type InternalLabelLayout,
} from "@/lib/internal-label-printing";

type InternalProductLabelDialogProps = {
  product: ProductResponseDTO;
  trigger?: React.ReactElement;
};

const InternalProductLabelDialog = ({
  product,
  trigger,
}: InternalProductLabelDialogProps) => {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<InternalLabelLayout>("a4");
  const [copyCount, setCopyCount] = useState("1");
  const [startingPosition, setStartingPosition] = useState("1");
  const [includeProductName, setIncludeProductName] = useState(true);
  const [includeSellingPrice, setIncludeSellingPrice] = useState(false);
  const [testPrintedFor, setTestPrintedFor] = useState<string | null>(null);
  const [testScanConfirmed, setTestScanConfirmed] = useState(false);

  const productCode = product.productCode;
  const labelInput = {
    productCode: productCode ?? "",
    productName: product.name,
    sellingPrice: product.price,
    includeProductName,
    includeSellingPrice,
  };
  const layoutSignature = `${layout}:${includeProductName}:${includeSellingPrice}`;
  const testPrintedForCurrentLayout = testPrintedFor === layoutSignature;
  const parsedCopyCount = Number(copyCount);
  const parsedStartingPosition = Number(startingPosition);
  const validCopyCount =
    Number.isInteger(parsedCopyCount) &&
    parsedCopyCount >= 1 &&
    parsedCopyCount <= 1_000;
  const validStartingPosition =
    layout !== "a4" ||
    (Number.isInteger(parsedStartingPosition) &&
      parsedStartingPosition >= 1 &&
      parsedStartingPosition <= A4_LABEL_CAPACITY);
  const preview = buildInternalLabelPreview(labelInput);
  const printAllowed =
    validCopyCount &&
    validStartingPosition &&
    canPrintInternalLabels({
      testPrinted: testPrintedForCurrentLayout,
      testScanConfirmed,
    });

  if (product.productCodeKind !== "internal_rcn" || !productCode) {
    return null;
  }

  const printInput = (nextCopyCount: number) => ({
    layout,
    copyCount: nextCopyCount,
    ...(layout === "a4" ? { startingPosition: parsedStartingPosition } : {}),
    label: labelInput,
  });

  const handleTestPrint = () => {
    if (!validStartingPosition) {
      toast.error(
        `Choose an A4 starting position from 1 to ${A4_LABEL_CAPACITY}`,
      );
      return;
    }

    const printed = printInternalLabelDocument(printInput(1));
    if (!printed) {
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

    if (!printInternalLabelDocument(printInput(parsedCopyCount))) {
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

            <label className="block space-y-1.5 text-sm font-medium">
              Label layout
              <select
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={layout}
                onChange={(event) => {
                  setLayout(event.target.value as InternalLabelLayout);
                  setTestScanConfirmed(false);
                }}
              >
                <option value="a4">A4 sheet (3 × 8 labels)</option>
                <option value="thermal">Thermal label (58 × 40 mm)</option>
              </select>
            </label>

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
              {layout === "a4" ? (
                <label className="block space-y-1.5 text-sm font-medium">
                  A4 starting position
                  <Input
                    type="number"
                    min={1}
                    max={A4_LABEL_CAPACITY}
                    value={startingPosition}
                    onChange={(event) =>
                      setStartingPosition(event.target.value)
                    }
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    1–{A4_LABEL_CAPACITY}; use this for partially used sheets.
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
                Show selling price ({preview.textBelowBarcode ?? "optional"})
              </label>
              {preview.sellingPriceWarning ? (
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
                  Test print this layout after changing layout or printed text.
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Preview</p>
            <div
              className="overflow-hidden rounded-xl border border-border/60 bg-white shadow-sm"
              dangerouslySetInnerHTML={{ __html: preview.svg }}
            />
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
