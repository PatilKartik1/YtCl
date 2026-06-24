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

  
  const [socket, setSocket] = useState<Socket | null>(null);
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  
  const [activeCall, setActiveCall] = useState<boolean>(false);
  const [callConnected, setCallConnected] = useState<boolean>(false);
  const [callingUser, setCallingUser] = useState<UserType | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    from: string;
    offer: any;
    callerName: string;
    callerImage: string;
  } | null>(null);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);

  
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);

  
  const [isRecording, setIsRecording] = useState(false);

  
  const [ytUrl, setYtUrl] = useState("");
  const [currentYtVideoId, setCurrentYtVideoId] = useState("");
  const [ytPlayerReady, setYtPlayerReady] = useState(false);

  
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const callingUserIdRef = useRef<string | null>(null); 

  
  const localVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoElementRef = useRef<HTMLVideoElement | null>(null);
  const ytPlayerContainerRef = useRef<HTMLDivElement | null>(null);
  const ytPlayerRef = useRef<any>(null);

  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  
  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      toast.error("Please sign in to access Video Call (VoIP)");
    }
  }, [user]);

  
  useEffect(() => {
    if (!user) return;
    const fetchUsers = async () => {
      try {
        const response = await axiosInstance.get("/user/users");
        
        const filtered = response.data.filter((u: UserType) => u._id !== user._id && u.email !== user.email);
        setUsersList(filtered);
      } catch (error) {
        console.error("Failed to fetch users:", error);
      }
    };
    fetchUsers();
  }, [user]);

  
  useEffect(() => {
    if (!user) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const socketInstance = io(backendUrl);
    setSocket(socketInstance);
    socketRef.current = socketInstance;

    
    socketInstance.emit("register", user._id);

    
    socketInstance.on("user-status-change", (userIds: string[]) => {
      setOnlineUsers(userIds);
    });

    
    socketInstance.on("incoming-call", ({ from, offer, callerName, callerImage }) => {
      if (activeCall || incomingCall) {
        
        socketInstance.emit("end-call", { to: from });
        return;
      }
      setIncomingCall({ from, offer, callerName, callerImage });
      callingUserIdRef.current = from;
    });

    
    socketInstance.on("call-answered", async ({ answer }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setActiveCall(true);
          setCallConnected(true);
          toast.success("Call connected!");
        } catch (error) {
          console.error("Error setting remote description from answer:", error);
        }
      }
    });

    
    socketInstance.on("ice-candidate", async ({ candidate }) => {
      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error("Error adding ice candidate:", error);
        }
      }
    });

    
    socketInstance.on("call-ended", () => {
      handleEndCallLocal(false);
      toast.info("Call ended by remote user");
    });

    socketInstance.on("call-error", ({ message }) => {
      toast.error(message);
      cleanupCallState();
    });

    
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

  useEffect(() => {
    if (activeCall) {
      const playStreams = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (localStreamRef.current && localVideoElementRef.current) {
          localVideoElementRef.current.srcObject = localStreamRef.current;
          try {
            await localVideoElementRef.current.play();
          } catch (e) {
            console.warn("Failed to play local video:", e);
          }
        }

        if (remoteStreamRef.current && remoteVideoElementRef.current) {
          remoteVideoElementRef.current.srcObject = remoteStreamRef.current;
          try {
            await remoteVideoElementRef.current.play();
          } catch (e) {
            console.warn("Failed to play remote video:", e);
          }
        }
      };

      playStreams();
    }
  }, [activeCall, callConnected, screenSharing]);

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
            
            const state = event.data;
            if (!socketRef.current || !callingUserIdRef.current) return;

            if (state === 1) {
              
              const currentTime = ytPlayerRef.current.getCurrentTime();
              socketRef.current.emit("yt-video-action", {
                to: callingUserIdRef.current,
                action: "play",
                time: currentTime,
              });
            } else if (state === 2) {
              
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

  
  const loadYoutubeVideo = () => {
    if (!ytUrl) return;
    let videoId = "";
    
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

  
  const createPeerConnection = (recipientId: string, localStream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ],
    });

    
    localStream.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];
      remoteStreamRef.current = remoteStream;
      if (remoteVideoElementRef.current) {
        remoteVideoElementRef.current.srcObject = remoteStream;
        remoteVideoElementRef.current.play().catch(e => console.warn("Failed to play remote stream ontrack:", e));
      }
    };

    
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

  
  const handleInitiateCall = async (recipient: UserType) => {
    setCallingUser(recipient);
    callingUserIdRef.current = recipient._id;
    setActiveCall(true);
    setCallConnected(false);

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
      setCallConnected(true);
      setIncomingCall(null);
      toast.success("Call connected!");
    } catch (error) {
      console.error("Accept call error:", error);
      cleanupCallState();
    }
  };

  
  const handleDeclineCall = () => {
    if (incomingCall && socketRef.current) {
      socketRef.current.emit("end-call", { to: incomingCall.from });
    }
    setIncomingCall(null);
    callingUserIdRef.current = null;
    toast.info("Call declined.");
  };

  
  const handleToggleScreenShare = async () => {
    if (!peerConnectionRef.current) return;

    if (!screenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true, 
        });
        screenStreamRef.current = stream;

        const videoTrack = stream.getVideoTracks()[0];

        
        const senders = peerConnectionRef.current.getSenders();
        const videoSender = senders.find((s) => s.track && s.track.kind === "video");
        if (videoSender) {
          await videoSender.replaceTrack(videoTrack);
        }

        
        videoTrack.onended = () => {
          stopScreenSharing();
        };

        
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

  
  const handleToggleRecording = async () => {
    if (isRecording) {
      
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      toast.success("Recording stopped and saved to downloads.");
    } else {
      
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioDestination = audioCtx.createMediaStreamDestination();
        let hasAudio = false;

        
        if (localStreamRef.current && localStreamRef.current.getAudioTracks().length > 0) {
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([localStreamRef.current.getAudioTracks()[0]])
          );
          source.connect(audioDestination);
          hasAudio = true;
        }

        
        if (remoteStreamRef.current && remoteStreamRef.current.getAudioTracks().length > 0) {
          const source = audioCtx.createMediaStreamSource(
            new MediaStream([remoteStreamRef.current.getAudioTracks()[0]])
          );
          source.connect(audioDestination);
          hasAudio = true;
        }

        const mixedStream = new MediaStream();

        
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

        
        if (hasAudio) {
          mixedStream.addTrack(audioDestination.stream.getAudioTracks()[0]);
        }

        
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
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    
    setPeerConnection(null);
    setActiveCall(false);
    setCallConnected(false);
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
      {}
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

      {activeCall ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          <div className="lg:col-span-3 flex flex-col gap-4 relative">
            <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden relative min-h-[300px] sm:min-h-[500px] aspect-video sm:aspect-auto flex items-center justify-center shadow-inner">
              
              {screenSharing ? (
                <>
                  <video
                    ref={localVideoElementRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-1"
                  />
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-24 sm:w-44 aspect-video bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-10">
                    <video
                      ref={remoteVideoElementRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-0.5 left-1 text-[8px] sm:text-[10px] bg-black/60 px-1 py-0.5 rounded text-zinc-300">
                      {callingUser?.name}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <video
                    ref={remoteVideoElementRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4 w-24 sm:w-44 aspect-video bg-zinc-950 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-10">
                    <video
                      ref={localVideoElementRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute bottom-0.5 left-1 text-[8px] sm:text-[10px] bg-black/60 px-1 py-0.5 rounded text-zinc-300">
                      You
                    </div>
                  </div>
                </>
              )}

              {!callConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-20 space-y-4">
                  <div className="relative">
                    <img
                      src={callingUser?.image || "https://github.com/shadcn.png"}
                      alt={callingUser?.name}
                      className="w-24 h-24 rounded-full border-4 border-zinc-850 object-cover animate-pulse"
                    />
                    <span className="absolute bottom-1 right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-zinc-900"></span>
                    </span>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-zinc-100">{callingUser?.name}</h3>
                    <p className="text-xs text-zinc-400 mt-1 animate-pulse">Calling...</p>
                  </div>
                </div>
              )}

              <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-col xs:flex-row gap-2 z-10">
                <div className="bg-zinc-950/80 backdrop-blur border border-zinc-800 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs flex items-center gap-1.5">
                  <Circle className={`w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 fill-green-500 text-green-500 ${callConnected ? "animate-pulse" : ""}`} />
                  <span className="max-w-[120px] xs:max-w-none truncate">
                    {callConnected ? (
                      <span>Call with <b>{callingUser?.name}</b></span>
                    ) : (
                      <span>Calling <b>{callingUser?.name}</b>...</span>
                    )}
                  </span>
                </div>
                {isRecording && (
                  <div className="bg-red-600/90 text-white border border-red-500 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-xs flex items-center gap-1.5 animate-pulse shadow-lg w-fit">
                    <span className="w-1.5 h-1.5 sm:w-2.5 sm:h-2.5 rounded-full bg-white"></span>
                    <span>REC</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="flex flex-col text-center sm:text-left">
                  <span className="font-semibold text-sm">{callingUser?.name}</span>
                  <span className="text-xs text-zinc-400">{callingUser?.email}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  onClick={handleToggleMic}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    micEnabled
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                  }`}
                  title={micEnabled ? "Mute Mic" : "Unmute Mic"}
                >
                  {micEnabled ? <Mic className="w-4 h-4 sm:w-5 sm:h-5" /> : <MicOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleToggleVideo}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    videoEnabled
                      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                      : "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                  }`}
                  title={videoEnabled ? "Turn Camera Off" : "Turn Camera On"}
                >
                  {videoEnabled ? <Video className="w-4 h-4 sm:w-5 sm:h-5" /> : <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleToggleScreenShare}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    screenSharing
                      ? "bg-red-600 hover:bg-red-700 text-white border-red-500"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                  }`}
                  title={screenSharing ? "Stop Sharing Screen" : "Share Screen"}
                >
                  {screenSharing ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />}
                </Button>

                <Button
                  variant="ghost"
                  onClick={handleToggleRecording}
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full p-0 flex items-center justify-center border transition-all ${
                    isRecording
                      ? "bg-red-600 animate-pulse text-white border-red-500"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border-zinc-700"
                  }`}
                  title={isRecording ? "Stop Recording" : "Record Session"}
                >
                  <Circle className={`w-4 h-4 sm:w-5 sm:h-5 ${isRecording ? "fill-white text-white" : "fill-red-500 text-red-500"}`} />
                </Button>
              </div>

              <div>
                <Button
                  variant="destructive"
                  className="rounded-full px-5 py-4 sm:px-6 sm:py-5 flex items-center gap-2 shadow-lg shadow-red-500/20 hover:scale-105 transition-transform text-xs sm:text-sm"
                  onClick={() => handleEndCallLocal(true)}
                >
                  <PhoneOff className="w-4 h-4" />
                  End Call
                </Button>
              </div>
            </div>
          </div>

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

            {}
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

            {}
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
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {}
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

            {}
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

            {}
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

          {}
          <div className="bg-zinc-900/60 border border-zinc-800/80 backdrop-blur rounded-3xl p-6 flex flex-col gap-6 shadow-2xl justify-between">
            <div className="space-y-6">
              <div className="border-b border-zinc-800 pb-4">
                <h3 className="text-lg font-bold text-zinc-100">VoIP Call Workspace</h3>
                <p className="text-xs text-zinc-400 mt-1">Connect, Share, and Sync Media</p>
              </div>

              {}
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

              {}
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
