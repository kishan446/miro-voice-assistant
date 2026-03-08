import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Copy, Check, Smartphone, QrCode, ChevronRight, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import gpayLogo from "@/assets/gpay-logo.png";
import phonepeLogo from "@/assets/phonepe-logo.png";
import paytmLogo from "@/assets/paytm-logo.png";

const UPI_ID = "pkkishan593-1@oksbi";
const MOBILE_NUMBER = "+91 8660288613";
const QUICK_AMOUNTS = [50, 100, 200, 500];

const getQRUrl = (amount: number) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
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
  const [showQR, setShowQR] = useState(false);

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    setCopied(true);
    toast.success("UPI ID copied to clipboard!");
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05, delayChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={onClose}
          />

          {/* Modal container */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative w-full max-w-[420px] pointer-events-auto overflow-hidden rounded-3xl"
              initial={{ scale: 0.92, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 30, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow:
                  "0 0 0 1px hsl(var(--border)), 0 0 40px hsl(var(--primary) / 0.08), 0 25px 50px -12px rgba(0,0,0,0.7)",
              }}
            >
              {/* Gradient top bar */}
              <div className="h-1 w-full bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

              <div className="bg-card overflow-y-auto max-h-[85vh] p-5 sm:p-6">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">

                  {/* Close button */}
                  <motion.button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-10 w-8 h-8 rounded-full bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-4 h-4" />
                  </motion.button>

                  {/* Header */}
                  <motion.div variants={itemVariants} className="text-center mb-6 pt-1">
                    <div className="relative inline-flex items-center justify-center mb-4">
                      {/* Pulse rings */}
                      <motion.div
                        className="absolute w-16 h-16 rounded-full border border-destructive/20"
                        animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
                      />
                      <motion.div
                        className="absolute w-16 h-16 rounded-full border border-destructive/20"
                        animate={{ scale: [1, 1.5, 1.5], opacity: [0.5, 0, 0] }}
                        transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut", delay: 0.8 }}
                      />
                      <motion.div
                        className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center"
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      >
                        <Heart className="w-7 h-7 text-destructive fill-destructive" />
                      </motion.div>
                    </div>
                    <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-wide">
                      Support MIRO
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1.5 font-body leading-relaxed">
                      Your support keeps this AI assistant alive & evolving
                    </p>
                  </motion.div>

                  {/* Amount selection */}
                  <motion.div variants={itemVariants} className="mb-5">
                    <label className="text-[11px] text-muted-foreground font-body uppercase tracking-[0.15em] font-semibold mb-2.5 block">
                      Select Amount
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {QUICK_AMOUNTS.map((amt) => {
                        const isActive = selectedAmount === amt && !customAmount;
                        return (
                          <motion.button
                            key={amt}
                            onClick={() => {
                              setSelectedAmount(amt);
                              setCustomAmount("");
                            }}
                            className={`relative py-2.5 rounded-xl text-sm font-body font-bold transition-all border overflow-hidden ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-secondary/60 text-secondary-foreground border-border hover:border-muted-foreground/30 hover:bg-secondary"
                            }`}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            style={
                              isActive
                                ? { boxShadow: "0 0 20px hsl(var(--primary) / 0.25), 0 4px 12px hsl(var(--primary) / 0.15)" }
                                : {}
                            }
                          >
                            {isActive && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-t from-primary/0 to-primary/20"
                                layoutId="amount-highlight"
                              />
                            )}
                            <span className="relative">₹{amt}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="relative mt-2.5">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-body">₹</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="Enter custom amount"
                        value={customAmount}
                        onChange={(e) => {
                          setCustomAmount(e.target.value);
                          setSelectedAmount(null);
                        }}
                        className="w-full bg-secondary/40 border border-border rounded-xl pl-8 pr-4 py-2.5 text-foreground font-body text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/60 focus:bg-secondary/60 transition-all"
                      />
                    </div>
                  </motion.div>

                  {/* Primary pay button */}
                  <motion.div variants={itemVariants} className="mb-5">
                    <motion.button
                      onClick={handleGenericPay}
                      className="w-full py-3.5 rounded-2xl font-display text-sm font-bold tracking-wider bg-primary text-primary-foreground transition-all relative overflow-hidden group"
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        boxShadow: "0 0 30px hsl(var(--primary) / 0.2), 0 8px 24px hsl(var(--primary) / 0.12)",
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Pay ₹{getAmount()} via UPI
                      </span>
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary-foreground/10 to-primary/0"
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      />
                    </motion.button>
                  </motion.div>

                  {/* QR Code toggle */}
                  <motion.div variants={itemVariants} className="mb-5">
                    <button
                      onClick={() => setShowQR(!showQR)}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                          <QrCode className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-body font-semibold text-foreground block leading-tight">
                            Scan QR Code
                          </span>
                          <span className="text-[11px] font-body text-muted-foreground">
                            Works with any UPI app
                          </span>
                        </div>
                      </div>
                      <motion.div animate={{ rotate: showQR ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showQR && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col items-center pt-4 pb-2">
                            <div className="relative p-3 rounded-2xl bg-foreground">
                              <img
                                src={getQRUrl(getAmount())}
                                alt="UPI QR Code"
                                className="w-44 h-44 rounded-xl"
                                loading="lazy"
                              />
                              {/* Center badge */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-10 h-10 rounded-lg bg-primary-foreground flex items-center justify-center shadow-lg">
                                  <span className="font-display text-[10px] font-black text-foreground">UPI</span>
                                </div>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-3 font-body flex items-center gap-1.5">
                              <Shield className="w-3 h-3" />
                              Secure · ₹{getAmount()} · Scan & Pay
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>

                  {/* Divider */}
                  <motion.div variants={itemVariants} className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    <span className="text-[10px] text-muted-foreground/70 font-body tracking-[0.2em] uppercase">
                      Pay via app
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                  </motion.div>

                  {/* UPI Apps */}
                  <motion.div variants={itemVariants} className="grid grid-cols-3 gap-2.5 mb-5">
                    {[
                      { id: "gpay" as const, label: "Google Pay", logo: gpayLogo },
                      { id: "phonepe" as const, label: "PhonePe", logo: phonepeLogo },
                      { id: "paytm" as const, label: "Paytm", logo: paytmLogo },
                    ].map((app) => (
                      <motion.button
                        key={app.id}
                        onClick={() => openUPIApp(app.id)}
                        className="flex flex-col items-center gap-2.5 py-4 px-2 rounded-2xl border border-border bg-secondary/30 hover:bg-secondary/60 hover:border-muted-foreground/30 transition-all group"
                        whileHover={{ scale: 1.03, y: -2 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="w-[52px] h-[52px] rounded-2xl overflow-hidden bg-foreground flex items-center justify-center p-1 shadow-lg shadow-background/50">
                          <img
                            src={app.logo}
                            alt={app.label}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-[11px] font-body font-semibold text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                          {app.label}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>

                  {/* UPI ID & Mobile - Card style */}
                  <motion.div variants={itemVariants} className="space-y-2.5 mb-4">
                    {/* UPI ID */}
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-secondary/20">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <span className="font-display text-[9px] font-black text-muted-foreground">UPI</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider leading-none mb-1">
                          UPI ID
                        </p>
                        <p className="text-sm text-foreground font-mono truncate">{UPI_ID}</p>
                      </div>
                      <motion.button
                        onClick={copyUPI}
                        className="w-9 h-9 rounded-xl border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all shrink-0"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Copy UPI ID"
                      >
                        {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                      </motion.button>
                    </div>

                    {/* Mobile */}
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-border bg-secondary/20">
                      <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Smartphone className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider leading-none mb-1">
                          Mobile Number
                        </p>
                        <p className="text-sm text-foreground font-body">{MOBILE_NUMBER}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Footer trust */}
                  <motion.div variants={itemVariants} className="text-center pt-1 pb-1">
                    <p className="text-[10px] text-muted-foreground/50 font-body flex items-center justify-center gap-1">
                      <Shield className="w-3 h-3" />
                      100% secure · Payments powered by UPI
                    </p>
                  </motion.div>

                </motion.div>
              </div>

              {/* Gradient bottom bar */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SupportModal;
