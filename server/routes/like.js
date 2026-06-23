import express from "express";
import { handlelike, getallLikedVideo } from "../controllers/like.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();
routes.get("/", authMiddleware, getallLikedVideo);
routes.post("/:videoId", authMiddleware, handlelike);
export default routes;
