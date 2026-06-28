export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2';

  const variants = {
    primary: 'bg-accent-500 hover:bg-accent-600 text-white disabled:bg-gray-400',
    secondary: 'bg-white border-2 border-gray-300 hover:border-accent-500 text-gray-900 disabled:opacity-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-400',
    ghost: 'text-gray-700 hover:bg-gray-100 disabled:opacity-50',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
