"use client";

import { useEffect, useState, useRef } from "react";
import { Room, RoomEvent, Participant } from "livekit-client";
import { LiveKitRoom, VideoTrack, useRoomContext } from "@livekit/components-react";
import "@livekit/components-styles";

interface ProctorLiveKitProps {
    token: string;
    serverUrl: string;
    onDisconnect: () => void;
    onConnect: () => void;
}

export default function ProctorLiveKit({ token, serverUrl, onDisconnect, onConnect }: ProctorLiveKitProps) {
    const [connected, setConnected] = useState(false);

    // If no token/url, don't render room
    if (!token || !serverUrl) return null;

    return (
        <LiveKitRoom
            token={token}
            serverUrl={serverUrl}
            connect={true}
            video={true} // Publish video
            audio={true} // Publish audio
            onConnected={() => {
                setConnected(true);
                onConnect();
            }}
            onDisconnected={() => {
                setConnected(false);
                onDisconnect();
            }}
            onError={(e: Error) => {
                console.error("LiveKit Error", e);
                onDisconnect();
            }}
            options={{
                publishDefaults: {
                    videoEncoding: { maxBitrate: 400000, maxFramerate: 24 }, // Reasonable quality
                }
            }}
            data-lk-theme="default"
        >
            {/* This Component renders the video preview */}
            <ProctorCamPreview />
        </LiveKitRoom>
    );
}

function ProctorCamPreview() {
    const room = useRoomContext();
    const [localParticipant, setLocalParticipant] = useState<Participant | null>(null);
    const [tracks, setTracks] = useState<any[]>([]);

    useEffect(() => {
        if (room) {
            const p = room.localParticipant;
            setLocalParticipant(p);
            const updateTracks = () => {
                // Get camera track
                const cameraPub = Array.from(p.trackPublications.values()).find(
                    (pub: any) => pub.kind === 'video' && pub.source === 'camera'
                );
                if (cameraPub && cameraPub.track) {
                    setTracks([cameraPub]);
                }
            };

            // Listen for publish events
            room.on(RoomEvent.LocalTrackPublished, updateTracks);
            room.on(RoomEvent.TrackPublished, updateTracks); // Shouldn't fire for local but safety

            // Initial check (maybe track is already up)
            setTimeout(updateTracks, 1000);

            return () => {
                room.off(RoomEvent.LocalTrackPublished, updateTracks);
            };
        }
    }, [room]);

    if (!localParticipant) return <div className="text-white text-xs p-2">Initializing...</div>;

    return (
        <div className="w-full h-full relative bg-black">
            {tracks.map((pub) => (
                <VideoTrack
                    key={pub.trackSid}
                    trackRef={{
                        participant: localParticipant,
                        source: pub.source,
                        publication: pub,
                    }}
                    className="w-full h-full object-cover transform scale-x-[-1]"
                />
            ))}
            {tracks.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
                    Camera Starting...
                </div>
            )}
            <div className="absolute top-1 left-1 bg-red-600 w-2 h-2 rounded-full animate-pulse shadow"></div>
        </div>
    );
}
