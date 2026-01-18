import { useTheme } from '@/hooks/use-theme';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-white group-[.toaster]:text-quack-dark group-[.toaster]:border-quack-dark group-[.toaster]:border-opacity-10 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-quack-dark group-[.toast]:text-opacity-60',
          actionButton: 'group-[.toast]:bg-quack-teal group-[.toast]:text-white',
          cancelButton:
            'group-[.toast]:bg-quack-dark group-[.toast]:bg-opacity-5 group-[.toast]:text-quack-dark',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
