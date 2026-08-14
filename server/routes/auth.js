import express from "express";
import { login, updateprofile, getAllUsers } from "../controllers/auth.js";
import authMiddleware from "../middleware/auth.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", authMiddleware, upload.single("image"), updateprofile);
routes.get("/users", authMiddleware, getAllUsers);

export default routes;
