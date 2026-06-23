import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { io, Socket } from "socket.io-client";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Phone,
  PhoneCall,
  PhoneOff,
  Users,
  Search,
  Circle,
  Play,
  Pause,
  Tv,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface UserType {
  _id: string;
  name: string;
  email: string;
  image: string;
  plan: string;
}

export default function VideoCallPage() {
  const { user } = useUser();
  const router = useRouter();

  // Peer & Socket states
  const [socket, setSocket] = useState<Socket | null>(null);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Call states
  const [activeCall, setActiveCall] = useState<boolean>(false);
  const [callingUser, setCallingUser] = useState<UserType | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    offer: any;
    callerName: string;
    callerImage: string;
  } | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  // Stream toggles
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  // Recording state
  const [isRecording, setIsRecording] = useState(false);

  // Synchronized YouTube states
  const [ytUrl, setYtUrl] = useState("");
  const [currentYtVideoId, setCurrentYtVideoId] = useState("");
  const [ytPlayerReady, setYtPlayerReady] = useState(false);

  // Stream & Connection Refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callingUserIdRef = useRef<string | null>(null); // who we are currently calling or in a call with

  // UI Video Refs
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const ytPlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  // Recorder Ref
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      toast.error("Please sign in to access Video Call (VoIP)");
    }
  }, [user]);

  // Load Registered Users
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get("/user/users");
        // Exclude current user from the list
        const filtered = response.data.filter((u: UserType) => u._id !== user._id && u.email !== user.email);
        setUsersList(filtered);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, [user]);

  // Socket Connection & Listeners
  useEffect(() => {
    if (!user) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const socketInstance = io(backendUrl);
    setSocket(socketInstance);
    socketRef.current = socketInstance;

    // Register user
    socketInstance.emit("register", user._id);

    // Watch for online users changes
    socketInstance.on("user-status-change", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    // Handle Incoming Call
    socketInstance.on("incoming-call", ({ from, offer, callerName, callerImage }) => {
      if (activeCall || incomingCall) {
        // Busy - we can send a disconnect/decline event back to simplify
        socketInstance.emit("end-call", { to: from });
        return;
      }
      setIncomingCall({ from, offer, callerName, callerImage });
      callingUserIdRef.current = from;
    });

    // Handle Call Answered
    socketInstance.on("call-answered", async ({ answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setActiveCall(true);
          toast.success("Call connected!");
        } catch (error) {
          console.error("Error setting remote description from answer:", error);
        }
      }
    });

    // Handle ICE Candidate
    socketInstance.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ice candidate:", error);
        }
      }
    });

    // Handle Call Ended
    socketInstance.on("call-ended", () => {
      handleEndCallLocal(false);
      toast.info("Call ended by remote user");
    });

    socketInstance.on("call-error", ({ message }) => {
      toast.error(message);
      cleanupCallState();
    });

    // Handle YouTube Synchronized Actions
    socketInstance.on("yt-video-action", ({ action, videoId, time }) => {
      if (videoId && currentYtVideoId !== videoId) {
        setCurrentYtVideoId(videoId);
      }
      if (ytPlayerRef.current) {
        if (action === "load") {
          ytPlayerRef.current.cueVideoById(videoId);
        } else if (action === "play") {
          ytPlayerRef.current.playVideo();
        } else if (action === "pause") {
          ytPlayerRef.current.pauseVideo();
        } else if (action === "seek" && typeof time === "number") {
          ytPlayerRef.current.seekTo(time, true);
        }
      }
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [user, activeCall, incomingCall, currentYtVideoId]);

  // Load YouTube Player API
  useEffect(() => {
    if (!activeCall) return;

    const loadYoutubeAPI = () => {
      if ((window as any).YT) {
        initializeYoutubePlayer();
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      (window as any).onYouTubeIframeAPIReady = () => {
        initializeYoutubePlayer();
      };
    };

    loadYoutubeAPI();
  }, [activeCall]);

  const initializeYoutubePlayer = () => {
    if (ytPlayerRef.current) return;
    try {
      ytPlayerRef.current = new (window as any).YT.Player("yt-player", {
        height: "100%",
        width: "100%",
        videoId: "",
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          showinfo: 0,
        },
        events: {
          onReady: () => {
            setYtPlayerReady(true);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: -1 = unstarted, 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = video cued
            const state = event.data;
            if (!socketRef.current || !callingUserIdRef.current) return;

            if (state === 1) {
              // Playing
              const currentTime = ytPlayerRef.current.getCurrentTime();
              socketRef.current.emit("yt-video-action", {
                to: callingUserIdRef.current,
                action: "play",
                time: currentTime,
              });
            } else if (state === 2) {
              // Paused
              const currentTime = ytPlayerRef.current.getCurrentTime();
              socketRef.current.emit("yt-video-action", {
                to: callingUserIdRef.current,
                action: "pause",
                time: currentTime,
              });
            }
          },
        },
      });
    } catch (err) {
      console.error("Failed to initialize YouTube Iframe player:", err);
    }
  };

  // Synchronized YouTube Video Control
  const loadYoutubeVideo = () => {
    if (!ytUrl) return;
    let videoId = "";
    // Parse video ID from standard or share URLs
    if (ytUrl.includes("v=")) {
      videoId = ytUrl.split("v=")[1]?.split("&")[0];
    } else if (ytUrl.includes("youtu.be/")) {
      videoId = ytUrl.split("youtu.be/")[1]?.split("?")[0];
    } else {
      videoId = ytUrl.trim();
    }

    if (!videoId) {
      toast.error("Invalid YouTube URL or Video ID");
      return;
    }

    setCurrentYtVideoId(videoId);
    if (ytPlayerRef.current && ytPlayerReady) {
      ytPlayerRef.current.cueVideoById(videoId);
    }

    if (socketRef.current && callingUserIdRef.current) {
      socketRef.current.emit("yt-video-action", {
        to: callingUserIdRef.current,
        action: "load",
        videoId,
      });
    }
  };

  const handleYtSeek = () => {
    if (ytPlayerRef.current && ytPlayerReady && socketRef.current && callingUserIdRef.current) {
      const time = ytPlayerRef.current.getCurrentTime();
      socketRef.current.emit("yt-video-action", {
        to: callingUserIdRef.current,
        action: "seek",
        time,
      });
    }
  };

  // Setup local WebRTC media stream
  const setupLocalMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoElementRef.current) {
        localVideoElementRef.current.srcObject = stream;
      }
      return stream;
    } catch (error) {
      toast.error("Unable to access camera or microphone.");
      throw error;
    }
  };

  // Create Peer Connection
  const createPeerConnection = (recipientId: string, localStream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    // Add local tracks
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteStreamRef.current = remoteStream;
      if (remoteVideoElementRef.current) {
        remoteVideoElementRef.current.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          to: recipientId,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    setPeerConnection(pc);
    return pc;
  };

  // Start Call (Call Initiator)
  const handleInitiateCall = async (recipient: UserType) => {
    setCallingUser(recipient);
    callingUserIdRef.current = recipient._id;

    try {
      const stream = await setupLocalMedia();
      const pc = createPeerConnection(recipient._id, stream);
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current && user) {
        socketRef.current.emit("call-user", {
          to: recipient._id,
          offer,
          callerName: user.name,
          callerImage: user.image,
        });
      }
      toast.info(`Calling ${recipient.name}...`);
    } catch (error) {
      console.error("Initiate call error:", error);
      cleanupCallState();
    }
  };

  // Accept Incoming Call
  const handleAcceptCall = async () => {
    if (!incomingCall) return;
    const callerId = incomingCall.from;

    try {
      const stream = await setupLocalMedia();
      const pc = createPeerConnection(callerId, stream);

      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketRef.current) {
        socketRef.current.emit("answer-call", {
          to: callerId,
          answer,
        });
      }

      const matchUser = usersList.find((u) => u._id === callerId);
      if (matchUser) setCallingUser(matchUser);

      setActiveCall(true);
      setIncomingCall(null);
      toast.success("Call connected!");
    } catch (error) {
      console.error("Accept call error:", error);
      cleanupCallState();
    }
  };

  // Decline Incoming Call
  const handleDeclineCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("end-call", { to: incomingCall.from });
    }
    setIncomingCall(null);
    callingUserIdRef.current = null;
    toast.info("Call declined.");
  };

  // Screen Sharing
  const handleToggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true, // option to share system/tab audio
        });
        screenStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];

        // Replace local camera track in RTCPeerConnection senders
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        }

        // Listen for user stopping screen share from the browser bar
        videoTrack.onended = () => {
          stopScreenSharing();
        };

        // Render locally
        if (localVideoElementRef.current) {
          localVideoElementRef.current.srcObject = stream;
        }

        setScreenSharing(true);
        toast.success("Screen sharing started");
      } catch (error) {
        console.error("Error sharing screen:", error);
      }
    } else {
      await stopScreenSharing();
    }
  };

  const stopScreenSharing = async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Restore camera stream
    if (localStreamRef.current && peerConnectionRef.current) {
      const cameraTrack = localStreamRef.current.getVideoTracks()[0];
      const senders = peerConnectionRef.current.getSenders();
      const videoSender = senders.find((s) => s.track && s.track.kind === "video");
      if (videoSender && cameraTrack) {
        await videoSender.replaceTrack(cameraTrack);
      }

      if (localVideoElementRef.current) {
        localVideoElementRef.current.srcObject = localStreamRef.current;
      }
    }
    setScreenSharing(false);
    toast.info("Screen sharing stopped");
  };

  // Toggles for camera / microphone
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micEnabled;
        setMicEnabled(!micEnabled);
        toast.info(audioTrack.enabled ? "Microphone unmuted" : "Microphone muted");
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
        toast.info(videoTrack.enabled ? "Camera turned on" : "Camera turned off");
      }
    }
  };

  // Local Session Recording
  const handleToggleRecording = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      toast.success("Recording stopped and saved to downloads.");
    } else {
      // Start recording call
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioDestination = audioCtx.createMediaStreamDestination();
        let hasAudio = false;

        // Add local mic
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([localStreamRef.current.getAudioTracks()[0]])
          );
          source.connect(audioDestination);
          hasAudio = true;
        }

        // Add remote peer voice
        if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([remoteStreamRef.current.getAudioTracks()[0]])
          );
          source.connect(audioDestination);
          hasAudio = true;
        }

        const mixedStream = new MediaStream();

        // Add active video track (either shared screen or remote stream)
        let activeVideoTrack: MediaStreamTrack | null = null;
        if (screenSharing && screenStreamRef.current && screenStreamRef.current.getVideoTracks().length > 0) {
          activeVideoTrack = screenStreamRef.current.getVideoTracks()[0];
        } else if (remoteStreamRef.current && remoteStreamRef.current.getVideoTracks().length > 0) {
          activeVideoTrack = remoteStreamRef.current.getVideoTracks()[0];
        } else if (localStreamRef.current && localStreamRef.current.getVideoTracks().length > 0) {
          activeVideoTrack = localStreamRef.current.getVideoTracks()[0];
        }

        if (activeVideoTrack) {
          mixedStream.addTrack(activeVideoTrack);
        }

        // Add mixed audio track
        if (hasAudio) {
          mixedStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
        }

        // Setup recorder
        const recorder = new MediaRecorder(mixedStream, {
          mimeType: "video/webm;codecs=vp9,opus",
        });

        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `VoIP-Call-Recording-${new Date().toISOString().slice(0, 10)}.webm`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        };

        recorder.start(1000);
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        toast.success("Call session recording started");
      } catch (err) {
        console.error("Failed to start recording:", err);
        toast.error("Could not start recording session.");
      }
    }
  };

  // End Call locally
  const handleEndCallLocal = (notifyRemote = true) => {
    if (isRecording && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    if (notifyRemote && socketRef.current && callingUserIdRef.current) {
      socketRef.current.emit("end-call", { to: callingUserIdRef.current });
    }

    cleanupCallState();
    toast.info("Call disconnected");
  };

  const cleanupCallState = () => {
    // Stop local camera
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    // Close WebRTC connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset states
    setPeerConnection(null);
    setActiveCall(false);
    setCallingUser(null);
    setScreenSharing(false);
    setIncomingCall(null);
    callingUserIdRef.current = null;
    setCurrentYtVideoId("");
    setYtUrl("");
    if (ytPlayerRef.current) {
      ytPlayerRef.current = null;
    }
  };

  // Search logic
  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] text-center p-6 bg-zinc-950">
        <div className="max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl space-y-6">
          <div className="bg-red-500/10 text-red-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto border border-red-500/20">
            <Video className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-100">VoIP Video Calling</h2>
            <p className="text-sm text-zinc-400">
              Please sign in to make real-time video calls, share your screen, and watch YouTube videos together.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-[calc(100vh-56px)] p-6 font-sans">
      {/* Incoming Call Dialog */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-6 shadow-2xl animate-scale-up">
            <div className="relative inline-block">
              <img
                src={incomingCall.callerImage}
                alt={incomingCall.callerName}
                className="w-24 h-24 rounded-full mx-auto border-4 border-red-500 shadow-lg object-cover"
              />
              <span className="absolute bottom-1 right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-zinc-900"></span>
              </span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-100">{incomingCall.callerName}</h3>
              <p className="text-sm text-zinc-400 mt-1">is video calling you...</p>
            </div>
            <div className="flex justify-center gap-4">
              <Button
                variant="destructive"
                className="flex items-center gap-2 rounded-full px-6 py-5 shadow-lg shadow-red-500/20"
                onClick={handleDeclineCall}
              >
                <PhoneOff className="w-5 h-5" />
                Decline
              </Button>
              <Button
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-full px-6 py-5 shadow-lg shadow-green-500/20"
                onClick={handleAcceptCall}
              >
                <PhoneCall className="w-5 h-5 animate-bounce" />
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Call View */}
      {activeCall ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          {/* Main call screen - 3 columns */}
          <div className="lg:col-span-3 flex flex-col gap-4 relative">
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative min-h-[500px] flex items-center justify-center shadow-inner">
              
              {/* Remote stream (main display) */}
              <video
                ref={remoteVideoElementRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />

              {/* Local Stream (PiP display) */}
              <div className="absolute top-4 right-4 w-44 aspect-video bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-10">
                <video
                  ref={localVideoElementRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute bottom-1 left-2 text-[10px] bg-black/60 px-1.5 py-0.5 rounded text-zinc-300">
                  You {screenSharing && "(Sharing)"}
                </div>
              </div>

              {/* Call Details Overlay */}
              <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur border border-zinc-800 px-3 py-1.5 rounded-full text-xs flex items-center gap-2">
                <Circle className="w-3.5 h-3.5 fill-green-500 text-green-500 animate-pulse" />
                <span>Call in progress with <b>{callingUser?.name}</b></span>
              </div>

              {/* Recording Indicator Overlay */}
              {isRecording && (
                <div className="absolute top-4 left-48 bg-red-600/90 text-white border border-red-500 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 animate-pulse shadow-lg">
                  <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                  <span>REC</span>
                </div>
              )}
            </div>

            {/* Calling Bottom Controls Bar */}
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-wrap justify-between items-center gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{callingUser?.name}</span>
                  <span className="text-xs text-zinc-400">{callingUser?.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mute Mic */}
                <Button
                  variant="ghost"
                  onClick={handleToggleMic}
                  className={`w-12 h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    micEnabled
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                  }`}
                  title={micEnabled ? "Mute Mic" : "Unmute Mic"}
                >
                  {micEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </Button>

                {/* Toggle Camera */}
                <Button
                  variant="ghost"
                  onClick={handleToggleVideo}
                  className={`w-12 h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    videoEnabled
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                  }`}
                  title={videoEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </Button>

                {/* Share Screen */}
                <Button
                  variant="ghost"
                  onClick={handleToggleScreenShare}
                  className={`w-12 h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    screenSharing
                      ? "bg-red-600 hover:bg-red-700 text-white border-red-500"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                  }`}
                  title={screenSharing ? "Stop Sharing Screen" : "Share Screen"}
                >
                  {screenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </Button>

                {/* Record session */}
                <Button
                  variant="ghost"
                  onClick={handleToggleRecording}
                  className={`w-12 h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    isRecording
                      ? "bg-red-600 animate-pulse text-white border-red-500"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                  }`}
                  title={isRecording ? "Stop Recording" : "Record Session"}
                >
                  <Circle className={`w-5 h-5 ${isRecording ? "fill-white text-white" : "fill-red-500 text-red-500"}`} />
                </Button>
              </div>

              <div>
                {/* End Call */}
                <Button
                  variant="destructive"
                  className="rounded-full px-6 py-5 flex items-center gap-2 shadow-lg shadow-red-500/20 hover:scale-105 transition-transform"
                  onClick={() => handleEndCallLocal(true)}
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </Button>
              </div>
            </div>
          </div>

          {/* Watch YouTube Together Panel - 1 column */}
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
              <Tv className="w-5 h-5 text-red-500" />
              <h3 className="font-bold text-zinc-200">Watch Together</h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">YouTube Link or Video ID</label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="https://www.youtube.com..."
                  value={ytUrl}
                  onChange={(e) => setYtUrl(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 focus:border-red-500/40 text-xs rounded-lg"
                />
                <Button
                  onClick={loadYoutubeVideo}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-3"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Synchronization Control Utilities */}
            {currentYtVideoId && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleYtSeek}
                  className="w-full text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  Force Sync Time
                </Button>
              </div>
            )}

            {/* Youtube Player Element */}
            <div className="flex-1 min-h-[220px] bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 flex items-center justify-center relative">
              <div id="yt-player" className="w-full h-full" ref={ytPlayerContainerRef}></div>
              {!currentYtVideoId && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-zinc-500 text-xs space-y-2">
                  <Tv className="w-8 h-8 text-zinc-700" />
                  <p>Paste a YouTube URL above and load it to view synchronously during the call.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Setup / Dialer Workspace */
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* User List Panel */}
          <div className="md:col-span-2 bg-zinc-900/60 border border-zinc-800/80 backdrop-blur rounded-3xl p-6 flex flex-col gap-6 shadow-2xl">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100 flex items-center gap-2">
                <Users className="w-6 h-6 text-red-500" />
                Select Friend to Call
              </h2>
              <p className="text-xs text-zinc-400">
                Choose any registered user to initiate a video call. Status updates are real time.
              </p>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
              <Input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-zinc-950 border-zinc-800 focus:border-red-500/50 rounded-xl"
              />
            </div>

            {/* Users grid list */}
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-2 space-y-3">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => {
                  const isOnline = onlineUsers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      className="flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-800/60 rounded-2xl hover:border-zinc-700 hover:bg-zinc-950/80 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={u.image || "https://github.com/shadcn.png"}
                            alt={u.name}
                            className="w-12 h-12 rounded-full border-2 border-zinc-800 object-cover"
                          />
                          <span
                            className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full border-2 border-zinc-900 ${
                              isOnline ? "bg-green-500" : "bg-zinc-600"
                            }`}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-zinc-200 group-hover:text-white transition-colors">
                            {u.name}
                          </span>
                          <span className="text-xs text-zinc-400">{u.email}</span>
                          <span className="text-[10px] mt-1 text-red-500/80 font-mono tracking-wider uppercase">
                            {u.plan} Plan
                          </span>
                        </div>
                      </div>

                      <Button
                        onClick={() => handleInitiateCall(u)}
                        className={`flex items-center gap-2 rounded-xl transition-all shadow-md ${
                          isOnline
                            ? "bg-green-600 hover:bg-green-700 text-white hover:scale-105"
                            : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>Call</span>
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No other registered users found in the system.
                </div>
              )}
            </div>
          </div>

          {/* Quick Info & Guide */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 backdrop-blur rounded-3xl p-6 flex flex-col gap-6 shadow-2xl justify-between">
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-zinc-100">VoIP Call Workspace</h3>
                <p className="text-xs text-zinc-400 mt-1">Connect, Share, and Sync Media</p>
              </div>

              {/* Status card */}
              <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={user.image}
                    alt={user.name}
                    className="w-10 h-10 rounded-full border border-zinc-800 object-cover"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-zinc-400">Signed In As</span>
                    <span className="font-semibold text-zinc-200 text-sm">{user.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 bg-green-500/10 text-green-400 border border-green-500/20 px-2.5 py-1 rounded-full text-[10px] font-semibold animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  Active
                </div>
              </div>

              {/* Feature guide */}
              <div className="space-y-4 text-xs text-zinc-400 leading-relaxed">
                <h4 className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">Key Features</h4>
                <ul className="space-y-3 list-disc pl-4">
                  <li>
                    <b className="text-zinc-200">Video & Audio Call:</b> Native peer-to-peer connection with high-fidelity streaming.
                  </li>
                  <li>
                    <b className="text-zinc-200">YouTube Screen Sharing:</b> Click the monitor button to stream a browser tab or screen capture.
                  </li>
                  <li>
                    <b className="text-zinc-200">Watch Together (Sync):</b> Paste any YouTube URL on the call screen to play it synchronously.
                  </li>
                  <li>
                    <b className="text-zinc-200">Session Recording:</b> Record call audio (both channels mixed) and the active video container. Files save to local storage.
                  </li>
                </ul>
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 text-center border-t border-zinc-800 pt-4">
              YtCl VoIP Engine v1.0.0 &bull; Secure P2P
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
