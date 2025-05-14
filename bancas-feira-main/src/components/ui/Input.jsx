import React from "react";

export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full border border-gray-300 rounded-md px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition duration-300 ease-in-out shadow-sm ${className}`}
      {...props}
    />
  );
}
