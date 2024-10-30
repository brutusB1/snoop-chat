// src/components/ui/Input.js

import React from 'react';

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={`border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600 ${className}`}
    {...props}
  />
));