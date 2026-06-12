"use client";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { useRouter } from "next/router";
import { useState } from "react";

const plans = [
  {
    id: "bronze",
    name: "Bronze",
    price: 10,
    watchLimit: "7 minutes",
    downloads: "Unlimited",
    color: "bg-amber-700",
  },
  {
    id: "silver",
    name: "Silver",
    price: 50,
    watchLimit: "10 minutes",
    downloads: "Unlimited",
    color: "bg-gray-400",
  },
  {
    id: "gold",
    name: "Gold",
    price: 100,
    watchLimit: "Unlimited",
    downloads: "Unlimited",
    color: "bg-yellow-400",
  },
];

export default function Upgrade() {
  const { user, setUser } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePayment = async (plan: any) => {
    if (!user) return router.push("/login");
    setLoading(plan.id);

    try {
      // Create order on backend
      const { data: order } = await axiosInstance.post(
        "/payment/create-order",
        {
          plan: plan.id,
        },
      );

      // Open Razorpay popup
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "YtCl",
        description: `${plan.name} Plan`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // Verify payment on backend
            const { data } = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              plan: plan.id,
            });

            if (data.success) {
              setUser(data.user);
              alert(
                `🎉 ${plan.name} plan activated! Check your email for invoice.`,
              );
              router.push("/");
            }
          } catch (error) {
            alert("Payment verification failed. Contact support.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: { color: "#FF0000" },
      };

      const razor = new (window as any).Razorpay(options);
      razor.open();
    } catch (error) {
      alert("Something went wrong. Try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <h1 className="text-3xl font-bold text-center mb-2">Upgrade Your Plan</h1>
      <p className="text-center text-gray-500 mb-8">
        Current Plan:{" "}
        <span className="font-semibold capitalize">{user?.plan || "Free"}</span>
      </p>

      {/* Free Plan */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-xl p-6 space-y-3 opacity-60">
          <div className="w-full h-2 rounded bg-gray-200" />
          <h2 className="text-xl font-bold">Free</h2>
          <p className="text-2xl font-bold">₹0</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>⏱ Watch: 5 minutes</li>
            <li>⬇️ Downloads: 1/day</li>
          </ul>
          <button
            disabled
            className="w-full py-2 rounded-lg bg-gray-200 text-gray-500 text-sm"
          >
            Current Free Plan
          </button>
        </div>

        {/* Paid Plans */}
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="border rounded-xl p-6 space-y-3 hover:shadow-lg transition-shadow"
          >
            <div className={`w-full h-2 rounded ${plan.color}`} />
            <h2 className="text-xl font-bold capitalize">{plan.name}</h2>
            <p className="text-2xl font-bold">₹{plan.price}</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>⏱ Watch: {plan.watchLimit}</li>
              <li>⬇️ Downloads: {plan.downloads}</li>
            </ul>
            <button
              onClick={() => handlePayment(plan)}
              disabled={loading === plan.id || user?.plan === plan.id}
              className="w-full py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium disabled:opacity-50"
            >
              {loading === plan.id
                ? "Processing..."
                : user?.plan === plan.id
                  ? "Current Plan"
                  : `Upgrade to ${plan.name}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
