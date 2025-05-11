import { useState } from "react";

export function BlockDrawer({
  open,
  onOpenChange,
  blocks,
  categories,
  onCategorySelect,
  selectedBlock,
  setSelectedBlock,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  blocks: any[];
  categories: string[];
  onCategorySelect?: (cat: string) => void;
  selectedBlock?: any;
  setSelectedBlock?: (b: any) => void;
}) {
  const [_selectedBlock, _setSelectedBlock] = useState<any>(null);
  const block = selectedBlock !== undefined ? selectedBlock : _selectedBlock;
  const setBlock =
    setSelectedBlock !== undefined ? setSelectedBlock : _setSelectedBlock;
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [relevantBlockIds, setRelevantBlockIds] = useState<string[]>([]);
  const [processDescription, setProcessDescription] = useState("");
  const [allBlocks, setAllBlocks] = useState<any[]>(blocks);

  // Сортировка: сначала релевантные, потом остальные
  let sortedBlocks = blocks;
  if (relevantBlockIds.length > 0) {
    sortedBlocks = [
      ...blocks.filter((b) => relevantBlockIds.includes(b.block_id)),
      ...blocks.filter((b) => !relevantBlockIds.includes(b.block_id)),
    ];
  }

  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeBlocks = Array.isArray(sortedBlocks) ? sortedBlocks : [];

  async function handleSearch() {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/relevant-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: search }),
      });
      const data = await res.json();
      setRelevantBlockIds(data.relevantBlockIds || []);
      setProcessDescription(data.processDescription || "");
      setAllBlocks(data.blocks || blocks);
    } catch (e) {
      setRelevantBlockIds([]);
      setProcessDescription("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Side Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-[50vw] bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{ willChange: "transform" }}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-bold text-lg">Список блоков</div>
          <button
            className="text-gray-400 hover:text-gray-700 text-2xl font-bold px-2"
            onClick={() => onOpenChange(false)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        {/* Поиск процесса */}
        <div className="flex gap-2 p-4 border-b">
          <input
            className="flex-1 border rounded px-2 py-1"
            placeholder="Опиши процесс (например, отправка сообщений по времени)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch();
            }}
            disabled={loading}
          />
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded disabled:opacity-50"
            onClick={handleSearch}
            disabled={loading}
          >
            Найти
          </button>
        </div>
        {/* Описание процесса */}
        {processDescription && (
          <div className="p-4 text-sm text-blue-700 bg-blue-50 border-b border-blue-200">
            {processDescription}
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-2 p-4">
          {safeCategories.length === 0 && (
            <span className="text-xs text-gray-400">Нет категорий</span>
          )}
          {safeCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => onCategorySelect?.(cat)}
              className="p-2 bg-gray-200 rounded max-w-[120px] truncate"
            >
              {cat}
            </button>
          ))}
        </div>
        <div
          className="grid grid-cols-1 gap-2 px-4 overflow-y-auto"
          style={{ maxHeight: "calc(100vh - 220px)" }}
        >
          {safeBlocks.length === 0 && (
            <span className="text-xs text-gray-400">Нет блоков</span>
          )}
          {safeBlocks.map((block) => {
            const isRelevant = relevantBlockIds.includes(block.block_id);
            return (
              <div
                key={block.block_id}
                className={`border rounded p-2 cursor-pointer hover:bg-gray-100 transition-colors ${
                  isRelevant ? "bg-green-100 border-green-500" : ""
                }`}
                onClick={() => setBlock(block)}
              >
                <div className="font-bold">{block.name}</div>
                <div className="text-xs">{block.category}</div>
                {isRelevant && (
                  <div className="text-xs text-green-700 font-semibold">
                    Релевантен процессу
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* Dialog for block details */}
      {block && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setBlock(null)}
        >
          <div
            className="bg-white rounded-lg p-6 min-w-[320px] max-w-[90vw] shadow-xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold px-2"
              onClick={() => setBlock(null)}
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className="font-bold text-lg mb-2">{block.name}</div>
            <div className="text-gray-600 mb-2">
              {block.description || "Описание отсутствует"}
            </div>
            <div className="text-xs text-gray-500 mb-2">
              Категория: {block.category}
            </div>
            {/* Input/Output */}
            {block.inputSchema && (
              <div className="mb-2">
                <div className="font-semibold text-xs">Ввод:</div>
                <pre className="bg-gray-100 rounded p-2 text-xs whitespace-pre-wrap">
                  {JSON.stringify(block.inputSchema, null, 2)}
                </pre>
              </div>
            )}
            {block.outputSchema && (
              <div className="mb-2">
                <div className="font-semibold text-xs">Вывод:</div>
                <pre className="bg-gray-100 rounded p-2 text-xs whitespace-pre-wrap">
                  {JSON.stringify(block.outputSchema, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
