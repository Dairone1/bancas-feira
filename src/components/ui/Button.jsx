import React from "react";

export default function Button({ children, onClick, type = "button", className = "", variant, size }) {
  const baseClass = "rounded-lg font-semibold focus:outline-none transition-colors duration-300 ease-in-out shadow-md";

  const sizeClass = size === "sm" ? "px-4 py-2 text-sm" : "px-6 py-3 text-base";

  const variantClass = variant === "outline"
    ? "border border-gray-300 text-gray-800 hover:bg-gray-100"
    : variant === "destructive"
    ? "bg-red-600 text-white hover:bg-red-700 shadow-red-500/50"
    : "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/50";

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${baseClass} ${sizeClass} ${variantClass} ${className} rounded-lg`}
    >
      {children}
    </button>
  );
}
