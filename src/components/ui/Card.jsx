import React from "react";

export default function Card({ children, className = "", ...props }) {
  return (
    <div
      className={`bg-white shadow-lg rounded-xl p-6 transition-shadow duration-300 hover:shadow-2xl border border-gray-200 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
