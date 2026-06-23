import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import twilio from "twilio";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// In-memory OTP store for simplicity. (Use Redis in production)
const otpStore = new Map();

// Transporter and Twilio client will be initialized lazily inside sendOtp
// to ensure process.env is fully loaded.

export const sendOtp = async (req, res) => {
  const { email, mobile, isSouthIndia } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  const identifier = isSouthIndia ? email : mobile;
  if (!identifier) {
    return res.status(400).json({ message: "Identifier (email/mobile) is required." });
  }

  // Store OTP with an expiry of 5 minutes
  otpStore.set(identifier, { otp, expiresAt: Date.now() + 5 * 60 * 1000, email, mobile });

  try {
    if (isSouthIndia) {
      // Send OTP via Email
      console.log(`[OTP EMAIL] Sending OTP ${otp} to email: ${email}`);
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: "Your YtCl Login OTP",
          text: `Your OTP is: ${otp}. It is valid for 5 minutes.`,
        });
      } else {
        console.warn("EMAIL_USER or EMAIL_PASS not set in .env. Skipping actual email send.");
      }
    } else {
      // Send OTP via Mobile
      console.log(`[OTP SMS] Sending OTP ${otp} to mobile: ${mobile}`);
      if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
        const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const mobileStr = String(mobile);
        const formattedMobile = mobileStr.startsWith('+') ? mobileStr : `+91${mobileStr}`;
        try {
          await twilioClient.messages.create({
            body: `Your YtCl Login OTP is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedMobile
          });
        } catch (twilioError) {
          console.warn("Twilio failed to send SMS (fallback to simulated OTP):", twilioError.message);
        }
      } else {
        console.warn("Twilio credentials not set in .env. Skipping actual SMS send.");
      }
    }
    return res.status(200).json({ message: "OTP sent successfully", otp });
  } catch (error) {
    console.error("OTP send error:", error);
    return res.status(500).json({ message: "Failed to send OTP", error: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  console.log("verifyOtp called with body:", req.body);
  const { identifier, otp, name, image } = req.body;
  const storedData = otpStore.get(identifier);

  if (!storedData) {
    console.log("verifyOtp failed: OTP expired or not requested for identifier:", identifier);
    return res.status(400).json({ message: "OTP expired or not requested" });
  }

  if (storedData.otp !== otp) {
    console.log("verifyOtp failed: Invalid OTP. Expected", storedData.otp, "got", otp);
    return res.status(400).json({ message: "Invalid OTP" });
  }

  if (Date.now() > storedData.expiresAt) {
    console.log("verifyOtp failed: OTP expired due to time");
    otpStore.delete(identifier);
    return res.status(400).json({ message: "OTP expired" });
  }

  // OTP is valid. Create or login user.
  const { email, mobile } = storedData;
  console.log("OTP valid, creating/fetching user for:", email || mobile);
  try {
    let query = email ? { email } : { mobile };
    let existingUser = await users.findOne(query);

    if (!existingUser) {
      console.log("Creating new user...");
      existingUser = await users.create({ 
        email: email && email.includes("@") ? email : `${mobile}@placeholder.com`, // fallback if only mobile provided
        mobile, 
        name: name || (email && email.includes("@") ? email.split('@')[0] : "User"), 
        image: image || "https://github.com/shadcn.png" 
      });
      console.log("User created:", existingUser._id);
    } else {
      console.log("Found existing user:", existingUser._id);
    }

    const token = signToken(existingUser._id);
    otpStore.delete(identifier); // Clear OTP after success
    console.log("Returning success response");
    return res.status(200).json({ result: existingUser, token });
  } catch (error) {
    console.error("OTP Verification error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;

  try {
    const existingUser = await users.findOne({ email });

    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      const token = signToken(newUser._id);
      return res.status(201).json({ result: newUser, token });
    } else {
      const token = signToken(existingUser._id);
      return res.status(200).json({ result: existingUser, token });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description, city } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(500).json({ message: "User unavailable..." });
  }
  if (_id.toString() !== req.userId.toString()) {
    return res.status(403).json({ message: "Forbidden: You cannot update another user's profile" });
  }
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: {
          channelname: channelname,
          description: description,
          city: city,
        },
      },
      { new: true },
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
