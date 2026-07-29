"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import React, { useState, useRef, useCallback } from "react";
import Image from "next/image";
import imageCompression from "browser-image-compression";
import { useModalA11y } from "@/lib/useModalA11y";

type PhotoItem = {
  id: string;
  url?: string;
  loading: boolean;
  error?: boolean;
};

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
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photosRef = useRef<HTMLInputElement | null>(null);

  const closeError = useCallback(() => setError(null), []);
  const closeSuccess = useCallback(() => setSuccess(null), []);
  const errorModalRef = useModalA11y<HTMLDivElement>(!!error, closeError);
  const successModalRef = useModalA11y<HTMLDivElement>(!!success, closeSuccess);
  const submittingModalRef = useModalA11y<HTMLDivElement>(isSubmitting);

  const handlePhotosChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const newFiles = Array.from(e.target.files);
    
    // Check count
    if (photos.length + newFiles.length > 5) {
      setError(t("errorMaxPhotosAlert"));
      if (photosRef.current) photosRef.current.value = "";
      return;
    }

    // Initialize placeholders
    const newPhotoItems: PhotoItem[] = newFiles.map(() => ({
      id: crypto.randomUUID(),
      loading: true,
    }));

    setPhotos((prev) => [...prev, ...newPhotoItems]);
    setError(null);

    // Process uploads concurrently
    // We use a tracking index to update the correct placeholder
    let currentIndex = photos.length; 

    for (const file of newFiles) {
      const itemId = newPhotoItems[currentIndex - photos.length].id; // Match based on relative index
      
      try {
        // Compress image before upload to avoid 413 Payload Too Large
        const options = {
          maxSizeMB: 4,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        let fileToUpload = file;
        try {
          // Only attempt compression for image types
          if (file.type.startsWith("image/")) {
            fileToUpload = await imageCompression(file, options);
          }
        } catch (compressionError) {
          console.warn("Image compression failed, trying to upload original:", compressionError);
        }

        const formData = new FormData();
        formData.append("file", fileToUpload);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const blob = await res.json();
        
        setPhotos((prev) => 
          prev.map((p) => p.id === itemId ? { ...p, url: blob.url, loading: false } : p)
        );
      } catch (err) {
        console.error(err);
        setPhotos((prev) => 
          prev.map((p) => p.id === itemId ? { ...p, loading: false, error: true } : p)
        );
      }
      currentIndex++;
    }

    if (photosRef.current) photosRef.current.value = "";
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

    // Filter out photos that are still loading or failed
    const validPhotos = photos.filter(p => p.url && !p.loading).map(p => p.url);

    if (photos.length > 0 && validPhotos.length === 0 && photos.some(p => p.loading)) {
       // Wait for uploads? For now, just error or block button.
       // Ideally button is disabled while loading.
       return;
    }

    if (validPhotos.length > 5) {
       setError(t("errorMaxPhotos"));
       return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          brand: brand.trim(),
          model: model.trim(),
          year: year.trim(),
          description: desc.trim(),
          instagram: instagram.trim() || null,
          photos: validPhotos
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        const errorMessages: Record<string, string> = {
          registration_closed: t("errorClosed"),
          missing_fields: t("errorRequired"),
          invalid_email: t("errorInvalidEmail"),
          field_too_long: t("errorFieldTooLong"),
          rate_limited: t("errorRateLimited"),
        };
        setError(errorMessages[json?.error] || t("errorSubmission"));
        setIsSubmitting(false);
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
    } catch (err) {
      console.error(err);
      setError(t("errorSubmission")); 
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to determine if any uploads are in progress
  const isUploading = photos.some(p => p.loading);

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
            maxLength={100}
            placeholder={t("firstNamePlaceholder")}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
            maxLength={100}
            placeholder={t("lastNamePlaceholder")}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
            maxLength={100}
            placeholder="@yourhandle"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
            maxLength={100}
            placeholder="Škoda"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
            maxLength={100}
            placeholder="Octavia"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
            maxLength={10}
            placeholder="2020"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 transition-all duration-200"
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
          maxLength={2000}
          placeholder={t("descriptionPlaceholder")}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-4 py-3 bg-white/5 text-white border-2 border-gray-400 rounded-sm focus:outline-none focus:border-white focus:bg-white/10 placeholder-gray-400 resize-none transition-all duration-200"
          rows={3}
          required
        />
      </div>

      {/* Row 5: Photos upload */}
      <div className="w-full flex flex-col items-center md:items-start">
        <label
          className="text-white font-bold tracking-wide block mb-4 text-center md:text-left"
          htmlFor="photos"
        >
          {t("photos")}
        </label>

        {/* visually-hidden native file input */}
        <div className="flex flex-col items-center md:items-start w-full">
          <input
            id="photos"
            name="photos"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handlePhotosChange}
            className="sr-only"
            ref={photosRef}
          />

          {/* Custom styled label acts as the visible "Choose files" button */}
          <div className="flex justify-center md:justify-start w-full">
            <label
              htmlFor="photos"
              className={`inline-flex items-center gap-3 px-4 py-2 bg-[#111] border-2 border-white text-white rounded-sm cursor-pointer hover:bg-white hover:text-black transition-colors duration-200 font-semibold ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          </div>
        </div>

        {/* Selected photos preview and reordering */}
        {photos.length > 0 && (
          <div className="w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6">
              {photos.map((item, index) => (
                <div key={item.id} className="relative group aspect-square border border-gray-600 bg-black/50 overflow-hidden rounded-sm">
                  {item.loading ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                      <svg className="animate-spin h-8 w-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                      <span className="text-xs text-gray-400 font-mono animate-pulse">UPLOADING</span>
                    </div>
                  ) : item.error ? (
                     <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20">
                      <svg className="h-8 w-8 text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs text-red-400 font-mono">ERROR</span>
                    </div>
                  ) : item.url ? (
                    <Image
                      src={item.url}
                      alt={`Preview ${index}`}
                      fill
                      className="object-cover"
                    />
                  ) : null}
                  
                  {/* Overlay actions (only if not loading) */}
                  {!item.loading && (
                    <div className="absolute inset-0 bg-black/60 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
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
                  )}
                </div>
              ))}
            </div>

            {/* selected files summary */}
            <div className="mt-4 text-sm text-gray-300 font-medium flex flex-col items-center md:items-start gap-2">
              <div className="flex items-center gap-3">
                <span className="w-8 h-px bg-gray-700 md:hidden"></span>
                <span>
                  {photos.length > 0
                    ? t("filesSelected", {count: photos.length})
                    : t("noFiles")}
                </span>
                <span className="w-8 h-px bg-gray-700 md:hidden"></span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-gray-500 block md:hidden animate-pulse">
                {t("photosHint")}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Row 6: Agreement + submit */}
      <div className="w-full flex flex-col items-center md:flex-row md:justify-between gap-4">
        <div className="flex flex-col gap-1">
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
          <p className="text-xs text-gray-400 font-light">
            {t.rich("privacyNote", {
              link: (chunks) => (
                <Link href="/privacy" className="underline hover:text-white transition-colors">
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>

        <div className="flex-shrink-0">
          <button
            type="submit"
            className="mt-0 px-8 py-3 rounded-sm font-bold text-base tracking-widest uppercase bg-white text-black shadow-xl border-2 border-white hover:bg-gray-200 hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
              ) || isSubmitting || isUploading
            }
          >
            {t("send")}
          </button>
        </div>
      </div>

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            ref={errorModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-error-title"
            tabIndex={-1}
            className="bg-[#111] border-2 border-red-500 p-8 max-w-md w-full relative shadow-2xl rounded-sm outline-none">
            <button
              onClick={() => setError(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-900/30 mb-4 border border-red-500">
                <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 id="register-error-title" className="text-xl font-bold text-white mb-2">{t("errorTitle")}</h3>
              <p className="text-gray-300 mb-6 font-medium">
                {error}
              </p>
              <button
                onClick={() => setError(null)}
                className="w-full px-4 py-2 bg-red-600 text-white font-bold uppercase tracking-widest hover:bg-red-700 transition-colors rounded-sm"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            ref={successModalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-success-title"
            tabIndex={-1}
            className="bg-[#111] border-2 border-white p-8 max-w-md w-full relative shadow-2xl rounded-sm outline-none">
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
              <h3 id="register-success-title" className="text-xl font-bold text-white mb-2">{t("successTitle")}</h3>
              <p className="text-gray-300 mb-6 font-medium">
                {success}
              </p>
              <button
                onClick={() => setSuccess(null)}
                className="w-full px-4 py-2 bg-white text-black font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors rounded-sm"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submitting Modal */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div
            ref={submittingModalRef}
            role="dialog"
            aria-modal="true"
            aria-label={t("submitting")}
            aria-live="polite"
            tabIndex={-1}
            className="bg-[#111] border-2 border-white p-8 max-w-md w-full relative shadow-2xl text-center rounded-sm outline-none">
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
    </form>
  );
}
