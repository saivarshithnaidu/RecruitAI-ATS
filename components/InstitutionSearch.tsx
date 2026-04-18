"use client";

import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MapPin, School, PlusCircle } from "lucide-react";
import { useDebounceValue } from "usehooks-ts";

interface Institution {
    id?: string;
    name: string;
    type: string;
    state?: string;
    district?: string;
}

interface InstitutionSearchProps {
    id: string;
    name: string;
    type: "school" | "college" | "diploma";
    placeholder?: string;
    defaultValue?: string;
    required?: boolean;
    onSelect?: (institution: Institution) => void;
}

export default function InstitutionSearch({ id, name, type, placeholder, defaultValue = "", required = false, onSelect }: InstitutionSearchProps) {
    const [inputValue, setInputValue] = useState(defaultValue);
    const [suggestions, setSuggestions] = useState<Institution[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isManual, setIsManual] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [debouncedSearchTerm] = useDebounceValue(inputValue, 300);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (debouncedSearchTerm.length < 2 || isManual) {
            setSuggestions([]);
            return;
        }

        const fetchInstitutions = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/institutions?search=${debouncedSearchTerm}&type=${type}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setSuggestions(data);
                }
            } catch (error) {
                console.error("Search failed:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInstitutions();
    }, [debouncedSearchTerm, type, isManual]);

    const handleSelect = (inst: Institution) => {
        setInputValue(inst.name);
        setShowSuggestions(false);
        setIsManual(true);
        if (onSelect) onSelect(inst);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        setIsManual(false);
        setShowSuggestions(true);
    };

    return (
        <div ref={containerRef} className="relative w-full group">
            <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                    id={id}
                    name={name}
                    type="text"
                    autoComplete="off"
                    placeholder={placeholder || `Search for your ${type}...`}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => setShowSuggestions(true)}
                    required={required}
                    className="pl-10 py-6 border-gray-200 focus:border-blue-400 transition-all shadow-sm"
                />
                {isLoading && (
                    <div className="absolute right-3 top-3">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                )}
            </div>

            {showSuggestions && (inputValue.length >= 2 || suggestions.length > 0) && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {suggestions.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto overflow-x-hidden">
                            <div className="p-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider bg-gray-50/50 border-b border-gray-100">
                                Suggested Matching {type}s
                            </div>
                            {suggestions.map((inst, index) => (
                                <button
                                    key={inst.id || index}
                                    type="button"
                                    onClick={() => handleSelect(inst)}
                                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                                >
                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                        <School className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-gray-800 text-sm truncate uppercase tracking-tight">
                                            {inst.name}
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
                                            <MapPin className="w-3 h-3" />
                                            {inst.district}, {inst.state}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        !isLoading && (
                            <div className="p-4 text-center">
                                <PlusCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm font-medium text-gray-500 italic">No exact matches found.</p>
                                <button 
                                    type="button" 
                                    onClick={async () => {
                                        setIsLoading(true);
                                        try {
                                            const res = await fetch(`/api/institutions`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    name: inputValue,
                                                    type: type,
                                                    state: "Other",
                                                    district: "Other"
                                                })
                                            });
                                            const json = await res.json();
                                            if (json.success) {
                                                handleSelect({ name: inputValue, type: type, state: "Other", district: "Other" });
                                            }
                                        } catch (e) {
                                            console.error("Failed to auto-save", e);
                                            setShowSuggestions(false);
                                        } finally {
                                            setIsLoading(false);
                                        }
                                    }}
                                    className="mt-2 flex items-center justify-center gap-2 mx-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md"
                                >
                                    <PlusCircle className="w-3 h-3" />
                                    Add & Use: "{inputValue}"
                                </button>
                            </div>
                        )
                    )}
                </div>
            )}
        </div>
    );
}
