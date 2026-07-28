"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/star-rating";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, CalendarDays, Utensils, Gamepad2, Clock, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { AddVisitDialog } from "@/components/add-visit-dialog";
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
  createdAt: string;
}

const typeEmoji: Record<string, string> = {
  eating: "🍜",
  playing: "🎮",
};

const typeIcon: Record<string, typeof Utensils> = {
  eating: Utensils,
  playing: Gamepad2,
};

export default function VisitDetail({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { id } = await params;
        const [visitRes, meRes] = await Promise.all([
          fetch(`/api/visits`),
          fetch("/api/auth/me"),
        ]);
        const visitData = await visitRes.json();
        const me = await meRes.json();

        const found = visitData.visits?.find((v: Visit) => v.id === id);
        if (found) {
          setVisit(found);
          setIsOwner(me?.id === found.creatorId);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  const handleDelete = async () => {
    if (!visit || !confirm("确定要删除这条记录吗？")) return;
    try {
      const res = await fetch(`/api/visits/${visit.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("删除成功 🗑️");
        router.push("/");
      } else {
        toast.error("删除失败");
      }
    } catch {
      toast.error("删除失败");
    }
  };

  const handleUpdate = async (data: any) => {
    if (!visit) return;
    try {
      const res = await fetch(`/api/visits/${visit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, date: data.date.toISOString() }),
      });
      if (res.ok) {
        const updated = await res.json();
        setVisit(updated);
        setEditOpen(false);
        toast.success("更新成功 ✨");
      } else {
        toast.error("更新失败");
      }
    } catch {
      toast.error("更新失败");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-4xl animate-bounce">📝</div>
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">😢</div>
          <p className="text-lg text-gray-400">记录不存在</p>
          <Button onClick={() => router.push("/")} className="mt-4 rounded-xl">
            返回首页
          </Button>
        </div>
      </div>
    );
  }

  const TypeIcon = typeIcon[visit.type] || Utensils;
  const emoji = typeEmoji[visit.type] || "📍";

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-pink-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="rounded-xl text-gray-600 hover:bg-pink-50"
          >
            <ArrowLeft size={18} className="mr-1" />
            返回
          </Button>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button
                  onClick={() => setEditOpen(true)}
                  variant="outline"
                  className="rounded-xl border-pink-200 text-pink-500"
                >
                  <Edit size={16} className="mr-1" />
                  编辑
                </Button>
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Detail */}
      <main className="mx-auto max-w-3xl px-4 py-6">
        {/* Name + Type */}
        <div className="mb-6 flex items-center gap-3">
          <span className="text-4xl">{emoji}</span>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-800">{visit.name}</h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <TypeIcon size={14} className="text-green-500" />
              <span>{visit.type === "eating" ? "美食" : "游玩"}</span>
              <span className="text-green-600 font-medium">¥{visit.cost}/人</span>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 shadow-sm border border-pink-50">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <MapPin size={14} className="text-pink-400" />
              地点
            </div>
            <p className="font-medium text-gray-800">{visit.location}</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-pink-50">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CalendarDays size={14} className="text-blue-400" />
              日期
            </div>
            <p className="font-medium text-gray-800">
              {format(new Date(visit.date), "yyyy年MM月dd日", { locale: zhCN })}
            </p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-pink-50">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <StarRating rating={visit.rating} size={16} />
            </div>
            <p className="text-sm text-gray-400">评分</p>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm border border-pink-50">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Clock size={14} className="text-purple-400" />
              创建时间
            </div>
            <p className="font-medium text-gray-800 text-sm">
              {format(new Date(visit.createdAt), "MM月dd日 HH:mm", { locale: zhCN })}
            </p>
          </div>
        </div>

        {/* Tags */}
        {visit.tags.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2">
            {visit.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full bg-pink-50 px-3 py-1 text-sm text-pink-500"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Photos */}
        {visit.photos.length > 0 && (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-gray-500">照片 ({visit.photos.length})</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {visit.photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative aspect-square overflow-hidden rounded-xl border border-pink-100 bg-white"
                >
                  <Image
                    src={photo.url}
                    alt={`${visit.name} - 照片${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {visit.notes && (
          <div className="rounded-xl bg-white p-4 shadow-sm border border-pink-50">
            <h3 className="mb-2 text-sm font-medium text-gray-500">备注</h3>
            <p className="whitespace-pre-wrap text-gray-700">{visit.notes}</p>
          </div>
        )}

        {/* Creator */}
        <div className="mt-6 flex items-center gap-2 text-sm text-gray-400">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-[10px] font-bold text-white">
              {visit.creatorName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span>由 {visit.creatorName} 创建</span>
        </div>
      </main>

      {/* Edit Dialog */}
      {isOwner && (
        <AddVisitDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={handleUpdate}
          initialData={{
            id: visit.id,
            type: visit.type,
            name: visit.name,
            location: visit.location,
            date: new Date(visit.date),
            cost: visit.cost.toString(),
            rating: visit.rating,
            notes: visit.notes || "",
            tags: visit.tags,
            photos: visit.photos.map((p) => p.url),
          }}
        />
      )}
    </div>
  );
}
