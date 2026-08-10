"use client";

import { useEffect, useState } from "react";
import { Plus, Image as ImageIcon, Trash2, Eye, EyeOff } from "lucide-react";

export default function AdminGalleryPage() {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form input state
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Catering Setup");
  const [published, setPublished] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/gallery");
      const data = await res.json();
      if (data.success) {
        setImages(data.images);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, caption, category, published }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert("Image entry added and published!");
        setShowAddForm(false);
        setImageUrl("");
        setCaption("");
        setCategory("Catering Setup");
        setPublished(true);
        fetchImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePublished = async (id: string, currentPublished: boolean) => {
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, published: !currentPublished }),
      });
      const data = await res.json();
      if (data.success) {
        fetchImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this photo?")) return;

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        alert("Image deleted.");
        fetchImages();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 text-slate-900 max-w-5xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-wider text-red-600 uppercase">
            Manage Gallery
          </h1>
          <p className="text-slate-500 text-sm mt-1">Upload and organize photographs for the public home slider and folder gallery</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition flex items-center justify-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? "Close Form" : "Upload Event Image"}</span>
        </button>
      </div>

      {/* Upload image form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 max-w-xl">
          <h2 className="text-lg font-bold border-b border-slate-200 pb-2">Image Specifications</h2>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Image URL (from Cloudinary or Unsplash) *</label>
            <input
              type="url"
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Caption *</label>
            <input
              type="text"
              required
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Buffet service operations setup"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-red-600 text-sm"
              >
                <option value="Catering Setup">Catering Setup</option>
                <option value="Banquets">Banquets</option>
                <option value="Service Staff">Service Staff</option>
                <option value="Fine Dining">Fine Dining</option>
              </select>
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="publish_img"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
                className="rounded border-slate-200 text-red-600 focus:ring-red-600"
              />
              <label htmlFor="publish_img" className="text-sm font-semibold text-slate-650">Publish Immediately</label>
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg transition"
          >
            Upload and Publish Image
          </button>
        </form>
      )}

      {/* Grid of gallery assets */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-slate-450">Loading gallery images...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <p className="text-gray-550">No uploaded gallery photographs found. Create one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {images.map((img) => (
            <div key={img._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between group">
              <div className="relative h-48 w-full bg-gray-900 overflow-hidden">
                <img src={img.imageUrl} alt={img.caption} className="object-cover w-full h-full" />
                <span className="absolute top-2 left-2 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  {img.category}
                </span>
              </div>
              <div className="p-4 flex-grow flex flex-col justify-between space-y-3">
                <p className="text-xs text-slate-650 font-medium line-clamp-2">{img.caption}</p>
                <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                  <button
                    onClick={() => handleTogglePublished(img._id, img.published)}
                    className={`p-1.5 rounded transition ${
                      img.published ? "bg-emerald-950/20 text-emerald-400" : "bg-gray-850 text-slate-450"
                    }`}
                    title={img.published ? "Unpublish image" : "Publish image"}
                  >
                    {img.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(img._id)}
                    className="p-1.5 bg-red-950/20 text-red-400 hover:bg-red-650 hover:text-white rounded transition"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
