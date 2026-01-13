"use client";

import RegisterForm from "@/components/registerForm";

export default function RegisterPage() {
  return (
    <section className="bg-transparent text-white px-4 pt-6 sm:pt-8 pb-8 sm:pb-12 max-w-4xl mx-auto">
      <div className="flex flex-col items-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4 sm:mb-6 bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent animate-gradient text-center leading-tight">
          Register Your Car
        </h1>
        <p className="text-base sm:text-lg text-gray-300 mb-8 sm:mb-12 text-center leading-relaxed px-2 max-w-2xl">
          Fill out the form below to register your car for the Salty Road
          exhibition.
        </p>

        {/* Info Section */}
        <div className="w-full bg-[#111]/80 border border-[#333] p-6 md:p-8 mb-12 rounded-none backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 text-[#C0C0C0] border-b border-[#333] pb-2 uppercase tracking-wide">
            Important Information for Exhibitors
          </h2>
          
          <div className="space-y-8 text-gray-300">
            <div>
              <h3 className="text-white font-bold mb-2 uppercase">Arrival of vehicles</h3>
              <p className="mb-2">Velké náměstí in Prachatice is accessible for arrival:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-400">
                <li><strong className="text-white">Friday, July 24, 2026</strong>, from 19:00 to 22:00</li>
                <li><strong className="text-white">Saturday, July 25, 2026</strong>, from 8:00 to 11:00</li>
              </ul>
              <p className="mt-2 text-sm text-red-400 italic">
                Outside these times, vehicles are not allowed to enter the square.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase">Departure from the venue</h3>
              <ul className="list-disc list-inside space-y-1 ml-2 text-gray-400">
                <li><strong className="text-white">Saturday, July 25, 2026</strong>, after 18:00</li>
                <li><strong className="text-white">Sunday, July 26, 2026</strong>, until 10:00</li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase">Registration & Conditions</h3>
              <p className="mb-4">
                There is one exhibition area – <strong className="text-white">Velké náměstí, Prachatice</strong> with a capacity of up to 100 vehicles. Selection of vehicles for approval will take place.
              </p>
              <p className="mb-4">
                All registrations are responded to by email. Once your registration for Salty Road Meet is approved, you will receive a confirmation email with instructions for paying the registration fee.
              </p>
              <p className="mb-2 font-semibold text-white">The registration fee includes:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-4 text-gray-400">
                <li>Exhibition space for your vehicle</li>
                <li>Driver entry ticket</li>
                <li>Welcome package from Salty Road Meet and our partners</li>
              </ul>
              <p>
                After payment is received, we will send you your registration confirmation with a registration number (needed for accreditation) and complete exhibitor instructions.
              </p>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2 uppercase">Registration Fee</h3>
              <p className="mb-4">
                The registration fee must be paid in advance via bank transfer as confirmation of your participation.
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mb-4 text-gray-400">
                <li>If canceled up to 14 days before the event: <strong>Full refund</strong></li>
                <li>If canceled less than 14 days before the event: <strong>Non-refundable</strong></li>
              </ul>
              <div className="text-xl text-white border border-[#C0C0C0] inline-block px-4 py-2 mt-2">
                Registration Fee: <span className="font-bold">299 CZK / 12 €</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <RegisterForm />
        </div>
      </div>
    </section>
  );
}