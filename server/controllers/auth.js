import mongoose from "mongoose";
import users from "../Modals/Auth.js";
import jwt from "jsonwebtoken";

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

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
    const updateFields = {
      channelname: channelname,
      description: description,
      city: city,
    };
    if (req.file) {
      updateFields.image = `${req.protocol}://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;
    }

    const updatedata = await users.findByIdAndUpdate(
      _id,
      {
        $set: updateFields,
      },
      { new: true },
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const allUsers = await users.find({}, "name email image plan");
    return res.status(200).json(allUsers);
  } catch (error) {
    console.error("Error fetching all users:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

