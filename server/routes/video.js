import express from "express";
import { getallvideo, uploadvideo, getChannelVideos } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.post("/upload", authMiddleware, upload.single("file"), uploadvideo);
routes.get("/getall", getallvideo);
routes.get("/channel/:uploaderId", getChannelVideos); // public — view channel videos
export default routes;
