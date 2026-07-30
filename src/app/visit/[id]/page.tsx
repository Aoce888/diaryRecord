"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/star-rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageZoom } from "@/components/image-zoom";
import { ArrowLeft, MapPin, CalendarDays, Utensils, Gamepad2, Clock, Edit, Trash2, Pencil, LogIn } from "lucide-react";
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
  photos: string[];
  creatorName: string;
  creatorId: string;
  creatorAvatar?: string | null;
  createdAt: string;
  editors: string[];
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

type EditStatus =
  | "none"        // not logged in
  | "creator"     // is the creator
  | "editor"      // approved editor
  | "pending"     // has pending request
  | "canApply";   // logged in but no permission yet

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
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<EditStatus>("none");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { id } = await params;
        const [visitRes, meRes] = await Promise.all([
          fetch(`/api/visits/${id}`),
          fetch("/api/auth/me"),
        ]);

        if (!visitRes.ok) {
          setLoading(false);
          return;
        }

        const visitData = await visitRes.json();
        const me = meRes.ok ? await meRes.json() : null;

        setVisit(visitData);
        setUser(me);

        // Determine edit status
        if (!me) {
          setEditStatus("none");
        } else if (me.id === visitData.creatorId) {
          setEditStatus("creator");
        } else if (visitData.editors?.includes(me.id)) {
          setEditStatus("editor");
        } else {
          // Check if has pending request
          const reqRes = await fetch(`/api/visits/${id}/edit-requests`);
          if (reqRes.ok) {
            const requests = await reqRes.json();
            const pending = requests.find((r: any) => r.requesterId === me.id && r.status === "pending");
            setEditStatus(pending ? "pending" : "canApply");
          } else {
            setEditStatus("canApply");
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setUserLoading(false);
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

  const handleApplyEdit = async () => {
    if (!visit || !user) return;
    setApplying(true);
    try {
      const res = await fetch(`/api/visits/${visit.id}/edit-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setEditStatus("pending");
        toast.success("已发送编辑申请，等待创建者审批 ✉️");
      } else {
        toast.error(data.error || "申请失败");
      }
    } catch {
      toast.error("申请失败");
    } finally {
      setApplying(false);
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
  const canEdit = editStatus === "creator" || editStatus === "editor";

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
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setEditOpen(true)}
                variant="outline"
                className="rounded-xl border-pink-200 text-pink-500"
              >
                <Edit size={16} className="mr-1" />
                编辑
              </Button>
              {editStatus === "creator" && (
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          )}
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
            <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <span>由</span>
              <Avatar className="h-4 w-4">
                {visit.creatorAvatar && (
                  <AvatarImage src={visit.creatorAvatar} alt={visit.creatorName} className="object-cover" />
                )}
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-[7px] font-bold text-white">
                  {visit.creatorName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-gray-500 font-medium">{visit.creatorName}</span>
              <span>创建</span>
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
            <ImageZoom
              images={visit.photos.map((url, i) => ({ url, alt: `${visit.name} - 照片${i + 1}` }))}
            >
              {() => (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visit.photos.map((url, i) => (
                    <div
                      key={url}
                      className="relative aspect-square overflow-hidden rounded-xl border border-pink-100 bg-white transition-transform duration-200 hover:scale-105"
                    >
                      <Image
                        src={url}
                        alt={`${visit.name} - 照片${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </ImageZoom>
          </div>
        )}

        {/* Notes */}
        {visit.notes && (
          <div className="rounded-xl bg-white p-4 shadow-sm border border-pink-50">
            <h3 className="mb-2 text-sm font-medium text-gray-500">备注</h3>
            <p className="whitespace-pre-wrap text-gray-700">{visit.notes}</p>
          </div>
        )}

        {/* Edit action bar (below content) */}
        {!canEdit && (
          <div className="mt-8 border-t border-pink-100 pt-6">
            {editStatus === "pending" && (
              <div className="flex items-center justify-center gap-2 rounded-xl bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-600">
                <Clock size={16} />
                编辑申请已提交，等待创建者审批
              </div>
            )}
            {editStatus === "canApply" && (
              <Button
                onClick={handleApplyEdit}
                disabled={applying}
                className="w-full rounded-xl bg-gradient-to-r from-purple-400 to-pink-400 py-6 text-lg font-bold text-white hover:from-purple-500 hover:to-pink-500"
              >
                {applying ? (
                  "申请中..."
                ) : (
                  <>
                    <Pencil size={18} className="mr-2" />
                    申请编辑权限
                  </>
                )}
              </Button>
            )}
            {editStatus === "none" && (
              <Button
                onClick={() => router.push("/?login=1")}
                variant="outline"
                className="w-full rounded-xl border-pink-200 py-6 text-lg font-bold text-pink-500 hover:bg-pink-50"
              >
                <LogIn size={18} className="mr-2" />
                登录后查看编辑权限
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Edit Dialog */}
      {canEdit && (
        <AddVisitDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSave={handleUpdate}
          userId={user?.id}
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
            photos: visit.photos,
          }}
        />
      )}
    </div>
  );
}
