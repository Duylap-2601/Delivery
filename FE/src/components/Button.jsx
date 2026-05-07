const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false }) => {
  const styles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-md font-medium transition ${styles[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

export default Button;
