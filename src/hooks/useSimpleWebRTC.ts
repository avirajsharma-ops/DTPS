import { useState, useRef, useCallback, useEffect } from 'react';
import SimplePeer from 'simple-peer';
import { useSession } from 'next-auth/react';

interface CallState {
  isInCall: boolean;
  isInitiator: boolean;
  callType: 'audio' | 'video' | null;
  remoteUserId: string | null;
  callId: string | null;
  status: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended';
}

interface UseSimpleWebRTCOptions {
  onIncomingCall?: (callData: any) => void;
  onCallAccepted?: () => void;
  onCallRejected?: () => void;
  onCallEnded?: () => void;
  onRemoteStream?: (stream: MediaStream) => void;
}

export function useSimpleWebRTC(options: UseSimpleWebRTCOptions = {}) {
  const { data: session } = useSession();
  const [callState, setCallState] = useState<CallState>({
    isInCall: false,
    isInitiator: false,
    callType: null,
    remoteUserId: null,
    callId: null,
    status: 'idle'
  });

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const peerRef = useRef<SimplePeer.Instance | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingOfferRef = useRef<any>(null);

  // Generate unique call ID
  const generateCallId = () => `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Clean up resources
  const cleanup = useCallback(() => {
    console.log('🧹 Cleaning up WebRTC resources...');
    
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setCallState({
      isInCall: false,
      isInitiator: false,
      callType: null,
      remoteUserId: null,
      callId: null,
      status: 'idle'
    });
    setError(null);
  }, []);

  // Send signaling data through API
  const sendSignal = useCallback(async (type: string, data: any) => {
    if (!session?.user?.id || !callState.remoteUserId) return;

    try {
      console.log(`📡 Sending signal: ${type}`, data);
      
      const response = await fetch('/api/webrtc/simple-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          callId: callState.callId,
          fromUserId: session.user.id,
          toUserId: callState.remoteUserId,
          data
        })
      });

      if (!response.ok) {
        throw new Error(`Signal failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Failed to send signal:', error);
      setError('Failed to send signal');
    }
  }, [session?.user?.id, callState.remoteUserId, callState.callId]);

  // Create peer connection
  const createPeer = useCallback((isInitiator: boolean, stream: MediaStream) => {
    console.log(`🔗 Creating peer connection (initiator: ${isInitiator})`);
    
    const peer = new SimplePeer({
      initiator: isInitiator,
      trickle: false,
      stream: stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('signal', (data) => {
      console.log('📤 Peer signal generated:', data.type);
      sendSignal('webrtc-signal', data);
    });

    peer.on('connect', () => {
      console.log('✅ Peer connected!');
      setCallState(prev => ({ ...prev, status: 'connected' }));
      options.onCallAccepted?.();
    });

    peer.on('stream', (remoteStream) => {
      console.log('📺 Remote stream received');
      setRemoteStream(remoteStream);
      options.onRemoteStream?.(remoteStream);
    });

    peer.on('error', (error) => {
      console.error('❌ Peer error:', error);
      setError(`Connection error: ${error.message}`);
      cleanup();
    });

    peer.on('close', () => {
      console.log('🔌 Peer connection closed');
      cleanup();
      options.onCallEnded?.();
    });

    peerRef.current = peer;
    return peer;
  }, [sendSignal, cleanup, options]);

  // Start outgoing call
  const startCall = useCallback(async (remoteUserId: string, callType: 'audio' | 'video') => {
    if (!session?.user?.id) {
      console.error('❌ Simple WebRTC: Not authenticated');
      setError('Not authenticated');
      return;
    }

    try {
      console.log(`🚀 Simple WebRTC: Starting ${callType} call to:`, remoteUserId, 'from:', session.user.id);
      setError(null);
      
      const callId = generateCallId();
      setCallState({
        isInCall: true,
        isInitiator: true,
        callType,
        remoteUserId,
        callId,
        status: 'calling'
      });

      // Get user media
      const constraints = {
        video: callType === 'video',
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      console.log('📹 Simple WebRTC: Media stream obtained, creating peer...');

      // Create peer connection as initiator
      const peer = createPeer(true, stream);

      // Wait for the offer to be generated
      peer.on('signal', async (signal) => {
        if (signal.type === 'offer') {
          console.log('📡 Simple WebRTC: Offer generated, sending call invitation...');

          // Send call invitation with offer
          const response = await fetch('/api/webrtc/simple-signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'call-invite',
              callId,
              fromUserId: session.user.id,
              toUserId: remoteUserId,
              callType,
              data: { offer: signal }
            })
          });

          if (!response.ok) {
            throw new Error('Failed to send call invitation');
          }

          console.log('✅ Simple WebRTC: Call invitation sent with offer');
        } else {
          // Handle other signals (ICE candidates, etc.)
          console.log('📡 Simple WebRTC: Sending signal:', signal.type);
          await sendSignal('webrtc-signal', signal);
        }
      });

    } catch (error) {
      console.error('❌ Failed to start call:', error);
      setError(`Failed to start call: ${error instanceof Error ? error.message : 'Unknown error'}`);
      cleanup();
    }
  }, [session?.user?.id, cleanup]);

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!callState.remoteUserId || !callState.callId) return;

    try {
      console.log('✅ Accepting call...');
      setError(null);

      // Get user media
      const constraints = {
        video: callState.callType === 'video',
        audio: true
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      console.log('📹 Simple WebRTC: Media stream obtained, creating peer as receiver...');

      // Create peer connection as receiver
      const peer = createPeer(false, stream);

      // If we have a pending offer, signal it to the peer
      if (pendingOfferRef.current) {
        console.log('📡 Simple WebRTC: Signaling pending offer to peer...');
        peer.signal(pendingOfferRef.current);
        pendingOfferRef.current = null;
      }

      // Wait for answer to be generated
      peer.on('signal', async (signal) => {
        if (signal.type === 'answer') {
          console.log('📡 Simple WebRTC: Answer generated, sending call acceptance...');

          // Send call acceptance with answer
          await sendSignal('call-accept', { answer: signal });
          console.log('✅ Simple WebRTC: Call acceptance sent with answer');
        } else {
          // Handle other signals (ICE candidates, etc.)
          console.log('📡 Simple WebRTC: Sending signal:', signal.type);
          await sendSignal('webrtc-signal', signal);
        }
      });

      setCallState(prev => ({ ...prev, status: 'connected' }));

    } catch (error) {
      console.error('❌ Failed to accept call:', error);
      setError(`Failed to accept call: ${error instanceof Error ? error.message : 'Unknown error'}`);
      cleanup();
    }
  }, [callState, createPeer, sendSignal, cleanup]);

  // Reject call
  const rejectCall = useCallback(async () => {
    if (!callState.remoteUserId || !callState.callId) return;

    try {
      console.log('❌ Rejecting call...');
      await sendSignal('call-reject', {});
      cleanup();
      options.onCallRejected?.();
    } catch (error) {
      console.error('❌ Failed to reject call:', error);
    }
  }, [callState, sendSignal, cleanup, options]);

  // End call
  const endCall = useCallback(async () => {
    try {
      console.log('📞 Ending call...');
      if (callState.remoteUserId && callState.callId) {
        await sendSignal('call-end', {});
      }
      cleanup();
    } catch (error) {
      console.error('❌ Failed to end call:', error);
      cleanup(); // Still cleanup even if signal fails
    }
  }, [callState, sendSignal, cleanup]);

  // Handle incoming signals
  const handleSignal = useCallback((signalData: any) => {
    const { type, data, fromUserId, callId, callType } = signalData;
    
    console.log(`📥 Received signal: ${type}`, { fromUserId, callId });

    switch (type) {
      case 'call-invite':
        console.log('📞 Simple WebRTC: Incoming call invitation with offer');

        // Store the offer for when the call is accepted
        pendingOfferRef.current = data?.offer;

        setCallState({
          isInCall: true,
          isInitiator: false,
          callType,
          remoteUserId: fromUserId,
          callId,
          status: 'ringing'
        });

        options.onIncomingCall?.(signalData);
        break;

      case 'call-accept':
        console.log('✅ Simple WebRTC: Call accepted by remote user');

        // Signal the answer to our peer
        if (peerRef.current && data?.answer) {
          console.log('📡 Simple WebRTC: Signaling answer to peer...');
          peerRef.current.signal(data.answer);
        }

        setCallState(prev => ({ ...prev, status: 'connected' }));
        options.onCallAccepted?.();
        break;

      case 'call-reject':
        console.log('❌ Call rejected by remote user');
        cleanup();
        options.onCallRejected?.();
        break;

      case 'call-end':
        console.log('📞 Call ended by remote user');
        cleanup();
        options.onCallEnded?.();
        break;

      case 'webrtc-signal':
        console.log('📡 WebRTC signal received');
        if (peerRef.current && data) {
          peerRef.current.signal(data);
        }
        break;

      default:
        console.warn('❓ Unknown signal type:', type);
    }
  }, [createPeer, cleanup, options]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    // State
    callState,
    localStream,
    remoteStream,
    error,

    // Actions
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    handleSignal,
    cleanup
  };
}
