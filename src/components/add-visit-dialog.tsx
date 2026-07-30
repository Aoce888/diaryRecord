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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { StarRating } from "./star-rating";
import { CalendarIcon, Plus, X, Upload } from "lucide-react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { toast } from "sonner";
import { uploadImage } from "@/lib/qiniu-uploader";

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

interface AddVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: VisitFormData) => Promise<void>;
  initialData?: VisitFormData & { id: string };
  userId?: string | number;
}

const TYPE_OPTIONS = [
  { value: "eating", label: "🍜 美食" },
  { value: "playing", label: "🎮 游玩" },
];

const TAG_SUGGESTIONS = [
  "火锅",
  "烤肉",
  "日料",
  "西餐",
  "中餐",
  "小吃",
  "甜品",
  "咖啡",
  "奶茶",
  "公园",
  "电影",
  "逛街",
  "游戏",
  "旅行",
  "展览",
];

export function AddVisitDialog({
  open,
  onOpenChange,
  onSave,
  initialData,
  userId,
}: AddVisitDialogProps) {
  const [form, setForm] = useState<VisitFormData>(
    initialData || {
      type: TYPE_OPTIONS[0].value,
      name: "",
      location: "",
      date: new Date(),
      cost: "",
      rating: 5,
      notes: "",
      tags: [],
      photos: [],
    }
  );
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !userId) return;

    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const url = await uploadImage(file, userId, "photos");
          urls.push(url);
        } catch {
          // 单张失败继续上传其余
        }
      }
      if (urls.length > 0) {
        setForm((prev) => ({ ...prev, photos: [...prev.photos, ...urls] }));
        toast.success(`照片上传成功 ${urls.length} 张 📸`);
      } else {
        toast.error("照片上传失败");
      }
    } catch {
      toast.error("照片上传失败");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addTag = (tag: string) => {
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({
      ...prev,
      tags: prev.tags.filter((t) => t !== tag),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("请填写地点名称");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
      toast.success(initialData ? "更新成功 ✨" : "记录成功 🎉");
      onOpenChange(false);
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-2xl border-2 border-pink-200 bg-gradient-to-br from-white to-pink-50">
        <DialogHeader>
          <DialogTitle className="text-xl text-pink-600">
            {initialData ? "编辑记录 ✏️" : "新增记录 ✨"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              类型
            </label>
            <Select
              value={form.type}
              onValueChange={(v) => v && setForm((prev) => ({ ...prev, type: v }))}
            >
              <SelectTrigger className="rounded-xl border-pink-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name & Location */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              地点名称
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="如：海底捞火锅"
              className="rounded-xl border-pink-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              详细地址
            </label>
            <Input
              value={form.location}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, location: e.target.value }))
              }
              placeholder="如：北京市朝阳区XX路XX号"
              className="rounded-xl border-pink-200"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              日期
            </label>
            <Popover>
              <PopoverTrigger>
                <Button
                  variant="outline"
                  className="w-full justify-start rounded-xl border-pink-200 font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-pink-400" />
                  {format(form.date, "yyyy年MM月dd日", { locale: zhCN })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.date}
                  onSelect={(d) => d && setForm((prev) => ({ ...prev, date: d }))}
                  locale={zhCN}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Cost & Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                人均价格（元）
              </label>
              <Input
                type="number"
                value={form.cost}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, cost: e.target.value }))
                }
                placeholder="0"
                className="rounded-xl border-pink-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                评分
              </label>
              <div className="flex h-10 items-center">
                <StarRating
                  rating={form.rating}
                  onChange={(r) => setForm((prev) => ({ ...prev, rating: r }))}
                  interactive
                  size={28}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              标签
            </label>
            <div className="flex flex-wrap gap-2">
              {form.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-pink-100 px-3 py-1 text-sm text-pink-600"
                >
                  {tag}
                  <button onClick={() => removeTag(tag)}>
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (addTag(tagInput), e.preventDefault())}
                placeholder="输入标签回车添加"
                className="h-8 rounded-xl border-pink-200 text-sm"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {TAG_SUGGESTIONS.filter((t) => !form.tags.includes(t))
                .slice(0, 8)
                .map((tag) => (
                  <button
                    key={tag}
                    onClick={() => addTag(tag)}
                    className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500 hover:bg-pink-100 hover:text-pink-500"
                  >
                    {tag}
                  </button>
                ))}
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              照片
            </label>
            <div className="flex flex-wrap gap-2">
              {form.photos.map((url, i) => (
                <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                  <Image src={url} alt="" fill className="object-cover" />
                  <button
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        photos: prev.photos.filter((_, idx) => idx !== i),
                      }))
                    }
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-pink-300 bg-pink-50/50 text-pink-400 hover:border-pink-400 hover:bg-pink-50">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
                {uploading ? (
                  <span className="text-xs">上传中...</span>
                ) : (
                  <Plus size={24} />
                )}
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600">
              备注
            </label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="记录一下今天的感受..."
              className="rounded-xl border-pink-200"
              rows={3}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-pink-400 to-purple-400 py-6 text-lg font-bold text-white hover:from-pink-500 hover:to-purple-500"
          >
            {saving ? "保存中..." : initialData ? "更新记录" : "添加记录 🎉"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
