import React from "react";

function InputField({
  label,
  id,
  type,
  register,
  placeholder,
  error,
  required,
}) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-gray-700">
        {label}
      </label>
      <input
        {...register(id, required)}
        type={type}
        id={id}
        placeholder={placeholder}
        className="mt-1 block w-full p-2 border border-gray-300 rounded"
      />
      {error && <p className="text-red-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
}

export default InputField;
