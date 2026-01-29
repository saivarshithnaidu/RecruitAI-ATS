"use client";

import { useEffect, useState } from "react";

export default function ScheduledTimeDisplay({ timestamp }: { timestamp: string }) {
    const [localTime, setLocalTime] = useState<string>("");

    useEffect(() => {
        if (timestamp) {
            setLocalTime(new Date(timestamp).toLocaleString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }));
        }
    }, [timestamp]);

    if (!localTime) return null; // Hydration mismatch avoidance: Render empty first

    return (
        <span className="font-bold">{localTime}</span>
    );
}
