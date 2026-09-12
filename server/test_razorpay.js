import dotenv from "dotenv";
dotenv.config();

import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID?.trim(),
  key_secret: process.env.RAZORPAY_KEY_SECRET?.trim(),
});

async function test() {
  try {
    const order = await razorpay.orders.create({
      amount: 1000,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    console.log("Success:", order);
  } catch (error) {
    console.error("Error:", error);
  }
}

test();
