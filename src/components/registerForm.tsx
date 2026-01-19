"use client";

import { useTranslations } from "next-intl";
import React, { useState, useRef } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";

export default function RegisterForm() {
  const t = useTranslations("RegisterForm");
  const [agreed, setAgreed] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photosRef = useRef<HTMLInputElement | null>(null);

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setCompressing(true);
      const newFiles = Array.from(e.target.files);
      
      // Check count
      if (photos.length + newFiles.length > 5) {
        alert(t("errorMaxPhotosAlert"));
        e.target.value = "";
        setCompressing(false);
        return;
      }

      const compressedFiles: File[] = [];
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };

      try {
        for (const file of newFiles) {
          if (file.type.startsWith("image/")) {
            try {
              const compressedBlob = await imageCompression(file, options);
              const compressedFile = new File([compressedBlob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              compressedFiles.push(compressedFile);
            } catch (err) {
              console.error("Compression failed for", file.name, err);
              compressedFiles.push(file);
            }
          } else {
            compressedFiles.push(file);
          }
        }
      } catch (err) {
        console.error("Global compression error", err);
      }

      // Check size (4MB limit)
      const MAX_SIZE = 4 * 1024 * 1024;
      const currentSize = photos.reduce((acc, file) => acc + file.size, 0);
      const newSize = compressedFiles.reduce((acc, file) => acc + file.size, 0);

      if (currentSize + newSize > MAX_SIZE) {
        alert(t("errorTotalSize"));
        e.target.value = "";
        setCompressing(false);
        return;
      }

      setPhotos((prev) => [...prev, ...compressedFiles]);
      e.target.value = "";
      setCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const movePhoto = (index: number, direction: 'left' | 'right') => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;
      
      if (targetIndex >= 0 && targetIndex < newPhotos.length) {
        [newPhotos[index], newPhotos[targetIndex]] = [newPhotos[targetIndex], newPhotos[index]];
      }
      return newPhotos;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // client-side guards
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !email.trim() ||
      !brand.trim() ||
      !model.trim() ||
      !year.trim() ||
      !desc.trim()
    ) {
      setError(t("errorRequired"));
      return;
    }
    if (!agreed) {
      setError(t("errorAgreement"));
      return;
    }

    if (photos.length > 5) {
       setError(t("errorMaxPhotos"));
       return;
    }

    setLoading(true);
    try {
      // build FormData with files
      const formData = new FormData();
      formData.append("firstName", firstName.trim());
      formData.append("lastName", lastName.trim());
      formData.append("email", email.trim());
      formData.append("brand", brand.trim());
      formData.append("model", model.trim());
      formData.append("year", year.trim());
      formData.append("description", desc.trim());
      if (instagram.trim()) formData.append("instagram", instagram.trim());

      photos.forEach((file) => {
        formData.append("photos", file);
      });

      const res = await fetch("/api/register", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || t("errorSubmission"));
        setLoading(false);
        return;
      }

      setSuccess(t("success", { id: json.id }));
      // reset form
      setFirstName("");
      setLastName("");
      setEmail("");
      setBrand("");
      setModel("");
      setYear("");
      setDesc("");
      setInstagram("");
      setPhotos([]);
      setAgreed(false);
      if (photosRef.current) photosRef.current.value = "";
    } catch (err) {
      console.error(err);
      setError(t("errorSubmission")); // Or network error specifically
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
      {/* Row 1: First Name, Last Name */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="firstName">
            {t("firstName")}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            placeholder={t("firstNamePlaceholder")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="lastName">
            {t("lastName")}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            placeholder={t("lastNamePlaceholder")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
            required
          />
        </div>
      </div>

      {/* Row 2: Email, Instagram */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="email">
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="instagram">
            {t("instagram")}
          </label>
          <input
            id="instagram"
            name="instagram"
            type="text"
            placeholder="@yourhandle"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
          />
        </div>
      </div>

      {/* Row 3: Brand, Model, Year */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="brand">
            {t("brand")}
          </label>
          <input
            id="brand"
            name="brand"
            type="text"
            placeholder="e.g. Škoda"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="model">
            {t("model")}
          </label>
          <input
            id="model"
            name="model"
            type="text"
            placeholder="e.g. Octavia"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-white font-bold tracking-wide" htmlFor="year">
            {t("year")}
          </label>
          <input
            id="year"
            name="year"
            type="text"
            placeholder="e.g. 2020"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
            required
          />
        </div>
      </div>

      {/* Row 4: Description */}
      <div className="w-full">
        <label
          className="text-white font-bold tracking-wide block mb-2"
          htmlFor="desc"
        >
          {t("description")}
        </label>
        <textarea
          id="desc"
          name="desc"
          placeholder={t("descriptionPlaceholder")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-none focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 resize-none transition-all duration-200"
          rows={3}
          required
        />
      </div>

      {/* Row 5: Photos upload */}
      <div className="w-full">
        <label
          className="text-white font-bold tracking-wide block mb-2"
          htmlFor="photos"
        >
          {t("photos")}
        </label>

        {/* visually-hidden native file input */}
        <input
          id="photos"
          name="photos"
          type="file"
          multiple
          accept="image/*"
          onChange={handlePhotosChange}
          className="sr-only"
          ref={photosRef}
        />

        {/* Custom styled label acts as the visible "Choose files" button */}
        <label
          htmlFor="photos"
          className="inline-flex items-center gap-3 px-4 py-2 bg-[#111] border-2 border-white text-white rounded-none cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 font-semibold"
        >
          {/* simple upload icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12m0-12l4 4m-4-4-4 4"
            />
          </svg>
          <span className="font-semibold">{t("chooseFiles")}</span>
        </label>

        {/* Selected photos preview and reordering */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-4">
            {photos.map((file, index) => (
              <div key={index} className="relative group aspect-square border border-gray-600 bg-black/50">
                <Image
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index}`}
                  fill
                  className="object-cover"
                />
                
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="text-red-500 hover:text-red-400 p-1"
                      title="Remove"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <button
                      type="button"
                      onClick={() => movePhoto(index, 'left')}
                      disabled={index === 0}
                      className="text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                      title="Move Left"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    
                    <span className="text-xs text-gray-400 font-mono">{index + 1}</span>

                    <button
                      type="button"
                      onClick={() => movePhoto(index, 'right')}
                      disabled={index === photos.length - 1}
                      className="text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed p-1"
                      title="Move Right"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* selected files summary */}
        <div className="mt-2 text-sm text-gray-300 font-medium">
          {photos.length > 0
            ? t("filesSelected", {count: photos.length})
            : t("noFiles")}
        </div>
      </div>

      {/* Row 6: Agreement + submit */}
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            id="agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="accent-white w-5 h-5 cursor-pointer"
          />
          <label htmlFor="agree" className="text-white font-bold tracking-wide cursor-pointer">
            {t("agreement")}
          </label>
        </div>

        <div className="flex-shrink-0">
          <button
            type="submit"
            className="mt-0 px-8 py-3 rounded-none font-bold text-lg tracking-widest uppercase bg-white text-black shadow-xl border-2 border-white hover:bg-gray-200 hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !(
                agreed &&
                firstName.trim() &&
                lastName.trim() &&
                email.trim() &&
                brand.trim() &&
                model.trim() &&
                year.trim() &&
                desc.trim()
              ) || loading
            }
          >
            {t("send")}
          </button>
        </div>
      </div>

      {/* Error messages */}
      {error && (
        <div className="mt-4 text-red-500 text-sm font-semibold">{error}</div>
      )}

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-white p-8 max-w-md w-full relative shadow-2xl">
            <button
              onClick={() => setSuccess(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-900/30 mb-4 border border-green-500">
                <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Success!</h3>
              <p className="text-gray-300 mb-6 font-medium">
                {success}
              </p>
              <button
                onClick={() => setSuccess(null)}
                className="w-full px-4 py-2 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Modal */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-white p-8 max-w-md w-full relative shadow-2xl text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 mb-6">
              <svg
                className="animate-spin h-10 w-10 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth={4}
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-widest animate-pulse">
              {t("submitting")}
            </h3>
          </div>
        </div>
      )}

      {/* Compressing Modal */}
      {compressing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border-2 border-white p-8 max-w-md w-full relative shadow-2xl text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 mb-6">
              <svg
                className="animate-spin h-10 w-10 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth={4}
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white uppercase tracking-widest animate-pulse">
              {t("compressing")}
            </h3>
          </div>
        </div>
      )}
    </form>
  );
}
