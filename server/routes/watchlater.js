import express from "express";
import {
  getallwatchlater,
  handlewatchlater,
} from "../controllers/watchlater.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();
routes.get("/", authMiddleware, getallwatchlater);
routes.post("/:videoId", authMiddleware, handlewatchlater);
export default routes;
