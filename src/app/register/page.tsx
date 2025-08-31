"use client";

import RegisterForm from "@/components/registerForm";

export default function RegisterPage() {
  return (
    <section className="px-4 pt-8 pb-12 max-w-2xl mx-auto">
      <div className="flex flex-col items-center">
        <h1 className="text-5xl font-extrabold mb-4 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent animate-gradient">
          Register Your Car 
        </h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          Fill out the form below to register your car for the Salty Road
          exhibition.
        </p>
        <RegisterForm />
      </div>
    </section>
  );
}
