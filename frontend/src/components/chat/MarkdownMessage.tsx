"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Check, Copy } from "lucide-react";

interface MarkdownMessageProps {
  content: string;
  role: "user" | "assistant";
}

export function MarkdownMessage({ content, role }: MarkdownMessageProps) {
  if (role === "user") {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }

  return (
    <div className="prose-agent">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          code({ className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeString = String(children).replace(/\n$/, "");
            const isInline = !className;

            if (isInline) {
              return (
                <code
                  className="rounded bg-cyan-400/10 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock language={match?.[1] ?? "text"} code={codeString} />
            );
          },

          a({ href, children }: any) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 underline decoration-cyan-400/40 hover:decoration-cyan-400"
              >
                {children}
              </a>
            );
          },

          table({ children }: any) {
            return (
              <div className="my-3 overflow-x-auto">
                <table className="min-w-full border border-white/10 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          th({ children }: any) {
            return (
              <th className="border border-white/10 bg-white/5 px-3 py-2 text-left font-semibold">
                {children}
              </th>
            );
          },
          td({ children }: any) {
            return (
              <td className="border border-white/10 px-3 py-2">{children}</td>
            );
          },

          h1: ({ children }: any) => (
            <h1 className="mt-4 mb-2 text-xl font-bold text-pure">{children}</h1>
          ),
          h2: ({ children }: any) => (
            <h2 className="mt-4 mb-2 text-lg font-bold text-pure">{children}</h2>
          ),
          h3: ({ children }: any) => (
            <h3 className="mt-3 mb-1.5 text-base font-semibold text-pure">
              {children}
            </h3>
          ),

          ul: ({ children }: any) => (
            <ul className="my-2 ml-5 list-disc space-y-1">{children}</ul>
          ),
          ol: ({ children }: any) => (
            <ol className="my-2 ml-5 list-decimal space-y-1">{children}</ol>
          ),
          li: ({ children }: any) => (
            <li className="leading-relaxed">{children}</li>
          ),

          p: ({ children }: any) => (
            <p className="my-2 leading-relaxed">{children}</p>
          ),

          blockquote: ({ children }: any) => (
            <blockquote className="my-3 border-l-2 border-cyan-400/40 bg-cyan-400/5 py-2 pl-4 italic text-slate-300">
              {children}
            </blockquote>
          ),

          hr: () => <hr className="my-4 border-white/10" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-cyan-400/20 bg-[#0a1423]">
      <div className="flex items-center justify-between border-b border-cyan-400/10 bg-black/30 px-3 py-1.5">
        <span className="font-mono text-xs uppercase tracking-wider text-cyan-400/80">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-cyan-400/10 hover:text-cyan-400"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm">
        <code className={`language-${language} font-mono leading-relaxed`}>
          {code}
        </code>
      </pre>
    </div>
  );
}