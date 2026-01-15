"use client";

import { useTranslations } from "next-intl";
import React, { useState, useRef } from "react";

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
  const [photos, setPhotos] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const photosRef = useRef<HTMLInputElement | null>(null);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 5) {
      alert(t("errorMaxPhotosAlert"));
      e.target.value = ""; // clear
      setPhotos(null);
      return;
    }
    setPhotos(e.target.files);
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

    if (photos && photos.length > 5) {
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

      if (photos) {
        for (const f of Array.from(photos)) {
          formData.append("photos", f);
        }
      }

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
      setPhotos(null);
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
            placeholder={t("firstName")}
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
            placeholder={t("lastName")}
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

        {/* selected files summary */}
        <div className="mt-2 text-sm text-gray-300 font-medium">
          {photos && photos.length > 0
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
              )
            }
          >
            {t("send")}
          </button>
        </div>
      </div>

      {/* Error / Success messages */}
      {error && (
        <div className="mt-4 text-red-500 text-sm font-semibold">{error}</div>
      )}
      {success && (
        <div className="mt-4 text-green-500 text-sm font-semibold">
          {success}
        </div>
      )}

      {/* Loading spinner (optional) */}
      {loading && (
        <div className="mt-4 flex items-center gap-2">
          <svg
            className="animate-spin h-5 w-5 text-[#C0C0C0]"
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
          <span className="text-[#C0C0C0] font-semibold">{t("submitting")}</span>
        </div>
      )}
    </form>
  );
}
