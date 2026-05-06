import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoginPage } from './login';

const navigateMock = vi.fn();
const loginMock = vi.fn();
const messageErrorMock = vi.spyOn(message, 'error').mockImplementation(() => undefined);

vi.mock('@libs/api', () => ({
  login: (dto: unknown) => loginMock(dto),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: unknown }) => <a href="/auth/register">{children}</a>,
  useNavigate: () => navigateMock,
}));

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    loginMock.mockReset();
    navigateMock.mockReset();
    messageErrorMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('submits valid credentials and navigates to chat', async () => {
    loginMock.mockResolvedValue({ status: 200 });

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('********'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
      });
    });
    expect(navigateMock).toHaveBeenCalledWith({ to: '/chat' });
    expect(messageErrorMock).not.toHaveBeenCalled();
  });

  it('shows error message when login request fails', async () => {
    loginMock.mockRejectedValue(new Error('Login failed'));

    renderLoginPage();

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('********'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Увійти' }));

    await waitFor(() => {
      expect(messageErrorMock).toHaveBeenCalledWith('Не вдалося увійти. Перевірте email і пароль.');
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
