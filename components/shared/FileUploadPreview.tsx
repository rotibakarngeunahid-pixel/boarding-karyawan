'use client';

import { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

export function FileUploadPreview({
  label,
  onChange,
  required,
}: {
  label: string;
  onChange: (file: File | null) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState<string>('');

  function handleFile(file: File | null) {
    if (!file) {
      reset();
      return;
    }
    if (!ACCEPT.includes(file.type)) {
      toast.error('Format harus JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('Ukuran file maksimal 5MB.');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setName(file.name);
    onChange(file);
  }

  function reset() {
    setPreview(null);
    setName('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {preview ? (
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={name}
            className="h-32 w-32 rounded-lg border border-gray-200 object-cover"
          />
          <button
            type="button"
            onClick={reset}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-32 w-full max-w-[12rem] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-rbn-primary hover:text-rbn-primary"
        >
          <Upload className="h-6 w-6" />
          <span className="text-xs">Pilih gambar</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
