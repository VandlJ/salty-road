"use client";

import React, { useState } from "react";

export default function RegisterForm() {
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [car, setCar] = useState("");
  const [plate, setPlate] = useState("");
  const [desc, setDesc] = useState("");
  const [instagram, setInstagram] = useState("");
  const [photos, setPhotos] = useState<FileList | null>(null);

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotos(e.target.files);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // final guard
    if (!agreed) return;
    if (!name || !email || !mobile || !car || !plate || !desc) return;
    // placeholder submit action — collect form data
    const payload = { name, email, mobile, car, plate, desc, instagram };
    console.log("register form submitted", payload);
    alert("Registration submitted (placeholder)");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
      {/* Row 1: Name, Email, Mobile */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[#C0C0C0] font-semibold" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[#C0C0C0] font-semibold" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[#C0C0C0] font-semibold" htmlFor="mobile">
            Mobile number
          </label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            placeholder="+420 123 456 789"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0]"
            required
          />
        </div>
      </div>

      {/* Row 2: Car make/model, Licence plate, Instagram handle */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[#C0C0C0] font-semibold" htmlFor="car">
            Car make and model
          </label>
          <input
            id="car"
            name="car"
            type="text"
            placeholder="e.g. Škoda Octavia"
            value={car}
            onChange={(e) => setCar(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[#C0C0C0] font-semibold" htmlFor="plate">
            Licence plate
          </label>
          <input
            id="plate"
            name="plate"
            type="text"
            placeholder="e.g. 1AB 2345"
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0]"
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[#C0C0C0] font-semibold" htmlFor="instagram">
            Instagram
          </label>
          <input
            id="instagram"
            name="instagram"
            type="text"
            placeholder="@yourhandle"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0]"
          />
        </div>
      </div>

      {/* Row 3: Description */}
      <div className="w-full">
        <label
          className="text-[#C0C0C0] font-semibold block mb-2"
          htmlFor="desc"
        >
          Description of vehicle
        </label>
        <textarea
          id="desc"
          name="desc"
          placeholder="Brief description of your vehicle"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full px-4 py-3 bg-transparent text-white border-2 border-[#C0C0C0] rounded-none focus:outline-none focus:border-white placeholder-[#C0C0C0] resize-none"
          rows={3}
          required
        />
      </div>

      {/* Row 4: Photos upload */}
      <div className="w-full">
        <label
          className="text-[#C0C0C0] font-semibold block mb-2"
          htmlFor="photos"
        >
          Car photos upload
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
        />

        {/* Custom styled label acts as the visible "Choose files" button */}
        <label
          htmlFor="photos"
          className="inline-flex items-center gap-3 px-4 py-2 bg-[#111] border-2 border-[#C0C0C0] text-[#F8F7F3] rounded-none cursor-pointer hover:bg-[#1a1a1a] transition-colors duration-150"
        >
          {/* simple upload icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-[#C0C0C0]"
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
          <span className="font-semibold">Choose files</span>
        </label>

        {/* selected files summary */}
        <div className="mt-2 text-sm text-[#C0C0C0]">
          {photos && photos.length > 0
            ? `${photos.length} file${photos.length > 1 ? "s" : ""} selected`
            : "No files selected"}
        </div>
      </div>

      {/* Row 5: Agreement + submit */}
      <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <input
            id="agree"
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            required
            className="accent-[#C0C0C0] w-5 h-5"
          />
          <label htmlFor="agree" className="text-[#C0C0C0] font-semibold">
            I agree with the rules of registration
          </label>
        </div>

        <div className="flex-shrink-0">
          <button
            type="submit"
            className="mt-0 px-8 py-3 rounded-none font-bold text-lg tracking-widest uppercase bg-gradient-to-r from-white to-[#C0C0C0] text-[#222] shadow-lg border-2 border-[#C0C0C0] hover:from-[#C0C0C0] hover:to-white hover:text-[#444] hover:scale-105 hover:shadow-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={
              !(
                agreed &&
                name.trim() &&
                email.trim() &&
                mobile.trim() &&
                car.trim() &&
                plate.trim() &&
                desc.trim()
              )
            }
          >
            Send
          </button>
        </div>
      </div>
    </form>
  );
}
