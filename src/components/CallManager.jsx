import { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';

export default function CallManager({ user }) {
  const { socket } = useSocket();
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callState, setCallState] = useState('idle'); // idle, calling, active
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const peerRef = useRef();
  const localStreamRef = useRef();

  useEffect(() => {
    if (!socket) return;

    socket.on('call:incoming', ({ from, fromUsername, offer, callType }) => {
      setIncomingCall({ from, fromUsername, offer, callType });
    });

    socket.on('call:answered', async ({ answer }) => {
      if (peerRef.current) {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallState('active');
      }
    });

    socket.on('call:ice', async ({ candidate }) => {
      if (peerRef.current && candidate) {
        try { await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
      }
    });

    socket.on('call:rejected', () => {
      endCall();
      alert('Appel refusé');
    });

    socket.on('call:ended', () => {
      endCall();
    });

    return () => {
      socket.off('call:incoming');
      socket.off('call:answered');
      socket.off('call:ice');
      socket.off('call:rejected');
      socket.off('call:ended');
    };
  }, [socket]);

  const startCall = async (targetId, targetUsername, callType = 'video') => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video',
      audio: true
    }).catch(() => null);
    if (!stream) return alert('Impossible d\'accéder à la caméra/micro');

    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('call:ice', { to: targetId, candidate: e.candidate });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call:offer', { to: targetId, offer, callType });
    setActiveCall({ targetId, targetUsername, callType });
    setCallState('calling');
  };

  const acceptCall = async () => {
    const { from, fromUsername, offer, callType } = incomingCall;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video',
      audio: true
    }).catch(() => null);
    if (!stream) return alert('Impossible d\'accéder à la caméra/micro');

    localStreamRef.current = stream;
    if (localVideoRef.current) localVideoRef.current.srcObject = stream;

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    peerRef.current = pc;

    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = (e) => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('call:ice', { to: from, candidate: e.candidate });
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('call:answer', { to: from, answer });

    setActiveCall({ targetId: from, targetUsername: fromUsername, callType });
    setIncomingCall(null);
    setCallState('active');
  };

  const rejectCall = () => {
    socket.emit('call:reject', { to: incomingCall.from });
    setIncomingCall(null);
  };

  const endCall = () => {
    if (peerRef.current) { peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (activeCall) socket.emit('call:end', { to: activeCall.targetId });
    setActiveCall(null);
    setIncomingCall(null);
    setCallState('idle');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
      setMuted(m => !m);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
      setCameraOff(c => !c);
    }
  };

  // Expose startCall globally so other components can use it
  useEffect(() => { window._startCall = startCall; }, [socket]);

  if (callState === 'idle' && !incomingCall) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>

      {/* Incoming call */}
      {incomingCall && callState === 'idle' && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#9090b8', marginBottom: 8 }}>Appel {incomingCall.callType === 'video' ? 'vidéo' : 'audio'} entrant</div>
          <Avatar username={incomingCall.fromUsername} size="lg" />
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginTop: 12 }}>{incomingCall.fromUsername}</div>
          <div style={{ display: 'flex', gap: 24, marginTop: 32, justifyContent: 'center' }}>
            <button onClick={rejectCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.4 19.79 19.79 0 0 1 1.2 .77 2 2 0 0 1 3.18-1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 7.1"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
            </button>
            <button onClick={acceptCall} style={{ width: 64, height: 64, borderRadius: '50%', background: '#22c55e', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 9.4 19.79 19.79 0 0 1 1.2.77 2 2 0 0 1 3.18-1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 7.1a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Active call */}
      {(callState === 'calling' || callState === 'active') && activeCall && (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {activeCall.callType === 'video' && (
            <div style={{ position: 'relative', width: '100%', flex: 1 }}>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <video ref={localVideoRef} autoPlay playsInline muted style={{ position: 'absolute', bottom: 16, right: 16, width: 120, height: 90, borderRadius: 12, objectFit: 'cover', border: '2px solid #6366f1' }} />
            </div>
          )}
          {activeCall.callType === 'audio' && (
            <div style={{ textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Avatar username={activeCall.targetUsername} size="lg" />
              <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', marginTop: 16 }}>{activeCall.targetUsername}</div>
              <div style={{ color: '#9090b8', marginTop: 8 }}>{callState === 'calling' ? 'Appel en cours...' : 'En communication'}</div>
              <video ref={remoteVideoRef} autoPlay playsInline style={{ display: 'none' }} />
              <video ref={localVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, padding: '24px', background: 'rgba(0,0,0,0.5)', borderRadius: 50 }}>
            <button onClick={toggleMute} style={{ width: 52, height: 52, borderRadius: '50%', background: muted ? '#ef4444' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">{muted ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></> : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></>}</svg>
            </button>
            {activeCall.callType === 'video' && (
              <button onClick={toggleCamera} style={{ width: 52, height: 52, borderRadius: '50%', background: cameraOff ? '#ef4444' : 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
              </button>
            )}
            <button onClick={endCall} style={{ width: 52, height: 52, borderRadius: '50%', background: '#ef4444', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.42 19.42 0 0 1 4.26 9.4 19.79 19.79 0 0 1 1.2.77 2 2 0 0 1 3.18-1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 7.1"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
