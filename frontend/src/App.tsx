import { useEffect, useState } from "react";
import { api } from "./lib/api";
import { streamChat } from "./lib/sse";
import type { AgentStats, ChatSummary, Message } from "./types";
import { ChatWindow } from "./components/ChatWindow";
import { ContextPanel } from "./components/ContextPanel";
import { Sidebar } from "./components/Sidebar";
import type { ExplorerNode } from "./components/WorkspaceExplorer";

function createPendingAssistant(): Message {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    created_at: new Date().toISOString(),
  };
}

export default function App() {
  const [config, setConfig] = useState<{
    workspaceRoot: string;
    model: string;
  } | null>(null);
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [workspaceNodes, setWorkspaceNodes] = useState<ExplorerNode[]>([]);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [activeFiles, setActiveFiles] = useState<string[]>([]);
  const [agentStats, setAgentStats] = useState<AgentStats | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    void bootstrap();
  }, []);

  async function bootstrap() {
    const [appConfig, chatList, rootTree] = await Promise.all([
      api.getConfig(),
      api.getChats(),
      api.getWorkspaceTree(),
    ]);

    setConfig({
      workspaceRoot: appConfig.workspaceRoot,
      model: appConfig.model,
    });
    setChats(chatList);
    setWorkspaceNodes(rootTree.children as ExplorerNode[]);

    if (chatList[0]) {
      await selectChat(chatList[0].id);
      return;
    }

    await handleCreateChat();
  }

  async function handleCreateChat() {
    const chat = await api.createChat();
    const refreshedChats = await api.getChats();
    setChats(refreshedChats);
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setAgentStats(null);
  }

  async function selectChat(chatId: string) {
    const chat = await api.getChat(chatId);
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    setAgentStats(null);
  }

  async function hydrateDirectory(targetPath: string) {
    const tree = await api.getWorkspaceTree(targetPath);
    setWorkspaceNodes((current) => injectChildren(current, targetPath, tree.children as ExplorerNode[]));
  }

  function injectChildren(
    nodes: ExplorerNode[],
    targetPath: string,
    children: ExplorerNode[],
  ): ExplorerNode[] {
    return nodes.map((node) => {
      if (node.path === targetPath) {
        return { ...node, children };
      }

      if (node.children?.length) {
        return {
          ...node,
          children: injectChildren(node.children, targetPath, children),
        };
      }

      return node;
    });
  }

  async function handleToggleExpand(node: ExplorerNode) {
    const nextExpanded = new Set(expandedPaths);
    if (nextExpanded.has(node.path)) {
      nextExpanded.delete(node.path);
      setExpandedPaths(nextExpanded);
      return;
    }

    nextExpanded.add(node.path);
    setExpandedPaths(nextExpanded);

    if (!node.children && node.hasChildren) {
      await hydrateDirectory(node.path);
    }
  }

  function handleToggleSelect(node: ExplorerNode) {
    const nextSelected = new Set(selectedFiles);
    if (nextSelected.has(node.path)) {
      nextSelected.delete(node.path);
    } else {
      nextSelected.add(node.path);
    }
    setSelectedFiles(nextSelected);
    setActiveFiles(Array.from(nextSelected));
  }

  async function handleSubmit() {
    if (!activeChatId || !input.trim() || isStreaming) {
      return;
    }

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      created_at: new Date().toISOString(),
    };
    const pendingAssistant = createPendingAssistant();
    const attachments = Array.from(selectedFiles);
    const messageText = input.trim();

    setInput("");
    setMessages((current) => [...current, userMessage, pendingAssistant]);
    setIsStreaming(true);
    setAgentStats(null);

    try {
      await streamChat(
        api.baseUrl,
        {
          chat_id: activeChatId,
          message: messageText,
          attachments,
        },
        {
          context: (payload) => {
            setActiveFiles(payload.activeFiles || []);
            setAgentStats((current) => ({
              model: config?.model || "local-model",
              evalCount: current?.evalCount || 0,
              promptEvalCount: current?.promptEvalCount || 0,
              totalDuration: current?.totalDuration || 0,
              estimatedPromptTokens: payload.estimatedPromptTokens || 0,
            }));
          },
          token: (payload) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === pendingAssistant.id
                  ? { ...message, content: message.content + payload.content }
                  : message,
              ),
            );
          },
          done: (payload) => {
            setAgentStats((current) => ({
              model: payload.model || config?.model || "local-model",
              evalCount: payload.evalCount || 0,
              promptEvalCount: payload.promptEvalCount || 0,
              totalDuration: payload.totalDuration || 0,
              estimatedPromptTokens: current?.estimatedPromptTokens || 0,
            }));
          },
          error: (payload) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === pendingAssistant.id
                  ? {
                      ...message,
                      content: `Backend error:\n\n${payload.message}`,
                    }
                  : message,
              ),
            );
          },
        },
      );

      const [chat, refreshedChats] = await Promise.all([
        api.getChat(activeChatId),
        api.getChats(),
      ]);
      setMessages(chat.messages);
      setChats(refreshedChats);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Streaming request failed.";
      setMessages((current) =>
        current.map((item) =>
          item.id === pendingAssistant.id
            ? { ...item, content: `Backend error:\n\n${message}` }
            : item,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  const selectedFileCount = selectedFiles.size;
  const stableStats =
    agentStats || {
      model: config?.model || "local-model",
      evalCount: 0,
      promptEvalCount: 0,
      totalDuration: 0,
      estimatedPromptTokens: 0,
    };

  return (
    <div className="h-screen overflow-hidden bg-haze">
      <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden xl:grid-cols-[320px_minmax(0,1fr)_340px]">
        <Sidebar
          activeChatId={activeChatId}
          chats={chats}
          expandedPaths={expandedPaths}
          nodes={workspaceNodes}
          onCreateChat={handleCreateChat}
          onSelectChat={selectChat}
          onToggleExpand={handleToggleExpand}
          onToggleSelect={handleToggleSelect}
          selectedFiles={selectedFiles}
          workspaceRoot={config?.workspaceRoot || "/workspace"}
        />
        <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden">
          <ChatWindow
            attachmentCount={selectedFileCount}
            input={input}
            isStreaming={isStreaming}
            messages={messages}
            onInputChange={setInput}
            onSubmit={handleSubmit}
          />
        </div>
        <ContextPanel
          activeFiles={activeFiles}
          modelName={config?.model || "local-model"}
          onQuickAction={setInput}
          stats={stableStats}
        />
      </div>
    </div>
  );
}
