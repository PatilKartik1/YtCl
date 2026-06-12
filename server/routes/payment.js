import express from "express";
import {
  createOrder,
  verifyPayment,
  downloadVideo,
  getDownloads,
} from "../controllers/payment.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.post("/create-order", authMiddleware, createOrder);
routes.post("/verify", authMiddleware, verifyPayment);
routes.post("/download", authMiddleware, downloadVideo);
routes.get("/downloads", authMiddleware, getDownloads);

export default routes;
