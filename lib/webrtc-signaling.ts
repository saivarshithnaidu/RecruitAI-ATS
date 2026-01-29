
import { RealtimeChannel } from "@supabase/supabase-js";

// Types
type SignalingMessage =
    | { type: 'offer'; sdp: RTCSessionDescriptionInit; senderId: string; targetId: string }
    | { type: 'answer'; sdp: RTCSessionDescriptionInit; senderId: string; targetId: string }
    | { type: 'candidate'; candidate: RTCIceCandidate; senderId: string; targetId: string }
    | { type: 'ready'; senderId: string; role: 'host' | 'viewer' };

export class WebRTCSignaling {
    channel: RealtimeChannel;
    userId: string;
    onMessage: (msg: SignalingMessage) => void;

    constructor(channel: RealtimeChannel, userId: string, onMessage: (msg: SignalingMessage) => void) {
        this.channel = channel;
        this.userId = userId;
        this.onMessage = onMessage;

        // Listen to signaling events
        this.channel.on('broadcast', { event: 'signal' }, (payload) => {
            const msg = payload.payload as SignalingMessage;

            // Handle 'ready' message (broadcast to everyone)
            if (msg.type === 'ready') {
                this.onMessage(msg);
                return;
            }

            // Handle targeted messages
            if (msg.targetId === this.userId) {
                this.onMessage(msg);
            }
        });
    }

    sendReady(role: 'host' | 'viewer') {
        this.channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'ready', senderId: this.userId, role }
        });
    }

    sendOffer(targetId: string, sdp: RTCSessionDescriptionInit) {
        this.channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'offer', sdp, senderId: this.userId, targetId }
        });
    }

    sendAnswer(targetId: string, sdp: RTCSessionDescriptionInit) {
        this.channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'answer', sdp, senderId: this.userId, targetId }
        });
    }

    sendCandidate(targetId: string, candidate: RTCIceCandidate) {
        this.channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'candidate', candidate, senderId: this.userId, targetId }
        });
    }
}
