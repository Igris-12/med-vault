import { useState, useRef, useEffect } from 'react';
import { useChatSessions } from '../api/chat';
import { streamChatMessage } from '../api/chat';

import type { ChatMessage } from '../types/api';
import { Send } from 'lucide-react';

// Markdown-lite renderer (bold, line breaks)
function renderContent(text: string) {
  if (!text) return null;
  return text
    .split('\n')
    .map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <span key={i}>
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j} className="text-text-primary font-semibold">{part}</strong> : part
          )}
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
}

function MessageBubble({ msg, streaming }: { msg: ChatMessage; streaming?: boolean }) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm
        ${isUser ? 'bg-teal text-teal-text' : 'bg-surface border border-border-mid text-text-muted'}`}>
        {isUser ? '👤' : '⚕️'}
      </div>

      <div className={`max-w-[80%] flex flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`rounded-2xl px-4 py-3 font-body text-sm leading-relaxed
          ${isUser
            ? 'bg-teal text-teal-text rounded-tr-sm'
            : 'bg-card border border-border-dim text-text-primary rounded-tl-sm'
          }`}>
          {renderContent(msg.content)}
          {streaming && <span className="inline-block w-1 h-4 bg-teal ml-1 animate-pulse" />}
        </div>

        {/* Source citations */}
        {(msg.sourceDocIds?.length ?? 0) > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {msg.sourceDocIds.map((id) => (
              <span key={id} className="text-xs font-mono text-text-faint bg-surface border border-border-dim px-2 py-0.5 rounded-full">
                📄 doc
              </span>
            ))}
          </div>
        )}

        <span className="font-mono text-xs text-text-faint">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

export default function Chat() {
  const { data: sessions } = useChatSessions();

  const [messages, setMessages] = useState<ChatMessage[]>(
    sessions?.[0]?.messages || []
  );
  const [input, setInput] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentSessionId] = useState<string | null>(sessions?.[0]?._id || null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Pre-populate with chat history — filter out empty/audio-URL messages
  useEffect(() => {
    if (sessions?.[0]?.messages && messages.length === 0) {
      const validMsgs = sessions[0].messages.filter(
        (m: ChatMessage) => m.content && m.content.trim() && !m.content.startsWith('http')
      );
      setMessages(validMsgs);
    }
  }, [sessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setInput('');

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      sourceDocIds: [],
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setStreamingContent('');

    let fullContent = '';
    let sourceDocs: string[] = [];

    await streamChatMessage(
      text,
      currentSessionId,
      (chunk) => {
        fullContent += chunk;
        setStreamingContent(fullContent);
      },
      (docIds) => {
        sourceDocs = docIds;
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: fullContent,
          sourceDocIds: sourceDocs,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setStreamingContent('');
        setIsStreaming(false);
      },
      () => {
        setIsStreaming(false);
        setStreamingContent('');
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col mv-card p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border-dim">
          <div className="w-8 h-8 rounded-full bg-teal/20 border border-teal/30 flex items-center justify-center">⚕️</div>
          <div>
            <p className="font-sans font-semibold text-text-primary text-sm">MedVault AI</p>
            <p className="font-body text-xs text-text-muted">
              Clinical mode · Grounded in your records
            </p>
          </div>
          <span className="ml-auto badge-teal text-xs">● Active</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <span className="text-5xl">💬</span>
              <p className="font-sans font-semibold text-text-primary">Ask your medical records anything</p>
              <p className="font-body text-sm text-text-muted max-w-xs">
                I can answer questions about your lab results, medications, and health history.
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {/* Streaming message */}
          {isStreaming && streamingContent && (
            <MessageBubble
              msg={{ role: 'assistant', content: streamingContent, sourceDocIds: [], timestamp: new Date().toISOString() }}
              streaming
            />
          )}
          {isStreaming && !streamingContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-surface border border-border-mid flex items-center justify-center text-sm">⚕️</div>
              <div className="bg-card border border-border-dim rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-1.5 h-1.5 bg-text-faint rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested chips */}
        {messages.length < 2 && (
          <div className="px-5 pb-3 flex gap-2 flex-wrap">
            {['What is my blood pressure?', 'Show my recent labs', 'Any new prescriptions?'].slice(0, 3).map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-xs font-body px-3 py-1.5 bg-surface border border-border-mid rounded-full
                           text-text-muted hover:border-teal/40 hover:text-text-primary transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-5 pb-5 border-t border-border-dim pt-3">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your lab results, medications, or health history…"
              rows={2}
              disabled={isStreaming}
              className="mv-input resize-none flex-1 py-2"
            />

            {/* Send button */}
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isStreaming}
              className="btn-primary self-end px-4 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {isStreaming ? '⏳' : <Send size={14} />}
            </button>
          </div>
          <p className="font-mono text-xs text-text-faint mt-2">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>

      {/* Sources panel */}
      <div className="w-56 flex flex-col gap-4 hidden xl:flex">
        <div className="mv-card flex flex-col gap-3">
          <h3 className="font-sans font-semibold text-sm text-text-primary">Referenced Docs</h3>
          {messages.filter((m) => m.role === 'assistant' && (m.sourceDocIds?.length ?? 0) > 0).slice(-1).map((m, i) => (
            <div key={i} className="flex flex-col gap-2">
              {m.sourceDocIds.map((id) => (
                <div key={id} className="text-xs font-mono text-text-muted bg-surface rounded-lg px-2.5 py-2">
                  📄 {id}
                </div>
              ))}
            </div>
          ))}
          {!messages.some((m) => m.role === 'assistant' && m.sourceDocIds.length > 0) && (
            <p className="font-body text-xs text-text-faint">Document citations will appear here</p>
          )}
        </div>

        <div className="mv-card">
          <h3 className="font-sans font-semibold text-sm text-text-primary mb-2">Mode</h3>
          <p className="font-body text-xs text-text-muted">
            Clinical mode: technical terms and full medical detail
          </p>
        </div>
      </div>
    </div>
  );
}
