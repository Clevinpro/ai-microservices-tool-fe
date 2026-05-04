import { Typography } from 'antd';
import type { Meta, StoryObj } from '@storybook/react';

import { ChatMessage } from './ChatMessage';
import type { ChatMessageProps } from './ChatMessage';

const meta: Meta<typeof ChatMessage> = {
  title: 'Shared/ChatMessage',
  component: ChatMessage,
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    role: {
      control: 'select',
      options: ['user', 'assistant'],
      description: 'Message author role.',
    },
    content: {
      control: 'text',
      description: 'Message text content.',
    },
    extra: {
      control: 'text',
      description: 'Extra actions or metadata row.',
    },
  },
};

export default meta;

type Story = StoryObj<typeof ChatMessage>;

export const Primary: Story = {
  args: {
    role: 'assistant',
    content: 'Here is a concise answer from the assistant.',
    extra: 'Just now',
  },
  render: ({ extra, ...args }: ChatMessageProps) => (
    <ChatMessage
      {...args}
      extra={extra ? <Typography.Text type="secondary">{extra}</Typography.Text> : undefined}
    />
  ),
};
