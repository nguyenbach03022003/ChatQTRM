import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

import httpx
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field


APP_TITLE = "Codex Local Agent Backend"
DATA_DIR = Path(os.getenv("DATA_DIR", "data"))
CHATS_FILE = DATA_DIR / "chats.json"
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "/workspace")).resolve()
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:32b")
MAX_CONTEXT_FILES = int(os.getenv("MAX_CONTEXT_FILES", "8"))
MAX_CONTEXT_CHARS_PER_FILE = int(os.getenv("MAX_CONTEXT_CHARS_PER_FILE", "18000"))
MAX_CONTEXT_TOTAL_CHARS = int(os.getenv("MAX_CONTEXT_TOTAL_CHARS", "90000"))

CODE_EXTENSIONS = {
    ".c",
    ".cc",
    ".cpp",
    ".css",
    ".go",
    ".html",
    ".java",
    ".js",
    ".json",
    ".jsx",
    ".md",
    ".php",
    ".py",
    ".rb",
    ".rs",
    ".sh",
    ".sql",
    ".swift",
    ".ts",
    ".tsx",
    ".txt",
    ".vue",
    ".xml",
    ".yaml",
    ".yml",
}


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def ensure_storage() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not CHATS_FILE.exists():
        CHATS_FILE.write_text("[]", encoding="utf-8")


def load_chats() -> list[dict[str, Any]]:
    ensure_storage()
    with CHATS_FILE.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_chats(chats: list[dict[str, Any]]) -> None:
    ensure_storage()
    with CHATS_FILE.open("w", encoding="utf-8") as file:
        json.dump(chats, file, indent=2)


def safe_workspace_path(relative_path: str | None) -> Path:
    target = (WORKSPACE_ROOT / (relative_path or "")).resolve()
    if WORKSPACE_ROOT not in {target, *target.parents}:
        raise HTTPException(status_code=400, detail="Path escapes the workspace root.")
    return target


def read_context_files(paths: list[str]) -> tuple[list[dict[str, Any]], int]:
    context_files: list[dict[str, Any]] = []
    total_chars = 0

    for raw_path in paths[:MAX_CONTEXT_FILES]:
        file_path = safe_workspace_path(raw_path)
        if not file_path.exists() or not file_path.is_file():
            continue

        suffix = file_path.suffix.lower()
        if suffix and suffix not in CODE_EXTENSIONS:
            continue

        content = file_path.read_text(encoding="utf-8", errors="ignore")
        truncated = False
        if len(content) > MAX_CONTEXT_CHARS_PER_FILE:
            content = content[:MAX_CONTEXT_CHARS_PER_FILE]
            truncated = True

        if total_chars + len(content) > MAX_CONTEXT_TOTAL_CHARS:
            remaining = max(0, MAX_CONTEXT_TOTAL_CHARS - total_chars)
            content = content[:remaining]
            truncated = True

        if not content:
            continue

        total_chars += len(content)
        context_files.append(
            {
                "path": raw_path.replace("\\", "/"),
                "content": content,
                "truncated": truncated,
                "size": file_path.stat().st_size,
            }
        )

        if total_chars >= MAX_CONTEXT_TOTAL_CHARS:
            break

    return context_files, total_chars


def build_system_prompt(context_files: list[dict[str, Any]]) -> str:
    base_prompt = (
        "You are an autonomous senior software engineering agent inside a local developer "
        "workspace. Be concise, accurate, and practical. When code context is provided, "
        "ground your answer in those files. Explain tradeoffs, call out risks, and return "
        "production-ready suggestions."
    )

    if not context_files:
        return base_prompt

    context_sections = []
    for item in context_files:
        marker = " (truncated)" if item["truncated"] else ""
        context_sections.append(
            f"FILE: {item['path']}{marker}\n```text\n{item['content']}\n```"
        )

    return f"{base_prompt}\n\nWorkspace context:\n\n" + "\n\n".join(context_sections)


def estimate_tokens(char_count: int) -> int:
    return max(1, char_count // 4)


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    role: str
    content: str
    created_at: str = Field(default_factory=utc_now)


class ChatSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    title: str = "New Chat"
    created_at: str = Field(default_factory=utc_now)
    updated_at: str = Field(default_factory=utc_now)
    messages: list[Message] = Field(default_factory=list)


class ChatRequest(BaseModel):
    chat_id: str
    message: str
    attachments: list[str] = Field(default_factory=list)


class CreateChatRequest(BaseModel):
    title: str | None = None


class UpdateChatRequest(BaseModel):
    title: str


class ChatSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int


app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    ensure_storage()


def get_chat_or_404(chat_id: str) -> dict[str, Any]:
    chats = load_chats()
    for chat in chats:
        if chat["id"] == chat_id:
            return chat
    raise HTTPException(status_code=404, detail="Chat not found.")


def update_chat(updated_chat: dict[str, Any]) -> None:
    chats = load_chats()
    for index, chat in enumerate(chats):
        if chat["id"] == updated_chat["id"]:
            chats[index] = updated_chat
            save_chats(chats)
            return
    raise HTTPException(status_code=404, detail="Chat not found.")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/config")
async def get_config() -> dict[str, str]:
    return {
        "workspaceRoot": str(WORKSPACE_ROOT),
        "model": OLLAMA_MODEL,
        "ollamaBaseUrl": OLLAMA_BASE_URL,
    }


@app.get("/api/chats", response_model=list[ChatSummary])
async def list_chats() -> list[ChatSummary]:
    chats = load_chats()
    chats.sort(key=lambda item: item["updated_at"], reverse=True)
    return [
        ChatSummary(
            id=chat["id"],
            title=chat["title"],
            created_at=chat["created_at"],
            updated_at=chat["updated_at"],
            message_count=len(chat["messages"]),
        )
        for chat in chats
    ]


@app.post("/api/chats", response_model=ChatSession)
async def create_chat(payload: CreateChatRequest) -> ChatSession:
    chat = ChatSession(title=(payload.title or "New Chat").strip() or "New Chat")
    chats = load_chats()
    chats.append(chat.model_dump())
    save_chats(chats)
    return chat


@app.get("/api/chats/{chat_id}", response_model=ChatSession)
async def get_chat(chat_id: str) -> ChatSession:
    return ChatSession.model_validate(get_chat_or_404(chat_id))


@app.patch("/api/chats/{chat_id}", response_model=ChatSummary)
async def rename_chat(chat_id: str, payload: UpdateChatRequest) -> ChatSummary:
    chat = get_chat_or_404(chat_id)
    title = payload.title.strip() or "New Chat"
    chat["title"] = title
    chat["updated_at"] = utc_now()
    update_chat(chat)
    return ChatSummary(
        id=chat["id"],
        title=chat["title"],
        created_at=chat["created_at"],
        updated_at=chat["updated_at"],
        message_count=len(chat["messages"]),
    )


@app.delete("/api/chats/{chat_id}", status_code=204)
async def delete_chat(chat_id: str) -> Response:
    chats = load_chats()
    remaining = [chat for chat in chats if chat["id"] != chat_id]
    if len(remaining) == len(chats):
        raise HTTPException(status_code=404, detail="Chat not found.")
    save_chats(remaining)
    return Response(status_code=204)


@app.get("/api/workspace/tree")
async def get_workspace_tree(path: str = Query(default="")) -> dict[str, Any]:
    target = safe_workspace_path(path)
    if not target.exists() or not target.is_dir():
        raise HTTPException(status_code=404, detail="Folder not found.")

    children = []
    for item in sorted(target.iterdir(), key=lambda entry: (entry.is_file(), entry.name.lower())):
        if item.name.startswith(".git"):
            continue
        children.append(
            {
                "name": item.name,
                "path": str(item.relative_to(WORKSPACE_ROOT)).replace("\\", "/"),
                "type": "file" if item.is_file() else "directory",
                "hasChildren": item.is_dir() and any(
                    not child.name.startswith(".git") for child in item.iterdir()
                ),
            }
        )

    return {
        "path": str(target.relative_to(WORKSPACE_ROOT)).replace("\\", "/")
        if target != WORKSPACE_ROOT
        else "",
        "name": target.name if target != WORKSPACE_ROOT else WORKSPACE_ROOT.name,
        "children": children,
    }


@app.get("/api/workspace/file")
async def get_workspace_file(path: str) -> dict[str, Any]:
    target = safe_workspace_path(path)
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    content = target.read_text(encoding="utf-8", errors="ignore")
    return {
        "path": path.replace("\\", "/"),
        "content": content[:MAX_CONTEXT_CHARS_PER_FILE],
        "truncated": len(content) > MAX_CONTEXT_CHARS_PER_FILE,
    }


@app.post("/api/context/files")
async def parse_context_files(payload: dict[str, list[str]]) -> dict[str, Any]:
    attachments = payload.get("attachments", [])
    files, total_chars = read_context_files(attachments)
    return {
        "files": [
            {
                "path": file["path"],
                "truncated": file["truncated"],
                "size": file["size"],
            }
            for file in files
        ],
        "estimatedTokens": estimate_tokens(total_chars),
    }


@app.post("/api/chat/stream")
async def stream_chat(payload: ChatRequest) -> StreamingResponse:
    chat = get_chat_or_404(payload.chat_id)
    user_message = Message(role="user", content=payload.message)
    chat["messages"].append(user_message.model_dump())
    chat["updated_at"] = utc_now()
    if chat["title"] == "New Chat":
        chat["title"] = payload.message[:48].strip() or "New Chat"
    update_chat(chat)

    context_files, total_context_chars = read_context_files(payload.attachments)
    system_prompt = build_system_prompt(context_files)
    model_messages = [{"role": "system", "content": system_prompt}]
    model_messages.extend(
        {"role": message["role"], "content": message["content"]}
        for message in chat["messages"]
    )

    async def event_generator():
        assistant_chunks: list[str] = []
        try:
            initial_payload = {
                "activeFiles": [item["path"] for item in context_files],
                "estimatedPromptTokens": estimate_tokens(
                    total_context_chars
                    + sum(len(message["content"]) for message in chat["messages"])
                    + len(system_prompt)
                ),
            }
            yield f"event: context\ndata: {json.dumps(initial_payload)}\n\n"

            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": OLLAMA_MODEL,
                        "messages": model_messages,
                        "stream": True,
                        "options": {
                            "temperature": 0.2,
                        },
                    },
                ) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        data = json.loads(line)
                        if data.get("done"):
                            meta = {
                                "model": data.get("model", OLLAMA_MODEL),
                                "evalCount": data.get("eval_count", 0),
                                "promptEvalCount": data.get("prompt_eval_count", 0),
                                "totalDuration": data.get("total_duration", 0),
                            }
                            yield f"event: done\ndata: {json.dumps(meta)}\n\n"
                            break

                        chunk = data.get("message", {}).get("content", "")
                        if not chunk:
                            continue
                        assistant_chunks.append(chunk)
                        yield f"event: token\ndata: {json.dumps({'content': chunk})}\n\n"

            assistant_message = Message(role="assistant", content="".join(assistant_chunks))
            refreshed_chat = get_chat_or_404(payload.chat_id)
            refreshed_chat["messages"].append(assistant_message.model_dump())
            refreshed_chat["updated_at"] = utc_now()
            update_chat(refreshed_chat)
        except httpx.HTTPError as exc:
            error_payload = {"message": f"Ollama request failed: {exc}"}
            yield f"event: error\ndata: {json.dumps(error_payload)}\n\n"
        except Exception as exc:  # pragma: no cover - defensive path
            error_payload = {"message": f"Unexpected backend error: {exc}"}
            yield f"event: error\ndata: {json.dumps(error_payload)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@app.exception_handler(HTTPException)
async def http_exception_handler(_, exc: HTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
