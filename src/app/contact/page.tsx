import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-5xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-amber-500 mb-4 uppercase tracking-wider text-center">
          Contact Us
        </h1>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
          Are you a hotel manager looking for staff, or a university student looking for event opportunities? Get in touch with Top Line.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Contact Details */}
          <div className="space-y-8 bg-[#0c0d12] p-8 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-6">TOPLINE ODC</h2>
            <div className="flex items-start space-x-4">
              <Phone className="text-amber-500 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Phone Support</h4>
                <p className="text-gray-400">+91 79869 55634, +91 93810 39799</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <Mail className="text-amber-500 mt-1" />
              <div>
                <h4 className="font-semibold text-white">Email Address</h4>
                <p className="text-gray-400">contact@toplineodc.co.in</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800">
              <a
                href="https://wa.me/917986955634?text=I%20would%20like%20to%20contact%20TOPLINE%20ODC"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-lg transition"
              >
                <span>WhatsApp Us</span>
              </a>
            </div>
          </div>

          {/* Quick Form */}
          <div className="bg-[#0c0d12] p-8 rounded-xl border border-gray-800">
            <h2 className="text-2xl font-bold text-white mb-6">Send us a Message</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Your Name</label>
                <input
                  type="text"
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  placeholder="Rahul Kumar / Rajesh Sharma"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email / Phone</label>
                <input
                  type="text"
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  placeholder="yourname@gmail.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                <textarea
                  className="w-full bg-[#161822] border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500 h-28"
                  placeholder="How can we help you?"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-2 rounded transition"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
