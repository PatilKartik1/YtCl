import express from "express";
import {
  getallhistoryVideo,
  handlehistory,
  handleview,
} from "../controllers/history.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();
routes.get("/", authMiddleware, getallhistoryVideo);
routes.post("/views/:videoId", handleview);                        
routes.post("/:videoId", authMiddleware, handlehistory);
export default routes;
