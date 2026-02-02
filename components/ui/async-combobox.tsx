"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"; // Assuming Shadcn UI Command exists, else we adapt
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"; // Assuming Shadcn UI Popover exists

interface ComboboxProps {
    value?: string;
    onSelect: (value: string) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    fetcher: (query: string) => Promise<{ label: string; value: string }[]>;
    disabled?: boolean;
}

export function Combobox({ value, onSelect, placeholder = "Select...", searchPlaceholder = "Search...", fetcher, disabled }: ComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [items, setItems] = React.useState<{ label: string; value: string }[]>([]);
    const [query, setQuery] = React.useState("");
    const [loading, setLoading] = React.useState(false);

    // Debounce search
    React.useEffect(() => {
        if (!query) {
            setItems([]);
            return;
        }
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const results = await fetcher(query);
                setItems(results);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query, fetcher]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {value || placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command shouldFilter={false}>
                    {/* 
               Note: We disable default client-side filtering because we rely on server-side search.
               We pass 'value' to CommandInput to control it manually or let it be uncontrolled
               but we need to capture keystrokes.
            */}
                    <CommandInput placeholder={searchPlaceholder} onValueChange={setQuery} />
                    <CommandList>
                        {loading && <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="animate-spin w-4 h-4 mx-auto" /></div>}
                        {!loading && items.length === 0 && query.length > 2 && <CommandEmpty>No results found.</CommandEmpty>}
                        <CommandGroup>
                            {!loading && items.map((item) => (
                                <CommandItem
                                    key={item.value}
                                    value={item.label} // Value used for selection
                                    onSelect={(currentValue: string) => {
                                        onSelect(currentValue === value ? "" : currentValue);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === item.label ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {item.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
