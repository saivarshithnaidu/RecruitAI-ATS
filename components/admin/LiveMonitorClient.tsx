'use client';

import { useEffect, useState } from 'react';
import { LiveKitRoom, VideoTrack, useTracks, useRoomContext, AudioTrack } from '@livekit/components-react';
import { Track, RoomEvent } from 'livekit-client';
import "@livekit/components-styles";

interface LiveMonitorProps {
    examId: string;
    candidateId: string;
    candidateName?: string;
}

export default function LiveMonitorClient({ examId, candidateId, candidateName }: LiveMonitorProps) {
    const [token, setToken] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchToken = async () => {
            try {
                const res = await fetch('/api/proctor/livekit-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        roomName: `exam-${examId}`,
                        participantName: `Admin-Viewer`,
                        role: 'subscriber'
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setToken(data.token);
            } catch (e: any) {
                setError(e.message);
            }
        };
        fetchToken();
    }, [examId]);

    if (error) return <div className="text-red-500 text-xs p-2">Error: {error}</div>;
    if (!token) return <div className="text-gray-400 text-xs p-2 animate-pulse">Connecting...</div>;

    return (
        <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            connect={true}
            video={false} // Admin doesn't publish
            audio={false}
            data-lk-theme="default"
            className="w-full h-full bg-black relative rounded overflow-hidden group"
        >
            <CandidateStreamView candidateId={candidateId} candidateName={candidateName} />
        </LiveKitRoom>
    );
}

function CandidateStreamView({ candidateId, candidateName }: { candidateId?: string, candidateName?: string }) {
    // Subscribe to all camera tracks
    const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

    // Filter for specific candidate if needed, relying on identity?
    // actually room is per exam, but tokens create unique identities.
    // If room is `exam-{examId}`, multiple candidates might be in it?
    // Wait, implementation plan said 1 room per exam?
    // "Candidate connects to room `exam-{examId}`" -> Yes.
    // So all candidates for that exam are in this room.
    // We need to find the specific candidate's track.

    // Strategy: Candidate identity is likely their name or `Candidate-{id}`.
    // For now, let's show ALL tracks or filter by name if we can.
    // If `candidateId` is passed, we filter.

    const specificTracks = tracks.filter(t => {
        if (!candidateId) return true;
        // Check identity
        return t.participant.identity?.includes(candidateId) || t.participant.identity === candidateName;
        // Note: identity depends on token generation.
        // In token route: `participantName: ... || Candidate-${userId}`
    });

    if (specificTracks.length === 0) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 text-xs text-center p-4">
                Waiting for stream...<br />
                ({candidateName})
            </div>
        );
    }

    // Prioritize Video
    const videoTrack = specificTracks.find(t => t.source === Track.Source.Camera);
    const audioTrack = specificTracks.find(t => t.source === Track.Source.Microphone);

    return (
        <div className="relative w-full h-full">
            {videoTrack ? (
                <VideoTrack
                    trackRef={videoTrack}
                    className="w-full h-full object-contain"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white text-xs">
                    Audio Only
                </div>
            )}

            {audioTrack && <AudioTrack trackRef={audioTrack} />}

            <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded">
                {candidateName || "Candidate"}
                {audioTrack && <span className="ml-2 text-green-400">🎤</span>}
            </div>
        </div>
    );
}
