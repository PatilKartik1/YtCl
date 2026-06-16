import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface OTPLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OTPLoginModal: React.FC<OTPLoginModalProps> = ({ isOpen, onClose }) => {
  const { isSouthIndia, login } = useUser();
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"REQUEST" | "VERIFY">("REQUEST");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    try {
      const response = await axiosInstance.post("/user/send-otp", {
        email: identifier,
        mobile: identifier,
        isSouthIndia,
      });
      const testOtp = response.data?.otp;
      toast.success(
        isSouthIndia
          ? `OTP sent to your email! ${testOtp ? `(Test OTP: ${testOtp})` : ""}`
          : `OTP sent to your mobile number! ${testOtp ? `(Test OTP: ${testOtp})` : ""}`
      );
      setStep("VERIFY");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    try {
      const response = await axiosInstance.post("/user/verify-otp", {
        identifier,
        otp,
      });
      login(response.data.result, response.data.token);
      toast.success("Logged in successfully!");
      onClose();
      // Reset state for future logins
      setTimeout(() => {
        setStep("REQUEST");
        setIdentifier("");
        setOtp("");
      }, 500);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Sign in to YtCl</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {step === "REQUEST" ? (
            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
              <div className="text-sm text-gray-500">
                {isSouthIndia
                  ? "Enter your email address to receive an OTP."
                  : "Enter your mobile number to receive an OTP."}
              </div>
              <Input
                placeholder={isSouthIndia ? "Email address" : "Mobile number"}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={loading}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div className="text-sm text-gray-500">
                Enter the 6-digit OTP sent to {identifier}
              </div>
              <Input
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                disabled={loading}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Sign In"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("REQUEST")}
                disabled={loading}
              >
                Change {isSouthIndia ? "Email" : "Mobile"}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OTPLoginModal;
