"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Camera } from "lucide-react";
import { toast } from "sonner";
import { uploadImage } from "@/lib/qiniu-uploader";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: { id: string; name: string; email: string; avatar?: string };
  onUpdate: (user: { id: string; name: string; email: string; avatar?: string }) => void;
}

export function ProfileEditDialog({
  open,
  onOpenChange,
  currentUser,
  onUpdate,
}: ProfileEditDialogProps) {
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar || "");
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadImage(file, currentUser.id, "avatars");
      setAvatar(url);
    } catch {
      toast.error("头像上传失败");
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("昵称不能为空");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatar }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data);
        toast.success("资料更新成功 ✨");
        onOpenChange(false);
      } else {
        toast.error(data.error || "更新失败");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
        <DialogHeader>
          <DialogTitle className="text-xl text-center text-pink-600">
            编辑资料 ✏️
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative h-24 w-24 cursor-pointer group">
              {avatar ? (
                <Image
                  src={avatar}
                  alt="头像"
                  fill
                  className="rounded-full object-cover border-2 border-pink-200"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-3xl font-bold text-white border-2 border-pink-200">
                  {name.charAt(0)}
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            </div>
            <label className="mt-2 cursor-pointer text-sm text-pink-500 hover:text-pink-600">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              更换头像
            </label>
          </div>

          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              昵称
            </label>
            <div className="relative">
              <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="你的昵称"
                className="rounded-xl border-pink-200 pl-10"
              />
            </div>
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="mb-1 block text-sm text-gray-400">
              邮箱（不可修改）
            </label>
            <Input
              value={currentUser.email}
              disabled
              className="rounded-xl bg-gray-50 text-gray-400"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-400 to-purple-400 py-6 font-bold text-white hover:from-pink-500 hover:to-purple-500"
          >
            {loading ? "保存中..." : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
