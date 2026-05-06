import { login } from '@libs/api';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button, Card, Form, Input, message } from 'antd';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: (dto: LoginValues) => login(dto),
    onSuccess: () => {
      void navigate({ to: '/chat' });
    },
    onError: () => {
      message.error('Не вдалося увійти. Перевірте email і пароль.');
    },
  });

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    } as LoginValues,
    validators: {
      onSubmit: loginSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await loginMutation.mutateAsync(value);
      } catch {
        // Error is already handled in mutation onError callback.
      }
    },
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <Card title="AI Platform" style={{ width: '100%', maxWidth: 420 }}>
        <Form
          layout="vertical"
          onFinish={() => {
            void form.handleSubmit();
          }}
        >
          <form.Field
            name="email"
            children={(field) => (
              <Form.Item
                label="Email"
                validateStatus={field.state.meta.errors.length ? 'error' : undefined}
                help={field.state.meta.errors[0]?.message}
              >
                <Input
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </Form.Item>
            )}
          />

          <form.Field
            name="password"
            children={(field) => (
              <Form.Item
                label="Пароль"
                validateStatus={field.state.meta.errors.length ? 'error' : undefined}
                help={field.state.meta.errors[0]?.message}
              >
                <Input.Password
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => field.handleChange(event.target.value)}
                  placeholder="********"
                  autoComplete="current-password"
                />
              </Form.Item>
            )}
          />

          <Form.Item style={{ marginBottom: 8 }}>
            <Button type="primary" htmlType="submit" loading={loginMutation.isPending} block>
              Увійти
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <Link to="/auth/register">Немає акаунту? Реєстрація</Link>
        </div>

        <Button
          block
          onClick={() => {
            window.location.href = 'http://localhost:4000/auth/google';
          }}
        >
          Увійти через Google
        </Button>
      </Card>
    </div>
  );
}
