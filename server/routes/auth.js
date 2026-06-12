import express from "express";
import { login, updateprofile } from "../controllers/auth.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", authMiddleware, updateprofile);
export default routes;
