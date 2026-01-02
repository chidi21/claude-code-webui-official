import React from "react";

interface MessageContainerProps {
  alignment: "left" | "right" | "center";
  colorScheme: string;
  children: React.ReactNode;
}

export function MessageContainer({
  alignment,
  colorScheme,
  children,
}: MessageContainerProps) {
  const justifyClass =
    alignment === "right"
      ? "justify-end"
      : alignment === "center"
        ? "justify-center"
        : "justify-start";

  // MAVA-style: user messages get panel-bg with border, assistant messages are transparent
  const isUserMessage = alignment === "right";

  // User messages are full width and left-aligned like MAVA
  // Assistant messages have max-width constraint
  const widthClass = isUserMessage
    ? "w-full"
    : "max-w-[85%] sm:max-w-[75%]";

  return (
    <div className={`mb-6 flex ${isUserMessage ? "justify-start" : justifyClass}`}>
      <div
        className={`${widthClass} rounded-xl px-4 py-3 transition-colors duration-200 ${
          isUserMessage
            ? "mava-user-bubble shadow-sm"
            : "mava-assistant-bubble"
        } ${colorScheme}`}
      >
        {children}
      </div>
    </div>
  );
}
