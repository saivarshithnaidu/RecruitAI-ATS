"use client";

import React, { useCallback, useState } from "react";
import { UploadCloud, X, CheckCircle, AlertCircle } from "lucide-react";
import Image from "next/image";

interface PhotoUploadProps {
    onFileSelect: (file: File | null) => void;
    error?: string;
}

export default function PhotoUpload({ onFileSelect, error }: PhotoUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [internalError, setInternalError] = useState<string | null>(null);

    const validateFile = (file: File) => {
        // Type check
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            return "Only JPG/PNG images are allowed.";
        }
        // Size check (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return "Image size must be less than 2MB.";
        }
        return null;
    };

    const handleFile = (file: File) => {
        const err = validateFile(file);
        if (err) {
            setInternalError(err);
            onFileSelect(null);
            return;
        }

        setInternalError(null);
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        onFileSelect(file);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const clearPhoto = () => {
        setPreview(null);
        setInternalError(null);
        onFileSelect(null);
    };

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Profile Photo <span className="text-red-500">*</span>
            </label>

            {!preview ? (
                <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:bg-gray-50"
                        } ${error || internalError ? "border-red-300 bg-red-50" : ""}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                    <label htmlFor="photo-upload" className="block text-sm font-medium text-gray-900 cursor-pointer">
                        <span className="text-blue-600 hover:text-blue-500">Upload a photo</span> or drag and drop
                        <input
                            id="photo-upload"
                            name="photo"
                            type="file"
                            accept="image/jpeg, image/png"
                            className="hidden"
                            onChange={handleChange}
                        />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG up to 2MB. Passport style preferred.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        (Face clearly visible, no sunglasses/masks)
                    </p>
                </div>
            ) : (
                <div className="relative inline-block mt-2">
                    <div className="w-32 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-sm relative group">
                        <Image
                            src={preview}
                            alt="Profile Preview"
                            fill
                            className="object-cover"
                        />
                        <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute top-1 right-1 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition"
                        >
                            <X className="w-4 h-4 text-gray-600" />
                        </button>
                    </div>
                    <p className="text-xs text-green-600 mt-1 flex items-center">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Photo selected
                    </p>
                </div>
            )}

            {(error || internalError) && (
                <p className="text-xs text-red-500 flex items-center mt-1">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {internalError || error}
                </p>
            )}
        </div>
    );
}
