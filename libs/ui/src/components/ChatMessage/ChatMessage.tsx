import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Card, Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

const { Paragraph } = Typography;

export interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  /** Extra actions or metadata row */
  extra?: ReactNode;
}

export function ChatMessage({ role, content, extra }: ChatMessageProps) {
  // TODO: markdown / rich text, streaming, copy, feedback buttons
  const isUser = role === 'user';
  return (
    <Flex gap="middle" align="flex-start" style={{ marginBottom: 12 }}>
      <Avatar icon={isUser ? <UserOutlined /> : <RobotOutlined />} style={{ flexShrink: 0 }} />
      <Card size="small" style={{ flex: 1 }} extra={extra}>
        <Paragraph style={{ marginBottom: 0 }}>{content}</Paragraph>
      </Card>
    </Flex>
  );
}
