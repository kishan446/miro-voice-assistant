import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Copy, Check, Smartphone } from "lucide-react";
import { toast } from "sonner";
import gpayLogo from "@/assets/gpay-logo.png";
import phonepeLogo from "@/assets/phonepe-logo.png";
import paytmLogo from "@/assets/paytm-logo.png";

const UPI_ID = "pkkishan593-1@oksbi";
const MOBILE_NUMBER = "+91 8660288613";
const QUICK_AMOUNTS = [50, 100, 200, 500];

// QR code via free API — encodes UPI pay link
const getQRUrl = (amount: number) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    `upi://pay?pa=${UPI_ID}&pn=MIRO%20AI&am=${amount}&cu=INR&tn=Support%20MIRO`
  )}`;

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
    if (customAmount) return parseInt(customAmount, 10) || 100;
    return selectedAmount || 100;
  };

  const openUPIApp = (app: "gpay" | "phonepe" | "paytm") => {
    const amount = getAmount();
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=MIRO%20AI&am=${amount}&cu=INR&tn=Support%20MIRO%20Development`;
    window.open(upiLink, "_blank");
  };

  const handleGenericPay = () => {
    const amount = getAmount();
    if (!amount || amount < 1) {
      toast.error("Please enter a valid amount");
      return;
    }
    const upiLink = `upi://pay?pa=${UPI_ID}&pn=MIRO%20AI&am=${amount}&cu=INR&tn=Support%20MIRO%20Development`;
    window.open(upiLink, "_self");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

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
              <div className="text-center mb-5">
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
              <div className="mb-4">
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

              {/* Pay with button */}
              <button
                onClick={handleGenericPay}
                className="w-full py-3 rounded-xl font-display text-sm font-bold tracking-wider bg-primary text-primary-foreground hover:bg-primary/90 transition-all glow-cyan-strong mb-4"
              >
                Pay with UPI — ₹{getAmount()}
              </button>

              {/* QR Code */}
              <div className="flex flex-col items-center mb-4 bg-secondary/60 border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-3 font-body uppercase tracking-wider">
                  Scan QR to Pay
                </p>
                <div className="bg-foreground rounded-xl p-2">
                  <img
                    src={getQRUrl(getAmount())}
                    alt="UPI QR Code"
                    className="w-40 h-40 rounded-lg"
                    loading="lazy"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2 font-body">
                  ₹{getAmount()} · Any UPI app
                </p>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-body">OR PAY VIA APP</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* UPI Apps with real logos */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { id: "gpay" as const, label: "Google Pay", logo: gpayLogo },
                  { id: "phonepe" as const, label: "PhonePe", logo: phonepeLogo },
                  { id: "paytm" as const, label: "Paytm", logo: paytmLogo },
                ].map((app) => (
                  <button
                    key={app.id}
                    onClick={() => openUPIApp(app.id)}
                    className="flex flex-col items-center gap-2 py-3 rounded-xl border border-border bg-secondary hover:border-primary/50 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-foreground flex items-center justify-center p-1">
                      <img
                        src={app.logo}
                        alt={app.label}
                        className="w-full h-full object-contain"
                      />
                    </div>
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
                    {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
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
