# ChatQTRM

ChatQTRM is a Codex Desktop-inspired local AI engineering assistant with a React frontend, FastAPI backend, and Ollama-powered local model runtime.

> **Windows desktop app:** a native Tauri v2 build (project-scoped file tools,
> integrated PTY terminal, git, skills, secure key storage, streaming local
> models) lives alongside the web app and reuses the same React UI.
> See **[DESKTOP.md](./DESKTOP.md)** for architecture and build/packaging steps.

## Quick Start

1. Copy `.env.example` to `.env` and set `OLLAMA_MODEL` to your installed model tag if needed.
   Use `OLLAMA_NUM_CTX` to control the Ollama context window, for example `8192` or `16384`.
2. Run `docker compose up --build`.
3. Open `http://localhost:3000`.
4. Use the workspace explorer to attach files from the mounted repository and start chatting.

## Notes

- The backend mounts the current repository read-only at `/workspace` so the agent can load code context safely.
- Ollama model files persist inside the `ollama-data` Docker volume.
- If your Qwen model already exists in Ollama, `ollama-init` will simply reuse it after the pull check.
- The Ollama container requests all available GPUs through Docker Compose. NVIDIA GPU support still requires Docker Desktop/WSL2 and the NVIDIA Container Toolkit/driver stack to be installed on the host.
