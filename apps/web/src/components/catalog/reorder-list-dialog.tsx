import {
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { ArrowDown, ArrowUp, GripVertical, ListOrdered } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";

export type ReorderListItem = {
  id: string;
  name: string;
  description?: string;
  leading?: ReactNode;
};

type ReorderResponse = {
  status: "success" | "error";
  message: string;
};

type ReorderListDialogProps = {
  title: string;
  description: string;
  items: readonly ReorderListItem[];
  onSave: (orderedIds: string[]) => Promise<ReorderResponse>;
  trigger: ReactElement;
};

const sameOrder = (
  left: readonly ReorderListItem[],
  right: readonly ReorderListItem[],
) =>
  left.length === right.length &&
  left.every((item, index) => item.id === right[index]?.id);

const ReorderListDialog = ({
  title,
  description,
  items,
  onSave,
  trigger,
}: ReorderListDialogProps) => {
  const [open, setOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState<ReorderListItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setOrderedItems([...items]);
    }
  }, [items, open]);

  const hasChanges = useMemo(
    () => !sameOrder(orderedItems, items),
    [items, orderedItems],
  );

  const moveItem = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= orderedItems.length) return;

    setOrderedItems((current) => {
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const moveDraggedItem = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setOrderedItems((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) return current;
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      const response = await onSave(orderedItems.map((item) => item.id));
      if (response.status === "success") {
        toast.success(response.message);
        setOpen(false);
        return;
      }
      toast.error(response.message);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save the order",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
      <DialogTrigger render={trigger} />
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border/60 px-5 pb-4 pt-5 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <ListOrdered className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          <p className="mb-3 text-xs text-muted-foreground">
            The first item appears first in the POS. Use the arrows to set the
            order.
          </p>
          <div className="space-y-2" role="list" aria-label={title}>
            {orderedItems.map((item, index) => (
              <div
                key={item.id}
                role="listitem"
                draggable={!isSaving}
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedIndex !== null)
                    moveDraggedItem(draggedIndex, index);
                  setDraggedIndex(null);
                }}
                onDragEnd={() => setDraggedIndex(null)}
                className="flex cursor-grab items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2.5 shadow-xs active:cursor-grabbing"
              >
                <GripVertical
                  className="size-4 shrink-0 text-muted-foreground/60"
                  aria-hidden="true"
                />
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                {item.leading}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  {item.description && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  )}
                </span>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    disabled={index === 0 || isSaving}
                    onClick={() => moveItem(index, -1)}
                    aria-label={`Move ${item.name} up`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg"
                    disabled={index === orderedItems.length - 1 || isSaving}
                    onClick={() => moveItem(index, 1)}
                    aria-label={`Move ${item.name} down`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 px-5 pb-5 pt-3 sm:px-6 sm:pb-6">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-full"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
          >
            {isSaving ? "Saving..." : "Save order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReorderListDialog;
