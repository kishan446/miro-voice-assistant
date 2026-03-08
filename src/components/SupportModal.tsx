import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Copy, Check, Smartphone, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const UPI_ID = "pkkishan593-1@oksbi";
const MOBILE_NUMBER = "+91 8310818498";

const QUICK_AMOUNTS = [50, 100, 200, 500];

interface SupportModalProps {
  open: boolean;
  onClose: () => void;
}

const SupportModal = ({ open, onClose }: SupportModalProps) => {
  const [copied, setCopied] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(100);

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast.success("UPI ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const getAmount = () => {
    if (customAmount) return parseInt(customAmount, 10);
    return selectedAmount || 100;
  };

  const openUPIApp = (app: "gpay" | "phonepe" | "paytm") => {
    const amount = getAmount();
    const upiBase = `upi://pay?pa=${UPI_ID}&pn=MIRO%20AI&am=${amount}&cu=INR&tn=Support%20MIRO%20Development`;

    // UPI deep links
    const links: Record<string, string> = {
      gpay: upiBase,
      phonepe: upiBase,
      paytm: upiBase,
    };

    window.open(links[app], "_blank");
  };

  const handleRazorpay = () => {
    const amount = getAmount();
    if (!amount || amount < 1) {
      toast.error("Please enter a valid amount");
      return;
    }

    const win = window as any;
    if (!win.Razorpay) {
      toast.error("Razorpay is loading, please try again");
      return;
    }

    const options = {
      key: "rzp_live_YOUR_KEY_HERE", // placeholder — user must replace
      amount: amount * 100,
      currency: "INR",
      name: "MIRO AI Assistant",
      description: "Support MIRO Development ❤️",
      handler: () => {
        toast.success("Thank you for supporting MIRO ❤️");
        onClose();
      },
      prefill: {},
      theme: { color: "#ffffff" },
    };

    const rzp = new win.Razorpay(options);
    rzp.open();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-md bg-card border border-border rounded-2xl p-6 pointer-events-auto overflow-y-auto max-h-[90vh] border-glow"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="text-center mb-6">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="inline-block mb-3"
                >
                  <Heart className="w-10 h-10 text-destructive fill-destructive" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-foreground text-glow tracking-wide">
                  Support MIRO
                </h2>
                <p className="text-muted-foreground text-sm mt-1 font-body">
                  Help keep MIRO running & improving
                </p>
              </div>

              {/* Quick amounts */}
              <div className="mb-5">
                <p className="text-xs text-muted-foreground mb-2 font-body uppercase tracking-wider">
                  Choose Amount
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => {
                        setSelectedAmount(amt);
                        setCustomAmount("");
                      }}
                      className={`py-2 rounded-lg text-sm font-body font-semibold transition-all border ${
                        selectedAmount === amt && !customAmount
                          ? "bg-primary text-primary-foreground border-primary glow-cyan"
                          : "bg-secondary text-secondary-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="Custom amount (₹)"
                  value={customAmount}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedAmount(null);
                  }}
                  className="w-full mt-2 bg-secondary border border-border rounded-lg px-4 py-2 text-foreground font-body text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Razorpay */}
              <button
                onClick={handleRazorpay}
                className="w-full py-3 rounded-xl font-display text-sm font-bold tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-all glow-cyan-strong mb-4"
              >
                Pay with Razorpay
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-body">OR PAY VIA UPI</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* UPI Apps */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: "gpay" as const, label: "Google Pay", color: "from-blue-600 to-green-500" },
                  { id: "phonepe" as const, label: "PhonePe", color: "from-purple-600 to-indigo-500" },
                  { id: "paytm" as const, label: "Paytm", color: "from-sky-500 to-blue-600" },
                ].map((app) => (
                  <button
                    key={app.id}
                    onClick={() => openUPIApp(app.id)}
                    className="flex flex-col items-center gap-1 py-3 rounded-xl border border-border bg-secondary hover:border-primary/50 transition-all group"
                  >
                    <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span className="text-xs font-body text-muted-foreground group-hover:text-foreground transition-colors">
                      {app.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* UPI ID */}
              <div className="bg-secondary/80 border border-border rounded-xl p-4 mb-3">
                <p className="text-xs text-muted-foreground mb-2 font-body uppercase tracking-wider">
                  UPI ID
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-foreground font-mono bg-background/50 rounded-lg px-3 py-2 border border-border">
                    {UPI_ID}
                  </code>
                  <button
                    onClick={copyUPI}
                    className="p-2 rounded-lg border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground transition-all"
                    title="Copy UPI ID"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mobile */}
              <div className="bg-secondary/80 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2 font-body uppercase tracking-wider">
                  Mobile Number (UPI)
                </p>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground font-body">{MOBILE_NUMBER}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SupportModal;
