# WebRTC Call State Synchronization Fix

## Problem Identified

The issue where **client shows "connected"** but **dietitian shows "calling"** was caused by a **stale closure problem** in the React event handler.

### Root Cause

1. **State Variable Issue**: The `peerConnection` was stored as a React state variable
2. **Stale Closure**: When the `call_accepted` event handler was registered in `useRealtime`, it captured the initial `peerConnection` value (which was `null`)
3. **Event Handler Execution**: When the client accepted the call and sent `call_accepted`, the dietitian's event handler ran with the stale `peerConnection = null` value
4. **Early Return**: The handler returned early at line 217-220 because `!peerConnection` was true
5. **State Never Updated**: The dietitian's UI never transitioned from "calling" to "connected"

### Why Client Worked

The client side (page.tsx) immediately sets `setCallState('connected')` after sending the `call_accepted` signal (line 574), so it doesn't rely on receiving an event back.

## Solution Applied

### 1. Added Peer Connection Ref

Added a ref to store the peer connection alongside the state variable to avoid stale closures:

```typescript
const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
```

### 2. Updated Event Handler

Modified the `call_accepted` event handler to use the ref instead of the state variable:

```typescript
} else if (evt.type === 'call_accepted') {
  // Use ref to get the latest peer connection (avoid stale closure)
  const pc = peerConnectionRef.current;
  
  console.log('Dietitian received call_accepted:', {
    currentCallId: callId,
    eventCallId: data.callId,
    hasPeerConnection: !!pc,
    hasAnswer: !!data.answer,
    fullEventData: data
  });

  if (!pc) {
    console.error('No peer connection available for call_accepted (ref is null)');
    return;
  }

  // ... rest of the handler uses pc instead of peerConnection
  pc.setRemoteDescription(data.answer)
    .then(async () => {
      remoteDescriptionSetRef.current = true;
      await flushPendingIce(pc);
      setCallState('connected');
      console.log('✅ Dietitian call state updated to CONNECTED');
      // ... timeout clearing logic
    })
    .catch((error) => {
      console.error('❌ Error setting remote description:', error);
    });
}
```

### 3. Synced Ref with State

Updated all places where `setPeerConnection` is called to also update the ref:

**In `initializePeerConnection`:**
```typescript
setPeerConnection(pc);
peerConnectionRef.current = pc; // Keep ref in sync
return pc;
```

**In `endCall`:**
```typescript
if (peerConnection) {
  peerConnection.close();
  setPeerConnection(null);
  peerConnectionRef.current = null; // Clear ref too
}
```

## Files Modified

1. **src/app/messages/page-old-desktop.tsx** (Dietitian view)
   - Added `peerConnectionRef` ref (line 152)
   - Updated `call_accepted` handler to use ref (lines 194-260)
   - Synced ref in `initializePeerConnection` (line 872)
   - Synced ref in `endCall` (line 1140)

2. **src/app/api/realtime/send/route.ts**
   - Fixed corrupted import statement (removed "xxxxxx" prefix)

## How to Test

### Prerequisites
- Server running on `http://localhost:3000`
- Two browser windows/tabs or two different browsers
- One logged in as **Dietitian**
- One logged in as **Client**

### Test Steps

1. **Open Dietitian Dashboard**
   - Navigate to `/messages`
   - Select a client conversation
   - Click the **Phone** or **Video** icon to initiate a call

2. **Accept Call on Client Side**
   - The client should see an incoming call notification
   - Click "Accept" button

3. **Verify Both Sides Show "Connected"**
   - ✅ **Client side**: Should show "Connected" status
   - ✅ **Dietitian side**: Should now ALSO show "Connected" status (previously stuck on "Calling")

4. **Check Console Logs**
   - Dietitian console should show:
     ```
     Dietitian received call_accepted: { ... }
     Processing call_accepted - setting remote description
     Setting remote description and updating to connected state
     ✅ Dietitian call state updated to CONNECTED
     ```

### Expected Behavior

| Step | Client UI | Dietitian UI |
|------|-----------|--------------|
| 1. Dietitian initiates call | - | "Calling..." |
| 2. Client receives call | "Incoming call" | "Calling..." |
| 3. Client accepts call | "Connected" ✅ | "Connected" ✅ |
| 4. Audio/Video streams | Working | Working |

### What Was Broken Before

| Step | Client UI | Dietitian UI |
|------|-----------|--------------|
| 1. Dietitian initiates call | - | "Calling..." |
| 2. Client receives call | "Incoming call" | "Calling..." |
| 3. Client accepts call | "Connected" ✅ | "Calling..." ❌ (STUCK) |
| 4. Audio/Video streams | Working | Not working |

## Technical Details

### React Closure Problem

This is a common React pitfall when using event listeners with state variables:

```typescript
// ❌ WRONG: Event handler captures stale state
const [value, setValue] = useState(null);

useEffect(() => {
  eventEmitter.on('event', () => {
    console.log(value); // Always logs initial value (null)
  });
}, []); // Empty deps = closure captures initial state

// ✅ CORRECT: Use ref for latest value
const [value, setValue] = useState(null);
const valueRef = useRef(null);

useEffect(() => {
  eventEmitter.on('event', () => {
    console.log(valueRef.current); // Always logs latest value
  });
}, []);
```

### Why This Happened

The `useRealtime` hook registers the `onMessage` callback once when the component mounts. At that time, `peerConnection` is `null`. Even though `setPeerConnection(pc)` is called later when initiating the call, the event handler still has the old `null` value in its closure.

### The Fix

By using a ref (`peerConnectionRef.current`), we bypass React's closure mechanism and always get the latest value, because refs are mutable objects that persist across renders.

## Additional Improvements Made

1. **Removed SSE Connection Check Early Return**: The handler no longer drops `call_accepted` events during transient SSE reconnections
2. **Enhanced Logging**: Added clearer console logs with ✅ and ❌ emojis for easier debugging
3. **Fixed Import Error**: Removed corrupted "xxxxxx" prefix from import statement in `src/app/api/realtime/send/route.ts`

## Next Steps

1. **Test the fix** with real calls between dietitian and client
2. **Monitor console logs** to ensure the flow works correctly
3. **Consider migrating to Socket.IO** for more reliable real-time communication (as discussed earlier)
4. **Add automated tests** for WebRTC call flows

## Debugging Tips

If issues persist, check these in the browser console:

1. **Dietitian side logs**:
   - Look for "Dietitian received call_accepted"
   - Check if `hasPeerConnection` is `true`
   - Verify "✅ Dietitian call state updated to CONNECTED" appears

2. **Client side logs**:
   - Look for "call_accepted signal sent successfully"
   - Check response status is 200

3. **Network tab**:
   - Verify `/api/webrtc/signal` POST request succeeds
   - Check SSE connection is active (`/api/realtime/sse`)

4. **Common issues**:
   - If `hasPeerConnection` is still `false`, the peer connection wasn't created properly
   - If no logs appear, the SSE event isn't being delivered
   - If "Error setting remote description" appears, check the SDP format

---

**Status**: ✅ **FIXED AND READY FOR TESTING**

The stale closure issue has been resolved. Both dietitian and client should now show "Connected" status when a call is accepted.

