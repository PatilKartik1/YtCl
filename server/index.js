import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import userroutes from "./routes/auth.js";
import videoroutes from "./routes/video.js";
import likeroutes from "./routes/like.js";
import watchlaterroutes from "./routes/watchlater.js";
import historyrroutes from "./routes/history.js";
import commentroutes from "./routes/comment.js";
import paymentRoutes from "./routes/payment.js";

dotenv.config();
const app = express();
import path from "path";
app.use(cors({
  origin: function (origin, callback) {
    // Allow any origin or localhost
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use("/uploads", express.static(path.join("uploads")));
app.get("/", (req, res) => {
  res.send("You tube backend is working");
});
app.use(bodyParser.json());
app.use("/user", userroutes);
app.use("/video", videoroutes);
app.use("/like", likeroutes);
app.use("/watch", watchlaterroutes);
app.use("/history", historyrroutes);
app.use("/comment", commentroutes);
app.use("/payment", paymentRoutes);
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map();

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.on("register", (userId) => {
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`User registered: ${userId} with socket: ${socket.id}`);
      io.emit("user-status-change", Array.from(onlineUsers.keys()));
    }
  });

  socket.on("call-user", ({ to, offer, callerName, callerImage }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("incoming-call", {
        from: socket.userId,
        offer,
        callerName,
        callerImage
      });
    } else {
      socket.emit("call-error", { message: "User is offline" });
    }
  });

  socket.on("answer-call", ({ to, answer }) => {
    const callerSocketId = onlineUsers.get(to);
    if (callerSocketId) {
      io.to(callerSocketId).emit("call-answered", {
        from: socket.userId,
        answer
      });
    }
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("ice-candidate", {
        from: socket.userId,
        candidate
      });
    }
  });

  socket.on("end-call", ({ to }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("call-ended", {
        from: socket.userId
      });
    }
  });

  socket.on("yt-video-action", ({ to, action, videoId, time }) => {
    const recipientSocketId = onlineUsers.get(to);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("yt-video-action", {
        action,
        videoId,
        time
      });
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
    if (socket.userId) {
      onlineUsers.delete(socket.userId);
      io.emit("user-status-change", Array.from(onlineUsers.keys()));
    }
  });
});

server.listen(PORT, () => {
  console.log(`server running on port ${PORT}`);
});

const DBURL = process.env.DB_URL;
mongoose
  .connect(DBURL)
  .then(() => {
    console.log("Mongodb connected");
  })
  .catch((error) => {
    console.log(error);
  });
