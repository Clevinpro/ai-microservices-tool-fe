import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { Button, Card, Input, Typography, message } from 'antd';
import { z } from 'zod';

import { register } from '@libs/api';

const registerSchema = z
  .object({
    name: z.string().min(2, "Ім'я має містити щонайменше 2 символи"),
    email: z.string().email('Введіть коректний email'),
    password: z.string().min(8, 'Пароль має містити щонайменше 8 символів'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.confirmPassword === values.password, {
    message: 'Паролі не співпадають',
    path: ['confirmPassword'],
  });

function getFieldError(errors: unknown[]): string | undefined {
  const firstError = errors[0];
  if (!firstError) return undefined;
  if (typeof firstError === 'string') return firstError;
  if (firstError instanceof Error) return firstError.message;
  return 'Некоректне значення';
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Не вдалося створити акаунт';
}

export function RegisterPage() {
  const navigate = useNavigate();
  const loginPath = window.location.pathname.startsWith('/auth/') ? '/auth' : '/login';

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      void navigate({ to: loginPath });
    },
    onError: (error) => {
      message.error(getErrorMessage(error));
    },
  });

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validators: {
      onChange: registerSchema,
      onSubmit: registerSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await registerMutation.mutateAsync({
          name: value.name,
          email: value.email,
          password: value.password,
        });
      } catch {
        // Error is already handled in mutation onError callback.
      }
    },
  });

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <Card style={{ width: '100%', maxWidth: 420 }}>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Реєстрація
        </Typography.Title>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <div style={{ display: 'grid', gap: 12 }}>
            <form.Field name="name">
              {(field) => (
                <div>
                  <Input
                    size="large"
                    placeholder="Ім'я"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    status={field.state.meta.errors.length ? 'error' : ''}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <Typography.Text type="danger">
                      {getFieldError(field.state.meta.errors)}
                    </Typography.Text>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <div>
                  <Input
                    size="large"
                    placeholder="Email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    status={field.state.meta.errors.length ? 'error' : ''}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <Typography.Text type="danger">
                      {getFieldError(field.state.meta.errors)}
                    </Typography.Text>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <div>
                  <Input.Password
                    size="large"
                    placeholder="Пароль"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    status={field.state.meta.errors.length ? 'error' : ''}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <Typography.Text type="danger">
                      {getFieldError(field.state.meta.errors)}
                    </Typography.Text>
                  ) : null}
                </div>
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <div>
                  <Input.Password
                    size="large"
                    placeholder="Підтвердіть пароль"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    status={field.state.meta.errors.length ? 'error' : ''}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <Typography.Text type="danger">
                      {getFieldError(field.state.meta.errors)}
                    </Typography.Text>
                  ) : null}
                </div>
              )}
            </form.Field>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              loading={registerMutation.isPending}
            >
              Зареєструватися
            </Button>
          </div>
        </form>

        <Typography.Paragraph style={{ marginBottom: 0, marginTop: 16 }}>
          Вже є акаунт? <Link to={loginPath}>Увійти</Link>
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
