import re
from fastapi import FastAPI, WebSocket, Request, Depends, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import openai
from dotenv import load_dotenv
import os
import httpx
from sqlalchemy.future import select
from sqlalchemy.exc import NoResultFound
from db import get_db
from models import BlockMetadata, Base
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime
from sqlalchemy import update
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Для разработки, поменять на проде
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0"))
LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "100"))

class VoiceCommand(BaseModel):
    text: str

class RelevantBlocksRequest(BaseModel):
    query: str

def ask_llm_for_intent(text: str) -> dict:
    prompt = (
        "Ты ассистент, который определяет, является ли фраза командой для автоматизации (например, 'создай блок', 'запусти процесс') или обычным текстом для общения. "
        "Ответь строго в формате JSON: {\"type\": \"command\", \"command\": \"...\"} или {\"type\": \"text\", \"text\": \"...\"}.\n"
        f"Фраза: {text}"
    )
    print(f"[OPENAI REQUEST] prompt={prompt!r}")
    try:
        response = openai.ChatCompletion.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            api_key=OPENAI_API_KEY,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )
        answer = response.choices[0].message.content
        print(f"[OPENAI RESPONSE] {answer!r}")
        import json
        return json.loads(answer)
    except Exception as e:
        print(f"[OPENAI ERROR] {e}")
        return {"type": "text", "text": text}

def parse_command(text: str):
    # Ключевые слова и формы для команд (можно расширять)
    command_keywords = [
        "команда", "запусти", "запустить", "запуск", "создай", "создать", "создан", "созданию", "создаём", "создавать",
        "начать", "начни", "начнём", "добавь", "добавить", "добавляем", "добавление",
        "удали", "удалить", "удаляем", "удаление", "открой", "открыть", "включи", "выключи",
        "собери", "собрать", "сборка", "построй", "построить", "сделай", "сделать", "сделаем",
        "start", "run", "create", "add", "delete", "open", "enable", "disable", "build"
    ]
    lowered = text.lower().strip()
    for kw in command_keywords:
        # Ищем ключевое слово как отдельное слово в любом месте фразы
        if f" {kw} " in f" {lowered} ":
            return {"type": "command", "command": text}
    # Если не распознано — спрашиваем LLM
    return ask_llm_for_intent(text)

async def fetch_n8n_blocks(db: AsyncSession, category: str = None, search: str = None):
    print("[n8n-blocks] fetch from DB only (no n8n API call)...")
    cats_result = await db.execute(select(BlockMetadata.category).distinct())
    categories = [c[0] for c in cats_result.fetchall() if c[0]]

    query = select(BlockMetadata)
    if category:
        query = query.where(BlockMetadata.category.ilike(f"%{category}%"))
    if search:
        query = query.where(BlockMetadata.name.ilike(f"%{search}%"))
    result = await db.execute(query)
    blocks = result.scalars().all()
    print(f"[n8n-blocks] returning {len(blocks)} blocks after filter")

    summary = [
        {
            "block_id": b.block_id,
            "name": b.name,
            "category": b.category,
            "description": b.description,
            "custom_description": b.custom_description,
            "tags": b.tags,
            "user_id": b.user_id,
        }
        for b in blocks
    ]
    return {
        "categories": categories,
        "blocks": summary,
        "upserted": [],
    }

@app.post("/api/process-command")
async def process_command(command: VoiceCommand, request: Request, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    print(f"[POST /api/process-command] from {request.client.host}: {command.text}")
    parsed = parse_command(command.text)
    if parsed["type"] == "command":
        print(f"[COMMAND] {parsed['command']}")
        cmd = parsed["command"].lower()
        # Голосовое открытие деталей блока
        import re
        m = re.search(r"покажи (?:настройки |описание |входные данные |выходные данные |)?блок[а]? ([\w\- ]+)", cmd)
        if not m:
            m = re.search(r"открой (?:настройки |описание |входные данные |выходные данные |)?блок[а]? ([\w\- ]+)", cmd)
        if not m:
            m = re.search(r"show (?:settings |description |input |output |)?block ([\w\- ]+)", cmd)
        if not m:
            m = re.search(r"open (?:settings |description |input |output |)?block ([\w\- ]+)", cmd)
        if m:
            block_name = m.group(1).strip()
            print(f"[process_command] поиск блока по имени: {block_name}")
            result = await db.execute(select(BlockMetadata).where(BlockMetadata.name.ilike(f"%{block_name}%")))
            meta = result.scalars().first()
            if meta:
                block = {
                    "block_id": meta.block_id,
                    "name": meta.name,
                    "category": meta.category,
                    "description": meta.description,
                    "custom_description": meta.custom_description,
                    "tags": meta.tags,
                    "user_id": meta.user_id,
                    "inputSchema": getattr(meta, "inputSchema", {}),
                    "outputSchema": getattr(meta, "outputSchema", {}),
                }
                return {
                    "action": "show_block_details",
                    "block": block,
                }
            else:
                return {"action": "block_not_found", "block_name": block_name}
        # Если не сработал regexp — открываем панель блоков
        if ("покажи" in cmd or "открой" in cmd or "show" in cmd or "open" in cmd) and ("блок" in cmd or "block" in cmd or "боковок" in cmd or "меню" in cmd):
            print("[process_command] auto-fetching blocks for UI panel")
            data = await fetch_n8n_blocks(db)
            blocks = data["blocks"]
            categories = data["categories"]
            return {
                "action": "show_blocks_panel",
                "blocks": jsonable_encoder(blocks),
                "categories": categories,
            }
        return {
            "type": "command",
            "command": parsed["command"],
            "blocks": ["example_block_1"],
            "questions": ["Что дальше?"],
        }
    else:
        print(f"[TEXT] {parsed['text']}")
        return {
            "type": "text",
            "text": parsed["text"],
            "message": "Не распознано как команда"
        }

@app.get("/api/blocks")
async def get_blocks(request: Request) -> List[Dict[str, Any]]:
    print(f"[GET /api/blocks] from {request.client.host}")
    # TODO: вернуть реальный каталог блоков n8n
    return [
        {"id": "block1", "name": "HTTP Request"},
        {"id": "block2", "name": "Set Variable"},
    ]

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    print(f"[WS /ws] accepted connection from {websocket.client.host}")
    try:
        while True:
            data = await websocket.receive_text()
            print(f"[WS /ws] received: {data}")
            # TODO: обработка real-time команд
            await websocket.send_json({"echo": data})
    except Exception as e:
        print(f"WebSocket error: {e}")

@app.get("/api/n8n-blocks")
async def get_blocks(
    category: str = Query(None),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    return await fetch_n8n_blocks(db, category, search)

@app.get("/api/n8n-blocks/{block_id}")
async def get_block(block_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BlockMetadata).where(BlockMetadata.block_id == block_id))
    meta = result.scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "block_id": meta.block_id,
        "name": meta.name,
        "category": meta.category,
        "description": meta.description,
        "custom_description": meta.custom_description,
        "tags": meta.tags,
        "user_id": meta.user_id,
    }

# CRUD для block_metadata

class BlockMetadataIn(BaseModel):
    block_id: str
    custom_description: str = None
    tags: List[str] = []
    user_id: int = None

@app.post("/api/block-metadata")
async def create_block_metadata(data: BlockMetadataIn, db: AsyncSession = Depends(get_db)):
    meta = BlockMetadata(**data.dict())
    db.add(meta)
    await db.commit()
    await db.refresh(meta)
    return meta

@app.get("/api/block-metadata/{block_id}")
async def get_block_metadata(block_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(BlockMetadata).where(BlockMetadata.block_id == block_id))
    meta = result.scalar_one_or_none()
    if not meta:
        raise HTTPException(status_code=404, detail="Not found")
    return meta

@app.post("/api/relevant-blocks")
async def relevant_blocks(
    data: RelevantBlocksRequest = Body(...),
    db: AsyncSession = Depends(get_db)
):
    # Получаем все блоки
    result = await db.execute(select(BlockMetadata))
    blocks = result.scalars().all()
    block_list = [
        {
            "block_id": b.block_id,
            "name": b.name,
            "category": b.category,
            "description": b.description,
            "custom_description": b.custom_description,
            "tags": b.tags,
        }
        for b in blocks
    ]
    # Формируем prompt для OpenAI
    prompt = (
        "Вот список блоков n8n (каждый с block_id, name, description, category, tags):\n"
        f"{block_list}\n"
        f"Пользователь хочет: '{data.query}'.\n"
        "Выбери подходящие блоки, опиши порядок их использования, верни JSON строго в формате: {\"block_ids\": [block_id, ...], \"process_description\": \"...\"}."
    )
    try:
        response = openai.ChatCompletion.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            api_key=OPENAI_API_KEY,
            temperature=LLM_TEMPERATURE,
            max_tokens=LLM_MAX_TOKENS,
        )
        answer = response.choices[0].message.content
        import json
        parsed = json.loads(answer)
        relevantBlockIds = parsed.get("block_ids", [])
        processDescription = parsed.get("process_description", "")
    except Exception as e:
        print(f"[OPENAI ERROR] {e}")
        relevantBlockIds = []
        processDescription = ""
    return {
        "relevantBlockIds": relevantBlockIds,
        "processDescription": processDescription,
        "blocks": block_list,
    } 