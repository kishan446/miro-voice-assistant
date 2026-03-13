import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ImagePlus, Camera, Paperclip, X, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChatAttachmentMenuProps {
  disabled?: boolean;
  onFilesAttached: (attachments: AttachmentItem[]) => void;
  onCreateImage: () => void;
}

export interface AttachmentItem {
  name: string;
  type: string;
  url: string;
  preview?: string;
}

const ChatAttachmentMenu = ({ disabled, onFilesAttached, onCreateImage }: ChatAttachmentMenuProps) => {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).slice(0, 5);
    if (fileArr.length === 0) return;

    setUploading(true);
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;
    if (!userId) {
      toast.error("Please sign in to upload files");
      setUploading(false);
      return;
    }

    const attachments: AttachmentItem[] = [];

    for (const file of fileArr) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`);
        continue;
      }

      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;

      const { error } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type });

      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: signedData } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 3600);

      if (signedData?.signedUrl) {
        attachments.push({
          name: file.name,
          type: file.type,
          url: signedData.signedUrl,
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
        });
      }
    }

    if (attachments.length > 0) {
      onFilesAttached(attachments);
      toast.success(`${attachments.length} file${attachments.length > 1 ? "s" : ""} attached`);
    }

    setUploading(false);
    setOpen(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
    setOpen(false);
  };

  const handleCameraCapture = () => {
    cameraInputRef.current?.click();
    setOpen(false);
  };

  const handleCreateImage = () => {
    setOpen(false);
    onCreateImage();
  };

  const menuItems = [
    { label: "Add photos & files", icon: Paperclip, onClick: handleFileSelect },
    { label: "Take photo", icon: Camera, onClick: handleCameraCapture },
    { label: "Create image", icon: Sparkles, onClick: handleCreateImage },
  ];

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept="image/*,application/pdf,.txt,.csv,.json,.doc,.docx"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />
      <input
        ref={cameraInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        capture="environment"
        onChange={(e) => e.target.files && uploadFiles(e.target.files)}
      />

      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={disabled || uploading}
        className="shrink-0 w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all disabled:opacity-30"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : open ? (
          <X className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-xl overflow-hidden min-w-[200px] z-50"
          >
            {menuItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm font-body text-foreground hover:bg-secondary/60 transition-colors"
              >
                <item.icon className="w-4 h-4 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatAttachmentMenu;
