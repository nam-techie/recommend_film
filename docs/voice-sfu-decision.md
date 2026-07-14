# Watch Party voice SFU decision

## Decision

Watch Party voice uses LiveKit Cloud as its production SFU. Socket.IO remains authoritative for room membership, host permissions, playback, chat, reactions and the `voiceEnabled` policy; LiveKit is authoritative for media connection, microphone publication, subscription, active speaker and connection quality.

P2P mesh is removed completely and is not a fallback. A client publishes one microphone track to LiveKit and automatically subscribes to every microphone track in the same LiveKit room.

## Why LiveKit

| Option | Free allowance at decision time | Integration | TURN/reconnect | Decision |
| --- | --- | --- | --- | --- |
| LiveKit Cloud | 5,000 WebRTC participant-minutes and 50 GB downstream | Room-level JavaScript and server SDKs | Managed | Selected for v1 |
| Cloudflare Realtime SFU | 1,000 GB egress/month | Low-level sessions and track IDs; application owns room/presence/reconnect | Managed SFU and TURN | Reconsider if LiveKit cost becomes material |
| Daily | Participant-minute pricing and high-level call SDK | Fast integration | Managed | Not selected; less portable than the LiveKit client/server split |

LiveKit is the best fit for the current Next.js client and Node watch-party service because it supplies the room, subscription, reconnect, active-speaker and browser audio-playback lifecycle that the existing mesh hook had to implement itself. LiveKit can also be self-hosted later without replacing the client-facing provider contract.

## Security and lifecycle

- `POST /api/rooms/:roomId/voice-token` accepts only a valid Watch Party room token.
- The generated LiveKit token identity is the Watch Party `memberId`; its grant is limited to that room, microphone publishing and subscription.
- LiveKit API credentials remain server-only.
- Mic capture starts only from a user click and is off when joining.
- Host disabling voice updates Socket.IO policy, disconnects clients and deletes the LiveKit room.
- UI reports connection/subscription state, not an unverifiable claim that a listener's physical speaker produced sound.

## Revisit criteria

Review Cloudflare Realtime or LiveKit self-hosting when the project regularly consumes 70% of the LiveKit allowance, needs more than 100 concurrent participants across rooms, or requires infrastructure ownership. Provider migration must keep the `VoiceProvider` contract and must not reintroduce peer-to-peer mesh.
