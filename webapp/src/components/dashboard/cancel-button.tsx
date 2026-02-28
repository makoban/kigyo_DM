"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface CancelButtonProps {
  itemId: number;
}

export function CancelButton({ itemId }: CancelButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/cancel-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "キャンセルに失敗しました");
        return;
      }
      // Refresh server component data by re-rendering the page
      router.refresh();
    } catch {
      alert("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCancel}
      disabled={loading}
      className="text-red-500 hover:text-red-600 shrink-0 ml-2"
    >
      {loading ? "..." : "取消"}
    </Button>
  );
}
