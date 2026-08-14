import video from "../Modals/video.js";
import ffmpeg from "fluent-ffmpeg";
import ffprobeStatic from "ffprobe-static";
import fs from "fs";

ffmpeg.setFfprobePath(ffprobeStatic.path);

const getVideoDuration = (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metadata) => {
      if (err) reject(err);
      else resolve(Math.floor(metadata.format.duration)); 
    });
  });
};

export const uploadvideo = async (req, res) => {
  if (!req.files || !req.files.file) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  }
  try {
    const videoFile = req.files.file[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    const duration = await getVideoDuration(videoFile.path);

    const file = new video({
      videotitle: req.body.videotitle,
      filename: videoFile.originalname,
      filepath: videoFile.path,
      filetype: videoFile.mimetype,
      filesize: videoFile.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader,
      duration: duration,
      thumbnailPath: thumbnailFile ? thumbnailFile.path.replace(/\\/g, "/") : "",
    });
    await file.save();
    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error("error:", error);
    if (req.files && req.files.file && req.files.file[0].path) {
      fs.unlink(req.files.file[0].path, (err) => {
        if (err) console.error("Failed to delete orphaned upload file:", err);
      });
    }
    if (req.files && req.files.thumbnail && req.files.thumbnail[0].path) {
      fs.unlink(req.files.thumbnail[0].path, (err) => {
        if (err) console.error("Failed to delete orphaned thumbnail file:", err);
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
