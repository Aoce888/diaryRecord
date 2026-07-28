"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "./star-rating";
import { MapPin, CalendarDays, Utensils, Gamepad2, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";

interface VisitCardProps {
  visit: {
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
  };
  currentUser: { id: string; name: string; avatar?: string } | null;
  onDelete?: () => void;
  onEdit?: () => void;
}

const typeEmoji: Record<string, string> = {
  eating: "🍜",
  playing: "🎮",
};

const typeIcon: Record<string, typeof Utensils> = {
  eating: Utensils,
  playing: Gamepad2,
};

export function VisitCard({ visit, currentUser, onDelete, onEdit }: VisitCardProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  const TypeIcon = typeIcon[visit.type] || Utensils;
  const emoji = typeEmoji[visit.type] || "📍";

  const isOwner = currentUser?.id === visit.creatorId;
  const isLoggedIn = !!currentUser;

  const handleClick = () => {
    if (isOwner && onEdit) {
      onEdit();
    } else {
      router.push(`/visit/${visit.id}`);
    }
  };

  const requestEdit = async () => {
    try {
      const res = await fetch(`/api/visits/${visit.id}/edit-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setHasRequested(true);
        toast.success("已发送编辑申请，等待审批 ✉️");
      } else {
        toast.error(data.error || "申请失败");
      }
    } catch {
      toast.error("申请失败");
    }
  };

  return (
    <Card
      className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-pink-100 bg-white/80 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-pink-200/50 hover:border-pink-300"
      onClick={handleClick}
    >
      {/* Owner actions */}
      {isOwner && (
        <div className="absolute right-2 top-2 z-10 flex gap-1">
          {showConfirm ? (
            <div
              className="flex items-center gap-1 rounded-full bg-red-500 px-2 py-1 text-xs text-white shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <span>确认?</span>
              <button
                onClick={() => { onDelete?.(); setShowConfirm(false); }}
                className="font-bold hover:underline"
              >
                是
              </button>
              <button onClick={() => setShowConfirm(false)} className="hover:underline">否</button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }}
              className="rounded-full bg-white/90 p-1.5 text-red-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500 hover:text-white"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Edit request button for non-owners */}
      {!isOwner && isLoggedIn && (
        <div
          className="absolute right-2 top-2 z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {hasRequested ? (
            <div className="rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-600">
              ⏳ 已申请
            </div>
          ) : (
            <button
              onClick={requestEdit}
              className="rounded-full bg-white/90 p-1.5 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-purple-500 hover:text-white"
            >
              <Pencil size={14} />
            </button>
          )}
        </div>
      )}

      {/* Photo or type indicator */}
      {visit.photos.length > 0 ? (
        <div className="relative h-48 w-full overflow-hidden">
          <Image
            src={visit.photos[0].url}
            alt={visit.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute left-2 top-2 rounded-full bg-white/90 p-1">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-[10px] font-bold text-white">
                {visit.creatorName.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="absolute right-2 bottom-2 rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-pink-500">
            {emoji} {visit.type === "eating" ? "美食" : "游玩"}
          </div>
        </div>
      ) : (
        <div className="flex h-48 items-center justify-center bg-gradient-to-br from-pink-100 to-purple-100">
          <span className="text-6xl">{emoji}</span>
        </div>
      )}

      <CardContent className="px-4 pb-4 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <MapPin size={12} className="text-pink-400" />
            <span className="line-clamp-1 max-w-[140px]">{visit.location}</span>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5">
            <TypeIcon size={12} className="text-green-500" />
            <span className="text-xs font-medium text-green-600">
              ¥{visit.cost}/人
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <StarRating rating={visit.rating} size={14} />
          <div className="flex items-center gap-2">
            {visit.tags.length > 0 && (
              <Badge variant="secondary" className="rounded-full bg-pink-50 px-2 py-0 text-xs text-pink-500">
                {visit.tags[0]}
              </Badge>
            )}
            <div className="flex items-center gap-1">
              <Avatar className="h-5 w-5">
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-400 text-[8px] font-bold text-white">
                  {visit.creatorName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-gray-400">
                {format(new Date(visit.date), "MM月dd日", { locale: zhCN })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
