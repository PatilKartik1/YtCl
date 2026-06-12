import mongoose from "mongoose";

const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  city: { type: String, default: "" },
  joinedon: { type: Date, default: Date.now },

  // Plan fields
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },

  // Download tracking
  downloadCount: { type: Number, default: 0 },
  lastDownloadDate: { type: Date, default: null },

  // Downloads history
  downloads: [
    {
      videoId: { type: mongoose.Schema.Types.ObjectId, ref: "videofiles" },
      videoTitle: { type: String },
      downloadedAt: { type: Date, default: Date.now },
    },
  ],
});

export default mongoose.model("user", userschema);
