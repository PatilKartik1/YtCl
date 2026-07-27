import express from "express";
import { login, updateprofile, getAllUsers } from "../controllers/auth.js";
import authMiddleware from "../middleware/auth.js";

const routes = express.Router();

routes.post("/login", login);
routes.patch("/update/:id", authMiddleware, updateprofile);
routes.get("/users", authMiddleware, getAllUsers);

export default routes;
