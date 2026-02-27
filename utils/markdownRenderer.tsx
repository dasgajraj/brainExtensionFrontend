/**
 * markdownRenderer.tsx
 * Renders AI API markdown responses (**bold**, *italic*, `code`, headings, lists, blockquotes)
 * as properly styled React Native components. No external dependencies.
 */

import React from 'react';
import { Text, View } from 'react-native';

// Accept any token shape (ReturnType<typeof getTokens>)
type AppTokens = any;

// ─── Inline Parser ────────────────────────────────────────────────────────────

/**
 * Renders a single line of text with inline markdown:
 *   **bold**  →  bold weight
 *   *italic*  →  italic style
 *   `code`    →  monospace
 */
function InlineText({
  text,
  color,
  fontSize,
  lineHeight,
}: {
  text: string;
  color: string;
  fontSize: number;
  lineHeight: number;
}) {
  const regex = /\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[1] !== undefined) {
      // **bold**
      parts.push(
        <Text key={k++} style={{ fontWeight: '700' }}>
          {match[1]}
        </Text>,
      );
    } else if (match[2] !== undefined) {
      // *italic*
      parts.push(
        <Text key={k++} style={{ fontStyle: 'italic' }}>
          {match[2]}
        </Text>,
      );
    } else if (match[3] !== undefined) {
      // `code`
      parts.push(
        <Text key={k++} style={{ fontFamily: 'monospace' }}>
          {match[3]}
        </Text>,
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(text.slice(last));
  }

  return (
    <Text style={{ color, fontSize, lineHeight }}>
      {parts.length ? parts : text}
    </Text>
  );
}

// ─── MarkdownText Component ───────────────────────────────────────────────────

export interface MarkdownProps {
  content: string;
  t: AppTokens;
  fontSize?: number;
  lineHeight?: number;
}

/**
 * Block-level markdown renderer. Handles:
 *   # H1  ## H2  ### H3  #### H4
 *   - / * / + unordered lists
 *   1. ordered lists
 *   > blockquotes
 *   --- horizontal rules
 *   **bold**, *italic*, `code` inline
 *   blank lines as spacing
 */
export function MarkdownText({
  content,
  t,
  fontSize = 14,
  lineHeight = 24,
}: MarkdownProps) {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let bulletBuffer: Array<{ text: string; ordered: boolean; num: number }> = [];
  let k = 0;

  const flushBullets = () => {
    if (!bulletBuffer.length) {return;}
    const snap = [...bulletBuffer];
    bulletBuffer = [];
    nodes.push(
      <View key={k++} style={{ marginVertical: 4 }}>
        {snap.map((item, i) => (
          <View
            key={i}
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 }}>
            <Text style={{ color: t.text.muted, marginRight: 8, fontSize, lineHeight }}>
              {item.ordered ? `${item.num}.` : '•'}
            </Text>
            <View style={{ flex: 1 }}>
              <InlineText
                text={item.text}
                color={t.text.primary}
                fontSize={fontSize}
                lineHeight={lineHeight}
              />
            </View>
          </View>
        ))}
      </View>,
    );
  };

  for (const raw of lines) {
    const line = raw.trim();

    // ── Empty line ────────────────────────────────────────────────────────────
    if (!line) {
      flushBullets();
      nodes.push(<View key={k++} style={{ height: 8 }} />);
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────────────────
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line) || /^_{3,}$/.test(line)) {
      flushBullets();
      nodes.push(
        <View
          key={k++}
          style={{
            height: 1,
            backgroundColor: t.border.subtle,
            marginVertical: 10,
          }}
        />,
      );
      continue;
    }

    // ── Headings ──────────────────────────────────────────────────────────────
    if (line.startsWith('#### ')) {
      flushBullets();
      nodes.push(
        <Text
          key={k++}
          style={{
            fontSize: fontSize + 1,
            fontWeight: '700',
            color: t.text.secondary,
            marginTop: 8,
            marginBottom: 2,
            lineHeight: lineHeight + 1,
          }}>
          {line.slice(5)}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('### ')) {
      flushBullets();
      nodes.push(
        <Text
          key={k++}
          style={{
            fontSize: fontSize + 2,
            fontWeight: '700',
            color: t.text.primary,
            marginTop: 10,
            marginBottom: 4,
            lineHeight: lineHeight + 2,
          }}>
          {line.slice(4)}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('## ')) {
      flushBullets();
      nodes.push(
        <Text
          key={k++}
          style={{
            fontSize: fontSize + 4,
            fontWeight: '800',
            color: t.text.primary,
            marginTop: 12,
            marginBottom: 4,
            lineHeight: lineHeight + 4,
          }}>
          {line.slice(3)}
        </Text>,
      );
      continue;
    }
    if (line.startsWith('# ')) {
      flushBullets();
      nodes.push(
        <Text
          key={k++}
          style={{
            fontSize: fontSize + 6,
            fontWeight: '800',
            color: t.text.primary,
            marginTop: 14,
            marginBottom: 6,
            lineHeight: lineHeight + 6,
          }}>
          {line.slice(2)}
        </Text>,
      );
      continue;
    }

    // ── Blockquote ────────────────────────────────────────────────────────────
    if (line.startsWith('> ')) {
      flushBullets();
      nodes.push(
        <View
          key={k++}
          style={{
            borderLeftWidth: 3,
            borderLeftColor: t.primary.accent,
            paddingLeft: 12,
            marginVertical: 4,
          }}>
          <InlineText
            text={line.slice(2)}
            color={t.text.secondary}
            fontSize={fontSize}
            lineHeight={lineHeight}
          />
        </View>,
      );
      continue;
    }

    // ── Unordered list ────────────────────────────────────────────────────────
    const ulMatch = line.match(/^[-*+] (.*)/);
    if (ulMatch) {
      if (bulletBuffer.length && bulletBuffer[0].ordered) {flushBullets();}
      bulletBuffer.push({ text: ulMatch[1], ordered: false, num: 0 });
      continue;
    }

    // ── Ordered list ──────────────────────────────────────────────────────────
    const olMatch = line.match(/^(\d+)\. (.*)/);
    if (olMatch) {
      if (bulletBuffer.length && !bulletBuffer[0].ordered) {flushBullets();}
      bulletBuffer.push({
        text: olMatch[2],
        ordered: true,
        num: parseInt(olMatch[1], 10),
      });
      continue;
    }

    // ── Plain paragraph ───────────────────────────────────────────────────────
    flushBullets();
    nodes.push(
      <View key={k++} style={{ marginBottom: 2 }}>
        <InlineText
          text={line}
          color={t.text.primary}
          fontSize={fontSize}
          lineHeight={lineHeight}
        />
      </View>,
    );
  }

  flushBullets();
  return <View>{nodes}</View>;
}
