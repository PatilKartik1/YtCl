import video from "../Modals/video.js";
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";

ffmpeg.setFfprobePath(ffprobeStatic.path);

const getVideoDuration = (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) reject(err);
      else resolve(Math.floor(metadata.format.duration)); // duration in seconds
    });
  });
};

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  }
  try {
    // Get real duration from the uploaded file
    const duration = await getVideoDuration(req.file.path);

    const file = new video({
      videotitle: req.body.videotitle,
      filename: req.file.originalname,
      filepath: req.file.path,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader,
      duration: duration,
    });
    await file.save();
    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error("error:", error);
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Failed to delete orphaned upload file:", err);
      });
    }
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getChannelVideos = async (req, res) => {
  const { uploaderId } = req.params;
  try {
    const videos = await video.find({ uploader: uploaderId }).sort({ createdAt: -1 });
    return res.status(200).json(videos);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
