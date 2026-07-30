"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { VisitCard } from "@/components/visit-card";
import { AddVisitDialog } from "@/components/add-visit-dialog";
import { AuthDialog } from "@/components/auth-dialog";
import { ProfileEditDialog } from "@/components/profile-edit-dialog";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, LogIn, LogOut } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Image from "next/image";
import { toast } from "sonner";

interface Visit {
  id: string;
  type: string;
  name: string;
  location: string;
  date: string;
  cost: number;
  rating: number;
  notes?: string;
  tags: string[];
  photos: { id: string; url: string }[];
  creatorName: string;
  creatorId: string;
}

interface VisitFormData {
  type: string;
  name: string;
  location: string;
  date: Date;
  cost: string;
  rating: number;
  notes: string;
  tags: string[];
  photos: string[];
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function Home() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-open login dialog when redirected with ?login=1
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("login") === "1" && !user) {
      setAuthOpen(true);
      router.replace("/");
    }
  }, [user, router]);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }, []);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("type", filterType);
      const res = await fetch(`/api/visits?${params}`);
      const data = await res.json();
      setVisits(data.visits || []);
    } catch (e) {
      console.error("Failed to fetch visits:", e);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    fetchUser();
    fetchVisits();
  }, [fetchUser, fetchVisits]);

  const handleSave = async (data: VisitFormData) => {
    const res = await fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        date: data.date.toISOString(),
      }),
    });
    if (res.ok) {
      fetchVisits();
    } else {
      const err = await res.json();
      toast.error(err.error || "保存失败");
    }
  };

  const handleOpenAdd = () => {
    setDialogOpen(true);
  };

  const handleDelete = async (visitId: string) => {
    if (!confirm("确定要删除这条记录吗？")) return;
    try {
      const res = await fetch(`/api/visits/${visitId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("删除成功 🗑️");
        fetchVisits();
      } else {
        const err = await res.json();
        toast.error(err.error || "删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    toast.success("已退出");
  };

  const filteredVisits = visits.filter((v) =>
    searchQuery
      ? v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.tags.some((t) => t.includes(searchQuery)) ||
        v.creatorName.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="cursor-pointer text-left text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 hover:opacity-80 sm:text-2xl"
          >
            🎉 吃喝玩乐日记
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {userLoading ? null : user ? (
              <>
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 rounded-xl px-2 py-1 transition-colors hover:bg-pink-50"
                >
                  <Avatar className="h-7 w-7 cursor-pointer sm:h-8 sm:w-8">
                    {user.avatar ? (
                      <Image
                        src={user.avatar}
                        alt={user.name}
                        fill
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-xs font-bold text-white">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <span className="hidden text-sm font-medium text-gray-700 sm:inline">
                    {user.name}
                  </span>
                </button>
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="rounded-xl bg-gradient-to-r from-pink-400 to-purple-400 font-bold text-white hover:from-pink-500 hover:to-purple-500"
                  size="sm"
                >
                  <Plus size={16} className="sm:mr-1" />
                  <span className="hidden sm:inline">新增</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="rounded-xl text-gray-500 hover:text-red-500"
                >
                  <LogOut size={18} />
                </Button>
              </>
            ) : (
              <Button
                onClick={() => setAuthOpen(true)}
                variant="outline"
                className="rounded-xl border-pink-200 text-pink-500 hover:bg-pink-50"
              >
                <LogIn size={18} className="mr-1" />
                登录
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="mx-auto max-w-5xl px-4 py-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索地点、标签..."
              className="rounded-xl border-pink-200 pl-10 focus:border-pink-400"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
            <SelectTrigger className="w-[120px] rounded-xl border-pink-200">
              <Filter size={16} className="mr-2 text-pink-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="eating">🍜 美食</SelectItem>
              <SelectItem value="playing">🎮 游玩</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Visit Cards */}
      <main className="mx-auto max-w-5xl px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-4xl animate-bounce">🍜</div>
          </div>
        ) : filteredVisits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-6xl">📝</div>
            <p className="text-lg text-gray-400">还没有记录，{user ? '点击「新增」开始记录吧！' : '登录后开始记录吧！'}</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVisits.map((visit) => (
              <VisitCard
                key={visit.id}
                visit={visit}
                currentUser={user}
                onDelete={visit.creatorId === user?.id ? () => handleDelete(visit.id) : undefined}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Dialog */}
      <AddVisitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        userId={user?.id}
      />

      {/* Auth Dialog */}
      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        onAuthSuccess={(u) => setUser(u)}
      />

      {/* Profile Edit Dialog */}
      {user && (
        <ProfileEditDialog
          open={profileOpen}
          onOpenChange={setProfileOpen}
          currentUser={user}
          onUpdate={(u) => setUser(u)}
        />
      )}
    </div>
  );
}
