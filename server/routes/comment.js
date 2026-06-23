import express from "express";
import {
  deletecomment,
  getallcomment,
  postcomment,
  editcomment,
  likecomment,
  dislikecomment,
} from "../controllers/comment.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();
routes.get("/:videoid", getallcomment);                               
routes.post("/postcomment", authMiddleware, postcomment);
routes.delete("/deletecomment/:id", authMiddleware, deletecomment);
routes.post("/editcomment/:id", authMiddleware, editcomment);
routes.patch("/like/:id", authMiddleware, likecomment);
routes.patch("/dislike/:id", authMiddleware, dislikecomment);

export default routes;
