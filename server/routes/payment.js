import express from "express";
import {
  createOrder,
  verifyPayment,
  downloadVideo,
} from "../controllers/payment.js";

console.log("KEY ID:", process.env.RAZORPAY_KEY_ID);

const routes = express.Router();

routes.post("/create-order", createOrder);
routes.post("/verify", verifyPayment);
routes.post("/download", downloadVideo);

export default routes;
