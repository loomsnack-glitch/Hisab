// =============================================================
// Clean, type-safe reusable OptionSelect component
// =============================================================

import * as React from 'react';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@repo/ui/components/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@repo/ui/components/command';
import { Popover, PopoverContent, PopoverTrigger } from '@repo/ui/components/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@repo/ui/components/dropdown-menu';
import { cn } from '@repo/ui/lib/utils';

export interface OptionSelectItem<T = unknown> {
    value: T;
    label: React.ReactNode;
    description?: React.ReactNode;
    color?: string; // accent color (optional)
    className?: string; // extra style classes for badges
    group?: string; // group label (optional)
    disabled?: boolean;
    actions?: { label: string; onAction: (option: OptionSelectItem<T>) => void | Promise<void> }[];
    style?: React.CSSProperties; // additional styles for the option
}

export interface OptionSelectProps<T = unknown> {
    value?: T;
    onChange?: (value: T) => void;
    options: OptionSelectItem<T>[];
    placeholder?: string;
    searchPlaceholder?: string;
    emptyMessage?: string;
    disabled?: boolean;
    isLoading?: boolean;
    detailedStyle?: boolean; // add colored dot / border accents
    maxShortcuts?: number; // maximum numeric shortcuts (1..n)
    closeOnSelect?: boolean;
}

const OptionBadge = <T,>({ option, active }: { option: OptionSelectItem<T>; active?: boolean }) => (
    <div className="flex items-center gap-2 whitespace-nowrap">
        <span className={cn(active && 'font-semibold')}>{option.label}</span>
    </div>
);

function useGroupedOptions<T>(options: OptionSelectItem<T>[]) {
    return React.useMemo(() => {
        const groupsMap: Record<string, OptionSelectItem<T>[]> = {};
        options.forEach(o => {
            if (o.group) {
                if (!groupsMap[o.group]) groupsMap[o.group] = [];
                groupsMap[o.group].push(o);
            }
        });
        const keys = Object.keys(groupsMap);
        if (!keys.length) return { isGrouped: false, groups: options as OptionSelectItem<T>[] } as const;
        return { isGrouped: true, groups: keys.map(k => ({ group: k, options: groupsMap[k] })) } as const;
    }, [options]);
}

export function OptionSelect<T = unknown>(props: OptionSelectProps<T>) {
    const {
        value,
        onChange,
        options,
        placeholder = 'Select option...',
        searchPlaceholder = 'Search...',
        emptyMessage = 'No option found.',
        disabled,
        isLoading,
        detailedStyle = false,
        maxShortcuts = Math.min(9, options.length),
        closeOnSelect = true,
    } = props;

    const [open, setOpen] = React.useState(false);
    const { isGrouped, groups } = useGroupedOptions(options);
    const selectedOption = options.find(o => o.value === value);

    const enabledOptions = React.useMemo(() => options.filter(o => !o.disabled).slice(0, maxShortcuts), [options, maxShortcuts]);
    const ordering = React.useMemo(() => {
        const map: Record<string, number> = {};
        enabledOptions.forEach((o, i) => (map[String(o.value)] = i + 1));
        return map;
    }, [enabledOptions]);

    React.useEffect(() => {
        const handle = (e: KeyboardEvent) => {
            if (!open) return;
            if (/^[1-9]$/.test(e.key)) {
                const idx = parseInt(e.key, 10) - 1;
                const target = enabledOptions[idx];
                if (target) {
                    e.preventDefault();
                    onChange?.(target.value);
                    if (closeOnSelect) setOpen(false);
                }
            }
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('keydown', handle);
        return () => document.removeEventListener('keydown', handle);
    }, [open, enabledOptions, onChange, closeOnSelect]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger disabled={!!disabled} className={cn(disabled && 'disabled:opacity-100')}
                render={
                    <Button
                        // ref={buttonRef}
                        variant={detailedStyle ? 'outline' : 'ghost'}
                        role="combobox"
                        aria-expanded={open}
                        aria-label={placeholder}
                        className={cn(
                            'font-normal rounded-xl px-2 py-1 gap-0.5 relative bg-muted-foreground/10 hover:bg-muted-foreground/20',
                            selectedOption?.className,
                            detailedStyle && 'border border-input hover:border-primary bg-background text-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                        isLoading={isLoading}
                        size="sm"
                        style={{
                            borderColor: detailedStyle ? selectedOption?.color : undefined,
                            color: detailedStyle ? selectedOption?.color : undefined,
                            ...selectedOption?.style,
                        }}
                    >
                        {detailedStyle && (
                            <span
                                className={cn('size-2 rounded-full mr-2', selectedOption?.className)}
                                style={{ outline: '4px solid', outlineColor: selectedOption?.color, ...selectedOption?.style }}
                            />
                        )}
                        {selectedOption ? <OptionBadge option={selectedOption} active /> : placeholder}
                        {!disabled && <ChevronDown className="size-4 shrink-0 fill-current" strokeWidth={0} />}
                    </Button>
                }
            />
            <PopoverContent className="w-48 p-0" align="start" sideOffset={5}>
                <Command>
                    <CommandInput placeholder={searchPlaceholder} className="border-none focus:ring-0" />
                    <CommandList>
                        <CommandEmpty>{emptyMessage}</CommandEmpty>
                        {isGrouped ? (
                            (groups as { group: string; options: OptionSelectItem<T>[] }[]).map((g, gi) => (
                                <React.Fragment key={g.group}>
                                    {gi > 0 && <CommandSeparator />}
                                    <CommandGroup heading={g.group} className="[&_[cmdk-group-heading]]:py-0.5">
                                        {g.options.map(option => (
                                            <OptionRow
                                                key={String(option.value)}
                                                option={option}
                                                active={value === option.value}
                                                shortcut={ordering[String(option.value)]}
                                                onSelect={() => {
                                                    onChange?.(option.value);
                                                    if (closeOnSelect) setOpen(false);
                                                }}
                                                closePopover={() => setOpen(false)}
                                            />
                                        ))}
                                    </CommandGroup>
                                </React.Fragment>
                            ))
                        ) : (
                            <CommandGroup>
                                {(groups as OptionSelectItem<T>[]).map(option => (
                                    <OptionRow
                                        key={String(option.value)}
                                        option={option}
                                        active={value === option.value}
                                        shortcut={ordering[String(option.value)]}
                                        onSelect={() => {
                                            onChange?.(option.value);
                                            if (closeOnSelect) setOpen(false);
                                        }}
                                        closePopover={() => setOpen(false)}
                                    />
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

interface OptionRowProps<T> {
    option: OptionSelectItem<T>;
    active: boolean;
    shortcut?: number;
    onSelect: () => void;
    closePopover: () => void;
}

function OptionRow<T>({ option, active, shortcut, onSelect, closePopover }: OptionRowProps<T>) {
    const showActions = !!option.actions?.length;
    return (
        <CommandItem
            value={String(option.value)}
            onSelect={onSelect}
            disabled={option.disabled}
            className={cn('flex text-xs lg:text-sm items-center gap-2 px-2 py-2 cursor-pointer', active && 'bg-accent')}
        >
            <div className="flex items-center gap-2 flex-1">
                <div className="flex items-center gap-2">
                    {!option.disabled && shortcut && (
                        <kbd className={cn('size-4 flex items-center justify-center rounded-sm text-[10px] font-medium bg-primary text-primary-foreground', option.className)} style={{ ...option.style }}>
                            {shortcut}
                        </kbd>
                    )}
                    <OptionBadge option={option} active={active} />
                </div>
                {option.description && (
                    <span className="text-[10px] text-muted-foreground line-clamp-1">{option.description}</span>
                )}
            </div>
            <div className="flex items-center gap-1">
                {active && <Check className="h-4 w-4 text-accent-foreground" />}
                {showActions && (
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            render={
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 hover:bg-primary/20"
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                    }}
                                >
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            }
                        />
                        <DropdownMenuContent side="right" align="start" className="w-56">
                            {option.actions?.map((a, i) => (
                                <DropdownMenuItem
                                    key={i}
                                    onClick={e => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        a.onAction(option);
                                        closePopover();
                                    }}
                                    className="cursor-pointer"
                                >
                                    {a.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </CommandItem>
    );
}

export default OptionSelect;
