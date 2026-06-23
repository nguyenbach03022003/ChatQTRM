# ChatQTRM

ChatQTRM is a Codex Desktop-inspired local AI engineering assistant with a React frontend, FastAPI backend, and Ollama-powered local model runtime.

## Quick Start

1. Copy `.env.example` to `.env` and set `OLLAMA_MODEL` to your installed model tag if needed.
2. Run `docker compose up --build`.
3. Open `http://localhost:3000`.
4. Use the workspace explorer to attach files from the mounted repository and start chatting.

## Notes

- The backend mounts the current repository read-only at `/workspace` so the agent can load code context safely.
- Ollama model files persist inside the `ollama-data` Docker volume.
- If your Qwen model already exists in Ollama, `ollama-init` will simply reuse it after the pull check.
