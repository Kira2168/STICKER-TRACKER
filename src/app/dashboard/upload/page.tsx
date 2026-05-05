"use client";
import { useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useRouter } from "next/navigation";
import { ChevronRight, Camera, Check, ArrowLeft, Loader2, User, Phone, Hash } from "lucide-react";

export default function UploadPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form Data
  const [plateRegionCode, setPlateRegionCode] = useState<"" | "01" | "03">("");
  const [plateSeries, setPlateSeries] = useState<"" | "A" | "B" | "C">("");
  const [plateDigits, setPlateDigits] = useState("");
  const [driverFirst, setDriverFirst] = useState("");
  const [driverLast, setDriverLast] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Identity state
  const [agentId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("agent_id");
  });
  const [agentName] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("agent_name");
  });

  const isPlateValid = (plateRegionCode === "01" || plateRegionCode === "03") && /^\d{5}$/.test(plateDigits);
  const formattedPlateNumber = `${plateRegionCode}${plateSeries ? ` ${plateSeries}` : ""} ${plateDigits}`.trim();

  const handleUpload = async () => {
    if (!imageFile || !agentId) {
      alert("Error: Agent ID missing. Please log in again.");
      return;
    }
    setLoading(true);

    try {
      // 1. Upload Image to the 'stickers' bucket
      const fileName = `${Date.now()}-${imageFile.name.replace(/\s/g, '_')}`;
      const { error: storageError } = await supabase.storage
        .from("stickers")
        .upload(fileName, imageFile);

      if (storageError) throw storageError;

      // 2. Get the public link
      const { data: { publicUrl } } = supabase.storage
        .from("stickers")
        .getPublicUrl(fileName);

      // 3. Save everything to 'sticker_uploads'
      // We use the agentId from state to ensure it matches exactly what the dashboard queries
      const { error: dbError } = await supabase
        .from("sticker_uploads")
        .insert([{
          agent_id: agentId, 
          agent_name: agentName || "Unknown Agent",
          plate_number: formattedPlateNumber,
          driver_name: `${driverFirst} ${driverLast}`.trim(),
          driver_phone: driverPhone,
          image_url: publicUrl
        }]);

      if (dbError) throw dbError;

      // Force a re-fetch of the data before moving to success
      router.refresh();
      setStep(5); 
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      alert(`Upload Failed: ${message || "Check your connection"}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-3 font-sans text-white sm:p-6" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <div className="w-full max-w-lg">
        
        {/* Progress Bar */}
        <div className="flex gap-2 mb-6 sm:mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={`h-1 flex-1 rounded-full transition-all duration-500 ${step >= s ? "bg-[#8b5cf6]" : "bg-white/10"}`} />
          ))}
        </div>

        <div className="glass-card rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
          
          {/* STEP 1: PLATE NUMBER */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <Hash size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 01</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white sm:text-3xl">Vehicle Plate</h2>
              <p className="text-gray-500 mb-6">Region code and 5-digit plate number are required. Series A/B/C is optional.</p>

              <div className="grid grid-cols-3 gap-2 mb-4 sm:gap-3">
                <select
                  autoFocus
                  value={plateRegionCode}
                  onChange={(e) => setPlateRegionCode(e.target.value as "" | "01" | "03")}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-base outline-none focus:border-[#8b5cf6] transition-all text-white sm:text-lg"
                >
                  <option value="" className="text-black">Code</option>
                  <option value="01" className="text-black">01</option>
                  <option value="03" className="text-black">03</option>
                </select>

                <select
                  value={plateSeries}
                  onChange={(e) => setPlateSeries(e.target.value as "" | "A" | "B" | "C")}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-base outline-none focus:border-[#8b5cf6] transition-all text-white sm:text-lg"
                >
                  <option value="" className="text-black">None / Optional</option>
                  <option value="A" className="text-black">A</option>
                  <option value="B" className="text-black">B</option>
                  <option value="C" className="text-black">C</option>
                </select>

                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="12345"
                  maxLength={5}
                  value={plateDigits}
                  onChange={(e) => setPlateDigits(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-base outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white sm:text-lg"
                />
              </div>

              <p className="text-sm text-gray-400 mb-2">Preview: {formattedPlateNumber || "-"}</p>
              {!isPlateValid && <p className="text-xs text-amber-400">Plate code must be 01 or 03 and the plate number must be exactly 5 digits. ABC is optional.</p>}

              <button 
                disabled={!isPlateValid}
                onClick={() => setStep(2)}
                className="mt-8 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 2: DRIVER NAME */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(1)} className="text-gray-500 flex items-center gap-1 mb-4 text-sm hover:text-white transition-colors">
                <ArrowLeft size={14}/> Back
              </button>
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <User size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 02</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white sm:text-3xl">Driver Name</h2>
              <p className="text-gray-500 mb-6">Enter the driver&apos;s first and last name.</p>

              <div className="grid grid-cols-1 gap-3 mb-4 sm:grid-cols-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="First name"
                  value={driverFirst}
                  onChange={(e) => setDriverFirst(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-base outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white sm:text-lg"
                />

                <input
                  type="text"
                  placeholder="Last name"
                  value={driverLast}
                  onChange={(e) => setDriverLast(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-3 text-base outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white sm:text-lg"
                />
              </div>

              <button 
                disabled={!driverFirst || !driverLast}
                onClick={() => setStep(3)}
                className="mt-2 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 3: PHONE NUMBER */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(2)} className="text-gray-500 flex items-center gap-1 mb-4 text-sm hover:text-white transition-colors">
                <ArrowLeft size={14}/> Back
              </button>
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <Phone size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 03</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white sm:text-3xl">Driver Phone</h2>
              <p className="text-gray-500 mb-8">Primary contact number for the driver.</p>
              <input 
                autoFocus
                type="tel"
                placeholder="09..."
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xl outline-none focus:border-[#8b5cf6] transition-all placeholder:text-gray-700 text-white sm:p-5 sm:text-2xl"
              />
              <button 
                disabled={!driverPhone}
                onClick={() => setStep(4)}
                className="mt-8 w-full bg-[#8b5cf6] hover:bg-[#7c3aed] py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
              >
                Next <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* STEP 4: PHOTO */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right duration-500">
              <button onClick={() => setStep(3)} className="text-gray-500 flex items-center gap-1 mb-4 text-sm hover:text-white transition-colors">
                <ArrowLeft size={14}/> Back
              </button>
              <div className="flex items-center gap-2 mb-2 text-[#8b5cf6]">
                <Camera size={20} />
                <span className="text-sm font-bold uppercase tracking-widest">Step 04</span>
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white sm:text-3xl">Sticker Photo</h2>
              <p className="text-gray-500 mb-8">Take a clear photo or upload from gallery.</p>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Open Camera
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Upload From Gallery
                </button>

                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />

                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />

                <div className="aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center transition-all overflow-hidden relative">
                  {imageFile ? (
                    <div className="text-center p-4">
                      <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Check size={32} />
                      </div>
                      <span className="mx-auto block w-48 truncate font-medium text-white">{imageFile.name}</span>
                      <span className="text-xs text-gray-500 mt-1 block">Image selected</span>
                    </div>
                  ) : (
                    <>
                      <Camera size={48} className="text-gray-700 mb-2" />
                      <span className="text-gray-500">No image selected yet</span>
                    </>
                  )}
                </div>
              </div>

              <button 
                disabled={!imageFile || loading}
                onClick={handleUpload}
                className="mt-8 w-full rounded-2xl bg-[#8b5cf6] py-4 font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all active:scale-95 hover:bg-[#7c3aed] disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Complete Registration"}
              </button>
            </div>
          )}

          {/* STEP 5: SUCCESS */}
          {step === 5 && (
            <div className="text-center animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-500/20">
                <Check size={40} className="text-white" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-white sm:text-3xl">Success!</h2>
              <p className="text-gray-500 mb-8">The sticker record and photo have been securely saved.</p>
              <button 
                onClick={() => router.push("/dashboard")}
                className="w-full bg-white/10 hover:bg-white/20 text-white py-4 rounded-2xl font-bold transition-all active:scale-95"
              >
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}