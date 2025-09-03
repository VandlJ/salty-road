"use client";

import RegisterForm from "@/components/registerForm";

export default function RegisterPage() {
  return (
    <section className="bg-transparent text-white px-4 pt-6 sm:pt-8 pb-8 sm:pb-12 max-w-2xl mx-auto">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent animate-gradient text-center leading-tight">
          Register Your Car 
        </h1>
        <p className="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8 text-center leading-relaxed px-2">
          Fill out the form below to register your car for the Salty Road
          exhibition.
        </p>
        <RegisterForm />
      </div>
    </section>
  );
}
