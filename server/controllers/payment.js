import "../config.js";
import Razorpay from "razorpay";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils.js";
import users from "../Modals/Auth.js";
import nodemailer from "nodemailer";

const getRazorpaySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID?.trim(),
  key_secret: getRazorpaySecret(),
});

// Plan prices in paise (1 INR = 100 paise)
const planPrices = {
  bronze: 1000, // ₹10
  silver: 5000, // ₹50
  gold: 10000, // ₹100
  premium: 100, // ₹1 for download premium (test)
};

const validPlans = ["bronze", "silver", "gold"];

// Create Razorpay order
export const createOrder = async (req, res) => {
  const { plan } = req.body;

  if (!validPlans.includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

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

const verifyRazorpayPayment = async ({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const secret = getRazorpaySecret();
  if (!secret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured");
  }

  const orderId = String(razorpay_order_id).trim();
  const paymentId = String(razorpay_payment_id).trim();
  const signature = String(razorpay_signature).trim();

  const signatureValid = validatePaymentVerification(
    { order_id: orderId, payment_id: paymentId },
    signature,
    secret,
  );

  if (signatureValid) return true;

  // Fallback: confirm payment directly with Razorpay API
  const payment = await razorpay.payments.fetch(paymentId);
  return (
    payment.order_id === orderId &&
    ["captured", "authorized"].includes(payment.status)
  );
};

// Verify payment and update user plan
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
  } = req.body;
  const userId = req.userId;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification fields" });
  }

  if (!validPlans.includes(plan)) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

  try {
    const isValid = await verifyRazorpayPayment({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    });

    if (!isValid) {
      return res.status(400).json({
        message:
          "Payment verification failed. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env match your Razorpay test dashboard keys.",
      });
    }

    // Update user plan in DB
    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: { plan: plan } },
      { new: true },
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send invoice email — non-fatal: don't let email failure block payment success
    try {
      await sendInvoiceEmail(updatedUser, plan, razorpay_payment_id);
    } catch (emailError) {
      console.warn("Invoice email failed (non-critical):", emailError.message);
    }

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
      <p>Downloads: ${planDetails[plan].downloads}</p>
      <hr/>
      <p>Thank you for upgrading!</p>
      <p>Team YtCl</p>
    `,
  });
};

// Track and handle download
export const downloadVideo = async (req, res) => {
  const { videoId, videoTitle } = req.body;
  const userId = req.userId;

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

    // Free users limited to 1 download per day; paid plans get unlimited
    if (user.plan === "free" && user.downloadCount >= 1) {
      return res.status(403).json({
        message:
          "Free users can only download 1 video per day. Upgrade to a premium plan!",
        limitReached: true,
      });
    }

    // Add to downloads history
    user.downloads.push({ videoId, videoTitle });
    user.downloadCount += 1;
    await user.save();

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Get user's download history with populated video details
export const getDownloads = async (req, res) => {
  try {
    const user = await users
      .findById(req.userId)
      .populate({ path: "downloads.videoId", model: "videofiles" });

    if (!user) return res.status(404).json({ message: "User not found" });

    const downloads = [...user.downloads]
      .sort(
        (a, b) =>
          new Date(b.downloadedAt).getTime() -
          new Date(a.downloadedAt).getTime(),
      )
      .filter((dl) => dl.videoId);

    return res.status(200).json({
      downloads,
      plan: user.plan,
      downloadCount: user.downloadCount,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
