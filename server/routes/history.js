import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
} from "../controllers/history.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:userId", authMiddleware, getallhistoryVideo);
routes.post("/views/:videoId", handleview);                        // public — anonymous view count
routes.post("/:videoId", authMiddleware, handlehistory);
export default routes;
