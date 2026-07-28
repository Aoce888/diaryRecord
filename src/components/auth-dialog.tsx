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
import { Mail, Lock, User, Camera } from "lucide-react";
import { toast } from "sonner";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuthSuccess: (user: { id: string; name: string; email: string; avatar?: string }) => void;
}

export function AuthDialog({ open, onOpenChange, onAuthSuccess }: AuthDialogProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.url) {
        setAvatar(data.url);
      }
    } catch {
      toast.error("头像上传失败");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
      const body = isLogin
        ? { email, password }
        : { email, password, name, avatar };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "操作失败");
        return;
      }

      toast.success(isLogin ? "登录成功 🎉" : "注册成功 🎉");
      onAuthSuccess(data);
      onOpenChange(false);
      setEmail("");
      setPassword("");
      setName("");
      setAvatar("");
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
        <DialogHeader>
          <DialogTitle className="text-xl text-center text-pink-600">
            {isLogin ? "登录 🔐" : "注册 ✨"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <div className="relative h-20 w-20 cursor-pointer group">
                  {avatar ? (
                    <Image
                      src={avatar}
                      alt="头像"
                      fill
                      className="rounded-full object-cover border-2 border-pink-200"
                    />
                  ) : (
                    <div className="h-20 w-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center text-2xl font-bold text-white border-2 border-pink-200">
                      <User size={28} />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera size={16} className="text-white" />
                  </div>
                </div>
                <label className="mt-1 cursor-pointer text-xs text-pink-500 hover:text-pink-600">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  {avatar ? "更换" : "上传头像"}
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
                    required={!isLogin}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              邮箱
            </label>
            <div className="relative">
              <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="rounded-xl border-pink-200 pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              密码
            </label>
            <div className="relative">
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" />
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少6位密码"
                className="rounded-xl border-pink-200 pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-pink-400 to-purple-400 py-6 font-bold text-white hover:from-pink-500 hover:to-purple-500"
          >
            {loading ? "处理中..." : isLogin ? "登录" : "注册"}
          </Button>

          <p className="text-center text-sm text-gray-500">
            {isLogin ? "还没有账号？" : "已有账号？"}
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="ml-1 font-medium text-pink-500 hover:underline"
            >
              {isLogin ? "去注册" : "去登录"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
