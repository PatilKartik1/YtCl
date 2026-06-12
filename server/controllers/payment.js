import "../config.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";

console.log("KEY ID:", process.env.RAZORPAY_KEY_ID);

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Plan prices in paise (1 INR = 100 paise)
const planPrices = {
  bronze: 1000, // ₹10
  silver: 5000, // ₹50
  gold: 10000, // ₹100
  premium: 100, // ₹1 for download premium (test)
};

// Create Razorpay order
export const createOrder = async (req, res) => {
  const { plan } = req.body;
  try {
    const order = await razorpay.orders.create({
      amount: planPrices[plan],
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });
    return res.status(200).json(order);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Order creation failed" });
  }
};

// Verify payment and update user plan
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    userId,
    plan,
  } = req.body;

  console.log("Order ID:", razorpay_order_id);
  console.log("Payment ID:", razorpay_payment_id);
  console.log("Signature received:", razorpay_signature);
  console.log("Key Secret being used:", process.env.RAZORPAY_KEY_SECRET);

  try {
    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .toString("hex");

    if (expectedSign !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Update user plan
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: { plan: plan } },
      { new: true },
    );

    // Send email
    await sendInvoiceEmail(updatedUser, plan, razorpay_payment_id);

    return res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Payment verification failed" });
  }
};

// Send invoice email
const sendInvoiceEmail = async (user, plan, paymentId) => {
  const planDetails = {
    bronze: { price: "₹10", watchLimit: "7 minutes", downloads: "Unlimited" },
    silver: { price: "₹50", watchLimit: "10 minutes", downloads: "Unlimited" },
    gold: { price: "₹100", watchLimit: "Unlimited", downloads: "Unlimited" },
    premium: { price: "₹1", watchLimit: "5 minutes", downloads: "Unlimited" },
  };

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: `YtCl - ${plan.toUpperCase()} Plan Activated!`,
    html: `
      <h2>Payment Successful! 🎉</h2>
      <p>Hi ${user.name},</p>
      <p>Your <strong>${plan.toUpperCase()}</strong> plan has been activated.</p>
      <hr/>
      <h3>Invoice Details</h3>
      <p>Plan: ${plan.toUpperCase()}</p>
      <p>Amount Paid: ${planDetails[plan].price}</p>
      <p>Payment ID: ${paymentId}</p>
      <p>Watch Limit: ${planDetails[plan].watchLimit}</p>
      <p>Downloads: ${planDetails[plan].downloads}/day</p>
      <hr/>
      <p>Thank you for upgrading!</p>
      <p>Team YtCl</p>
    `,
  });
};

// Track and handle download
export const downloadVideo = async (req, res) => {
  const { userId, videoId, videoTitle } = req.body;

  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toDateString();
    const lastDownload = user.lastDownloadDate
      ? new Date(user.lastDownloadDate).toDateString()
      : null;

    // Reset count if it's a new day
    if (lastDownload !== today) {
      user.downloadCount = 0;
      user.lastDownloadDate = new Date();
    }

    // Free users limited to 1 download per day
    if (user.plan === "free" && user.downloadCount >= 1) {
      return res.status(403).json({
        message:
          "Free users can only download 1 video per day. Upgrade to premium!",
        limitReached: true,
      });
    }

    // Add to downloads history
    user.downloads.push({ videoId, videoTitle });
    user.downloadCount += 1;
    await user.save();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
