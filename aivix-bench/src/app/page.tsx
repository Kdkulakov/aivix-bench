"use client";

import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { useSpeechRecognition } from "../services/useSpeechRecognition";
import { BlockDrawer } from "@/components/BlockDrawer";

export default function Home() {
  const { transcript, status, error, isSupported, backendResult } =
    useSpeechRecognition();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);

  useEffect(() => {
    if (backendResult?.action === "show_blocks_panel") {
      setBlocks(backendResult.blocks || []);
      setCategories(backendResult.categories || []);
      setDrawerOpen(true);
      setSelectedCategory(null);
    }
    if (backendResult?.action === "close_blocks_panel") {
      setDrawerOpen(false);
    }
    if (
      backendResult?.type === "command" &&
      typeof backendResult.command === "string"
    ) {
      const cmd = backendResult.command.toLowerCase();
      if (
        cmd.includes("закрой список блоков") ||
        cmd.includes("закрой панель")
      ) {
        setDrawerOpen(false);
      }
      if (
        cmd.includes("открой список блоков") ||
        cmd.includes("открой панель")
      ) {
        setDrawerOpen(true);
      }
      if (
        cmd.includes("закрой окно") ||
        cmd.includes("убери модалку") ||
        cmd.includes("закрой модалку") ||
        cmd.includes("закрой описание") ||
        cmd.includes("close modal") ||
        cmd.includes("close block") ||
        cmd.includes("hide block") ||
        cmd.includes("закрой блок") ||
        cmd.includes("убери блок") ||
        cmd.includes("закрой моталку") ||
        cmd.includes("скрой моталку")
      ) {
        setSelectedBlock(null);
      }
    }
    if (backendResult?.action === "show_block_details" && backendResult.block) {
      setSelectedBlock(backendResult.block);
      setDrawerOpen(true);
      setSelectedCategory(null);
    }
    if (
      backendResult?.action === "block_not_found" &&
      backendResult.block_name
    ) {
      alert(`Блок с именем '${backendResult.block_name}' не найден`);
    }
  }, [backendResult, selectedBlock]);

  const filteredBlocks = selectedCategory
    ? blocks.filter((b: any) => b.category === selectedCategory)
    : blocks;

  return (
    <div className="flex flex-col min-h-screen items-center justify-center gap-8 p-8">
      <h1 className="text-3xl font-bold mb-4">Aivix Bench</h1>
      {!isSupported && (
        <div className="text-red-500">
          Speech Recognition не поддерживается в этом браузере
        </div>
      )}
      {isSupported && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xl">
          <div className="flex items-center gap-2">
            <span
              className={
                status === "listening"
                  ? "w-3 h-3 rounded-full bg-green-500 animate-pulse"
                  : status === "error"
                  ? "w-3 h-3 rounded-full bg-red-500"
                  : "w-3 h-3 rounded-full bg-gray-400"
              }
            />
            <span className="text-sm text-muted-foreground">
              {status === "listening" && "Слушаю..."}
              {status === "idle" && "Ожидание"}
              {status === "error" && "Ошибка"}
            </span>
          </div>
          {error && <div className="text-red-500 text-sm">Ошибка: {error}</div>}
          <div className="w-full bg-muted rounded-lg p-8 text-center text-muted-foreground border border-dashed border-gray-300 min-h-[80px]">
            {transcript ? transcript : "Говорите что-нибудь..."}
          </div>
        </div>
      )}
      <BlockDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        blocks={filteredBlocks}
        categories={categories}
        onCategorySelect={setSelectedCategory}
        selectedBlock={selectedBlock}
        setSelectedBlock={setSelectedBlock}
      />
    </div>
  );
}
