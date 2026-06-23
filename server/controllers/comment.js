import comment from "../Modals/comment.js";
import mongoose from "mongoose";

export const postcomment = async (req, res) => {
  const { commentbody } = req.body;

  const regex = /^[\p{L}\p{M}\p{N}\s]+$/u;

  if (!regex.test(commentbody)) {
    return res.status(400).json({
      message: "Special characters are not allowed",
    });
  }

  const commentdata = { ...req.body, userid: req.userId };
  const postcomment = new comment(commentdata);
  try {
    await postcomment.save();
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const commentvideo = await comment.find({ videoid: videoid });
    return res.status(200).json(commentvideo);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  const userId = req.userId;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }
    if (existingComment.userid.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Forbidden: You cannot delete this comment" });
    }
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  const userId = req.userId;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).send("comment unavailable");
  }
  try {
    const existingComment = await comment.findById(_id);
    if (!existingComment) {
      return res.status(404).send("comment unavailable");
    }
    if (existingComment.userid.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Forbidden: You cannot edit this comment" });
    }
    const updatecomment = await comment.findByIdAndUpdate(_id, {
      $set: { commentbody: commentbody },
    }, { new: true });
    res.status(200).json(updatecomment);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const likecomment = async (req, res) => {
  const { id } = req.params;
  const userid = req.userId;

  try {
    const commentdata = await comment.findById(id);

    if (!commentdata) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Initialize arrays if they don't exist (schema migration fallback)
    if (!commentdata.likes) commentdata.likes = [];
    if (!commentdata.dislikes) commentdata.dislikes = [];

    // Convert ObjectId array to strings for safe comparison
    const alreadyLiked = commentdata.likes.some(
      (like) => like && like.toString() === userid.toString(),
    );

    if (alreadyLiked) {
      // Remove the like using filter
      commentdata.likes = commentdata.likes.filter(
        (like) => like && like.toString() !== userid.toString(),
      );
    } else {
      // Add the like — mongoose will auto-convert string to ObjectId
      commentdata.likes.push(new mongoose.Types.ObjectId(userid));
    }

    await commentdata.save();
    return res.status(200).json(commentdata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const userid = req.userId;

  try {
    const commentdata = await comment.findById(id);

    if (!commentdata) {
      return res.status(404).json({ message: "Comment not found" });
    }

    // Initialize arrays if they don't exist (schema migration fallback)
    if (!commentdata.likes) commentdata.likes = [];
    if (!commentdata.dislikes) commentdata.dislikes = [];

    // Toggle dislike
    const alreadyDisliked = commentdata.dislikes.some(
      (dislike) => dislike && dislike.toString() === userid.toString(),
    );

    if (alreadyDisliked) {
      // Remove dislike
      commentdata.dislikes = commentdata.dislikes.filter(
        (dislike) => dislike && dislike.toString() !== userid.toString(),
      );
    } else {
      // Add dislike
      commentdata.dislikes.push(new mongoose.Types.ObjectId(userid));

      // Auto-remove comment if dislikes reach 2
      if (commentdata.dislikes.length >= 2) {
        await comment.findByIdAndDelete(id);
        return res.status(200).json({ deleted: true });
      }
    }

    await commentdata.save();
    return res.status(200).json(commentdata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
