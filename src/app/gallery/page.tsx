import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { connectToDatabase } from "@/lib/db";
import { Gallery } from "@/models";
import Image from "next/image";

export const revalidate = 0; // Disable cache so uploads show instantly
export default async function GalleryPage() {
  let images: any[] = [];

  try {
    await connectToDatabase();
    images = await Gallery.find({ published: true }).sort({ createdAt: -1 }).lean();
  } catch (error) {
    console.error("Failed to load gallery images", error);
  }

  // Fallback high-quality images if DB is empty
  const fallbackImages = [
    {
      _id: "fb1",
      imageUrl: "https://images.unsplash.com/photo-1555244162-803834f70033?w=800&auto=format&fit=crop&q=60",
      caption: "Buffet Operations & Food Presentation",
      category: "Catering Setup",
    },
    {
      _id: "fb2",
      imageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&auto=format&fit=crop&q=60",
      caption: "Banquet Hall Grand Layout & Dining Service Setup",
      category: "Banquets",
    },
    {
      _id: "fb3",
      imageUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=60",
      caption: "Corporate Event Guest Hospitality Services",
      category: "Service Staff",
    },
    {
      _id: "fb4",
      imageUrl: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&auto=format&fit=crop&q=60",
      caption: "Fine Dining Plate Operations & Waiter Services",
      category: "Fine Dining",
    }
  ];

  const displayImages = images.length > 0 ? images : fallbackImages;

  return (
    <div className="flex flex-col min-h-screen bg-[#07080b] text-white">
      <Navbar />
      <main className="flex-grow max-w-7xl mx-auto px-4 py-16 w-full">
        <h1 className="text-4xl font-extrabold text-red-600 mb-4 uppercase tracking-wider text-center">
          Event Gallery
        </h1>
        <p className="text-gray-400 text-center max-w-xl mx-auto mb-12">
          A glimpse into the premium banquet layouts, corporate events, and wedding catering services supported by TOPLINE.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {displayImages.map((img: any) => (
            <div
              key={img._id.toString()}
              className="group relative overflow-hidden bg-[#0c0d12] rounded-xl border border-gray-800 hover:border-red-600/50 transition duration-300 flex flex-col"
            >
              <div className="relative h-60 w-full overflow-hidden">
                <img
                  src={img.imageUrl}
                  alt={img.caption}
                  className="object-cover w-full h-full group-hover:scale-110 transition duration-500"
                />
                <span className="absolute top-3 left-3 bg-red-600 text-black text-xs font-semibold px-2 py-1 rounded uppercase tracking-wider">
                  {img.category}
                </span>
              </div>
              <div className="p-4 flex-grow flex items-center justify-center text-center">
                <p className="text-sm text-gray-300 font-medium">{img.caption}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
