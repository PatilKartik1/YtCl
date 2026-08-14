import { useRouter } from "next/router";
import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { useRef } from "react";

const Channeldialogue = ({ isopen, onclose, channeldata, mode }: any) => {
  const { user, login } = useUser();
  
  
  
  
  
  
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    city: "",
  });
  const [isSubmitting, setisSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (channeldata && mode === "edit") {
      setFormData({
        name: channeldata.name || "",
        description: channeldata.description || "",
        city: channeldata.city || "",
      });
    } else {
      setFormData({
        name: user?.name || "",
        description: "",
        city: user?.city || "",
      });
    }
  }, [channeldata]);
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handlesubmit = async (e: FormEvent) => {
    e.preventDefault();
    setisSubmitting(true);
    const formdata = new FormData();
    formdata.append("channelname", formData.name);
    formdata.append("description", formData.description);
    formdata.append("city", formData.city);
    if (imageFile) {
      formdata.append("image", imageFile);
    }
    try {
      const response = await axiosInstance.patch(
        `/user/update/${user._id}`,
        formdata,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      login(response?.data);
      router.push(`/channel/${user?._id}`);
      setFormData({
        name: "",
        description: "",
        city: "",
      });
      setImageFile(null);
      setPreviewImage(null);
      onclose();
    } catch (error) {
      console.error(error);
    } finally {
      setisSubmitting(false);
    }
  };
  return (
    <Dialog open={isopen} onOpenChange={onclose}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create your channel" : "Edit your channel"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handlesubmit} className="space-y-6">
          <div className="flex justify-center mb-2 mt-4">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="w-20 h-20 border-2 border-primary cursor-pointer">
                <AvatarImage src={previewImage || user?.image} className="object-cover" />
                <AvatarFallback>{formData.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-medium">Edit</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Channel Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Enter your city"
            />
          </div>

          {}
          <div className="space-y-2">
            <Label htmlFor="description">Channel Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Tell viewers about your channel..."
            />
          </div>

          <DialogFooter className="flex justify-between sm:justify-between">
            <Button type="button" variant="outline" onClick={onclose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : mode === "create"
                  ? "Create Channel"
                  : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default Channeldialogue;
