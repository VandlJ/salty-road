export default function InfoPage() {
  return (
    <section className="bg-transparent text-white px-4 pt-8 pb-12 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-8 text-center bg-gradient-to-r from-white to-[#C0C0C0] bg-clip-text text-transparent">
        Information
      </h1>
      
      <div className="space-y-12">
        <div id="parking" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">Parking</h2>
          <p className="text-gray-400">Information about parking will be available soon.</p>
        </div>

        <div id="map" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">Map</h2>
          <p className="text-gray-400">Event map will be available soon.</p>
        </div>

        <div id="sponsors" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">Sponsors</h2>
          <p className="text-gray-400">Our partners and sponsors.</p>
        </div>

        <div id="program" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">Program</h2>
          <p className="text-gray-400">Event schedule will be published soon.</p>
        </div>

        <div id="rules" className="p-6 border border-[#333] bg-[#111]/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-4 text-[#C0C0C0]">Visitor Rules</h2>
          <p className="text-gray-400">Rules and regulations for visitors.</p>
        </div>
      </div>
    </section>
  );
}
