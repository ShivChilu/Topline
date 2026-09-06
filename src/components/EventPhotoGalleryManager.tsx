"use client";

import { useEffect, useState } from "react";
import { Image as ImageIcon, Plus, Trash2, X, ChevronLeft, ChevronRight, Eye, Sparkles } from "lucide-react";

interface Photo {
  id: string;
  url: string;
  caption?: string | null;
  category?: string | null;
  isPublic: boolean;
  createdAt: string;
}

export default function EventPhotoGalleryManager({ eventId }: { eventId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("Setup");
  const [isPublic, setIsPublic] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fetchPhotos = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/events/${eventId}/photos`);
      const data = await res.json();
      if (res.ok && data.success) {
        setPhotos(data.photos || []);
      }
    } catch (err) {
      console.error("Fetch photos error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) fetchPhotos();
  }, [eventId]);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim()) return;
    setUploading(true);

    try {
      const res = await fetch(`/api/admin/events/${eventId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: photoUrl.trim(),
          caption: caption.trim() || null,
          category,
          isPublic,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPhotoUrl("");
        setCaption("");
        setIsUploadOpen(false);
        fetchPhotos();
      } else {
        alert(data.message || "Failed to add photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm("Are you sure you want to delete this event photo?")) return;

    try {
      const res = await fetch(`/api/admin/events/${eventId}/photos?photoId=${photoId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPhotos((prev) => prev.filter((p) => p.id !== photoId));
        if (lightboxIndex !== null) setLightboxIndex(null);
      } else {
        alert(data.message || "Failed to delete photo.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    }
  };

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const nextPhoto = () => {
    if (lightboxIndex !== null && lightboxIndex < photos.length - 1) {
      setLightboxIndex(lightboxIndex + 1);
    }
  };
  const prevPhoto = () => {
    if (lightboxIndex !== null && lightboxIndex > 0) {
      setLightboxIndex(lightboxIndex - 1);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-150 pb-3">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-bold uppercase tracking-wider text-slate-900">
            Event Photo Gallery ({photos.length})
          </h2>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-sm flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Photo</span>
        </button>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <h3 className="font-bold text-slate-900 text-base uppercase">Add Event Photo</h3>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Image URL *</label>
                <input
                  type="url"
                  required
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase block">Caption</label>
                <input
                  type="text"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="e.g. VIP Buffet Counter and Table Setup"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600"
                  >
                    <option value="Setup">Setup</option>
                    <option value="Staff in Uniform">Staff in Uniform</option>
                    <option value="Service Operations">Service Operations</option>
                    <option value="Banquet Hall">Banquet Hall</option>
                    <option value="VIP Guest Area">VIP Guest Area</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase block">Visibility</label>
                  <label className="flex items-center space-x-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPublic}
                      onChange={(e) => setIsPublic(e.target.checked)}
                      className="rounded border-slate-300 text-red-600 focus:ring-red-600"
                    />
                    <span className="text-slate-700 font-semibold">Show in Public Gallery</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-150 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-sm disabled:opacity-50"
                >
                  {uploading ? "Saving..." : "Save Photo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <p className="text-slate-400 text-xs text-center py-6">Loading event photos...</p>
      ) : photos.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl p-6 space-y-2">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 text-xs font-semibold">No photos uploaded for this event yet.</p>
          <p className="text-slate-400 text-[11px]">Upload photos of uniform staff, banquet setups, or service duties.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shadow-sm aspect-video flex flex-col justify-between"
            >
              <img
                src={photo.url}
                alt={photo.caption || "Event Photo"}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-300 cursor-pointer"
                onClick={() => openLightbox(idx)}
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2 pointer-events-none">
                <div className="flex justify-between items-center pointer-events-auto">
                  <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                    {photo.category || "Event"}
                  </span>
                  <button
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="bg-black/60 hover:bg-red-600 text-white p-1 rounded transition"
                    title="Delete Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {photo.caption && (
                  <p className="text-white text-[11px] font-medium truncate pointer-events-auto">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxIndex !== null && photos[lightboxIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md">
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative max-w-4xl max-h-[80vh] w-full flex items-center justify-center">
            <img
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].caption || "Event preview"}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
            />

            {lightboxIndex > 0 && (
              <button
                onClick={prevPhoto}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={nextPhoto}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          <div className="text-center text-white mt-4 space-y-1">
            <p className="text-sm font-semibold">{photos[lightboxIndex].caption || "Event Photo"}</p>
            <p className="text-xs text-white/60">
              {lightboxIndex + 1} of {photos.length} • Category: {photos[lightboxIndex].category}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
